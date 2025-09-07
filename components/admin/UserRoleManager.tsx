'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { EnhancedUser, UserRole, RoleType, ROLE_PERMISSIONS, Permission } from '@/lib/types-enhanced'
import { enhancedAuthService } from '@/lib/enhanced-auth-service'
import { 
  UserIcon, 
  ShieldCheckIcon, 
  PlusIcon, 
  TrashIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface UserWithRoles extends EnhancedUser {
  userRoles: UserRole[]
}

export default function UserRoleManager() {
  const { user: currentUser, isSuperAdmin } = useEnhancedAuth()
  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRole, setNewRole] = useState<{
    roleType: RoleType
    scopeType: 'system' | 'organization' | 'farm'
    scopeId?: string
  }>({
    roleType: 'farm_viewer',
    scopeType: 'farm'
  })

  useEffect(() => {
    if (isSuperAdmin()) {
      loadUsers()
    }
  }, [isSuperAdmin])

  const loadUsers = async () => {
    try {
      setLoading(true)
      // Load all users from Firestore
      const { collection, getDocs } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')
      
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersData: UserWithRoles[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as EnhancedUser
        const userRoles = await enhancedAuthService.loadUserRoles(userData.uid)
        
        usersData.push({
          ...userData,
          uid: userDoc.id,
          userRoles: userRoles
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
      await enhancedAuthService.grantUserRole(
        selectedUser.uid,
        newRole.roleType,
        newRole.scopeType,
        newRole.scopeId,
        currentUser.uid
      )

      // Refresh user data
      await loadUsers()
      setShowRoleModal(false)
      
      // Show success message
      alert(`Role ${newRole.roleType} granted successfully!`)
    } catch (error) {
      console.error('Error granting role:', error)
      alert('Failed to grant role. Please try again.')
    }
  }

  const handleRevokeRole = async (roleId: string) => {
    if (!currentUser || !confirm('Are you sure you want to revoke this role?')) return

    try {
      await enhancedAuthService.revokeUserRole(roleId, currentUser.uid)
      await loadUsers()
      alert('Role revoked successfully!')
    } catch (error) {
      console.error('Error revoking role:', error)
      alert('Failed to revoke role. Please try again.')
    }
  }

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

  if (!isSuperAdmin()) {
    return (
      <div className="text-center py-8">
        <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">You need super admin access to manage user roles.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Role Management</h2>
          <p className="text-gray-600">Manage user roles and permissions across the system</p>
        </div>
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Refresh Users
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Users ({users.length})</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {users.map((user) => (
            <div key={user.uid} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{user.displayName || user.email}</h4>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">UID: {user.uid}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* User Roles */}
                  <div className="flex flex-wrap gap-2">
                    {user.userRoles.length > 0 ? (
                      user.userRoles.map((role) => (
                        <div key={role.id} className="flex items-center space-x-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(role.roleType)}`}>
                            {role.roleType}
                          </span>
                          {role.scopeType !== 'system' && (
                            <span className="text-xs text-gray-400">
                              ({role.scopeType}: {role.scopeId?.slice(0, 8)}...)
                            </span>
                          )}
                          <button
                            onClick={() => handleRevokeRole(role.id)}
                            className="ml-1 text-red-600 hover:text-red-800"
                            title="Revoke role"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No roles assigned</span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowRoleModal(true)
                      }}
                      className="p-2 text-green-600 hover:text-green-800"
                      title="Grant role"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-2 text-blue-600 hover:text-blue-800"
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Grant Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Grant Role to {selectedUser.displayName || selectedUser.email}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Type
                </label>
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
                  <option value="api_user">API User</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scope Type
                </label>
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
                <div>
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

              {/* Permissions Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions for {newRole.roleType}
                </label>
                <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
                  {ROLE_PERMISSIONS[newRole.roleType]?.map(permission => (
                    <div key={permission} className="text-gray-600">{permission}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={handleGrantRole}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Grant Role
              </button>
              <button
                onClick={() => setShowRoleModal(false)}
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