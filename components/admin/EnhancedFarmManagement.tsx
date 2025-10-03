'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { EnhancedFarm } from '@/lib/types-enhanced'
import { 
  MapIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChartBarIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

interface FarmStats {
  totalFarms: number
  activeFarms: number
  totalTrees: number
  totalArea: number
}

export default function EnhancedFarmManagement() {
  const { user } = useSimpleAuth()
  const [farms, setFarms] = useState<EnhancedFarm[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFarm, setSelectedFarm] = useState<EnhancedFarm | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [stats, setStats] = useState<FarmStats>({
    totalFarms: 0,
    activeFarms: 0,
    totalTrees: 0,
    totalArea: 0
  })

  const [newFarm, setNewFarm] = useState({
    name: '',
    farmType: 'personal' as 'personal' | 'commercial' | 'cooperative' | 'research',
    status: 'active' as 'active' | 'inactive' | 'archived',
    organizationId: ''
  })

  useEffect(() => {
    loadFarms()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [farms])

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
          organizationId: data.organizationId || '',
          farmType: data.farmType || 'personal',
          status: data.status || 'active',
          settings: data.settings || {},
          contacts: data.contacts || [],
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

  const calculateStats = () => {
    const totalFarms = farms.length
    const activeFarms = farms.filter(f => f.status === 'active').length
    // Mock data for trees and area since we don't have this in the basic Farm interface
    const totalTrees = farms.length * 50 // Average 50 trees per farm
    const totalArea = farms.length * 10 // Average 10 hectares per farm

    setStats({
      totalFarms,
      activeFarms,
      totalTrees,
      totalArea
    })
  }

  const createFarm = async () => {
    try {
      if (!newFarm.name.trim()) return

      const { doc, setDoc, Timestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const farmId = `farm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const farmData = {
        id: farmId,
        name: newFarm.name.trim(),
        farmType: newFarm.farmType,
        status: newFarm.status,
        organizationId: newFarm.organizationId || 'default_org',
        settings: {
          timezone: 'UTC',
          currency: 'USD',
          units: 'metric',
          language: 'en',
          enableGPSTracking: true,
          enablePhotoGeotagging: true,
          dataRetentionDays: 365,
          backupFrequency: 'daily'
        },
        contacts: [],
        boundaries: [],
        zones: [],
        certifications: [],
        metadata: {},
        createdDate: new Date(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      await setDoc(doc(db, 'farms', farmId), farmData)

      // Reset form and refresh
      setNewFarm({
        name: '',
        farmType: 'personal',
        status: 'active',
        organizationId: ''
      })
      setShowCreateModal(false)
      loadFarms()
    } catch (error) {
      console.error('Error creating farm:', error)
    }
  }

  const updateFarm = async () => {
    try {
      if (!selectedFarm) return

      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await updateDoc(doc(db, 'farms', selectedFarm.id), {
        name: selectedFarm.name,
        farmType: selectedFarm.farmType,
        status: selectedFarm.status,
        updatedAt: new Date()
      })

      setShowEditModal(false)
      setSelectedFarm(null)
      loadFarms()
    } catch (error) {
      console.error('Error updating farm:', error)
    }
  }

  const deleteFarm = async (farmId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this farm? This action cannot be undone.')) {
        return
      }

      const { doc, deleteDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await deleteDoc(doc(db, 'farms', farmId))
      loadFarms()
    } catch (error) {
      console.error('Error deleting farm:', error)
    }
  }

  const filteredAndSortedFarms = farms
    .filter(farm => {
      const matchesSearch = farm.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'all' || farm.status === filterStatus
      const matchesType = filterType === 'all' || farm.farmType === filterType
      return matchesSearch && matchesStatus && matchesType
    })
    .sort((a, b) => {
      let aValue = a[sortBy as keyof EnhancedFarm] as string
      let bValue = b[sortBy as keyof EnhancedFarm] as string
      
      if (sortBy === 'createdDate') {
        aValue = a.createdDate?.toISOString() || ''
        bValue = b.createdDate?.toISOString() || ''
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
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'commercial': return '🏢'
      case 'cooperative': return '🤝'
      case 'research': return '🔬'
      default: return '🏠'
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
          <h1 className="text-2xl font-bold text-gray-900">Farm Management</h1>
          <p className="text-gray-600">Manage all farms in the system</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Farm
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Farms</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalFarms}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Farms</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeFarms}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Trees</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTrees.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Area</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalArea} ha</p>
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
              placeholder="Search farms..."
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
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Types</option>
              <option value="personal">Personal</option>
              <option value="commercial">Commercial</option>
              <option value="cooperative">Cooperative</option>
              <option value="research">Research</option>
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

      {/* Farm List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedFarms.map((farm) => (
            <div key={farm.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">{getTypeIcon(farm.farmType)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{farm.name}</h3>
                      <p className="text-sm text-gray-500">Farm ID: {farm.id}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(farm.status)}`}>
                    {farm.status}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 line-clamp-2">Farm Type: {farm.farmType}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-1 font-medium capitalize">{farm.farmType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-1 font-medium">
                      {farm.createdDate?.toLocaleDateString() || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      <span>~50 trees</span>
                    </div>
                    <div className="flex items-center">
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      <span>~10 ha</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      setSelectedFarm(farm)
                      setShowDetailsModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFarm(farm)
                      setShowEditModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-green-600"
                    title="Edit farm"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteFarm(farm.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete farm"
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
                  Farm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedFarms.map((farm) => (
                <tr key={farm.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-lg mr-3">{getTypeIcon(farm.farmType)}</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{farm.name}</div>
                        <div className="text-sm text-gray-500">ID: {farm.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {farm.farmType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(farm.status)}`}>
                      {farm.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {farm.createdDate?.toLocaleDateString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedFarm(farm)
                          setShowDetailsModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFarm(farm)
                          setShowEditModal(true)
                        }}
                        className="text-green-600 hover:text-green-900"
                        title="Edit farm"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteFarm(farm.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete farm"
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

      {/* Create Farm Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Farm</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Farm Name</label>
                    <input
                      type="text"
                      value={newFarm.name}
                      onChange={(e) => setNewFarm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter farm name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Farm Type</label>
                    <select
                      value={newFarm.farmType}
                      onChange={(e) => setNewFarm(prev => ({ ...prev, farmType: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="personal">Personal</option>
                      <option value="commercial">Commercial</option>
                      <option value="cooperative">Cooperative</option>
                      <option value="research">Research</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={newFarm.status}
                      onChange={(e) => setNewFarm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={createFarm}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Farm
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

      {/* Edit Farm Modal */}
      {showEditModal && selectedFarm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Farm</h3>
                
                <div className="space-y-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Farm Type</label>
                    <select
                      value={selectedFarm.farmType}
                      onChange={(e) => setSelectedFarm(prev => prev ? { ...prev, farmType: e.target.value as any } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="personal">Personal</option>
                      <option value="commercial">Commercial</option>
                      <option value="cooperative">Cooperative</option>
                      <option value="research">Research</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={selectedFarm.status}
                      onChange={(e) => setSelectedFarm(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={updateFarm}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Update Farm
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