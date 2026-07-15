import admin from 'firebase-admin'
import fs from 'node:fs'
import path from 'node:path'

type Role = 'owner' | 'manager' | 'viewer'
type CollectionName = 'photos' | 'zones' | 'trees'
type DocumentData = admin.firestore.DocumentData

const APPLY = process.argv.includes('--apply')
const fallbackZoneFarmArg = process.argv.find(arg => arg.startsWith('--fallback-zone-farm-id='))
const fallbackZoneFarmId = fallbackZoneFarmArg?.split('=', 2)[1]
const serviceAccountPath = path.resolve(process.cwd(), 'config/firebase-sa.json')

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Missing Firebase service account: ${serviceAccountPath}`)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  owner: ['read', 'write', 'delete', 'manage_users', 'manage_zones', 'manage_investments'],
  manager: ['read', 'write', 'manage_zones', 'manage_investments'],
  viewer: ['read'],
}

const ROLE_RANK: Record<Role, number> = { owner: 3, manager: 2, viewer: 1 }

interface Stats {
  source: number
  planned: number
  written: number
  existing: number
  unresolved: number
  ambiguous: number
}

function emptyStats(): Stats {
  return { source: 0, planned: 0, written: 0, existing: 0, unresolved: 0, ambiguous: 0 }
}

function normalizeRole(value: unknown): Role {
  const role = String(value || '').toLowerCase()
  if (role.includes('owner') || role.includes('admin')) return 'owner'
  if (role.includes('manager') || role.includes('editor')) return 'manager'
  return 'viewer'
}

function farmIdFrom(data: DocumentData): string | undefined {
  const value = data.farmId ?? data.farm ?? data.farmID
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && typeof value.id === 'string') return value.id
  return undefined
}

function sameStringSet(left: unknown, right: string[]): boolean {
  if (!Array.isArray(left)) return false
  const a = [...new Set(left.map(String))].sort()
  const b = [...new Set(right)].sort()
  return a.length === b.length && a.every((value, index) => value === b[index])
}

async function commitWrites(
  writes: Array<{ ref: admin.firestore.DocumentReference; data: DocumentData }>,
): Promise<number> {
  if (!APPLY || writes.length === 0) return 0

  let written = 0
  for (let index = 0; index < writes.length; index += 400) {
    const batch = db.batch()
    for (const write of writes.slice(index, index + 400)) {
      batch.set(write.ref, write.data, { merge: true })
    }
    await batch.commit()
    written += Math.min(400, writes.length - index)
  }
  return written
}

async function migrateFarmAccess(farmIds: Set<string>): Promise<Stats> {
  const stats = emptyStats()
  const [legacy, canonical] = await Promise.all([
    db.collection('farmAccess').get(),
    db.collection('userFarmAccess').get(),
  ])
  stats.source = legacy.size

  const groups = new Map<string, { userId: string; farmId: string; records: DocumentData[] }>()
  for (const snapshot of [legacy, canonical]) {
    for (const document of snapshot.docs) {
      const data = document.data()
      if (!data.userId || !data.farmId || !farmIds.has(data.farmId)) {
        stats.unresolved += snapshot === legacy ? 1 : 0
        continue
      }
      const key = JSON.stringify([data.userId, data.farmId])
      const group = groups.get(key) || { userId: data.userId, farmId: data.farmId, records: [] }
      group.records.push(data)
      groups.set(key, group)
    }
  }

  const writes: Array<{ ref: admin.firestore.DocumentReference; data: DocumentData }> = []
  for (const { userId, farmId, records } of groups.values()) {
    const id = `${userId}_${farmId}`
    const explicitlyActive = records.filter(record => record.isActive === true)
    const implicitlyActive = records.filter(record => record.isActive == null)
    const activeRecords = explicitlyActive.length > 0 ? explicitlyActive : implicitlyActive
    const roleRecords = activeRecords.length > 0 ? activeRecords : records
    const role = roleRecords
      .map(record => normalizeRole(record.role))
      .sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0]
    const isActive = activeRecords.length > 0
    const permissions = [...new Set([
      ...DEFAULT_PERMISSIONS[role],
      ...roleRecords.flatMap(record => Array.isArray(record.permissions) ? record.permissions.map(String) : []),
    ])]
    const target = db.collection('userFarmAccess').doc(id)
    const current = await target.get()
    const currentData = current.data()

    if (
      current.exists &&
      currentData?.userId === userId &&
      currentData?.farmId === farmId &&
      normalizeRole(currentData?.role) === role &&
      currentData?.isActive === isActive &&
      sameStringSet(currentData?.permissions, permissions)
    ) {
      stats.existing += 1
      continue
    }

    const grantedAt = records.map(record => record.grantedAt).find(Boolean) || admin.firestore.FieldValue.serverTimestamp()
    const grantedBy = records.map(record => record.grantedBy).find(Boolean) || userId
    writes.push({
      ref: target,
      data: {
        id,
        userId,
        farmId,
        role,
        permissions,
        isActive,
        grantedAt,
        grantedBy,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        migrationVersion: 'persisted-v1',
      },
    })
  }

  stats.planned = writes.length
  stats.written = await commitWrites(writes)
  return stats
}

async function buildCanonicalIndexes(farmIds: string[]) {
  const documentFarmIndexes: Record<CollectionName, Map<string, string[]>> = {
    photos: new Map(),
    zones: new Map(),
    trees: new Map(),
  }

  for (const farmId of farmIds) {
    for (const collectionName of Object.keys(documentFarmIndexes) as CollectionName[]) {
      const snapshot = await db.collection(`farms/${farmId}/${collectionName}`).get()
      for (const document of snapshot.docs) {
        const farms = documentFarmIndexes[collectionName].get(document.id) || []
        farms.push(farmId)
        documentFarmIndexes[collectionName].set(document.id, farms)
      }
    }
  }
  return documentFarmIndexes
}

async function migrateCollection(
  collectionName: CollectionName,
  farmIds: Set<string>,
  indexes: Record<CollectionName, Map<string, string[]>>,
): Promise<Stats> {
  const stats = emptyStats()
  const source = await db.collection(collectionName).get()
  stats.source = source.size
  const writes: Array<{ ref: admin.firestore.DocumentReference; data: DocumentData }> = []

  for (const document of source.docs) {
    const data = document.data()
    const declaredFarmId = farmIdFrom(data)
    let resolvedFarmId = declaredFarmId && farmIds.has(declaredFarmId) ? declaredFarmId : undefined

    if (!resolvedFarmId) {
      const sameIdCandidates = indexes[collectionName].get(document.id) || []
      if (sameIdCandidates.length === 1) {
        resolvedFarmId = sameIdCandidates[0]
      } else if (sameIdCandidates.length > 1) {
        stats.ambiguous += 1
        continue
      }
    }

    if (!resolvedFarmId && collectionName === 'photos' && data.treeId) {
      const treeCandidates = indexes.trees.get(String(data.treeId)) || []
      if (treeCandidates.length === 1) {
        resolvedFarmId = treeCandidates[0]
      } else if (treeCandidates.length > 1) {
        stats.ambiguous += 1
        continue
      }
    }

    if (!resolvedFarmId && collectionName === 'zones' && fallbackZoneFarmId) {
      resolvedFarmId = fallbackZoneFarmId
    }

    if (!resolvedFarmId || !farmIds.has(resolvedFarmId)) {
      stats.unresolved += 1
      continue
    }

    const target = db.doc(`farms/${resolvedFarmId}/${collectionName}/${document.id}`)
    const current = await target.get()
    if (current.exists) {
      stats.existing += 1
      continue
    }

    writes.push({
      ref: target,
      data: {
        ...data,
        id: data.id || document.id,
        farmId: resolvedFarmId,
        migratedFrom: `top-level/${collectionName}`,
        migrationDate: admin.firestore.FieldValue.serverTimestamp(),
        migrationVersion: 'persisted-v1',
      },
    })
  }

  stats.planned = writes.length
  stats.written = await commitWrites(writes)
  return stats
}

async function main() {
  const farms = await db.collection('farms').get()
  const farmIds = farms.docs.map(document => document.id)
  const farmIdSet = new Set(farmIds)

  if (fallbackZoneFarmId && !farmIdSet.has(fallbackZoneFarmId)) {
    throw new Error(`Fallback zone farm does not exist: ${fallbackZoneFarmId}`)
  }

  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} persisted migration on project ${serviceAccount.project_id}`)
  if (fallbackZoneFarmId) console.log(`Fallback farm for unscoped zones: ${fallbackZoneFarmId}`)

  const indexes = await buildCanonicalIndexes(farmIds)
  const results = {
    farmAccess: await migrateFarmAccess(farmIdSet),
    photos: await migrateCollection('photos', farmIdSet, indexes),
    zones: await migrateCollection('zones', farmIdSet, indexes),
    trees: await migrateCollection('trees', farmIdSet, indexes),
  }

  console.log(JSON.stringify(results, null, 2))
  if (!APPLY) console.log('No data was written. Re-run with --apply after reviewing this plan.')
}

main().catch(error => {
  console.error('Migration failed:', error)
  process.exitCode = 1
})
