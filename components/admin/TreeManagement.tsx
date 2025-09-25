'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { AdminService } from '@/lib/admin-service'
import { Tree } from '@/lib/types'
import { 
  MapPinIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChartBarIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface TreeStats {
  totalTrees: number
  healthyTrees: number
  treesNeedingAttention: number
  totalFruits: number
  averageFruitsPerTree: number
}

export default function TreeManagement() {
  const { user } = useEnhancedAuth()
  const [trees, setTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFarm, setFilterFarm] = useState<string>('all')
  const [filterHealth, setFilterHealth] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [stats, setStats] = useState<TreeStats>({
    totalTrees: 0,
    healthyTrees: 0,
    treesNeedingAttention: 0,
    totalFruits: 0,
    averageFruitsPerTree: 0
  })

  const [farms, setFarms] = useState<Array<{id: string, name: string}>>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [trees])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load trees and farms using AdminService
      const [treesData, farmsData] = await Promise.all([
        AdminService.getAllTrees(),
        AdminService.getAllFarms()
      ])

      setTrees(treesData)
      setFarms(farmsData.map(f => ({ id: f.id, name: f.name })))
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const totalTrees = trees.length
    const healthyTrees = trees.filter(tree => 
      tree.healthStatus === 'Excellent' || tree.healthStatus === 'Good'
    ).length
    const treesNeedingAttention = trees.filter(tree => tree.needsAttention).length
    const totalFruits = trees.reduce((sum, tree) => 
      sum + (tree.manualFruitCount || 0) + (tree.aiFruitCount || 0), 0
    )
    const averageFruitsPerTree = totalTrees > 0 ? totalFruits / totalTrees : 0

    setStats({
      totalTrees,
      healthyTrees,
      treesNeedingAttention,
      totalFruits,
      averageFruitsPerTree
    })
  }

  const filteredAndSortedTrees = trees.filter(tree => {
    const matchesSearch = tree.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tree.variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tree.zoneName || tree.zoneCode)?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFarm = filterFarm === 'all' || tree.farmId === filterFarm
    const matchesHealth = filterHealth === 'all' || tree.healthStatus === filterHealth
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'needs_attention' && tree.needsAttention) ||
      (filterStatus === 'healthy' && !tree.needsAttention)
    
    return matchesSearch && matchesFarm && matchesHealth && matchesStatus
  })

  const getHealthColor = (status?: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800'
      case 'Good': return 'bg-blue-100 text-blue-800'
      case 'Fair': return 'bg-yellow-100 text-yellow-800'
      case 'Poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthIcon = (status?: string) => {
    switch (status) {
      case 'Excellent': return <HeartIcon className="h-4 w-4 text-green-600" />
      case 'Good': return <CheckCircleIcon className="h-4 w-4 text-blue-600" />
      case 'Fair': return <ClockIcon className="h-4 w-4 text-yellow-600" />
      case 'Poor': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
      default: return <MapPinIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A'
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            {[...Array(5)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Tree Management</h1>
          <p className="text-gray-600">Monitor and manage all trees across farms</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Trees</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTrees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <HeartIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Healthy Trees</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.healthyTrees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Need Attention</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.treesNeedingAttention}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Fruits</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalFruits.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Fruits/Tree</p>
              <p className="text-2xl font-semibold text-gray-900">{Math.round(stats.averageFruitsPerTree)}</p>
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
              placeholder="Search trees..."
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Filters */}
            <select
              value={filterFarm}
              onChange={(e) => setFilterFarm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Farms</option>
              {farms.map(farm => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>

            <select
              value={filterHealth}
              onChange={(e) => setFilterHealth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Health Status</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="needs_attention">Needs Attention</option>
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

      {/* Tree List */}
      {filteredAndSortedTrees.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Trees Found</h3>
          <p className="text-gray-600 mb-4">
            {trees.length === 0 
              ? "No trees are available in the database yet." 
              : "No trees match your current filters."}
          </p>
          {trees.length === 0 && (
            <p className="text-sm text-gray-500">
              Trees will appear here once they are added to farms in the system.
            </p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedTrees.map((tree) => (
            <div key={tree.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      {getHealthIcon(tree.healthStatus)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tree.name || `Tree ${tree.id.slice(-6)}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {tree.variety || 'Unknown variety'}
                      </p>
                    </div>
                  </div>
                  {tree.needsAttention && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      Needs Attention
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthColor(tree.healthStatus)}`}>
                    {tree.healthStatus || 'Unknown'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Farm:</span>
                    <span className="ml-1 font-medium">
                      {tree.farmName || farms.find(f => f.id === tree.farmId)?.name || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Zone:</span>
                    <span className="ml-1 font-medium">{tree.zoneName || tree.zoneCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fruits:</span>
                    <span className="ml-1 font-medium">
                      {(tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Planted:</span>
                    <span className="ml-1 font-medium">{formatDate(tree.plantingDate)}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTree(tree)
                      setShowDetailsModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
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
                  Tree
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Farm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Health Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fruits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedTrees.map((tree) => (
                <tr key={tree.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="p-1 bg-green-100 rounded mr-3">
                        {getHealthIcon(tree.healthStatus)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tree.name || `Tree ${tree.id.slice(-6)}`}
                        </div>
                        <div className="text-sm text-gray-500">{tree.variety || 'Unknown variety'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tree.farmName || farms.find(f => f.id === tree.farmId)?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthColor(tree.healthStatus)}`}>
                      {tree.healthStatus || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedTree(tree)
                        setShowDetailsModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tree Details Modal */}
      {showDetailsModal && selectedTree && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDetailsModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tree Details</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm text-gray-900">{selectedTree.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Variety</label>
                      <p className="text-sm text-gray-900">{selectedTree.variety || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Health Status</label>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthColor(selectedTree.healthStatus)}`}>
                        {selectedTree.healthStatus || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tree Status</label>
                      <p className="text-sm text-gray-900">{selectedTree.treeStatus || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Manual Fruit Count</label>
                      <p className="text-sm text-gray-900">{selectedTree.manualFruitCount || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">AI Fruit Count</label>
                      <p className="text-sm text-gray-900">{selectedTree.aiFruitCount || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Zone Name</label>
                      <p className="text-sm text-gray-900">{selectedTree.zoneName || selectedTree.zoneCode || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">QR Code</label>
                      <p className="text-sm text-gray-900">{selectedTree.qrCode || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="text-sm text-gray-900">
                      {selectedTree.latitude && selectedTree.longitude 
                        ? `${selectedTree.latitude.toFixed(6)}, ${selectedTree.longitude.toFixed(6)}`
                        : 'No GPS coordinates'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-900">{selectedTree.notes || 'No notes'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Health Notes</label>
                    <p className="text-sm text-gray-900">{selectedTree.healthNotes || 'No health notes'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}