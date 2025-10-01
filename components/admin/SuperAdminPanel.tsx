'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheckIcon, UserPlusIcon,
  CheckIcon, XMarkIcon, Cog6ToothIcon,
  ChartBarIcon, UsersIcon, BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { collection, query, where, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface RoleChangeRequest {
  id: string
  userId: string
  userName: string
  currentRole: string
  requestedRole: string
  requestDate: string
  status: 'pending' | 'approved' | 'rejected'
}

interface SystemStats {
  totalUsers: number
  totalFarms: number
  activeUsers: number
  systemHealth: 'good' | 'warning' | 'critical'
}

export default function SuperAdminPanel() {
  const [roleRequests, setRoleRequests] = useState<RoleChangeRequest[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    totalFarms: 0,
    activeUsers: 0,
    systemHealth: 'good'
  })
  const [systemSettings, setSystemSettings] = useState({
    allowSelfRegistration: true,
    requireEmailVerification: true,
    maxFarmsPerUser: 5,
    enableAuditLogging: true,
    maintenanceMode: false
  })
  const [showRoleAssignment, setShowRoleAssignment] = useState(false)
  const [selectedUserForRole, setSelectedUserForRole] = useState<any>(null)
  const [availableFarms, setAvailableFarms] = useState<any[]>([])
  const [userFarmAccess, setUserFarmAccess] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllUsers()
    loadSystemStats()
    loadFarms()
  }, [])

  const loadFarms = async () => {
    try {
      const farmsQuery = query(collection(db, 'farms'))
      const farmsSnapshot = await getDocs(farmsQuery)
      const farmsData = farmsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        name: doc.data().name || 'Nông trại không tên'
      }))
      setAvailableFarms(farmsData)
    } catch (error) {
      console.error('Error loading farms:', error)
    }
  }

  const loadUserFarmAccess = async (userId: string) => {
    try {
      const accessQuery = query(
        collection(db, 'userFarmAccess'),
        where('userId', '==', userId)
      )
      const accessSnapshot = await getDocs(accessQuery)
      const accessData = accessSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setUserFarmAccess(accessData)
    } catch (error) {
      console.error('Error loading user farm access:', error)
    }
  }

  const grantFarmAccess = async (userId: string, farmId: string, role: string) => {
    try {
      const accessRef = doc(collection(db, 'userFarmAccess'))
      await setDoc(accessRef, {
        id: accessRef.id,
        userId,
        farmId,
        role,
        permissions: role === 'manager' ?
          ['read', 'write', 'manage_zones', 'manage_investments'] :
          ['read'],
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Reload user farm access
      await loadUserFarmAccess(userId)
      alert('Đã cấp quyền truy cập nông trại thành công!')
    } catch (error) {
      console.error('Error granting farm access:', error)
      alert('Lỗi khi cấp quyền. Vui lòng thử lại.')
    }
  }

  const revokeFarmAccess = async (accessId: string, userId: string) => {
    try {
      await deleteDoc(doc(db, 'userFarmAccess', accessId))
      await loadUserFarmAccess(userId)
      alert('Đã thu hồi quyền truy cập!')
    } catch (error) {
      console.error('Error revoking farm access:', error)
      alert('Lỗi khi thu hồi quyền. Vui lòng thử lại.')
    }
  }

  const openRoleAssignment = (user: any) => {
    setSelectedUserForRole(user)
    loadUserFarmAccess(user.id)
    setShowRoleAssignment(true)
  }

  const loadAllUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'))
      const usersSnapshot = await getDocs(usersQuery)

      const usersData: any[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()

        // Skip super admin users from role assignment
        if (userData.email === 'admin@farm.com' || userDoc.id === 'O6aFgoNhDigSIXk6zdYSDrFWhWG2') {
          continue
        }

        usersData.push({
          id: userDoc.id,
          name: userData.displayName || 'No Name',
          email: userData.email || '',
          status: userData.accountStatus || 'active',
          role: 'farm_viewer' // Default role for display
        })
      }

      setAllUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadRoleRequests = async () => {
    try {
      // For now, we'll use a simple approach to find role requests
      // In a real implementation, you might have a dedicated collection for role requests
      const usersQuery = query(collection(db, 'users'))
      const usersSnapshot = await getDocs(usersQuery)

      const requests: RoleChangeRequest[] = []

      // This is a simplified approach - in reality you might have a separate
      // collection for role change requests or check user roles for pending changes
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        if (userData.accountStatus === 'pending_verification') {
          requests.push({
            id: userDoc.id,
            userId: userDoc.id,
            userName: userData.displayName || userData.email || 'Unknown User',
            currentRole: 'none',
            requestedRole: 'farm_viewer', // Default role for new users
            requestDate: userData.createdAt?.toDate?.()?.toLocaleDateString('vi-VN') || 'Unknown',
            status: 'pending'
          })
        }
      }

      setRoleRequests(requests)
    } catch (error) {
      console.error('Error loading role requests:', error)
    }
  }

  const loadSystemStats = async () => {
    try {
      setLoading(true)

      // Load users stats
      const usersQuery = query(collection(db, 'users'))
      const usersSnapshot = await getDocs(usersQuery)
      const totalUsers = usersSnapshot.size
      const activeUsers = usersSnapshot.docs.filter(doc => {
        const data = doc.data()
        return data.accountStatus === 'active' || !data.accountStatus
      }).length

      // Load farms stats
      const farmsQuery = query(collection(db, 'farms'))
      const farmsSnapshot = await getDocs(farmsQuery)
      const totalFarms = farmsSnapshot.size

      setSystemStats({
        totalUsers,
        totalFarms,
        activeUsers,
        systemHealth: 'good' // This would come from system monitoring service
      })
    } catch (error) {
      console.error('Error loading system stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setRoleRequests(prev =>
      prev.map(req =>
        req.id === requestId
          ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' }
          : req
      )
    )
  }

  const toggleSetting = (setting: keyof typeof systemSettings) => {
    setSystemSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <ShieldCheckIcon className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold">Super Admin Panel</h2>
            <p className="text-gray-600">Quản lý hệ thống và phân quyền cao cấp</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải dữ liệu hệ thống...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <ShieldCheckIcon className="h-8 w-8 text-purple-600 mr-3" />
        <div>
          <h2 className="text-2xl font-bold">Super Admin Panel</h2>
          <p className="text-gray-600">Quản lý hệ thống và phân quyền cao cấp</p>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-2xl font-bold">{systemStats.totalUsers}</p>
              <p className="text-gray-600">Tổng người dùng</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-2xl font-bold">{systemStats.totalFarms}</p>
              <p className="text-gray-600">Tổng nông trại</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-2xl font-bold">{systemStats.activeUsers}</p>
              <p className="text-gray-600">Đang hoạt động</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              systemStats.systemHealth === 'good' ? 'bg-green-500' :
              systemStats.systemHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <div>
              <p className="font-bold">Hệ thống</p>
              <p className="text-gray-600 capitalize">{systemStats.systemHealth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Change Requests */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Yêu cầu thay đổi vai trò</h3>
        </div>
        <div className="divide-y">
          {roleRequests.length > 0 ? (
            roleRequests.map((request) => (
              <div key={request.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{request.userName}</p>
                    <p className="text-sm text-gray-600">
                      {request.currentRole.replace('_', ' ')} → {request.requestedRole.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">{request.requestDate}</p>
                  </div>
                  {request.status === 'pending' ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRoleRequest(request.id, 'approve')}
                        className="p-2 bg-green-100 text-green-600 rounded-lg"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRoleRequest(request.id, 'reject')}
                        className="p-2 bg-red-100 text-red-600 rounded-lg"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      request.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {request.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-gray-500">Không có yêu cầu thay đổi vai trò nào</p>
            </div>
          )}
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Cài đặt hệ thống</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Cho phép tự đăng ký</span>
              <p className="text-sm text-gray-600">Người dùng có thể tự tạo tài khoản</p>
            </div>
            <button
              onClick={() => toggleSetting('allowSelfRegistration')}
              className={`w-12 h-6 rounded-full transition-colors ${
                systemSettings.allowSelfRegistration ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                systemSettings.allowSelfRegistration ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Yêu cầu xác thực email</span>
              <p className="text-sm text-gray-600">Bắt buộc xác thực email khi đăng ký</p>
            </div>
            <button
              onClick={() => toggleSetting('requireEmailVerification')}
              className={`w-12 h-6 rounded-full transition-colors ${
                systemSettings.requireEmailVerification ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                systemSettings.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Ghi log kiểm toán</span>
              <p className="text-sm text-gray-600">Theo dõi tất cả hoạt động admin</p>
            </div>
            <button
              onClick={() => toggleSetting('enableAuditLogging')}
              className={`w-12 h-6 rounded-full transition-colors ${
                systemSettings.enableAuditLogging ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                systemSettings.enableAuditLogging ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Số nông trại tối đa mỗi người dùng
            </label>
            <input
              type="number"
              value={systemSettings.maxFarmsPerUser}
              onChange={(e) => setSystemSettings(prev => ({
                ...prev,
                maxFarmsPerUser: parseInt(e.target.value)
              }))}
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Farm Access Management */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Quản lý quyền truy cập nông trại</h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {allUsers.length > 0 ? (
              allUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">Trạng thái: {user.status}</p>
                  </div>
                  <button
                    onClick={() => openRoleAssignment(user)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    Phân quyền
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Đang tải danh sách người dùng...</p>
              </div>
            )}
            {allUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Đang tải danh sách người dùng...</p>
              </div>
            )}
          </div>

          {allUsers.length > 5 && (
            <div className="mt-4 text-center">
              <button className="text-blue-600 text-sm hover:text-blue-800">
                Xem tất cả {allUsers.length} người dùng →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="p-4 bg-purple-50 text-purple-700 rounded-lg">
          <UserPlusIcon className="h-6 w-6 mx-auto mb-2" />
          Tạo Admin mới
        </button>
        <button className="p-4 bg-blue-50 text-blue-700 rounded-lg">
          <ShieldCheckIcon className="h-6 w-6 mx-auto mb-2" />
          Kiểm tra bảo mật
        </button>
      </div>

      {/* Maintenance Mode Warning */}
      {systemSettings.maintenanceMode && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
            <span className="text-red-800 font-medium">Chế độ bảo trì đang bật</span>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleAssignment && selectedUserForRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                Phân quyền nông trại cho {selectedUserForRole.name}
              </h3>

              {/* Current Access */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Quyền truy cập hiện tại:</h4>
                <div className="space-y-2">
                  {userFarmAccess.map((access: any) => (
                    <div key={access.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {availableFarms.find(farm => farm.id === access.farmId)?.name || 'Nông trại không xác định'}
                        </p>
                        <p className="text-sm text-gray-600">Vai trò: {access.role}</p>
                      </div>
                      <button
                        onClick={() => revokeFarmAccess(access.id, selectedUserForRole.id)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm"
                      >
                        Thu hồi
                      </button>
                    </div>
                  ))}
                  {userFarmAccess.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Chưa có quyền truy cập nông trại nào</p>
                  )}
                </div>
              </div>

              {/* Grant New Access */}
              <div>
                <h4 className="font-medium mb-3">Cấp quyền truy cập mới:</h4>
                <div className="space-y-3">
                  {availableFarms
                    .filter(farm => !userFarmAccess.some((access: any) => access.farmId === farm.id))
                    .map((farm) => (
                    <div key={farm.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{farm.name}</p>
                        <p className="text-sm text-gray-600">
                          {farm.totalArea || 0} ha • {farm.centerLatitude ? 'Có vị trí' : 'Chưa có vị trí'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => grantFarmAccess(selectedUserForRole.id, farm.id, 'viewer')}
                          className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-sm"
                        >
                          Viewer
                        </button>
                        <button
                          onClick={() => grantFarmAccess(selectedUserForRole.id, farm.id, 'manager')}
                          className="px-3 py-1 bg-green-100 text-green-600 rounded-lg text-sm"
                        >
                          Manager
                        </button>
                      </div>
                    </div>
                  ))}
                  {availableFarms.filter(farm => !userFarmAccess.some((access: any) => access.farmId === farm.id)).length === 0 && (
                    <p className="text-gray-500 text-center py-4">Đã có quyền truy cập tất cả nông trại</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRoleAssignment(false)
                    setSelectedUserForRole(null)
                    setUserFarmAccess([])
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}