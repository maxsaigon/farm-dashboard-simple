'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
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

// Safe date conversion helper
function convertToDate(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    try { return value.toDate() } catch { return null }
  }
  if (typeof value === 'number') return new Date(value * 1000)
  if (typeof value === 'string') { 
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  if (value && typeof value === 'object' && 'seconds' in value) {
    const sec = value.seconds || 0
    const ns = value.nanoseconds || 0
    return new Date(sec * 1000 + ns / 1_000_000)
  }
  return null
}

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
  organizationId?: string
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
  organizations: any[] // For compatibility with enhanced components

  // Roles and permissions
  roles: FarmRole[]
  permissions: Permission[]

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
  isOrganizationAdmin: () => boolean

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

  // Cache for auth data to prevent repeated Firestore queries
  const authCache = useRef({
    userProfile: null as SimpleUser | null,
    farmAccess: null as FarmAccess[] | null,
    farms: null as SimpleFarm[] | null,
    lastFetch: 0
  })

  // Cache expiry time (5 minutes)
  const CACHE_EXPIRY = 5 * 60 * 1000

  // Auth state persistence key
  const AUTH_STATE_KEY = 'farmDashboard_authState'

  // Save auth state to localStorage
  const saveAuthState = () => {
    if (user && farms.length > 0) {
      const state = {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          preferredLanguage: user.preferredLanguage,
          timezone: user.timezone
        },
        farms: farms.map(f => ({
          id: f.id,
          name: f.name,
          ownerName: f.ownerName,
          totalArea: f.totalArea,
          createdDate: f.createdDate,
          isActive: f.isActive
        })),
        currentFarmId: currentFarm?.id,
        farmAccess: farmAccess.map(a => ({
          farmId: a.farmId,
          userId: a.userId,
          role: a.role,
          grantedAt: a.grantedAt,
          isActive: a.isActive
        })),
        timestamp: Date.now()
      }
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state))
    }
  }

  // Restore auth state from localStorage
  const restoreAuthState = () => {
    try {
      const stored = localStorage.getItem(AUTH_STATE_KEY)
      if (stored) {
        const state = JSON.parse(stored)
        // Only restore if less than 1 hour old
        if (Date.now() - state.timestamp < 60 * 60 * 1000) {
          return {
            user: state.user,
            farms: state.farms,
            currentFarmId: state.currentFarmId,
            farmAccess: state.farmAccess
          }
        }
      }
    } catch (error) {
      // Failed to restore auth state
    }
    return null
  }

  // Initialize auth state listener
  useEffect(() => {
    console.log('[Auth] 🚀 Setting up auth listener')
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] 🎯 Auth state changed:', firebaseUser ? firebaseUser.email : 'No user')
      
      try {
        setFirebaseUser(firebaseUser)
        
        if (firebaseUser) {
          // Try to restore from localStorage for faster loading
          const restoredState = restoreAuthState()
          console.log('[Auth] 💾 Cache:', restoredState ? 'Found' : 'Not found')
          
          if (restoredState) {
            console.log('[Auth] ⚡ Using cache for instant UI')
            setUser(restoredState.user)
            setFarms(restoredState.farms)
            setFarmAccess(restoredState.farmAccess)
            if (restoredState.currentFarmId) {
              const currentFarm = restoredState.farms.find((f: any) => f.id === restoredState.currentFarmId)
              if (currentFarm) setCurrentFarmState(currentFarm)
            }
            setLoading(false) // End loading immediately with cache
            console.log('[Auth] ✅ Loading FALSE (cached)')
            
            // Load fresh data in background
            setTimeout(() => {
              console.log('[Auth] 🔄 Background refresh...')
              loadFreshAuthData(firebaseUser)
            }, 2000)
          } else {
            // Load fresh data
            console.log('[Auth] 📡 Loading fresh data...')
            await loadFreshAuthData(firebaseUser)
          }

        } else {
          console.log('[Auth] ❌ No user')
          setUser(null)
          setFarms([])
          setCurrentFarmState(null)
          setFarmAccess([])
          // Clear auth cache
          authCache.current = {
            userProfile: null,
            farmAccess: null,
            farms: null,
            lastFetch: 0
          }
        }
      } catch (error) {
        console.error('[Auth] ❌ Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

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
        }
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

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

      return {
        id: farmRef.id,
        ...defaultFarmData
      }
    } catch (error) {
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
            createdDate: convertToDate(data.createdDate) || new Date(),
          } as SimpleFarm
        }
        return null
      })
      
      const farms = await Promise.all(farmsPromises)
      return farms.filter(Boolean) as SimpleFarm[]
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
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
      // Error updating last login
    }
  }

  // Cached versions to prevent repeated Firestore queries
  const loadUserFarmAccessCached = async (userId: string): Promise<FarmAccess[]> => {
    const now = Date.now()
    if (authCache.current.farmAccess && (now - authCache.current.lastFetch) < CACHE_EXPIRY) {
      return authCache.current.farmAccess
    }

    const access = await loadUserFarmAccess(userId)
    authCache.current.farmAccess = access
    authCache.current.lastFetch = now
    return access
  }

  const loadUserFarmsCached = async (access: FarmAccess[]): Promise<SimpleFarm[]> => {
    const now = Date.now()
    if (authCache.current.farms && (now - authCache.current.lastFetch) < CACHE_EXPIRY) {
      return authCache.current.farms
    }

    const farms = await loadUserFarms(access)
    authCache.current.farms = farms
    authCache.current.lastFetch = now
    return farms
  }

  // Load fresh auth data (used for background refresh and initial load)
  const loadFreshAuthData = async (firebaseUser: FirebaseUser) => {
    try {
      console.log('[Auth] 📡 loadFreshAuthData started for:', firebaseUser.email)
      
      // Load or create user profile
      const userProfile = await loadOrCreateUserProfile(firebaseUser)
      console.log('[Auth] ✅ User profile loaded:', userProfile.email)
      setUser(userProfile)

      // Load user's farm access (with caching)
      const access = await loadUserFarmAccessCached(firebaseUser.uid)
      console.log('[Auth] 📋 Farm access loaded:', access.length, 'entries')
      setFarmAccess(access)

      // Load farms user has access to (with caching)
      const userFarms = await loadUserFarmsCached(access)
      console.log('[Auth] 🏗️ Farms loaded:', userFarms.length, 'farms')

      // If user has no farm access, create a default farm for them
      if (userFarms.length === 0 && access.length === 0) {
        console.log('[Auth] 🆕 Creating default farm for new user...')
        try {
          const defaultFarm = await createDefaultFarmForUser(firebaseUser, userProfile)
          console.log('[Auth] ✅ Default farm created:', defaultFarm?.name)
          
          if (defaultFarm) {
            // Reload farm access after creating default farm
            const newAccess = await loadUserFarmAccess(firebaseUser.uid)
            console.log('[Auth] 📋 Reloaded farm access:', newAccess.length)
            setFarmAccess(newAccess)
            
            const newFarms = await loadUserFarms(newAccess)
            console.log('[Auth] 🏗️ Reloaded farms:', newFarms.length)
            setFarms(newFarms)

            // Auto-select the new default farm
            if (newFarms.length > 0) {
              console.log('[Auth] 🎯 Auto-selecting default farm:', newFarms[0].name)
              setCurrentFarmState(newFarms[0])
            }
          }
        } catch (error) {
          console.error('[Auth] ❌ Error creating default farm:', error)
          // Continue without farm - user can create one later
          setFarms([])
        }
      } else {
        console.log('[Auth] ✅ Setting farms:', userFarms.length)
        setFarms(userFarms)

        // Auto-select farm if user has only one
        if (userFarms.length === 1 && !currentFarm) {
          console.log('[Auth] 🎯 Auto-selecting single farm:', userFarms[0].name)
          setCurrentFarmState(userFarms[0])
        }
      }

      // Update last login
      await updateLastLogin(firebaseUser.uid)

      // Save state to localStorage
      setTimeout(saveAuthState, 1000) // Save after a short delay to ensure state is set
    } catch (error) {
      // Error loading fresh auth data
    }
  }

  // Auth actions
  const signIn = async (email: string, password: string): Promise<void> => {
    console.log('[Auth] 🔐 Signing in...')
    await signInWithEmailAndPassword(auth, email, password)
    console.log('[Auth] ✅ Sign in successful')
  }

  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    console.log('[Auth] 📝 Signing up...')
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName })
    await sendEmailVerification(credential.user)
    console.log('[Auth] ✅ Sign up successful')
  }

  const signOut = async (): Promise<void> => {
    console.log('[Auth] 🚪 Signing out...')
    await firebaseSignOut(auth)
    localStorage.removeItem(AUTH_STATE_KEY)
    console.log('[Auth] ✅ Sign out successful')
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
    // Super admin check - use environment variables for security
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@farm.com'
    const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID || 'O6aFgoNhDigSIXk6zdYSDrFWhWG2'

    return Boolean(
      (user?.email && user.email === adminEmail) ||
      (user?.uid && user.uid === adminUid)
    )
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
      // Invalidate cache to force fresh data
      authCache.current.lastFetch = 0

      const access = await loadUserFarmAccessCached(firebaseUser.uid)
      setFarmAccess(access)

      const userFarms = await loadUserFarmsCached(access)
      setFarms(userFarms)
    }
  }

  // Compute roles and permissions
  const roles: FarmRole[] = Array.from(new Set(farmAccess.filter(a => a.isActive).map(a => a.role)))
  const permissions: Permission[] = Array.from(new Set(
    roles.flatMap(role => ROLE_PERMISSIONS[role] || [])
  ))

  const contextValue: SimpleAuthContextType = {
    // Authentication state
    user,
    firebaseUser,
    loading,

    // Farm management
    farms,
    currentFarm,
    farmAccess,
    organizations: [],

    // Roles and permissions
    roles,
    permissions,

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
    isOrganizationAdmin: () => false, // Not implemented in simple auth

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