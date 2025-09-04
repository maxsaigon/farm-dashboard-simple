'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { useSearchParams } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tree } from '@/lib/types'
import dynamic from 'next/dynamic'
import { TreeDetail } from '@/components/TreeDetail'
import { EyeIcon } from '@heroicons/react/24/outline'

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
            (tree as any).zoneId === targetZone.id ||
            (tree as any).zoneId === targetZone.name
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
    <div className="min-h-screen bg-gray-50 safe-bottom">
      {/* Header - Enhanced for Farmers */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 safe-top">
        <div className="flex flex-col space-y-4">
          {/* Title and Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🗺️</span>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Bản Đồ Nông Trại
                  </h1>
                  <p className="text-base lg:text-lg text-gray-600 font-medium">
                    {displayFarm.name}
                  </p>
                </div>
              </div>
              
              {/* Stats Row */}
              <div className="flex items-center space-x-4 text-sm lg:text-base">
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                  <span className="text-green-600 font-bold">🌳</span>
                  <span className="text-green-800 font-semibold">
                    {loading ? 'Đang tải...' : `${trees.length} Cây`}
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                  <span className="text-blue-600 font-bold">📍</span>
                  <span className="text-blue-800 font-semibold">
                    {loading ? 'Đang tải...' : `${zones.length} Khu vực`}
                  </span>
                </div>
              </div>

              {focusedZone && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl text-base font-semibold flex items-center space-x-2 shadow-sm">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm" 
                      style={{ backgroundColor: focusedZone.color }}
                    ></div>
                    <span>🎯 Đang xem: {focusedZone.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setFocusedZone(null)
                      setSelectedZone(null)
                      // Update URL to remove zone parameter
                      window.history.pushState({}, '', '/map')
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-base font-semibold transition-colors min-touch"
                    style={{
                      minHeight: '40px',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    ✕ Xem Tất Cả
                  </button>
                </div>
              )}
            </div>
            
            <a
              href="/zones"
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors text-base font-bold shadow-md min-touch lg:w-auto w-full"
              style={{
                minHeight: '52px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span className="text-xl">📍</span>
              <span>Danh Sách Khu Vực</span>
            </a>
          </div>
          
          {/* Large Action Buttons for Farmers - Enhanced */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => setShowTrees(!showTrees)}
              className={`flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl text-lg font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg min-touch w-full sm:w-auto ${
                showTrees 
                  ? 'bg-green-600 text-white shadow-green-300 border-2 border-green-400' 
                  : 'bg-white text-green-700 hover:bg-green-50 border-2 border-green-200 hover:border-green-300'
              }`}
              style={{
                minHeight: '64px',
                minWidth: '180px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span className="text-2xl">🌳</span>
              <div className="flex flex-col items-start">
                <span className="font-bold">HIỆN CÂY</span>
                <span className="text-sm opacity-80">{showTrees ? 'Đang hiển thị' : 'Ẩn đi'}</span>
              </div>
              {showTrees && (
                <div className="w-3 h-3 bg-green-200 rounded-full animate-pulse"></div>
              )}
            </button>
            
            <button
              onClick={() => setShowZones(!showZones)}
              className={`flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl text-lg font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg min-touch w-full sm:w-auto ${
                showZones 
                  ? 'bg-blue-600 text-white shadow-blue-300 border-2 border-blue-400' 
                  : 'bg-white text-blue-700 hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300'
              }`}
              style={{
                minHeight: '64px',
                minWidth: '180px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span className="text-2xl">📍</span>
              <div className="flex flex-col items-start">
                <span className="font-bold">HIỆN KHU VỰC</span>
                <span className="text-sm opacity-80">{showZones ? 'Đang hiển thị' : 'Ẩn đi'}</span>
              </div>
              {showZones && (
                <div className="w-3 h-3 bg-blue-200 rounded-full animate-pulse"></div>
              )}
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
                  <button className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-colors min-touch">
                    <span className="text-xl">📱</span>
                    <span>Mở App Điện Thoại</span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors min-touch">
                    <span className="text-xl">❓</span>
                    <span>Hướng Dẫn Chi Tiết</span>
                  </button>
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
                  
                  // If we're in zone focus mode, ensure the focused zone stays selected
                  if (focusedZone) {
                    console.log('🎯 Maintaining zone focus in fullscreen:', focusedZone.name)
                    setSelectedZone(focusedZone)
                  }
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