'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/enhanced-auth-context'
import { subscribeToTrees } from '@/lib/firestore'
import { Tree } from '@/lib/types'
import { 
  MagnifyingGlassIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { TreeImagePreview } from './TreeImagePreview'

// Demo trees data for non-authenticated users
const DEMO_TREES: Tree[] = [
  {
    id: "demo-tree-1",
    qrCode: "DEMO-001", 
    name: "Cây Sầu Riêng 001",
    variety: "Monthong",
    zoneCode: "Z01_01",
    plantingDate: new Date('2020-03-15'),
    healthStatus: "Excellent",
    needsAttention: false,
    manualFruitCount: 25,
    aiFruitCount: 28,
    farmId: "demo-farm",
    latitude: 10.762622,
    longitude: 106.660172
  },
  {
    id: "demo-tree-2", 
    qrCode: "DEMO-002",
    name: "Cây Sầu Riêng 002",
    variety: "Kan Yao",
    zoneCode: "Z01_02", 
    plantingDate: new Date('2019-08-20'),
    healthStatus: "Good",
    needsAttention: false,
    manualFruitCount: 18,
    aiFruitCount: 22,
    farmId: "demo-farm",
    latitude: 10.762822,
    longitude: 106.660372
  },
  {
    id: "demo-tree-3",
    qrCode: "DEMO-003",
    name: "Cây Sầu Riêng 003", 
    variety: "Kan Yao",
    zoneCode: "Z01_03",
    plantingDate: new Date('2021-01-10'),
    healthStatus: "Fair",
    needsAttention: true,
    manualFruitCount: 8,
    aiFruitCount: 5,
    farmId: "demo-farm",
    latitude: 10.763022,
    longitude: 106.660572
  },
  {
    id: "demo-tree-4",
    qrCode: "DEMO-004", 
    name: "Cây Sầu Riêng 004",
    variety: "Monthong",
    zoneCode: "Z02_01",
    plantingDate: new Date('2018-11-05'),
    healthStatus: "Good",
    needsAttention: false,
    manualFruitCount: 35,
    aiFruitCount: 31,
    farmId: "demo-farm",
    latitude: 10.763222,
    longitude: 106.660772
  },
  {
    id: "demo-tree-5",
    qrCode: "DEMO-005",
    name: "Cây Sầu Riêng 005",
    variety: "Golden Pillow",
    zoneCode: "Z02_02", 
    plantingDate: new Date('2020-06-25'),
    healthStatus: "Excellent",
    needsAttention: false,
    manualFruitCount: 42,
    aiFruitCount: 38,
    farmId: "demo-farm",
    latitude: 10.763422,
    longitude: 106.660972
  }
];

interface TreeListProps {
  onTreeSelect?: (tree: Tree) => void
  selectedTreeId?: string
  showActions?: boolean
  className?: string
  pageSize?: number
}

export function TreeList({ onTreeSelect, selectedTreeId, showActions = true, className = '', pageSize = 20 }: TreeListProps) {
  const { user, currentFarm } = useAuth()
  const [trees, setTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterVariety, setFilterVariety] = useState<string>('all')
  const [filterZone, setFilterZone] = useState<string>('all')
  const [filterFruitCount, setFilterFruitCount] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'plantingDate' | 'healthStatus' | 'fruitCount'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(pageSize)

  useEffect(() => {
    if (!user || !currentFarm) {
      // Use demo data when not authenticated
      setTrees(DEMO_TREES)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const unsubscribe = subscribeToTrees(currentFarm.id, user.uid, (updatedTrees) => {
        setTrees(updatedTrees)
        setLoading(false)
      })

      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
    } catch (error) {
      console.error('Error subscribing to trees:', error)
      setTrees([])
      setLoading(false)
    }
  }, [user, currentFarm])

  // Get unique varieties and zones for filters
  const varieties = useMemo(() => {
    const varietySet = new Set<string>()
    trees.forEach(tree => {
      if (tree.variety) {
        varietySet.add(tree.variety)
      }
    })
    return Array.from(varietySet).sort()
  }, [trees])

  const zones = useMemo(() => {
    const zoneSet = new Set<string>()
    trees.forEach(tree => {
      if (tree.zoneCode) {
        zoneSet.add(tree.zoneCode)
      }
    })
    return Array.from(zoneSet).sort()
  }, [trees])

  // Filter and sort trees (without pagination)
  const filteredAndSortedTrees = useMemo(() => {
    const filtered = trees.filter(tree => {
      // Search filter
      const matchesSearch = !searchTerm || 
        tree.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tree.qrCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tree.zoneCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tree.variety?.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'healthy' && ['Excellent', 'Good'].includes(tree.healthStatus || '')) ||
        (filterStatus === 'needs_attention' && tree.needsAttention) ||
        (filterStatus === 'poor' && ['Fair', 'Poor'].includes(tree.healthStatus || ''))

      // Variety filter
      const matchesVariety = filterVariety === 'all' || tree.variety === filterVariety

      // Zone filter
      const matchesZone = filterZone === 'all' || tree.zoneCode === filterZone

      // Fruit count filter
      const totalFruitCount = (tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)
      const matchesFruitCount = filterFruitCount === 'all' || 
        (filterFruitCount === 'none' && totalFruitCount === 0) ||
        (filterFruitCount === 'low' && totalFruitCount > 0 && totalFruitCount <= 10) ||
        (filterFruitCount === 'medium' && totalFruitCount > 10 && totalFruitCount <= 30) ||
        (filterFruitCount === 'high' && totalFruitCount > 30)

      return matchesSearch && matchesStatus && matchesVariety && matchesZone && matchesFruitCount
    })

    // Sort trees
    filtered.sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortBy) {
        case 'name':
          aValue = a.name || a.qrCode || a.id
          bValue = b.name || b.qrCode || b.id
          break
        case 'plantingDate':
          aValue = a.plantingDate?.getTime() || 0
          bValue = b.plantingDate?.getTime() || 0
          break
        case 'healthStatus':
          const healthOrder = { 'Excellent': 4, 'Good': 3, 'Fair': 2, 'Poor': 1 }
          aValue = healthOrder[a.healthStatus as keyof typeof healthOrder] || 0
          bValue = healthOrder[b.healthStatus as keyof typeof healthOrder] || 0
          break
        case 'fruitCount':
          aValue = (a.manualFruitCount || 0) + (a.aiFruitCount || 0)
          bValue = (b.manualFruitCount || 0) + (b.aiFruitCount || 0)
          break
        default:
          aValue = a.name || a.qrCode || a.id
          bValue = b.name || b.qrCode || b.id
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [trees, searchTerm, filterStatus, filterVariety, filterZone, filterFruitCount, sortBy, sortOrder])

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedTrees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTrees = filteredAndSortedTrees.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterVariety, filterZone, filterFruitCount, sortBy, sortOrder])

  const getHealthIcon = (tree: Tree) => {
    if (tree.needsAttention) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
    }
    if (['Excellent', 'Good'].includes(tree.healthStatus || '')) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    }
    return <ClockIcon className="h-5 w-5 text-yellow-500" />
  }

  const getHealthStatusColor = (status?: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800'
      case 'Good': return 'bg-blue-100 text-blue-800'
      case 'Fair': return 'bg-yellow-100 text-yellow-800'
      case 'Poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (date?: Date | null) => {
    if (!date) return 'N/A'
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Danh Sách Cây</h2>
            <p className="text-sm text-gray-600 mt-1">
              Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredAndSortedTrees.length)} / {filteredAndSortedTrees.length} cây
              {filteredAndSortedTrees.length !== trees.length && ` (${trees.length} tổng cộng)`}
            </p>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, mã QR, khu vực, giống..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters Row 1 */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="healthy">Khỏe mạnh</option>
                <option value="needs_attention">Cần chú ý</option>
                <option value="poor">Yếu</option>
              </select>

              <select
                value={filterVariety}
                onChange={(e) => setFilterVariety(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tất cả giống</option>
                {varieties.map(variety => (
                  <option key={variety} value={variety}>{variety}</option>
                ))}
              </select>

              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tất cả khu vực</option>
                {zones.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>

              <select
                value={filterFruitCount}
                onChange={(e) => setFilterFruitCount(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tất cả số trái</option>
                <option value="none">Không có trái (0)</option>
                <option value="low">Ít trái (1-10)</option>
                <option value="medium">Trung bình (11-30)</option>
                <option value="high">Nhiều trái (&gt;30)</option>
              </select>
            </div>

            {/* Filters Row 2 - Sorting and Pagination */}
            <div className="flex flex-wrap gap-2">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field as typeof sortBy)
                  setSortOrder(order as typeof sortOrder)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="name-asc">Tên A-Z</option>
                <option value="name-desc">Tên Z-A</option>
                <option value="plantingDate-desc">Ngày trồng mới nhất</option>
                <option value="plantingDate-asc">Ngày trồng cũ nhất</option>
                <option value="healthStatus-desc">Sức khỏe tốt nhất</option>
                <option value="healthStatus-asc">Sức khỏe yếu nhất</option>
                <option value="fruitCount-desc">Nhiều trái nhất</option>
                <option value="fruitCount-asc">Ít trái nhất</option>
              </select>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tree List */}
      <div className="p-6">
        {filteredAndSortedTrees.length === 0 ? (
          <div className="text-center py-12">
            <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy cây nào</h3>
            <p className="text-gray-600">
              {trees.length === 0 
                ? 'Chưa có cây nào được trồng trong nông trại này.'
                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedTrees.map((tree) => (
              <div
                key={tree.id}
                onClick={() => onTreeSelect?.(tree)}
                data-testid="tree-card"
                className={`p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md ${
                  selectedTreeId === tree.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Tree Image Preview */}
                    <div className="flex-shrink-0">
                      <TreeImagePreview 
                        treeId={tree.id}
                        farmId={tree.farmId}
                        qrCode={tree.qrCode}
                        className="w-12 h-12"
                      />
                    </div>

                    {/* Health Icon */}
                    <div className="flex-shrink-0">
                      {getHealthIcon(tree)}
                    </div>

                    {/* Tree Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {tree.name || `Cây ${tree.qrCode || tree.id.slice(0, 8)}`}
                        </h3>
                        {tree.variety && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {tree.variety}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        {tree.zoneCode && (
                          <span className="flex items-center">
                            <MapPinIcon className="h-3 w-3 mr-1" />
                            Khu {tree.zoneCode}
                          </span>
                        )}
                        <span>Trồng: {formatDate(tree.plantingDate)}</span>
                        <span>
                          Trái: {((tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Health Status */}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(tree.healthStatus)}`}>
                      {tree.healthStatus || 'Chưa đánh giá'}
                    </span>

                    {/* Actions */}
                    {showActions && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onTreeSelect?.(tree)
                          }}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Xem chi tiết"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Handle edit action
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional info when selected */}
                {selectedTreeId === tree.id && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500">Chiều cao:</span>
                        <div className="font-medium">{tree.treeHeight ? `${tree.treeHeight}m` : 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Đường kính:</span>
                        <div className="font-medium">{tree.trunkDiameter ? `${tree.trunkDiameter}cm` : 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Phân bón:</span>
                        <div className="font-medium">{formatDate(tree.fertilizedDate)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Tỉa cành:</span>
                        <div className="font-medium">{formatDate(tree.prunedDate)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredAndSortedTrees.length > itemsPerPage && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-600">
              Trang {currentPage} / {totalPages}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Trước
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? 'bg-green-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Sau
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}