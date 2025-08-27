'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from './firebase'
import { 
  EnhancedUser, 
  UserRole, 
  EnhancedFarm, 
  Organization, 
  Permission,
  RoleType
} from './types-enhanced'
import { enhancedAuthService } from './enhanced-auth-service'

interface EnhancedAuthContextType {
  // Authentication state
  user: EnhancedUser | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  
  // User roles and permissions
  roles: UserRole[]
  permissions: Permission[]
  
  // Available resources
  organizations: Organization[]
  farms: EnhancedFarm[]
  currentFarm: EnhancedFarm | null
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<EnhancedUser>
  signUp: (userData: {
    email: string
    password: string
    displayName: string
    phoneNumber?: string
    organizationName?: string
    farmName?: string
  }) => Promise<EnhancedUser>
  signOut: () => Promise<void>
  
  // Permission checking
  hasPermission: (permission: Permission, scopeId?: string) => boolean
  hasRole: (roleType: RoleType, scopeId?: string) => boolean
  isSuperAdmin: () => boolean
  isOrganizationAdmin: (organizationId?: string) => boolean
  isFarmOwner: (farmId?: string) => boolean
  
  // Farm management
  setCurrentFarm: (farm: EnhancedFarm | null) => void
  refreshUserData: () => Promise<void>
  
  // User profile
  updateProfile: (updates: Partial<EnhancedUser>) => Promise<void>
  sendEmailVerification: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | null>(null)

interface EnhancedAuthProviderProps {
  children: ReactNode
}

export function EnhancedAuthProvider({ children }: EnhancedAuthProviderProps) {
  const [user, setUser] = useState<EnhancedUser | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [farms, setFarms] = useState<EnhancedFarm[]>([])
  const [currentFarm, setCurrentFarmState] = useState<EnhancedFarm | null>(null)

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setFirebaseUser(firebaseUser)
        
        if (firebaseUser) {
          // User is signed in - load user profile directly without calling signIn
          try {
            // Load user profile using the auth service
            const enhancedUser = await enhancedAuthService.loadUserProfile(firebaseUser.uid)
            setUser(enhancedUser)
            
            // Load user roles and permissions
            const userRoles = await enhancedAuthService.loadUserRoles(firebaseUser.uid)
            // Set the current user in the service so permissions work correctly
            enhancedAuthService.setCurrentUserAndRoles(enhancedUser, userRoles)
            
            // Load user data
            await loadUserData(firebaseUser.uid)
          } catch (error) {
            console.error('Error loading user profile:', error)
            // If loading fails, clear everything
            clearUserData()
          }
        } else {
          // User is signed out
          clearUserData()
        }
      } catch (error) {
        console.error('Auth state change error:', error)
        clearUserData()
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  // Load current farm from localStorage
  useEffect(() => {
    if (farms.length > 0) {
      const savedFarmId = localStorage.getItem('currentFarmId')
      if (savedFarmId) {
        const savedFarm = farms.find(farm => farm.id === savedFarmId)
        if (savedFarm) {
          setCurrentFarmState(savedFarm)
          return
        }
      }
      
      // Default to first farm if no saved farm or saved farm not found
      setCurrentFarmState(farms[0])
    }
  }, [farms])

  // Load user roles, permissions, and available resources
  const loadUserData = async (userId: string) => {
    try {
      // Load user roles
      const userRoles = await enhancedAuthService.loadUserRoles(userId)
      setRoles(userRoles)
      
      // Calculate permissions
      const userPermissions = enhancedAuthService.getCurrentPermissions()
      setPermissions(userPermissions)
      
      // Load available farms based on user access
      const userFarms = await loadUserFarms(userId, userRoles)
      setFarms(userFarms)
      
      // Load organizations if user has org-level roles
      const userOrganizations = await loadUserOrganizations(userId, userRoles)
      setOrganizations(userOrganizations)
      
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadUserFarms = async (userId: string, userRoles: UserRole[]): Promise<EnhancedFarm[]> => {
    try {
      // Get farm IDs from roles
      const farmIds = userRoles
        .filter(role => role.scopeType === 'farm' && role.isActive)
        .map(role => role.scopeId)
        .filter(Boolean) as string[]

      if (farmIds.length === 0) return []

      // Load farms
      const farmsPromises = farmIds.map(async (farmId) => {
        try {
          const { getDoc, doc } = await import('firebase/firestore')
          const { db } = await import('./firebase')
          
          const farmDoc = await getDoc(doc(db, 'farms', farmId))
          
          if (!farmDoc.exists()) return null

          return {
            id: farmDoc.id,
            ...farmDoc.data(),
            createdDate: farmDoc.data().createdDate?.toDate() || new Date()
          } as EnhancedFarm
        } catch (error) {
          console.error(`Error loading farm ${farmId}:`, error)
          return null
        }
      })

      const loadedFarms = await Promise.all(farmsPromises)
      return loadedFarms.filter(Boolean) as EnhancedFarm[]
      
    } catch (error) {
      console.error('Error loading user farms:', error)
      return []
    }
  }

  const loadUserOrganizations = async (userId: string, userRoles: UserRole[]): Promise<Organization[]> => {
    try {
      // Get organization IDs from roles
      const orgIds = userRoles
        .filter(role => role.scopeType === 'organization' && role.isActive)
        .map(role => role.scopeId)
        .filter(Boolean) as string[]

      if (orgIds.length === 0) return []

      // Load organizations
      const orgsPromises = orgIds.map(async (orgId) => {
        try {
          const { getDoc, doc } = await import('firebase/firestore')
          const { db } = await import('./firebase')
          
          const orgDoc = await getDoc(doc(db, 'organizations', orgId))
          
          if (!orgDoc.exists()) return null

          return {
            id: orgDoc.id,
            ...orgDoc.data(),
            createdAt: orgDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: orgDoc.data().updatedAt?.toDate() || new Date()
          } as Organization
        } catch (error) {
          console.error(`Error loading organization ${orgId}:`, error)
          return null
        }
      })

      const loadedOrgs = await Promise.all(orgsPromises)
      return loadedOrgs.filter(Boolean) as Organization[]
      
    } catch (error) {
      console.error('Error loading user organizations:', error)
      return []
    }
  }

  const clearUserData = () => {
    setUser(null)
    setRoles([])
    setPermissions([])
    setOrganizations([])
    setFarms([])
    setCurrentFarmState(null)
    localStorage.removeItem('currentFarmId')
  }

  // Auth actions
  const signIn = async (email: string, password: string): Promise<EnhancedUser> => {
    setLoading(true)
    try {
      const user = await enhancedAuthService.signIn(email, password)
      return user
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (userData: {
    email: string
    password: string
    displayName: string
    phoneNumber?: string
    organizationName?: string
    farmName?: string
  }): Promise<EnhancedUser> => {
    setLoading(true)
    try {
      const user = await enhancedAuthService.signUp(userData)
      return user
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<void> => {
    setLoading(true)
    try {
      await enhancedAuthService.signOut()
      clearUserData()
    } finally {
      setLoading(false)
    }
  }

  // Permission checking
  const hasPermission = (permission: Permission, scopeId?: string): boolean => {
    return enhancedAuthService.hasPermission(permission, scopeId)
  }

  const hasRole = (roleType: RoleType, scopeId?: string): boolean => {
    return enhancedAuthService.hasRole(roleType, scopeId)
  }

  const isSuperAdmin = (): boolean => {
    return enhancedAuthService.isSuperAdmin()
  }

  const isOrganizationAdmin = (organizationId?: string): boolean => {
    return roles.some(role => 
      role.roleType === 'organization_admin' && 
      role.isActive &&
      (!organizationId || role.scopeId === organizationId)
    )
  }

  const isFarmOwner = (farmId?: string): boolean => {
    return roles.some(role => 
      role.roleType === 'farm_owner' && 
      role.isActive &&
      (!farmId || role.scopeId === farmId)
    )
  }

  // Farm management
  const setCurrentFarm = (farm: EnhancedFarm | null) => {
    setCurrentFarmState(farm)
    if (farm) {
      localStorage.setItem('currentFarmId', farm.id)
    } else {
      localStorage.removeItem('currentFarmId')
    }
  }

  const refreshUserData = async (): Promise<void> => {
    if (user) {
      await loadUserData(user.uid)
    }
  }

  // User profile management
  const updateProfile = async (updates: Partial<EnhancedUser>): Promise<void> => {
    if (!user) throw new Error('User not authenticated')
    
    // Update in Firestore
    const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore')
    const { db } = await import('./firebase')
    
    await updateDoc(doc(db, 'users', user.uid), {
      ...updates,
      updatedAt: serverTimestamp()
    })

    // Update local state
    setUser(prevUser => prevUser ? { ...prevUser, ...updates } : null)
  }

  const sendEmailVerification = async (): Promise<void> => {
    await enhancedAuthService.sendVerificationEmail()
  }

  const resetPassword = async (email: string): Promise<void> => {
    await enhancedAuthService.resetPassword(email)
  }

  const contextValue: EnhancedAuthContextType = {
    // Authentication state
    user,
    firebaseUser,
    loading,
    
    // User roles and permissions
    roles,
    permissions,
    
    // Available resources
    organizations,
    farms,
    currentFarm,
    
    // Auth actions
    signIn,
    signUp,
    signOut,
    
    // Permission checking
    hasPermission,
    hasRole,
    isSuperAdmin,
    isOrganizationAdmin,
    isFarmOwner,
    
    // Farm management
    setCurrentFarm,
    refreshUserData,
    
    // User profile
    updateProfile,
    sendEmailVerification,
    resetPassword
  }

  return (
    <EnhancedAuthContext.Provider value={contextValue}>
      {children}
    </EnhancedAuthContext.Provider>
  )
}

export const useEnhancedAuth = (): EnhancedAuthContextType => {
  const context = useContext(EnhancedAuthContext)
  if (!context) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider')
  }
  return context
}

// Backward compatibility - export original useAuth that maps to enhanced version
export const useAuth = (): {
  user: EnhancedUser | null
  currentFarm: EnhancedFarm | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<EnhancedUser>
  signOut: () => Promise<void>
  hasPermission: (permission: Permission, scopeId?: string) => boolean
  isSuperAdmin: () => boolean
  setCurrentFarm: (farm: EnhancedFarm | null) => void
  isAdmin: boolean
} => {
  const enhanced = useEnhancedAuth()
  return {
    user: enhanced.user,
    currentFarm: enhanced.currentFarm,
    loading: enhanced.loading,
    signIn: enhanced.signIn,
    signOut: enhanced.signOut,
    hasPermission: enhanced.hasPermission,
    isSuperAdmin: enhanced.isSuperAdmin,
    setCurrentFarm: enhanced.setCurrentFarm,
    isAdmin: enhanced.isSuperAdmin() // Map isAdmin to isSuperAdmin for backward compatibility
  }
}