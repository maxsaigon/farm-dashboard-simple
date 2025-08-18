import { 
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { FarmService } from './farm-service'
import { Farm, Tree, ManualEntry, Photo } from './types'

// Admin user configuration
export const ADMIN_CONFIG = {
  uid: 'O6aFgoNhDigSIXk6zdYSDrFWhWG2',
  email: 'minhdai.bmt@gmail.com',
  displayName: 'Admin User',
  permissions: [
    'read',
    'write', 
    'delete',
    'manage_users',
    'manage_zones',
    'manage_investments',
    'admin_access',
    'full_control'
  ]
}

export class AdminService {
  
  // Check if user is admin
  static isAdmin(userId: string): boolean {
    return userId === ADMIN_CONFIG.uid
  }
  
  // Convert various date formats to JavaScript Date
  private static convertToDate(dateValue: unknown): Date | null {
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
  
  // Setup admin user with full permissions
  static async setupAdminUser(): Promise<{ success: boolean, mainFarmId?: string, error?: string }> {
    try {
      console.log('Setting up admin user...')
      
      // 1. Create/update admin user document
      await setDoc(doc(db, 'users', ADMIN_CONFIG.uid), {
        uid: ADMIN_CONFIG.uid,
        email: ADMIN_CONFIG.email,
        displayName: ADMIN_CONFIG.displayName,
        createdAt: Timestamp.now(),
        isAdmin: true,
        role: 'admin'
      }, { merge: true })
      
      // 2. Find existing farms or create main farm
      const mainFarmId = await this.findOrCreateMainFarm()
      
      // 3. Grant admin access to all existing farms
      await this.grantAdminAccessToAllFarms()
      
      // 4. Ensure admin has access to main farm
      await this.ensureMainFarmAccess(mainFarmId)
      
      console.log('✅ Admin setup completed')
      return { success: true, mainFarmId }
      
    } catch (error) {
      console.error('❌ Admin setup failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }
  
  // Find existing main farm or create one
  private static async findOrCreateMainFarm(): Promise<string> {
    // Check if there's already a main farm
    const farmsSnapshot = await getDocs(collection(db, 'farms'))
    
    if (!farmsSnapshot.empty) {
      // Use the first existing farm as main farm
      const firstFarm = farmsSnapshot.docs[0]
      console.log(`Using existing farm as main: ${firstFarm.data().name}`)
      return firstFarm.id
    }
    
    // Create a new main farm
    const mainFarmId = await FarmService.createFarm(
      {
        name: 'Main Farm',
        ownerName: ADMIN_CONFIG.displayName || ADMIN_CONFIG.email,
        totalArea: 10.0,
        centerLatitude: 10.8231, // Default Vietnam coordinates
        centerLongitude: 106.6297
      },
      ADMIN_CONFIG.uid
    )
    
    console.log(`✅ Created main farm: ${mainFarmId}`)
    return mainFarmId
  }
  
  // Grant admin access to all existing farms
  private static async grantAdminAccessToAllFarms(): Promise<void> {
    const farmsSnapshot = await getDocs(collection(db, 'farms'))
    
    for (const farmDoc of farmsSnapshot.docs) {
      try {
        // Check if admin already has access
        const existingAccess = await FarmService.getUserFarmAccess(ADMIN_CONFIG.uid, farmDoc.id)
        
        if (!existingAccess) {
          await FarmService.grantFarmAccess(
            ADMIN_CONFIG.uid,
            farmDoc.id,
            'owner',
            ADMIN_CONFIG.permissions
          )
          console.log(`✅ Granted admin access to farm: ${farmDoc.data().name}`)
        } else {
          console.log(`✅ Admin already has access to farm: ${farmDoc.data().name}`)
        }
      } catch (error) {
        console.warn(`Could not grant access to farm ${farmDoc.id}:`, error)
      }
    }
  }
  
  // Ensure admin has access to main farm
  private static async ensureMainFarmAccess(mainFarmId: string): Promise<void> {
    const access = await FarmService.getUserFarmAccess(ADMIN_CONFIG.uid, mainFarmId)
    
    if (!access) {
      await FarmService.grantFarmAccess(
        ADMIN_CONFIG.uid,
        mainFarmId,
        'owner',
        ADMIN_CONFIG.permissions
      )
      console.log('✅ Granted admin access to main farm')
    } else {
      console.log('✅ Admin already has access to main farm')
    }
  }
  
  // Get all farms that admin has access to
  static async getAdminFarms(): Promise<Farm[]> {
    if (!this.isAdmin(ADMIN_CONFIG.uid)) {
      throw new Error('Not authorized')
    }
    
    return await FarmService.getUserFarms(ADMIN_CONFIG.uid)
  }
  
  // Get main farm ID
  static async getMainFarmId(): Promise<string | null> {
    try {
      const adminConfigDoc = await getDoc(doc(db, 'adminConfig', 'main'))
      if (adminConfigDoc.exists()) {
        return adminConfigDoc.data().mainFarmId || null
      }
      
      // Fallback: get first farm admin has access to
      const adminFarms = await this.getAdminFarms()
      return adminFarms.length > 0 ? adminFarms[0].id : null
      
    } catch (error) {
      console.error('Error getting main farm ID:', error)
      return null
    }
  }
  
  // Auto-setup admin on first login
  static async autoSetupIfNeeded(userId: string): Promise<void> {
    if (!this.isAdmin(userId)) return
    
    try {
      // Check if admin is already set up
      const userDoc = await getDoc(doc(db, 'users', userId))
      const userFarms = await FarmService.getUserFarms(userId)
      
      if (!userDoc.exists() || userFarms.length === 0) {
        console.log('Auto-setting up admin user...')
        await this.setupAdminUser()
      }
    } catch (error) {
      console.error('Auto-setup failed:', error)
    }
  }
  
  // Check if user has admin privileges for a specific operation
  static async hasAdminPrivileges(userId: string): Promise<boolean> {
    if (!this.isAdmin(userId)) return false
    
    // Admin has all privileges
    return true
  }
  
  // Get all farms (admin can see all farms in the system)
  static async getAllFarms(): Promise<Farm[]> {
    if (!this.isAdmin(ADMIN_CONFIG.uid)) {
      throw new Error('Not authorized')
    }
    
    const farmsSnapshot = await getDocs(collection(db, 'farms'))
    const farms: Farm[] = []
    
    for (const farmDoc of farmsSnapshot.docs) {
      const data = farmDoc.data()
      farms.push({
        ...data,
        id: farmDoc.id,
        createdDate: this.convertToDate(data.createdDate) || new Date()
      } as Farm)
    }
    
    return farms.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime())
  }
  
  // Get all trees across all farms (admin only)
  static async getAllTrees(): Promise<Tree[]> {
    if (!this.isAdmin(ADMIN_CONFIG.uid)) {
      throw new Error('Not authorized')
    }
    
    const allTrees: Tree[] = []
    const farms = await this.getAllFarms()
    
    for (const farm of farms) {
      try {
        const treesSnapshot = await getDocs(collection(db, 'farms', farm.id, 'trees'))
        
        treesSnapshot.forEach(treeDoc => {
          const data = treeDoc.data()
          allTrees.push({
            ...data,
            id: treeDoc.id,
            farmId: farm.id,
            farmName: farm.name,
            plantingDate: this.convertToDate(data.plantingDate),
            lastCountDate: this.convertToDate(data.lastCountDate),
            fertilizedDate: this.convertToDate(data.fertilizedDate),
            prunedDate: this.convertToDate(data.prunedDate),
            lastSyncDate: this.convertToDate(data.lastSyncDate),
            lastAIAnalysisDate: this.convertToDate(data.lastAIAnalysisDate),
            createdAt: this.convertToDate(data.createdAt || data.createdDate),
            updatedAt: this.convertToDate(data.updatedAt || data.lastModified)
          } as Tree)
        })
      } catch (error) {
        console.warn(`Could not fetch trees from farm ${farm.id}:`, error)
      }
    }
    
    return allTrees.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
  }
  
  // Get all manual entries across all farms (admin only)
  static async getAllManualEntries(): Promise<ManualEntry[]> {
    if (!this.isAdmin(ADMIN_CONFIG.uid)) {
      throw new Error('Not authorized')
    }
    
    const allEntries: ManualEntry[] = []
    const farms = await this.getAllFarms()
    
    for (const farm of farms) {
      try {
        const entriesSnapshot = await getDocs(collection(db, 'farms', farm.id, 'manualEntries'))
        
        entriesSnapshot.forEach(entryDoc => {
          const data = entryDoc.data()
          allEntries.push({
            ...data,
            id: entryDoc.id,
            farmId: farm.id,
            farmName: farm.name,
            entryDate: this.convertToDate(data.entryDate) || new Date()
          } as ManualEntry)
        })
      } catch (error) {
        console.warn(`Could not fetch manual entries from farm ${farm.id}:`, error)
      }
    }
    
    return allEntries.sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime())
  }
  
  // Get all photos across all farms (admin only)
  static async getAllPhotos(): Promise<Photo[]> {
    if (!this.isAdmin(ADMIN_CONFIG.uid)) {
      throw new Error('Not authorized')
    }
    
    const allPhotos: Photo[] = []
    const farms = await this.getAllFarms()
    
    for (const farm of farms) {
      try {
        const photosSnapshot = await getDocs(collection(db, 'farms', farm.id, 'photos'))
        
        photosSnapshot.forEach(photoDoc => {
          const data = photoDoc.data()
          allPhotos.push({
            ...data,
            id: photoDoc.id,
            farmId: farm.id,
            farmName: farm.name,
            timestamp: this.convertToDate(data.timestamp) || new Date(),
            uploadDate: this.convertToDate(data.uploadDate),
            localStorageDate: this.convertToDate(data.localStorageDate)
          } as Photo)
        })
      } catch (error) {
        console.warn(`Could not fetch photos from farm ${farm.id}:`, error)
      }
    }
    
    return allPhotos.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
  
  // Get admin status and info
  static async getAdminInfo(userId: string): Promise<{
    isAdmin: boolean
    mainFarmId?: string
    totalFarms?: number
    permissions?: string[]
  }> {
    const isAdmin = this.isAdmin(userId)
    
    if (!isAdmin) {
      return { isAdmin: false }
    }
    
    try {
      const mainFarmId = await this.getMainFarmId()
      const farms = await this.getAdminFarms()
      
      return {
        isAdmin: true,
        mainFarmId: mainFarmId || undefined,
        totalFarms: farms.length,
        permissions: ADMIN_CONFIG.permissions
      }
    } catch (error) {
      console.error('Error getting admin info:', error)
      return { isAdmin: true }
    }
  }
}