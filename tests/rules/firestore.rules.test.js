const fs = require('node:fs')
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing')
const { deleteDoc, doc, getDoc, setDoc, writeBatch } = require('firebase/firestore')

const projectId = 'demo-farm-dashboard'
let testEnv

const accessId = (userId, farmId) => `${userId}_${farmId}`

async function seedFarm(farmId, members) {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'farms', farmId), {
      id: farmId,
      ownerId: members.owner,
      createdBy: members.owner,
      name: `Farm ${farmId}`
    })
    for (const [role, userId] of Object.entries(members)) {
      await setDoc(doc(db, 'userFarmAccess', accessId(userId, farmId)), {
        id: accessId(userId, farmId),
        userId,
        farmId,
        role,
        permissions: role === 'viewer' ? ['read'] : ['read', 'write'],
        isActive: true,
        grantedBy: members.owner
      })
    }
    await setDoc(doc(db, 'farms', farmId, 'trees', 'tree-1'), {
      id: 'tree-1',
      farmId,
      name: 'Tree 1'
    })
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync('firestore.rules', 'utf8')
    }
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedFarm('farm-a', { owner: 'owner-a', manager: 'manager-a', viewer: 'viewer-a' })
  await seedFarm('farm-b', { owner: 'owner-b', manager: 'manager-b', viewer: 'viewer-b' })
})

afterAll(async () => {
  await testEnv.cleanup()
})

test('unauthenticated users cannot read farm data', async () => {
  const db = testEnv.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(db, 'farms', 'farm-a')))
  await assertFails(getDoc(doc(db, 'farms', 'farm-a', 'trees', 'tree-1')))
})

test('farm members cannot read another farm', async () => {
  const db = testEnv.authenticatedContext('viewer-a').firestore()
  await assertSucceeds(getDoc(doc(db, 'farms', 'farm-a')))
  await assertFails(getDoc(doc(db, 'farms', 'farm-b')))
})

test('viewer reads but cannot write trees', async () => {
  const db = testEnv.authenticatedContext('viewer-a').firestore()
  const tree = doc(db, 'farms', 'farm-a', 'trees', 'tree-1')
  await assertSucceeds(getDoc(tree))
  await assertFails(setDoc(tree, { id: 'tree-1', farmId: 'farm-a', name: 'Changed' }))
})

test('manager writes own farm but cannot delete it', async () => {
  const db = testEnv.authenticatedContext('manager-a').firestore()
  await assertSucceeds(setDoc(doc(db, 'farms', 'farm-a', 'trees', 'tree-2'), {
    id: 'tree-2',
    farmId: 'farm-a',
    name: 'Tree 2'
  }))
  await assertFails(deleteDoc(doc(db, 'farms', 'farm-a')))
})

test('owner can grant viewer but viewer cannot self-escalate', async () => {
  const ownerDb = testEnv.authenticatedContext('owner-a').firestore()
  await assertSucceeds(setDoc(doc(ownerDb, 'userFarmAccess', 'new-user_farm-a'), {
    id: 'new-user_farm-a',
    userId: 'new-user',
    farmId: 'farm-a',
    role: 'viewer',
    permissions: ['read'],
    isActive: true,
    grantedBy: 'owner-a'
  }))

  const viewerDb = testEnv.authenticatedContext('viewer-a').firestore()
  await assertFails(setDoc(doc(viewerDb, 'userFarmAccess', 'viewer-a_farm-a'), {
    id: 'viewer-a_farm-a',
    userId: 'viewer-a',
    farmId: 'farm-a',
    role: 'owner',
    permissions: ['read', 'write'],
    isActive: true,
    grantedBy: 'viewer-a'
  }))
})

test('new user can atomically create a farm and initial owner membership', async () => {
  const db = testEnv.authenticatedContext('new-owner').firestore()
  const farmId = 'farm-new'
  const batch = writeBatch(db)
  batch.set(doc(db, 'farms', farmId), {
    id: farmId,
    ownerId: 'new-owner',
    createdBy: 'new-owner',
    name: 'New Farm'
  })
  batch.set(doc(db, 'userFarmAccess', 'new-owner_farm-new'), {
    id: 'new-owner_farm-new',
    userId: 'new-owner',
    farmId,
    role: 'owner',
    permissions: ['read', 'write'],
    isActive: true,
    grantedBy: 'new-owner'
  })
  await assertSucceeds(batch.commit())
})

test('legacy and unknown collection writes are denied', async () => {
  const db = testEnv.authenticatedContext('owner-a').firestore()
  await assertFails(setDoc(doc(db, 'zones', 'legacy-zone'), { farmId: 'farm-a' }))
  await assertFails(setDoc(doc(db, 'unknown', 'record'), { value: true }))
})

test('system admin custom claim can read all farms', async () => {
  const db = testEnv.authenticatedContext('system-admin', { admin: true }).firestore()
  await assertSucceeds(getDoc(doc(db, 'farms', 'farm-a')))
  await assertSucceeds(getDoc(doc(db, 'farms', 'farm-b')))
})
