'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { useSearchParams } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tree } from '@/lib/types'
import dynamic from 'next/dynamic'
import { TreeDetail } from '@/components/TreeDetail'
import { 
  EyeIcon, 
  MapIcon, 
  ListBulletIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import LargeTitleHeader from '@/components/ui/LargeTitleHeader'
import BottomSheet from '@/components/ui/BottomSheet'
import AuthGuard from '@/components/AuthGuard'

interface Zone {
  id: string
  name: string
  code?: string
  description?: string
  color?: string
  boundaries: Array<{ latitude: number; longitude: number }>
  treeCount: number
  area: number
  isActive: boolean
  createdAt: Date
}

const MapWrapperNoSSR = dynamic(() => import('@/components/MapWrapper'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-green-50">
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
        <p className="text-lg font-medium text-green-800 mb-2">Đang tải bản đồ</p>
        <p className="text-sm text-green-600">Vui lòng đợi trong giây lát...</p>
      </div>
    </div>
  )
})

// Simple filter options for farmers
type ViewMode = 'all' | 'trees' | 'zones' | 'problems'

interface SimpleFilters {
  viewMode: ViewMode
  searchText: string
  showOnlyProblems: boolean
}

function MapPageContent() {
  const { currentFarm } = useSimpleAuth()
  const searchParams = useSearchParams()
  const focusZoneId = searchParams?.get('zone')
  
  const [trees, setTrees] = useState<Tree[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Simplified filter state
  const [filters, setFilters] = useState<SimpleFilters>({
    viewMode: 'all',
    searchText: '',
    showOnlyProblems: false
  })
  
  const [showFilters, setShowFilters] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Load data
  useEffect(() => {
    if (currentFarm?.id) {
      loadData()
    }
  }, [currentFarm])

  const loadData = async () => {
    if (!currentFarm?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🗺️ Loading map data for farm:', currentFarm.id)
      
      const [treesData, zonesData] = await Promise.all([
        loadTrees(currentFarm.id),
        loadZones(currentFarm.id)
      ])
      
      setTrees(treesData)
      setZones(zonesData)
      
      console.log('✅ Map data loaded:', { trees: treesData.length, zones: zonesData.length })
      
      // Focus on specific zone if provided
      if (focusZoneId && zonesData.length > 0) {
        const targetZone = zonesData.find(z => z.id === focusZoneId)
        if (targetZone) {
          setSelectedZone(targetZone)
          setFilters(prev => ({ ...prev, viewMode: 'zones' }))
        }
      }
    } catch (error) {
      console.error('❌ Error loading map data:', error)
      setError('Không thể tải dữ liệu bản đồ. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const loadTrees = async (farmId: string): Promise<Tree[]> => {
    try {
      const treesRef = collection(db, 'farms', farmId, 'trees')
      const treesSnapshot = await getDocs(treesRef)
      
      const treesData = treesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          farmId: farmId,
          name: data.name || `Cây ${doc.id.slice(-4)}`,
          qrCode: data.qrCode || doc.id,
          variety: data.variety || 'Chưa xác định',
          zoneCode: data.zoneCode || data.zoneId || '',
          plantingDate: data.plantingDate?.toDate?.() || data.plantingDate,
          healthStatus: data.healthStatus || 'Good',
          needsAttention: data.needsAttention || false,
          manualFruitCount: data.manualFruitCount || 0,
          aiFruitCount: data.aiFruitCount || 0,
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          ...data
        } as Tree
      }).filter(tree => tree.latitude && tree.longitude && tree.latitude !== 0 && tree.longitude !== 0)
      
      return treesData
    } catch (error) {
      console.error('Error loading trees:', error)
      return []
    }
  }

  const loadZones = async (farmId: string): Promise<Zone[]> => {
    try {
      let zonesRef = collection(db, 'farms', farmId, 'zones')
      let zonesSnapshot = await getDocs(zonesRef)
      
      if (zonesSnapshot.empty) {
        zonesRef = collection(db, 'zones')
        zonesSnapshot = await getDocs(query(zonesRef, where('farmId', '==', farmId)))
      }
      
      const zonesData = zonesSnapshot.docs.map(doc => {
        const data = doc.data()
        const boundaries = data.boundary || data.boundaries || data.coordinates || []
        
        return {
          id: doc.id,
          name: data.name || `Khu vực ${doc.id.slice(-4)}`,
          description: data.description || '',
          color: data.color || '#3b82f6',
          boundaries: boundaries,
          treeCount: data.treeCount || 0,
          area: data.area || 0,
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate?.() || new Date()
        }
      }).filter(zone => zone.boundaries && Array.isArray(zone.boundaries) && zone.boundaries.length >= 3)
      
      return zonesData
    } catch (error) {
      console.error('Error loading zones:', error)
      return []
    }
  }

  // Filter data based on current filters
  const getFilteredData = () => {
    let filteredTrees = trees
    let filteredZones = zones

    // Filter by search text
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase()
      filteredTrees = trees.filter(tree => 
        (tree.name || '').toLowerCase().includes(searchLower) ||
        (tree.variety || '').toLowerCase().includes(searchLower) ||
        (tree.qrCode || '').toLowerCase().includes(searchLower)
      )
      filteredZones = zones.filter(zone =>
        (zone.name || '').toLowerCase().includes(searchLower) ||
        (zone.description || '').toLowerCase().includes(searchLower)
      )
    }

    // Filter by problems only
    if (filters.showOnlyProblems) {
      filteredTrees = filteredTrees.filter(tree => 
        tree.needsAttention || 
        tree.healthStatus === 'Poor'
      )
    }

    return { trees: filteredTrees, zones: filteredZones }
  }

  const getViewModeConfig = (mode: ViewMode) => {
    const configs = {
      all: {
        title: 'Tất cả',
        icon: '🔍',
        description: 'Hiển thị cây và khu vực',
        showTrees: true,
        showZones: true
      },
      trees: {
        title: 'Cây trồng',
        icon: '🌳',
        description: 'Chỉ hiển thị cây',
        showTrees: true,
        showZones: false
      },
      zones: {
        title: 'Khu vực',
        icon: '📍',
        description: 'Chỉ hiển thị khu vực',
        showTrees: false,
        showZones: true
      },
      problems: {
        title: 'Cần chú ý',
        icon: '⚠️',
        description: 'Cây có vấn đề',
        showTrees: true,
        showZones: false
      }
    }
    return configs[mode]
  }

  const problemTreesCount = trees.filter(tree => 
    tree.needsAttention || 
    tree.healthStatus === 'Poor'
  ).length

  const filteredData = getFilteredData()
  const currentConfig = getViewModeConfig(filters.viewMode)

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">Đang tải bản đồ</h3>
          <p className="text-green-600">Vui lòng đợi trong giây lát...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-red-800 mb-4">Lỗi tải dữ liệu</h3>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={loadData}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Farmer-Friendly Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bản đồ nông trại</h1>
              <p className="text-sm text-gray-600">{currentFarm?.name}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-xl transition-colors ${
                  showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Simple View Mode Selector */}
          <div className="grid grid-cols-4 gap-2">
            {(['all', 'trees', 'zones', 'problems'] as ViewMode[]).map((mode) => {
              const config = getViewModeConfig(mode)
              const isActive = filters.viewMode === mode
              const count = mode === 'problems' ? problemTreesCount : 
                           mode === 'trees' ? filteredData.trees.length :
                           mode === 'zones' ? filteredData.zones.length :
                           filteredData.trees.length + filteredData.zones.length
              
              return (
                <button
                  key={mode}
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    viewMode: mode,
                    showOnlyProblems: mode === 'problems'
                  }))}
                  className={`p-3 rounded-xl text-center transition-all ${
                    isActive 
                      ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{config.icon}</div>
                  <div className="text-xs font-semibold">{config.title}</div>
                  <div className="text-xs text-gray-500">{count}</div>
                </button>
              )
            })}
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm cây hoặc khu vực..."
              value={filters.searchText}
              onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl text-base placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-green-500 transition-all"
            />
            {filters.searchText && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchText: '' }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                <XMarkIcon className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Current View Info */}
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{currentConfig.icon}</span>
                <div>
                  <div className="font-semibold text-green-800">{currentConfig.title}</div>
                  <div className="text-sm text-green-600">{currentConfig.description}</div>
                </div>
              </div>
              {filters.viewMode === 'problems' && problemTreesCount > 0 && (
                <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold">
                  {problemTreesCount} cây cần chú ý
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative" style={{ height: 'calc(100vh - 280px)' }}>
        {trees.length === 0 && zones.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-8">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <MapIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Chưa có dữ liệu</h3>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Chưa có cây hoặc khu vực nào được thêm vào bản đồ. 
                Hãy bắt đầu bằng cách thêm cây hoặc tạo khu vực mới.
              </p>
              <div className="space-y-3">
                <a
                  href="/trees"
                  className="block bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                >
                  Thêm cây mới
                </a>
                <a
                  href="/zones"
                  className="block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Tạo khu vực
                </a>
              </div>
            </div>
          </div>
        ) : (
          <MapWrapperNoSSR
            trees={currentConfig.showTrees ? filteredData.trees : []}
            zones={currentConfig.showZones ? filteredData.zones : []}
            selectedTree={selectedTree}
            selectedZone={selectedZone}
            onTreeSelect={setSelectedTree}
            onZoneSelect={setSelectedZone}
            center={focusZoneId && selectedZone ? undefined : [10.762622, 106.660172]}
            zoom={focusZoneId ? 18 : 16}
            className="h-full w-full rounded-none"
          />
        )}
      </div>

      {/* Mobile Tree Detail Bottom Sheet */}
      {selectedTree && (
        <BottomSheet
          isOpen={!!selectedTree}
          onClose={() => setSelectedTree(null)}
          initialDetent="medium"
          detents={["full", "large", "medium"]}
          header={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">🌳</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedTree.name}</h3>
                  <p className="text-sm text-gray-500">{selectedTree.variety}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTree(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          }
        >
          <TreeDetail
            tree={selectedTree}
            onClose={() => setSelectedTree(null)}
            onTreeUpdate={(updatedTree) => {
              setTrees(prev => prev.map(t => t.id === updatedTree.id ? updatedTree : t))
              setSelectedTree(updatedTree)
            }}
            disableMobileFullscreen={true}
          />
        </BottomSheet>
      )}

      {/* Zone Detail Bottom Sheet */}
      {selectedZone && (
        <BottomSheet
          isOpen={!!selectedZone}
          onClose={() => setSelectedZone(null)}
          initialDetent="medium"
          detents={["large", "medium"]}
          header={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: selectedZone.color + '20' }}
                >
                  <span className="text-lg">📍</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedZone.name}</h3>
                  <p className="text-sm text-gray-500">{selectedZone.treeCount} cây</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedZone(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Zone Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{selectedZone.treeCount}</div>
                <div className="text-sm text-blue-700">Số cây</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">{selectedZone.area.toFixed(1)}</div>
                <div className="text-sm text-green-700">Hecta</div>
              </div>
            </div>

            {selectedZone.description && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Mô tả</h4>
                <p className="text-gray-700">{selectedZone.description}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <a
                href={`/zones/${selectedZone.id}`}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold text-center hover:bg-blue-700 transition-colors"
              >
                Xem chi tiết
              </a>
              <a
                href={`/trees?zone=${selectedZone.id}`}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-semibold text-center hover:bg-green-700 transition-colors"
              >
                Xem cây trong khu
              </a>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

export default function ImprovedMapPage() {
  return (
    <AuthGuard requiredPermission="read" requireFarmAccess={true}>
      <Suspense fallback={
        <div className="min-h-screen bg-green-50 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">Đang tải bản đồ</h3>
            <p className="text-green-600">Vui lòng đợi trong giây lát...</p>
          </div>
        </div>
      }>
        <MapPageContent />
      </Suspense>
    </AuthGuard>
  )
}