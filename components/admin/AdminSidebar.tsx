'use client'

import { useState } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { 
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  MapIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BellIcon,
  KeyIcon,
  UserGroupIcon,
  GlobeAltIcon,
  CameraIcon,
  PhotoIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  UserPlusIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface AdminSidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  stats: any
}

export default function AdminSidebar({ currentView, onViewChange, stats }: AdminSidebarProps) {
  const { user } = useSimpleAuth()
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard', 'users', 'content'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const menuSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: HomeIcon,
      items: [
        { id: 'overview', name: 'System Overview', icon: ChartBarIcon },
        { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
        { id: 'reports', name: 'Reports', icon: DocumentTextIcon },
        { id: 'activity', name: 'Activity Logs', icon: ClipboardDocumentListIcon },
      ]
    },
    {
      id: 'users',
      title: 'User Management',
      icon: UsersIcon,
      items: [
        { id: 'users-list', name: 'All Users', icon: UsersIcon, badge: stats.totalUsers },
        { id: 'user-roles', name: 'Roles & Permissions', icon: ShieldCheckIcon },
        { id: 'invitations', name: 'Invitations', icon: EnvelopeIcon, badge: stats.activeInvitations },
        { id: 'registrations', name: 'Pending Approvals', icon: ClipboardDocumentCheckIcon, badge: stats.pendingRegistrations },
        { id: 'user-groups', name: 'User Groups', icon: UserGroupIcon },
        { id: 'access-control', name: 'Access Control', icon: KeyIcon },
      ]
    },
    {
      id: 'organizations',
      title: 'Organizations',
      icon: BuildingOfficeIcon,
      items: [
        { id: 'orgs-list', name: 'All Organizations', icon: BuildingOfficeIcon, badge: stats.totalOrganizations },
        { id: 'org-settings', name: 'Organization Settings', icon: Cog6ToothIcon },
        { id: 'subscriptions', name: 'Subscriptions', icon: BanknotesIcon },
        { id: 'billing', name: 'Billing Management', icon: BanknotesIcon },
      ]
    },
    {
      id: 'content',
      title: 'Content Management',
      icon: GlobeAltIcon,
      items: [
        { id: 'farms', name: 'Farm Management', icon: MapIcon, badge: stats.totalFarms },
        { id: 'trees', name: 'Tree Management', icon: HomeIcon, badge: stats.totalTrees },
        { id: 'zones', name: 'Zone Management', icon: GlobeAltIcon },
        { id: 'photos', name: 'Photo Management', icon: PhotoIcon },
        { id: 'investments', name: 'Investment Tracking', icon: BanknotesIcon },
      ]
    },
    {
      id: 'system',
      title: 'System Administration',
      icon: Cog6ToothIcon,
      items: [
        { id: 'system-settings', name: 'System Settings', icon: Cog6ToothIcon },
        { id: 'security', name: 'Security & Auth', icon: ShieldCheckIcon },
        { id: 'notifications', name: 'Notifications', icon: BellIcon },
        { id: 'backups', name: 'Backup & Recovery', icon: DocumentTextIcon },
        { id: 'maintenance', name: 'Maintenance', icon: ExclamationTriangleIcon },
        { id: 'api-management', name: 'API Management', icon: KeyIcon },
      ]
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: InformationCircleIcon,
      items: [
        { id: 'documentation', name: 'Documentation', icon: DocumentTextIcon },
        { id: 'support', name: 'Support Center', icon: InformationCircleIcon },
        { id: 'system-info', name: 'System Information', icon: InformationCircleIcon },
      ]
    }
  ]

  return (
    <div className="w-72 bg-white shadow-lg h-screen overflow-y-auto border-r border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <ShieldCheckIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            <p className="text-sm text-gray-500">System Administration</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.displayName || 'Super Admin'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4">
        <div className="space-y-2">
          {menuSections.map((section) => {
            const SectionIcon = section.icon
            const isExpanded = expandedSections.includes(section.id)
            
            return (
              <div key={section.id} className="space-y-1">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <SectionIcon className="h-5 w-5 text-gray-500" />
                    <span>{section.title}</span>
                  </div>
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Section Items */}
                {isExpanded && (
                  <div className="ml-6 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon
                      const isActive = currentView === item.id
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => onViewChange(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                            isActive
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <ItemIcon className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                            <span>{item.name}</span>
                          </div>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isActive 
                                ? 'bg-green-100 text-green-800' 
                                : item.id === 'registrations' || item.id === 'invitations'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Quick Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{stats.totalUsers || 0}</div>
            <div className="text-xs text-gray-500">Users</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{stats.totalFarms || 0}</div>
            <div className="text-xs text-gray-500">Farms</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{stats.totalTrees || 0}</div>
            <div className="text-xs text-gray-500">Trees</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{stats.totalOrganizations || 0}</div>
            <div className="text-xs text-gray-500">Orgs</div>
          </div>
        </div>
      </div>
    </div>
  )
}