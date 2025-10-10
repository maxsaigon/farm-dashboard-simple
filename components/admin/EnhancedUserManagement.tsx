'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { EnhancedUser, UserRole } from '@/lib/types-enhanced'
import { 
  UsersIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChartBarIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

interface UserStats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  pendingUsers: number
  recentLogins: number
}

interface UserWithDetails extends EnhancedUser {
  userRoles: UserRole[]
  lastLoginFormatted: string
  accountAge: string
  farmCount: number
}

export default function EnhancedUserManagement() {
  const { user: currentUser } = useSimpleAuth()
  const [users, setUsers] = useState<UserWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('displayName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    pendingUsers: 0,
    recentLogins: 0
  })

  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    phoneNumber: '',
    role: 'farm_viewer' as string,
    organizationId: '',
    sendInvitation: true
  })

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [users])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      // Load users
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      )

      const usersSnapshot = await getDocs(usersQuery)
      const usersData: UserWithDetails[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        
        // Load user roles
        const rolesQuery = query(
          collection(db, 'userRoles'),
          orderBy('grantedAt', 'desc')
        )
        const rolesSnapshot = await getDocs(rolesQuery)
        const userRoles = rolesSnapshot.docs
          .map(doc => {
            const data = doc.data()
            return { 
              id: doc.id, 
              userId: data.userId,
              roleType: data.roleType,
              scopeType: data.scopeType,
              scopeId: data.scopeId,
              permissions: data.permissions || [],
              grantedBy: data.grantedBy,
              grantedAt: data.grantedAt?.toDate() || new Date(),
              expiresAt: data.expiresAt?.toDate(),
              isActive: data.isActive !== false,
              metadata: data.metadata || {}
            } as UserRole
          })
          .filter(role => role.userId === userDoc.id)

        // Calculate derived fields
        const lastLogin = userData.lastLoginAt?.toDate() || userData.createdAt?.toDate()
        const accountCreated = userData.createdAt?.toDate() || new Date()
        
        const userWithDetails: UserWithDetails = {
          uid: userDoc.id,
          email: userData.email || '',
          displayName: userData.displayName || '',
          phoneNumber: userData.phoneNumber || '',
          profilePicture: userData.profilePicture || '',
          photoURL: userData.photoURL || '',
          language: userData.language || 'en',
          timezone: userData.timezone || 'UTC',
          lastLoginAt: lastLogin,
          loginCount: userData.loginCount || 0,
          isEmailVerified: userData.isEmailVerified || false,
          isPhoneVerified: userData.isPhoneVerified || false,
          accountStatus: userData.accountStatus || 'active',
          twoFactorEnabled: userData.twoFactorEnabled || false,
          preferences: userData.preferences || {
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
          currentFarmId: userData.currentFarmId,
          roles: userData.roles || [],
          isActive: userData.isActive !== false,
          createdAt: accountCreated,
          updatedAt: userData.updatedAt?.toDate() || accountCreated,
          userRoles,
          lastLoginFormatted: lastLogin ? formatTimeAgo(lastLogin) : 'Never',
          accountAge: formatTimeAgo(accountCreated),
          farmCount: userRoles.filter(role => role.scopeType === 'farm').length
        }

        usersData.push(userWithDetails)
      }

      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const totalUsers = users.length
    const activeUsers = users.filter(u => u.accountStatus === 'active').length
    const suspendedUsers = users.filter(u => u.accountStatus === 'suspended').length
    const pendingUsers = users.filter(u => u.accountStatus === 'pending_verification').length
    
    // Users who logged in within last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentLogins = users.filter(u => 
      u.lastLoginAt && u.lastLoginAt > weekAgo
    ).length

    setStats({
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingUsers,
      recentLogins
    })
  }

  const createUser = async () => {
    try {
      if (!newUser.email.trim() || !newUser.displayName.trim()) return

      const { doc, setDoc, collection, addDoc, Timestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Create user document
      const userData = {
        uid: userId,
        email: newUser.email.trim(),
        displayName: newUser.displayName.trim(),
        phoneNumber: newUser.phoneNumber.trim(),
        language: 'en',
        timezone: 'UTC',
        loginCount: 0,
        isEmailVerified: false,
        isPhoneVerified: false,
        accountStatus: 'pending_verification',
        twoFactorEnabled: false,
        preferences: {
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
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      await setDoc(doc(db, 'users', userId), userData)

      // Create initial role assignment
      if (newUser.role !== 'none') {
        const roleData = {
          userId,
          roleType: newUser.role,
          scopeType: 'system',
          scopeId: newUser.organizationId || 'default_org',
          permissions: [],
          grantedBy: currentUser?.uid || 'system',
          grantedAt: Timestamp.now(),
          isActive: true,
          metadata: {}
        }

        await addDoc(collection(db, 'userRoles'), roleData)
      }

      // Send invitation email if requested
      if (newUser.sendInvitation) {
        // TODO: Implement email invitation system
        console.log('Sending invitation email to:', newUser.email)
      }

      // Reset form and refresh
      setNewUser({
        email: '',
        displayName: '',
        phoneNumber: '',
        role: 'farm_viewer',
        organizationId: '',
        sendInvitation: true
      })
      setShowCreateModal(false)
      loadUsers()
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const updateUser = async () => {
    try {
      if (!selectedUser) return

      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await updateDoc(doc(db, 'users', selectedUser.uid), {
        displayName: selectedUser.displayName,
        phoneNumber: selectedUser.phoneNumber,
        accountStatus: selectedUser.accountStatus,
        isActive: selectedUser.isActive,
        updatedAt: new Date()
      })

      setShowEditModal(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return
      }

      const { doc, deleteDoc, collection, query, where, getDocs } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

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
      
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
      
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: newStatus,
        updatedAt: new Date()
      })

      loadUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
    }
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

  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = filterRole === 'all' || user.userRoles.some(role => role.roleType === filterRole)
      const matchesStatus = filterStatus === 'all' || user.accountStatus === filterStatus
      return matchesSearch && matchesRole && matchesStatus
    })
    .sort((a, b) => {
      let aValue = a[sortBy as keyof UserWithDetails] as string
      let bValue = b[sortBy as keyof UserWithDetails] as string
      
      if (sortBy === 'lastLoginAt') {
        aValue = a.lastLoginAt?.toISOString() || ''
        bValue = b.lastLoginAt?.toISOString() || ''
      }
      
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      case 'pending_verification': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (roleType: string) => {
    switch (roleType) {
      case 'super_admin': return 'bg-purple-100 text-purple-800'
      case 'organization_admin': return 'bg-blue-100 text-blue-800'
      case 'farm_owner': return 'bg-green-100 text-green-800'
      case 'farm_manager': return 'bg-emerald-100 text-emerald-800'
      case 'farm_viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage all users and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Suspended</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.suspendedUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recent Logins</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.recentLogins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Search users..."
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Filters */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending_verification">Pending</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="organization_admin">Organization Admin</option>
              <option value="farm_owner">Farm Owner</option>
              <option value="farm_manager">Farm Manager</option>
              <option value="farm_viewer">Farm Viewer</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-green-100 text-green-600' : 'text-gray-400'}`}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-green-100 text-green-600' : 'text-gray-400'}`}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedUsers.map((user) => (
            <div key={user.uid} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
                      <span className="text-white text-lg font-medium">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{user.displayName || 'No Name'}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.accountStatus)}`}>
                    {user.accountStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.slice(0, 2).map((role, index) => (
                      <span key={index} className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(role.roleType)}`}>
                        {role.roleType.replace('_', ' ')}
                      </span>
                    ))}
                    {user.userRoles.length > 2 && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        +{user.userRoles.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Last Login:</span>
                    <span className="ml-1 font-medium">{user.lastLoginFormatted}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Farms:</span>
                    <span className="ml-1 font-medium">{user.farmCount}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span>Joined {user.accountAge}</span>
                </div>

                <div className="mt-6 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      setSelectedUser(user)
                      setShowDetailsModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(user)
                      setShowEditModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-green-600"
                    title="Edit user"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleUserStatus(user.uid, user.accountStatus)}
                    className={`p-2 text-gray-400 hover:${user.accountStatus === 'active' ? 'text-red-600' : 'text-green-600'}`}
                    title={user.accountStatus === 'active' ? 'Suspend user' : 'Activate user'}
                  >
                    {user.accountStatus === 'active' ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteUser(user.uid)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete user"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.userRoles.slice(0, 2).map((role, index) => (
                        <span key={index} className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(role.roleType)}`}>
                          {role.roleType.replace('_', ' ')}
                        </span>
                      ))}
                      {user.userRoles.length > 2 && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          +{user.userRoles.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.accountStatus)}`}>
                      {user.accountStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.lastLoginFormatted}
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
                        onClick={() => toggleUserStatus(user.uid, user.accountStatus)}
                        className={`${user.accountStatus === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        title={user.accountStatus === 'active' ? 'Suspend user' : 'Activate user'}
                      >
                        {user.accountStatus === 'active' ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => deleteUser(user.uid)}
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
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                    <input
                      type="text"
                      value={newUser.displayName}
                      onChange={(e) => setNewUser(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={newUser.phoneNumber}
                      onChange={(e) => setNewUser(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Initial Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="none">No Role (Manual Assignment)</option>
                      <option value="farm_viewer">Farm Viewer</option>
                      <option value="farm_manager">Farm Manager</option>
                      <option value="farm_owner">Farm Owner</option>
                      <option value="organization_admin">Organization Admin</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sendInvitation"
                      checked={newUser.sendInvitation}
                      onChange={(e) => setNewUser(prev => ({ ...prev, sendInvitation: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sendInvitation" className="ml-2 block text-sm text-gray-900">
                      Send invitation email
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={createUser}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create User
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                    <input
                      type="text"
                      value={selectedUser.displayName || ''}
                      onChange={(e) => setSelectedUser(prev => prev ? { ...prev, displayName: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={selectedUser.phoneNumber || ''}
                      onChange={(e) => setSelectedUser(prev => prev ? { ...prev, phoneNumber: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                    <select
                      value={selectedUser.accountStatus}
                      onChange={(e) => setSelectedUser(prev => prev ? { ...prev, accountStatus: e.target.value as any } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending_verification">Pending Verification</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={selectedUser.isActive}
                      onChange={(e) => setSelectedUser(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Account is active
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={updateUser}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Update User
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
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