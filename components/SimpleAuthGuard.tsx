'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth, Permission, FarmRole } from '@/lib/optimized-auth-context'

interface SimpleAuthGuardProps {
  children: React.ReactNode
  requiredPermission?: Permission
  requiredRole?: FarmRole
  requireFarmAccess?: boolean
  fallbackPath?: string
  loadingComponent?: React.ReactNode
}

export default function SimpleAuthGuard({ 
  children, 
  requiredPermission,
  requiredRole,
  requireFarmAccess = true,
  fallbackPath = '/no-access',
  loadingComponent
}: SimpleAuthGuardProps) {
  const router = useRouter()
  const { 
    user, 
    loading, 
    currentFarm, 
    hasPermission, 
    getUserRole,
    canAccessFarm 
  } = useSimpleAuth()

  useEffect(() => {
    if (!loading) {
      // Not authenticated - redirect to login
      if (!user) {
        router.push('/login')
        return
      }

      // Require farm access by default
      if (requireFarmAccess && !currentFarm) {
        router.push('/no-access')
        return
      }

      // Check if user can access current farm
      if (requireFarmAccess && currentFarm && !canAccessFarm(currentFarm.id)) {
        router.push('/no-access')
        return
      }

      // Check specific permission if required
      if (requiredPermission && !hasPermission(requiredPermission, currentFarm?.id)) {
        router.push(fallbackPath)
        return
      }

      // Check specific role if required
      if (requiredRole && currentFarm) {
        const userRole = getUserRole(currentFarm.id)
        if (!userRole) {
          router.push('/no-access')
          return
        }

        // Check role hierarchy: owner > manager > viewer
        const roleHierarchy = { owner: 3, manager: 2, viewer: 1 }
        const userRoleLevel = roleHierarchy[userRole]
        const requiredRoleLevel = roleHierarchy[requiredRole]

        if (userRoleLevel < requiredRoleLevel) {
          router.push(fallbackPath)
          return
        }
      }
    }
  }, [
    loading, 
    user, 
    currentFarm, 
    hasPermission, 
    getUserRole,
    canAccessFarm,
    requiredPermission, 
    requiredRole,
    requireFarmAccess, 
    fallbackPath, 
    router
  ])

  // Show loading while checking authentication
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }

    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">Đang xác thực</h3>
          <p className="text-green-600">Vui lòng đợi trong giây lát...</p>
        </div>
      </div>
    )
  }

  // Don't render children if user is not authenticated
  if (!user) {
    return null
  }

  // Don't render children if farm access is required but not available
  if (requireFarmAccess && !currentFarm) {
    return null
  }

  // Don't render children if user can't access current farm
  if (requireFarmAccess && currentFarm && !canAccessFarm(currentFarm.id)) {
    return null
  }

  // Don't render children if specific permission is required but not available
  if (requiredPermission && !hasPermission(requiredPermission, currentFarm?.id)) {
    return null
  }

  // Don't render children if specific role is required but not available
  if (requiredRole && currentFarm) {
    const userRole = getUserRole(currentFarm.id)
    if (!userRole) return null

    const roleHierarchy = { owner: 3, manager: 2, viewer: 1 }
    const userRoleLevel = roleHierarchy[userRole]
    const requiredRoleLevel = roleHierarchy[requiredRole]

    if (userRoleLevel < requiredRoleLevel) {
      return null
    }
  }

  // All checks passed - render the protected content
  return <>{children}</>
}

// Convenience components for common use cases
export function AdminOnly({ children }: { children: React.ReactNode }) {
  return (
    <SimpleAuthGuard requiredRole="owner" fallbackPath="/no-access">
      {children}
    </SimpleAuthGuard>
  )
}

export function ManagerOnly({ children }: { children: React.ReactNode }) {
  return (
    <SimpleAuthGuard requiredRole="manager" fallbackPath="/no-access">
      {children}
    </SimpleAuthGuard>
  )
}

export function WriteAccess({ children }: { children: React.ReactNode }) {
  return (
    <SimpleAuthGuard requiredPermission="write" fallbackPath="/no-access">
      {children}
    </SimpleAuthGuard>
  )
}

export function ReadAccess({ children }: { children: React.ReactNode }) {
  return (
    <SimpleAuthGuard requiredPermission="read" fallbackPath="/no-access">
      {children}
    </SimpleAuthGuard>
  )
}