'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { onAuthStateChange } from './auth'
import { Farm } from './types'
import { AdminService } from './admin-service'

interface AuthContextType {
  user: FirebaseUser | null
  loading: boolean
  currentFarm: Farm | null
  setCurrentFarm: (farm: Farm | null) => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  currentFarm: null,
  setCurrentFarm: () => {},
  isAdmin: false
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user)
      setLoading(false)
      
      if (user) {
        // Check if user is admin
        const adminStatus = AdminService.isAdmin(user.uid)
        setIsAdmin(adminStatus)
        
        // Auto-setup admin if needed
        if (adminStatus) {
          await AdminService.autoSetupIfNeeded(user.uid)
          
          // Auto-select main farm for admin
          const mainFarmId = await AdminService.getMainFarmId()
          if (mainFarmId && !currentFarm) {
            // Load main farm details
            try {
              const adminFarms = await AdminService.getAdminFarms()
              const mainFarm = adminFarms.find(f => f.id === mainFarmId) || adminFarms[0]
              if (mainFarm) {
                setCurrentFarm(mainFarm)
              }
            } catch (error) {
              console.error('Error loading admin farm:', error)
            }
          }
        }
      } else {
        // Clear state when user logs out
        setCurrentFarm(null)
        setIsAdmin(false)
      }
    })

    return unsubscribe
  }, [currentFarm])

  // Persist current farm in localStorage
  useEffect(() => {
    if (currentFarm && user) {
      localStorage.setItem(`currentFarm_${user.uid}`, JSON.stringify({
        id: currentFarm.id,
        name: currentFarm.name
      }))
    }
  }, [currentFarm, user])

  // Restore current farm from localStorage
  useEffect(() => {
    if (user && !currentFarm) {
      const stored = localStorage.getItem(`currentFarm_${user.uid}`)
      if (stored) {
        try {
          JSON.parse(stored)
          // Only store basic info to avoid stale data
          // Full farm data will be loaded by components
        } catch (error) {
          console.warn('Failed to parse stored farm data:', error)
        }
      }
    }
  }, [user, currentFarm])

  const value = {
    user,
    loading,
    currentFarm,
    setCurrentFarm,
    isAdmin
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}