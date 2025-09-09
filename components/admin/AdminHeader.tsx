'use client'

import { useState } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { 
  MagnifyingGlassIcon,
  BellIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  ArrowPathIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline'

interface AdminHeaderProps {
  currentView: string
  onRefresh: () => void
  stats: any
}

export default function AdminHeader({ currentView, onRefresh, stats }: AdminHeaderProps) {
  const { user, signOut } = useEnhancedAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)

  const getPageTitle = (view: string) => {
    const titles: Record<string, string> = {
      'overview': 'System Overview',
      'analytics': 'Analytics Dashboard',
      'reports': 'System Reports',
      'activity': 'Activity Logs',
      'users-list': 'User Management',
      'user-roles': 'Roles & Permissions',
      'invitations': 'User Invitations',
      'registrations': 'Pending Registrations',
      'user-groups': 'User Groups',
      'access-control': 'Access Control',
      'orgs-list': 'Organization Management',
      'org-settings': 'Organization Settings',
      'subscriptions': 'Subscription Management',
      'billing': 'Billing Management',
      'farms': 'Farm Management',
      'trees': 'Tree Management',
      'zones': 'Zone Management',
      'photos': 'Photo Management',
      'investments': 'Investment Tracking',
      'system-settings': 'System Settings',
      'security': 'Security & Authentication',
      'notifications': 'Notification Center',
      'backups': 'Backup & Recovery',
      'maintenance': 'System Maintenance',
      'api-management': 'API Management',
      'documentation': 'Documentation',
      'support': 'Support Center',
      'system-info': 'System Information'
    }
    return titles[view] || 'Admin Dashboard'
  }

  const getPageDescription = (view: string) => {
    const descriptions: Record<string, string> = {
      'overview': 'Monitor system performance and key metrics',
      'analytics': 'Analyze user behavior and system usage',
      'users-list': 'Manage user accounts and permissions',
      'user-roles': 'Configure roles and permission sets',
      'invitations': 'Send and manage user invitations',
      'registrations': 'Review and approve new user registrations',
      'orgs-list': 'Manage organizations and their settings',
      'farms': 'Oversee farm operations and assignments',
      'trees': 'Monitor tree health and management',
      'system-settings': 'Configure system-wide settings',
      'security': 'Manage security policies and authentication'
    }
    return descriptions[view] || 'Administrative functions and system management'
  }

  const quickActions = [
    { id: 'add-user', name: 'Add User', icon: UserIcon, action: () => console.log('Add user') },
    { id: 'create-org', name: 'Create Organization', icon: PlusIcon, action: () => console.log('Create org') },
    { id: 'send-invite', name: 'Send Invitation', icon: PlusIcon, action: () => console.log('Send invite') },
    { id: 'system-backup', name: 'System Backup', icon: CommandLineIcon, action: () => console.log('Backup') },
  ]

  const notifications = [
    { id: 1, type: 'warning', message: '3 pending user registrations require approval', time: '5 min ago' },
    { id: 2, type: 'info', message: 'System backup completed successfully', time: '1 hour ago' },
    { id: 3, type: 'success', message: 'New organization "Green Farms Ltd" created', time: '2 hours ago' },
    { id: 4, type: 'error', message: 'Failed login attempt detected', time: '3 hours ago' },
  ]

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️'
      case 'error': return '🚨'
      case 'success': return '✅'
      default: return 'ℹ️'
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Page Title */}
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{getPageTitle(currentView)}</h1>
                <p className="text-sm text-gray-600 mt-1">{getPageDescription(currentView)}</p>
              </div>
              
              {/* Quick Stats Badges */}
              <div className="hidden lg:flex items-center space-x-3">
                {stats.pendingRegistrations > 0 && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span>{stats.pendingRegistrations} pending</span>
                  </div>
                )}
                {stats.activeInvitations > 0 && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    <span>{stats.activeInvitations} invites</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:block relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users, farms, organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Quick Actions */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Quick Actions"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
              
              {showQuickActions && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
                  </div>
                  {quickActions.map((action) => {
                    const ActionIcon = action.icon
                    return (
                      <button
                        key={action.id}
                        onClick={() => {
                          action.action()
                          setShowQuickActions(false)
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <ActionIcon className="h-4 w-4 mr-3 text-gray-400" />
                        {action.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <ArrowPathIcon className="h-6 w-6" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
                title="Notifications"
              >
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button className="text-sm text-green-600 hover:text-green-700">View all notifications</button>
                  </div>
                </div>
              )}
            </div>

            {/* Help */}
            <button
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Help & Documentation"
            >
              <QuestionMarkCircleIcon className="h-6 w-6" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{user?.displayName || 'Super Admin'}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.displayName || 'Super Admin'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <div className="flex items-center mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Super Administrator
                      </span>
                    </div>
                  </div>
                  
                  <div className="py-1">
                    <button className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <UserIcon className="h-4 w-4 mr-3 text-gray-400" />
                      Profile Settings
                    </button>
                    <button className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Cog6ToothIcon className="h-4 w-4 mr-3 text-gray-400" />
                      Admin Preferences
                    </button>
                    <button className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <SunIcon className="h-4 w-4 mr-3 text-gray-400" />
                      Theme Settings
                    </button>
                  </div>
                  
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={() => signOut()}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-red-400" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}