'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { useSearchParams } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tree } from '@/lib/types'
import dynamic from 'next/dynamic'
import { TreeDetail } from '@/components/TreeDetail'
import TreeShowcase from '@/components/TreeShowcase'
import FullscreenTreeShowcase from '@/components/FullscreenTreeShowcase'
import { EyeIcon, BriefcaseIcon, Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline'
import LargeTitleHeader from '@/components/ui/LargeTitleHeader'
import BottomSheet from '@/components/ui/BottomSheet'
import AuthGuard from '@/components/AuthGuard'
import logger from '@/lib/logger'

// Dynamic import OnFarmWorkMode to avoid SSR issues
const OnFarmWorkMode = dynamic(() => import('@/components/OnFarmWorkMode'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-white flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang khởi động chế độ làm việc...</p>
      </div>
    </div>
  )
})

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

function polygonAreaHectares(coords: Array<{ latitude: number; longitude: number }>): number {
  if (!coords || coords.length < 3) return 0
  const R = 6371000
  const lat0 = coords.reduce((s, p) => s + p.latitude, 0) / coords.length
  const lat0Rad = (lat0 * Math.PI) / 180
  const points = coords.map(p => ({
    x: (p.longitude * Math.PI / 180) * R * Math.cos(lat0Rad),
    y: (p.latitude * Math.PI / 180) * R
  }))
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    sum += points[i].x * points[j].y - points[j].x * points[i].y
  }
  const areaMeters2 = Math.abs(sum) / 2
  return areaMeters2 / 10000
}

const UnifiedMapNoSSR = dynamic(() => import('@/components/UnifiedMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang tải bản đồ...</p>
      </div>
    </div>
  )
})

function MapPageContent() {
  const { currentFarm } = useSimpleAuth()
  const searchParams = useSearchParams()
  const focusZoneId = searchParams?.get('zone')
  const highlightTreeParam = searchParams?.get('highlightTree')
  
  const [trees, setTrees] = useState<Tree[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showZones, setShowZones] = useState(true)
  const [showTrees, setShowTrees] = useState(true)
  const [focusedZone, setFocusedZone] = useState<Zone | null>(null)
  const [showFullscreenTree, setShowFullscreenTree] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] = useState(false)
  const [proximityRadius, setProximityRadius] = useState(30)
  const [showUserPath, setShowUserPath] = useState(false)
  const [highlightedTreeId, setHighlightedTreeId] = useState<string | null>(null)
  const [workModeActive, setWorkModeActive] = useState(false)
  const [mapLayer, setMapLayer] = useState<'auto' | 'street' | 'hybrid'>('auto')
  
  // Tree status filters
  const [filterByStatus, setFilterByStatus] = useState<{
    youngTree: boolean
    mature: boolean
    old: boolean
  }>({
    youngTree: true,
    mature: true,
    old: true
  })

  // Debug GPS props
  useEffect(() => {
    console.log('🔧 [MapPage] GPS Settings changed:', {
      showUserPath,
      backgroundTrackingEnabled,
      proximityRadius,
      timestamp: new Date().toISOString()
    })
  }, [showUserPath, backgroundTrackingEnabled, proximityRadius])

  // Check for highlighted tree from URL parameter when trees change
  useEffect(() => {
    if (highlightTreeParam && trees.length > 0) {
      const treeToHighlight = trees.find(t => t.id === highlightTreeParam)
      
      if (treeToHighlight) {
        console.log('🎯 [MapPage] Highlighting tree from URL:', treeToHighlight.name)
        // Only set highlightedTreeId, do NOT set selectedTree to avoid opening modals
        setHighlightedTreeId(treeToHighlight.id)
        // Make sure no modals are open
        setSelectedTree(null)
        setShowFullscreenTree(false)
      } else {
        console.warn('🎯 [MapPage] Tree not found:', highlightTreeParam)
      }
    } else if (!highlightTreeParam) {
      // Clear highlight when parameter is removed
      setHighlightedTreeId(null)
    }
  }, [highlightTreeParam, trees])

  // Debug farm ID for testing
  const debugFarmId = "F210C3FC-F191-4926-9C15-58D6550A716A"
  const debugFarm = { id: debugFarmId, name: "Debug Farm" }
  const displayFarm = currentFarm || debugFarm

  useEffect(() => {
    console.log('🗺️ [MapPage] Farm changed, loading data:', {
      farmId: displayFarm.id,
      farmName: displayFarm.name,
      timestamp: new Date().toISOString()
    })
    
    if (displayFarm.id) {
      loadData()
    }
  }, [displayFarm.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    const farmId = displayFarm.id
    console.log('📊 [MapPage] loadData called for farmId:', farmId)
    
    if (!farmId) return

    setLoading(true)
    setError(null)
    try {
      console.log('🔄 [MapPage] Loading trees and zones...')
      const [treesData, zonesData] = await Promise.all([
        loadTrees(farmId),
        loadZones(farmId)
      ])
      
      console.log('✅ [MapPage] Data loaded:', {
        treesCount: treesData.length,
        zonesCount: zonesData.length
      })

      // Map zone IDs/codes to human-friendly names
      const codeToName = new Map<string, string>()
      zonesData.forEach(z => {
        if (z.id) codeToName.set(z.id, z.name)
        if (z.code) codeToName.set(z.code, z.name)
        if (z.name) codeToName.set(z.name, z.name)
      })
      const treesWithNames = treesData.map(t => ({
        ...t,
        zoneName: t.zoneName || (t.zoneCode ? codeToName.get(String(t.zoneCode)) : undefined)
      }))

      console.log('📝 [MapPage] Setting trees and zones state')
      setTrees(treesWithNames)
      setZones(zonesData)
      
      console.log('✅ [MapPage] State updated:', {
        trees: treesWithNames.length,
        zones: zonesData.length
      })
      
      // Handle zone focus if zone ID is in URL
      if (focusZoneId && zonesData.length > 0) {
        const targetZone = zonesData.find(zone => zone.id === focusZoneId)
        if (targetZone) {
          const relatedTrees = treesData.filter(tree =>
            (tree.zoneName || tree.zoneCode) === targetZone.id ||
            (tree.zoneName || tree.zoneCode) === targetZone.name ||
            (tree as any).zoneId === targetZone.id ||
            (tree as any).zoneId === targetZone.name
          )

          setFocusedZone(targetZone)
          setSelectedZone(targetZone)
          setShowZones(true)
          setShowTrees(true)
        } else {
          logger.warn('Zone not found:', focusZoneId)
          logger.warn('Available zones:', zonesData.map(z => ({ id: z.id, name: z.name })))
        }
      }
    } catch (error) {
      logger.error('Error loading data:', error)
      setError('Không thể tải dữ liệu bản đồ')
    } finally {
      setLoading(false)
    }
  }

  const loadTrees = async (farmId: string): Promise<Tree[]> => {
    if (!farmId) return []

    try {
      const treesRef = collection(db, 'farms', farmId, 'trees')
      const treesSnapshot = await getDocs(treesRef)
      
      const treesData = treesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          farmId: farmId,
          name: data.name || `Tree ${doc.id}`,
          qrCode: data.qrCode || doc.id,
          variety: data.variety || 'Unknown',
          zoneCode: data.zoneCode || data.zoneId || 'N/A',
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
      logger.error('Error loading trees:', error)
      return []
    }
  }

  const loadZones = async (farmId: string): Promise<Zone[]> => {
    if (!farmId) return []

    try {
      let zonesRef = collection(db, 'farms', farmId, 'zones')
      let zonesSnapshot = await getDocs(zonesRef)

      if (zonesSnapshot.empty) {
        zonesRef = collection(db, 'zones')
        zonesSnapshot = await getDocs(query(zonesRef, where('farmId', '==', farmId)))
      }
      
      const zonesData = zonesSnapshot.docs.map(doc => {
        const data = doc.data()

        const boundaries = data.boundary || data.boundaries || data.coordinates || data.polygon || data.points || []
        const metadata = data.metadata || {}

        const computedArea = Array.isArray(boundaries) && boundaries.length >= 3 ? polygonAreaHectares(boundaries) : (data.area || metadata.area || 0)
        return {
          id: doc.id,
          name: data.name || `Zone ${doc.id}`,
          code: data.code,
          description: data.description || '',
          color: data.color || '#3b82f6',
          boundaries: boundaries,
          treeCount: data.treeCount || 0,
          area: Math.round((computedArea + Number.EPSILON) * 100) / 100,
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date()
        }
      })

      const zonesWithBoundaries = zonesData.filter(zone => {
        const hasBoundaries = zone.boundaries && Array.isArray(zone.boundaries) && zone.boundaries.length >= 3
        return hasBoundaries
      })
      
      return zonesWithBoundaries.length > 0 ? zonesWithBoundaries : zonesData.slice(0, 3)
      
    } catch (error) {
      logger.error('Error loading zones:', error)
      return []
    }
  }

  // Helper function to filter trees by status
  const getFilteredTrees = (trees: Tree[]): Tree[] => {
    return trees.filter(tree => {
      if (!tree.treeStatus) return true
      
      const status = tree.treeStatus.toLowerCase()
      if (status.includes('non') || status.includes('young')) {
        return filterByStatus.youngTree
      } else if (status.includes('trưởng thành') || status.includes('mature')) {
        return filterByStatus.mature
      } else if (status.includes('già') || status.includes('old')) {
        return filterByStatus.old
      }
      
      return true
    })
  }

  const handleTreeSelect = (tree: Tree) => {
    console.log('🌳 Tree selected from map:', tree.name || tree.variety)
    setSelectedTree(tree)
    setSelectedZone(null)
    setShowFullscreenTree(true)
    // Clear highlight when user manually selects a different tree
    setHighlightedTreeId(null)
  }

  const handleZoneSelect = (zone: Zone) => {
    try {
      if (zone && zone.id) {
        setSelectedZone(zone)
        setSelectedTree(null)
      } else {
        logger.error('🎯 Invalid zone passed to handleZoneSelect:', zone)
      }
    } catch (error) {
      logger.error('🎯 Error in handleZoneSelect:', error)
      logger.error('🎯 Zone data:', zone)
    }
  }

  const handleCloseDetail = () => {
    setSelectedTree(null)
    setSelectedZone(null)
  }

  const handleCloseFullscreenTree = () => {
    setShowFullscreenTree(false)
    setSelectedTree(null)
    setSelectedZone(null)
    // Clear highlight when closing fullscreen
    setHighlightedTreeId(null)
  }

  const handleTreeUpdate = (updatedTree: Tree) => {
    setTrees(prevTrees => 
      prevTrees.map(tree => 
        tree.id === updatedTree.id ? updatedTree : tree
      )
    )
    if (selectedTree && selectedTree.id === updatedTree.id) {
      setSelectedTree(updatedTree)
    }
  }

  const handleRetry = () => {
    loadData()
  }

  // Helper function to check if a point is inside a polygon
  const isPointInPolygon = (point: { lat: number, lng: number }, polygon: Array<{ latitude: number, longitude: number }>) => {
    if (polygon.length < 3) return false
    
    const x = point.lng, y = point.lat
    let inside = false
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude, yi = polygon[i].latitude
      const xj = polygon[j].longitude, yj = polygon[j].latitude
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    
    return inside
  }

  // Helper function to filter trees for a zone
  const getTreesForZone = (trees: Tree[], zone: Zone): Tree[] => {
    if (!zone) return trees

    let filteredTrees = trees.filter(tree => {
      const zoneValue = tree.zoneName || tree.zoneCode
      const matches = [
        zoneValue === zone.id,
        zoneValue === zone.name,
        (tree as any).zoneId === zone.id,
        (tree as any).zoneId === zone.name,
        zoneValue?.toLowerCase() === zone.id?.toLowerCase(),
        zoneValue?.toLowerCase() === zone.name?.toLowerCase()
      ].some(Boolean)

      return matches
    })

    if (filteredTrees.length === 0 && zone.boundaries && zone.boundaries.length >= 3) {
      filteredTrees = trees.filter(tree => {
        const treeLat = (tree as any).location?.latitude || (tree as any).latitude
        const treeLng = (tree as any).location?.longitude || (tree as any).longitude

        if (treeLat && treeLng && treeLat !== 0 && treeLng !== 0) {
          const isInside = isPointInPolygon(
            { lat: treeLat, lng: treeLng },
            zone.boundaries
          )

          return isInside
        }
        return false
      })
    }

    return filteredTrees
  }

  const treesInFocusedZone = focusedZone ? getTreesForZone(trees, focusedZone).length : 0

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Lỗi</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  if (workModeActive) {
    return (
      <OnFarmWorkMode
        trees={trees}
        zones={zones}
        onClose={() => setWorkModeActive(false)}
        onTreeSelect={handleTreeSelect}
        onTreeCreated={(newTree) => {
          setTrees(prev => [...prev, newTree])
          loadData()
        }}
        farmId={displayFarm.id}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      {/* Professional Header - Single Row Layout */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          {/* Single Row: All Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Left: Work Mode Button */}
            <button
              onClick={() => setWorkModeActive(true)}
              className="btn-primary flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 hover:shadow-lg active:scale-95 transition-all"
              title="Chế độ làm việc on-farm"
            >
              <BriefcaseIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Làm việc</span>
            </button>

            {/* Center: Display Toggles */}
            <div className="flex items-center space-x-2 flex-1 justify-center">
              {/* Trees Toggle */}
              <button
                onClick={() => setShowTrees(!showTrees)}
                className={`btn-toggle flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  showTrees
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-green-700 border-2 border-green-200 hover:bg-green-50'
                }`}
              >
                <span className="text-base">🌳</span>
                <span>{loading ? '...' : `${trees.length} Cây`}</span>
              </button>

              {/* Zones Toggle or Focused Zone Display */}
              {focusedZone ? (
                <div className="flex items-center space-x-2 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold border-2 border-blue-200">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: focusedZone.color }}
                  />
                  <span className="text-base">📍</span>
                  <span>{treesInFocusedZone} Cây trong {focusedZone.name}</span>
                  <button
                    onClick={() => {
                      setFocusedZone(null)
                      setSelectedZone(null)
                      window.history.pushState({}, '', '/map')
                    }}
                    className="ml-1 p-1 rounded-full bg-white hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowZones(!showZones)}
                  className={`btn-toggle flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    showZones
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-blue-700 border-2 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <span className="text-base">📍</span>
                  <span>{loading ? '...' : `${zones.length} Khu`}</span>
                </button>
              )}

              {/* GPS Status Indicator */}
              {backgroundTrackingEnabled && (
                <div className="flex items-center space-x-2 bg-purple-50 text-purple-800 px-3 py-2 rounded-lg text-sm font-semibold border-2 border-purple-200">
                  <span className="text-base">📍</span>
                  <span>GPS</span>
                  <button
                    onClick={() => setBackgroundTrackingEnabled(false)}
                    className="ml-1 p-1 rounded-full bg-white hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Settings Button */}
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className={`btn-secondary p-2.5 rounded-lg font-medium transition-all ${
                showAdvancedSettings
                  ? 'bg-gray-200 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Cài đặt"
            >
              {showAdvancedSettings ? (
                <XMarkIcon className="h-5 w-5" />
              ) : (
                <Cog6ToothIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Advanced Settings Panel */}
          {showAdvancedSettings && (
            <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="space-y-4">
                {/* Display Options */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Hiển thị</h3>
                  
                  {/* GPS Path Toggle */}
                  <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={showUserPath}
                        onChange={(e) => setShowUserPath(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Đường đi GPS</span>
                    </div>
                  </label>

                  {/* Tree Status Filters */}
                  <div className="mt-3 p-3 bg-white rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Lọc theo trạng thái</h4>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterByStatus.youngTree}
                          onChange={(e) => setFilterByStatus(prev => ({ ...prev, youngTree: e.target.checked }))}
                          className="w-4 h-4 text-green-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">🌱 Cây Non</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterByStatus.mature}
                          onChange={(e) => setFilterByStatus(prev => ({ ...prev, mature: e.target.checked }))}
                          className="w-4 h-4 text-green-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">🌳 Cây Trưởng Thành</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterByStatus.old}
                          onChange={(e) => setFilterByStatus(prev => ({ ...prev, old: e.target.checked }))}
                          className="w-4 h-4 text-green-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">🌲 Cây Già</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* GPS Controls */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center">
                    <span className="mr-2">📍</span>
                    GPS Tracking
                  </h3>
                  
                  {!backgroundTrackingEnabled ? (
                    <button
                      onClick={() => setBackgroundTrackingEnabled(true)}
                      className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-md"
                    >
                      Bật GPS Tracking
                    </button>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-purple-700">GPS đang hoạt động</span>
                      </div>
                      <button
                        onClick={() => setBackgroundTrackingEnabled(false)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 active:bg-red-800 transition-colors"
                      >
                        Tắt
                      </button>
                    </div>
                  )}

                  {/* Proximity Radius Slider */}
                  <div className="mt-3 p-3 bg-white rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Bán kính phát hiện</span>
                      <div className="bg-blue-100 px-3 py-1 rounded-full">
                        <span className="text-sm font-bold text-blue-700">{proximityRadius}m</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={proximityRadius}
                      onChange={(e) => setProximityRadius(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10m</span>
                      <span>100m</span>
                    </div>
                  </div>
                </div>

               {/* Map Layer Selector */}
               <div>
                 <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center">
                   <span className="mr-2">🗺️</span>
                   Chế độ xem bản đồ
                 </h3>
                 
                 <div className="space-y-2">
                   <button
                     onClick={() => setMapLayer('auto')}
                     className={`w-full p-3 rounded-lg text-sm font-semibold transition-all ${
                       mapLayer === 'auto'
                         ? 'bg-green-600 text-white shadow-md'
                         : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50'
                     }`}
                   >
                     <div className="flex items-center justify-between">
                       <span>🤖 Tự động</span>
                       <span className="text-xs opacity-75">Zoom 1-18: Hybrid, 19+: Bản đồ</span>
                     </div>
                   </button>
                   
                   <button
                     onClick={() => setMapLayer('street')}
                     className={`w-full p-3 rounded-lg text-sm font-semibold transition-all ${
                       mapLayer === 'street'
                         ? 'bg-blue-600 text-white shadow-md'
                         : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50'
                     }`}
                   >
                     🗺️ Bản đồ đường phố
                   </button>
                   
                   <button
                     onClick={() => setMapLayer('hybrid')}
                     className={`w-full p-3 rounded-lg text-sm font-semibold transition-all ${
                       mapLayer === 'hybrid'
                         ? 'bg-blue-600 text-white shadow-md'
                         : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50'
                     }`}
                   >
                     🌍 Hybrid (Vệ tinh + Nhãn)
                   </button>
                 </div>
               </div>

               {/* Close Button */}
               <button
                 onClick={() => setShowAdvancedSettings(false)}
                 className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-gray-700 active:bg-gray-800 transition-colors"
               >
                 Đóng cài đặt
               </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map and Detail Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)] lg:h-[calc(100vh-180px)] pb-16 lg:pb-0">
        <div className="flex-1 order-2 lg:order-1 relative">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải dữ liệu cây trồng...</p>
              </div>
            </div>
          ) : trees.length === 0 && zones.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
              <div className="text-center max-w-lg p-8">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-4xl">🌱</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Chưa Có Dữ Liệu Bản Đồ</h3>
                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  Nông trại này chưa có cây trồng hoặc khu vực nào có vị trí GPS. 
                  <br />Hãy thêm cây và khu vực để hiển thị trên bản đồ.
                </p>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">💡</span>
                    <div className="text-left">
                      <h4 className="font-bold text-gray-900 mb-2">Hướng dẫn:</h4>
                      <ul className="text-gray-700 space-y-2">
                        <li>• Sử dụng ứng dụng di động để chụp ảnh cây trồng</li>
                        <li>• Tự động lưu vị trí GPS khi chụp ảnh</li>
                        <li>• Tạo khu vực với tọa độ để quản lý dễ dàng</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button className="btn-primary flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-bold">
                    <span className="text-xl">📱</span>
                    <span>Mở App Điện Thoại</span>
                  </button>
                  <button className="btn-secondary flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-bold">
                    <span className="text-xl">❓</span>
                    <span>Hướng Dẫn Chi Tiết</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <UnifiedMapNoSSR
                trees={showTrees ? getFilteredTrees(focusedZone ? getTreesForZone(trees, focusedZone) : trees) : []}
                zones={showZones ? (focusedZone ? [focusedZone] : zones) : []}
                selectedTree={selectedTree}
                selectedZone={selectedZone}
                onTreeSelect={handleTreeSelect}
                onZoneSelect={handleZoneSelect}
                onZoneCreated={(zoneData: { boundaries: Array<{ latitude: number; longitude: number }> }) => {
                  // TODO: Handle zone creation
                }}
                enableDrawing={true}
                enableRealTime={true}
                farmId={displayFarm.id}
                className="w-full h-full"
                showUserPath={showUserPath}
                backgroundTrackingEnabled={backgroundTrackingEnabled}
                proximityRadius={proximityRadius}
                highlightedTreeId={highlightedTreeId}
                mapLayer={mapLayer}
              />
            </>
          )}
        </div>

        {/* Detail Sidebar - Desktop only */}
        <div className={`lg:w-96 order-1 lg:order-2 hidden lg:block ${(selectedTree || selectedZone) ? 'block' : 'hidden lg:block'}`}>
          {selectedTree && !showFullscreenTree ? (
            <TreeShowcase
              tree={selectedTree}
              onSaved={handleTreeUpdate}
            />
          ) : selectedZone ? (
            <div className="h-full bg-white border-l border-gray-200 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Chi tiết khu vực</h2>
                <button 
                  onClick={handleCloseDetail}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg" style={{ color: selectedZone.color }}>
                    {selectedZone.name}
                  </h3>
                  {selectedZone.description && (
                    <p className="text-gray-600 mt-1">{selectedZone.description}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-500">Số cây</div>
                    <div className="text-lg font-semibold">{selectedZone.treeCount}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-500">Diện tích</div>
                    <div className="text-lg font-semibold">{selectedZone.area} ha</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Trạng thái:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      selectedZone.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedZone.isActive ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Ngày tạo:</span>
                    <span className="ml-2">
                      {selectedZone.createdAt.toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white border-l border-gray-200 p-6 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <EyeIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Chọn trên bản đồ
                </h3>
                <p className="text-gray-600">
                  Nhấn vào cây hoặc khu vực trên bản đồ để xem thông tin chi tiết.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div className="lg:hidden">
        {selectedTree && !showFullscreenTree && (
          <BottomSheet
            isOpen={!!selectedTree && !showFullscreenTree}
            onClose={handleCloseDetail}
            initialDetent="medium"
            detents={["full", "large", "medium"]}
            header={
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Cây trên bản đồ</h3>
                  <p className="text-sm text-gray-500">{selectedTree.name || selectedTree.variety} - {selectedTree.zoneName || selectedTree.zoneCode}</p>
                </div>
                <button 
                  onClick={handleCloseDetail}
                  className="px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
                >
                  Đóng
                </button>
              </div>
            }
          >
            <TreeShowcase
              tree={selectedTree}
              onSaved={handleTreeUpdate}
            />
          </BottomSheet>
        )}
      </div>

      {/* Fullscreen Tree Showcase */}
      <FullscreenTreeShowcase
        tree={selectedTree}
        isOpen={showFullscreenTree}
        onClose={handleCloseFullscreenTree}
        onSaved={handleTreeUpdate}
      />
    </div>
  )
}

export default function MapPage() {
  return (
    <AuthGuard requiredPermission="read" requireFarmAccess={true}>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải bản đồ...</p>
          </div>
        </div>
      }>
        <MapPageContent />
      </Suspense>
    </AuthGuard>
  )
}