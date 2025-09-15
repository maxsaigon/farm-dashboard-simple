'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { useRouter } from 'next/navigation'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
// Simplified Admin Components
import SimpleAdminDashboard from '@/components/admin/SimpleAdminDashboard'
import SimpleFarmAssignmentSystem from '@/components/admin/SimpleFarmAssignmentSystem'
import SimpleUserManagement from '@/components/admin/SimpleUserManagement'

type AdminView = 'dashboard' | 'user-management' | 'farm-assignments' | 'settings'

export default function AdminPage() {
  const { user, isAdmin, loading } = useSimpleAuth()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<AdminView>('dashboard')

  useEffect(() => {
    if (!loading && (!user || !isAdmin())) {
      router.push('/login')
    }
  }, [user, isAdmin, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You need super admin privileges to access this area.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <SimpleAdminDashboard />
      case 'user-management':
        return <SimpleUserManagement />
      case 'farm-assignments':
        return <SimpleFarmAssignmentSystem />
      case 'settings':
        return <SystemSettings />
      default:
        return <SimpleAdminDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Super Admin Check */}
      {!user || !isAdmin() ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md p-8">
            <ShieldCheckIcon className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Chỉ dành cho Super Admin</h1>
            <p className="text-gray-600 mb-6">
              Trang này chỉ dành cho quản trị viên hệ thống. 
              Bạn cần quyền super admin để truy cập.
            </p>
            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Về trang chủ
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="block w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
      <div className="min-h-screen bg-gray-50">
        {/* Simple Admin Layout */}
        <div className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">👋 {user?.displayName || user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'dashboard', name: '📊 Tổng quan', description: 'Bảng điều khiển' },
                { id: 'user-management', name: '👥 Người dùng', description: 'Quản lý người dùng' },
                { id: 'farm-assignments', name: '🏭 Phân quyền', description: 'Gán quyền nông trại' },
                { id: 'settings', name: '⚙️ Cài đặt', description: 'Cài đặt hệ thống' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id as AdminView)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    currentView === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span>{tab.name}</span>
                    <span className="text-xs text-gray-400 mt-1">{tab.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {renderCurrentView()}
        </div>
      </div>
      )}
    </div>
  )
}

// Placeholder for SystemSettings component
function SystemSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">System settings panel will be implemented here.</p>
        <p className="text-sm text-gray-500 mt-2">This will include global configuration options, security settings, and system maintenance tools.</p>
      </div>
    </div>
  )
}