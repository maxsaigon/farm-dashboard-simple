'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { EnhancedUser, EnhancedFarm, UserRole } from '@/lib/types-enhanced'
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

interface FarmAssignment {
  id: string
  userId: string
  farmId: string
  roleType: string
  assignedBy: string
  assignedAt: Date
  isActive: boolean
  user?: EnhancedUser
  farm?: EnhancedFarm
}

interface AssignmentStats {
  totalAssignments: number
  activeAssignments: number
  uniqueUsers: number
  uniqueFarms: number
}

export default function FarmAssignmentSystem() {
  const { user: currentUser } = useSimpleAuth()
  const [assignments, setAssignments] = useState<FarmAssignment[]>([])
  const [users, setUsers] = useState<EnhancedUser[]>([])
  const [farms, setFarms] = useState<EnhancedFarm[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null)
  const [selectedFarm, setSelectedFarm] = useState<EnhancedFarm | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [stats, setStats] = useState<AssignmentStats>({
    totalAssignments: 0,
    activeAssignments: 0,
    uniqueUsers: 0,
    uniqueFarms: 0
  })

  const [newAssignment, setNewAssignment] = useState({
    userId: '',
    farmId: '',
    roleType: 'farm_viewer',
    permissions: [] as string[]
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [assignments])

  const loadData = async () => {
    try {
      setLoading(true)
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
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const assignmentsQuery = query(
        collection(db, 'userRoles'),
        orderBy('grantedAt', 'desc')
      )

      const snapshot = await getDocs(assignmentsQuery)
      const assignmentsData: FarmAssignment[] = snapshot.docs
        .map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            userId: data.userId,
            farmId: data.scopeId || '',
            roleType: data.roleType,
            assignedBy: data.grantedBy,
            assignedAt: data.grantedAt?.toDate() || new Date(),
            isActive: data.isActive !== false
          }
        })
        .filter(assignment => assignment.farmId && assignment.farmId !== 'default_org')

      setAssignments(assignmentsData)
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const usersQuery = query(
        collection(db, 'users'),
        orderBy('displayName', 'asc')
      )

      const snapshot = await getDocs(usersQuery)
      const usersData: EnhancedUser[] = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          phoneNumber: data.phoneNumber || '',
          profilePicture: data.profilePicture || '',
          photoURL: data.photoURL || '',
          language: data.language || 'en',
          timezone: data.timezone || 'UTC',
          lastLoginAt: data.lastLoginAt?.toDate(),
          loginCount: data.loginCount || 0,
          isEmailVerified: data.isEmailVerified || false,
          isPhoneVerified: data.isPhoneVerified || false,
          accountStatus: data.accountStatus || 'active',
          twoFactorEnabled: data.twoFactorEnabled || false,
          preferences: data.preferences || {
            theme: 'light',
            language: 'en',
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
          currentFarmId: data.currentFarmId,
          roles: data.roles || [],
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
      })

      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadFarms = async () => {
    try {
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const farmsQuery = query(
        collection(db, 'farms'),
        orderBy('name', 'asc')
      )

      const snapshot = await getDocs(farmsQuery)
      const farmsData: EnhancedFarm[] = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || '',
          organizationId: data.organizationId || '',
          farmType: data.farmType || 'personal',
          status: data.status || 'active',
          settings: data.settings || {},
          contacts: data.contacts || [],
          boundaries: data.boundaries || [],
          zones: data.zones || [],
          certifications: data.certifications || [],
          metadata: data.metadata || {},
          createdDate: data.createdDate || data.createdAt?.toDate() || new Date()
        } as unknown as EnhancedFarm
      })

      setFarms(farmsData)
    } catch (error) {
      console.error('Error loading farms:', error)
    }
  }

  const calculateStats = () => {
    const totalAssignments = assignments.length
    const activeAssignments = assignments.filter(a => a.isActive).length
    const uniqueUsers = new Set(assignments.map(a => a.userId)).size
    const uniqueFarms = new Set(assignments.map(a => a.farmId)).size

    setStats({
      totalAssignments,
      activeAssignments,
      uniqueUsers,
      uniqueFarms
    })
  }

  const createAssignment = async () => {
    try {
      if (!newAssignment.userId || !newAssignment.farmId) return

      const { collection, addDoc, Timestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const assignmentData = {
        userId: newAssignment.userId,
        roleType: newAssignment.roleType,
        scopeType: 'farm',
        scopeId: newAssignment.farmId,
        permissions: newAssignment.permissions,
        grantedBy: currentUser?.uid || 'system',
        grantedAt: Timestamp.now(),
        isActive: true,
        metadata: {
          assignedVia: 'admin_panel',
          assignedAt: new Date().toISOString()
        }
      }

      await addDoc(collection(db, 'userRoles'), assignmentData)

      // Reset form and refresh
      setNewAssignment({
        userId: '',
        farmId: '',
        roleType: 'farm_viewer',
        permissions: []
      })
      setShowAssignModal(false)
      loadAssignments()
    } catch (error) {
      console.error('Error creating assignment:', error)
    }
  }

  const removeAssignment = async (assignmentId: string) => {
    try {
      if (!confirm('Are you sure you want to remove this farm assignment?')) {
        return
      }

      const { doc, deleteDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await deleteDoc(doc(db, 'userRoles', assignmentId))
      loadAssignments()
    } catch (error) {
      console.error('Error removing assignment:', error)
    }
  }

  const toggleAssignmentStatus = async (assignmentId: string, currentStatus: boolean) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await updateDoc(doc(db, 'userRoles', assignmentId), {
        isActive: !currentStatus,
        updatedAt: new Date()
      })

      loadAssignments()
    } catch (error) {
      console.error('Error updating assignment status:', error)
    }
  }

  // Enrich assignments with user and farm data
  const enrichedAssignments = assignments.map(assignment => ({
    ...assignment,
    user: users.find(u => u.uid === assignment.userId),
    farm: farms.find(f => f.id === assignment.farmId)
  })).filter(assignment => assignment.user && assignment.farm)

  const filteredAssignments = enrichedAssignments.filter(assignment => {
    const matchesSearch = 
      assignment.user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.farm?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || assignment.roleType === filterRole
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && assignment.isActive) ||
      (filterStatus === 'inactive' && !assignment.isActive)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleColor = (roleType: string) => {
    switch (roleType) {
      case 'farm_owner': return 'bg-green-100 text-green-800'
      case 'farm_manager': return 'bg-blue-100 text-blue-800'
      case 'farm_viewer': return 'bg-gray-100 text-gray-800'
      case 'seasonal_worker': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Assignment System</h1>
          <p className="text-gray-600">Manage user access to farms and their roles</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Assign User to Farm
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Assignments</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalAssignments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Assignments</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeAssignments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unique Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.uniqueUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <MapIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unique Farms</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.uniqueFarms}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Search assignments..."
            />
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Roles</option>
              <option value="farm_owner">Farm Owner</option>
              <option value="farm_manager">Farm Manager</option>
              <option value="farm_viewer">Farm Viewer</option>
              <option value="seasonal_worker">Seasonal Worker</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Farm
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAssignments.map((assignment) => (
              <tr key={assignment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {assignment.user?.displayName?.charAt(0) || assignment.user?.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.user?.displayName || 'No Name'}
                      </div>
                      <div className="text-sm text-gray-500">{assignment.user?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <MapIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{assignment.farm?.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{assignment.farm?.farmType}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(assignment.roleType)}`}>
                    {assignment.roleType.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.isActive)}`}>
                    {assignment.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTimeAgo(assignment.assignedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleAssignmentStatus(assignment.id, assignment.isActive)}
                      className={`${assignment.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                      title={assignment.isActive ? 'Deactivate assignment' : 'Activate assignment'}
                    >
                      {assignment.isActive ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => removeAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Remove assignment"
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

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAssignModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Assign User to Farm</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                    <select
                      value={newAssignment.userId}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, userId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Choose a user...</option>
                      {users.map(user => (
                        <option key={user.uid} value={user.uid}>
                          {user.displayName || user.email} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Farm</label>
                    <select
                      value={newAssignment.farmId}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, farmId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Choose a farm...</option>
                      {farms.map(farm => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name} ({farm.farmType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={newAssignment.roleType}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, roleType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="farm_viewer">Farm Viewer</option>
                      <option value="farm_manager">Farm Manager</option>
                      <option value="farm_owner">Farm Owner</option>
                      <option value="seasonal_worker">Seasonal Worker</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={createAssignment}
                  disabled={!newAssignment.userId || !newAssignment.farmId}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Assignment
                </button>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}