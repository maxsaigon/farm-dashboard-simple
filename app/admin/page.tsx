'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { useRouter } from 'next/navigation'
import MobileAdminLayout from '@/components/admin/MobileAdminLayout'
import AdminDashboardMobile from '@/components/admin/AdminDashboardMobile'
import UserManagementMobile from '@/components/admin/UserManagementMobile'
import FarmManagementMobile from '@/components/admin/FarmManagementMobile'
import SuperAdminPanel from '@/components/admin/SuperAdminPanel'
import SystemSettingsMobile from '@/components/admin/SystemSettingsMobile'

type AdminSection = 'dashboard' | 'users' | 'farms' | 'roles' | 'settings'

export default function AdminPage() {
  const { user, isAdmin, loading } = useSimpleAuth()
  const router = useRouter()
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !isAdmin())) {
      router.push('/login')
    }
    // Check for super admin (you can customize this logic)
    if (user?.email === 'admin@farm.com' || user?.uid === 'O6aFgoNhDigSIXk6zdYSDrFWhWG2') {
      setIsSuperAdmin(true)
    }
  }, [user, isAdmin, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Bạn cần quyền super admin để truy cập khu vực này.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    )
  }

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <AdminDashboardMobile />
      case 'users':
        return <UserManagementMobile />
      case 'farms':
        return <FarmManagementMobile />
      case 'roles':
        return isSuperAdmin ? <SuperAdminPanel /> : <UserManagementMobile />
      case 'settings':
        return <SystemSettingsMobile />
      default:
        return <AdminDashboardMobile />
    }
  }

  return (
    <MobileAdminLayout
      currentSection={currentSection}
      onSectionChange={setCurrentSection}
      isAdmin={isSuperAdmin}
    >
      {renderCurrentSection()}
    </MobileAdminLayout>
  )
}