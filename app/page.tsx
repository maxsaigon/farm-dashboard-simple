'use client'

import { useState, useEffect } from 'react'
import { 
  MapIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  PlusIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import { onAuthStateChange, signOutUser } from '../lib/auth'
import { subscribeToTrees, calculateDashboardStats, getTreesNeedingAttention } from '../lib/firestore'
import { Tree, DashboardStats } from '../lib/types'
import { User as FirebaseUser } from 'firebase/auth'
import UserInfo from '../components/UserInfo'

// Demo data fallback
const demoData = {
  farmer: "Demo User",
  stats: {
    totalTrees: 5,
    healthyTrees: 4, 
    treesNeedingAttention: 1,
    totalFruits: 83
  },
  treesNeedingAttention: [
    {
      id: "demo-1",
      name: "Cây Sầu Riêng 003",
      variety: "Kan Yao",
      zoneCode: "Z01_03", 
      healthStatus: "Fair" as const,
      needsAttention: true
    }
  ]
}

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
      name: "Thêm Cây Mới",
      description: "Trồng cây sầu riêng mới", 
      icon: PlusIcon,
      color: "bg-green-600 hover:bg-green-700"
    },
    {
      name: "Chụp Ảnh",
      description: "Chụp ảnh kiểm tra cây",
      icon: CameraIcon, 
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      name: "Xem Bản Đồ",
      description: "Tìm cây trên bản đồ",
      icon: MapIcon,
      color: "bg-purple-600 hover:bg-purple-700"
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
        Thao Tác Chính
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`${action.color} text-white p-6 rounded-xl text-center transition-all duration-200 transform active:scale-95 hover:scale-105 shadow-md hover:shadow-lg touch-manipulation select-none`}
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
          </button>
        ))}
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
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [trees, setTrees] = useState<Tree[]>([])
  const [stats, setStats] = useState<DashboardStats>(demoData.stats)
  const [attentionTrees, setAttentionTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      
      if (firebaseUser) {
        // Subscribe to real-time tree updates
        const unsubscribeTrees = subscribeToTrees(firebaseUser.uid, (updatedTrees) => {
          setTrees(updatedTrees)
          setStats(calculateDashboardStats(updatedTrees))
          setAttentionTrees(getTreesNeedingAttention(updatedTrees))
        })
        
        return () => unsubscribeTrees()
      } else {
        // Use demo data when not authenticated
        setTrees([])
        setStats(demoData.stats)
        setAttentionTrees(demoData.treesNeedingAttention as Tree[])
      }
    })

    return () => unsubscribeAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  const farmerName = user?.displayName || user?.email?.split('@')[0] || "Demo User"
  const isDemo = !user

  return (
    <div className="min-h-screen bg-gray-50 p-4">
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
              {isDemo ? "Demo Mode" : "Đồng Bộ Thời Gian Thực"}
            </span>
          </div>
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
                    Đăng nhập để xem dữ liệu thực tế từ ứng dụng iOS của bạn.
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
