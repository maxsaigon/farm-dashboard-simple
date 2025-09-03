'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { EnhancedUser, UserRole, EnhancedFarm } from '@/lib/types-enhanced'
import { AdminService } from '@/lib/admin-service'

interface UserManagementProps {
  searchQuery: string
}

export function UserManagement({ searchQuery }: UserManagementProps) {
  const [users, setUsers] = useState<EnhancedUser[]>([])
  const [farms, setFarms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null)
  const [showAssignFarmModal, setShowAssignFarmModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load users and farms
      const [usersData, farmsData] = await Promise.all([
        AdminService.getAllUsers(),
        AdminService.getAllFarms()
      ])
      setUsers(usersData)
      setFarms(farmsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAssignFarm = (user: EnhancedUser) => {
    setSelectedUser(user)
    setShowAssignFarmModal(true)
  }

  const handleEditUser = (user: EnhancedUser) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleDeleteUser = async (user: EnhancedUser) => {
    if (confirm(`Bạn có chắc chắn muốn xóa người dùng "${user.displayName || user.email}"?`)) {
      try {
        await AdminService.deleteUser(user.uid)
        loadData() // Reload the user list
      } catch (error) {
        console.error('Error deleting user:', error)
        alert('Có lỗi xảy ra khi xóa người dùng')
      }
    }
  }

  const handleRemoveFromFarm = async (user: EnhancedUser) => {
    const farmName = farms.find(f => f.id === user.currentFarmId)?.name || 'nông trại'
    if (confirm(`Bạn có chắc chắn muốn gỡ "${user.displayName || user.email}" khỏi ${farmName}?`)) {
      try {
        await AdminService.removeUserFromFarm(user.uid)
        loadData() // Reload the user list
      } catch (error) {
        console.error('Error removing user from farm:', error)
        alert('Có lỗi xảy ra khi gỡ người dùng khỏi nông trại')
      }
    }
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'super_admin':
        return { text: 'Super Admin', color: 'bg-red-100 text-red-800' }
      case 'organization_admin':
        return { text: 'Org Admin', color: 'bg-blue-100 text-blue-800' }
      case 'farm_owner':
        return { text: 'Chủ Nông Trại', color: 'bg-green-100 text-green-800' }
      case 'farm_manager':
        return { text: 'Quản Lý', color: 'bg-yellow-100 text-yellow-800' }
      case 'farm_worker':
        return { text: 'Nhân Viên', color: 'bg-gray-100 text-gray-800' }
      default:
        return { text: 'User', color: 'bg-gray-100 text-gray-800' }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quản lý người dùng</h2>
          <p className="text-gray-600 mt-1">Quản lý tài khoản và phân quyền người dùng</p>
        </div>
        <button
          onClick={() => {
            setSelectedUser(null)
            setShowUserModal(true)
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Thêm người dùng
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Danh sách người dùng ({filteredUsers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liên hệ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nông trại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const primaryRole = user.roles?.[0] || 'user'
                const roleDisplay = getRoleDisplay(primaryRole)
                
                return (
                  <tr key={user.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.photoURL ? (
                            <img 
                              className="h-10 w-10 rounded-full" 
                              src={user.photoURL} 
                              alt={user.displayName || 'User'} 
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || 'Chưa có tên'}
                          </div>
                          <div className="text-sm text-gray-500">ID: {user.uid.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900">
                          <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                        {user.phoneNumber && (
                          <div className="flex items-center text-sm text-gray-500">
                            <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                            {user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleDisplay.color}`}>
                        {roleDisplay.text}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.currentFarmId ? (
                        <div className="flex items-center">
                          <BuildingStorefrontIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span title={`Farm ID: ${user.currentFarmId}`}>
                            {farms.find(f => f.id === user.currentFarmId)?.name || `Farm ${user.currentFarmId.slice(0, 8)}...`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Chưa được gán</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive !== false ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {user.currentFarmId ? (
                        <button
                          onClick={() => handleRemoveFromFarm(user)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Gỡ khỏi nông trại"
                        >
                          <BuildingStorefrontIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssignFarm(user)}
                          className="text-green-600 hover:text-green-900"
                          title="Gán nông trại"
                        >
                          <BuildingStorefrontIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Chỉnh sửa"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      {user.roles?.[0] !== 'super_admin' && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-900"
                          title="Xóa"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Không có người dùng</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có người dùng nào trong hệ thống'}
            </p>
          </div>
        )}
      </div>

      {/* Farm Assignment Modal */}
      {showAssignFarmModal && selectedUser && (
        <FarmAssignmentModal
          user={selectedUser}
          farms={farms}
          onClose={() => {
            setShowAssignFarmModal(false)
            setSelectedUser(null)
          }}
          onSuccess={() => {
            loadData()
            setShowAssignFarmModal(false)
            setSelectedUser(null)
          }}
        />
      )}

      {/* User Edit Modal */}
      {showUserModal && (
        <UserEditModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false)
            setSelectedUser(null)
          }}
          onSuccess={() => {
            loadData()
            setShowUserModal(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}

// Farm Assignment Modal Component
interface FarmAssignmentModalProps {
  user: EnhancedUser
  farms: any[]
  onClose: () => void
  onSuccess: () => void
}

function FarmAssignmentModal({ user, farms, onClose, onSuccess }: FarmAssignmentModalProps) {
  const [selectedFarmId, setSelectedFarmId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<string>('farm_worker')
  const [loading, setLoading] = useState(false)

  const handleAssign = async () => {
    if (!selectedFarmId) return

    setLoading(true)
    try {
      await AdminService.assignUserToFarm(user.uid, selectedFarmId, selectedRole as any)
      onSuccess()
    } catch (error) {
      console.error('Error assigning farm:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Gán nông trại cho {user.displayName || user.email}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn nông trại
            </label>
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Chọn nông trại...</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} {farm.ownerName ? `- ${farm.ownerName}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vai trò
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="farm_worker">Nhân viên</option>
              <option value="farm_manager">Quản lý</option>
              <option value="farm_owner">Chủ nông trại</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Hủy
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedFarmId || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xử lý...' : 'Gán nông trại'}
          </button>
        </div>
      </div>
    </div>
  )
}

// User Edit Modal Component
interface UserEditModalProps {
  user: EnhancedUser | null
  onClose: () => void
  onSuccess: () => void
}

function UserEditModal({ user, onClose, onSuccess }: UserEditModalProps) {
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    isActive: user?.isActive !== false
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (user) {
        await AdminService.updateUser(user.uid, formData)
      } else {
        await AdminService.createUser(formData)
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving user:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {user ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên hiển thị
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Nhập tên hiển thị"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Nhập email"
              required
              disabled={!!user} // Disable email editing for existing users
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Tài khoản hoạt động
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : (user ? 'Cập nhật' : 'Tạo mới')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}