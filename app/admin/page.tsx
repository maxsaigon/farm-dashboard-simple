'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { useRouter } from 'next/navigation'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import UserRoleManager from '@/components/admin/UserRoleManager'
import UserInvitationSystem from '@/components/admin/UserInvitationSystem'
import SelfRegistrationManager from '@/components/admin/SelfRegistrationManager'
import OrganizationManager from '@/components/admin/OrganizationManager'
import ModernAdminLayout from '@/components/admin/ModernAdminLayout'
import EnhancedAdminDashboard from '@/components/admin/EnhancedAdminDashboard'
import EnhancedFarmManagement from '@/components/admin/EnhancedFarmManagement'
import EnhancedUserManagement from '@/components/admin/EnhancedUserManagement'
import TreeManagement from '@/components/admin/TreeManagement'
import PhotoManagement from '@/components/admin/PhotoManagement'
import ZoneManagement from '@/components/admin/ZoneManagement'
import FarmAssignmentSystem from '@/components/admin/FarmAssignmentSystem'
import BulkOperationsManager from '@/components/admin/BulkOperationsManager'
import BusinessRulesEngine from '@/components/admin/BusinessRulesEngine'
import SystemConfiguration from '@/components/admin/SystemConfiguration'
import AdvancedAnalytics from '@/components/admin/AdvancedAnalytics'
import AuditCompliance from '@/components/admin/AuditCompliance'
import SystemMonitoring from '@/components/admin/SystemMonitoring'
import AuthGuard from '@/components/AuthGuard'

type AdminView = 'dashboard' | 'farms' | 'trees' | 'photos' | 'zones' | 'users' | 'user-management' | 'farm-assignments' | 'bulk-operations' | 'invitations' | 'registrations' | 'organizations' | 'business-rules' | 'system-config' | 'analytics' | 'audit' | 'monitoring' | 'settings'

export default function AdminPage() {
  const { user, isSuperAdmin, loading } = useEnhancedAuth()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<AdminView>('dashboard')

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin())) {
      router.push('/login')
    }
  }, [user, isSuperAdmin, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
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

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <EnhancedAdminDashboard />
      case 'farms':
        return <EnhancedFarmManagement />
      case 'trees':
        return <TreeManagement />
      case 'photos':
        return <PhotoManagement />
      case 'zones':
        return <ZoneManagement />
      case 'users':
        return <UserRoleManager />
      case 'user-management':
        return <EnhancedUserManagement />
      case 'farm-assignments':
        return <FarmAssignmentSystem />
      case 'bulk-operations':
        return <BulkOperationsManager />
      case 'invitations':
        return <UserInvitationSystem />
      case 'registrations':
        return <SelfRegistrationManager />
      case 'organizations':
        return <OrganizationManager />
      case 'business-rules':
        return <BusinessRulesEngine />
      case 'system-config':
        return <SystemConfiguration />
      case 'analytics':
        return <AdvancedAnalytics />
      case 'audit':
        return <AuditCompliance />
      case 'monitoring':
        return <SystemMonitoring />
      case 'settings':
        return <SystemSettings />
      default:
        return <EnhancedAdminDashboard />
    }
  }

  return (
    <ModernAdminLayout 
      currentView={currentView} 
      onViewChange={setCurrentView}
    >
      {renderCurrentView()}
    </ModernAdminLayout>
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