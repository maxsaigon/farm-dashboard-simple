'use client'

import { useState, useEffect } from 'react'
import { 
  MapIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  PlusIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import { signOutUser } from '../lib/auth'
import { subscribeToTrees, calculateDashboardStats, getTreesNeedingAttention } from '../lib/firestore'
import { Tree, DashboardStats, Farm } from '../lib/types'
import UserInfo from '../components/UserInfo'
import { FarmSelector } from '../components/FarmSelector'
import { MigrationPrompt } from '../components/MigrationPrompt'
import { AdminBanner } from '../components/AdminBanner'
import { AdminDashboard } from '../components/AdminDashboard'
import { useAuth } from '../lib/enhanced-auth-context'
import MobileDashboard from '../components/MobileDashboard'

// No mock data - use only real API data

function FarmStats({ stats }: { stats: DashboardStats }) {
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
        Tình Hình Nông Trại
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Tổng số cây */}
        <div className="text-center">
          <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <MapIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalTrees}</div>
          <div className="text-sm text-gray-600 mt-1">Tổng Số Cây</div>
        </div>

        {/* Cây khỏe mạnh */}
        <div className="text-center">
          <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.healthyTrees}</div>
          <div className="text-sm text-gray-600 mt-1">Cây Khỏe Mạnh</div>
        </div>

        {/* Cây cần chú ý */}
        <div className="text-center">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">{stats.treesNeedingAttention}</div>
          <div className="text-sm text-gray-600 mt-1">Cần Chú Ý</div>
        </div>
      </div>

      {/* Tổng số trái */}
      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <div className="text-lg text-gray-600">Tổng Số Trái Dự Kiến</div>
        <div className="text-4xl font-bold text-orange-600 mt-2">
          {stats.totalFruits.toLocaleString()}
        </div>
        <div className="text-sm text-gray-500 mt-1">trái sầu riêng</div>
      </div>
    </div>
  )
}

function QuickActions() {
  const actions = [
    {
      name: "Quản Lý Cây",
      description: "Xem và quản lý danh sách cây", 
      icon: MapIcon,
      color: "bg-green-600 hover:bg-green-700",
      href: "/trees"
    },
    {
      name: "Thêm Cây Mới",
      description: "Trồng cây sầu riêng mới", 
      icon: PlusIcon,
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      name: "Chụp Ảnh",
      description: "Chụp ảnh kiểm tra cây",
      icon: CameraIcon, 
      color: "bg-purple-600 hover:bg-purple-700"
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
        Thao Tác Chính
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actions.map((action, index) => {
          const ActionComponent = action.href ? 'a' : 'button'
          return (
            <ActionComponent
              key={index}
              href={action.href}
              className={`${action.color} text-white p-6 rounded-xl text-center transition-all duration-200 transform active:scale-95 hover:scale-105 shadow-md hover:shadow-lg touch-manipulation select-none block`}
              style={{ 
                minHeight: '120px', 
                minWidth: '44px',
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none'
              }}
            >
              <div className="flex justify-center mb-4">
                <action.icon className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{action.name}</h3>
              <p className="text-sm opacity-90">{action.description}</p>
            </ActionComponent>
          )
        })}
      </div>
    </div>
  )
}

function AttentionList({ trees }: { trees: Tree[] }) {

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="bg-red-100 p-3 rounded-full mr-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cây Cần Chú Ý</h2>
          <p className="text-sm text-gray-600">
            {trees.length} cây cần được kiểm tra
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {trees.map((tree) => (
          <div
            key={tree.id}
            className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 active:bg-red-200 transition-colors duration-200 cursor-pointer touch-manipulation select-none"
            style={{ 
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {tree.name || `Cây ${tree.qrCode}`}
                </h3>
                <p className="text-sm text-gray-600">
                  {tree.variety} • Khu vực {tree.zoneCode}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Tình trạng: {tree.healthStatus} - Cần kiểm tra
                </p>
              </div>
              <div className="text-red-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user, loading, currentFarm, setCurrentFarm, isAdmin } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalTrees: 0,
    healthyTrees: 0,
    treesNeedingAttention: 0,
    totalFruits: 0,
    gpsCoverage: 0,
    zonesCount: 0
  })
  const [attentionTrees, setAttentionTrees] = useState<Tree[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!user || !currentFarm) {
      // Show empty state when not authenticated or no farm selected
      setStats({
        totalTrees: 0,
        healthyTrees: 0,
        treesNeedingAttention: 0,
        totalFruits: 0,
        gpsCoverage: 0,
        zonesCount: 0
      })
      setAttentionTrees([])
      setDataLoading(false)
      return
    }

    setDataLoading(true)
    
    // Subscribe to real-time tree updates for the current farm
    const unsubscribeTrees = subscribeToTrees(currentFarm.id, user.uid, (updatedTrees) => {
      console.log('📊 Dashboard received trees:', updatedTrees.length)
      
      // Show real data or zeros if no trees loaded
      setStats(calculateDashboardStats(updatedTrees))
      setAttentionTrees(getTreesNeedingAttention(updatedTrees))
      setDataLoading(false)
    })
    
    return unsubscribeTrees
  }, [user, currentFarm])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-2 sm:p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  const handleFarmChange = (farmId: string, farm: Farm) => {
    // Cast Farm to EnhancedFarm for backward compatibility
    setCurrentFarm(farm as any)
  }

  const farmerName = user?.displayName || user?.email?.split('@')[0] || "Demo User"
  const isDemo = !user

  // Show mobile dashboard on mobile devices
  if (isMobile && user) {
    return <MobileDashboard />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-between items-start mb-4">
            <div></div>
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Nông Trại Sầu Riêng
              </h1>
              <p className="text-lg text-gray-600">
                Chào {farmerName}! Chúc ngày mới tốt lành 🌱
              </p>
            </div>
            {/* Login/Logout Controls */}
            <div className="flex space-x-2">
              {isDemo ? (
                <a
                  href="/login"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Đăng Nhập
                </a>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await signOutUser()
                    } catch (error) {
                      console.error('Logout error:', error)
                    }
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Đăng Xuất
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-3 inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">
              {isDemo ? "Demo Mode" : isAdmin ? "Admin Mode - Full Access" : dataLoading ? "Đang tải dữ liệu..." : "Đồng Bộ Thời Gian Thực"}
            </span>
          </div>
          
          {/* Current Farm Display */}
          {!isDemo && currentFarm && (
            <div className="mt-2 text-sm text-gray-600">
              Nông trại: <span className="font-medium text-gray-900">{currentFarm.name}</span>
            </div>
          )}
        </div>

        {/* Demo Banner */}
        {isDemo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  🚀 Chế độ Demo
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Đăng nhập để xem dữ liệu thực tế từ ứng dụng iOS của bạn và quản lý nhiều nông trại.
                  </p>
                  <div className="mt-3">
                    <a
                      href="/login"
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      Đăng Nhập Ngay →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Banner */}
        {!isDemo && <AdminBanner />}

        {/* Migration Prompt (when authenticated) */}
        {!isDemo && <MigrationPrompt />}

        {/* Farm Selection (when authenticated) */}
        {!isDemo && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <FarmSelector 
              selectedFarmId={currentFarm?.id}
              onFarmChange={handleFarmChange}
            />
          </div>
        )}

        {/* Admin Dashboard (when admin) */}
        {!isDemo && isAdmin && <AdminDashboard />}

        {/* User Info (when authenticated) */}
        {!isDemo && <UserInfo />}

        {/* Main Content */}
        <FarmStats stats={stats} />
        <QuickActions />
        <AttentionList trees={attentionTrees} />
        
        {/* Footer */}
        <div className="text-center text-gray-500 text-sm pt-8">
          Được thiết kế đặc biệt cho nông dân Việt Nam 🇻🇳
        </div>
      </div>
    </div>
  )
}
