'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth, SimpleUser, SimpleFarm, FarmRole } from '@/lib/optimized-auth-context'
import { simpleAuthService } from '@/lib/simple-auth-service'
import { 
  UsersIcon, 
  MapIcon,
  PlusIcon, 
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface FarmAssignment {
  id: string
  userId: string
  farmId: string
  role: FarmRole
  assignedBy: string
  assignedAt: Date
  isActive: boolean
  user?: SimpleUser
  farm?: SimpleFarm
}

interface AssignmentStats {
  totalAssignments: number
  activeAssignments: number
  uniqueUsers: number
  uniqueFarms: number
}

export default function SimpleFarmAssignmentSystem() {
  const { user: currentUser, isAdmin } = useSimpleAuth()
  const [assignments, setAssignments] = useState<FarmAssignment[]>([])
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [farms, setFarms] = useState<SimpleFarm[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SimpleUser | null>(null)
  const [selectedFarm, setSelectedFarm] = useState<SimpleFarm | null>(null)
  const [selectedRole, setSelectedRole] = useState<FarmRole>('viewer')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<FarmRole | 'all'>('all')
  const [stats, setStats] = useState<AssignmentStats>({
    totalAssignments: 0,
    activeAssignments: 0,
    uniqueUsers: 0,
    uniqueFarms: 0
  })

  useEffect(() => {
    if (currentUser && isAdmin()) {
      loadData()
    }
  }, [currentUser, isAdmin])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadAssignments(),
        loadUsers(),
        loadFarms()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    try {
      const accessRef = collection(db, 'farmAccess')
      const accessSnapshot = await getDocs(accessRef)
      
      const assignmentPromises = accessSnapshot.docs.map(async (accessDoc) => {
        const data = accessDoc.data()
        
        // Load user and farm details
        const [userDoc, farmDoc] = await Promise.all([
          getDoc(doc(db, 'users', data.userId)),
          getDoc(doc(db, 'farms', data.farmId))
        ])

        const assignment: FarmAssignment = {
          id: accessDoc.id,
          userId: data.userId,
          farmId: data.farmId,
          role: data.role,
          assignedBy: data.grantedBy,
          assignedAt: data.grantedAt?.toDate ? data.grantedAt.toDate() : (data.grantedAt || new Date()),
          isActive: data.isActive,
          user: userDoc.exists() ? {
            ...userDoc.data(),
            uid: userDoc.id,
            createdAt: userDoc.data().createdAt?.toDate ? userDoc.data().createdAt.toDate() : (userDoc.data().createdAt || new Date())
          } as SimpleUser : undefined,
          farm: farmDoc.exists() ? {
            ...farmDoc.data(),
            id: farmDoc.id,
            createdDate: farmDoc.data().createdDate?.toDate ? farmDoc.data().createdDate.toDate() : (farmDoc.data().createdDate || new Date())
          } as SimpleFarm : undefined
        }
        
        return assignment
      })

      const assignmentsData = await Promise.all(assignmentPromises)
      setAssignments(assignmentsData)
      
      // Calculate stats
      const activeAssignments = assignmentsData.filter(a => a.isActive)
      const uniqueUsers = new Set(assignmentsData.map(a => a.userId)).size
      const uniqueFarms = new Set(assignmentsData.map(a => a.farmId)).size

      setStats({
        totalAssignments: assignmentsData.length,
        activeAssignments: activeAssignments.length,
        uniqueUsers,
        uniqueFarms
      })
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users')
      const usersSnapshot = await getDocs(usersRef)
      
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          uid: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date())
        }
      }) as SimpleUser[]
      
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadFarms = async () => {
    try {
      const farmsRef = collection(db, 'farms')
      const farmsSnapshot = await getDocs(farmsRef)
      
      const farmsData = farmsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : (data.createdDate || new Date())
        }
      }) as SimpleFarm[]
      
      setFarms(farmsData)
    } catch (error) {
      console.error('Error loading farms:', error)
    }
  }

  const handleAssignUser = async () => {
    if (!selectedUser || !selectedFarm || !currentUser) return

    try {
      await simpleAuthService.grantFarmAccess(
        selectedFarm.id,
        selectedUser.uid,
        selectedRole,
        currentUser.uid
      )
      
      console.log(`✅ Assigned ${selectedUser.email} as ${selectedRole} to ${selectedFarm.name}`)
      
      // Reload data
      await loadAssignments()
      
      // Reset form
      setShowAssignModal(false)
      setSelectedUser(null)
      setSelectedFarm(null)
      setSelectedRole('viewer')
    } catch (error) {
      console.error('Error assigning user:', error)
      alert('Failed to assign user. Please try again.')
    }
  }

  const handleRevokeAccess = async (assignment: FarmAssignment) => {
    if (!confirm(`Revoke ${assignment.user?.email}'s access to ${assignment.farm?.name}?`)) {
      return
    }

    try {
      await simpleAuthService.revokeFarmAccess(assignment.farmId, assignment.userId)
      console.log(`✅ Revoked access for ${assignment.user?.email}`)
      
      // Reload data
      await loadAssignments()
    } catch (error) {
      console.error('Error revoking access:', error)
      alert('Failed to revoke access. Please try again.')
    }
  }

  const handleUpdateRole = async (assignment: FarmAssignment, newRole: FarmRole) => {
    try {
      await simpleAuthService.updateFarmAccess(assignment.farmId, assignment.userId, newRole)
      console.log(`✅ Updated ${assignment.user?.email} role to ${newRole}`)
      
      // Reload data
      await loadAssignments()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role. Please try again.')
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = !searchTerm || 
      assignment.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.farm?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || assignment.role === filterRole
    
    return matchesSearch && matchesRole
  })

  const getRoleColor = (role: FarmRole) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: FarmRole) => {
    switch (role) {
      case 'owner': return 'Chủ trại'
      case 'manager': return 'Quản lý'
      case 'viewer': return 'Xem'
      default: return role
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Quản lý phân quyền nông trại</h2>
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
          <h2 className="text-2xl font-bold text-gray-900">Quản lý phân quyền nông trại</h2>
          <p className="text-gray-600">Gán và quản lý quyền truy cập nông trại cho người dùng</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Gán quyền mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng phân quyền</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAssignments}</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đang hoạt động</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeAssignments}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Người dùng</p>
              <p className="text-3xl font-bold text-purple-600">{stats.uniqueUsers}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Nông trại</p>
              <p className="text-3xl font-bold text-orange-600">{stats.uniqueFarms}</p>
            </div>
            <MapIcon className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm người dùng hoặc nông trại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as FarmRole | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="owner">Chủ trại</option>
              <option value="manager">Quản lý</option>
              <option value="viewer">Xem</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Danh sách phân quyền ({filteredAssignments.length})
          </h3>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có phân quyền nào</h3>
            <p className="text-gray-600">Chưa có phân quyền nào được tạo hoặc không khớp với bộ lọc.</p>
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
                    Nông trại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày gán
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {assignment.user?.displayName?.charAt(0) || assignment.user?.email?.charAt(0) || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.user?.displayName || 'Không có tên'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {assignment.user?.email || 'Không có email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.farm?.name || 'Nông trại không xác định'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.farm?.ownerName || 'Không có chủ'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={assignment.role}
                        onChange={(e) => handleUpdateRole(assignment, e.target.value as FarmRole)}
                        className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${getRoleColor(assignment.role)}`}
                        disabled={assignment.role === 'owner' && assignment.userId === assignment.farm?.id} // Prevent owner from changing their own role
                      >
                        <option value="owner">Chủ trại</option>
                        <option value="manager">Quản lý</option>
                        <option value="viewer">Xem</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assignment.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Đã hủy
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.assignedAt.toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {assignment.isActive && (
                        <button
                          onClick={() => handleRevokeAccess(assignment)}
                          className="text-red-600 hover:text-red-900 ml-2"
                          disabled={assignment.role === 'owner'} // Prevent revoking owner access
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gán quyền truy cập</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn người dùng
                </label>
                <select
                  value={selectedUser?.uid || ''}
                  onChange={(e) => {
                    const user = users.find(u => u.uid === e.target.value)
                    setSelectedUser(user || null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Chọn người dùng --</option>
                  {users.map(user => (
                    <option key={user.uid} value={user.uid}>
                      {user.displayName || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nông trại
                </label>
                <select
                  value={selectedFarm?.id || ''}
                  onChange={(e) => {
                    const farm = farms.find(f => f.id === e.target.value)
                    setSelectedFarm(farm || null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Chọn nông trại --</option>
                  {farms.map(farm => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
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
                  onChange={(e) => setSelectedRole(e.target.value as FarmRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="viewer">Xem - Chỉ xem thông tin</option>
                  <option value="manager">Quản lý - Xem và chỉnh sửa</option>
                  <option value="owner">Chủ trại - Toàn quyền</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedUser(null)
                  setSelectedFarm(null)
                  setSelectedRole('viewer')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleAssignUser}
                disabled={!selectedUser || !selectedFarm}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Gán quyền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}