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
import { EyeIcon } from '@heroicons/react/24/outline'
import LargeTitleHeader from '@/components/ui/LargeTitleHeader'
import BottomSheet from '@/components/ui/BottomSheet'
import AuthGuard from '@/components/AuthGuard'
import logger from '@/lib/logger'

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

      setTrees(treesWithNames)
      setZones(zonesData)
      console.log('Data loaded - Trees:', treesData.length, 'Zones:', zonesData.length)
      
      // Handle zone focus if zone ID is in URL
      if (focusZoneId && zonesData.length > 0) {
        const targetZone = zonesData.find(zone => zone.id === focusZoneId)
        if (targetZone) {
          console.log('🎯 Focusing on zone from URL:', targetZone.name, 'ID:', targetZone.id)
          
          // Debug: Show how trees relate to this zone
          const relatedTrees = treesData.filter(tree =>
            (tree.zoneName || tree.zoneCode) === targetZone.id ||
            (tree.zoneName || tree.zoneCode) === targetZone.name ||
            (tree as any).zoneId === targetZone.id ||
            (tree as any).zoneId === targetZone.name
          )
          console.log('🌳 Trees in focused zone:', relatedTrees.length)
          console.log('🌳 Sample tree zones:', treesData.slice(0, 5).map(t => ({ id: t.id, zoneName: t.zoneName, zoneCode: t.zoneCode, zoneId: (t as any).zoneId })))
          
          setFocusedZone(targetZone)
          setSelectedZone(targetZone)
          // Ensure zones are visible for focusing
          setShowZones(true)
          setShowTrees(true) // Keep trees visible but they'll be filtered to the zone
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
      logger.error('Error loading trees:', error)
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
      logger.error('Error loading zones:', error)
      return []
    }
  }

  const handleTreeSelect = (tree: Tree) => {
    console.log('🌳 Tree selected from map:', tree.name || tree.variety)
    setSelectedTree(tree)
    setSelectedZone(null)
    setShowFullscreenTree(true)
  }

  const handleZoneSelect = (zone: Zone) => {
    try {
      console.log('🎯 handleZoneSelect called with:', zone?.id, zone?.name)
      if (zone && zone.id) {
        setSelectedZone(zone)
        setSelectedTree(null)
        console.log('🎯 Zone selected successfully:', zone.name)
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
    // After closing fullscreen, clear the selected tree completely
    // This prevents any duplicate displays
    setSelectedTree(null)
    setSelectedZone(null)
  }

  const handleTreeUpdate = (updatedTree: Tree) => {
    // Update the tree in the trees array
    setTrees(prevTrees => 
      prevTrees.map(tree => 
        tree.id === updatedTree.id ? updatedTree : tree
      )
    )
    // Update the selected tree if it's the same one
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
    
    console.log(`🔍 Filtering trees for zone: ${zone.name} (ID: ${zone.id})`)
    
    // First try: exact matching by zone codes
    let filteredTrees = trees.filter(tree => {
      const zoneValue = tree.zoneName || tree.zoneCode
      const matches = [
        zoneValue === zone.id,
        zoneValue === zone.name,
        (tree as any).zoneId === zone.id,
        (tree as any).zoneId === zone.name,
        // Try case-insensitive matching
        zoneValue?.toLowerCase() === zone.id?.toLowerCase(),
        zoneValue?.toLowerCase() === zone.name?.toLowerCase()
      ].some(Boolean)
      
      if (matches) {
        console.log(`✅ Tree ${tree.id} matched by zone: ${zoneValue}`)
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
    
    // Debug: If still no trees, show what zone values we have
    if (filteredTrees.length === 0) {
      const zoneValues = trees.map(t => t.zoneName || t.zoneCode).filter(Boolean)
      const uniqueZoneValues = Array.from(new Set(zoneValues))
      console.log('🔍 Available zone values in trees:', uniqueZoneValues)
      console.log('🔍 Looking for zone:', { id: zone.id, name: zone.name })
    }
    
    return filteredTrees
  }

  // Calculate trees in focused zone for smart display
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

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-0 ">
        <div className="flex flex-col space-y-4">
          

         {/* Enhanced Controls Header */}
         <div className="space-y-4">
           {/* Top Row: Title and Real-time Status */}
           <div className="flex items-center justify-between">
             <h1 className="text-xl font-bold text-gray-900">Bản đồ nông trại</h1>
             <div className="flex items-center space-x-3">
               {/* Real-time Status */}
               <div className="flex items-center space-x-2 text-sm">
                 <div className={`w-2 h-2 rounded-full ${
                   true ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                 }`}></div>
                 <span className={`font-medium ${
                   true ? 'text-green-700' : 'text-red-700'
                 }`}>
                   {true ? 'LIVE' : 'OFFLINE'}
                 </span>
               </div>

               {/* Settings Button */}
               <button
                 onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                 className={`p-2 rounded-lg transition-colors ${
                   showAdvancedSettings
                     ? 'bg-blue-100 text-blue-700'
                     : 'text-gray-600 hover:bg-gray-100'
                 }`}
                 title="Cài đặt nâng cao"
               >
                 ⚙️
               </button>
             </div>
           </div>

           {/* Smart Controls Row */}
           <div className="flex flex-wrap items-center justify-center gap-3">
             {/* Trees Toggle - Always show total tree count */}
             <button
               onClick={() => setShowTrees(!showTrees)}
               className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors min-touch ${
                 showTrees
                   ? 'bg-green-600 text-white shadow-lg'
                   : 'bg-white text-green-700 border border-green-200 hover:bg-green-50'
               }`}
               style={{ WebkitTapHighlightColor: 'transparent' }}
             >
               <span className="text-lg">🌳</span>
               <span>{loading ? '...' : `${trees.length} Cây`}</span>
             </button>

             {/* Zones Toggle - Smart display based on focus */}
             {focusedZone ? (
               // When focused on a zone, show trees in that zone
               <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                 <div
                   className="w-3 h-3 rounded-full"
                   style={{ backgroundColor: focusedZone.color }}
                 />
                 <span className="text-lg">📍</span>
                 <span>{treesInFocusedZone} Cây trong {focusedZone.name}</span>
                 <button
                   onClick={() => {
                     setFocusedZone(null)
                     setSelectedZone(null)
                     window.history.pushState({}, '', '/map')
                   }}
                   className="ml-2 px-2 py-1 rounded-full bg-white hover:bg-gray-100 text-sm"
                 >
                   ✕
                 </button>
               </div>
             ) : (
               // When not focused, show total zones
               <button
                 onClick={() => setShowZones(!showZones)}
                 className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors min-touch ${
                   showZones
                     ? 'bg-blue-600 text-white shadow-lg'
                     : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                 }`}
                 style={{ WebkitTapHighlightColor: 'transparent' }}
               >
                 <span className="text-lg">📍</span>
                 <span>{loading ? '...' : `${zones.length} Khu vực`}</span>
               </button>
             )}

             {/* GPS Background Toggle - Only show when enabled */}
             {backgroundTrackingEnabled && (
               <div className="flex items-center space-x-2 bg-purple-100 text-purple-800 px-3 py-2 rounded-full text-sm font-semibold">
                 <span className="text-lg">📍</span>
                 <span>GPS ON</span>
                 <button
                   onClick={() => setBackgroundTrackingEnabled(false)}
                   className="ml-1 px-2 py-1 rounded-full bg-white hover:bg-gray-100 text-sm"
                 >
                   ✕
                 </button>
               </div>
             )}
           </div>

           {/* Advanced Settings Panel */}
           {showAdvancedSettings && (
             <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Left Column */}
                 <div className="space-y-3">
                   <h3 className="font-semibold text-gray-800">Hiển thị</h3>

                   <label className="flex items-center space-x-3 cursor-pointer">
                     <input
                       type="checkbox"
                       checked={showUserPath}
                       onChange={(e) => setShowUserPath(e.target.checked)}
                       className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                     />
                     <span className="text-sm text-gray-700">Đường đi GPS</span>
                   </label>
                 </div>

                 <div className="space-y-3">
                   <h3 className="font-semibold text-gray-800">GPS</h3>

                   {!backgroundTrackingEnabled ? (
                     <button
                       onClick={() => setBackgroundTrackingEnabled(true)}
                       className="w-full bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                     >
                       📍 Bật GPS theo dõi
                     </button>
                   ) : (
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-gray-700">GPS đang bật</span>
                       <button
                         onClick={() => setBackgroundTrackingEnabled(false)}
                         className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                       >
                         Tắt
                       </button>
                     </div>
                   )}
                 </div>

                 {/* Right Column */}
                 <div className="space-y-3">
                   <h3 className="font-semibold text-gray-800">Phát hiện</h3>

                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-gray-700">Bán kính</span>
                       <span className="text-sm font-medium text-gray-900">{proximityRadius}m</span>
                     </div>
                     <input
                       type="range"
                       min="10"
                       max="100"
                       step="5"
                       value={proximityRadius}
                       onChange={(e) => setProximityRadius(Number(e.target.value))}
                       className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                     />
                     <div className="flex justify-between text-xs text-gray-500">
                       <span>10m</span>
                       <span>100m</span>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Quick Actions */}
               <div className="flex space-x-2 pt-4 mt-4 border-t border-gray-200">
                 <button
                   onClick={() => {
                     // Navigate to user location (would need to pass map ref or use callback)
                     console.log('Navigate to user location')
                   }}
                   className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                 >
                   📍 Vị trí tôi
                 </button>
                 <button
                   onClick={() => {
                     // Fit all markers (would need to pass map ref or use callback)
                     console.log('Fit all markers')
                   }}
                   className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                 >
                   🔍 Phù hợp tất cả
                 </button>
                 <button
                   onClick={() => setShowAdvancedSettings(false)}
                   className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                 >
                   Đóng
                 </button>
               </div>
             </div>
           )}
         </div>
          
          {/* Large Action Buttons for Farmers - Enhanced */}
          
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
              <UnifiedMapNoSSR
                trees={showTrees ? (focusedZone ? getTreesForZone(trees, focusedZone) : trees) : []}
                zones={showZones ? (focusedZone ? [focusedZone] : zones) : []}
                selectedTree={selectedTree}
                selectedZone={selectedZone}
                onTreeSelect={handleTreeSelect}
                onZoneSelect={handleZoneSelect}
                onZoneCreated={(zoneData: { boundaries: Array<{ latitude: number; longitude: number }> }) => {
                  console.log('🎯 New zone created:', zoneData)
                  // TODO: Handle zone creation - save to Firebase and refresh zones
                }}
                enableDrawing={true} // Enable drawing tools for zone creation
                enableRealTime={true}
                farmId={displayFarm.id}
                className="w-full h-full"
              />
              {/* Debug info removed for cleaner mobile UI */}
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