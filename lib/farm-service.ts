import { 
  collection, 
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { Farm, UserFarmAccess, User } from './types'

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

// Farm management service
export class FarmService {
  
  // Create a new farm
  static async createFarm(farm: Omit<Farm, 'id' | 'createdDate'>, ownerId: string): Promise<string> {
    if (!auth.currentUser || auth.currentUser.uid !== ownerId) {
      throw new Error('Authenticated owner is required to create a farm')
    }

    const farmRef = doc(collection(db, 'farms'))
    const accessId = `${ownerId}_${farmRef.id}`
    const accessRef = doc(db, 'userFarmAccess', accessId)
    const now = new Date()
    const farmData: Farm = {
      ...farm,
      id: farmRef.id,
      ownerId,
      createdBy: ownerId,
      createdDate: now
    }

    const accessData: UserFarmAccess = {
      id: accessId,
      userId: ownerId,
      farmId: farmRef.id,
      role: 'owner',
      permissions: DEFAULT_PERMISSIONS.owner,
      isActive: true,
      grantedBy: ownerId,
      grantedAt: now,
      createdAt: now,
      updatedAt: now
    }

    const batch = writeBatch(db)
    batch.set(farmRef, {
      ...farmData,
      createdDate: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    })
    batch.set(accessRef, {
      ...accessData,
      grantedAt: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    })
    await batch.commit()

    return farmRef.id
  }
  
  // Get all farms user has access to
  static async getUserFarms(userId: string): Promise<Farm[]> {
    const accessQuery = query(
      collection(db, 'userFarmAccess'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    )
    
    const accessSnapshot = await getDocs(accessQuery)
    const farmIds = accessSnapshot.docs.map(doc => doc.data().farmId as string)
    
    if (farmIds.length === 0) return []
    
    const farms: Farm[] = []
    for (const farmId of farmIds) {
      const farmDoc = await getDoc(doc(db, 'farms', farmId))
      if (farmDoc.exists()) {
        const data = farmDoc.data()
        farms.push({
          ...data,
          id: farmDoc.id,
          createdDate: convertToDate(data.createdDate) || new Date()
        } as Farm)
      }
    }
    
    return farms.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime())
  }
  
  // Get farm by ID (if user has access)
  static async getFarm(farmId: string, userId: string): Promise<Farm | null> {
    const hasAccess = await this.checkFarmAccess(userId, farmId)
    if (!hasAccess) return null
    
    const farmDoc = await getDoc(doc(db, 'farms', farmId))
    if (!farmDoc.exists()) return null
    
    const data = farmDoc.data()
    return {
      ...data,
      id: farmDoc.id,
      createdDate: convertToDate(data.createdDate) || new Date()
    } as Farm
  }
  
  // Update farm
  static async updateFarm(farmId: string, userId: string, updates: Partial<Farm>): Promise<void> {
    const hasAccess = await this.checkFarmAccess(userId, farmId, ['write'])
    if (!hasAccess) throw new Error('No permission to update farm')
    
    const farmRef = doc(db, 'farms', farmId)
    await updateDoc(farmRef, updates)
  }
  
  // Delete farm (owner only)
  static async deleteFarm(farmId: string, userId: string): Promise<void> {
    const access = await this.getUserFarmAccess(userId, farmId)
    if (!access || access.role !== 'owner') {
      throw new Error('Only farm owner can delete the farm')
    }
    
    // Delete all user access records
    const accessQuery = query(
      collection(db, 'userFarmAccess'),
      where('farmId', '==', farmId)
    )
    const accessSnapshot = await getDocs(accessQuery)
    for (const doc of accessSnapshot.docs) {
      await deleteDoc(doc.ref)
    }
    
    // Delete the farm
    await deleteDoc(doc(db, 'farms', farmId))
  }
  
  // Grant farm access to user
  static async grantFarmAccess(
    userId: string, 
    farmId: string, 
    role: 'owner' | 'manager' | 'viewer',
    permissions: string[],
    grantedBy = auth.currentUser?.uid
  ): Promise<void> {
    if (!grantedBy) throw new Error('Authenticated grantor is required')

    const accessId = `${userId}_${farmId}`
    const accessRef = doc(db, 'userFarmAccess', accessId)
    const now = new Date()
    const accessData: UserFarmAccess = {
      id: accessId,
      userId,
      farmId,
      role,
      permissions,
      isActive: true,
      grantedBy,
      grantedAt: now,
      createdAt: now,
      updatedAt: now
    }
    
    await setDoc(accessRef, {
      ...accessData,
      grantedAt: Timestamp.fromDate(accessData.grantedAt),
      createdAt: Timestamp.fromDate(accessData.createdAt),
      updatedAt: Timestamp.fromDate(accessData.updatedAt)
    }, { merge: true })
  }
  
  // Revoke farm access
  static async revokeFarmAccess(userId: string, farmId: string, requesterId: string): Promise<void> {
    const requesterAccess = await this.getUserFarmAccess(requesterId, farmId)
    if (!requesterAccess || requesterAccess.role !== 'owner') {
      throw new Error('No permission to revoke access')
    }
    
    const targetRef = doc(db, 'userFarmAccess', `${userId}_${farmId}`)
    const target = await getDoc(targetRef)
    if (!target.exists()) return
    if (target.data().role === 'owner') throw new Error('Owner access cannot be revoked from the client')
    await updateDoc(targetRef, {
      isActive: false,
      revokedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
  }
  
  // Check if user has access to farm
  static async checkFarmAccess(userId: string, farmId: string, requiredPermissions?: string[]): Promise<boolean> {
    const access = await this.getUserFarmAccess(userId, farmId)
    if (!access) return false
    
    if (!requiredPermissions) return true
    
    return requiredPermissions.every(permission => access.permissions.includes(permission))
  }
  
  // Get user's access level for a farm
  static async getUserFarmAccess(userId: string, farmId: string): Promise<UserFarmAccess | null> {
    const accessDoc = await getDoc(doc(db, 'userFarmAccess', `${userId}_${farmId}`))
    if (!accessDoc.exists() || accessDoc.data().isActive !== true) return null

    const data = accessDoc.data()
    return {
      ...data,
      id: accessDoc.id,
      grantedAt: data.grantedAt?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as UserFarmAccess
  }
  
  // Get all users with access to a farm
  static async getFarmUsers(farmId: string, requesterId: string): Promise<Array<UserFarmAccess & { user?: User }>> {
    const requesterAccess = await this.getUserFarmAccess(requesterId, farmId)
    if (!requesterAccess || !requesterAccess.permissions.includes('manage_users')) {
      throw new Error('No permission to view farm users')
    }
    
    const accessQuery = query(
      collection(db, 'userFarmAccess'),
      where('farmId', '==', farmId),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(accessQuery)
    const farmUsers: Array<UserFarmAccess & { user?: User }> = []
    
    for (const accessDoc of snapshot.docs) {
      const accessData = accessDoc.data()
      const access: UserFarmAccess = {
        ...accessData,
        id: accessDoc.id,
        createdAt: accessData.createdAt?.toDate() || new Date(),
        updatedAt: accessData.updatedAt?.toDate() || new Date()
      } as UserFarmAccess
      
      // Optionally fetch user details
      try {
        const userDoc = await getDoc(doc(db, 'users', access.userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData) {
            (access as UserFarmAccess & { user: User }).user = {
              ...userData,
              uid: userDoc.id,
              createdAt: userData.createdAt?.toDate?.() || new Date()
            } as User
          }
        }
      } catch (error) {
        console.warn('Could not fetch user details:', error)
      }
      
      farmUsers.push(access)
    }
    
    return farmUsers
  }

  // Get user IDs with access to a farm (for investment viewing)
  static async getFarmMemberIds(farmId: string, requesterId: string): Promise<string[]> {
    const requesterAccess = await this.getUserFarmAccess(requesterId, farmId)
    if (!requesterAccess) {
      throw new Error('No permission to view farm')
    }

    const accessQuery = query(
      collection(db, 'userFarmAccess'),
      where('farmId', '==', farmId)
    )

    const snapshot = await getDocs(accessQuery)
    return snapshot.docs.map(doc => doc.data().userId as string)
  }

  // Get farm members with display names (for investment viewing)
  static async getFarmMembersWithDisplayNames(farmId: string, requesterId: string): Promise<Array<{userId: string, displayName?: string, email?: string}>> {
    const requesterAccess = await this.getUserFarmAccess(requesterId, farmId)
    if (!requesterAccess) {
      throw new Error('No permission to view farm')
    }

    const accessQuery = query(
      collection(db, 'userFarmAccess'),
      where('farmId', '==', farmId)
    )

    const snapshot = await getDocs(accessQuery)
    const members: Array<{userId: string, displayName?: string, email?: string}> = []

    for (const accessDoc of snapshot.docs) {
      const userId = accessDoc.data().userId as string

      // Try to fetch user display name
      try {
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          members.push({
            userId,
            displayName: userData.displayName || undefined,
            email: userData.email || undefined
          })
        } else {
          members.push({ userId })
        }
      } catch (error) {
        console.warn('Could not fetch user details for investment display:', error)
        members.push({ userId })
      }
    }

    return members
  }

  // Real-time listener for user's farms
  static subscribeToUserFarms(userId: string, callback: (farms: Farm[]) => void) {
    const accessQuery = query(
      collection(db, 'userFarmAccess'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    )
    
    return onSnapshot(accessQuery, async (snapshot) => {
      const farmIds = snapshot.docs.map(doc => doc.data().farmId as string)
      
      if (farmIds.length === 0) {
        callback([])
        return
      }
      
      const farms: Farm[] = []
      for (const farmId of farmIds) {
        try {
          const farmDoc = await getDoc(doc(db, 'farms', farmId))
          if (farmDoc.exists()) {
            const data = farmDoc.data()
            farms.push({
              ...data,
              id: farmDoc.id,
              createdDate: convertToDate(data.createdDate) || new Date()
            } as Farm)
          }
        } catch (error) {
          console.warn(`Could not fetch farm ${farmId}:`, error)
        }
      }
      
      farms.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime())
      callback(farms)
    })
  }
}

// Default role permissions
export const DEFAULT_PERMISSIONS = {
  owner: ['read', 'write', 'delete', 'manage_users', 'manage_zones', 'manage_investments'],
  manager: ['read', 'write', 'manage_zones', 'manage_investments'],
  viewer: ['read']
}
