'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  onAuthStateChanged, 
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
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'
import { auth, db } from './firebase'

// Simplified types for farm management
export interface SimpleFarm {
  id: string
  name: string
  ownerName?: string
  totalArea?: number
  createdDate: Date
  centerLatitude?: number
  centerLongitude?: number
  isActive: boolean
}

export interface SimpleUser {
  uid: string
  email: string | null
  displayName: string | null
  phoneNumber?: string
  photoURL?: string
  emailVerified: boolean
  createdAt: Date
  lastLoginAt?: Date
  preferredLanguage: 'vi' | 'en'
  timezone: string
}

export type FarmRole = 'owner' | 'manager' | 'viewer'

export interface FarmAccess {
  farmId: string
  userId: string
  role: FarmRole
  grantedAt: Date
  grantedBy: string
  isActive: boolean
}

// Simple permissions based on role
const ROLE_PERMISSIONS = {
  owner: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
  manager: ['read', 'write', 'manage_trees', 'manage_photos'],
  viewer: ['read']
} as const

export type Permission = typeof ROLE_PERMISSIONS[FarmRole][number]

interface SimpleAuthContextType {
  // Authentication state
  user: SimpleUser | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  
  // Farm management
  farms: SimpleFarm[]
  currentFarm: SimpleFarm | null
  farmAccess: FarmAccess[]
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  
  // User management
  updateUserProfile: (updates: Partial<SimpleUser>) => Promise<void>
  sendEmailVerification: () => Promise<void>
  
  // Farm access
  setCurrentFarm: (farm: SimpleFarm | null) => void
  getUserRole: (farmId: string) => FarmRole | null
  hasPermission: (permission: Permission, farmId?: string) => boolean
  canAccessFarm: (farmId: string) => boolean
  
  // Admin functions
  isAdmin: () => boolean
  isFarmOwner: (farmId?: string) => boolean
  isFarmManager: (farmId?: string) => boolean
  
  // Utility
  refreshUserData: () => Promise<void>
}

const SimpleAuthContext = createContext<SimpleAuthContextType | null>(null)

interface SimpleAuthProviderProps {
  children: ReactNode
}

export function SimpleAuthProvider({ children }: SimpleAuthProviderProps) {
  const [user, setUser] = useState<SimpleUser | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [farms, setFarms] = useState<SimpleFarm[]>([])
  const [currentFarm, setCurrentFarmState] = useState<SimpleFarm | null>(null)
  const [farmAccess, setFarmAccess] = useState<FarmAccess[]>([])

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setFirebaseUser(firebaseUser)
        
        if (firebaseUser) {
          console.log('🔐 User signed in:', firebaseUser.email)
          
          // Load or create user profile
          const userProfile = await loadOrCreateUserProfile(firebaseUser)
          setUser(userProfile)
          
          // Load user's farm access
          const access = await loadUserFarmAccess(firebaseUser.uid)
          setFarmAccess(access)
          
          // Load farms user has access to
          const userFarms = await loadUserFarms(access)
          setFarms(userFarms)
          
          // Auto-select farm if user has only one
          if (userFarms.length === 1 && !currentFarm) {
            setCurrentFarmState(userFarms[0])
          }
          
          // Update last login
          await updateLastLogin(firebaseUser.uid)
          
        } else {
          console.log('🔐 User signed out')
          setUser(null)
          setFarms([])
          setCurrentFarmState(null)
          setFarmAccess([])
        }
      } catch (error) {
        console.error('❌ Auth state change error:', error)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [currentFarm])

  // Persist current farm selection
  useEffect(() => {
    if (currentFarm && user) {
      localStorage.setItem(`currentFarm_${user.uid}`, currentFarm.id)
    }
  }, [currentFarm, user])

  // Restore current farm from localStorage
  useEffect(() => {
    if (user && farms.length > 0 && !currentFarm) {
      const storedFarmId = localStorage.getItem(`currentFarm_${user.uid}`)
      if (storedFarmId) {
        const farm = farms.find(f => f.id === storedFarmId)
        if (farm) {
          setCurrentFarmState(farm)
        }
      }
    }
  }, [user, farms, currentFarm])

  // Helper functions
  const loadOrCreateUserProfile = async (firebaseUser: FirebaseUser): Promise<SimpleUser> => {
    const userRef = doc(db, 'users', firebaseUser.uid)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        phoneNumber: firebaseUser.phoneNumber || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        emailVerified: firebaseUser.emailVerified,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate(),
        preferredLanguage: data.preferredLanguage || 'vi',
        timezone: data.timezone || 'Asia/Ho_Chi_Minh'
      }
    } else {
      // Create new user profile
      const newUser: SimpleUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        phoneNumber: firebaseUser.phoneNumber || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date(),
        preferredLanguage: 'vi',
        timezone: 'Asia/Ho_Chi_Minh'
      }
      
      await setDoc(userRef, {
        ...newUser,
        createdAt: serverTimestamp()
      })
      
      return newUser
    }
  }

  const loadUserFarmAccess = async (userId: string): Promise<FarmAccess[]> => {
    try {
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
    } catch (error) {
      console.error('❌ Error loading farm access:', error)
      return []
    }
  }

  const loadUserFarms = async (access: FarmAccess[]): Promise<SimpleFarm[]> => {
    try {
      const farmIds = access.map(a => a.farmId)
      if (farmIds.length === 0) return []
      
      const farmsPromises = farmIds.map(async (farmId) => {
        const farmRef = doc(db, 'farms', farmId)
        const farmDoc = await getDoc(farmRef)
        
        if (farmDoc.exists()) {
          const data = farmDoc.data()
          return {
            id: farmDoc.id,
            ...data,
            createdDate: data.createdDate?.toDate() || new Date()
          } as SimpleFarm
        }
        return null
      })
      
      const farms = await Promise.all(farmsPromises)
      return farms.filter(Boolean) as SimpleFarm[]
    } catch (error) {
      console.error('❌ Error loading farms:', error)
      return []
    }
  }

  const updateLastLogin = async (userId: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId)
      await setDoc(userRef, {
        lastLoginAt: serverTimestamp()
      }, { merge: true })
    } catch (error) {
      console.error('❌ Error updating last login:', error)
    }
  }

  // Auth actions
  const signIn = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName })
    await sendEmailVerification(credential.user)
  }

  const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth)
  }

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email)
  }

  const updateUserProfile = async (updates: Partial<SimpleUser>): Promise<void> => {
    if (!user) throw new Error('No user logged in')
    
    const userRef = doc(db, 'users', user.uid)
    await setDoc(userRef, updates, { merge: true })
    
    setUser(prev => prev ? { ...prev, ...updates } : null)
  }

  const sendEmailVerificationAction = async (): Promise<void> => {
    if (!firebaseUser) throw new Error('No user logged in')
    await sendEmailVerification(firebaseUser)
  }

  // Permission checking
  const getUserRole = (farmId: string): FarmRole | null => {
    const access = farmAccess.find(a => a.farmId === farmId && a.isActive)
    return access?.role || null
  }

  const hasPermission = (permission: Permission, farmId?: string): boolean => {
    const targetFarmId = farmId || currentFarm?.id
    if (!targetFarmId) return false
    
    const role = getUserRole(targetFarmId)
    if (!role) return false
    
    return ROLE_PERMISSIONS[role].includes(permission as any)
  }

  const canAccessFarm = (farmId: string): boolean => {
    return farmAccess.some(a => a.farmId === farmId && a.isActive)
  }

  const isAdmin = (): boolean => {
    // Check if user has owner role on any farm or is system admin
    return farmAccess.some(a => a.role === 'owner' && a.isActive) ||
           Boolean(user?.email && ['admin@farm.com'].includes(user.email))
  }

  const isFarmOwner = (farmId?: string): boolean => {
    const targetFarmId = farmId || currentFarm?.id
    if (!targetFarmId) return false
    return getUserRole(targetFarmId) === 'owner'
  }

  const isFarmManager = (farmId?: string): boolean => {
    const targetFarmId = farmId || currentFarm?.id
    if (!targetFarmId) return false
    const role = getUserRole(targetFarmId)
    return role === 'owner' || role === 'manager'
  }

  const setCurrentFarm = (farm: SimpleFarm | null): void => {
    setCurrentFarmState(farm)
  }

  const refreshUserData = async (): Promise<void> => {
    if (firebaseUser) {
      const access = await loadUserFarmAccess(firebaseUser.uid)
      setFarmAccess(access)
      
      const userFarms = await loadUserFarms(access)
      setFarms(userFarms)
    }
  }

  const contextValue: SimpleAuthContextType = {
    // Authentication state
    user,
    firebaseUser,
    loading,
    
    // Farm management
    farms,
    currentFarm,
    farmAccess,
    
    // Auth actions
    signIn,
    signUp,
    signOut,
    resetPassword,
    
    // User management
    updateUserProfile,
    sendEmailVerification: sendEmailVerificationAction,
    
    // Farm access
    setCurrentFarm,
    getUserRole,
    hasPermission,
    canAccessFarm,
    
    // Admin functions
    isAdmin,
    isFarmOwner,
    isFarmManager,
    
    // Utility
    refreshUserData
  }

  return (
    <SimpleAuthContext.Provider value={contextValue}>
      {children}
    </SimpleAuthContext.Provider>
  )
}

export const useSimpleAuth = (): SimpleAuthContextType => {
  const context = useContext(SimpleAuthContext)
  if (!context) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
}

// Backward compatibility wrapper
export const useAuth = () => {
  const auth = useSimpleAuth()
  return {
    user: auth.user,
    currentFarm: auth.currentFarm,
    loading: auth.loading,
    signIn: auth.signIn,
    signOut: auth.signOut,
    hasPermission: auth.hasPermission,
    isAdmin: auth.isAdmin,
    setCurrentFarm: auth.setCurrentFarm
  }
}