import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
  Timestamp,
  orderBy
} from 'firebase/firestore'
import { db } from './firebase'
import { Tree } from './types'
import { FarmService } from './farm-service'

export interface ReconciliationResult {
  totalIosTrees: number
  totalWebTrees: number
  missingInWeb: Tree[]
  missingInIos: Tree[]
  conflictingTrees: Array<{
    iosTree: Tree
    webTree: Tree
    conflicts: string[]
  }>
  orphanedTrees: Tree[]
  summary: {
    treesToMigrate: number
    treesWithConflicts: number
    treesOnlyInWeb: number
    treesOnlyInIos: number
  }
}

export interface TreeComparison {
  id: string
  existsInIos: boolean
  existsInWeb: boolean
  iosData?: Tree
  webData?: Tree
  conflicts: string[]
  needsMigration: boolean
  needsUpdate: boolean
}

export class DataReconciliationService {

  /**
   * Compare trees between iOS collection (/trees) and web collection (/farms/{farmId}/trees)
   */
  static async compareTreesForFarm(farmId: string, userId: string): Promise<ReconciliationResult> {
    try {
      console.log(`🔍 Starting data reconciliation for farm: ${farmId}`)

      // Load trees from both collections
      const [iosTrees, webTrees] = await Promise.all([
        this.loadIosTrees(userId),
        this.loadWebTrees(farmId)
      ])

      console.log(`📊 Loaded ${iosTrees.length} iOS trees and ${webTrees.length} web trees`)

      // Create comparison map
      const comparisonMap = new Map<string, TreeComparison>()

      // Process iOS trees
      iosTrees.forEach(iosTree => {
        const treeId = iosTree.id || iosTree.qrCode || `${iosTree.latitude}_${iosTree.longitude}`
        const comparison: TreeComparison = {
          id: treeId,
          existsInIos: true,
          existsInWeb: false,
          iosData: iosTree,
          conflicts: [],
          needsMigration: true,
          needsUpdate: false
        }
        comparisonMap.set(treeId, comparison)
      })

      // Process web trees and compare
      webTrees.forEach(webTree => {
        const treeId = webTree.id || webTree.qrCode || `${webTree.latitude}_${webTree.longitude}`
        const existing = comparisonMap.get(treeId)

        if (existing) {
          // Tree exists in both - check for conflicts
          existing.existsInWeb = true
          existing.webData = webTree
          existing.needsMigration = false

          const conflicts = this.compareTreeData(existing.iosData!, webTree)
          existing.conflicts = conflicts
          existing.needsUpdate = conflicts.length > 0
        } else {
          // Tree only exists in web
          comparisonMap.set(treeId, {
            id: treeId,
            existsInIos: false,
            existsInWeb: true,
            webData: webTree,
            conflicts: [],
            needsMigration: false,
            needsUpdate: false
          })
        }
      })

      // Analyze results
      const missingInWeb = Array.from(comparisonMap.values())
        .filter(c => c.existsInIos && !c.existsInWeb)
        .map(c => c.iosData!)

      const missingInIos = Array.from(comparisonMap.values())
        .filter(c => !c.existsInIos && c.existsInWeb)
        .map(c => c.webData!)

      const conflictingTrees = Array.from(comparisonMap.values())
        .filter(c => c.existsInIos && c.existsInWeb && c.conflicts.length > 0)
        .map(c => ({
          iosTree: c.iosData!,
          webTree: c.webData!,
          conflicts: c.conflicts
        }))

      const orphanedTrees = Array.from(comparisonMap.values())
        .filter(c => c.existsInIos && !c.existsInWeb)
        .map(c => c.iosData!)

      const summary = {
        treesToMigrate: missingInWeb.length,
        treesWithConflicts: conflictingTrees.length,
        treesOnlyInWeb: missingInIos.length,
        treesOnlyInIos: missingInWeb.length
      }

      const result: ReconciliationResult = {
        totalIosTrees: iosTrees.length,
        totalWebTrees: webTrees.length,
        missingInWeb,
        missingInIos,
        conflictingTrees,
        orphanedTrees,
        summary
      }

      console.log(`✅ Reconciliation complete:`, result.summary)
      return result

    } catch (error) {
      console.error('❌ Error during data reconciliation:', error)
      throw new Error(`Reconciliation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Load trees from iOS collection (/trees) for a specific user
   */
  private static async loadIosTrees(userId: string): Promise<Tree[]> {
    try {
      const treesQuery = query(
        collection(db, 'trees'),
        where('userId', '==', userId)
      )

      const snapshot = await getDocs(treesQuery)
      const trees: Tree[] = []

      snapshot.forEach(doc => {
        const data = doc.data()
        trees.push({
          id: doc.id,
          ...data,
          farmId: data.farmId || 'legacy',
          plantingDate: this.convertToDate(data.plantingDate),
          lastCountDate: this.convertToDate(data.lastCountDate),
          fertilizedDate: this.convertToDate(data.fertilizedDate),
          prunedDate: this.convertToDate(data.prunedDate),
          lastSyncDate: this.convertToDate(data.lastSyncDate),
          lastAIAnalysisDate: this.convertToDate(data.lastAIAnalysisDate),
          createdAt: this.convertToDate(data.createdAt),
          updatedAt: this.convertToDate(data.updatedAt),
          // Map iOS fields to web fields
          manualFruitCount: data.currentFruitCount || data.manualFruitCount || 0,
          healthStatus: data.healthStatus || 'Good',
          needsAttention: data.needsAttention || false,
          aiFruitCount: data.aiFruitCount || 0,
          treeStatus: data.treeStatus || 'Young Tree'
        } as Tree)
      })

      return trees
    } catch (error) {
      console.error('Error loading iOS trees:', error)
      return []
    }
  }

  /**
   * Load trees from web collection (/farms/{farmId}/trees)
   */
  private static async loadWebTrees(farmId: string): Promise<Tree[]> {
    try {
      const treesRef = collection(db, 'farms', farmId, 'trees')
      const treesQuery = query(treesRef, orderBy('plantingDate', 'desc'))
      const snapshot = await getDocs(treesQuery)

      const trees: Tree[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        trees.push({
          id: doc.id,
          ...data,
          farmId: farmId,
          plantingDate: this.convertToDate(data.plantingDate),
          lastCountDate: this.convertToDate(data.lastCountDate),
          fertilizedDate: this.convertToDate(data.fertilizedDate),
          prunedDate: this.convertToDate(data.prunedDate),
          lastSyncDate: this.convertToDate(data.lastSyncDate),
          lastAIAnalysisDate: this.convertToDate(data.lastAIAnalysisDate),
          createdAt: this.convertToDate(data.createdAt),
          updatedAt: this.convertToDate(data.updatedAt)
        } as Tree)
      })

      return trees
    } catch (error) {
      console.error('Error loading web trees:', error)
      return []
    }
  }

  /**
   * Compare two trees and identify conflicts
   */
  private static compareTreeData(iosTree: Tree, webTree: Tree): string[] {
    const conflicts: string[] = []

    // Compare key fields
    if (iosTree.name !== webTree.name && iosTree.name && webTree.name) {
      conflicts.push('name')
    }

    if (iosTree.variety !== webTree.variety && iosTree.variety && webTree.variety) {
      conflicts.push('variety')
    }

    if (iosTree.latitude !== webTree.latitude || iosTree.longitude !== webTree.longitude) {
      conflicts.push('location')
    }

    if (iosTree.manualFruitCount !== webTree.manualFruitCount) {
      conflicts.push('fruit_count')
    }

    if (iosTree.healthStatus !== webTree.healthStatus) {
      conflicts.push('health_status')
    }

    if (iosTree.zoneCode !== webTree.zoneCode && iosTree.zoneCode && webTree.zoneCode) {
      conflicts.push('zone')
    }

    // Compare dates
    if (this.compareDates(iosTree.plantingDate || null, webTree.plantingDate || null)) {
      conflicts.push('planting_date')
    }

    return conflicts
  }

  /**
   * Convert various date formats to JavaScript Date
   */
  private static convertToDate(dateValue: any): Date | null {
    if (!dateValue) return null

    if (dateValue instanceof Date) {
      return dateValue
    }

    if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
      try {
        return (dateValue as Timestamp).toDate()
      } catch (error) {
        return null
      }
    }

    if (typeof dateValue === 'number') {
      return new Date(dateValue * 1000)
    }

    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue)
      return isNaN(parsed.getTime()) ? null : parsed
    }

    return null
  }

  /**
   * Compare two dates for differences
   */
  private static compareDates(date1: Date | null, date2: Date | null): boolean {
    if (!date1 && !date2) return false
    if (!date1 || !date2) return true

    return Math.abs(date1.getTime() - date2.getTime()) > 60000 // More than 1 minute difference
  }

  /**
   * Migrate missing iOS trees to web collection
   */
  static async migrateMissingTrees(farmId: string, treesToMigrate: Tree[]): Promise<number> {
    if (treesToMigrate.length === 0) return 0

    try {
      console.log(`🚀 Migrating ${treesToMigrate.length} trees to farm ${farmId}`)

      const batch = writeBatch(db)
      let migratedCount = 0

      for (const tree of treesToMigrate) {
        const treeRef = doc(db, 'farms', farmId, 'trees', tree.id)

        // Transform iOS tree data to web format
        const webTreeData = {
          ...tree,
          farmId: farmId,
          needsSync: true,
          lastSyncDate: new Date(),
          updatedAt: Timestamp.now(),
          createdAt: tree.createdAt || Timestamp.now(),
          // Ensure required fields have defaults
          manualFruitCount: tree.manualFruitCount || 0,
          aiFruitCount: tree.aiFruitCount || 0,
          healthStatus: tree.healthStatus || 'Good',
          needsAttention: tree.needsAttention || false
        }

        // Remove undefined values
        Object.keys(webTreeData).forEach(key => {
          if (webTreeData[key as keyof typeof webTreeData] === undefined) {
            delete webTreeData[key as keyof typeof webTreeData]
          }
        })

        batch.set(treeRef, webTreeData)
        migratedCount++

        // Commit in batches of 500 (Firestore limit)
        if (migratedCount % 500 === 0) {
          await batch.commit()
        }
      }

      // Commit remaining items
      if (migratedCount % 500 !== 0) {
        await batch.commit()
      }

      console.log(`✅ Successfully migrated ${migratedCount} trees`)
      return migratedCount

    } catch (error) {
      console.error('❌ Error migrating trees:', error)
      throw new Error(`Migration failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get reconciliation status for a farm
   */
  static async getReconciliationStatus(farmId: string, userId: string): Promise<{
    needsReconciliation: boolean
    lastChecked: Date
    summary: ReconciliationResult['summary']
  }> {
    try {
      const result = await this.compareTreesForFarm(farmId, userId)

      return {
        needsReconciliation: result.summary.treesToMigrate > 0 || result.summary.treesWithConflicts > 0,
        lastChecked: new Date(),
        summary: result.summary
      }
    } catch (error) {
      console.error('Error getting reconciliation status:', error)
      return {
        needsReconciliation: false,
        lastChecked: new Date(),
        summary: {
          treesToMigrate: 0,
          treesWithConflicts: 0,
          treesOnlyInWeb: 0,
          treesOnlyInIos: 0
        }
      }
    }
  }
}