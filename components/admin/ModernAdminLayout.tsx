'use client'

import { useState, ReactNode } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { useRouter } from 'next/navigation'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  MapIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  PhotoIcon,
  CameraIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  EnvelopeIcon,
  UserPlusIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'

type AdminView = 'dashboard' | 'farms' | 'trees' | 'photos' | 'zones' | 'users' | 'user-management' | 'farm-assignments' | 'bulk-operations' | 'invitations' | 'registrations' | 'organizations' | 'business-rules' | 'system-config' | 'analytics' | 'audit' | 'monitoring' | 'settings'

interface ModernAdminLayoutProps {
  children: ReactNode
  currentView: AdminView
  onViewChange: (view: AdminView) => void
}

interface NavigationItem {
  id: string
  name: string
  icon: any
  badge?: number
  children?: NavigationItem[]
}

export default function ModernAdminLayout({ children, currentView, onViewChange }: ModernAdminLayoutProps) {
  const { user, isAdmin: isAdminFn } = useSimpleAuth()
  const isAdmin = isAdminFn()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications] = useState(3) // Mock notifications

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: HomeIcon
    },
    {
      id: 'data-management',
      name: 'Data Management',
      icon: ChartBarIcon,
      children: [
        { id: 'farms', name: 'Farm Management', icon: MapIcon },
        { id: 'trees', name: 'Tree Management', icon: HomeIcon },
        { id: 'photos', name: 'Photo Management', icon: PhotoIcon },
        { id: 'zones', name: 'Zone Management', icon: MapIcon }
      ]
    },
    {
      id: 'user-management',
      name: 'User Management',
      icon: UsersIcon,
      children: [
        { id: 'users', name: 'User Roles', icon: UserGroupIcon },
        { id: 'user-management', name: 'Enhanced Users', icon: UsersIcon },
        { id: 'farm-assignments', name: 'Farm Assignments', icon: MapIcon },
        { id: 'bulk-operations', name: 'Bulk Operations', icon: ClipboardDocumentListIcon },
        { id: 'invitations', name: 'Invitations', icon: UserPlusIcon, badge: 2 },
        { id: 'registrations', name: 'Registrations', icon: ClipboardDocumentCheckIcon, badge: 5 }
      ]
    },
    {
      id: 'organizations',
      name: 'Organizations',
      icon: BuildingOfficeIcon
    },
    {
      id: 'system',
      name: 'System',
      icon: Cog6ToothIcon,
      children: [
        { id: 'business-rules', name: 'Business Rules', icon: Cog6ToothIcon },
        { id: 'system-config', name: 'Configuration', icon: ShieldCheckIcon },
        { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
        { id: 'audit', name: 'Audit & Compliance', icon: ClipboardDocumentListIcon },
        { id: 'monitoring', name: 'System Monitoring', icon: ChartBarIcon },
        { id: 'settings', name: 'Settings', icon: Cog6ToothIcon }
      ]
    }
  ]

  const handleLogout = async () => {
    try {
      // Import Firebase auth for logout
      const { signOut } = await import('firebase/auth')
      const { auth } = await import('@/lib/firebase')
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isActive = currentView === item.id
    const hasChildren = item.children && item.children.length > 0
    
    return (
      <div key={item.id}>
        <button
          onClick={() => !hasChildren && onViewChange(item.id as AdminView)}
          className={`
            w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
            ${level > 0 ? 'ml-6' : ''}
            ${isActive 
              ? 'bg-green-100 text-green-700 border-r-2 border-green-500' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
          `}
        >
          <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-green-500' : 'text-gray-400'}`} />
          <span className="flex-1 text-left">{item.name}</span>
          {item.badge && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {item.badge}
            </span>
          )}
        </button>
        
        {hasChildren && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Admin Panel</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map(item => renderNavigationItem(item))}
          </nav>

          {/* User info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.displayName || user?.email}
                </p>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 p-1 rounded-md text-gray-400 hover:text-gray-500"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              
              {/* Breadcrumb */}
              <nav className="hidden lg:flex items-center space-x-2 text-sm">
                <span className="text-gray-500">Admin</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium capitalize">
                  {currentView.replace('-', ' ')}
                </span>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Search admin panel..."
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-500">
                <BellIcon className="h-6 w-6" />
                {notifications > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                )}
              </button>

              {/* User menu */}
              <button className="flex items-center p-2 text-gray-400 hover:text-gray-500">
                <UserCircleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}