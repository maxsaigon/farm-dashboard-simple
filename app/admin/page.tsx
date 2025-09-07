'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { useRouter } from 'next/navigation'
import { 
  UsersIcon, 
  BuildingOfficeIcon,
  UserPlusIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import UserRoleManager from '@/components/admin/UserRoleManager'
import UserInvitationSystem from '@/components/admin/UserInvitationSystem'
import SelfRegistrationManager from '@/components/admin/SelfRegistrationManager'
import OrganizationManager from '@/components/admin/OrganizationManager'
import AuthGuard from '@/components/AuthGuard'

type AdminView = 'dashboard' | 'users' | 'invitations' | 'registrations' | 'organizations' | 'settings'

export default function AdminPage() {
  const { user, isSuperAdmin, loading } = useEnhancedAuth()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<AdminView>('dashboard')
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingRegistrations: 0,
    activeInvitations: 0,
    totalOrganizations: 0
  })

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin())) {
      router.push('/login')
    }
  }, [user, isSuperAdmin, loading, router])

  useEffect(() => {
    if (isSuperAdmin()) {
      loadAdminStats()
    }
  }, [isSuperAdmin])

  const loadAdminStats = async () => {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      // Load users count
      const usersSnapshot = await getDocs(collection(db, 'users'))
      
      // Load pending registrations
      const pendingQuery = query(
        collection(db, 'pendingRegistrations'),
        where('approvalStatus', '==', 'pending')
      )
      const pendingSnapshot = await getDocs(pendingQuery)

      // Load active invitations
      const invitationsQuery = query(
        collection(db, 'farmInvitations'),
        where('status', '==', 'pending')
      )
      const invitationsSnapshot = await getDocs(invitationsQuery)

      // Load organizations
      const orgsSnapshot = await getDocs(collection(db, 'organizations'))

      setStats({
        totalUsers: usersSnapshot.size,
        pendingRegistrations: pendingSnapshot.size,
        activeInvitations: invitationsSnapshot.size,
        totalOrganizations: orgsSnapshot.size
      })
    } catch (error) {
      console.error('Error loading admin stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!user || !isSuperAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You need super admin privileges to access this area.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
    { id: 'users', name: 'User Roles', icon: UsersIcon },
    { id: 'invitations', name: 'Invitations', icon: UserPlusIcon },
    { id: 'registrations', name: 'Registrations', icon: ClipboardDocumentCheckIcon },
    { id: 'organizations', name: 'Organizations', icon: BuildingOfficeIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon }
  ]

  const renderCurrentView = () => {
    switch (currentView) {
      case 'users':
        return <UserRoleManager />
      case 'invitations':
        return <UserInvitationSystem />
      case 'registrations':
        return <SelfRegistrationManager />
      case 'organizations':
        return <OrganizationManager />
      case 'settings':
        return <SystemSettings />
      default:
        return <AdminDashboard stats={stats} onRefresh={loadAdminStats} />
    }
  }

  return (
    <AuthGuard requiredPermission="system:admin" requireFarmAccess={false}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
                <p className="text-gray-600">Manage users, organizations, and system settings</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">
                  Logged in as: <span className="font-medium">{user.email}</span>
                </div>
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <ShieldCheckIcon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-white shadow-sm h-screen sticky top-0">
            <nav className="mt-8 px-4">
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setCurrentView(item.id as AdminView)}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                          currentView === item.id
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {item.name}
                        {/* Show badges for pending items */}
                        {item.id === 'registrations' && stats.pendingRegistrations > 0 && (
                          <span className="ml-auto bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                            {stats.pendingRegistrations}
                          </span>
                        )}
                        {item.id === 'invitations' && stats.activeInvitations > 0 && (
                          <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                            {stats.activeInvitations}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8">
            {renderCurrentView()}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

// Admin Dashboard Overview Component
function AdminDashboard({ stats, onRefresh }: { stats: any, onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Refresh Stats
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Registrations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingRegistrations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserPlusIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Invitations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeInvitations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Organizations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalOrganizations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <UsersIcon className="h-6 w-6 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Manage User Roles</h4>
            <p className="text-sm text-gray-500">Grant or revoke user permissions</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <UserPlusIcon className="h-6 w-6 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Send Invitations</h4>
            <p className="text-sm text-gray-500">Invite new users to join farms</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <BuildingOfficeIcon className="h-6 w-6 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">Create Organization</h4>
            <p className="text-sm text-gray-500">Set up new organizations</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-gray-900">System initialized with enhanced role management</p>
              <p className="text-xs text-gray-500">Admin features now available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Placeholder for SystemSettings component
function SystemSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">System settings panel will be implemented here.</p>
        <p className="text-sm text-gray-500 mt-2">This will include global configuration options, security settings, and system maintenance tools.</p>
      </div>
    </div>
  )
}