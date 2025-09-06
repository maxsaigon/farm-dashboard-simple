'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../lib/enhanced-auth-context'

interface AuthGuardProps {
  children: React.ReactNode
  requiredPermission?: string
  fallbackPath?: string
  requireFarmAccess?: boolean
}

export default function AuthGuard({ 
  children, 
  requiredPermission,
  fallbackPath = '/no-access',
  requireFarmAccess = true
}: AuthGuardProps) {
  const router = useRouter()
  const { user, loading, currentFarm, hasPermission } = useAuth()

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

      // Check specific permission if required
      if (requiredPermission && !hasPermission(requiredPermission, currentFarm?.id)) {
        router.push(fallbackPath)
        return
      }

      // Check basic farm view permission if farm access is required
      if (requireFarmAccess && !hasPermission('farm:view', currentFarm?.id)) {
        router.push('/no-access')
        return
      }
    }
  }, [loading, user, currentFarm, hasPermission, requiredPermission, fallbackPath, requireFarmAccess, router])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang xác thực...</p>
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

  // Don't render children if specific permission is required but not available
  if (requiredPermission && !hasPermission(requiredPermission, currentFarm?.id)) {
    return null
  }

  // Don't render children if basic farm view permission is required but not available
  if (requireFarmAccess && !hasPermission('farm:view', currentFarm?.id)) {
    return null
  }

  // All checks passed - render the protected content
  return <>{children}</>
}