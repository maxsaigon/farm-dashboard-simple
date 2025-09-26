'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth, SimpleUser } from '@/lib/simple-auth-context'
import { simpleAuthService } from '@/lib/simple-auth-service'
import {
  UsersIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { validateUserInput, rateLimiter, canPerformAdminOperation } from '@/lib/validation-utils'

interface UserStats {
  totalUsers: number
  verifiedUsers: number
  recentUsers: number
  adminUsers: number
}

export default function SimpleUserManagement() {
  const { user: currentUser, isAdmin } = useSimpleAuth()
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SimpleUser | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const usersPerPage = 20 // Limit to 20 users per page for performance
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    verifiedUsers: 0,
    recentUsers: 0,
    adminUsers: 0
  })

  useEffect(() => {
    if (currentUser && isAdmin()) {
      loadUsers(currentPage)
    }
  }, [currentUser, isAdmin, currentPage])

  const loadUsers = async (page: number = 1) => {
    setLoading(true)
    try {
      const usersRef = collection(db, 'users')
      const usersSnapshot = await getDocs(usersRef)

      const allUsersData = usersSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          uid: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
          lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : data.lastLoginAt
        }
      }) as SimpleUser[]

      // Calculate stats from all users
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const verifiedUsers = allUsersData.filter(u => u.emailVerified).length
      const recentUsers = allUsersData.filter(u => u.createdAt > thirtyDaysAgo).length
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@farm.com'
      const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID || 'O6aFgoNhDigSIXk6zdYSDrFWhWG2'
      const adminUsers = allUsersData.filter(u =>
        (u.email && u.email === adminEmail) || (u.uid && u.uid === adminUid)
      ).length

      setStats({
        totalUsers: allUsersData.length,
        verifiedUsers,
        recentUsers,
        adminUsers
      })

      // Calculate pagination
      const totalPages = Math.ceil(allUsersData.length / usersPerPage)
      setTotalPages(totalPages)

      // Get users for current page
      const startIndex = (page - 1) * usersPerPage
      const endIndex = startIndex + usersPerPage
      const pageUsers = allUsersData.slice(startIndex, endIndex)

      setUsers(pageUsers)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (userId: string, updates: Partial<SimpleUser>) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, updates)
      
      console.log(`✅ Updated user ${userId}`)
      await loadUsers() // Reload users
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user. Please try again.')
    }
  }

  const handleDeleteUser = async (user: SimpleUser) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa người dùng ${user.email}? Hành động này không thể hoàn tác.`)) {
      return
    }

    // Rate limiting for delete operations
    if (!rateLimiter.isAllowed(`delete_user_${currentUser?.uid}`, 2, 300000)) { // 2 per 5 minutes
      alert('Quá nhiều yêu cầu xóa. Vui lòng thử lại sau.')
      return
    }

    // Check admin permission
    if (!canPerformAdminOperation(currentUser?.uid || '', 'user_delete')) {
      alert('Không có quyền xóa người dùng.')
      return
    }

    // Prevent self-deletion
    if (user.uid === currentUser?.uid) {
      alert('Không thể tự xóa tài khoản của chính mình.')
      return
    }

    try {
      const userRef = doc(db, 'users', user.uid)
      await deleteDoc(userRef)

      console.log(`✅ Deleted user ${user.email}`)
      await loadUsers() // Reload users
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user. Please try again.')
    }
  }

  const handleSendInvitation = async () => {
    if (!newUserEmail || !newUserName) {
      alert('Vui lòng nhập đầy đủ email và tên người dùng.')
      return
    }

    // Rate limiting
    if (!rateLimiter.isAllowed(`invite_${currentUser?.uid}`, 3, 60000)) {
      alert('Quá nhiều yêu cầu. Vui lòng thử lại sau.')
      return
    }

    // Validate input
    const validation = validateUserInput({
      email: newUserEmail,
      displayName: newUserName
    })

    if (!validation.isValid) {
      alert(`Lỗi xác thực: ${validation.errors.join(', ')}`)
      return
    }

    // Check admin permission
    if (!canPerformAdminOperation(currentUser?.uid || '', 'user_management')) {
      alert('Không có quyền thực hiện thao tác này.')
      return
    }

    try {
      // In a real app, you would send an email invitation here
      console.log(`📧 Sending invitation to ${validation.sanitized.email}`)
      alert(`Đã gửi lời mời đến ${validation.sanitized.email}`)

      setShowAddModal(false)
      setNewUserEmail('')
      setNewUserName('')
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Failed to send invitation. Please try again.')
    }
  }

  const filteredUsers = users.filter(user => 
    !searchTerm || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 ngày trước'
    if (diffDays < 30) return `${diffDays} ngày trước`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`
    return `${Math.floor(diffDays / 365)} năm trước`
  }

  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-600">Bạn cần quyền super admin để sử dụng tính năng này.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h2>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h2>
          <p className="text-gray-600">Xem và quản lý tất cả người dùng trong hệ thống</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <UserPlusIcon className="h-5 w-5" />
          <span>Mời người dùng</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng người dùng</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đã xác thực</p>
              <p className="text-3xl font-bold text-green-600">{stats.verifiedUsers}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mới (30 ngày)</p>
              <p className="text-3xl font-bold text-purple-600">{stats.recentUsers}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Quản trị viên</p>
              <p className="text-3xl font-bold text-red-600">{stats.adminUsers}</p>
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm người dùng theo email hoặc tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Danh sách người dùng ({filteredUsers.length} / {stats.totalUsers})
          </h3>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có người dùng nào</h3>
            <p className="text-gray-600">Chưa có người dùng nào hoặc không khớp với tìm kiếm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Người dùng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngôn ngữ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tạo lúc
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Đăng nhập cuối
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || 'Không có tên'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email || 'Không có email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {user.emailVerified ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            ✓ Đã xác thực
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            ⏳ Chưa xác thực
                          </span>
                        )}
                        {((user.email && user.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@farm.com')) ||
                          (user.uid && user.uid === (process.env.NEXT_PUBLIC_ADMIN_UID || 'O6aFgoNhDigSIXk6zdYSDrFWhWG2'))) && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            👑 Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.preferredLanguage === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{user.createdAt.toLocaleDateString('vi-VN')}</div>
                      <div className="text-xs text-gray-400">{getTimeAgo(user.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt ? (
                        <div>
                          <div>{user.lastLoginAt.toLocaleDateString('vi-VN')}</div>
                          <div className="text-xs text-gray-400">{getTimeAgo(user.lastLoginAt)}</div>
                        </div>
                      ) : (
                        'Chưa đăng nhập'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Xem chi tiết"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-900"
                          title="Xóa người dùng"
                          disabled={user.uid === currentUser?.uid} // Prevent self-deletion
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
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị <span className="font-medium">{(currentPage - 1) * usersPerPage + 1}</span> đến{' '}
                <span className="font-medium">{Math.min(currentPage * usersPerPage, stats.totalUsers)}</span> trong tổng số{' '}
                <span className="font-medium">{stats.totalUsers}</span> người dùng
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Trước</span>
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === currentPage
                          ? 'z-10 bg-green-50 border-green-500 text-green-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Sau</span>
                  ›
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mời người dùng mới</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="nguoidung@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewUserEmail('')
                  setNewUserName('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSendInvitation}
                disabled={!newUserEmail || !newUserName}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <EnvelopeIcon className="h-4 w-4" />
                <span>Gửi lời mời</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Chi tiết người dùng</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-xl font-medium text-gray-700">
                    {selectedUser.displayName?.charAt(0) || selectedUser.email?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {selectedUser.displayName || 'Không có tên'}
                  </h4>
                  <p className="text-gray-600">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Trạng thái:</span>
                  <div className="mt-1">
                    {selectedUser.emailVerified ? (
                      <span className="text-green-600">✓ Đã xác thực</span>
                    ) : (
                      <span className="text-yellow-600">⏳ Chưa xác thực</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Ngôn ngữ:</span>
                  <div className="mt-1 text-gray-600">
                    {selectedUser.preferredLanguage === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}
                  </div>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Múi giờ:</span>
                  <div className="mt-1 text-gray-600">{selectedUser.timezone}</div>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Số điện thoại:</span>
                  <div className="mt-1 text-gray-600">{selectedUser.phoneNumber || 'Chưa có'}</div>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Tạo lúc:</span>
                  <div className="mt-1 text-gray-600">
                    {selectedUser.createdAt.toLocaleDateString('vi-VN')}
                  </div>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Đăng nhập cuối:</span>
                  <div className="mt-1 text-gray-600">
                    {selectedUser.lastLoginAt ? 
                      selectedUser.lastLoginAt.toLocaleDateString('vi-VN') : 
                      'Chưa đăng nhập'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}