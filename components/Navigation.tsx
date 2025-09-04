'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/enhanced-auth-context'
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
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isSuperAdmin } = useAuth()

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
    }
  ]

  // Add Super Admin navigation if user is super admin
  const allNavigation = isSuperAdmin() 
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
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Farmer-Friendly */}
      <nav className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 safe-top">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🌱</span>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-green-700">Nông Trại</span>
                <span className="text-xs text-gray-500">Sầu Riêng</span>
              </div>
            </Link>

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
              
              {/* Quick Actions Section for Farmers */}
              <div className="pt-4 border-t border-gray-100 mx-2">
                <p className="text-sm text-gray-500 px-3 pb-3 font-medium">THAO TÁC NHANH</p>
                <div className="grid grid-cols-2 gap-3">
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