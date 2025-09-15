'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '../lib/simple-auth-context'

export default function HomePage() {
  const router = useRouter()
  const { user, loading, currentFarm, hasPermission } = useSimpleAuth()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Force redirect to login if not authenticated
        router.push('/login')
      } else if (!currentFarm || !hasPermission('read')) {
        // If user doesn't have access to any farm, show no access message
        router.push('/no-access')
      } else {
        // User is authenticated and has farm access, redirect to map
        router.push('/map')
      }
    }
  }, [loading, user, currentFarm, hasPermission, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          {!user ? 'Đang chuyển đến đăng nhập...' : 'Đang kiểm tra quyền truy cập...'}
        </p>
      </div>
    </div>
  )
}
