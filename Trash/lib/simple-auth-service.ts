// Simplified authentication service for farm management
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth'
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection, 
  addDoc,
  query, 
  where, 
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { SimpleFarm, SimpleUser, FarmAccess, FarmRole } from './optimized-auth-context'

export class SimpleAuthService {
  // User Authentication
  async signIn(email: string, password: string): Promise<FirebaseUser> {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  }

  async signUp(email: string, password: string, displayName: string): Promise<FirebaseUser> {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName })
    await sendEmailVerification(credential.user)
    return credential.user
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth)
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email)
  }

  async sendEmailVerification(): Promise<void> {
    const user = auth.currentUser
    if (user && !user.emailVerified) {
      await sendEmailVerification(user)
    }
  }

  // User Profile Management
  async createUserProfile(firebaseUser: FirebaseUser): Promise<SimpleUser> {
    const user: SimpleUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
      createdAt: new Date(),
      preferredLanguage: 'vi',
      timezone: 'Asia/Ho_Chi_Minh'
    }

    const userRef = doc(db, 'users', firebaseUser.uid)
    await setDoc(userRef, {
      ...user,
      createdAt: serverTimestamp()
    })

    return user
  }

  async updateUserProfile(userId: string, updates: Partial<SimpleUser>): Promise<void> {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  }

  async getUserProfile(userId: string): Promise<SimpleUser | null> {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) return null
    
    const data = userDoc.data()
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastLoginAt: data.lastLoginAt?.toDate()
    } as SimpleUser
  }

  // Farm Management
  async createFarm(farmData: {
    name: string
    ownerName?: string
    totalArea?: number
    centerLatitude?: number
    centerLongitude?: number
  }, ownerId: string): Promise<SimpleFarm> {
    const batch = writeBatch(db)
    
    // Create farm document
    const farmRef = doc(collection(db, 'farms'))
    const farm: SimpleFarm = {
      id: farmRef.id,
      ...farmData,
      createdDate: new Date(),
      isActive: true
    }
    
    batch.set(farmRef, {
      ...farm,
      createdDate: serverTimestamp()
    })

    // Grant owner access
    const accessRef = doc(collection(db, 'farmAccess'))
    const farmAccess: FarmAccess = {
      farmId: farmRef.id,
      userId: ownerId,
      role: 'owner',
      grantedAt: new Date(),
      grantedBy: ownerId,
      isActive: true
    }
    
    batch.set(accessRef, {
      ...farmAccess,
      grantedAt: serverTimestamp()
    })

    await batch.commit()
    return farm
  }

  async updateFarm(farmId: string, updates: Partial<SimpleFarm>): Promise<void> {
    const farmRef = doc(db, 'farms', farmId)
    await updateDoc(farmRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  }

  async getFarm(farmId: string): Promise<SimpleFarm | null> {
    const farmRef = doc(db, 'farms', farmId)
    const farmDoc = await getDoc(farmRef)
    
    if (!farmDoc.exists()) return null
    
    const data = farmDoc.data()
    return {
      id: farmDoc.id,
      ...data,
      createdDate: data.createdDate?.toDate() || new Date()
    } as SimpleFarm
  }

  // Farm Access Management
  async grantFarmAccess(
    farmId: string, 
    userId: string, 
    role: FarmRole, 
    grantedBy: string
  ): Promise<FarmAccess> {
    const accessRef = doc(collection(db, 'farmAccess'))
    const farmAccess: FarmAccess = {
      farmId,
      userId,
      role,
      grantedAt: new Date(),
      grantedBy,
      isActive: true
    }
    
    await setDoc(accessRef, {
      ...farmAccess,
      grantedAt: serverTimestamp()
    })

    return farmAccess
  }

  async revokeFarmAccess(farmId: string, userId: string): Promise<void> {
    const accessRef = collection(db, 'farmAccess')
    const accessQuery = query(
      accessRef,
      where('farmId', '==', farmId),
      where('userId', '==', userId),
      where('isActive', '==', true)
    )
    
    const accessSnapshot = await getDocs(accessQuery)
    const batch = writeBatch(db)
    
    accessSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        isActive: false,
        revokedAt: serverTimestamp()
      })
    })
    
    await batch.commit()
  }

  async updateFarmAccess(farmId: string, userId: string, newRole: FarmRole): Promise<void> {
    const accessRef = collection(db, 'farmAccess')
    const accessQuery = query(
      accessRef,
      where('farmId', '==', farmId),
      where('userId', '==', userId),
      where('isActive', '==', true)
    )
    
    const accessSnapshot = await getDocs(accessQuery)
    const batch = writeBatch(db)
    
    accessSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        role: newRole,
        updatedAt: serverTimestamp()
      })
    })
    
    await batch.commit()
  }

  async getUserFarmAccess(userId: string): Promise<FarmAccess[]> {
    const accessRef = collection(db, 'farmAccess')
    const accessQuery = query(
      accessRef,
      where('userId', '==', userId),
      where('isActive', '==', true)
    )
    
    const accessSnapshot = await getDocs(accessQuery)
    return accessSnapshot.docs.map(doc => ({
      ...doc.data(),
      grantedAt: doc.data().grantedAt?.toDate() || new Date()
    })) as FarmAccess[]
  }

  async getFarmUsers(farmId: string): Promise<(FarmAccess & { user: SimpleUser })[]> {
    const accessRef = collection(db, 'farmAccess')
    const accessQuery = query(
      accessRef,
      where('farmId', '==', farmId),
      where('isActive', '==', true)
    )
    
    const accessSnapshot = await getDocs(accessQuery)
    const accessList = accessSnapshot.docs.map(doc => ({
      ...doc.data(),
      grantedAt: doc.data().grantedAt?.toDate() || new Date()
    })) as FarmAccess[]

    // Load user profiles
    const usersWithAccess = await Promise.all(
      accessList.map(async (access) => {
        const user = await this.getUserProfile(access.userId)
        return user ? { ...access, user } : null
      })
    )

    return usersWithAccess.filter(Boolean) as (FarmAccess & { user: SimpleUser })[]
  }

  // Farm Statistics and Analytics
  async getFarmStats(farmId: string): Promise<{
    totalTrees: number
    totalPhotos: number
    lastActivity: Date | null
    activeUsers: number
  }> {
    try {
      // Get trees count
      const treesRef = collection(db, 'farms', farmId, 'trees')
      const treesSnapshot = await getDocs(treesRef)
      
      // Get photos count
      const photosRef = collection(db, 'farms', farmId, 'photos')
      const photosSnapshot = await getDocs(photosRef)
      
      // Get active users count
      const accessRef = collection(db, 'farmAccess')
      const accessQuery = query(
        accessRef,
        where('farmId', '==', farmId),
        where('isActive', '==', true)
      )
      const accessSnapshot = await getDocs(accessQuery)
      
      // Get last activity (most recent tree or photo)
      let lastActivity: Date | null = null
      if (treesSnapshot.docs.length > 0) {
        const lastTree = treesSnapshot.docs
          .map(doc => doc.data().createdAt?.toDate())
          .filter(Boolean)
          .sort((a, b) => b.getTime() - a.getTime())[0]
        lastActivity = lastTree || null
      }
      
      return {
        totalTrees: treesSnapshot.docs.length,
        totalPhotos: photosSnapshot.docs.length,
        lastActivity,
        activeUsers: accessSnapshot.docs.length
      }
    } catch (error) {
      return {
        totalTrees: 0,
        totalPhotos: 0,
        lastActivity: null,
        activeUsers: 0
      }
    }
  }

  // User invitation system
  async inviteUser(
    farmId: string, 
    email: string, 
    role: FarmRole,
    invitedBy: string,
    message?: string
  ): Promise<void> {
    const invitationRef = doc(collection(db, 'farmInvitations'))
    const invitation = {
      farmId,
      email: email.toLowerCase(),
      role,
      invitedBy,
      message,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
    
    await setDoc(invitationRef, invitation)

    // TODO: Send email invitation (integrate with email service)
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    const invitationRef = doc(db, 'farmInvitations', invitationId)
    const invitationDoc = await getDoc(invitationRef)
    
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found')
    }
    
    const invitation = invitationDoc.data()
    
    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid')
    }
    
    if (invitation.expiresAt.toDate() < new Date()) {
      throw new Error('Invitation has expired')
    }
    
    const batch = writeBatch(db)
    
    // Grant farm access
    const accessRef = doc(collection(db, 'farmAccess'))
    batch.set(accessRef, {
      farmId: invitation.farmId,
      userId,
      role: invitation.role,
      grantedAt: serverTimestamp(),
      grantedBy: invitation.invitedBy,
      isActive: true
    })
    
    // Mark invitation as accepted
    batch.update(invitationRef, {
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: serverTimestamp()
    })
    
    await batch.commit()
  }
}

// Export singleton instance
export const simpleAuthService = new SimpleAuthService()