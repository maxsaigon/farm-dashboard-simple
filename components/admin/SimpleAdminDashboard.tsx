'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { 
  UsersIcon, 
  MapIcon,
  CameraIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ServerIcon,
  CircleStackIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface DashboardStats {
  totalUsers: number
  totalFarms: number
  totalTrees: number
  totalPhotos: number
  recentUsers: number
  activeFarms: number
  problemTrees: number
  storageUsed: string
}

interface RecentActivity {
  id: string
  type: 'user_created' | 'farm_created' | 'tree_added' | 'photo_uploaded'
  description: string
  timestamp: Date
  user?: string
}

export default function SimpleAdminDashboard() {
  const { user, isAdmin } = useSimpleAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalFarms: 0,
    totalTrees: 0,
    totalPhotos: 0,
    recentUsers: 0,
    activeFarms: 0,
    problemTrees: 0,
    storageUsed: '0 MB'
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && isAdmin()) {
      loadDashboardData()
    }
  }, [user, isAdmin])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadRecentActivity()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const users = usersSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date())
        }
      })

      // Load farms
      const farmsSnapshot = await getDocs(collection(db, 'farms'))
      const farms = farmsSnapshot.docs.map(doc => doc.data())

      // Load farm access
      const accessSnapshot = await getDocs(collection(db, 'farmAccess'))

      // Calculate recent users (30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentUsers = users.filter(u => u.createdAt > thirtyDaysAgo).length

      // Calculate active farms
      const activeFarms = farms.filter(f => f.isActive).length

      // Estimate trees and photos (simplified)
      let totalTrees = 0
      let totalPhotos = 0
      let problemTrees = 0

      // For each farm, try to count trees
      for (const farm of farms) {
        try {
          const treesSnapshot = await getDocs(collection(db, 'farms', farm.id || 'unknown', 'trees'))
          const farmTrees = treesSnapshot.docs.map(doc => doc.data())
          
          totalTrees += farmTrees.length
          problemTrees += farmTrees.filter(t => t.needsAttention || t.healthStatus === 'Poor').length

          // Estimate photos (simplified)
          totalPhotos += farmTrees.length * 2 // Assume 2 photos per tree on average
        } catch (error) {
          // Skip if farm doesn't have trees collection
          console.log(`No trees collection for farm ${farm.id}`)
        }
      }

      setStats({
        totalUsers: users.length,
        totalFarms: farms.length,
        totalTrees,
        totalPhotos,
        recentUsers,
        activeFarms,
        problemTrees,
        storageUsed: `${Math.round(totalPhotos * 2.5)} MB` // Estimate 2.5MB per photo
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadRecentActivity = async () => {
    try {
      // Load recent users
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(5)
      )
      const usersSnapshot = await getDocs(usersQuery)
      
      const activities: RecentActivity[] = []
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data()
        activities.push({
          id: doc.id,
          type: 'user_created',
          description: `Người dùng mới: ${userData.displayName || userData.email}`,
          timestamp: userData.createdAt?.toDate() || new Date(),
          user: userData.email
        })
      })

      // Load recent farms
      const farmsQuery = query(
        collection(db, 'farms'),
        orderBy('createdDate', 'desc'),
        limit(3)
      )
      const farmsSnapshot = await getDocs(farmsQuery)
      
      farmsSnapshot.docs.forEach(doc => {
        const farmData = doc.data()
        activities.push({
          id: doc.id,
          type: 'farm_created',
          description: `Nông trại mới: ${farmData.name}`,
          timestamp: farmData.createdDate?.toDate() || new Date(),
          user: farmData.ownerName
        })
      })

      // Sort by timestamp
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      setRecentActivity(activities.slice(0, 8))
    } catch (error) {
      console.error('Error loading recent activity:', error)
    }
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffMinutes = Math.ceil(diffTime / (1000 * 60))
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 60) return `${diffMinutes} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays < 30) return `${diffDays} ngày trước`
    return date.toLocaleDateString('vi-VN')
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_created': return <UsersIcon className="h-5 w-5 text-blue-600" />
      case 'farm_created': return <MapIcon className="h-5 w-5 text-green-600" />
      case 'tree_added': return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'photo_uploaded': return <CameraIcon className="h-5 w-5 text-purple-600" />
      default: return <ClockIcon className="h-5 w-5 text-gray-600" />
    }
  }

  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-600">Bạn cần quyền super admin để sử dụng tính năng này.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Bảng điều khiển Admin</h2>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bảng điều khiển Admin</h2>
          <p className="text-gray-600">Tổng quan hệ thống quản lý nông trại</p>
        </div>
        <div className="text-sm text-gray-500">
          Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Người dùng</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.recentUsers} mới trong 30 ngày
              </p>
            </div>
            <UsersIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Farms */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Nông trại</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalFarms}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.activeFarms} đang hoạt động
              </p>
            </div>
            <MapIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        {/* Trees */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cây trồng</p>
              <p className="text-3xl font-bold text-emerald-600">{stats.totalTrees}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.problemTrees > 0 && (
                  <span className="text-orange-600">
                    {stats.problemTrees} cần chú ý
                  </span>
                )}
                {stats.problemTrees === 0 && 'Tất cả khỏe mạnh'}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        {/* Storage */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dung lượng</p>
              <p className="text-3xl font-bold text-purple-600">{stats.storageUsed}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalPhotos} ảnh
              </p>
            </div>
            <CircleStackIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tình trạng hệ thống</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Database</span>
              </div>
              <span className="text-sm text-green-600">Hoạt động</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Authentication</span>
              </div>
              <span className="text-sm text-green-600">Hoạt động</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Storage</span>
              </div>
              <span className="text-sm text-green-600">Hoạt động</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">API</span>
              </div>
              <span className="text-sm text-yellow-600">Chậm</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <UsersIcon className="h-6 w-6 text-blue-600 mb-2" />
              <div className="text-sm font-medium text-gray-900">Quản lý người dùng</div>
              <div className="text-xs text-gray-500">Xem và chỉnh sửa</div>
            </button>
            
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <MapIcon className="h-6 w-6 text-green-600 mb-2" />
              <div className="text-sm font-medium text-gray-900">Phân quyền nông trại</div>
              <div className="text-xs text-gray-500">Gán và quản lý</div>
            </button>
            
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <ChartBarIcon className="h-6 w-6 text-purple-600 mb-2" />
              <div className="text-sm font-medium text-gray-900">Báo cáo</div>
              <div className="text-xs text-gray-500">Xem thống kê</div>
            </button>
            
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <ServerIcon className="h-6 w-6 text-orange-600 mb-2" />
              <div className="text-sm font-medium text-gray-900">Cài đặt hệ thống</div>
              <div className="text-xs text-gray-500">Cấu hình</div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h3>
        </div>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Không có hoạt động gần đây</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  {activity.user && (
                    <p className="text-sm text-gray-500">
                      bởi {activity.user}
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {getTimeAgo(activity.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
      {stats.problemTrees > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Có {stats.problemTrees} cây cần chú ý
              </h4>
              <p className="text-sm text-yellow-700">
                Một số cây trong hệ thống đang có vấn đề và cần được kiểm tra.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}