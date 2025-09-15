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
  isFarmAdmin: () => boolean
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
          
          // If user has no farm access, create a default farm for them
          if (userFarms.length === 0 && access.length === 0) {
            console.log('🏗️ Creating default farm for new user:', firebaseUser.email)
            try {
              const defaultFarm = await createDefaultFarmForUser(firebaseUser, userProfile)
              if (defaultFarm) {
                // Reload farm access after creating default farm
                const newAccess = await loadUserFarmAccess(firebaseUser.uid)
                setFarmAccess(newAccess)
                const newFarms = await loadUserFarms(newAccess)
                setFarms(newFarms)
                
                // Auto-select the new default farm
                if (newFarms.length > 0) {
                  setCurrentFarmState(newFarms[0])
                }
              }
            } catch (error) {
              console.error('❌ Failed to create default farm:', error)
              // Continue without farm - user can create one later
              setFarms([])
            }
          } else {
            setFarms(userFarms)
            
            // Auto-select farm if user has only one
            if (userFarms.length === 1 && !currentFarm) {
              setCurrentFarmState(userFarms[0])
            }
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.warn('🔥 Auth system using demo mode due to Firestore unavailability:', errorMessage)
        
        // Provide demo data for offline/demo mode
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Demo User',
            emailVerified: firebaseUser.emailVerified,
            createdAt: new Date(),
            preferredLanguage: 'vi',
            timezone: 'Asia/Ho_Chi_Minh'
          })
          
          const demoFarmAccess = [{
            farmId: 'demo-farm-001',
            userId: firebaseUser.uid,
            role: 'owner' as const,
            grantedAt: new Date(),
            grantedBy: firebaseUser.uid,
            isActive: true
          }]
          
          const demoFarm = {
            id: 'demo-farm-001',
            name: 'Nông trại Demo',
            ownerName: firebaseUser.displayName || 'Demo Farmer',
            totalArea: 2.5,
            centerLatitude: 10.762622,
            centerLongitude: 106.660172,
            isActive: true,
            createdDate: new Date()
          }
          
          setFarmAccess(demoFarmAccess)
          setFarms([demoFarm])
          setCurrentFarmState(demoFarm)
          
          console.log('✅ Demo mode activated with demo farm for user:', firebaseUser.email)
        }
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [currentFarm])

  // Helper function to create default farm for new users
  const createDefaultFarmForUser = async (firebaseUser: FirebaseUser, userProfile: SimpleUser): Promise<SimpleFarm | null> => {
    try {
      const defaultFarmData = {
        name: `Nông trại của ${userProfile.displayName || 'Người dùng'}`,
        ownerName: userProfile.displayName || firebaseUser.email || 'Chủ trại',
        totalArea: 0,
        centerLatitude: 10.762622, // Default to Ho Chi Minh City area
        centerLongitude: 106.660172,
        isActive: true,
        createdDate: new Date()
      }
      
      // Create farm document
      const farmRef = doc(collection(db, 'farms'))
      await setDoc(farmRef, {
        ...defaultFarmData,
        id: farmRef.id,
        createdDate: serverTimestamp()
      })
      
      // Create farm access for the user as owner
      const accessRef = doc(collection(db, 'farmAccess'))
      const farmAccess: FarmAccess = {
        farmId: farmRef.id,
        userId: firebaseUser.uid,
        role: 'owner',
        grantedAt: new Date(),
        grantedBy: firebaseUser.uid,
        isActive: true
      }
      
      await setDoc(accessRef, {
        ...farmAccess,
        grantedAt: serverTimestamp()
      })
      
      console.log('✅ Created default farm:', farmRef.id, 'for user:', firebaseUser.email)
      
      return {
        id: farmRef.id,
        ...defaultFarmData
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn('🔥 Cannot create farm in Firestore, using demo farm:', errorMessage)
      // Return demo farm when Firestore is unavailable
      return {
        id: 'demo-farm-001',
        name: `Nông trại của ${userProfile.displayName || 'Demo User'}`,
        ownerName: userProfile.displayName || firebaseUser.email || 'Demo Farmer',
        totalArea: 2.5,
        centerLatitude: 10.762622,
        centerLongitude: 106.660172,
        isActive: true,
        createdDate: new Date()
      }
    }
  }

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
    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn('🔥 Firestore unavailable, using demo user profile:', errorMessage)
      // Return demo user profile when Firestore is unavailable
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || 'Demo User',
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date(),
        preferredLanguage: 'vi',
        timezone: 'Asia/Ho_Chi_Minh'
      }
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn('🔥 Firestore unavailable for farm access, using demo mode:', errorMessage)
      // Return demo farm access for demo user
      return [{
        farmId: 'demo-farm-001',
        userId: userId,
        role: 'owner',
        grantedAt: new Date(),
        grantedBy: userId,
        isActive: true
      }]
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn('🔥 Firestore unavailable for farms, using demo mode:', errorMessage)
      // Return demo farm for demo access
      return access.map(a => ({
        id: a.farmId,
        name: 'Nông trại Demo',
        ownerName: 'Demo Farmer',
        totalArea: 2.5,
        centerLatitude: 10.762622,
        centerLongitude: 106.660172,
        isActive: true,
        createdDate: new Date()
      }))
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
    // Super admin check - only specific emails or system admins
    const superAdminEmails = ['admin@farm.com', 'superadmin@farm.com', 'daibui.sg@gmail.com']
    return Boolean(user?.email && superAdminEmails.includes(user.email))
  }

  const isFarmAdmin = (): boolean => {
    // Check if user has owner role on any farm (farm-level admin)
    return farmAccess.some(a => a.role === 'owner' && a.isActive)
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
    isFarmAdmin,
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