'use client'

import { useState, useEffect } from 'react'
import {
  UsersIcon, BuildingOfficeIcon, CheckCircleIcon, ClockIcon
} from '@heroicons/react/24/outline'
import { collection, query, getDocs, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface DashboardStats {
  totalUsers: number
  totalFarms: number
  activeUsers: number
  recentActivities: number
}

export default function AdminDashboardMobile() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalFarms: 0,
    activeUsers: 0,
    recentActivities: 0
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

      setStats({
        totalUsers,
        totalFarms,
        activeUsers,
        recentActivities
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-lg p-4 border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
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
        />
        <StatCard
          title="Tổng nông trại"
          value={stats.totalFarms}
          icon={BuildingOfficeIcon}
          color="bg-green-500"
        />
        <StatCard
          title="Tài khoản hoạt động"
          value={stats.activeUsers}
          icon={CheckCircleIcon}
          color="bg-purple-500"
        />
        <StatCard
          title="Hoạt động 7 ngày"
          value={stats.recentActivities}
          icon={ClockIcon}
          color="bg-orange-500"
        />
      </div>
    </div>
  )
}
