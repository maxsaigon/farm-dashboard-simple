'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useSimpleAuth } from '@/lib/simple-auth-context'
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

// No mock data - use only real API data

interface TreeListProps {
  onTreeSelect?: (tree: Tree) => void
  selectedTreeId?: string
  showActions?: boolean
  className?: string
  pageSize?: number
}

export function TreeList({ onTreeSelect, selectedTreeId, showActions = true, className = '', pageSize = 20 }: TreeListProps) {
  const { user, currentFarm } = useSimpleAuth()
  const [trees, setTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const touchStartY = useRef<number | null>(null)
  const pulling = useRef(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterVariety, setFilterVariety] = useState<string>('all')
  const [filterZone, setFilterZone] = useState<string>('all')
  const [filterFruitCount, setFilterFruitCount] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'plantingDate' | 'healthStatus' | 'fruitCount'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshToken, setRefreshToken] = useState(0)
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || !currentFarm) {
      // Show empty state when not authenticated
      setTrees([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const unsubscribe = subscribeToTrees(currentFarm.id, user.uid, (updatedTrees) => {
        // Show real data or empty list if no trees loaded
        setTrees(updatedTrees)
        setLoading(false)
      })

      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
    } catch (error) {
      setTrees([])
      setLoading(false)
    }
  }, [user, currentFarm, refreshToken])

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
      const zoneValue = tree.zoneName || tree.zoneCode
      if (zoneValue) {
        zoneSet.add(zoneValue)
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
        (tree.zoneName || tree.zoneCode)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tree.variety?.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'healthy' && ['Excellent', 'Good'].includes(tree.healthStatus || '')) ||
        (filterStatus === 'needs_attention' && tree.needsAttention) ||
        (filterStatus === 'poor' && ['Fair', 'Poor'].includes(tree.healthStatus || ''))

      // Variety filter
      const matchesVariety = filterVariety === 'all' || tree.variety === filterVariety

      // Zone filter
      const matchesZone = filterZone === 'all' || (tree.zoneName || tree.zoneCode) === filterZone

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

  // Virtualization setup
  const virtualizer = useVirtualizer({
    count: filteredAndSortedTrees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // estimated height of each tree card
    overscan: 5
  })


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
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div className="flex items-center justify-center text-sm text-gray-600" style={{ height: Math.min(pullDistance, 80) }}>
          {isRefreshing ? 'Đang làm mới...' : 'Kéo xuống để làm mới'}
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-gray-200" onTouchStart={(e) => {
        if (window.scrollY <= 0) {
          touchStartY.current = e.touches[0].clientY
          pulling.current = true
          setPullDistance(0)
        }
      }}
      onTouchMove={(e) => {
        if (!pulling.current || touchStartY.current == null) return
        const dy = e.touches[0].clientY - touchStartY.current
        if (dy > 0) {
          setPullDistance(dy)
        }
      }}
      onTouchEnd={() => {
        if (!pulling.current) return
        pulling.current = false
        if (pullDistance > 80) {
          setIsRefreshing(true)
          setRefreshToken((x) => x + 1)
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(10)
          setTimeout(() => setIsRefreshing(false), 600)
        }
        setPullDistance(0)
      }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Danh Sách Cây</h2>
            <p className="text-sm text-gray-600 mt-1">
              Hiển thị {filteredAndSortedTrees.length} cây
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
          <div 
            ref={parentRef}
            className="overflow-auto"
            style={{ height: '600px' }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative'
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const tree = filteredAndSortedTrees[virtualItem.index]
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`
                    }}
                  >
                    <div
                      onClick={() => onTreeSelect?.(tree)}
                      data-testid="tree-card"
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 m-1 ${
                        tree.id === selectedTreeId 
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
                          {tree.name || `Cây ${tree.variety || tree.id.slice(0, 8)}`}
                        </h3>
                        {tree.variety && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {tree.variety}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                       {(tree.zoneName || tree.zoneCode) && (
                         <span className="flex items-center">
                           <MapPinIcon className="h-3 w-3 mr-1" />
                           Khu {tree.zoneName || tree.zoneCode}
                         </span>
                       )}
                        <span>Trồng: {formatDate(tree.plantingDate)}</span>
                        <span>
                          Trái: {((tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
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
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}