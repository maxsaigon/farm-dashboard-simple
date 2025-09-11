import { 
  collection, 
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot, 
  query, 
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { Tree, Photo, ManualEntry, DashboardStats, FarmStatistics } from './types'
import { FarmService } from './farm-service'
import { AdminService } from './admin-service'
import { safeFirebaseOperation, withTimeout, NetworkError } from './network-utils'

// Convert various date formats to JavaScript Date
function convertToDate(dateValue: unknown): Date | null {
  if (!dateValue) return null
  
  // Already a Date object
  if (dateValue instanceof Date) {
    return dateValue
  }
  
  // Firestore Timestamp object
  if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue && typeof (dateValue as Timestamp).toDate === 'function') {
    try {
      return (dateValue as Timestamp).toDate()
    } catch (error) {
      console.warn('Error converting Firestore timestamp:', error)
      return null
    }
  }
  
  // Unix timestamp (number)
  if (typeof dateValue === 'number') {
    return new Date(dateValue * 1000) // Convert seconds to milliseconds
  }
  
  // ISO string
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  
  // Object with seconds/nanoseconds (iOS Core Data timestamp format)
  if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
    const timestampObj = dateValue as { seconds?: number; nanoseconds?: number }
    const seconds = timestampObj.seconds || 0
    const nanoseconds = timestampObj.nanoseconds || 0
    return new Date(seconds * 1000 + nanoseconds / 1000000)
  }
  
  console.warn('Unknown date format:', dateValue)
  return null
}

// Real-time listener for trees in a farm
export function subscribeToTrees(farmId: string, userId: string, callback: (trees: Tree[]) => void) {
  // Admin can access all trees
  if (AdminService.isAdmin(userId)) {
    safeFirebaseOperation(
      () => AdminService.getAllTrees(),
      [] as Tree[],
      { timeout: 15000, retries: 2 }
    ).then(async (allTrees) => {
      // For admin, we need to enrich trees from each farm separately
      const treesWithZones: Tree[] = []
      const treesByFarm = new Map<string, Tree[]>()
      
      // Group trees by farmId
      ;(allTrees as Tree[]).forEach(tree => {
        if (!treesByFarm.has(tree.farmId)) {
          treesByFarm.set(tree.farmId, [])
        }
        treesByFarm.get(tree.farmId)!.push(tree)
      })
      
      // Enrich trees for each farm
      for (const [farmId, trees] of Array.from(treesByFarm.entries())) {
        try {
          const enrichedTrees = await enrichTreesWithZoneNames(trees, farmId)
          treesWithZones.push(...enrichedTrees)
        } catch (error) {
          console.error(`Error enriching trees for farm ${farmId}:`, error)
          treesWithZones.push(...trees) // Fallback without zone names
        }
      }
      
      callback(treesWithZones)
    }).catch(error => {
      console.error('Error loading admin trees:', error)
      callback([])
    })
    return () => {} // Return empty unsubscribe function for admin
  }
  
  // Check farm access first for non-admin users
  FarmService.checkFarmAccess(userId, farmId, ['read']).then(async hasAccess => {
    if (!hasAccess) {
      console.error('No access to farm:', farmId)
      
      // Try to get user's farms to see what they have access to
      try {
        const userFarms = await FarmService.getUserFarms(userId)
        console.log('User has access to farms:', userFarms.map(f => ({ id: f.id, name: f.name })))
        
        if (userFarms.length === 0) {
          console.error('User has no farm access at all. Please contact admin.')
        } else {
          console.error(`User does not have access to farm ${farmId}. Available farms:`, userFarms.map(f => f.id))
        }
      } catch (error) {
        console.error('Error checking user farms:', error)
      }
      
      callback([])
      return
    }
    
    const treesRef = collection(db, 'farms', farmId, 'trees')
    const q = query(treesRef, orderBy('plantingDate', 'desc'))
    
    return onSnapshot(q, (snapshot) => {
      try {
        const trees: Tree[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          
          // Handle customFields with nested dates
          let customFields = data.customFields
          if (customFields && customFields.lastUpdated) {
            customFields = {
              ...customFields,
              lastUpdated: convertToDate(customFields.lastUpdated)
            }
            // Also handle any date fields in the fields array
            if (customFields.fields) {
              customFields.fields = customFields.fields.map((field: any) => ({
                ...field,
                updatedAt: field.updatedAt ? convertToDate(field.updatedAt) : field.updatedAt
              }))
            }
          }
          
          trees.push({
            id: doc.id,
            ...data,
            farmId,
            plantingDate: convertToDate(data.plantingDate),
            lastCountDate: convertToDate(data.lastCountDate),
            fertilizedDate: convertToDate(data.fertilizedDate),
            prunedDate: convertToDate(data.prunedDate),
            lastSyncDate: convertToDate(data.lastSyncDate),
            lastAIAnalysisDate: convertToDate(data.lastAIAnalysisDate),
            createdAt: convertToDate(data.createdAt || data.createdDate),
            updatedAt: convertToDate(data.updatedAt || data.lastModified),
            customFields: customFields
          } as Tree)
        })
        
        // Enrich trees with zone names
        enrichTreesWithZoneNames(trees, farmId).then(enrichedTrees => {
          callback(enrichedTrees)
        }).catch(error => {
          console.error('Error enriching trees with zone names:', error)
          callback(trees) // Fallback to trees without zone names
        })
      } catch (error) {
        console.error('Error processing tree data:', error)
        callback([])
      }
    }, (error) => {
      console.error('Firestore subscription error:', error)
      // Call with empty array on error to prevent infinite loading
      callback([])
    })
  })
}

// Create a new tree
export async function createTree(farmId: string, userId: string, tree: Omit<Tree, 'id' | 'farmId'>): Promise<string> {
  // Admin can create trees in any farm
  if (!AdminService.isAdmin(userId)) {
    const hasAccess = await FarmService.checkFarmAccess(userId, farmId, ['write'])
    if (!hasAccess) throw new Error('No permission to create trees')
  }
  
  const treeRef = doc(collection(db, 'farms', farmId, 'trees'))
  const treeData = {
    ...tree,
    farmId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    plantingDate: tree.plantingDate ? Timestamp.fromDate(tree.plantingDate) : null,
    lastCountDate: tree.lastCountDate ? Timestamp.fromDate(tree.lastCountDate) : null,
    fertilizedDate: tree.fertilizedDate ? Timestamp.fromDate(tree.fertilizedDate) : null,
    prunedDate: tree.prunedDate ? Timestamp.fromDate(tree.prunedDate) : null,
    lastSyncDate: tree.lastSyncDate ? Timestamp.fromDate(tree.lastSyncDate) : null,
    lastAIAnalysisDate: tree.lastAIAnalysisDate ? Timestamp.fromDate(tree.lastAIAnalysisDate) : null
  }
  
  await setDoc(treeRef, treeData)
  return treeRef.id
}

// Helper function to convert Date objects in nested objects to Timestamps
function convertDatesToTimestamps(obj: any): any {
  if (obj instanceof Date) {
    return Timestamp.fromDate(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToTimestamps)
  }
  if (obj && typeof obj === 'object') {
    const converted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDatesToTimestamps(value)
    }
    return converted
  }
  return obj
}

// Update tree
export async function updateTree(farmId: string, treeId: string, userId: string, updates: Partial<Tree>): Promise<void> {
  // Admin can update trees in any farm
  if (!AdminService.isAdmin(userId)) {
    const hasAccess = await FarmService.checkFarmAccess(userId, farmId, ['write'])
    if (!hasAccess) throw new Error('No permission to update trees')
  }
  
  const treeRef = doc(db, 'farms', farmId, 'trees', treeId)
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
    plantingDate: updates.plantingDate ? Timestamp.fromDate(updates.plantingDate) : undefined,
    lastCountDate: updates.lastCountDate ? Timestamp.fromDate(updates.lastCountDate) : undefined,
    fertilizedDate: updates.fertilizedDate ? Timestamp.fromDate(updates.fertilizedDate) : undefined,
    prunedDate: updates.prunedDate ? Timestamp.fromDate(updates.prunedDate) : undefined,
    lastSyncDate: updates.lastSyncDate ? Timestamp.fromDate(updates.lastSyncDate) : undefined,
    lastAIAnalysisDate: updates.lastAIAnalysisDate ? Timestamp.fromDate(updates.lastAIAnalysisDate) : undefined,
    // Handle customFields with nested Date objects
    customFields: updates.customFields ? convertDatesToTimestamps(updates.customFields) : undefined
  }
  
  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData]
    }
  })
  
  console.log('Updating tree with data:', updateData)
  
  await updateDoc(treeRef, updateData)
}

// Delete tree
export async function deleteTree(farmId: string, treeId: string, userId: string): Promise<void> {
  // Admin can delete trees in any farm
  if (!AdminService.isAdmin(userId)) {
    const hasAccess = await FarmService.checkFarmAccess(userId, farmId, ['delete'])
    if (!hasAccess) throw new Error('No permission to delete trees')
  }
  
  await deleteDoc(doc(db, 'farms', farmId, 'trees', treeId))
}

// Calculate dashboard statistics
export function calculateDashboardStats(trees: Tree[]): DashboardStats {
  const totalTrees = trees.length
  const healthyTrees = trees.filter(tree => 
    tree.healthStatus === 'Excellent' || tree.healthStatus === 'Good'
  ).length
  const treesNeedingAttention = trees.filter(tree => tree.needsAttention).length
  const totalFruits = trees.reduce((sum, tree) => 
    sum + (tree.manualFruitCount || 0) + (tree.aiFruitCount || 0), 0
  )
  
  // Calculate GPS coverage
  const treesWithGPS = trees.filter(tree => 
    tree.latitude && tree.longitude && tree.latitude !== 0 && tree.longitude !== 0
  )
  const gpsCoverage = totalTrees > 0 ? treesWithGPS.length / totalTrees : 0
  
  return {
    totalTrees,
    healthyTrees,
    treesNeedingAttention,
    totalFruits,
    gpsCoverage,
    zonesCount: 0 // Will be updated when zones are implemented
  }
}

// Calculate farm statistics (matching iOS implementation)
export function calculateFarmStatistics(trees: Tree[], investments: { amount: number }[] = [], season: number = new Date().getFullYear()): FarmStatistics {
  const totalTrees = trees.length
  const totalHarvest = trees.reduce((sum, tree) => 
    sum + (tree.manualFruitCount || 0) + (tree.aiFruitCount || 0), 0
  )
  const totalInvestment = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  
  // Calculate GPS coverage
  const treesWithGPS = trees.filter(tree => 
    tree.latitude && tree.longitude && tree.latitude !== 0 && tree.longitude !== 0
  )
  const gpsCoverage = totalTrees > 0 ? treesWithGPS.length / totalTrees : 0
  
  // Calculate revenue (assuming average price per fruit - 5k VND)
  const averagePricePerFruit = 5000
  const totalRevenue = totalHarvest * averagePricePerFruit
  const profit = totalRevenue - totalInvestment
  
  const averageHarvestPerTree = totalTrees > 0 ? totalHarvest / totalTrees : 0
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
  const investmentPerTree = totalTrees > 0 ? totalInvestment / totalTrees : 0
  const revenuePerTree = totalTrees > 0 ? totalRevenue / totalTrees : 0
  
  return {
    season,
    totalTrees,
    totalHarvest,
    totalInvestment,
    totalRevenue,
    profit,
    averageHarvestPerTree,
    gpsCoverage,
    zonesCount: 0, // Will be updated when zones are implemented
    profitMargin,
    investmentPerTree,
    revenuePerTree
  }
}

// Get trees that need attention
export function getTreesNeedingAttention(trees: Tree[]): Tree[] {
  return trees.filter(tree => tree.needsAttention)
}

// Load zones and create zone code to name mapping
async function getZoneNameMap(farmId: string): Promise<Map<string, string>> {
  const zoneNameMap = new Map<string, string>()
  
  try {
    // Try to load zones from farm-specific collection first
    let zonesRef = collection(db, 'farms', farmId, 'zones')
    let zonesSnapshot = await getDocs(zonesRef)
    
    // If no zones found in farm collection, try global zones collection filtered by farmId
    if (zonesSnapshot.empty) {
      zonesRef = collection(db, 'zones')
      zonesSnapshot = await getDocs(query(zonesRef, where('farmId', '==', farmId)))
    }
    
    zonesSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const zoneName = data.name || `Zone ${doc.id}`
      
      // Map both zone ID and any zone codes to the zone name
      zoneNameMap.set(doc.id, zoneName)
      if (data.code) {
        zoneNameMap.set(data.code, zoneName)
      }
    })
    
  } catch (error) {
    console.error('Error loading zone names:', error)
  }
  
  return zoneNameMap
}

// Enrich trees with zone names
async function enrichTreesWithZoneNames(trees: Tree[], farmId: string): Promise<Tree[]> {
  const zoneNameMap = await getZoneNameMap(farmId)
  
  return trees.map(tree => ({
    ...tree,
    zoneName: tree.zoneCode ? zoneNameMap.get(tree.zoneCode) : undefined
  }))
}

// Photos management
export function subscribeToPhotos(farmId: string, userId: string, callback: (photos: Photo[]) => void) {
  // Admin can access all photos
  if (AdminService.isAdmin(userId)) {
    AdminService.getAllPhotos().then(allPhotos => {
      callback(allPhotos as Photo[])
    }).catch(error => {
      console.error('Error loading admin photos:', error)
      callback([])
    })
    return () => {} // Return empty unsubscribe function for admin
  }
  
  FarmService.checkFarmAccess(userId, farmId, ['read']).then(hasAccess => {
    if (!hasAccess) {
      callback([])
      return
    }
    
    const photosRef = collection(db, 'farms', farmId, 'photos')
    const q = query(photosRef, orderBy('timestamp', 'desc'))
    
    return onSnapshot(q, (snapshot) => {
      const photos: Photo[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        photos.push({
          id: doc.id,
          ...data,
          farmId,
          timestamp: convertToDate(data.timestamp) || new Date(),
          uploadDate: convertToDate(data.uploadDate),
          localStorageDate: convertToDate(data.localStorageDate),
        } as Photo)
      })
      callback(photos)
    })
  })
}

// Manual entries management
export function subscribeToManualEntries(farmId: string, userId: string, callback: (entries: ManualEntry[]) => void) {
  // Admin can access all manual entries
  if (AdminService.isAdmin(userId)) {
    AdminService.getAllManualEntries().then(allEntries => {
      callback(allEntries as ManualEntry[])
    }).catch(error => {
      console.error('Error loading admin manual entries:', error)
      callback([])
    })
    return () => {} // Return empty unsubscribe function for admin
  }
  
  FarmService.checkFarmAccess(userId, farmId, ['read']).then(hasAccess => {
    if (!hasAccess) {
      callback([])
      return
    }
    
    const entriesRef = collection(db, 'farms', farmId, 'manualEntries')
    const q = query(entriesRef, orderBy('entryDate', 'desc'))
    
    return onSnapshot(q, (snapshot) => {
      const entries: ManualEntry[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        entries.push({
          id: doc.id,
          ...data,
          farmId,
          entryDate: convertToDate(data.entryDate) || new Date(),
        } as ManualEntry)
      })
      callback(entries)
    })
  })
}