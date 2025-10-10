'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/lib/optimized-auth-context'

export default function HomePage() {
  const router = useRouter()
  const { user, loading, currentFarm, farms, setCurrentFarm, hasPermission } = useSimpleAuth()

  console.log('[HomePage] 🏠 Render - loading:', loading, 'user:', user?.email, 'farms:', farms.length, 'currentFarm:', currentFarm?.name)
  console.log('[HomePage] 🏠 Farms array:', farms)

  useEffect(() => {
    console.log('[HomePage] 🔄 useEffect triggered - loading:', loading, 'user:', user?.email, 'farms:', farms.length)
    console.log('[HomePage] 🔄 Farms in useEffect:', farms)
    
    // Don't do anything while loading
    if (loading) {
      console.log('[HomePage] ⏳ Still loading, waiting...')
      return
    }

    // Not authenticated - redirect to login
    if (!user) {
      console.log('[HomePage] ❌ No user, redirecting to /login')
      router.push('/login')
      return
    }

    // User is authenticated, check farm access
    console.log('[HomePage] ✅ User authenticated, checking farms...')
    console.log('[HomePage] - Available farms:', farms.length)
    console.log('[HomePage] - Current farm:', currentFarm?.name)

    // Wait for farms to be loaded (they might still be loading even if loading=false)
    if (farms.length === 0) {
      console.log('[HomePage] ⏳ Waiting for farms to load...')
      // Don't redirect yet, farms might still be loading
      return
    }

    // If user has farms but no current farm selected
    if (!currentFarm) {
      if (farms.length === 1) {
        // Auto-select the only farm
        console.log('[HomePage] 🎯 Auto-selecting single farm:', farms[0].name)
        setCurrentFarm(farms[0])
        // Don't redirect yet, wait for next render with currentFarm set
        return
      } else {
        // Multiple farms, show selector (redirect to map which has farm selector)
        console.log('[HomePage] 🏗️ Multiple farms, redirecting to /map for selection')
        router.push('/map')
        return
      }
    }

    // User has current farm, check permission
    if (hasPermission('read')) {
      console.log('[HomePage] ✅ User has farm access, redirecting to /map')
      router.push('/map')
    } else {
      console.log('[HomePage] ⚠️ No read permission, redirecting to /no-access')
      router.push('/no-access')
    }
  }, [loading, user, currentFarm, farms, setCurrentFarm, hasPermission, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          {!user
            ? 'Đang chuyển đến đăng nhập...'
            : !currentFarm && farms.length > 0
            ? 'Đang chọn nông trại...'
            : 'Đang kiểm tra quyền truy cập...'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Loading: {loading ? 'true' : 'false'} | User: {user ? '✓' : '✗'} | Farms: {farms.length} | Current: {currentFarm ? '✓' : '✗'}
        </p>
      </div>
    </div>
  )
}
