'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon,
  PencilIcon, TrashIcon, EyeIcon
} from '@heroicons/react/24/outline'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { EnhancedUser, UserRole } from '@/lib/types-enhanced'

interface MobileUser {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'suspended' | 'pending'
  farms: number
  lastLogin: string
  userRoles: UserRole[]
}

export default function UserManagementMobile() {
  const [users, setUsers] = useState<MobileUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<MobileUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUser, setSelectedUser] = useState<MobileUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    phoneNumber: '',
    initialRole: 'farm_viewer'
  })
  const [editingUser, setEditingUser] = useState<MobileUser | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, selectedRole])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const usersQuery = query(collection(db, 'users'))
      const usersSnapshot = await getDocs(usersQuery)

      const usersData: MobileUser[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as EnhancedUser

        // Load user roles
        const rolesQuery = query(
          collection(db, 'userRoles'),
          where('userId', '==', userDoc.id),
          where('isActive', '==', true)
        )
        const rolesSnapshot = await getDocs(rolesQuery)
        const userRoles = rolesSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          grantedAt: doc.data().grantedAt?.toDate() || new Date(),
          expiresAt: doc.data().expiresAt?.toDate(),
        })) as UserRole[]

        // Calculate farm count
        const farmCount = userRoles.filter(role => role.scopeType === 'farm').length

        // Get primary role
        const primaryRole = userRoles.length > 0 ? userRoles[0].roleType : 'none'

        // Map account status to mobile format
        let mobileStatus: 'active' | 'suspended' | 'pending' = 'active'
        if (userData.accountStatus === 'suspended') mobileStatus = 'suspended'
        else if (userData.accountStatus === 'pending_verification') mobileStatus = 'pending'

        const mobileUser: MobileUser = {
          id: userDoc.id,
          name: userData.displayName || 'No Name',
          email: userData.email || '',
          role: primaryRole,
          status: mobileStatus,
          farms: farmCount,
          lastLogin: userData.lastLoginAt ?
            new Date(userData.lastLoginAt).toLocaleDateString('vi-VN') :
            'Chưa đăng nhập',
          userRoles
        }

        usersData.push(mobileUser)
      }

      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        accountStatus: newStatus,
        updatedAt: new Date()
      })
      await loadUsers() // Reload users
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return

    try {
      // Delete user roles first
      const rolesQuery = query(
        collection(db, 'userRoles'),
        where('userId', '==', userId)
      )
      const rolesSnapshot = await getDocs(rolesQuery)

      for (const roleDoc of rolesSnapshot.docs) {
        await deleteDoc(roleDoc.ref)
      }

      // Delete user document
      await deleteDoc(doc(db, 'users', userId))

      await loadUsers() // Reload users
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const createUser = async () => {
    try {
      if (!newUser.email.trim() || !newUser.displayName.trim()) {
        alert('Vui lòng nhập đầy đủ thông tin')
        return
      }

      // Create user document in Firebase
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const userRef = doc(db, 'users', userId)

      await setDoc(userRef, {
        uid: userId,
        email: newUser.email.trim(),
        displayName: newUser.displayName.trim(),
        phoneNumber: newUser.phoneNumber.trim(),
        language: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        loginCount: 0,
        isEmailVerified: false,
        isPhoneVerified: false,
        accountStatus: 'pending_verification',
        twoFactorEnabled: false,
        preferences: {
          theme: 'light',
          language: 'vi-VN',
          notifications: {
            email: true,
            push: true,
            sms: false,
            harvestReminders: true,
            healthAlerts: true,
            systemUpdates: true
          },
          dashboard: {
            widgetLayout: [],
            chartPreferences: {}
          },
          privacy: {
            profileVisibility: 'organization',
            shareActivityData: true,
            allowDataExport: true
          }
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Grant initial role if specified
      if (newUser.initialRole !== 'none') {
        const roleRef = doc(collection(db, 'userRoles'))
        await setDoc(roleRef, {
          id: roleRef.id,
          userId,
          roleType: newUser.initialRole,
          scopeType: 'system',
          scopeId: 'default',
          permissions: [],
          grantedBy: 'admin', // Current admin user ID
          grantedAt: new Date(),
          isActive: true
        })
      }

      // Reset form and close modal
      setNewUser({
        email: '',
        displayName: '',
        phoneNumber: '',
        initialRole: 'farm_viewer'
      })
      setShowCreateModal(false)
      await loadUsers() // Reload users

      alert('Người dùng đã được tạo thành công!')
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Lỗi khi tạo người dùng. Vui lòng thử lại.')
    }
  }

  const editUser = async () => {
    if (!editingUser) return

    try {
      const userRef = doc(db, 'users', editingUser.id)
      await updateDoc(userRef, {
        displayName: editingUser.name,
        phoneNumber: editingUser.userRoles[0]?.metadata?.phoneNumber || '',
        accountStatus: editingUser.status === 'active' ? 'active' :
                      editingUser.status === 'suspended' ? 'suspended' : 'pending_verification',
        updatedAt: new Date()
      })

      setShowEditModal(false)
      setEditingUser(null)
      await loadUsers() // Reload users

      alert('Thông tin người dùng đã được cập nhật!')
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Lỗi khi cập nhật người dùng. Vui lòng thử lại.')
    }
  }

  const openEditModal = (user: MobileUser) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const UserCard = ({ user }: { user: MobileUser }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 font-semibold">
              {user.name.charAt(0)}
            </span>
          </div>
          <div className="ml-3">
            <h3 className="font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${
          user.status === 'active' ? 'bg-green-100 text-green-700' :
          user.status === 'suspended' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {user.status === 'active' ? 'Đang hoạt động' :
           user.status === 'suspended' ? 'Đã khóa' : 'Chờ xác thực'}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>🏷️ {user.role.replace('_', ' ')}</span>
        <span>🏭 {user.farms} nông trại</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Đăng nhập: {user.lastLogin}</span>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedUser(user)}
            className="p-2 text-blue-600"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => openEditModal(user)}
            className="p-2 text-green-600"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteUser(user.id)}
            className="p-2 text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Quản lý người dùng</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white p-2 rounded-lg"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg p-4">
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center w-full p-2 border rounded-lg text-gray-700"
        >
          <FunnelIcon className="h-5 w-5 mr-2" />
          Bộ lọc
          <span className="ml-auto text-gray-400">▼</span>
        </button>

        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <select
              className="w-full p-2 border rounded-lg"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="farm_manager">Farm Manager</option>
              <option value="farm_viewer">Farm Viewer</option>
              <option value="farm_owner">Farm Owner</option>
            </select>
          </div>
        )}
      </div>

      {/* User List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải danh sách người dùng...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Không tìm thấy người dùng nào</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))
          )}
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl text-green-600 font-semibold">
                    {selectedUser.name.charAt(0)}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-center mb-2">{selectedUser.name}</h3>
              <p className="text-gray-600 text-center mb-4">{selectedUser.email}</p>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vai trò:</span>
                  <span className="font-medium">{selectedUser.role.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trạng thái:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedUser.status === 'active' ? 'bg-green-100 text-green-700' :
                    selectedUser.status === 'suspended' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedUser.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nông trại:</span>
                  <span className="font-medium">{selectedUser.farms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Đăng nhập cuối:</span>
                  <span className="font-medium">{selectedUser.lastLogin}</span>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    openEditModal(selectedUser)
                    setSelectedUser(null)
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Tạo người dùng mới</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tên hiển thị</label>
                  <input
                    type="text"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Số điện thoại</label>
                  <input
                    type="tel"
                    value={newUser.phoneNumber}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                    placeholder="0123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Vai trò ban đầu</label>
                  <select
                    value={newUser.initialRole}
                    onChange={(e) => setNewUser(prev => ({ ...prev, initialRole: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="farm_viewer">Farm Viewer</option>
                    <option value="farm_manager">Farm Manager</option>
                    <option value="farm_owner">Farm Owner</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={createUser}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg"
                >
                  Tạo người dùng
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Chỉnh sửa người dùng</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tên hiển thị</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="w-full p-2 border rounded-lg bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Trạng thái</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="suspended">Đã khóa</option>
                    <option value="pending">Chờ xác thực</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Vai trò</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value } : null)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="farm_viewer">Farm Viewer</option>
                    <option value="farm_manager">Farm Manager</option>
                    <option value="farm_owner">Farm Owner</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={editUser}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg"
                >
                  Cập nhật
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}