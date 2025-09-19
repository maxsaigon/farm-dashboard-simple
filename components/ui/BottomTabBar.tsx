'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapIcon, ViewfinderCircleIcon, ViewfinderCircleIcon as ZoneIcon, UserIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { useCallback } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import type ReactType from 'react'

interface TabItem {
  id: string
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const TABS: TabItem[] = [
  { id: 'map', name: 'Bản đồ', href: '/map', icon: MapIcon },
  { id: 'zones', name: 'Khu', href: '/zones', icon: ZoneIcon },
  { id: 'money', name: 'Tiền', href: '/money', icon: CurrencyDollarIcon },
]

export default function BottomTabBar() {
  const pathname = usePathname()
  const { user, signOut } = useSimpleAuth()

  const haptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10)
      }
    } catch {}
  }, [])

  const handleUserAction = () => {
    haptic()
    if (user) {
      // Show user menu or sign out directly
      if (confirm(`Đăng xuất tài khoản ${user.displayName || user.email}?`)) {
        signOut()
      }
    } else {
      window.location.href = '/login'
    }
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] ios-blur border-t border-gray-200 pt-1 pb-[calc(env(safe-area-inset-bottom)+6px)]">
      <div className="flex justify-around px-2">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname?.startsWith(tab.href))
          const Icon = tab.icon
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={haptic}
              className={`flex flex-col items-center px-3 py-2 rounded-xl transition-colors ${
                isActive ? 'text-green-700' : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label={tab.name}
            >
              <span className={`p-2 rounded-lg ${isActive ? 'bg-green-50' : ''}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] mt-1 font-medium">{tab.name}</span>
            </Link>
          )
        })}
        
        {/* User Profile Tab */}
        <button
          onClick={handleUserAction}
          className={`flex flex-col items-center px-3 py-2 rounded-xl transition-colors ${
            user ? 'text-green-700' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-label={user ? 'Tài khoản' : 'Đăng nhập'}
        >
          <span className={`p-2 rounded-lg ${user ? 'bg-green-50' : ''} relative`}>
            <UserIcon className="h-5 w-5" />
            {user && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></span>
            )}
          </span>
          <span className="text-[11px] mt-1 font-medium">
            {user ? 'Tài khoản' : 'Đăng nhập'}
          </span>
        </button>
      </div>
    </nav>
  )
}
