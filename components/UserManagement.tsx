'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { 
  UserIcon, 
  PencilIcon, 
  TrashIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface UnifiedUser {
  uid: string
  email: string
  displayName: string
  phoneNumber?: string
  profilePicture?: string
  language: string
  timezone: string
  isActive: boolean
  joinedDate: Date
  lastActivity: Date
  lastLoginAt?: Date
  loginCount: number
  isEmailVerified: boolean
  accountStatus: 'active' | 'suspended' | 'pending_verification'
  organizationIds: string[]
  defaultFarmId?: string
  farmAccess?: string[]
}

interface UserRole {
  id: string
  userId: string
  roleType: string
  scopeType: string
  scopeId?: string
  permissions: string[]
  grantedBy: string
  grantedAt: Date
  isActive: boolean
}

export default function UserManagement() {
  const { user, hasPermission } = useSimpleAuth()
  const [users, setUsers] = useState<UnifiedUser[]>([])
  const [userRoles, setUserRoles] = useState<{[key: string]: UserRole[]}>({})
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (hasPermission('read')) {
      loadUsers()
    }
  }, [hasPermission])

  const loadUsers = async () => {
    try {
      setLoading(true)
      // Load users from Firebase
      // This would be implemented with actual Firebase calls
      // For now, using mock data structure
      setUsers([])
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserRoles = async (userId: string) => {
    try {
      // Load user roles from Firebase
      // This would fetch from userRoles collection
      setUserRoles(prev => ({ ...prev, [userId]: [] }))
    } catch (error) {
      console.error('Error loading user roles:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || user.accountStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { color: 'bg-green-100 text-green-800', text: 'Hoạt động' },
      'suspended': { color: 'bg-red-100 text-red-800', text: 'Tạm ngưng' },
      'pending_verification': { color: 'bg-yellow-100 text-yellow-800', text: 'Chờ xác minh' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getRoleBadges = (userId: string) => {
    const roles = userRoles[userId] || []
    return roles.map((role, index) => (
      <span 
        key={index}
        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1"
      >
        {getRoleDisplayName(role.roleType)}
      </span>
    ))
  }

  const getRoleDisplayName = (roleType: string): string => {
    const roleNames: {[key: string]: string} = {
      'super_admin': 'Quản trị hệ thống',
      'organization_admin': 'Quản trị tổ chức',
      'farm_owner': 'Chủ trang trại',
      'farm_manager': 'Quản lý trang trại',
      'farm_viewer': 'Người xem',
      'field_worker': 'Nhân viên thực địa',
      'seasonal_worker': 'Công nhân mùa vụ'
    }
    return roleNames[roleType] || roleType
  }

  const handleUserAction = async (action: string, userId: string) => {
    try {
      switch (action) {
        case 'activate':
          // Activate user
          break
        case 'suspend':
          // Suspend user
          break
        case 'delete':
          if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
            // Delete user
          }
          break
      }
      await loadUsers()
    } catch (error) {
      console.error(`Error ${action} user:`, error)
    }
  }

  if (!hasPermission('read')) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Bạn không có quyền xem danh sách người dùng.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h2>
          <p className="text-gray-600">Quản lý thành viên và phân quyền trong hệ thống</p>
        </div>
        {hasPermission('manage_users') && (
          <button
            onClick={() => setShowUserModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Mời người dùng
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="suspended">Tạm ngưng</option>
            <option value="pending_verification">Chờ xác minh</option>
          </select>
        </div>
      </div>

      {/* User List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Đang tải...</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <li className="px-6 py-8 text-center">
                <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Không có người dùng</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Không tìm thấy người dùng phù hợp với tiêu chí tìm kiếm.'
                    : 'Chưa có người dùng nào trong hệ thống.'
                  }
                </p>
              </li>
            ) : (
              filteredUsers.map((user) => (
                <li key={user.uid}>
                  <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {user.profilePicture ? (
                          <img 
                            className="h-10 w-10 rounded-full" 
                            src={user.profilePicture} 
                            alt={user.displayName} 
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.displayName}
                          </p>
                          {getStatusBadge(user.accountStatus)}
                          {!user.isEmailVerified && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-xs text-gray-400">
                            Hoạt động lần cuối: {new Date(user.lastActivity).toLocaleString('vi-VN')}
                          </p>
                          <span className="text-xs text-gray-300">•</span>
                          <p className="text-xs text-gray-400">
                            Đăng nhập: {user.loginCount} lần
                          </p>
                        </div>
                        <div className="mt-1">
                          {getRoleBadges(user.uid)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowRoleModal(true)
                          loadUserRoles(user.uid)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Quản lý vai trò"
                      >
                        <ShieldCheckIcon className="h-4 w-4" />
                      </button>
                      {hasPermission('manage_users') && (
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserModal(true)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600"
                          title="Chỉnh sửa"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('delete') && user.uid !== user.uid && (
                        <button
                          onClick={() => handleUserAction('delete', user.uid)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Xóa"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false)
            setSelectedUser(null)
          }}
          onSave={() => {
            loadUsers()
            setShowUserModal(false)
            setSelectedUser(null)
          }}
        />
      )}

      {/* Role Management Modal */}
      {showRoleModal && selectedUser && (
        <RoleManagementModal
          user={selectedUser}
          userRoles={userRoles[selectedUser.uid] || []}
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false)
            setSelectedUser(null)
          }}
          onSave={() => {
            loadUserRoles(selectedUser.uid)
            setShowRoleModal(false)
          }}
        />
      )}
    </div>
  )
}

// User Modal Component
function UserModal({ 
  user, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  user: UnifiedUser | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    language: user?.language || 'vi-VN',
    timezone: user?.timezone || 'Asia/Ho_Chi_Minh',
    accountStatus: user?.accountStatus || 'active'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Save user data to Firebase
      onSave()
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {user ? 'Chỉnh sửa người dùng' : 'Mời người dùng mới'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên hiển thị</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
            <select
              value={formData.accountStatus}
              onChange={(e) => setFormData({...formData, accountStatus: e.target.value as 'active' | 'suspended' | 'pending_verification'})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Hoạt động</option>
              <option value="suspended">Tạm ngưng</option>
              <option value="pending_verification">Chờ xác minh</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              {user ? 'Cập nhật' : 'Mời'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Role Management Modal Component
function RoleManagementModal({
  user,
  userRoles,
  isOpen,
  onClose,
  onSave
}: {
  user: UnifiedUser
  userRoles: UserRole[]
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}) {
  const { hasPermission } = useSimpleAuth()
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedScope, setSelectedScope] = useState('')

  const availableRoles = [
    { value: 'farm_owner', label: 'Chủ trang trại' },
    { value: 'farm_manager', label: 'Quản lý trang trại' },
    { value: 'farm_viewer', label: 'Người xem' },
    { value: 'field_worker', label: 'Nhân viên thực địa' },
    { value: 'seasonal_worker', label: 'Công nhân mùa vụ' }
  ]

  const handleGrantRole = async () => {
    if (!selectedRole || !selectedScope) return
    
    try {
      // Grant role to user
      onSave()
    } catch (error) {
      console.error('Error granting role:', error)
    }
  }

  const handleRevokeRole = async (roleId: string) => {
    if (!confirm('Bạn có chắc chắn muốn thu hồi vai trò này?')) return
    
    try {
      // Revoke role from user
      onSave()
    } catch (error) {
      console.error('Error revoking role:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quản lý vai trò - {user.displayName}
        </h3>
        
        {/* Current Roles */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Vai trò hiện tại</h4>
          {userRoles.length === 0 ? (
            <p className="text-gray-500 text-sm">Chưa có vai trò nào</p>
          ) : (
            <div className="space-y-2">
              {userRoles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm font-medium">{getRoleDisplayName(role.roleType)}</span>
                    <span className="text-xs text-gray-500 ml-2">({role.scopeType})</span>
                  </div>
                  {hasPermission('manage_users') && (
                    <button
                      onClick={() => handleRevokeRole(role.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Thu hồi
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grant New Role */}
        {hasPermission('manage_users') && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Cấp vai trò mới</h4>
            <div className="space-y-3">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Chọn vai trò...</option>
                {availableRoles.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="ID phạm vi (farm ID, zone ID...)"
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleGrantRole}
                disabled={!selectedRole || !selectedScope}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 rounded-md"
              >
                Cấp vai trò
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

function getRoleDisplayName(roleType: string): string {
  const roleNames: {[key: string]: string} = {
    'super_admin': 'Quản trị hệ thống',
    'organization_admin': 'Quản trị tổ chức', 
    'farm_owner': 'Chủ trang trại',
    'farm_manager': 'Quản lý trang trại',
    'farm_viewer': 'Người xem',
    'field_worker': 'Nhân viên thực địa',
    'seasonal_worker': 'Công nhân mùa vụ'
  }
  return roleNames[roleType] || roleType
}