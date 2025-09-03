'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { MobileTreeCard } from './MobileCards'
import MobileLayout from './MobileLayout'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  QrCodeIcon,
  CameraIcon,
  MapIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

interface Tree {
  id: string
  name: string
  latitude?: number
  longitude?: number
  plantingDate?: Date
  variety?: string
  treeStatus: 'Young Tree' | 'Mature' | 'Old Tree' | 'Dead'
  healthStatus: 'Good' | 'Fair' | 'Poor' | 'Disease'
  qrCode?: string
  manualFruitCount?: number
  aiFruitCount?: number
  needsAttention: boolean
  photoCount: number
  lastPhotoDate?: Date
  zone?: string
}

interface FilterState {
  search: string
  healthStatus: string
  treeStatus: string
  zone: string
  needsAttention: boolean
  hasGPS: boolean
  hasPhotos: boolean
}

export default function MobileTreeList() {
  const [trees, setTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    healthStatus: '',
    treeStatus: '',
    zone: '',
    needsAttention: false,
    hasGPS: false,
    hasPhotos: false
  })

  // Load trees data
  useEffect(() => {
    loadTrees()
  }, [])

  const loadTrees = async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockTrees: Tree[] = Array.from({ length: 50 }, (_, i) => ({
        id: `MT-${String(i + 1).padStart(4, '0')}`,
        name: `Cây Măng Cụt ${i + 1}`,
        latitude: 10.7769 + (Math.random() - 0.5) * 0.01,
        longitude: 106.7009 + (Math.random() - 0.5) * 0.01,
        plantingDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
        variety: ['Măng Cụt Tím', 'Măng Cụt Trắng', 'Măng Cụt Lai'][Math.floor(Math.random() * 3)],
        treeStatus: (['Young Tree', 'Mature', 'Old Tree', 'Dead'] as const)[Math.floor(Math.random() * 4)],
        healthStatus: (['Good', 'Fair', 'Poor', 'Disease'] as const)[Math.floor(Math.random() * 4)],
        qrCode: Math.random() > 0.3 ? `QR${String(i + 1).padStart(4, '0')}` : undefined,
        manualFruitCount: Math.random() > 0.5 ? Math.floor(Math.random() * 50) : undefined,
        aiFruitCount: Math.random() > 0.7 ? Math.floor(Math.random() * 50) : undefined,
        needsAttention: Math.random() > 0.8,
        photoCount: Math.floor(Math.random() * 20),
        lastPhotoDate: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
        zone: ['Khu A', 'Khu B', 'Khu C', 'Khu D'][Math.floor(Math.random() * 4)]
      }))
      setTrees(mockTrees)
    } catch (error) {
      console.error('Error loading trees:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter trees based on current filters
  const filteredTrees = useMemo(() => {
    return trees.filter(tree => {
      // Search filter
      if (filters.search && !tree.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !tree.id.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }

      // Health status filter
      if (filters.healthStatus && tree.healthStatus !== filters.healthStatus) {
        return false
      }

      // Tree status filter
      if (filters.treeStatus && tree.treeStatus !== filters.treeStatus) {
        return false
      }

      // Zone filter
      if (filters.zone && tree.zone !== filters.zone) {
        return false
      }

      // Needs attention filter
      if (filters.needsAttention && !tree.needsAttention) {
        return false
      }

      // GPS filter
      if (filters.hasGPS && (!tree.latitude || !tree.longitude)) {
        return false
      }

      // Photos filter
      if (filters.hasPhotos && tree.photoCount === 0) {
        return false
      }

      return true
    })
  }, [trees, filters])

  const handleQuickPhoto = (tree: Tree) => {
    // Navigate to camera with tree context
    window.location.href = `/camera?treeId=${tree.id}`
  }

  const handleViewLocation = (tree: Tree) => {
    if (tree.latitude && tree.longitude) {
      // Open in maps app or navigate to map view
      window.location.href = `/map?lat=${tree.latitude}&lng=${tree.longitude}&treeId=${tree.id}`
    }
  }

  const handleTreeSelect = (tree: Tree) => {
    window.location.href = `/trees/${tree.id}`
  }

  const clearAllFilters = () => {
    setFilters({
      search: '',
      healthStatus: '',
      treeStatus: '',
      zone: '',
      needsAttention: false,
      hasGPS: false,
      hasPhotos: false
    })
  }

  const getActiveFilterCount = () => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'search') return value !== ''
      if (typeof value === 'string') return value !== ''
      return value === true
    }).length
  }

  const zones = Array.from(new Set(trees.map(tree => tree.zone).filter(Boolean)))
  const healthStatuses = ['Good', 'Fair', 'Poor', 'Disease']
  const treeStatuses = ['Young Tree', 'Mature', 'Old Tree', 'Dead']

  return (
    <MobileLayout currentTab="trees">
      <div className="h-full flex flex-col">
        {/* Search and Filter Header */}
        <div className="bg-white border-b border-gray-200 p-4 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc ID cây..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Filter and View Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <FunnelIcon className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Bộ lọc</span>
              {getActiveFilterCount() > 0 && (
                <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {getActiveFilterCount()}
                </span>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredTrees.length} / {trees.length} cây
              </span>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-gray-50 -mx-4 px-4 py-4 space-y-4">
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, needsAttention: !prev.needsAttention }))}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    filters.needsAttention 
                      ? 'bg-red-600 text-white' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cần chú ý
                </button>
                
                <button
                  onClick={() => setFilters(prev => ({ ...prev, hasGPS: !prev.hasGPS }))}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    filters.hasGPS 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Có GPS
                </button>
                
                <button
                  onClick={() => setFilters(prev => ({ ...prev, hasPhotos: !prev.hasPhotos }))}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    filters.hasPhotos 
                      ? 'bg-green-600 text-white' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Có ảnh
                </button>
              </div>

              {/* Dropdown Filters */}
              <div className="grid grid-cols-1 gap-3">
                <select
                  value={filters.healthStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, healthStatus: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Tất cả tình trạng sức khỏe</option>
                  {healthStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <select
                  value={filters.zone}
                  onChange={(e) => setFilters(prev => ({ ...prev, zone: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Tất cả khu vực</option>
                  {zones.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tree List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Đang tải danh sách cây...</p>
              </div>
            </div>
          ) : filteredTrees.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <ViewfinderCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">
                  {filters.search || getActiveFilterCount() > 0 
                    ? 'Không tìm thấy cây nào phù hợp'
                    : 'Chưa có cây nào được đăng ký'
                  }
                </p>
                {(filters.search || getActiveFilterCount() > 0) && (
                  <button
                    onClick={clearAllFilters}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4 pb-20">
              {filteredTrees.map((tree) => (
                <MobileTreeCard
                  key={tree.id}
                  tree={tree}
                  onSelect={handleTreeSelect}
                  onQuickPhoto={handleQuickPhoto}
                  onViewLocation={handleViewLocation}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-20 right-4 space-y-3 lg:bottom-6">
          {/* Quick Camera */}
          <button
            onClick={() => window.location.href = '/camera'}
            className="w-14 h-14 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full shadow-lg flex items-center justify-center transition-colors touch-manipulation"
            aria-label="Chụp ảnh nhanh"
          >
            <CameraIcon className="h-6 w-6" />
          </button>

          {/* QR Scanner */}
          <button
            onClick={() => window.location.href = '/qr-scanner'}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg flex items-center justify-center transition-colors touch-manipulation"
            aria-label="Quét QR"
          >
            <QrCodeIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </MobileLayout>
  )
}