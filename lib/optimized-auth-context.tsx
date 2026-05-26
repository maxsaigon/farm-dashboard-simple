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
  serverTimestamp,
  writeBatch
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
  currentSeasonYear?: number
  seasons?: number[]
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

  // Season management
  selectedSeasonYear: number
  setSelectedSeasonYear: (year: number) => void
  startNewSeason: (year: number) => Promise<void>
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
  const [selectedSeasonYear, setSelectedSeasonYearState] = useState<number>(2025)

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
        // Only restore if less than 7 days old
        if (Date.now() - state.timestamp < 7 * 24 * 60 * 60 * 1000) {
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
    console.log('[Auth] 🚀 Setting up auth context')
    
    // 1. Try to restore cache immediately on mount
    let initialUser: SimpleUser | null = null
    try {
      const restoredState = restoreAuthState()
      if (restoredState) {
        console.log('[Auth] ⚡ Restored cached auth state on mount:', restoredState.user.email)
        setUser(restoredState.user)
        setFarms(restoredState.farms)
        setFarmAccess(restoredState.farmAccess)
        
        let farmToSelect = null
        if (restoredState.currentFarmId) {
          farmToSelect = restoredState.farms.find((f: any) => f.id === restoredState.currentFarmId)
        }
        
        if (!farmToSelect && restoredState.user?.uid) {
          const storedFarmId = localStorage.getItem(`currentFarm_${restoredState.user.uid}`)
          if (storedFarmId) {
            farmToSelect = restoredState.farms.find((f: any) => f.id === storedFarmId)
          }
        }
        
        if (farmToSelect) {
          setCurrentFarmState(farmToSelect)
        }
        
        setLoading(false)
        initialUser = restoredState.user
      }
    } catch (err) {
      console.error('[Auth] Error restoring cache on mount:', err)
    }

    // 2. Setup Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] 🎯 Auth state changed:', firebaseUser ? firebaseUser.email : 'No user')
      
      try {
        setFirebaseUser(firebaseUser)
        
        if (firebaseUser) {
          // Check if the firebaseUser matches the initial user we restored from cache
          const currentUser = initialUser
          
          if (currentUser && currentUser.uid === firebaseUser.uid) {
            console.log('[Auth] ⚡ firebaseUser matches cached user, triggering background refresh')
            await loadFreshAuthData(firebaseUser)
          } else {
            // Try to read cache again (e.g. if updated elsewhere or login was performed)
            const restoredState = restoreAuthState()
            if (restoredState && restoredState.user.uid === firebaseUser.uid) {
              console.log('[Auth] ⚡ cache matches firebaseUser, updating state')
              setUser(restoredState.user)
              setFarms(restoredState.farms)
              setFarmAccess(restoredState.farmAccess)
              if (restoredState.currentFarmId) {
                const current = restoredState.farms.find((f: any) => f.id === restoredState.currentFarmId)
                if (current) setCurrentFarmState(current)
              }
              setLoading(false)
              await loadFreshAuthData(firebaseUser)
            } else {
              console.log('[Auth] 📡 No matching cache found, loading fresh data from Firestore')
              await loadFreshAuthData(firebaseUser, true) // Force refresh
            }
          }
        } else {
          console.log('[Auth] ❌ No user')
          setUser(null)
          setFarms([])
          setCurrentFarmState(null)
          setFarmAccess([])
          localStorage.removeItem(AUTH_STATE_KEY)
          // Clear auth cache
          authCache.current = {
            userProfile: null,
            farmAccess: null,
            farms: null,
            lastFetch: 0
          }
        }
      } catch (error) {
        console.error('[Auth] Error in auth state listener:', error)
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
      saveAuthState()
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

  // Sync selected season when current farm changes
  useEffect(() => {
    if (currentFarm) {
      const farmSeason = currentFarm.currentSeasonYear || 2025
      const validSeason = farmSeason < 2000 ? 2025 : farmSeason
      setSelectedSeasonYearState(validSeason)
    }
  }, [currentFarm])

  // Trigger background season migration check when a farm is selected
  useEffect(() => {
    if (!currentFarm?.id || !user?.uid) return

    const runSeasonMigration = async () => {
      try {
        console.log('[SeasonMigration] 🚀 Starting client-side season migration for farm:', currentFarm.id)
        
        // 1. Migrate Farm configuration
        const currentSeasons = currentFarm.seasons || [2025]
        const cleanSeasons = currentSeasons.filter(y => y >= 2000)
        if (cleanSeasons.length === 0) {
          cleanSeasons.push(2025)
        }
        
        let farmUpdated = false
        const isSeasonYearInvalid = !currentFarm.currentSeasonYear || currentFarm.currentSeasonYear < 2000
        const isSeasonsListInvalid = !currentFarm.seasons || currentFarm.seasons.some(y => y < 2000) || !currentSeasons.includes(2025)

        if (isSeasonYearInvalid || isSeasonsListInvalid) {
          const finalSeasonYear = isSeasonYearInvalid ? 2025 : currentFarm.currentSeasonYear
          const updatedSeasons = Array.from(new Set([...cleanSeasons, 2025])).sort((a, b) => b - a)
          const farmRef = doc(db, 'farms', currentFarm.id)
          await setDoc(farmRef, {
            currentSeasonYear: finalSeasonYear,
            seasons: updatedSeasons
          }, { merge: true })
          
          currentFarm.currentSeasonYear = finalSeasonYear
          currentFarm.seasons = updatedSeasons
          farmUpdated = true
        }

        // 2. Migrate Trees
        const treesRef = collection(db, 'farms', currentFarm.id, 'trees')
        const treesSnapshot = await getDocs(treesRef)
        let treesMigrated = 0
        let batch = writeBatch(db)
        let opCount = 0

        for (const treeDoc of treesSnapshot.docs) {
          const treeData = treeDoc.data()
          const seasonalStats = treeData.seasonalStats || {}
          
          let treeUpdated = false
          const newSeasonalStats = { ...seasonalStats }

          // Clean up invalid seasonalStats keys (< 2000 or 1970)
          for (const key of Object.keys(seasonalStats)) {
            const yearKey = parseInt(key, 10)
            if (isNaN(yearKey) || yearKey < 2000) {
              const existing2025Stats = newSeasonalStats[2025] || {}
              const badStats = seasonalStats[key] || {}
              
              newSeasonalStats[2025] = {
                manualFruitCount: badStats.manualFruitCount !== undefined ? badStats.manualFruitCount : (existing2025Stats.manualFruitCount || 0),
                aiFruitCount: badStats.aiFruitCount !== undefined ? badStats.aiFruitCount : (existing2025Stats.aiFruitCount || 0),
                healthStatus: badStats.healthStatus || existing2025Stats.healthStatus || 'Good',
                notes: badStats.notes || existing2025Stats.notes || '',
                updatedAt: badStats.updatedAt || existing2025Stats.updatedAt || new Date()
              }
              
              delete newSeasonalStats[key]
              treeUpdated = true
            }
          }

          // If seasonalStats for 2025 does not exist, copy root values
          if (!newSeasonalStats[2025]) {
            newSeasonalStats[2025] = {
              manualFruitCount: treeData.manualFruitCount || 0,
              aiFruitCount: treeData.aiFruitCount || 0,
              healthStatus: treeData.healthStatus || 'Good',
              notes: treeData.notes || '',
              updatedAt: treeData.updatedAt || new Date()
            }
            treeUpdated = true
          }

          if (treeUpdated) {
            batch.update(doc(db, 'farms', currentFarm.id, 'trees', treeDoc.id), {
              seasonalStats: newSeasonalStats
            })
            opCount++
            treesMigrated++

            if (opCount >= 400) {
              await batch.commit()
              batch = writeBatch(db)
              opCount = 0
            }
          }
        }

        if (opCount > 0) {
          await batch.commit()
        }

        // Helper to migrate a list of photo documents
        const migratePhotoDocs = async (photoDocs: any[]) => {
          let migrated = 0
          let batchWrite = writeBatch(db)
          let opCountPhotos = 0

          for (const photoDoc of photoDocs) {
            const photoData = photoDoc.data()
            if (photoData.seasonYear === undefined || photoData.seasonYear < 2000) {
              let seasonYear = 2025
              let photoDate: Date | null = null
              if (photoData.timestamp) {
                if (photoData.timestamp.toDate) {
                  photoDate = photoData.timestamp.toDate()
                } else {
                  photoDate = new Date(photoData.timestamp)
                }
              }

              if (photoDate && photoDate.getFullYear() >= 2020) {
                seasonYear = photoDate.getFullYear()
              } else if (currentFarm.currentSeasonYear && currentFarm.currentSeasonYear >= 2000) {
                seasonYear = currentFarm.currentSeasonYear
              }

              batchWrite.update(photoDoc.ref, {
                seasonYear
              })
              opCountPhotos++
              migrated++

              if (opCountPhotos >= 400) {
                await batchWrite.commit()
                batchWrite = writeBatch(db)
                opCountPhotos = 0
              }
            }
          }

          if (opCountPhotos > 0) {
            await batchWrite.commit()
          }
          return migrated
        }

        // 3. Migrate Photos (Root Collection)
        const photosRef = collection(db, 'photos')
        const photosQuery = query(photosRef, where('farmId', '==', currentFarm.id))
        const photosSnapshot = await getDocs(photosQuery)
        const rootPhotosMigrated = await migratePhotoDocs(photosSnapshot.docs)

        // 4. Migrate Photos (Farm Subcollection)
        const subPhotosRef = collection(db, 'farms', currentFarm.id, 'photos')
        const subPhotosSnapshot = await getDocs(subPhotosRef)
        const subPhotosMigrated = await migratePhotoDocs(subPhotosSnapshot.docs)

        const totalPhotosMigrated = rootPhotosMigrated + subPhotosMigrated

        if (farmUpdated || treesMigrated > 0 || totalPhotosMigrated > 0) {
          console.log('[SeasonMigration] ✅ Season migration completed client-side.', {
            farmUpdated,
            treesMigrated,
            totalPhotosMigrated
          })
          if (farmUpdated) {
            setCurrentFarmState({ ...currentFarm })
          }
        }
      } catch (err) {
        console.error('[SeasonMigration] ❌ Error migrating season data:', err)
      }
    }

    runSeasonMigration()
  }, [currentFarm?.id, user?.uid])

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
  const loadFreshAuthData = async (firebaseUser: FirebaseUser, force = false) => {
    try {
      console.log('[Auth] 📡 loadFreshAuthData started for:', firebaseUser.email, force ? '(forced)' : '')
      
      // If forced, invalidate the memory cache
      if (force) {
        authCache.current = {
          userProfile: null,
          farmAccess: null,
          farms: null,
          lastFetch: 0
        }
      } else {
        // If not forced, check if cache is still fresh (< 5 minutes)
        try {
          const stored = localStorage.getItem(AUTH_STATE_KEY)
          if (stored) {
            const state = JSON.parse(stored)
            // If cache timestamp is less than 5 minutes old, skip querying Firestore
            if (state.timestamp && Date.now() - state.timestamp < 5 * 60 * 1000) {
              console.log('[Auth] ⚡ Cache is fresh (< 5 mins), skipping background Firestore fetch')
              return
            }
          }
        } catch (e) {
          // Ignore cache reading error, proceed to load
        }
      }

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
      console.error('[Auth] Error loadFreshAuthData:', error)
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
      console.log('[Auth] 🔄 refreshUserData forced')
      // Invalidate memory cache and fetch fresh data from Firestore
      await loadFreshAuthData(firebaseUser, true)
    }
  }

  const startNewSeason = async (year: number): Promise<void> => {
    if (!currentFarm || !user) return
    
    const currentSeasons = currentFarm.seasons || [2025]
    const updatedSeasons = Array.from(new Set([...currentSeasons, year])).sort((a, b) => b - a)
    
    try {
      const farmRef = doc(db, 'farms', currentFarm.id)
      await setDoc(farmRef, {
        currentSeasonYear: year,
        seasons: updatedSeasons
      }, { merge: true })
      
      const updatedFarm = {
        ...currentFarm,
        currentSeasonYear: year,
        seasons: updatedSeasons
      }
      
      setCurrentFarmState(updatedFarm)
      setSelectedSeasonYearState(year)
      setFarms(prev => prev.map(f => f.id === currentFarm.id ? updatedFarm : f))
    } catch (error) {
      console.error('Error starting new season:', error)
      throw error
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
    refreshUserData,

    // Season management
    selectedSeasonYear,
    setSelectedSeasonYear: setSelectedSeasonYearState,
    startNewSeason
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