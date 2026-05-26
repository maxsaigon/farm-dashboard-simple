import { 
  collection, 
  doc,
  getDocs,
  query, 
  where,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { User } from './types'
import { FarmService } from './farm-service'

export class MigrationService {
  
  // Check if user has legacy data (userId-scoped trees/photos)
  static async hasLegacyData(userId: string): Promise<boolean> {
    try {
      // Check for old userId-based trees
      const treesQuery = query(
        collection(db, 'trees'),
        where('userId', '==', userId)
      )
      const treesSnapshot = await getDocs(treesQuery)
      
      if (!treesSnapshot.empty) return true
      
      // Check for old userId-based photos
      const photosQuery = query(
        collection(db, 'photos'),
        where('userId', '==', userId)
      )
      const photosSnapshot = await getDocs(photosQuery)
      
      return !photosSnapshot.empty
    } catch (error) {
      return false
    }
  }
  
  // Migrate user's legacy data to farm-based structure
  static async migrateLegacyData(userId: string, user: User): Promise<string> {
    try {
      // 1. Create a default farm for the user
      const farmName = user.displayName ? `${user.displayName}'s Farm` : 'My Farm'
      const farmId = await FarmService.createFarm(
        {
          name: farmName,
          ownerName: user.displayName || user.email || 'Farm Owner'
        },
        userId
      )

      // 2. Migrate trees
      await this.migrateTrees(userId, farmId)

      // 3. Migrate photos
      await this.migratePhotos(userId, farmId)

      // 4. Clean up old collections (optional - keep for safety)
      // await this.cleanupLegacyData(userId)

      return farmId

    } catch (error) {
      throw new Error(`Migration failed: ${(error as Error).message}`)
    }
  }
  
  // Migrate trees from userId-based to farmId-based collection
  private static async migrateTrees(userId: string, farmId: string): Promise<number> {
    const treesQuery = query(
      collection(db, 'trees'),
      where('userId', '==', userId)
    )
    
    const snapshot = await getDocs(treesQuery)
    if (snapshot.empty) return 0
    
    const batch = writeBatch(db)
    let count = 0
    
    for (const treeDoc of snapshot.docs) {
      const data = treeDoc.data()
      
      // Transform data to match new schema
      const migratedTree = {
        id: treeDoc.id,
        name: data.name,
        farmId: farmId,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        gpsAccuracy: data.gpsAccuracy,
        plantingDate: data.plantingDate,
        variety: data.variety,
        treeStatus: data.treeStatus || 'Young Tree',
        healthStatus: data.healthStatus,
        notes: data.notes,
        qrCode: data.qrCode,
        zoneCode: data.zoneCode,
        manualFruitCount: data.currentFruitCount || data.manualFruitCount || 0,
        lastCountDate: data.lastInspectionDate || data.lastCountDate,
        treeHeight: data.treeHeight,
        trunkDiameter: data.trunkDiameter,
        healthNotes: data.healthNotes,
        fertilizedDate: data.fertilizedDate,
        prunedDate: data.prunedDate,
        diseaseNotes: data.diseaseNotes,
        needsSync: true, // Mark for sync with iOS app\n        lastSyncDate: null,
        aiFruitCount: data.aiFruitCount || 0,
        lastAIAnalysisDate: data.lastAIAnalysisDate,
        aiAccuracy: data.aiAccuracy,
        needsAttention: data.needsAttention || false,
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now()
      }
      
      // Remove undefined values
      Object.keys(migratedTree).forEach(key => {
        const typedKey = key as keyof typeof migratedTree
        if (migratedTree[typedKey] === undefined) {
          delete migratedTree[typedKey]
        }
      })
      
      // Add to new farm-based collection
      const newTreeRef = doc(db, 'farms', farmId, 'trees', treeDoc.id)
      batch.set(newTreeRef, migratedTree)
      count++
    }
    
    await batch.commit()
    return count
  }
  
  // Migrate photos from userId-based to farmId-based collection
  private static async migratePhotos(userId: string, farmId: string): Promise<number> {
    const photosQuery = query(
      collection(db, 'photos'),
      where('userId', '==', userId)
    )
    
    const snapshot = await getDocs(photosQuery)
    if (snapshot.empty) return 0
    
    const batch = writeBatch(db)
    let count = 0
    
    for (const photoDoc of snapshot.docs) {
      const data = photoDoc.data()
      
      // Transform data to match new schema
      const migratedPhoto = {
        id: photoDoc.id,
        timestamp: data.timestamp || Timestamp.now(),
        localPath: data.imageUrl || data.localPath || '',
        farmId: farmId,
        filename: data.filename,
        photoType: data.photoType || 'general',
        userNotes: data.userNotes,
        manualFruitCount: data.manualFruitCount,
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude,
        needsAIAnalysis: data.needsAIAnalysis !== false, // Default to true\n        uploadedToServer: data.uploadStatus === 'uploaded',
        serverProcessed: data.serverProcessed || false,
        uploadDate: data.uploadDate,
        thumbnailPath: data.thumbnailUrl || data.thumbnailPath,
        compressedPath: data.compressedPath,
        aiReadyPath: data.aiReadyPath,
        originalPath: data.originalPath,
        localStorageDate: data.localStorageDate,
        totalLocalSize: data.totalLocalSize,
        treeId: data.treeId
      }
      
      // Remove undefined values
      Object.keys(migratedPhoto).forEach(key => {
        const typedKey = key as keyof typeof migratedPhoto
        if (migratedPhoto[typedKey] === undefined) {
          delete migratedPhoto[typedKey]
        }
      })
      
      // Add to new farm-based collection
      const newPhotoRef = doc(db, 'farms', farmId, 'photos', photoDoc.id)
      batch.set(newPhotoRef, migratedPhoto)
      count++
    }
    
    await batch.commit()
    return count
  }
  
  // Clean up old legacy data (USE WITH CAUTION)
  static async cleanupLegacyData(userId: string): Promise<void> {

    // Delete old trees
    const treesQuery = query(
      collection(db, 'trees'),
      where('userId', '==', userId)
    )
    const treesSnapshot = await getDocs(treesQuery)

    const batch = writeBatch(db)
    let operationCount = 0

    for (const doc of treesSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++

      // Firestore batch limit is 500 operations
      if (operationCount >= 500) {
        await batch.commit()
        operationCount = 0
      }
    }

    // Delete old photos
    const photosQuery = query(
      collection(db, 'photos'),
      where('userId', '==', userId)
    )
    const photosSnapshot = await getDocs(photosQuery)

    for (const doc of photosSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++

      if (operationCount >= 500) {
        await batch.commit()
        operationCount = 0
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit()
    }
  }
  
  // Get migration status for a user
  static async getMigrationStatus(userId: string): Promise<{
    hasLegacyData: boolean
    hasNewData: boolean
    migrationNeeded: boolean
    defaultFarmExists: boolean
  }> {
    try {
      const hasLegacyData = await this.hasLegacyData(userId)
      
      // Check if user has any farms
      const userFarms = await FarmService.getUserFarms(userId)
      const hasNewData = userFarms.length > 0
      const defaultFarmExists = userFarms.some(farm => 
        farm.name.includes('Farm') || farm.name.includes('My')
      )
      
      return {
        hasLegacyData,
        hasNewData,
        migrationNeeded: hasLegacyData && !hasNewData,
        defaultFarmExists
      }
    } catch (error) {
      return {
        hasLegacyData: false,
        hasNewData: false,
        migrationNeeded: false,
        defaultFarmExists: false
      }
    }
  }
  
  // Batch migrate multiple users (admin function)
  static async batchMigrate(userIds: string[]): Promise<{
    successful: string[]
    failed: Array<{ userId: string, error: string }>
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ userId: string, error: string }>
    }
    
    for (const userId of userIds) {
      try {
        // Simplified - in real implementation, fetch user data
        const userData: User = {
          uid: userId,
          email: `user${userId}@example.com`,
          createdAt: new Date()
        }
        
        await this.migrateLegacyData(userId, userData)
        results.successful.push(userId)
        
        // Small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        results.failed.push({
          userId,
          error: (error as Error).message
        })
      }
    }
    
    return results
  }
}