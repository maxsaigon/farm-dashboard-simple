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
      name: 'Trang Chủ',
      href: '/',
      icon: HomeIcon
    },
    {
      name: 'Quản Lý Cây',
      href: '/trees',
      icon: ViewfinderCircleIcon
    },
    {
      name: 'Bản Đồ',
      href: '/map',
      icon: MapIcon
    },
    {
      name: 'Định Vị',
      href: '/positioning',
      icon: RadioIcon
    },
    {
      name: 'Chụp Ảnh',
      href: '/camera',
      icon: CameraIcon
    },
    {
      name: 'Thống Kê',
      href: '/statistics',
      icon: ChartBarIcon
    },
    {
      name: 'Cài Đặt',
      href: '/settings',
      icon: Cog6ToothIcon
    }
  ]

  // Add Super Admin navigation if user is super admin
  const allNavigation = isSuperAdmin() 
    ? [
        ...navigation,
        {
          name: 'Super Admin',
          href: '/admin',
          icon: ShieldCheckIcon
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

      {/* Mobile Navigation */}
      <nav className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <span className="text-lg font-bold text-green-600">🌱 Nông Trại</span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              data-testid="mobile-menu"
              aria-label="Mobile menu"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="pb-3 space-y-1 border-t border-gray-200">
              {allNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
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
          )}
        </div>
      </nav>
    </>
  )
}