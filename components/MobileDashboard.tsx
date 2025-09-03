'use client'

import React, { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { MobileStatsCard, MobileActionButton } from './MobileCards'
import MobileLayout from './MobileLayout'
import { 
  ViewfinderCircleIcon,
  CameraIcon,
  MapIcon,
  ChartBarIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  BellIcon,
  CloudArrowUpIcon,
  WifiIcon,
  SignalIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalTrees: number
  healthyTrees: number
  treesNeedingAttention: number
  totalPhotos: number
  todayPhotos: number
  pendingTasks: number
  activeZones: number
  offlineData: number
}

interface RecentActivity {
  id: string
  type: 'photo' | 'tree_update' | 'health_alert' | 'task_completed'
  message: string
  timestamp: Date
  urgent?: boolean
}

interface WeatherInfo {
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  isGoodForFieldWork: boolean
}

export default function MobileDashboard() {
  const { user, currentFarm, hasPermission } = useEnhancedAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalTrees: 0,
    healthyTrees: 0,
    treesNeedingAttention: 0,
    totalPhotos: 0,
    todayPhotos: 0,
    pendingTasks: 0,
    activeZones: 0,
    offlineData: 0
  })
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
    loadRecentActivity()
    loadWeatherData()
  }, [currentFarm])

  // Monitor connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const loadDashboardData = async () => {
    if (!currentFarm) return

    try {
      // Mock data - replace with actual API calls
      setStats({
        totalTrees: 1247,
        healthyTrees: 1156,
        treesNeedingAttention: 23,
        totalPhotos: 3456,
        todayPhotos: 12,
        pendingTasks: 5,
        activeZones: 8,
        offlineData: isOnline ? 0 : 3
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const loadRecentActivity = async () => {
    try {
      // Load real activity data from API - no mock data
      // TODO: Implement actual API call to get recent activity
      setRecentActivity([])
    } catch (error) {
      console.error('Error loading recent activity:', error)
      setRecentActivity([])
    }
  }

  const loadWeatherData = async () => {
    try {
      // Load real weather data from API - no mock data
      // TODO: Implement actual weather API call
      setWeather(null)
    } catch (error) {
      console.error('Error loading weather data:', error)
      setWeather(null)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    })
  }

  const formatRelativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (minutes < 1) return 'Vừa xong'
    if (minutes < 60) return `${minutes} phút trước`
    if (hours < 24) return `${hours} giờ trước`
    return date.toLocaleDateString('vi-VN')
  }

  return (
    <MobileLayout currentTab="dashboard">
      <div className="p-4 space-y-6 pb-20">
        {/* Time and Weather Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {formatTime(currentTime)}
              </h2>
              <p className="text-sm text-gray-600">
                {currentTime.toLocaleDateString('vi-VN', { 
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long' 
                })}
              </p>
            </div>
            
            {weather && (
              <div className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {weather.temperature}°C
                  </span>
                  <div className={`w-3 h-3 rounded-full ${weather.isGoodForFieldWork ? 'bg-green-500' : 'bg-yellow-500'}`} />
                </div>
                <p className="text-sm text-gray-600">{weather.condition}</p>
                <p className="text-xs text-gray-500">
                  Độ ẩm {weather.humidity}% • Gió {weather.windSpeed}km/h
                </p>
              </div>
            )}
          </div>
          
          {weather && !weather.isGoodForFieldWork && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Điều kiện thời tiết không thuận lợi cho công việc ngoài trời
              </p>
            </div>
          )}
        </div>

        {/* Connection Status */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <WifiIcon className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Chế độ ngoại tuyến</p>
                <p className="text-sm text-amber-700">
                  {stats.offlineData > 0 && `${stats.offlineData} dữ liệu chờ đồng bộ`}
                </p>
              </div>
              {stats.offlineData > 0 && (
                <button className="ml-auto bg-amber-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                  Đồng bộ
                </button>
              )}
            </div>
          </div>
        )}

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MobileStatsCard
            title="Tổng số cây"
            value={stats.totalTrees}
            subtitle="Đang quản lý"
            icon={ViewfinderCircleIcon}
            color="green"
            onClick={() => window.location.href = '/trees'}
          />
          
          <MobileStatsCard
            title="Cây khỏe mạnh"
            value={stats.healthyTrees}
            subtitle={`${Math.round((stats.healthyTrees / stats.totalTrees) * 100)}%`}
            icon={SignalIcon}
            color="green"
            trend={{ value: 2.5, isPositive: true }}
          />
          
          <MobileStatsCard
            title="Cần chú ý"
            value={stats.treesNeedingAttention}
            subtitle="Cây có vấn đề"
            icon={ExclamationTriangleIcon}
            color="red"
            onClick={() => window.location.href = '/trees?filter=attention'}
          />
          
          <MobileStatsCard
            title="Ảnh hôm nay"
            value={stats.todayPhotos}
            subtitle={`Tổng ${stats.totalPhotos}`}
            icon={CameraIcon}
            color="blue"
            onClick={() => window.location.href = '/photos'}
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Hành động nhanh</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <MobileActionButton
              title="Chụp ảnh cây"
              subtitle="Ghi lại tình trạng cây trồng"
              icon={CameraIcon}
              onClick={() => window.location.href = '/camera'}
              color="green"
            />
            
            <MobileActionButton
              title="Thêm cây mới"
              subtitle="Đăng ký cây trồng vào hệ thống"
              icon={PlusIcon}
              onClick={() => window.location.href = '/trees/new'}
              color="blue"
              disabled={!hasPermission('trees:create' as any)}
            />
            
            <MobileActionButton
              title="Xem bản đồ"
              subtitle="Vị trí các cây và khu vực"
              icon={MapIcon}
              onClick={() => window.location.href = '/map'}
              color="yellow"
            />
          </div>
        </div>

        {/* Alerts and Tasks */}
        {stats.treesNeedingAttention > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900">
                  {stats.treesNeedingAttention} cây cần chú ý
                </h4>
                <p className="text-sm text-red-700">
                  Có dấu hiệu bệnh tật hoặc suy dinh dưỡng
                </p>
              </div>
              <button 
                onClick={() => window.location.href = '/trees?filter=attention'}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
              >
                Xem
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h3>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {recentActivity.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentActivity.map((activity, index) => (
                  <div key={activity.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full flex-shrink-0 ${
                        activity.urgent ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {activity.type === 'photo' && <CameraIcon className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'health_alert' && <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />}
                        {activity.type === 'task_completed' && <SignalIcon className="h-4 w-4 text-green-600" />}
                        {activity.type === 'tree_update' && <ViewfinderCircleIcon className="h-4 w-4 text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${activity.urgent ? 'font-medium text-red-900' : 'text-gray-900'}`}>
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <BellIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Chưa có hoạt động nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Farm Info Summary */}
        {currentFarm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">Thông tin trang trại</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Tên trang trại</p>
                <p className="font-medium text-gray-900">{currentFarm.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Khu vực hoạt động</p>
                <p className="font-medium text-gray-900">{stats.activeZones} khu</p>
              </div>
              <div>
                <p className="text-gray-500">Trạng thái</p>
                <p className="font-medium text-green-600">Hoạt động</p>
              </div>
              <div>
                <p className="text-gray-500">Nhiệm vụ</p>
                <p className="font-medium text-gray-900">{stats.pendingTasks} chờ xử lý</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}