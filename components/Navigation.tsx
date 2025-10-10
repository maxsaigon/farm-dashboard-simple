'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import FarmSelectorModal from './FarmSelectorModal'
import { 
  HomeIcon,
  MapIcon,
  CameraIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ViewfinderCircleIcon,
  RadioIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

export function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showFarmSelector, setShowFarmSelector] = useState(false)
  const { user, signOut, isAdmin, loading, farms, currentFarm } = useSimpleAuth()

  const navigation = [
    {
      name: 'Bản Đồ',
      description: 'Xem vị trí cây trồng',
      href: '/map',
      icon: MapIcon,
      emoji: '🗺️'
    },
    {
      name: 'Khu Vực',
      description: 'Quản lý khu vực nông trại',
      href: '/zones',
      icon: ViewfinderCircleIcon,
      emoji: '📍'
    },
    {
      name: 'Tiền bạc',
      description: 'Theo dõi chi phí và đầu tư',
      href: '/money',
      icon: CurrencyDollarIcon,
      emoji: '💰'
    }
  ]

  // Add Super Admin navigation if user is super admin
  const allNavigation = isAdmin() 
    ? [
        ...navigation,
        {
          name: 'Super Admin',
          description: 'Quản lý hệ thống',
          href: '/admin',
          icon: ShieldCheckIcon,
          emoji: '⚙️'
        }
      ]
    : navigation

  return (
    <>
      {/* Farm Selector Modal */}
      <FarmSelectorModal 
        isOpen={showFarmSelector} 
        onClose={() => setShowFarmSelector(false)} 
      />
      
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-green-600">🌱 Nông Trại Sầu Riêng</span>
              </Link>
            </div>

            <div className="flex items-center space-x-8">
              {/* Farm Selector - Desktop */}
              {user && farms.length > 1 && (
                <button
                  onClick={() => setShowFarmSelector(true)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                >
                  <MapIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{currentFarm?.name || 'Chọn nông trại'}</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}

              {allNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              
              {/* Authentication Section */}
              <div className="flex items-center space-x-4 border-l border-gray-200 pl-6">
                {loading ? (
                  <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                ) : user ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {user.displayName || user.email}
                      </span>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span>Đăng nhập</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation with Auth Menu */}
      <nav className="lg:hidden">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl">🌱</span>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-green-700">Nông Trại</span>
                  <span className="text-xs text-gray-500">{currentFarm?.name || 'Sầu Riêng'}</span>
                </div>
              </Link>
              
              {/* Farm Selector - Mobile */}
              {user && farms.length > 1 && (
                <button
                  onClick={() => setShowFarmSelector(true)}
                  className="flex items-center space-x-1 px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                >
                  <span className="text-xs font-medium">Đổi</span>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-3 rounded-xl text-gray-600 hover:text-gray-800 hover:bg-gray-100 min-touch transition-colors active:scale-95"
              data-testid="mobile-menu"
              aria-label="Menu chính"
              style={{
                minWidth: '52px',
                minHeight: '52px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-7 w-7" />
              ) : (
                <Bars3Icon className="h-7 w-7" />
              )}
            </button>
          </div>

          {/* Mobile Menu - Enhanced for Farmers */}
          {isMobileMenuOpen && (
            <div className="pb-6 space-y-3 border-t border-gray-200 mt-2">
              <div className="pt-4">
                <p className="text-sm text-gray-500 px-3 pb-3 font-medium">CHỌN TRANG</p>
                {allNavigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-4 px-4 py-4 mx-2 rounded-xl text-base font-semibold transition-all min-touch active:scale-98 ${
                        isActive
                          ? 'text-green-700 bg-green-100 shadow-sm border border-green-200'
                          : 'text-gray-700 hover:text-green-700 hover:bg-green-50 active:bg-green-100'
                      }`}
                      style={{
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm">
                        <span className="text-2xl">{(item as any).emoji}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-bold">{item.name}</div>
                        <div className="text-sm text-gray-600">{(item as any).description}</div>
                      </div>
                      {isActive && (
                        <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      )}
                    </Link>
                  )
                })}
              </div>
              
              {/* Authentication Section for Mobile */}
              <div className="pt-4 border-t border-gray-100 mx-2">
                <p className="text-sm text-gray-500 px-3 pb-3 font-medium">TÀI KHOẢN</p>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                  </div>
                ) : user ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 px-4 py-3 bg-green-50 rounded-xl">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-green-900">
                          {user.displayName || 'Người dùng'}
                        </div>
                        <div className="text-sm text-green-700">{user.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        signOut()
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-4 bg-red-50 text-red-700 rounded-xl font-medium hover:bg-red-100 active:bg-red-200 transition-colors min-touch"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <ArrowRightOnRectangleIcon className="h-6 w-6" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center space-x-3 px-4 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:bg-green-800 transition-colors min-touch"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <UserIcon className="h-6 w-6" />
                    <span>Đăng nhập</span>
                  </Link>
                )}
              </div>

              {/* Quick Actions Section for Farmers */}
              <div className="pt-4 border-t border-gray-100 mx-2">
                <p className="text-sm text-gray-500 px-3 pb-3 font-medium">THAO TÁC NHANH</p>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      window.location.href = '/map'
                    }}
                    className="flex flex-col items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 active:bg-green-200 transition-colors min-touch"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span className="text-2xl mb-2">🌳</span>
                    <span className="text-sm font-medium text-green-800">Xem Cây</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      window.location.href = '/zones'
                    }}
                    className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 active:bg-blue-200 transition-colors min-touch"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span className="text-2xl mb-2">📍</span>
                    <span className="text-sm font-medium text-blue-800">Xem Khu</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}