'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { useSearchParams } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tree } from '@/lib/types'
import dynamic from 'next/dynamic'
import { TreeDetail } from '@/components/TreeDetail'
import { EyeIcon, MapPinIcon, RectangleGroupIcon } from '@heroicons/react/24/outline'

interface Zone {
  id: string
  name: string
  description?: string
  color: string
  boundaries: Array<{ latitude: number; longitude: number }> // FIXED: Use correct field names from Firebase
  soilType?: string
  drainageLevel?: 'poor' | 'fair' | 'good' | 'excellent'
  treeCount: number
  area: number
  isActive: boolean
  createdAt: Date
}

const MapWrapperNoSSR = dynamic(() => import('@/components/MapWrapper'), {
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
  const { currentFarm } = useEnhancedAuth()
  const searchParams = useSearchParams()
  const focusZoneId = searchParams.get('zone')
  
  const [trees, setTrees] = useState<Tree[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showZones, setShowZones] = useState(true)
  const [showTrees, setShowTrees] = useState(true)
  const [focusedZone, setFocusedZone] = useState<Zone | null>(null)

  // Debug farm ID for testing
  const debugFarmId = "F210C3FC-F191-4926-9C15-58D6550A716A"
  const debugFarm = { id: debugFarmId, name: "Debug Farm" }
  const displayFarm = currentFarm || debugFarm

  useEffect(() => {
    if (displayFarm.id) {
      loadData()
    }
  }, [displayFarm.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    const farmId = displayFarm.id
    if (!farmId) return

    setLoading(true)
    setError(null)
    try {
      console.log('Loading data for farm:', farmId)
      
      const [treesData, zonesData] = await Promise.all([
        loadTrees(farmId),
        loadZones(farmId)
      ])
      
      setTrees(treesData)
      setZones(zonesData)
      console.log('Data loaded - Trees:', treesData.length, 'Zones:', zonesData.length)
      
      // Handle zone focus if zone ID is in URL
      if (focusZoneId && zonesData.length > 0) {
        const targetZone = zonesData.find(zone => zone.id === focusZoneId)
        if (targetZone) {
          console.log('🎯 Focusing on zone from URL:', targetZone.name, 'ID:', targetZone.id)
          
          // Debug: Show how trees relate to this zone
          const relatedTrees = treesData.filter(tree => 
            tree.zoneCode === targetZone.id || 
            tree.zoneCode === targetZone.name ||
            tree.zoneId === targetZone.id ||
            tree.zoneId === targetZone.name
          )
          console.log('🌳 Trees in focused zone:', relatedTrees.length)
          console.log('🌳 Sample tree zoneCodes:', treesData.slice(0, 5).map(t => ({ id: t.id, zoneCode: t.zoneCode, zoneId: (t as any).zoneId })))
          
          setFocusedZone(targetZone)
          setSelectedZone(targetZone)
          // Ensure zones are visible for focusing
          setShowZones(true)
          setShowTrees(true) // Keep trees visible but they'll be filtered to the zone
        } else {
          console.warn('Zone not found:', focusZoneId)
          console.warn('Available zones:', zonesData.map(z => ({ id: z.id, name: z.name })))
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Không thể tải dữ liệu bản đồ')
    } finally {
      setLoading(false)
    }
  }

  const loadTrees = async (farmId: string): Promise<Tree[]> => {
    if (!farmId) return []

    try {
      console.log('Loading trees for farm:', farmId)
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
      
      console.log('Loaded trees with GPS:', treesData.length)
      return treesData
    } catch (error) {
      console.error('Error loading trees:', error)
      return []
    }
  }

  const loadZones = async (farmId: string): Promise<Zone[]> => {
    if (!farmId) return []

    try {
      console.log('Loading zones for farm:', farmId)
      
      let zonesRef = collection(db, 'farms', farmId, 'zones')
      let zonesSnapshot = await getDocs(zonesRef)
      console.log('Found zones in farm collection:', zonesSnapshot.docs.length)
      
      if (zonesSnapshot.empty) {
        console.log('No zones in farm collection, trying global zones collection')
        zonesRef = collection(db, 'zones')
        zonesSnapshot = await getDocs(query(zonesRef, where('farmId', '==', farmId)))
        console.log('Found zones in global collection:', zonesSnapshot.docs.length)
      }
      
      const zonesData = zonesSnapshot.docs.map(doc => {
        const data = doc.data()
        console.log('Processing zone:', doc.id, data)
        
        const boundaries = data.boundary || data.boundaries || data.coordinates || data.polygon || data.points || []
        const metadata = data.metadata || {}
        
        return {
          id: doc.id,
          name: data.name || `Zone ${doc.id}`,
          description: data.description || '',
          color: data.color || '#3b82f6',
          boundaries: boundaries,
          soilType: data.soilType || metadata.soilType || 'unknown',
          drainageLevel: data.drainageLevel || metadata.drainageLevel || 'fair',
          treeCount: data.treeCount || 0,
          area: data.area || metadata.area || 0,
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date()
        }
      })
      
      console.log('All zones processed:', zonesData.length)
      
      // For debugging, return all zones to see what we have
      const zonesWithBoundaries = zonesData.filter(zone => {
        const hasBoundaries = zone.boundaries && Array.isArray(zone.boundaries) && zone.boundaries.length >= 3
        console.log(`Zone ${zone.id}: ${zone.boundaries?.length || 0} boundaries, valid: ${hasBoundaries}`)
        return hasBoundaries
      })
      
      console.log('Zones with valid boundaries:', zonesWithBoundaries.length)
      
      // Return zones with boundaries, or first 3 zones if none have boundaries (for debugging)
      return zonesWithBoundaries.length > 0 ? zonesWithBoundaries : zonesData.slice(0, 3)
      
    } catch (error) {
      console.error('Error loading zones:', error)
      return []
    }
  }

  const handleTreeSelect = (tree: Tree) => {
    setSelectedTree(tree)
    setSelectedZone(null)
  }

  const handleZoneSelect = (zone: Zone) => {
    try {
      console.log('🎯 handleZoneSelect called with:', zone?.id, zone?.name)
      if (zone && zone.id) {
        setSelectedZone(zone)
        setSelectedTree(null)
        console.log('🎯 Zone selected successfully:', zone.name)
      } else {
        console.error('🎯 Invalid zone passed to handleZoneSelect:', zone)
      }
    } catch (error) {
      console.error('🎯 Error in handleZoneSelect:', error)
      console.error('🎯 Zone data:', zone)
    }
  }

  const handleCloseDetail = () => {
    setSelectedTree(null)
    setSelectedZone(null)
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
    
    console.log(`🔍 Filtering trees for zone: ${zone.name} (ID: ${zone.id})`)
    
    // First try: exact matching by zone codes
    let filteredTrees = trees.filter(tree => {
      const matches = [
        tree.zoneCode === zone.id,
        tree.zoneCode === zone.name,
        (tree as any).zoneId === zone.id,
        (tree as any).zoneId === zone.name,
        // Try case-insensitive matching
        tree.zoneCode?.toLowerCase() === zone.id?.toLowerCase(),
        tree.zoneCode?.toLowerCase() === zone.name?.toLowerCase()
      ].some(Boolean)
      
      if (matches) {
        console.log(`✅ Tree ${tree.id} matched by zoneCode: ${tree.zoneCode}`)
      }
      return matches
    })
    
    // Second try: if no trees found by zone code, try geographic containment
    if (filteredTrees.length === 0 && zone.boundaries && zone.boundaries.length >= 3) {
      console.log(`🌍 No trees found by zoneCode, trying geographic containment...`)
      
      filteredTrees = trees.filter(tree => {
        const treeLat = (tree as any).location?.latitude || (tree as any).latitude
        const treeLng = (tree as any).location?.longitude || (tree as any).longitude
        
        if (treeLat && treeLng && treeLat !== 0 && treeLng !== 0) {
          const isInside = isPointInPolygon(
            { lat: treeLat, lng: treeLng },
            zone.boundaries
          )
          
          if (isInside) {
            console.log(`🎯 Tree ${tree.id} found inside zone boundaries`)
          }
          return isInside
        }
        return false
      })
    }
    
    console.log(`🌳 Final filtered trees for zone ${zone.name}: ${filteredTrees.length} out of ${trees.length}`)
    
    // Debug: If still no trees, show what zoneCode values we have
    if (filteredTrees.length === 0) {
      const zoneCodes = trees.map(t => t.zoneCode).filter(Boolean)
      const uniqueZoneCodes = Array.from(new Set(zoneCodes))
      console.log('🔍 Available zoneCode values in trees:', uniqueZoneCodes)
      console.log('🔍 Looking for zone:', { id: zone.id, name: zone.name })
    }
    
    return filteredTrees
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Farmer-Friendly */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex flex-col space-y-4">
          {/* Title and Stats */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900 mb-1">
                🗺️ Bản Đồ Nông Trại
              </h1>
              <p className="text-sm lg:text-base text-gray-600">
                {displayFarm.name} • {loading ? 'Đang tải...' : `${trees.length} cây trồng • ${zones.length} khu vực`}
              </p>
              {focusedZone && (
                <div className="mt-2 flex items-center space-x-2">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: focusedZone.color }}
                    ></div>
                    <span>🎯 Focus: {focusedZone.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setFocusedZone(null)
                      setSelectedZone(null)
                      // Update URL to remove zone parameter
                      window.history.pushState({}, '', '/map')
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm font-medium transition-colors"
                  >
                    ✕ Thoát Focus
                  </button>
                </div>
              )}
            </div>
            <a
              href="/zones"
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <RectangleGroupIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Khu Vực</span>
            </a>
          </div>
          
          {/* Large Action Buttons for Farmers */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={() => setShowTrees(!showTrees)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md ${
                showTrees 
                  ? 'bg-green-600 text-white shadow-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{
                minHeight: '50px',
                minWidth: '140px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <MapPinIcon className="h-6 w-6" />
              <span>HIỆN CÂY</span>
            </button>
            
            <button
              onClick={() => setShowZones(!showZones)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md ${
                showZones 
                  ? 'bg-blue-600 text-white shadow-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{
                minHeight: '50px',
                minWidth: '140px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <RectangleGroupIcon className="h-6 w-6" />
              <span>HIỆN KHU VỰC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map and Detail Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)]">
        <div className="flex-1 order-2 lg:order-1 relative">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải dữ liệu cây trồng...</p>
              </div>
            </div>
          ) : trees.length === 0 && zones.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <div className="text-center max-w-md p-8">
                <EyeIcon className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-3">🌱 Chưa có dữ liệu</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Nông trại này chưa có cây trồng hoặc khu vực nào có tọa độ GPS. 
                  Hãy thêm dữ liệu từ ứng dụng di động để xem trên bản đồ.
                </p>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 text-sm font-medium">
                    💡 Mẹo: Sử dụng ứng dụng iOS để thêm cây và khu vực với tọa độ GPS
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <MapWrapperNoSSR
                trees={showTrees ? (focusedZone ? getTreesForZone(trees, focusedZone) : trees) : []}
                zones={showZones ? (focusedZone ? [focusedZone] : zones) : []}
                selectedTree={selectedTree}
                selectedZone={selectedZone}
                onTreeSelect={handleTreeSelect}
                onZoneSelect={handleZoneSelect}
                onFullscreenFocus={() => {
                  console.log('🎯 Fullscreen focus triggered - enabling trees and zones display')
                  setShowTrees(true)
                  setShowZones(true)
                }}
                className="w-full h-full"
              />
              {/* Debug info removed for cleaner mobile UI */}
            </>
          )}
        </div>

        {/* Detail Sidebar */}
        <div className={`lg:w-96 order-1 lg:order-2 ${(selectedTree || selectedZone) ? 'block' : 'hidden lg:block'}`}>
          {selectedTree ? (
            <TreeDetail
              tree={selectedTree}
              onClose={handleCloseDetail}
              className="h-full overflow-y-auto"
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
                    <span className="text-sm text-gray-500">Loại đất:</span>
                    <span className="ml-2 capitalize">{selectedZone.soilType}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Thoát nước:</span>
                    <span className="ml-2 capitalize">{selectedZone.drainageLevel}</span>
                  </div>
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
    </div>
  )
}

export default function MapPage() {
  return (
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
  )
}