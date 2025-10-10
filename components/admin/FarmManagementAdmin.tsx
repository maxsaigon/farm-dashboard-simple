'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { EnhancedFarm, EnhancedUser } from '@/lib/types-enhanced'
import { 
  MapIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UsersIcon,
  HomeIcon,
  PhotoIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

export default function FarmManagementAdmin() {
  const { user } = useSimpleAuth()
  const [farms, setFarms] = useState<EnhancedFarm[]>([])
  const [users, setUsers] = useState<EnhancedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFarm, setSelectedFarm] = useState<EnhancedFarm | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterOrganization, setFilterOrganization] = useState<string>('all')

  const [newFarm, setNewFarm] = useState({
    name: '',
    organizationId: '',
    ownerId: '',
    size: 0,
    farmType: 'durian',
    status: 'active'
  })

  useEffect(() => {
    loadFarms()
    loadUsers()
  }, [])

  const loadFarms = async () => {
    try {
      setLoading(true)
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const farmsQuery = query(
        collection(db, 'farms'),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(farmsQuery)
      const farmsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || '',
          displayName: data.displayName || data.name || '',
          organizationId: data.organizationId || '',
          farmType: data.farmType || 'private',
          status: data.status || 'active',
          settings: data.settings || {},
          contacts: data.contacts || [],
          location: data.location || null,
          boundaries: data.boundaries || [],
          zones: data.zones || [],
          certifications: data.certifications || [],
          metadata: data.metadata || {},
          createdDate: data.createdDate || data.createdAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          ...data
        } as unknown as EnhancedFarm
      })

      setFarms(farmsData)
    } catch (error) {
      console.error('Error loading farms:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const { collection, getDocs } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersData = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as EnhancedUser[]

      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const createFarm = async () => {
    if (!user || !newFarm.name.trim()) return

    try {
      setLoading(true)
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const farmId = `farm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const farmData = {
        id: farmId,
        name: newFarm.name.trim(),
        organizationId: newFarm.organizationId || 'default_org',
        ownerId: newFarm.ownerId || user.uid,
        size: newFarm.size,
        farmType: newFarm.farmType as any,
        status: newFarm.status as any,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(doc(db, 'farms', farmId), farmData)

      // Reset form and refresh
      setNewFarm({
        name: '',
        organizationId: '',
        ownerId: '',
        size: 0,
        farmType: 'durian',
        status: 'active'
      })
      setShowCreateModal(false)
      await loadFarms()

      alert('Farm created successfully!')
    } catch (error) {
      console.error('Error creating farm:', error)
      alert('Failed to create farm. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateFarm = async () => {
    if (!selectedFarm || !user) return

    try {
      setLoading(true)
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await updateDoc(doc(db, 'farms', selectedFarm.id), {
        name: selectedFarm.name,
        farmType: selectedFarm.farmType,
        status: selectedFarm.status,
        updatedAt: new Date()
      })

      setShowEditModal(false)
      await loadFarms()
      alert('Farm updated successfully!')
    } catch (error) {
      console.error('Error updating farm:', error)
      alert('Failed to update farm. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const deleteFarm = async (farmId: string, farmName: string) => {
    if (!confirm(`Are you sure you want to delete "${farmName}"? This action cannot be undone.`)) return

    try {
      setLoading(true)
      const { doc, deleteDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await deleteDoc(doc(db, 'farms', farmId))
      await loadFarms()
      alert('Farm deleted successfully!')
    } catch (error) {
      console.error('Error deleting farm:', error)
      alert('Failed to delete farm. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredFarms = farms.filter(farm => {
    const matchesSearch = farm.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || farm.status === filterStatus
    const matchesOrg = filterOrganization === 'all' || farm.organizationId === filterOrganization

    return matchesSearch && matchesStatus && matchesOrg
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFarmTypeIcon = (type: string) => {
    switch (type) {
      case 'durian': return '🌳'
      case 'mango': return '🥭'
      case 'coconut': return '🥥'
      case 'mixed': return '🌿'
      default: return '🌱'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2">Loading farms...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Farm Management</h2>
          <p className="text-gray-600">Manage farms, assign users, and monitor operations</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {viewMode === 'grid' ? 'Table View' : 'Grid View'}
          </button>
          <button
            onClick={loadFarms}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Farm
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search farms..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
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
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
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
              <MapIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Farms</p>
              <p className="text-2xl font-semibold text-gray-900">{farms.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-semibold">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Farms</p>
              <p className="text-2xl font-semibold text-gray-900">
                {farms.filter(f => f.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Farm Owners</p>
              <p className="text-2xl font-semibold text-gray-900">
                {farms.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Size</p>
              <p className="text-2xl font-semibold text-gray-900">
                {farms.length} farms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Farms List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFarms.map((farm) => (
            <div key={farm.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getFarmTypeIcon(farm.farmType || 'mixed')}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{farm.name}</h3>
                      <p className="text-sm text-gray-500">Farm ID: {farm.id}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(farm.status || 'active')}`}>
                    {farm.status || 'active'}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 line-clamp-2">Farm ID: {farm.id}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Size:</span>
                    <span className="ml-1 font-medium">N/A</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-1 font-medium capitalize">{farm.farmType || 'mixed'}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <HomeIcon className="h-4 w-4 mr-1" />
                      <span>0 trees</span>
                    </div>
                    <div className="flex items-center">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      <span>0 users</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedFarm(farm)}
                      className="p-2 text-blue-600 hover:text-blue-800"
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFarm(farm)
                        setShowEditModal(true)
                      }}
                      className="p-2 text-green-600 hover:text-green-800"
                      title="Edit farm"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFarm(farm)
                        setShowAssignModal(true)
                      }}
                      className="p-2 text-purple-600 hover:text-purple-800"
                      title="Assign users"
                    >
                      <UsersIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteFarm(farm.id, farm.name)}
                      className="p-2 text-red-600 hover:text-red-800"
                      title="Delete farm"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFarms.map((farm) => {
                const owner = users[0] // Placeholder since ownerId doesn't exist
                return (
                  <tr key={farm.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-lg mr-3">{getFarmTypeIcon(farm.farmType || 'mixed')}</div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{farm.name}</div>
                          <div className="text-sm text-gray-500">Farm ID: {farm.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">N/A</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">N/A</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{farm.farmType || 'mixed'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(farm.status || 'active')}`}>
                        {farm.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {owner?.displayName || owner?.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedFarm(farm)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFarm(farm)
                            setShowEditModal(true)
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFarm(farm)
                            setShowAssignModal(true)
                          }}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => deleteFarm(farm.id, farm.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredFarms.length === 0 && (
        <div className="text-center py-12">
          <MapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No farms found matching your criteria.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Create Your First Farm
          </button>
        </div>
      )}

      {/* Create Farm Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Farm</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Farm Name *</label>
                <input
                  type="text"
                  value={newFarm.name}
                  onChange={(e) => setNewFarm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter farm name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={newFarm.name}
                  onChange={(e) => setNewFarm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Farm name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Size (hectares)</label>
                <input
                  type="number"
                  value={newFarm.size}
                  onChange={(e) => setNewFarm(prev => ({ ...prev, size: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Farm Type</label>
                <select
                  value={newFarm.farmType}
                  onChange={(e) => setNewFarm(prev => ({ ...prev, farmType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="durian">Durian</option>
                  <option value="mango">Mango</option>
                  <option value="coconut">Coconut</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Owner</label>
                <select
                  value={newFarm.ownerId}
                  onChange={(e) => setNewFarm(prev => ({ ...prev, ownerId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Owner</option>
                  {users.map(user => (
                    <option key={user.uid} value={user.uid}>
                      {user.displayName || user.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={newFarm.status}
                  onChange={(e) => setNewFarm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={newFarm.name}
                onChange={(e) => setNewFarm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Farm location..."
              />
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={createFarm}
                disabled={!newFarm.name.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Create Farm
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Farm Modal */}
      {showEditModal && selectedFarm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Farm: {selectedFarm.name}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Farm Name</label>
                <input
                  type="text"
                  value={selectedFarm.name}
                  onChange={(e) => setSelectedFarm(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={selectedFarm.name || ''}
                  onChange={(e) => setSelectedFarm(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Farm Type</label>
                <select
                  value={selectedFarm.farmType || 'mixed'}
                  onChange={(e) => setSelectedFarm(prev => prev ? { ...prev, farmType: e.target.value as any } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="durian">Durian</option>
                  <option value="mango">Mango</option>
                  <option value="coconut">Coconut</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedFarm.status || 'active'}
                  onChange={(e) => setSelectedFarm(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={selectedFarm.name || ''}
                onChange={(e) => setSelectedFarm(prev => prev ? { ...prev, name: e.target.value } : null)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={updateFarm}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Update Farm
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Assignment Modal */}
      {showAssignModal && selectedFarm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Assign Users to {selectedFarm.name}
            </h3>
            
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">User assignment functionality will be implemented here.</p>
              <p className="text-sm text-gray-500 mt-2">
                This will allow you to assign users to farms with specific roles and permissions.
              </p>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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