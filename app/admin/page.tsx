'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/enhanced-auth-context'
import { useRouter } from 'next/navigation'
import { 
  UsersIcon, 
  BuildingStorefrontIcon,
  MapIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { AdminStatsCard } from '@/components/admin/AdminStatsCard'
import { UserManagement } from '@/components/admin/UserManagement'
import { FarmManagement } from '@/components/admin/FarmManagement'
import { ZoneManagement } from '@/components/admin/ZoneManagement'
import { SystemSettings } from '@/components/admin/SystemSettings'

type AdminView = 'dashboard' | 'users' | 'farms' | 'zones' | 'settings'

export default function AdminPage() {
  const { user, isSuperAdmin, loading } = useAuth()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<AdminView>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin())) {
      router.push('/login')
    }
  }, [user, isSuperAdmin, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user || !isSuperAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Không có quyền truy cập</h1>
          <p className="text-gray-600 mb-4">Bạn cần quyền Super Admin để truy cập trang này.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    )
  }

  const navigationItems = [
    {
      id: 'dashboard' as AdminView,
      name: 'Tổng quan',
      icon: ChartBarIcon,
      description: 'Thống kê tổng quát hệ thống'
    },
    {
      id: 'users' as AdminView,
      name: 'Quản lý người dùng',
      icon: UsersIcon,
      description: 'Quản lý tài khoản và phân quyền'
    },
    {
      id: 'farms' as AdminView,
      name: 'Quản lý nông trại',
      icon: BuildingStorefrontIcon,
      description: 'Tạo và quản lý nông trại'
    },
    {
      id: 'zones' as AdminView,
      name: 'Quản lý khu vực',
      icon: MapIcon,
      description: 'Quản lý zone và khu vực trồng trọt'
    },
    {
      id: 'settings' as AdminView,
      name: 'Cài đặt hệ thống',
      icon: Cog6ToothIcon,
      description: 'Cấu hình và cài đặt chung'
    }
  ]

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <AdminDashboard />
      case 'users':
        return <UserManagement searchQuery={searchQuery} />
      case 'farms':
        return <FarmManagement searchQuery={searchQuery} />
      case 'zones':
        return <ZoneManagement searchQuery={searchQuery} />
      case 'settings':
        return <SystemSettings />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                🛡️ Super Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              {currentView !== 'dashboard' && currentView !== 'settings' && (
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                Xin chào, <span className="font-semibold">{user.displayName || user.email}</span>
              </div>
              
              <button
                onClick={() => router.push('/')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Về Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Chức năng quản trị</h2>
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentView === item.id
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderCurrentView()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Admin Dashboard Overview Component
function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Tổng quan hệ thống</h2>
        <p className="text-gray-600">Thống kê và quản lý tổng quát Farm Manager</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Tổng người dùng"
          value="0"
          icon={UsersIcon}
          color="blue"
          trend={{ value: 0, isPositive: true }}
        />
        <AdminStatsCard
          title="Tổng nông trại"
          value="0"
          icon={BuildingStorefrontIcon}
          color="green"
          trend={{ value: 0, isPositive: true }}
        />
        <AdminStatsCard
          title="Tổng cây trồng"
          value="0"
          icon={MapIcon}
          color="yellow"
          trend={{ value: 0, isPositive: true }}
        />
        <AdminStatsCard
          title="Zone hoạt động"
          value="0"
          icon={Cog6ToothIcon}
          color="purple"
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h3>
          <button className="text-green-600 hover:text-green-700 text-sm font-medium">
            Xem tất cả
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <UsersIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Người dùng mới đăng ký</p>
                <p className="text-xs text-gray-500">2 phút trước</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <BuildingStorefrontIcon className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Nông trại mới được tạo</p>
                <p className="text-xs text-gray-500">1 giờ trước</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}