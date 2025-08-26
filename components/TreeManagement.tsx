'use client'

import { useState, useEffect, useRef } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { 
  TreePine,
  MapPinIcon,
  CameraIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  HeartIcon,
  BeakerIcon,
  SunIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/solid'

interface Tree {
  id: string
  name: string
  farmId: string
  latitude: number
  longitude: number
  gpsAccuracy?: number
  plantingDate?: Date
  variety?: string
  treeStatus: 'Young Tree' | 'Mature' | 'Old Tree' | 'Dead'
  healthStatus: 'Good' | 'Fair' | 'Poor' | 'Disease'
  notes?: string
  qrCode?: string
  zoneCode?: string
  manualFruitCount?: number
  lastCountDate?: Date
  treeHeight?: number
  trunkDiameter?: number
  healthNotes?: string
  fertilizedDate?: Date
  prunedDate?: Date
  diseaseNotes?: string
  aiFruitCount?: number
  lastAIAnalysisDate?: Date
  aiAccuracy?: number
  needsAttention: boolean
  photoCount: number
  lastPhotoDate?: Date
}

interface TreeFilters {
  healthStatus?: string
  treeStatus?: string
  zoneCode?: string
  needsAttention?: boolean
  hasPhotos?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

export default function TreeManagement() {
  const { user, hasPermission, currentFarm } = useEnhancedAuth()
  const [trees, setTrees] = useState<Tree[]>([])
  const [filteredTrees, setFilteredTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<TreeFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'health' | 'date' | 'location'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (hasPermission('trees:read')) {
      loadTrees()
    }
  }, [hasPermission, currentFarm])

  useEffect(() => {
    applyFiltersAndSearch()
  }, [trees, searchTerm, filters, sortBy, sortOrder])

  const loadTrees = async () => {
    try {
      setLoading(true)
      // Load trees from Firebase
      // Mock data for demonstration
      const mockTrees: Tree[] = [
        {
          id: '1',
          name: 'DUR-001',
          farmId: currentFarm?.id || 'farm1',
          latitude: 10.8231,
          longitude: 106.6297,
          gpsAccuracy: 5.2,
          plantingDate: new Date('2020-01-15'),
          variety: 'Monthong',
          treeStatus: 'Mature',
          healthStatus: 'Good',
          notes: 'Cây phát triển tốt, cho trái đều',
          qrCode: 'DUR001QR2024',
          zoneCode: 'A-01',
          manualFruitCount: 25,
          lastCountDate: new Date('2024-01-10'),
          treeHeight: 8.5,
          trunkDiameter: 45.2,
          fertilizedDate: new Date('2023-12-01'),
          prunedDate: new Date('2023-11-15'),
          aiFruitCount: 27,
          lastAIAnalysisDate: new Date('2024-01-12'),
          aiAccuracy: 0.92,
          needsAttention: false,
          photoCount: 12,
          lastPhotoDate: new Date('2024-01-12')
        },
        {
          id: '2',
          name: 'DUR-002',
          farmId: currentFarm?.id || 'farm1',
          latitude: 10.8235,
          longitude: 106.6299,
          gpsAccuracy: 3.8,
          plantingDate: new Date('2019-03-20'),
          variety: 'Ri6',
          treeStatus: 'Mature',
          healthStatus: 'Fair',
          notes: 'Có dấu hiệu sâu hại nhẹ',
          qrCode: 'DUR002QR2024',
          zoneCode: 'A-02',
          manualFruitCount: 18,
          lastCountDate: new Date('2024-01-08'),
          treeHeight: 7.2,
          trunkDiameter: 38.5,
          healthNotes: 'Lá có vết đốm, cần theo dõi',
          fertilizedDate: new Date('2023-12-01'),
          aiFruitCount: 16,
          lastAIAnalysisDate: new Date('2024-01-10'),
          aiAccuracy: 0.87,
          needsAttention: true,
          photoCount: 8,
          lastPhotoDate: new Date('2024-01-10')
        },
        {
          id: '3',
          name: 'DUR-003',
          farmId: currentFarm?.id || 'farm1',
          latitude: 10.8240,
          longitude: 106.6301,
          gpsAccuracy: 4.1,
          plantingDate: new Date('2021-06-10'),
          variety: 'Monthong',
          treeStatus: 'Young Tree',
          healthStatus: 'Good',
          notes: 'Cây non, đang phát triển',
          qrCode: 'DUR003QR2024',
          zoneCode: 'B-01',
          manualFruitCount: 5,
          lastCountDate: new Date('2024-01-05'),
          treeHeight: 4.2,
          trunkDiameter: 22.8,
          fertilizedDate: new Date('2023-12-15'),
          aiFruitCount: 4,
          lastAIAnalysisDate: new Date('2024-01-06'),
          aiAccuracy: 0.89,
          needsAttention: false,
          photoCount: 6,
          lastPhotoDate: new Date('2024-01-06')
        }
      ]
      setTrees(mockTrees)
    } catch (error) {
      console.error('Error loading trees:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSearch = () => {
    let filtered = [...trees]

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(tree =>
        tree.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tree.variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tree.zoneCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tree.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply filters
    if (filters.healthStatus) {
      filtered = filtered.filter(tree => tree.healthStatus === filters.healthStatus)
    }
    if (filters.treeStatus) {
      filtered = filtered.filter(tree => tree.treeStatus === filters.treeStatus)
    }
    if (filters.zoneCode) {
      filtered = filtered.filter(tree => tree.zoneCode === filters.zoneCode)
    }
    if (filters.needsAttention !== undefined) {
      filtered = filtered.filter(tree => tree.needsAttention === filters.needsAttention)
    }
    if (filters.hasPhotos !== undefined) {
      filtered = filtered.filter(tree => 
        filters.hasPhotos ? tree.photoCount > 0 : tree.photoCount === 0
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'health':
          const healthOrder = { 'Good': 0, 'Fair': 1, 'Poor': 2, 'Disease': 3 }
          comparison = healthOrder[a.healthStatus] - healthOrder[b.healthStatus]
          break
        case 'date':
          comparison = (a.plantingDate?.getTime() || 0) - (b.plantingDate?.getTime() || 0)
          break
        case 'location':
          comparison = a.zoneCode?.localeCompare(b.zoneCode || '') || 0
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredTrees(filtered)
  }

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'Good':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'Fair':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
      case 'Poor':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
      case 'Disease':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <CheckCircleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'bg-green-100 text-green-800'
      case 'Fair': return 'bg-yellow-100 text-yellow-800'
      case 'Poor': return 'bg-orange-100 text-orange-800'
      case 'Disease': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTreeStatusIcon = (status: string) => {
    switch (status) {
      case 'Young Tree':
        return <SunIcon className="h-4 w-4 text-yellow-500" />
      case 'Mature':
        return <TreePine className="h-4 w-4 text-green-600" />
      case 'Old Tree':
        return <TreePine className="h-4 w-4 text-orange-600" />
      case 'Dead':
        return <XCircleIcon className="h-4 w-4 text-red-500" />
      default:
        return <TreePine className="h-4 w-4 text-gray-400" />
    }
  }

  const handleTreeAction = async (action: string, treeId: string) => {
    try {
      switch (action) {
        case 'view_location':
          // Open map with tree location
          break
        case 'take_photo':
          // Open camera for this tree
          break
        case 'scan_qr':
          // Open QR scanner
          break
        case 'delete':
          if (confirm('Bạn có chắc chắn muốn xóa cây này?')) {
            // Delete tree
            await loadTrees()
          }
          break
      }
    } catch (error) {
      console.error(`Error ${action}:`, error)
    }
  }

  const exportTrees = () => {
    // Export trees to CSV/Excel
    const csvData = filteredTrees.map(tree => ({
      'Tên cây': tree.name,
      'Giống': tree.variety,
      'Khu vực': tree.zoneCode,
      'Trạng thái': tree.treeStatus,
      'Sức khỏe': tree.healthStatus,
      'Ngày trồng': tree.plantingDate?.toLocaleDateString('vi-VN'),
      'Số trái (thủ công)': tree.manualFruitCount,
      'Số trái (AI)': tree.aiFruitCount,
      'Độ cao (m)': tree.treeHeight,
      'Đường kính thân (cm)': tree.trunkDiameter,
      'Số ảnh': tree.photoCount,
      'Ghi chú': tree.notes
    }))
    
    console.log('Exporting trees:', csvData)
  }

  if (!hasPermission('trees:read')) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Bạn không có quyền xem danh sách cây trồng.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Đang tải danh sách cây...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý cây trồng</h2>
          <p className="text-gray-600">
            Tổng {trees.length} cây, {filteredTrees.length} cây hiển thị
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportTrees}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Xuất dữ liệu
          </button>
          {hasPermission('trees:write') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Thêm cây mới
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm cây, giống, khu vực..."
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
              <option value="health">Sắp xếp theo sức khỏe</option>
              <option value="date">Sắp xếp theo ngày trồng</option>
              <option value="location">Sắp xếp theo vị trí</option>
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
                  Tình trạng sức khỏe
                </label>
                <select
                  value={filters.healthStatus || ''}
                  onChange={(e) => setFilters({...filters, healthStatus: e.target.value || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Tất cả</option>
                  <option value="Good">Khỏe mạnh</option>
                  <option value="Fair">Bình thường</option>
                  <option value="Poor">Kém</option>
                  <option value="Disease">Bệnh/sâu hại</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giai đoạn cây
                </label>
                <select
                  value={filters.treeStatus || ''}
                  onChange={(e) => setFilters({...filters, treeStatus: e.target.value || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Tất cả</option>
                  <option value="Young Tree">Cây non</option>
                  <option value="Mature">Cây trưởng thành</option>
                  <option value="Old Tree">Cây già</option>
                  <option value="Dead">Cây chết</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái đặc biệt
                </label>
                <select
                  value={filters.needsAttention === undefined ? '' : filters.needsAttention.toString()}
                  onChange={(e) => setFilters({...filters, needsAttention: e.target.value === '' ? undefined : e.target.value === 'true'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Tất cả</option>
                  <option value="true">Cần chú ý</option>
                  <option value="false">Bình thường</option>
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
            Danh sách
          </button>
        </div>
      </div>

      {/* Trees Grid/List */}
      {filteredTrees.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <TreePine className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không có cây nào</h3>
          <p className="text-gray-500">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Không tìm thấy cây phù hợp với tiêu chí tìm kiếm.'
              : 'Chưa có cây nào được thêm vào trang trại.'
            }
          </p>
          {hasPermission('trees:write') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Thêm cây đầu tiên
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrees.map((tree) => (
            <TreeCard key={tree.id} tree={tree} onAction={handleTreeAction} onViewDetails={(tree) => {
              setSelectedTree(tree)
              setShowDetailModal(true)
            }} />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTrees.map((tree) => (
              <TreeListItem key={tree.id} tree={tree} onAction={handleTreeAction} onViewDetails={(tree) => {
                setSelectedTree(tree)
                setShowDetailModal(true)
              }} />
            ))}
          </ul>
        </div>
      )}

      {/* Add Tree Modal */}
      {showAddModal && (
        <AddTreeModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            loadTrees()
            setShowAddModal(false)
          }}
        />
      )}

      {/* Tree Detail Modal */}
      {showDetailModal && selectedTree && (
        <TreeDetailModal
          tree={selectedTree}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedTree(null)
          }}
          onSave={() => {
            loadTrees()
            setShowDetailModal(false)
            setSelectedTree(null)
          }}
          onAction={handleTreeAction}
        />
      )}
    </div>
  )
}

// Tree Card Component (Grid View)
function TreeCard({ 
  tree, 
  onAction, 
  onViewDetails 
}: { 
  tree: Tree
  onAction: (action: string, treeId: string) => void
  onViewDetails: (tree: Tree) => void
}) {
  const { hasPermission } = useEnhancedAuth()

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{tree.name}</h3>
          <p className="text-sm text-gray-600">{tree.variety} • {tree.zoneCode}</p>
        </div>
        <div className="flex items-center space-x-1">
          {getTreeStatusIcon(tree.treeStatus)}
          {tree.needsAttention && (
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Health Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Sức khỏe:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getHealthStatusColor(tree.healthStatus)}`}>
            {tree.healthStatus === 'Good' ? 'Khỏe mạnh' : 
             tree.healthStatus === 'Fair' ? 'Bình thường' :
             tree.healthStatus === 'Poor' ? 'Kém' : 'Bệnh/sâu hại'}
          </span>
        </div>

        {/* Fruit Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Số trái:</span>
          <div className="text-sm text-gray-900">
            <span className="font-medium">{tree.manualFruitCount || 0}</span>
            {tree.aiFruitCount && (
              <span className="text-gray-500 ml-1">({tree.aiFruitCount} AI)</span>
            )}
          </div>
        </div>

        {/* Photos */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Hình ảnh:</span>
          <span className="text-sm text-gray-900">{tree.photoCount} ảnh</span>
        </div>

        {/* Last Activity */}
        {tree.lastCountDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Kiểm tra cuối:</span>
            <span className="text-sm text-gray-900">
              {tree.lastCountDate.toLocaleDateString('vi-VN')}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={() => onViewDetails(tree)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Xem chi tiết
        </button>
        <div className="flex space-x-2">
          <button
            onClick={() => onAction('view_location', tree.id)}
            className="p-1.5 text-gray-400 hover:text-blue-600"
            title="Xem vị trí"
          >
            <MapPinIcon className="h-4 w-4" />
          </button>
          {hasPermission('photos:write') && (
            <button
              onClick={() => onAction('take_photo', tree.id)}
              className="p-1.5 text-gray-400 hover:text-green-600"
              title="Chụp ảnh"
            >
              <CameraIcon className="h-4 w-4" />
            </button>
          )}
          {tree.qrCode && (
            <button
              onClick={() => onAction('scan_qr', tree.id)}
              className="p-1.5 text-gray-400 hover:text-purple-600"
              title="QR Code"
            >
              <QrCodeIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Tree List Item Component (List View)
function TreeListItem({ 
  tree, 
  onAction, 
  onViewDetails 
}: { 
  tree: Tree
  onAction: (action: string, treeId: string) => void
  onViewDetails: (tree: Tree) => void
}) {
  const { hasPermission } = useEnhancedAuth()

  return (
    <li className="px-6 py-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {getTreeStatusIcon(tree.treeStatus)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900">{tree.name}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getHealthStatusColor(tree.healthStatus)}`}>
                {tree.healthStatus === 'Good' ? 'Khỏe mạnh' : 
                 tree.healthStatus === 'Fair' ? 'Bình thường' :
                 tree.healthStatus === 'Poor' ? 'Kém' : 'Bệnh/sâu hại'}
              </span>
              {tree.needsAttention && (
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{tree.variety}</span>
              <span>•</span>
              <span>{tree.zoneCode}</span>
              <span>•</span>
              <span>{tree.manualFruitCount || 0} trái</span>
              <span>•</span>
              <span>{tree.photoCount} ảnh</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(tree)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Chi tiết
          </button>
          <button
            onClick={() => onAction('view_location', tree.id)}
            className="p-2 text-gray-400 hover:text-blue-600"
            title="Xem vị trí"
          >
            <MapPinIcon className="h-4 w-4" />
          </button>
          {hasPermission('photos:write') && (
            <button
              onClick={() => onAction('take_photo', tree.id)}
              className="p-2 text-gray-400 hover:text-green-600"
              title="Chụp ảnh"
            >
              <CameraIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

// Placeholder modal components (would be implemented separately)
function AddTreeModal({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: () => void }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Thêm cây mới</h3>
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

function TreeDetailModal({ tree, isOpen, onClose, onSave, onAction }: { 
  tree: Tree, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: () => void,
  onAction: (action: string, treeId: string) => void 
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Chi tiết cây: {tree.name}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Giống cây</label>
              <p className="text-sm text-gray-900">{tree.variety}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Khu vực</label>
              <p className="text-sm text-gray-900">{tree.zoneCode}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
              <p className="text-sm text-gray-900">{tree.treeStatus}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sức khỏe</label>
              <p className="text-sm text-gray-900">{tree.healthStatus}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Chiều cao (m)</label>
              <p className="text-sm text-gray-900">{tree.treeHeight}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Đường kính thân (cm)</label>
              <p className="text-sm text-gray-900">{tree.trunkDiameter}</p>
            </div>
          </div>
          {tree.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
              <p className="text-sm text-gray-900">{tree.notes}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

function getTreeStatusIcon(status: string) {
  switch (status) {
    case 'Young Tree':
      return <SunIcon className="h-5 w-5 text-yellow-500" />
    case 'Mature':
      return <TreePine className="h-5 w-5 text-green-600" />
    case 'Old Tree':
      return <TreePine className="h-5 w-5 text-orange-600" />
    case 'Dead':
      return <XCircleIcon className="h-5 w-5 text-red-500" />
    default:
      return <TreePine className="h-5 w-5 text-gray-400" />
  }
}

function getHealthStatusColor(status: string) {
  switch (status) {
    case 'Good': return 'bg-green-100 text-green-800'
    case 'Fair': return 'bg-yellow-100 text-yellow-800'
    case 'Poor': return 'bg-orange-100 text-orange-800'
    case 'Disease': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}