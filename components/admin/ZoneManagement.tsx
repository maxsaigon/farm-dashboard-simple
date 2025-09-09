'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { AdminService } from '@/lib/admin-service'
import { Zone } from '@/lib/types'
import { 
  MapIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  Square3Stack3DIcon,
  ChartBarIcon,
  MapPinIcon,
  CubeIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'

interface ZoneStats {
  totalZones: number
  activeZones: number
  totalTrees: number
  averageTreesPerZone: number
  largestZone: { name: string; treeCount: number } | null
}

export default function ZoneManagement() {
  const { user } = useEnhancedAuth()
  const [zones, setZones] = useState<Zone[]>([])
  const [trees, setTrees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFarm, setFilterFarm] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')

  const [stats, setStats] = useState<ZoneStats>({
    totalZones: 0,
    activeZones: 0,
    totalTrees: 0,
    averageTreesPerZone: 0,
    largestZone: null
  })

  const [farms, setFarms] = useState<Array<{id: string, name: string}>>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [zones, trees])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load zones, trees, and farms using AdminService
      const [zonesData, treesData, farmsData] = await Promise.all([
        AdminService.getAllZones(),
        AdminService.getAllTrees(),
        AdminService.getAllFarms()
      ])

      setZones(zonesData)
      setTrees(treesData)
      setFarms(farmsData.map(f => ({ id: f.id, name: f.name })))
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const totalZones = zones.length
    const activeZones = zones.filter(zone => zone.isActive !== false).length
    const totalTrees = trees.length

    // Calculate trees per zone
    const zoneTreeCounts = zones.map(zone => {
      const zoneTreeCount = trees.filter(tree => tree.zoneId === zone.id || tree.zoneCode === zone.code).length
      return {
        zone,
        count: zoneTreeCount
      }
    })

    const averageTreesPerZone = totalZones > 0 ? totalTrees / totalZones : 0
    const largestZone = zoneTreeCounts.reduce((largest, current) => 
      current.count > (largest?.count || 0) ? current : largest, null as any
    )

    setStats({
      totalZones,
      activeZones,
      totalTrees,
      averageTreesPerZone,
      largestZone: largestZone ? { name: largestZone.zone.name, treeCount: largestZone.count } : null
    })
  }

  const getZoneTreeCount = (zone: Zone) => {
    return trees.filter(tree => tree.zoneId === zone.id || tree.zoneCode === zone.code).length
  }

  const filteredAndSortedZones = zones.filter(zone => {
    const matchesSearch = zone.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         zone.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         zone.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFarm = filterFarm === 'all' || zone.farmId === filterFarm
    
    return matchesSearch && matchesFarm
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '')
      case 'code':
        return (a.code || '').localeCompare(b.code || '')
      case 'trees':
        return getZoneTreeCount(b) - getZoneTreeCount(a)
      case 'area':
        return (b.area || 0) - (a.area || 0)
      default:
        return 0
    }
  })

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A'
    return date.toLocaleDateString()
  }

  const formatArea = (area?: number) => {
    if (!area) return 'N/A'
    if (area < 10000) {
      return `${area.toLocaleString()} m²`
    } else {
      return `${(area / 10000).toFixed(2)} hectares`
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
          <h1 className="text-2xl font-bold text-gray-900">Zone Management</h1>
          <p className="text-gray-600">Manage zones and areas across all farms</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Square3Stack3DIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Zones</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalZones}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Zones</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeZones}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Trees in Zones</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTrees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Trees/Zone</p>
              <p className="text-2xl font-semibold text-gray-900">{Math.round(stats.averageTreesPerZone)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Largest Zone */}
      {stats.largestZone && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Largest Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold text-gray-900">{stats.largestZone.name}</p>
              <p className="text-gray-600">{stats.largestZone.treeCount} trees</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

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
              className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Search zones..."
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Filters */}
            <select
              value={filterFarm}
              onChange={(e) => setFilterFarm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Farms</option>
              {farms.map(farm => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="name">Sort by Name</option>
              <option value="code">Sort by Code</option>
              <option value="trees">Sort by Tree Count</option>
              <option value="area">Sort by Area</option>
            </select>
          </div>
        </div>
      </div>

      {/* Zone List */}
      {filteredAndSortedZones.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Square3Stack3DIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Zones Found</h3>
          <p className="text-gray-600 mb-4">
            {zones.length === 0 
              ? "No zones are available in the database yet." 
              : "No zones match your current filters."}
          </p>
          {zones.length === 0 && (
            <p className="text-sm text-gray-500">
              Zones will appear here once they are created in the system.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedZones.map((zone) => {
            const treeCount = getZoneTreeCount(zone)
            const farmName = farms.find(f => f.id === zone.farmId)?.name || 'Unknown Farm'
            
            return (
              <div key={zone.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg mr-3">
                        <Square3Stack3DIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {zone.name || `Zone ${zone.code}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Code: {zone.code || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {zone.isActive === false && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {zone.description || 'No description available'}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Farm:</span>
                      <span className="ml-1 font-medium">{farmName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Trees:</span>
                      <span className="ml-1 font-medium">{treeCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Area:</span>
                      <span className="ml-1 font-medium">{formatArea(zone.area)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-1 font-medium">{formatDate(zone.createdDate)}</span>
                    </div>
                  </div>

                  {/* Zone Boundaries Info */}
                  {zone.boundaries && zone.boundaries.length > 0 && (
                    <div className="mt-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <MapPinIcon className="h-3 w-3 mr-1" />
                        {zone.boundaries.length} boundary points
                      </span>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedZone(zone)
                        setShowDetailsModal(true)
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600"
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Zone Details Modal */}
      {showDetailsModal && selectedZone && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDetailsModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Zone Details</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm text-gray-900">{selectedZone.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Code</label>
                      <p className="text-sm text-gray-900">{selectedZone.code || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedZone.isActive !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedZone.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Trees in Zone</label>
                      <p className="text-sm text-gray-900">{getZoneTreeCount(selectedZone)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Area</label>
                      <p className="text-sm text-gray-900">{formatArea(selectedZone.area)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Farm</label>
                      <p className="text-sm text-gray-900">
                        {farms.find(f => f.id === selectedZone.farmId)?.name || 'Unknown Farm'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="text-sm text-gray-900">{selectedZone.description || 'No description'}</p>
                  </div>
                  
                  {selectedZone.boundaries && selectedZone.boundaries.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Boundary Points ({selectedZone.boundaries.length})
                      </label>
                      <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                        {selectedZone.boundaries.map((point, index) => (
                          <div key={index} className="text-xs text-gray-600 mb-1">
                            Point {index + 1}: {point.latitude?.toFixed(6)}, {point.longitude?.toFixed(6)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedZone.soil && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Soil Information</label>
                      <div className="text-sm text-gray-900 space-y-1">
                        {selectedZone.soil.type && <p>Type: {selectedZone.soil.type}</p>}
                        {selectedZone.soil.ph && <p>pH: {selectedZone.soil.ph}</p>}
                        {selectedZone.soil.nutrients && <p>Nutrients: {selectedZone.soil.nutrients}</p>}
                      </div>
                    </div>
                  )}

                  {selectedZone.climate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Climate Information</label>
                      <div className="text-sm text-gray-900 space-y-1">
                        {selectedZone.climate.temperature && <p>Temperature: {selectedZone.climate.temperature}</p>}
                        {selectedZone.climate.humidity && <p>Humidity: {selectedZone.climate.humidity}</p>}
                        {selectedZone.climate.rainfall && <p>Rainfall: {selectedZone.climate.rainfall}</p>}
                      </div>
                    </div>
                  )}
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