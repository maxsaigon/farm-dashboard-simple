'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon, UsersIcon, BuildingOfficeIcon,
  ArrowTrendingUpIcon, ClockIcon, CheckCircleIcon,
  ExclamationTriangleIcon, MapIcon
} from '@heroicons/react/24/outline'
import { collection, query, getDocs, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface DashboardStats {
  totalUsers: number
  totalFarms: number
  activeUsers: number
  totalTrees: number
  recentActivities: number
  systemAlerts: number
}

export default function AdminDashboardMobile() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalFarms: 0,
    activeUsers: 0,
    totalTrees: 0,
    recentActivities: 0,
    systemAlerts: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)

      // Load users stats
      const usersQuery = query(collection(db, 'users'))
      const usersSnapshot = await getDocs(usersQuery)
      const totalUsers = usersSnapshot.size
      const activeUsers = usersSnapshot.docs.filter(doc => {
        const data = doc.data()
        return data.accountStatus === 'active' || !data.accountStatus
      }).length

      // Load farms stats
      const farmsQuery = query(collection(db, 'farms'))
      const farmsSnapshot = await getDocs(farmsQuery)
      const totalFarms = farmsSnapshot.size

      // Load activity logs for recent activities
      const activitiesQuery = query(
        collection(db, 'activityLogs'),
        where('timestamp', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      )
      const activitiesSnapshot = await getDocs(activitiesQuery)
      const recentActivities = activitiesSnapshot.size

      // For demo purposes, set some mock values for trees and alerts
      // In real implementation, you would query actual tree data and system monitoring
      const totalTrees = 2847 // This would come from trees collection
      const systemAlerts = 0 // This would come from system monitoring

      setStats({
        totalUsers,
        totalFarms,
        activeUsers,
        totalTrees,
        recentActivities,
        systemAlerts
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white rounded-lg p-4 border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          {trend && (
            <div className="flex items-center mt-1">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+{trend}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h2>
          <p className="text-gray-600">Theo dõi hoạt động và thống kê</p>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải thống kê...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h2>
        <p className="text-gray-600">Theo dõi hoạt động và thống kê</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Tổng người dùng"
          value={stats.totalUsers}
          icon={UsersIcon}
          color="bg-blue-500"
          trend={12}
        />
        <StatCard
          title="Tổng nông trại"
          value={stats.totalFarms}
          icon={BuildingOfficeIcon}
          color="bg-green-500"
          trend={8}
        />
        <StatCard
          title="Đang hoạt động"
          value={stats.activeUsers}
          icon={CheckCircleIcon}
          color="bg-purple-500"
        />
        <StatCard
          title="Tổng cây"
          value={stats.totalTrees}
          icon={MapIcon}
          color="bg-orange-500"
          trend={15}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="p-4 bg-blue-50 text-blue-700 rounded-lg">
          <UsersIcon className="h-6 w-6 mx-auto mb-2" />
          Quản lý người dùng
        </button>
        <button className="p-4 bg-green-50 text-green-700 rounded-lg">
          <BuildingOfficeIcon className="h-6 w-6 mx-auto mb-2" />
          Quản lý nông trại
        </button>
      </div>

      {/* System Alerts */}
      {stats.systemAlerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-800 font-medium">
              {stats.systemAlerts} cảnh báo hệ thống cần chú ý
            </span>
          </div>
        </div>
      )}
    </div>
  )
}