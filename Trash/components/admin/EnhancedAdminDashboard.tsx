'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { AdminService } from '@/lib/admin-service'
import { AnalyticsService } from '@/lib/analytics-service'
import { SystemMonitoringService } from '@/lib/system-monitoring-service'
import {
  ChartBarIcon,
  UsersIcon,
  BuildingOfficeIcon,
  MapIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  pendingRegistrations: number
  totalOrganizations: number
  totalFarms: number
  totalTrees: number
  totalPhotos: number
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical'
  lastUpdated: Date
}

interface ActivityItem {
  id: string
  type: 'user_created' | 'farm_created' | 'organization_created' | 'system_alert'
  message: string
  timestamp: Date
  severity: 'info' | 'warning' | 'error' | 'success'
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: any
  color: string
  action: () => void
}

export default function EnhancedAdminDashboard() {
  const { user } = useSimpleAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingRegistrations: 0,
    totalOrganizations: 0,
    totalFarms: 0,
    totalTrees: 0,
    totalPhotos: 0,
    systemHealth: 'good',
    lastUpdated: new Date()
  })
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load real data from Firebase services
      const [
        users,
        farms,
        trees,
        photos,
        analyticsData,
        systemHealth
      ] = await Promise.all([
        AdminService.getAllUsers(),
        AdminService.getAllFarms(),
        AdminService.getAllTrees(),
        AdminService.getAllPhotos(),
        AnalyticsService.getAnalyticsData(),
        SystemMonitoringService.getSystemHealth()
      ])

      // Calculate active users (logged in within last 30 days)
      const activeUsers = users.filter(user => {
        if (!user.lastLoginAt) return false
        const daysSinceLogin = (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceLogin <= 30
      }).length

      // Calculate pending registrations (users with unverified emails)
      const pendingRegistrations = users.filter(user => !user.isEmailVerified).length

      // Map system health
      const healthMapping = {
        'healthy': 'excellent' as const,
        'warning': 'warning' as const,
        'critical': 'critical' as const
      }

      setStats({
        totalUsers: users.length,
        activeUsers,
        pendingRegistrations,
        totalOrganizations: 0, // This would come from organization service if implemented
        totalFarms: farms.length,
        totalTrees: trees.length,
        totalPhotos: photos.length,
        systemHealth: healthMapping[systemHealth.overall] || 'good',
        lastUpdated: new Date()
      })

      // Generate recent activities from real data
      const recentActivities: ActivityItem[] = []

      // Add recent user registrations
      const recentUsers = users
        .filter(user => {
          const daysSinceCreation = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          return daysSinceCreation <= 7 // Last 7 days
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 3)

      recentUsers.forEach((user, index) => {
        recentActivities.push({
          id: `user_${index}`,
          type: 'user_created',
          message: `New user registered: ${user.email}`,
          timestamp: user.createdAt,
          severity: 'success'
        })
      })

      // Add recent farm creations
      const recentFarms = farms
        .filter(farm => {
          const daysSinceCreation = (Date.now() - farm.createdDate.getTime()) / (1000 * 60 * 60 * 24)
          return daysSinceCreation <= 7 // Last 7 days
        })
        .sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime())
        .slice(0, 2)

      recentFarms.forEach((farm, index) => {
        recentActivities.push({
          id: `farm_${index}`,
          type: 'farm_created',
          message: `New farm created: ${farm.name}`,
          timestamp: farm.createdDate,
          severity: 'info'
        })
      })

      // Add system alerts
      systemHealth.alerts.forEach((alert, index) => {
        if (!alert.resolved && index < 2) { // Show up to 2 unresolved alerts
          recentActivities.push({
            id: `alert_${index}`,
            type: 'system_alert',
            message: alert.message,
            timestamp: alert.timestamp,
            severity: alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'
          })
        }
      })

      // Sort activities by timestamp and take the most recent ones
      recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setActivities(recentActivities.slice(0, 6))

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Set fallback data on error
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        pendingRegistrations: 0,
        totalOrganizations: 0,
        totalFarms: 0,
        totalTrees: 0,
        totalPhotos: 0,
        systemHealth: 'warning',
        lastUpdated: new Date()
      })
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const quickActions: QuickAction[] = [
    {
      id: 'create-user',
      title: 'Create User',
      description: 'Add a new user to the system',
      icon: UsersIcon,
      color: 'bg-blue-500',
      action: () => console.log('Create user')
    },
    {
      id: 'create-organization',
      title: 'New Organization',
      description: 'Set up a new organization',
      icon: BuildingOfficeIcon,
      color: 'bg-purple-500',
      action: () => console.log('Create organization')
    },
    {
      id: 'system-health',
      title: 'System Health',
      description: 'Check system status',
      icon: ChartBarIcon,
      color: 'bg-green-500',
      action: () => console.log('System health')
    },
    {
      id: 'view-logs',
      title: 'View Logs',
      description: 'Access system logs',
      icon: EyeIcon,
      color: 'bg-gray-500',
      action: () => console.log('View logs')
    }
  ]

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_created': return UsersIcon
      case 'farm_created': return MapIcon
      case 'organization_created': return BuildingOfficeIcon
      case 'system_alert': return ExclamationTriangleIcon
      default: return CheckCircleIcon
    }
  }

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'info': return 'text-blue-600 bg-blue-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.displayName || user?.email}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboardData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <div className="text-sm text-gray-500">
            Last updated: {stats.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* System Health Alert */}
      <div className={`p-4 rounded-lg border ${getHealthColor(stats.systemHealth)}`}>
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          <span className="font-medium">System Status: {stats.systemHealth.toUpperCase()}</span>
          <span className="ml-auto text-sm">All services operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+12%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">{Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of total users</span>
          </div>
        </div>

        {/* Pending Registrations */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Registrations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingRegistrations}</p>
            </div>
          </div>
          <div className="mt-4">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              Review pending →
            </button>
          </div>
        </div>

        {/* Organizations */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Organizations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalOrganizations}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+2</span>
            <span className="text-gray-500 ml-1">this month</span>
          </div>
        </div>

        {/* Farms */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Farms</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalFarms}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Avg {Math.round(stats.totalTrees / stats.totalFarms)} trees per farm</span>
          </div>
        </div>

        {/* Trees */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Trees</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTrees.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+156</span>
            <span className="text-gray-500 ml-1">this week</span>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <PhotoIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Photos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalPhotos.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">~{Math.round(stats.totalPhotos / stats.totalTrees)} per tree</span>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Storage Usage</p>
              <p className="text-2xl font-semibold text-gray-900">85%</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">2.1 TB of 2.5 TB used</p>
          </div>
        </div>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className={`inline-flex p-2 rounded-lg ${action.color} mb-3`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-medium text-gray-900">{action.title}</h4>
                <p className="text-sm text-gray-500">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {activities.map((activity) => {
              const IconComponent = getActivityIcon(activity.type)
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 p-1 rounded-full ${getActivityColor(activity.severity)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              View all activity →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}