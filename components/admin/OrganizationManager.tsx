'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { Organization, OrganizationSettings, EnhancedFarm } from '@/lib/types-enhanced'
import { 
  BuildingOfficeIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  UsersIcon,
  HomeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

export default function OrganizationManager() {
  const { user, isAdmin } = useSimpleAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newOrganization, setNewOrganization] = useState({
    name: '',
    displayName: '',
    subscriptionType: 'free' as 'free' | 'pro' | 'enterprise',
    maxFarms: 5,
    maxUsersPerFarm: 10,
    maxUsersTotal: 25
  })

  useEffect(() => {
    if (isAdmin()) {
      loadOrganizations()
    }
  }, [isAdmin])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const orgsQuery = query(
        collection(db, 'organizations'),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(orgsQuery)
      const orgsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Organization[]

      setOrganizations(orgsData)
    } catch (error) {
      console.error('Error loading organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const createOrganization = async () => {
    if (!user || !newOrganization.name.trim()) return

    try {
      setLoading(true)
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const defaultSettings: OrganizationSettings = {
        allowSelfRegistration: false,
        requireEmailVerification: true,
        requireAdminApproval: true,
        defaultUserRole: 'viewer',
        sessionTimeout: 480, // 8 hours
        enableAuditLogging: true,
        enableAPIAccess: false
      }

      const organization: Organization = {
        id: orgId,
        name: newOrganization.name.trim(),
        displayName: newOrganization.displayName.trim() || newOrganization.name.trim(),
        subscriptionType: newOrganization.subscriptionType,
        subscriptionStatus: 'active',
        maxFarms: newOrganization.maxFarms,
        maxUsersPerFarm: newOrganization.maxUsersPerFarm,
        maxUsersTotal: newOrganization.maxUsersTotal,
        features: [],
        settings: defaultSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      }

      await setDoc(doc(db, 'organizations', orgId), {
        ...organization,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // Reset form and refresh
      setNewOrganization({
        name: '',
        displayName: '',
        subscriptionType: 'free',
        maxFarms: 5,
        maxUsersPerFarm: 10,
        maxUsersTotal: 25
      })
      setShowCreateModal(false)
      await loadOrganizations()

      alert('Organization created successfully!')
    } catch (error) {
      console.error('Error creating organization:', error)
      alert('Failed to create organization. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateOrganization = async () => {
    if (!selectedOrg || !user) return

    try {
      setLoading(true)
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await updateDoc(doc(db, 'organizations', selectedOrg.id), {
        name: selectedOrg.name,
        displayName: selectedOrg.displayName,
        subscriptionType: selectedOrg.subscriptionType,
        maxFarms: selectedOrg.maxFarms,
        maxUsersPerFarm: selectedOrg.maxUsersPerFarm,
        maxUsersTotal: selectedOrg.maxUsersTotal,
        settings: selectedOrg.settings,
        updatedAt: serverTimestamp()
      })

      setShowEditModal(false)
      await loadOrganizations()
      alert('Organization updated successfully!')
    } catch (error) {
      console.error('Error updating organization:', error)
      alert('Failed to update organization. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const deleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone.`)) return

    try {
      setLoading(true)
      const { doc, deleteDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await deleteDoc(doc(db, 'organizations', orgId))
      await loadOrganizations()
      alert('Organization deleted successfully!')
    } catch (error) {
      console.error('Error deleting organization:', error)
      alert('Failed to delete organization. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getSubscriptionColor = (type: string) => {
    switch (type) {
      case 'free':
        return 'bg-gray-100 text-gray-800'
      case 'pro':
        return 'bg-blue-100 text-blue-800'
      case 'enterprise':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isAdmin()) {
    return (
      <div className="text-center py-8">
        <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">You need super admin access to manage organizations.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organization Management</h2>
          <p className="text-gray-600">Create and manage organizations in the system</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadOrganizations}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <PlusIcon className="h-4 w-4 inline mr-2" />
            Create Organization
          </button>
        </div>
      </div>

      {/* Organizations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Organizations ({organizations.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="ml-2">Loading organizations...</span>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-8">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No organizations created yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {organizations.map((org) => (
              <div key={org.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{org.displayName || org.name}</h4>
                      <p className="text-sm text-gray-500">{org.name}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-400">
                          Created: {org.createdAt.toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400">
                          Max Farms: {org.maxFarms}
                        </span>
                        <span className="text-xs text-gray-400">
                          Max Users: {org.maxUsersTotal}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSubscriptionColor(org.subscriptionType)}`}>
                        {org.subscriptionType}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(org.subscriptionStatus)}`}>
                        {org.subscriptionStatus}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrg(org)
                          setShowEditModal(true)
                        }}
                        className="p-2 text-blue-600 hover:text-blue-800"
                        title="Edit organization"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteOrganization(org.id, org.name)}
                        className="p-2 text-red-600 hover:text-red-800"
                        title="Delete organization"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Organization Stats */}
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <UsersIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Users: 0/{org.maxUsersTotal}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <HomeIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Farms: 0/{org.maxFarms}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Cog6ToothIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      Features: {org.features?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create New Organization
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={newOrganization.name}
                  onChange={(e) => setNewOrganization(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Farm Organization"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newOrganization.displayName}
                  onChange={(e) => setNewOrganization(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="My Farm Organization (Public Name)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Type
                </label>
                <select
                  value={newOrganization.subscriptionType}
                  onChange={(e) => setNewOrganization(prev => ({ ...prev, subscriptionType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Farms
                  </label>
                  <input
                    type="number"
                    value={newOrganization.maxFarms}
                    onChange={(e) => setNewOrganization(prev => ({ ...prev, maxFarms: parseInt(e.target.value) || 5 }))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={newOrganization.maxUsersTotal}
                    onChange={(e) => setNewOrganization(prev => ({ ...prev, maxUsersTotal: parseInt(e.target.value) || 25 }))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={createOrganization}
                disabled={loading || !newOrganization.name.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Organization'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {showEditModal && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Organization: {selectedOrg.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={selectedOrg.name}
                  onChange={(e) => setSelectedOrg(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={selectedOrg.displayName}
                  onChange={(e) => setSelectedOrg(prev => prev ? { ...prev, displayName: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Type
                </label>
                <select
                  value={selectedOrg.subscriptionType}
                  onChange={(e) => setSelectedOrg(prev => prev ? { ...prev, subscriptionType: e.target.value as any } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Farms
                  </label>
                  <input
                    type="number"
                    value={selectedOrg.maxFarms}
                    onChange={(e) => setSelectedOrg(prev => prev ? { ...prev, maxFarms: parseInt(e.target.value) || 5 } : null)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={selectedOrg.maxUsersTotal}
                    onChange={(e) => setSelectedOrg(prev => prev ? { ...prev, maxUsersTotal: parseInt(e.target.value) || 25 } : null)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Organization Settings */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedOrg.settings?.allowSelfRegistration || false}
                      onChange={(e) => setSelectedOrg(prev => prev ? {
                        ...prev,
                        settings: { ...prev.settings, allowSelfRegistration: e.target.checked }
                      } : null)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow Self Registration</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedOrg.settings?.requireAdminApproval || false}
                      onChange={(e) => setSelectedOrg(prev => prev ? {
                        ...prev,
                        settings: { ...prev.settings, requireAdminApproval: e.target.checked }
                      } : null)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Require Admin Approval</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedOrg.settings?.enableAuditLogging || false}
                      onChange={(e) => setSelectedOrg(prev => prev ? {
                        ...prev,
                        settings: { ...prev.settings, enableAuditLogging: e.target.checked }
                      } : null)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Audit Logging</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={updateOrganization}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Organization'}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}