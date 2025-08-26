// Super Admin service with full system control
import { db } from './firebase'
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp,
  limit,
  startAfter
} from 'firebase/firestore'
import { 
  EnhancedUser, 
  EnhancedFarm, 
  UserRole, 
  Organization, 
  FarmInvitation,
  ActivityLog,
  RoleType,
  Permission,
  ROLE_PERMISSIONS
} from './types-enhanced'
import { Tree, Photo, FarmZone, Investment, ManualEntry } from './types'
import { enhancedAuthService } from './enhanced-auth-service'

export class SuperAdminService {
  
  constructor() {
    // Ensure only super admins can use this service
    if (!enhancedAuthService.isSuperAdmin()) {
      throw new Error('Unauthorized: Super admin access required')
    }
  }

  // ====================
  // ORGANIZATION MANAGEMENT
  // ====================

  async createOrganization(data: {
    name: string
    displayName?: string
    subscriptionType?: 'free' | 'pro' | 'enterprise'
    ownerId: string
  }): Promise<Organization> {
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const organization: Organization = {
      id: orgId,
      name: data.name,
      displayName: data.displayName || data.name,
      subscriptionType: data.subscriptionType || 'free',
      subscriptionStatus: 'active',
      maxFarms: this.getSubscriptionLimits(data.subscriptionType || 'free').maxFarms,
      maxUsersPerFarm: this.getSubscriptionLimits(data.subscriptionType || 'free').maxUsersPerFarm,
      maxUsersTotal: this.getSubscriptionLimits(data.subscriptionType || 'free').maxUsersTotal,
      features: this.getSubscriptionFeatures(data.subscriptionType || 'free') as any,
      settings: {
        allowSelfRegistration: false,
        requireEmailVerification: true,
        requireAdminApproval: true,
        defaultUserRole: 'viewer',
        sessionTimeout: 480,
        enableAuditLogging: true,
        enableAPIAccess: data.subscriptionType !== 'free'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    }

    await setDoc(doc(db, 'organizations', orgId), {
      ...organization,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Grant organization admin role to owner
    await enhancedAuthService.grantUserRole(
      data.ownerId, 
      'organization_admin', 
      'organization', 
      orgId, 
      enhancedAuthService.getCurrentUser()?.uid || ''
    )

    await this.logAdminActivity('organization:created', 'organization', orgId, { organizationData: organization })

    return organization
  }

  async getAllOrganizations(): Promise<Organization[]> {
    const orgsSnapshot = await getDocs(collection(db, 'organizations'))
    return orgsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Organization[]
  }

  async updateOrganization(orgId: string, updates: Partial<Organization>): Promise<void> {
    const orgRef = doc(db, 'organizations', orgId)
    await updateDoc(orgRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })

    await this.logAdminActivity('organization:updated', 'organization', orgId, { updates })
  }

  async deleteOrganization(orgId: string, transferFarmsToOrgId?: string): Promise<void> {
    const batch = writeBatch(db)

    // Get all farms in this organization
    const farmsQuery = query(collection(db, 'farms'), where('organizationId', '==', orgId))
    const farmsSnapshot = await getDocs(farmsQuery)

    if (transferFarmsToOrgId) {
      // Transfer farms to another organization
      farmsSnapshot.docs.forEach(farmDoc => {
        batch.update(doc(db, 'farms', farmDoc.id), {
          organizationId: transferFarmsToOrgId,
          updatedAt: serverTimestamp()
        })
      })
    } else {
      // Delete all farms and their data
      for (const farmDoc of farmsSnapshot.docs) {
        await this.deleteFarm(farmDoc.id)
      }
    }

    // Delete organization roles
    const rolesQuery = query(
      collection(db, 'userRoles'), 
      where('scopeType', '==', 'organization'),
      where('scopeId', '==', orgId)
    )
    const rolesSnapshot = await getDocs(rolesQuery)
    rolesSnapshot.docs.forEach(roleDoc => {
      batch.delete(doc(db, 'userRoles', roleDoc.id))
    })

    // Delete organization
    batch.delete(doc(db, 'organizations', orgId))

    await batch.commit()
    await this.logAdminActivity('organization:deleted', 'organization', orgId, { transferFarmsToOrgId })
  }

  // ====================
  // FARM MANAGEMENT
  // ====================

  async createFarm(data: {
    name: string
    organizationId?: string
    ownerId: string
    farmType?: 'personal' | 'commercial' | 'cooperative' | 'research'
    location?: { latitude: number; longitude: number }
  }): Promise<EnhancedFarm> {
    const farmId = `farm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const farm: EnhancedFarm = {
      id: farmId,
      name: data.name,
      organizationId: data.organizationId,
      farmType: data.farmType || 'personal',
      status: 'active',
      createdDate: new Date(),
      centerLatitude: data.location?.latitude,
      centerLongitude: data.location?.longitude,
      settings: {
        timezone: 'Asia/Ho_Chi_Minh',
        currency: 'VND',
        units: 'metric',
        language: 'vi-VN',
        enableGPSTracking: true,
        enablePhotoGeotagging: true,
        dataRetentionDays: 365,
        backupFrequency: 'daily'
      },
      contacts: [],
      certifications: [],
      metadata: {}
    }

    await setDoc(doc(db, 'farms', farmId), {
      ...farm,
      createdDate: serverTimestamp()
    })

    // Grant farm owner role
    await enhancedAuthService.grantUserRole(
      data.ownerId, 
      'farm_owner', 
      'farm', 
      farmId, 
      enhancedAuthService.getCurrentUser()?.uid || ''
    )

    // Create legacy UserFarmAccess for backward compatibility
    await setDoc(doc(db, 'userFarmAccess', `${data.ownerId}_${farmId}`), {
      userId: data.ownerId,
      farmId,
      role: 'owner',
      permissions: ROLE_PERMISSIONS.farm_owner,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    await this.logAdminActivity('farm:created', 'farm', farmId, { farmData: farm })
    return farm
  }

  async getAllFarms(): Promise<EnhancedFarm[]> {
    const farmsSnapshot = await getDocs(collection(db, 'farms'))
    return farmsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdDate: doc.data().createdDate?.toDate() || new Date()
    })) as EnhancedFarm[]
  }

  async getFarmsByOrganization(organizationId: string): Promise<EnhancedFarm[]> {
    const farmsQuery = query(collection(db, 'farms'), where('organizationId', '==', organizationId))
    const farmsSnapshot = await getDocs(farmsQuery)
    return farmsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdDate: doc.data().createdDate?.toDate() || new Date()
    })) as EnhancedFarm[]
  }

  async updateFarm(farmId: string, updates: Partial<EnhancedFarm>): Promise<void> {
    const farmRef = doc(db, 'farms', farmId)
    await updateDoc(farmRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })

    await this.logAdminActivity('farm:updated', 'farm', farmId, { updates })
  }

  async deleteFarm(farmId: string): Promise<void> {
    const batch = writeBatch(db)

    // Delete all farm subcollections
    const subcollections = ['trees', 'photos', 'manualEntries', 'investments', 'zones']
    
    for (const subcoll of subcollections) {
      const collRef = collection(db, 'farms', farmId, subcoll)
      const snapshot = await getDocs(collRef)
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
    }

    // Delete user farm access records
    const accessQuery = query(collection(db, 'userFarmAccess'), where('farmId', '==', farmId))
    const accessSnapshot = await getDocs(accessQuery)
    accessSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete farm roles
    const rolesQuery = query(
      collection(db, 'userRoles'), 
      where('scopeType', '==', 'farm'),
      where('scopeId', '==', farmId)
    )
    const rolesSnapshot = await getDocs(rolesQuery)
    rolesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete the farm itself
    batch.delete(doc(db, 'farms', farmId))

    await batch.commit()
    await this.logAdminActivity('farm:deleted', 'farm', farmId)
  }

  // ====================
  // USER MANAGEMENT
  // ====================

  async getAllUsers(): Promise<EnhancedUser[]> {
    const usersSnapshot = await getDocs(collection(db, 'users'))
    return usersSnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      lastLoginAt: doc.data().lastLoginAt?.toDate()
    } as EnhancedUser))
  }

  async getUserById(userId: string): Promise<EnhancedUser | null> {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) return null

    return {
      ...userDoc.data(),
      createdAt: userDoc.data().createdAt?.toDate() || new Date(),
      lastLoginAt: userDoc.data().lastLoginAt?.toDate()
    } as EnhancedUser
  }

  async updateUser(userId: string, updates: Partial<EnhancedUser>): Promise<void> {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })

    await this.logAdminActivity('user:updated', 'user', userId, { updates })
  }

  async deleteUser(userId: string, transferDataToUserId?: string): Promise<void> {
    const batch = writeBatch(db)

    if (transferDataToUserId) {
      // Transfer user's data to another user
      await this.transferUserData(userId, transferDataToUserId)
    } else {
      // Delete user's roles
      const rolesQuery = query(collection(db, 'userRoles'), where('userId', '==', userId))
      const rolesSnapshot = await getDocs(rolesQuery)
      rolesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })

      // Delete user farm access
      const accessQuery = query(collection(db, 'userFarmAccess'), where('userId', '==', userId))
      const accessSnapshot = await getDocs(accessQuery)
      accessSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
    }

    // Delete user profile
    batch.delete(doc(db, 'users', userId))

    await batch.commit()
    await this.logAdminActivity('user:deleted', 'user', userId, { transferDataToUserId })
  }

  async grantSuperAdminRole(userId: string): Promise<void> {
    await enhancedAuthService.grantUserRole(
      userId, 
      'super_admin', 
      'system', 
      undefined, 
      enhancedAuthService.getCurrentUser()?.uid || ''
    )
    
    await this.logAdminActivity('role:super_admin_granted', 'user', userId)
  }

  async revokeSuperAdminRole(userId: string): Promise<void> {
    const roleId = `${userId}_super_admin_system_system`
    await enhancedAuthService.revokeUserRole(roleId, enhancedAuthService.getCurrentUser()?.uid || '')
    
    await this.logAdminActivity('role:super_admin_revoked', 'user', userId)
  }

  // ====================
  // TREE MANAGEMENT
  // ====================

  async getAllTrees(): Promise<Tree[]> {
    const farms = await this.getAllFarms()
    const allTrees: Tree[] = []

    for (const farm of farms) {
      const treesSnapshot = await getDocs(collection(db, 'farms', farm.id, 'trees'))
      const farmTrees = treesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        farmId: farm.id,
        farmName: farm.name,
        plantingDate: doc.data().plantingDate?.toDate(),
        lastCountDate: doc.data().lastCountDate?.toDate(),
        lastAIAnalysisDate: doc.data().lastAIAnalysisDate?.toDate(),
        fertilizedDate: doc.data().fertilizedDate?.toDate(),
        prunedDate: doc.data().prunedDate?.toDate(),
        lastSyncDate: doc.data().lastSyncDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Tree[]

      allTrees.push(...farmTrees)
    }

    return allTrees
  }

  async getTreesByFarm(farmId: string): Promise<Tree[]> {
    const treesSnapshot = await getDocs(collection(db, 'farms', farmId, 'trees'))
    return treesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      farmId,
      plantingDate: doc.data().plantingDate?.toDate(),
      lastCountDate: doc.data().lastCountDate?.toDate(),
      lastAIAnalysisDate: doc.data().lastAIAnalysisDate?.toDate(),
      fertilizedDate: doc.data().fertilizedDate?.toDate(),
      prunedDate: doc.data().prunedDate?.toDate(),
      lastSyncDate: doc.data().lastSyncDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Tree[]
  }

  async updateTree(farmId: string, treeId: string, updates: Partial<Tree>): Promise<void> {
    const treeRef = doc(db, 'farms', farmId, 'trees', treeId)
    await updateDoc(treeRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })

    await this.logAdminActivity('tree:updated', 'tree', treeId, { farmId, updates })
  }

  async deleteTree(farmId: string, treeId: string): Promise<void> {
    // Delete tree photos
    const photosSnapshot = await getDocs(
      query(collection(db, 'farms', farmId, 'photos'), where('treeId', '==', treeId))
    )
    
    const batch = writeBatch(db)
    photosSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Delete the tree
    batch.delete(doc(db, 'farms', farmId, 'trees', treeId))

    await batch.commit()
    await this.logAdminActivity('tree:deleted', 'tree', treeId, { farmId })
  }

  // ====================
  // PHOTO MANAGEMENT
  // ====================

  async getAllPhotos(): Promise<Photo[]> {
    const farms = await this.getAllFarms()
    const allPhotos: Photo[] = []

    for (const farm of farms) {
      const photosSnapshot = await getDocs(collection(db, 'farms', farm.id, 'photos'))
      const farmPhotos = photosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        farmId: farm.id,
        farmName: farm.name,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        uploadDate: doc.data().uploadDate?.toDate(),
        localStorageDate: doc.data().localStorageDate?.toDate()
      })) as Photo[]

      allPhotos.push(...farmPhotos)
    }

    return allPhotos
  }

  async deletePhoto(farmId: string, photoId: string): Promise<void> {
    await deleteDoc(doc(db, 'farms', farmId, 'photos', photoId))
    await this.logAdminActivity('photo:deleted', 'photo', photoId, { farmId })
  }

  // ====================
  // ZONE MANAGEMENT
  // ====================

  async getAllZones(): Promise<FarmZone[]> {
    const farms = await this.getAllFarms()
    const allZones: FarmZone[] = []

    for (const farm of farms) {
      const zonesSnapshot = await getDocs(collection(db, 'farms', farm.id, 'zones'))
      const farmZones = zonesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        farmId: farm.id
      })) as FarmZone[]

      allZones.push(...farmZones)
    }

    return allZones
  }

  async deleteZone(farmId: string, zoneId: string): Promise<void> {
    await deleteDoc(doc(db, 'farms', farmId, 'zones', zoneId))
    await this.logAdminActivity('zone:deleted', 'zone', zoneId, { farmId })
  }

  // ====================
  // DATA MIGRATION
  // ====================

  async migrateLegacyData(): Promise<{ success: boolean; migrated: number; errors: string[] }> {
    const errors: string[] = []
    let migratedCount = 0

    try {
      // Check for legacy trees collection
      const legacyTreesSnapshot = await getDocs(collection(db, 'trees'))
      
      for (const treeDoc of legacyTreesSnapshot.docs) {
        try {
          const treeData = treeDoc.data()
          
          // Find or create default farm for user
          let userFarmId = await this.findUserDefaultFarm(treeData.userId)
          
          if (!userFarmId) {
            // Create default farm for user
            const user = await this.getUserById(treeData.userId)
            if (user) {
              const farm = await this.createFarm({
                name: `${user.displayName || 'User'}'s Farm`,
                ownerId: treeData.userId,
                farmType: 'personal'
              })
              userFarmId = farm.id
            }
          }

          if (userFarmId) {
            // Migrate tree to farm subcollection
            const { userId, ...treeDataWithoutUserId } = treeData
            await setDoc(doc(db, 'farms', userFarmId, 'trees', treeDoc.id), {
              ...treeDataWithoutUserId,
              farmId: userFarmId,
              migratedFrom: 'legacy_trees',
              migratedAt: serverTimestamp()
            })

            migratedCount++
          }
        } catch (error) {
          errors.push(`Failed to migrate tree ${treeDoc.id}: ${error}`)
        }
      }

      // Check for legacy photos collection
      const legacyPhotosSnapshot = await getDocs(collection(db, 'photos'))
      
      for (const photoDoc of legacyPhotosSnapshot.docs) {
        try {
          const photoData = photoDoc.data()
          
          const userFarmId = await this.findUserDefaultFarm(photoData.userId)
          
          if (userFarmId) {
            const { userId, ...photoDataWithoutUserId } = photoData
            await setDoc(doc(db, 'farms', userFarmId, 'photos', photoDoc.id), {
              ...photoDataWithoutUserId,
              farmId: userFarmId,
              migratedFrom: 'legacy_photos',
              migratedAt: serverTimestamp()
            })

            migratedCount++
          }
        } catch (error) {
          errors.push(`Failed to migrate photo ${photoDoc.id}: ${error}`)
        }
      }

      await this.logAdminActivity('system:migration_completed', 'system', 'migration', { 
        migratedCount, 
        errorCount: errors.length 
      })

      return { success: errors.length === 0, migrated: migratedCount, errors }
    } catch (error) {
      errors.push(`Migration failed: ${error}`)
      return { success: false, migrated: migratedCount, errors }
    }
  }

  // ====================
  // ANALYTICS
  // ====================

  async getSystemStats(): Promise<{
    totalUsers: number
    totalOrganizations: number
    totalFarms: number
    totalTrees: number
    totalPhotos: number
    activeUsers30Days: number
  }> {
    const [users, organizations, farms, allTrees, allPhotos] = await Promise.all([
      this.getAllUsers(),
      this.getAllOrganizations(),
      this.getAllFarms(),
      this.getAllTrees(),
      this.getAllPhotos()
    ])

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activeUsers30Days = users.filter(user => 
      user.lastLoginAt && user.lastLoginAt > thirtyDaysAgo
    ).length

    return {
      totalUsers: users.length,
      totalOrganizations: organizations.length,
      totalFarms: farms.length,
      totalTrees: allTrees.length,
      totalPhotos: allPhotos.length,
      activeUsers30Days
    }
  }

  // ====================
  // PRIVATE METHODS
  // ====================

  private async findUserDefaultFarm(userId: string): Promise<string | null> {
    const accessQuery = query(
      collection(db, 'userFarmAccess'),
      where('userId', '==', userId),
      where('role', '==', 'owner'),
      limit(1)
    )
    
    const accessSnapshot = await getDocs(accessQuery)
    return accessSnapshot.docs[0]?.data().farmId || null
  }

  private async transferUserData(fromUserId: string, toUserId: string): Promise<void> {
    // Transfer farm access
    const accessQuery = query(collection(db, 'userFarmAccess'), where('userId', '==', fromUserId))
    const accessSnapshot = await getDocs(accessQuery)
    
    const batch = writeBatch(db)
    accessSnapshot.docs.forEach(accessDoc => {
      const newAccessId = `${toUserId}_${accessDoc.data().farmId}`
      batch.set(doc(db, 'userFarmAccess', newAccessId), {
        ...accessDoc.data(),
        userId: toUserId,
        transferredFrom: fromUserId,
        transferredAt: serverTimestamp()
      })
      batch.delete(accessDoc.ref)
    })

    await batch.commit()
  }

  private getSubscriptionLimits(subscriptionType: 'free' | 'pro' | 'enterprise') {
    const limits = {
      free: { maxFarms: 2, maxUsersPerFarm: 3, maxUsersTotal: 5 },
      pro: { maxFarms: 10, maxUsersPerFarm: 20, maxUsersTotal: 50 },
      enterprise: { maxFarms: -1, maxUsersPerFarm: -1, maxUsersTotal: -1 }
    }
    return limits[subscriptionType]
  }

  private getSubscriptionFeatures(subscriptionType: 'free' | 'pro' | 'enterprise') {
    const features = {
      free: [],
      pro: ['advanced_analytics', 'bulk_operations', 'data_export'],
      enterprise: ['advanced_analytics', 'api_access', 'custom_roles', 'bulk_operations', 'data_export', 'integrations', 'white_labeling', 'priority_support']
    }
    return features[subscriptionType]
  }

  private async logAdminActivity(
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const currentUser = enhancedAuthService.getCurrentUser()
    if (!currentUser) return

    const activityLog: ActivityLog = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.uid,
      action: `admin:${action}`,
      resource,
      resourceId,
      details: {
        ...details,
        adminAction: true,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      status: 'success'
    }

    await setDoc(doc(db, 'activityLogs', activityLog.id), {
      ...activityLog,
      timestamp: serverTimestamp()
    })
  }
}

// Export singleton instance (only created if user is super admin)
export const createSuperAdminService = (): SuperAdminService => {
  return new SuperAdminService()
}