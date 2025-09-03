'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { 
  HomeIcon,
  CameraIcon,
  MapIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BeakerIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { 
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/solid'

interface TreeStats {
  total: number
  healthy: number
  needsAttention: number
  young: number
  mature: number
  diseased: number
}

interface FarmActivity {
  id: string
  type: 'tree_added' | 'photo_uploaded' | 'investment_added' | 'tree_updated'
  description: string
  timestamp: Date
  userId: string
  userName: string
}

interface QuickStats {
  totalTrees: number
  totalPhotos: number
  totalInvestment: number
  thisMonthInvestment: number
  activeFarms: number
  teamMembers: number
}

export default function EnhancedDashboard() {
  const { user, hasPermission, currentFarm } = useEnhancedAuth()
  const [treeStats, setTreeStats] = useState<TreeStats>({
    total: 0,
    healthy: 0,
    needsAttention: 0,
    young: 0,
    mature: 0,
    diseased: 0
  })
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalTrees: 0,
    totalPhotos: 0,
    totalInvestment: 0,
    thisMonthInvestment: 0,
    activeFarms: 1,
    teamMembers: 1
  })
  const [recentActivity, setRecentActivity] = useState<FarmActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [currentFarm])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadTreeStats(),
        loadQuickStats(),
        loadRecentActivity()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTreeStats = async () => {
    // Load tree statistics from Firebase
    // This would query the trees collection and aggregate data
    setTreeStats({
      total: 125,
      healthy: 98,
      needsAttention: 12,
      young: 45,
      mature: 65,
      diseased: 15
    })
  }

  const loadQuickStats = async () => {
    // Load quick statistics from Firebase
    setQuickStats({
      totalTrees: 125,
      totalPhotos: 456,
      totalInvestment: 45000000,
      thisMonthInvestment: 2500000,
      activeFarms: 2,
      teamMembers: 5
    })
  }

  const loadRecentActivity = async () => {
    // Load recent activity from Firebase
    setRecentActivity([
      {
        id: '1',
        type: 'tree_added',
        description: 'Thêm cây mới vào vùng A-12',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        userId: 'user1',
        userName: 'Nguyễn Văn A'
      },
      {
        id: '2',
        type: 'photo_uploaded',
        description: 'Tải ảnh cho cây DUR-001',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        userId: 'user2',
        userName: 'Trần Thị B'
      },
      {
        id: '3',
        type: 'investment_added',
        description: 'Thêm chi phí phân bón',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        userId: 'user1',
        userName: 'Nguyễn Văn A'
      }
    ])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tree_added': return <BeakerIcon className="h-4 w-4 text-green-600" />
      case 'photo_uploaded': return <PhotoIcon className="h-4 w-4 text-blue-600" />
      case 'investment_added': return <CurrencyDollarIcon className="h-4 w-4 text-yellow-600" />
      case 'tree_updated': return <PlusIcon className="h-4 w-4 text-purple-600" />
      default: return <ClockIcon className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Đang tải bảng điều khiển...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Farm Info and Time */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">
              {currentFarm?.name || 'Trang trại của tôi'}
            </h1>
            <p className="text-green-100 mt-1">
              Chào mừng trở lại, {user?.displayName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-100">
              {currentTime.toLocaleDateString('vi-VN', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-lg font-semibold">
              {currentTime.toLocaleTimeString('vi-VN')}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickActionCard
          title="Thêm cây mới"
          icon={<PlusIcon className="h-6 w-6" />}
          color="bg-green-500"
          href="/trees/add"
          permission="trees:write"
        />
        <QuickActionCard
          title="Chụp ảnh"
          icon={<CameraIcon className="h-6 w-6" />}
          color="bg-blue-500"
          href="/photos/capture"
          permission="photos:write"
        />
        <QuickActionCard
          title="Xem bản đồ"
          icon={<MapIcon className="h-6 w-6" />}
          color="bg-purple-500"
          href="/map"
          permission="trees:read"
        />
        <QuickActionCard
          title="Báo cáo"
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="bg-orange-500"
          href="/reports"
          permission="analytics:view"
        />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Tổng số cây"
          value={quickStats.totalTrees.toString()}
          icon={<BeakerIcon className="h-8 w-8 text-green-600" />}
          change="+5 tuần này"
          changeType="positive"
        />
        <StatsCard
          title="Hình ảnh"
          value={quickStats.totalPhotos.toString()}
          icon={<PhotoIcon className="h-8 w-8 text-blue-600" />}
          change="+23 hôm nay"
          changeType="positive"
        />
        <StatsCard
          title="Đầu tư tháng này"
          value={formatCurrency(quickStats.thisMonthInvestment)}
          icon={<CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />}
          change="+15% so với tháng trước"
          changeType="positive"
        />
        <StatsCard
          title="Thành viên"
          value={quickStats.teamMembers.toString()}
          icon={<HomeIcon className="h-8 w-8 text-purple-600" />}
          change="Đang hoạt động"
          changeType="neutral"
        />
      </div>

      {/* Tree Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tình trạng cây trồng</h3>
            <BeakerIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">Khỏe mạnh</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900">{treeStats.healthy}</span>
                <span className="text-sm text-gray-500 ml-1">
                  ({Math.round((treeStats.healthy / treeStats.total) * 100)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-600">Cần chú ý</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900">{treeStats.needsAttention}</span>
                <span className="text-sm text-gray-500 ml-1">
                  ({Math.round((treeStats.needsAttention / treeStats.total) * 100)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm text-gray-600">Bệnh/sâu hại</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900">{treeStats.diseased}</span>
                <span className="text-sm text-gray-500 ml-1">
                  ({Math.round((treeStats.diseased / treeStats.total) * 100)}%)
                </span>
              </div>
            </div>
          </div>
          {treeStats.needsAttention > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-800">
                  {treeStats.needsAttention} cây cần được kiểm tra
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h3>
            <ClockIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">Chưa có hoạt động nào</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {activity.userName} • {activity.timestamp.toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4">
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Xem tất cả hoạt động →
            </button>
          </div>
        </div>
      </div>

      {/* Weather and Environmental Data */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin môi trường</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">28°C</div>
            <div className="text-sm text-gray-600">Nhiệt độ</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">75%</div>
            <div className="text-sm text-gray-600">Độ ẩm</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">5mm</div>
            <div className="text-sm text-gray-600">Lượng mưa hôm nay</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick Action Card Component
function QuickActionCard({ 
  title, 
  icon, 
  color, 
  href, 
  permission 
}: { 
  title: string
  icon: React.ReactNode
  color: string
  href: string
  permission?: string
}) {
  const { hasPermission } = useEnhancedAuth()

  if (permission && !hasPermission(permission as any)) {
    return null
  }

  return (
    <a
      href={href}
      className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
    >
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${color} text-white`}>
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
      </div>
    </a>
  )
}

// Stats Card Component
function StatsCard({ 
  title, 
  value, 
  icon, 
  change, 
  changeType 
}: { 
  title: string
  value: string
  icon: React.ReactNode
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
}) {
  const changeColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  }[changeType]

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="flex-shrink-0">
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <span className={`text-sm ${changeColor}`}>{change}</span>
      </div>
    </div>
  )
}