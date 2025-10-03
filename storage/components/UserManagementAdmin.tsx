'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { EnhancedUser, UserRole, RoleType, ROLE_PERMISSIONS } from '@/lib/types-enhanced'
import { 
  UsersIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ShieldCheckIcon,
  KeyIcon,
  UserGroupIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface UserWithRoles extends EnhancedUser {
  userRoles: UserRole[]
  lastLoginFormatted?: string
  accountAge?: string
}

export default function UserManagementAdmin() {
  const { user: currentUser } = useSimpleAuth()
  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterOrganization, setFilterOrganization] = useState<string>('all')

  const [newRole, setNewRole] = useState<{
    roleType: RoleType
    scopeType: 'system' | 'organization' | 'farm'
    scopeId?: string
  }>({
    roleType: 'farm_viewer',
    scopeType: 'farm'
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { collection, getDocs } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')
      const { enhancedAuthService } = await import('@/storage/lib/enhanced-auth-service')

      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersData: UserWithRoles[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as EnhancedUser
        const userRoles = await enhancedAuthService.loadUserRoles(userData.uid)
        
        // Format dates
        const lastLoginFormatted = userData.lastLoginAt 
          ? new Date(userData.lastLoginAt).toLocaleDateString()
          : 'Never'
        
        const accountAge = userData.createdAt
          ? `${Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days`
          : 'Unknown'

        usersData.push({
          ...userData,
          uid: userDoc.id,
          userRoles: userRoles,
          lastLoginFormatted,
          accountAge
        })
      }

      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGrantRole = async () => {
    if (!selectedUser || !currentUser) return

    try {
      const { enhancedAuthService } = await import('@/storage/lib/enhanced-auth-service')
      
      await enhancedAuthService.grantUserRole(
        selectedUser.uid,
        newRole.roleType,
        newRole.scopeType,
        newRole.scopeId,
        currentUser.uid
      )

      await loadUsers()
      setShowRoleModal(false)
      alert(`Role ${newRole.roleType} granted successfully!`)
    } catch (error) {
      console.error('Error granting role:', error)
      alert('Failed to grant role. Please try again.')
    }
  }

  const handleRevokeRole = async (roleId: string) => {
    if (!currentUser || !confirm('Are you sure you want to revoke this role?')) return

    try {
      const { enhancedAuthService } = await import('@/storage/lib/enhanced-auth-service')
      await enhancedAuthService.revokeUserRole(roleId, currentUser.uid)
      await loadUsers()
      alert('Role revoked successfully!')
    } catch (error) {
      console.error('Error revoking role:', error)
      alert('Failed to revoke role. Please try again.')
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    if (!currentUser) return

    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    if (!confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this user?`)) return

    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await updateDoc(doc(db, 'users', userId), {
        accountStatus: newStatus,
        updatedAt: new Date()
      })

      await loadUsers()
      alert(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully!`)
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Failed to update user status. Please try again.')
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`)) return

    try {
      const { doc, deleteDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await deleteDoc(doc(db, 'users', userId))
      await loadUsers()
      alert('User deleted successfully!')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user. Please try again.')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.userRoles.some(role => role.roleType === filterRole)
    const matchesStatus = filterStatus === 'all' || user.accountStatus === filterStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleColor = (roleType: RoleType) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-800',
      organization_admin: 'bg-purple-100 text-purple-800',
      organization_member: 'bg-blue-100 text-blue-800',
      farm_owner: 'bg-green-100 text-green-800',
      farm_manager: 'bg-yellow-100 text-yellow-800',
      farm_viewer: 'bg-gray-100 text-gray-800',
      seasonal_worker: 'bg-orange-100 text-orange-800',
      api_user: 'bg-indigo-100 text-indigo-800'
    }
    return colors[roleType] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="h-4 w-4" />
      case 'suspended': return <XCircleIcon className="h-4 w-4" />
      case 'pending': return <ClockIcon className="h-4 w-4" />
      default: return <ExclamationTriangleIcon className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {viewMode === 'grid' ? 'Table View' : 'Grid View'}
          </button>
          <button
            onClick={loadUsers}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="organization_admin">Org Admin</option>
              <option value="farm_owner">Farm Owner</option>
              <option value="farm_manager">Farm Manager</option>
              <option value="farm_viewer">Farm Viewer</option>
              <option value="seasonal_worker">Seasonal Worker</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
            <select
              value={filterOrganization}
              onChange={(e) => setFilterOrganization(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Organizations</option>
              <option value="default_org">Default Organization</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterRole('all')
                setFilterStatus('all')
                setFilterOrganization('all')
              }}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.accountStatus === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.userRoles.some(r => r.roleType.includes('admin'))).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">New This Week</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => {
                  if (!u.createdAt) return false
                  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
                  return new Date(u.createdAt).getTime() > weekAgo
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Age</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.uid} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.displayName || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.phoneNumber && (
                        <div className="text-xs text-gray-400 flex items-center mt-1">
                          <PhoneIcon className="h-3 w-3 mr-1" />
                          {user.phoneNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.length > 0 ? (
                      user.userRoles.slice(0, 2).map((role) => (
                        <span
                          key={role.id}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.roleType)}`}
                        >
                          {role.roleType}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No roles</span>
                    )}
                    {user.userRoles.length > 2 && (
                      <span className="text-xs text-gray-400">+{user.userRoles.length - 2} more</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.accountStatus || 'active')}`}>
                      {getStatusIcon(user.accountStatus || 'active')}
                      <span className="ml-1">{user.accountStatus || 'active'}</span>
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.lastLoginFormatted}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.accountAge}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowDetailsModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowEditModal(true)
                      }}
                      className="text-green-600 hover:text-green-900"
                      title="Edit user"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowRoleModal(true)
                      }}
                      className="text-purple-600 hover:text-purple-900"
                      title="Manage roles"
                    >
                      <ShieldCheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleUserStatus(user.uid, user.accountStatus || 'active')}
                      className={`${user.accountStatus === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                      title={user.accountStatus === 'active' ? 'Suspend user' : 'Activate user'}
                    >
                      {user.accountStatus === 'active' ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => deleteUser(user.uid, user.email || '')}
                      className="text-red-600 hover:text-red-900"
                      title="Delete user"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No users found matching your criteria.</p>
        </div>
      )}

      {/* Role Management Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Manage Roles for {selectedUser.displayName || selectedUser.email}
            </h3>

            {/* Current Roles */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Current Roles</h4>
              <div className="space-y-2">
                {selectedUser.userRoles.length > 0 ? (
                  selectedUser.userRoles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.roleType)}`}>
                          {role.roleType}
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                          ({role.scopeType}: {role.scopeId || 'system'})
                        </span>
                      </div>
                      <button
                        onClick={() => handleRevokeRole(role.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Revoke role"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No roles assigned</p>
                )}
              </div>
            </div>

            {/* Grant New Role */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Grant New Role</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role Type</label>
                  <select
                    value={newRole.roleType}
                    onChange={(e) => setNewRole(prev => ({ ...prev, roleType: e.target.value as RoleType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="farm_viewer">Farm Viewer</option>
                    <option value="farm_manager">Farm Manager</option>
                    <option value="farm_owner">Farm Owner</option>
                    <option value="seasonal_worker">Seasonal Worker</option>
                    <option value="organization_member">Organization Member</option>
                    <option value="organization_admin">Organization Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scope</label>
                  <select
                    value={newRole.scopeType}
                    onChange={(e) => setNewRole(prev => ({ ...prev, scopeType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="system">System</option>
                    <option value="organization">Organization</option>
                    <option value="farm">Farm</option>
                  </select>
                </div>

                {newRole.scopeType !== 'system' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scope ID ({newRole.scopeType} ID)
                    </label>
                    <input
                      type="text"
                      value={newRole.scopeId || ''}
                      onChange={(e) => setNewRole(prev => ({ ...prev, scopeId: e.target.value }))}
                      placeholder={`Enter ${newRole.scopeType} ID`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>

              {/* Permissions Preview */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions for {newRole.roleType}
                </label>
                <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded text-xs">
                  {ROLE_PERMISSIONS[newRole.roleType]?.map(permission => (
                    <div key={permission} className="text-gray-600">{permission}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={handleGrantRole}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Grant Role
              </button>
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}