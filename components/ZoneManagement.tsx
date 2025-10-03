'use client'

import { useState, useEffect, useRef } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import {
  MapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BeakerIcon,
  MapPinIcon,
  Square3Stack3DIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  RectangleStackIcon
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  MapPinIcon as MapPinIconSolid
} from '@heroicons/react/24/solid'

interface Zone {
  id: string
  name: string
  code: string
  farmId: string
  description?: string
  area: number // square meters
  soilType?: string
  plantingDensity: number // trees per hectare
  centerLatitude: number
  centerLongitude: number
  boundaryCoordinates: { lat: number, lng: number }[]
  treeCount: number
  plantedTreeCount: number
  youngTreeCount: number
  matureTreeCount: number
  deadTreeCount: number
  averageHealth: number
  lastInspectionDate?: Date
  waterSource?: string
  accessRoad: boolean
  slope?: 'flat' | 'gentle' | 'moderate' | 'steep'
  drainage: 'excellent' | 'good' | 'fair' | 'poor'
  createdDate: Date
  isActive: boolean
  notes?: string
}

interface ZoneFilters {
  soilType?: string
  drainage?: string
  slope?: string
  isActive?: boolean
  hasWaterSource?: boolean
  needsInspection?: boolean
  treeCountRange?: {
    min: number
    max: number
  }
}

interface ZoneStatistics {
  totalZones: number
  totalArea: number
  totalTrees: number
  averageTreesPerZone: number
  averageHealth: number
  zonesNeedingAttention: number
  plantingDensityStats: {
    min: number
    max: number
    average: number
  }
}

export default function ZoneManagement() {
  const { user, hasPermission, currentFarm } = useSimpleAuth()
  const [zones, setZones] = useState<Zone[]>([])
  const [filteredZones, setFilteredZones] = useState<Zone[]>([])
  const [statistics, setStatistics] = useState<ZoneStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<ZoneFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'area' | 'trees' | 'health' | 'date'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const soilTypes = [
    'Đất phù sa',
    'Đất cát',
    'Đất sét',
    'Đất thịt',
    'Đất chua phèn',
    'Đất bazan đỏ',
    'Khác'
  ]

  const slopes = [
    { value: 'flat', label: 'Bằng phẳng' },
    { value: 'gentle', label: 'Dốc nhẹ' },
    { value: 'moderate', label: 'Dốc vừa' },
    { value: 'steep', label: 'Dốc cao' }
  ]

  const drainageOptions = [
    { value: 'excellent', label: 'Rất tốt', color: 'green' },
    { value: 'good', label: 'Tốt', color: 'blue' },
    { value: 'fair', label: 'Trung bình', color: 'yellow' },
    { value: 'poor', label: 'Kém', color: 'red' }
  ]

  useEffect(() => {
    if (hasPermission('zones:read')) {
      loadZones()
    }
  }, [hasPermission, currentFarm])

  useEffect(() => {
    applyFiltersAndSearch()
    calculateStatistics()
  }, [zones, searchTerm, filters, sortBy, sortOrder])

  const loadZones = async () => {
    try {
      setLoading(true)
      
      // Check permission before loading data
      if (!hasPermission('farms:read', currentFarm?.id)) {
        setZones([])
        return
      }

      // TODO: Implement Firebase query to load zones
      // const zonesQuery = await db.collection('zones')
      //   .where('farmId', '==', currentFarm?.id)
      //   .where('isDeleted', '==', false)
      //   .orderBy('name')
      //   .get()
      // 
      // const loadedZones = zonesQuery.docs.map(doc => ({
      //   id: doc.id,
      //   ...doc.data(),
      //   createdDate: doc.data().createdDate?.toDate(),
      //   lastInspectionDate: doc.data().lastInspectionDate?.toDate()
      // })) as Zone[]
      // 
      // setZones(loadedZones)

      // For now, set empty array until Firebase integration is complete
      setZones([])
    } catch (error) {
      console.error('Error loading zones:', error)
      setZones([])
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSearch = () => {
    let filtered = [...zones]

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(zone =>
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply filters
    if (filters.soilType) {
      filtered = filtered.filter(zone => zone.soilType === filters.soilType)
    }
    if (filters.drainage) {
      filtered = filtered.filter(zone => zone.drainage === filters.drainage)
    }
    if (filters.slope) {
      filtered = filtered.filter(zone => zone.slope === filters.slope)
    }
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(zone => zone.isActive === filters.isActive)
    }
    if (filters.hasWaterSource !== undefined) {
      filtered = filtered.filter(zone => 
        filters.hasWaterSource ? !!zone.waterSource : !zone.waterSource
      )
    }
    if (filters.needsInspection !== undefined) {
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      filtered = filtered.filter(zone => {
        const needsInspection = !zone.lastInspectionDate || zone.lastInspectionDate < twoWeeksAgo
        return filters.needsInspection ? needsInspection : !needsInspection
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'area':
          comparison = a.area - b.area
          break
        case 'trees':
          comparison = a.treeCount - b.treeCount
          break
        case 'health':
          comparison = a.averageHealth - b.averageHealth
          break
        case 'date':
          comparison = a.createdDate.getTime() - b.createdDate.getTime()
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredZones(filtered)
  }

  const calculateStatistics = () => {
    if (zones.length === 0) {
      setStatistics(null)
      return
    }

    const totalArea = zones.reduce((sum, zone) => sum + zone.area, 0)
    const totalTrees = zones.reduce((sum, zone) => sum + zone.treeCount, 0)
    const averageTreesPerZone = totalTrees / zones.length
    const averageHealth = zones.reduce((sum, zone) => sum + zone.averageHealth, 0) / zones.length
    
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const zonesNeedingAttention = zones.filter(zone => 
      !zone.lastInspectionDate || 
      zone.lastInspectionDate < twoWeeksAgo ||
      zone.averageHealth < 7 ||
      zone.drainage === 'poor'
    ).length

    const densities = zones.map(zone => zone.plantingDensity)
    const plantingDensityStats = {
      min: Math.min(...densities),
      max: Math.max(...densities),
      average: densities.reduce((sum, d) => sum + d, 0) / densities.length
    }

    setStatistics({
      totalZones: zones.length,
      totalArea,
      totalTrees,
      averageTreesPerZone,
      averageHealth,
      zonesNeedingAttention,
      plantingDensityStats
    })
  }

  const getDrainageInfo = (drainage: string) => {
    return drainageOptions.find(d => d.value === drainage) || drainageOptions[1]
  }

  const getSlopeLabel = (slope: string) => {
    return slopes.find(s => s.value === slope)?.label || slope
  }

  const formatArea = (area: number) => {
    return `${(area / 10000).toFixed(1)} ha`
  }

  const handleZoneAction = async (action: string, zoneId: string) => {
    try {
      switch (action) {
        case 'view_map':
          const zone = zones.find(z => z.id === zoneId)
          if (zone) {
            setSelectedZone(zone)
            setShowMapModal(true)
          }
          break
        case 'inspect':
          // Mark zone as inspected today
          setZones(prev => prev.map(zone => 
            zone.id === zoneId 
              ? { ...zone, lastInspectionDate: new Date() }
              : zone
          ))
          break
        case 'deactivate':
          if (confirm('Bạn có chắc chắn muốn tạm ngưng khu vực này?')) {
            setZones(prev => prev.map(zone => 
              zone.id === zoneId 
                ? { ...zone, isActive: false }
                : zone
            ))
          }
          break
        case 'activate':
          setZones(prev => prev.map(zone => 
            zone.id === zoneId 
              ? { ...zone, isActive: true }
              : zone
          ))
          break
        case 'delete':
          if (confirm('Bạn có chắc chắn muốn xóa khu vực này?')) {
            setZones(prev => prev.filter(zone => zone.id !== zoneId))
          }
          break
      }
    } catch (error) {
      console.error(`Error ${action}:`, error)
    }
  }

  const exportZones = () => {
    const csvData = filteredZones.map(zone => ({
      'Tên khu vực': zone.name,
      'Mã khu': zone.code,
      'Diện tích (ha)': (zone.area / 10000).toFixed(1),
      'Loại đất': zone.soilType,
      'Mật độ trồng': zone.plantingDensity,
      'Số cây': zone.treeCount,
      'Cây trưởng thành': zone.matureTreeCount,
      'Cây non': zone.youngTreeCount,
      'Điểm sức khỏe': zone.averageHealth,
      'Thoát nước': getDrainageInfo(zone.drainage).label,
      'Độ dốc': getSlopeLabel(zone.slope || ''),
      'Nguồn nước': zone.waterSource,
      'Đường vào': zone.accessRoad ? 'Có' : 'Không',
      'Trạng thái': zone.isActive ? 'Hoạt động' : 'Tạm ngưng'
    }))
    
    console.log('Exporting zones:', csvData)
  }

  if (!hasPermission('zones:read')) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Bạn không có quyền xem thông tin khu vực.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Đang tải thông tin khu vực...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý khu vực</h2>
          <p className="text-gray-600">
            {statistics && `${statistics.totalZones} khu vực • ${formatArea(statistics.totalArea)} • ${statistics.totalTrees} cây`}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportZones}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Xuất dữ liệu
          </button>
          {hasPermission('zones:create' as any) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Thêm khu vực
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Square3Stack3DIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng diện tích</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatArea(statistics.totalArea)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BeakerIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng số cây</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.totalTrees}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sức khỏe trung bình</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.averageHealth.toFixed(1)}/10
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cần chú ý</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.zonesNeedingAttention}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm khu vực, mã, mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="name">Sắp xếp theo tên</option>
              <option value="area">Sắp xếp theo diện tích</option>
              <option value="trees">Sắp xếp theo số cây</option>
              <option value="health">Sắp xếp theo sức khỏe</option>
              <option value="date">Sắp xếp theo ngày tạo</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Bộ lọc
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại đất
                </label>
                <select
                  value={filters.soilType || ''}
                  onChange={(e) => setFilters({...filters, soilType: e.target.value || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Tất cả loại đất</option>
                  {soilTypes.map(soil => (
                    <option key={soil} value={soil}>{soil}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khả năng thoát nước
                </label>
                <select
                  value={filters.drainage || ''}
                  onChange={(e) => setFilters({...filters, drainage: e.target.value || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Tất cả</option>
                  {drainageOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái
                </label>
                <select
                  value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                  onChange={(e) => setFilters({...filters, isActive: e.target.value === '' ? undefined : e.target.value === 'true'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Tất cả</option>
                  <option value="true">Đang hoạt động</option>
                  <option value="false">Tạm ngưng</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setFilters({})}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              viewMode === 'grid' 
                ? 'bg-green-100 text-green-800' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Squares2X2Icon className="h-4 w-4 inline mr-1" />
            Lưới
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              viewMode === 'list' 
                ? 'bg-green-100 text-green-800' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <RectangleStackIcon className="h-4 w-4 inline mr-1" />
            Danh sách
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              viewMode === 'map' 
                ? 'bg-green-100 text-green-800' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MapIcon className="h-4 w-4 inline mr-1" />
            Bản đồ
          </button>
        </div>
      </div>

      {/* Zones Display */}
      {filteredZones.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <Square3Stack3DIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không có khu vực nào</h3>
          <p className="text-gray-500">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Không tìm thấy khu vực phù hợp với tiêu chí tìm kiếm.'
              : 'Chưa có khu vực nào được tạo trong trang trại.'
            }
          </p>
          {hasPermission('zones:create' as any) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Tạo khu vực đầu tiên
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredZones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} onAction={handleZoneAction} onViewDetails={(zone) => {
              setSelectedZone(zone)
              setShowDetailModal(true)
            }} />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredZones.map((zone) => (
              <ZoneListItem key={zone.id} zone={zone} onAction={handleZoneAction} onViewDetails={(zone) => {
                setSelectedZone(zone)
                setShowDetailModal(true)
              }} />
            ))}
          </ul>
        </div>
      ) : (
        <ZoneMapView zones={filteredZones} onZoneSelect={(zone) => {
          setSelectedZone(zone)
          setShowDetailModal(true)
        }} />
      )}

      {/* Modals */}
      {showAddModal && (
        <ZoneModal
          zone={null}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            loadZones()
            setShowAddModal(false)
          }}
        />
      )}

      {showDetailModal && selectedZone && (
        <ZoneDetailModal
          zone={selectedZone}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedZone(null)
          }}
          onSave={() => {
            loadZones()
            setShowDetailModal(false)
            setSelectedZone(null)
          }}
          onAction={handleZoneAction}
        />
      )}
    </div>
  )
}

// Zone Card Component (Grid View)
const drainageOptions = [
  { value: 'excellent', label: 'Tuyệt vời', color: '#10b981' },
  { value: 'good', label: 'Tốt', color: '#3b82f6' },
  { value: 'fair', label: 'Khá', color: '#f59e0b' },
  { value: 'poor', label: 'Kém', color: '#ef4444' }
]

function ZoneCard({ 
  zone, 
  onAction, 
  onViewDetails 
}: { 
  zone: Zone
  onAction: (action: string, zoneId: string) => void
  onViewDetails: (zone: Zone) => void
}) {
  const { hasPermission } = useSimpleAuth()
  const drainageInfo = drainageOptions.find(d => d.value === zone.drainage) || drainageOptions[1]
  
  const needsAttention = !zone.lastInspectionDate || 
    (new Date().getTime() - zone.lastInspectionDate.getTime()) > (14 * 24 * 60 * 60 * 1000) ||
    zone.averageHealth < 7 ||
    zone.drainage === 'poor'

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
          <p className="text-sm text-gray-600">Mã: {zone.code} • {(zone.area / 10000).toFixed(1)} ha</p>
        </div>
        <div className="flex items-center space-x-1">
          {!zone.isActive && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              Tạm ngưng
            </span>
          )}
          {needsAttention && (
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Tree Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Tổng cây:</span>
            <span className="ml-2 font-medium text-gray-900">{zone.treeCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Trưởng thành:</span>
            <span className="ml-2 font-medium text-gray-900">{zone.matureTreeCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Cây non:</span>
            <span className="ml-2 font-medium text-gray-900">{zone.youngTreeCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Sức khỏe:</span>
            <span className={`ml-2 font-medium ${
              zone.averageHealth >= 8 ? 'text-green-600' :
              zone.averageHealth >= 6 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {zone.averageHealth.toFixed(1)}/10
            </span>
          </div>
        </div>

        {/* Environmental Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Loại đất:</span>
            <span className="text-gray-900">{zone.soilType}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Thoát nước:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${drainageInfo.color}-100 text-${drainageInfo.color}-800`}>
              {drainageInfo.label}
            </span>
          </div>
          {zone.waterSource && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Nguồn nước:</span>
              <span className="text-gray-900">{zone.waterSource}</span>
            </div>
          )}
        </div>

        {/* Last Inspection */}
        {zone.lastInspectionDate && (
          <div className="text-sm">
            <span className="text-gray-600">Kiểm tra cuối:</span>
            <span className="ml-2 text-gray-900">
              {zone.lastInspectionDate.toLocaleDateString('vi-VN')}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={() => onViewDetails(zone)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Xem chi tiết
        </button>
        <div className="flex space-x-2">
          <button
            onClick={() => onAction('view_map', zone.id)}
            className="p-1.5 text-gray-400 hover:text-blue-600"
            title="Xem bản đồ"
          >
            <MapIcon className="h-4 w-4" />
          </button>
          {hasPermission('zones:write') && (
            <button
              onClick={() => onAction('inspect', zone.id)}
              className="p-1.5 text-gray-400 hover:text-green-600"
              title="Đánh dấu đã kiểm tra"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Zone List Item Component (List View)
function ZoneListItem({ 
  zone, 
  onAction, 
  onViewDetails 
}: { 
  zone: Zone
  onAction: (action: string, zoneId: string) => void
  onViewDetails: (zone: Zone) => void
}) {
  const { hasPermission } = useSimpleAuth()
  const drainageInfo = drainageOptions.find(d => d.value === zone.drainage) || drainageOptions[1]
  
  const needsAttention = !zone.lastInspectionDate || 
    (new Date().getTime() - zone.lastInspectionDate.getTime()) > (14 * 24 * 60 * 60 * 1000) ||
    zone.averageHealth < 7 ||
    zone.drainage === 'poor'

  return (
    <li className="px-6 py-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <Square3Stack3DIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900">{zone.name}</p>
              <span className="text-xs text-gray-500">({zone.code})</span>
              {!zone.isActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Tạm ngưng
                </span>
              )}
              {needsAttention && (
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{(zone.area / 10000).toFixed(1)} ha</span>
              <span>•</span>
              <span>{zone.treeCount} cây</span>
              <span>•</span>
              <span className={
                zone.averageHealth >= 8 ? 'text-green-600' :
                zone.averageHealth >= 6 ? 'text-yellow-600' : 'text-red-600'
              }>
                Sức khỏe: {zone.averageHealth.toFixed(1)}/10
              </span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${drainageInfo.color}-100 text-${drainageInfo.color}-800`}>
                {drainageInfo.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(zone)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Chi tiết
          </button>
          <button
            onClick={() => onAction('view_map', zone.id)}
            className="p-2 text-gray-400 hover:text-blue-600"
            title="Xem bản đồ"
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  )
}

// Zone Map View Component
function ZoneMapView({ zones, onZoneSelect }: { zones: Zone[], onZoneSelect: (zone: Zone) => void }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center py-12">
        <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Bản đồ khu vực</h3>
        <p className="text-gray-500 mb-4">
          Tính năng bản đồ tương tác sẽ được triển khai đầy đủ với Google Maps/Leaflet
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map(zone => (
            <button
              key={zone.id}
              onClick={() => onZoneSelect(zone)}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="flex items-center space-x-2">
                <MapPinIconSolid className="h-5 w-5 text-green-600" />
                <span className="font-medium">{zone.name}</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {zone.centerLatitude.toFixed(4)}, {zone.centerLongitude.toFixed(4)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Placeholder modal components
function ZoneModal({ zone, isOpen, onClose, onSave }: { 
  zone: Zone | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: () => void 
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {zone ? 'Chỉnh sửa khu vực' : 'Thêm khu vực mới'}
        </h3>
        <p className="text-gray-600 mb-4">Chức năng này sẽ được triển khai đầy đủ...</p>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
            Hủy
          </button>
          <button onClick={onSave} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}

function ZoneDetailModal({ zone, isOpen, onClose, onSave, onAction }: { 
  zone: Zone, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: () => void,
  onAction: (action: string, zoneId: string) => void 
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Chi tiết khu vực: {zone.name}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Mã khu vực</label>
              <p className="text-sm text-gray-900">{zone.code}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Diện tích</label>
              <p className="text-sm text-gray-900">{(zone.area / 10000).toFixed(1)} hecta</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Loại đất</label>
              <p className="text-sm text-gray-900">{zone.soilType}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mật độ trồng</label>
              <p className="text-sm text-gray-900">{zone.plantingDensity} cây/ha</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tổng số cây</label>
              <p className="text-sm text-gray-900">{zone.treeCount} cây</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sức khỏe trung bình</label>
              <p className="text-sm text-gray-900">{zone.averageHealth.toFixed(1)}/10</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Thoát nước</label>
              <p className="text-sm text-gray-900">{drainageOptions.find(d => d.value === zone.drainage)?.label}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nguồn nước</label>
              <p className="text-sm text-gray-900">{zone.waterSource || 'Không có'}</p>
            </div>
          </div>
        </div>
        {zone.notes && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
            <p className="text-sm text-gray-900">{zone.notes}</p>
          </div>
        )}
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}