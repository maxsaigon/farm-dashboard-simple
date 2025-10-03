'use client'

import { useState } from 'react'
import {
  HomeIcon, UsersIcon, BuildingOfficeIcon,
  ShieldCheckIcon, Cog6ToothIcon, Bars3Icon,
  XMarkIcon, BellIcon, UserCircleIcon
} from '@heroicons/react/24/outline'

type AdminSection = 'dashboard' | 'users' | 'farms' | 'roles' | 'settings'

interface MobileAdminLayoutProps {
  children: React.ReactNode
  currentSection: AdminSection
  onSectionChange: (section: AdminSection) => void
  isAdmin: boolean
}

const navigationItems: Array<{ id: AdminSection; name: string; icon: any; emoji: string }> = [
  { id: 'dashboard', name: 'Tổng quan', icon: HomeIcon, emoji: '📊' },
  { id: 'users', name: 'Người dùng', icon: UsersIcon, emoji: '👥' },
  { id: 'farms', name: 'Nông trại', icon: BuildingOfficeIcon, emoji: '🏭' },
  { id: 'roles', name: 'Phân quyền', icon: ShieldCheckIcon, emoji: '🛡️' },
  { id: 'settings', name: 'Cài đặt', icon: Cog6ToothIcon, emoji: '⚙️' }
]

export default function MobileAdminLayout({
  children,
  currentSection,
  onSectionChange,
  isAdmin
}: MobileAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="ml-3 text-lg font-semibold text-gray-900">
              Admin Panel
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <BellIcon className="h-6 w-6" />
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <UserCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b">
              <span className="text-lg font-semibold">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <nav className="p-4 space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id)
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                    currentSection === item.id
                      ? 'bg-green-100 text-green-700 border-2 border-green-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl mr-3">{item.emoji}</span>
                  <span className="font-medium">{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-4 pb-20">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-area-pb">
        <div className="grid grid-cols-5 h-16">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 ${
                currentSection === item.id
                  ? 'text-green-600'
                  : 'text-gray-600'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.name}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}