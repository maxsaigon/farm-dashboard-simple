'use client'

import React, { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { 
  HomeIcon, 
  ViewfinderCircleIcon,
  ChartBarIcon,
  PhotoIcon,
  MapIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  BellIcon,
  RadioIcon
} from '@heroicons/react/24/outline'

interface MobileLayoutProps {
  children: React.ReactNode
  currentTab?: string
}

interface TabItem {
  id: string
  name: string
  icon: React.ElementType
  href: string
  badge?: number
}

export default function MobileLayout({ children, currentTab = 'dashboard' }: MobileLayoutProps) {
  const { user, currentFarm } = useSimpleAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  // Monitor online/offline status for field work
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const tabs: TabItem[] = [
    { id: 'dashboard', name: 'Tổng quan', icon: HomeIcon, href: '/' },
    { id: 'trees', name: 'Cây trồng', icon: ViewfinderCircleIcon, href: '/trees' },
    { id: 'map', name: 'Bản đồ', icon: MapIcon, href: '/map' },
    { id: 'positioning', name: 'Định vị', icon: RadioIcon, href: '/positioning' },
    { id: 'photos', name: 'Hình ảnh', icon: PhotoIcon, href: '/photos', badge: 3 },
    { id: 'analytics', name: 'Thống kê', icon: ChartBarIcon, href: '/analytics' },
    { id: 'settings', name: 'Cài đặt', icon: CogIcon, href: '/settings' }
  ]

  const currentTabData = tabs.find(tab => tab.id === currentTab)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Clean Title (hamburger menu removed for mobile-first design) */}
            <div className="flex items-center space-x-3">
              
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                  {currentTabData?.name || 'Farm Manager'}
                </h1>
                {currentFarm && (
                  <p className="text-sm text-gray-500 leading-tight">
                    {currentFarm.name}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Status + User */}
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              
              {/* Notifications */}
              <button className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation relative">
                <BellIcon className="h-5 w-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  2
                </span>
              </button>

              {/* User Avatar */}
              <button className="p-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation">
                <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.displayName?.charAt(0) || 'U'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Offline Banner */}
          {!isOnline && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center">
                <div className="h-4 w-4 bg-amber-500 rounded-full mr-2" />
                <span className="text-sm text-amber-800">
                  Chế độ ngoại tuyến - Dữ liệu sẽ đồng bộ khi có kết nối
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-80 bg-white shadow-xl transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="h-full flex flex-col">
            {/* User Profile Section */}
            <div className="p-4 bg-green-600 text-white">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-green-700 rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium">
                    {user?.displayName?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium truncate">{user?.displayName || 'User'}</h3>
                  <p className="text-sm text-green-100 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = tab.id === currentTab
                
                return (
                  <a
                    key={tab.id}
                    href={tab.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation relative
                      ${isActive 
                        ? 'bg-green-50 text-green-700 border-r-2 border-green-600' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="flex-1">{tab.name}</span>
                    {tab.badge && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        {tab.badge}
                      </span>
                    )}
                  </a>
                )
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Trạng thái:</span>
                  <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-amber-600'}`}>
                    {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Trang trại:</span>
                  <span className="font-medium text-gray-900 truncate max-w-32">
                    {currentFarm?.name || 'Chưa chọn'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          {tabs.slice(0, 5).map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === currentTab
            
            return (
              <a
                key={tab.id}
                href={tab.href}
                className={`
                  flex flex-col items-center py-2 px-3 rounded-lg transition-colors touch-manipulation relative
                  ${isActive ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1 font-medium">{tab.name}</span>
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}