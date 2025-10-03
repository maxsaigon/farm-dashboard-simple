'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Tree } from '@/lib/types'
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import * as turf from '@turf/turf'
import { useIOSOptimizedGPS, IOSGPSPosition } from '@/lib/ios-optimized-gps'
import { PlusCircleIcon, XMarkIcon, MapPinIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { createTree } from '@/lib/firestore'

// Fix Leaflet icons
if (typeof window !== 'undefined') {
  require('leaflet/dist/leaflet.css')
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface OnFarmWorkModeProps {
  trees: Tree[]
  onClose: () => void
  onTreeSelect: (tree: Tree) => void
  onTreeCreated?: (tree: Tree) => void
  farmId: string
}

interface NearbyTree extends Tree {
  distance: number
}

// Auto-center map to user location
function AutoCenterMap({ userPosition }: { userPosition: { lat: number, lng: number } | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (userPosition) {
      map.setView([userPosition.lat, userPosition.lng], 20, { animate: true })
    }
  }, [userPosition, map])
  
  return null
}

export default function OnFarmWorkMode({ trees, onClose, onTreeSelect, onTreeCreated, farmId }: OnFarmWorkModeProps) {
  const { user } = useSimpleAuth()
  const gps = useIOSOptimizedGPS()
  
  const [userPosition, setUserPosition] = useState<{
    lat: number
    lng: number
    accuracy: number
    heading?: number
    speed?: number
    timestamp: number
  } | null>(null)
  
  const [trackingHistory, setTrackingHistory] = useState<Array<{lat: number, lng: number, timestamp: number}>>([])
  const [nearbyTrees, setNearbyTrees] = useState<NearbyTree[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'initializing' | 'active' | 'error'>('initializing')
  
  // Hide bottom navigation when component mounts
  useEffect(() => {
    // Add class to body to trigger CSS hiding
    document.body.classList.add('work-mode-active')
    
    return () => {
      // Remove class when component unmounts
      document.body.classList.remove('work-mode-active')
    }
  }, [])
  
  // New tree form
  const [newTreeData, setNewTreeData] = useState({
    name: '',
    variety: 'Monthong',
    zoneCode: ''
  })

  // Start GPS tracking on mount
  useEffect(() => {
    console.log('🚀 [OnFarmWorkMode] Starting GPS tracking...')
    
    gps.startTracking({
      onSuccess: (position: IOSGPSPosition) => {
        const newPos = {
          lat: position.latitude,
          lng: position.longitude,
          accuracy: position.accuracy,
          heading: position.heading || undefined,
          speed: position.speed || undefined,
          timestamp: position.timestamp
        }
        
        setUserPosition(newPos)
        setGpsStatus('active')
        
        // Keep tracking history (last 50 points)
        setTrackingHistory(prev => [...prev, {
          lat: newPos.lat,
          lng: newPos.lng,
          timestamp: newPos.timestamp
        }].slice(-50))
      },
      onError: (error) => {
        console.error('❌ [OnFarmWorkMode] GPS error:', error)
        setGpsStatus('error')
      },
      onPermissionGranted: () => {
        console.log('✅ [OnFarmWorkMode] Permission granted')
      },
      onPermissionDenied: () => {
        console.log('❌ [OnFarmWorkMode] Permission denied')
        setGpsStatus('error')
      }
    }, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
      distanceFilter: 3 // Update every 3 meters
    })

    return () => {
      console.log('🛑 [OnFarmWorkMode] Stopping GPS tracking')
      gps.stopTracking()
    }
  }, [])

  // Calculate nearby trees
  useEffect(() => {
    if (!userPosition) {
      setNearbyTrees([])
      return
    }

    const userPoint = turf.point([userPosition.lng, userPosition.lat])
    
    const nearby = trees
      .filter(tree => tree.latitude && tree.longitude)
      .map(tree => ({
        ...tree,
        distance: turf.distance(
          userPoint,
          turf.point([tree.longitude!, tree.latitude!]),
          { units: 'meters' }
        )
      }))
      .filter(tree => tree.distance <= 50) // Within 50 meters
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5) // Top 5 nearest

    setNearbyTrees(nearby)
  }, [userPosition, trees])

  // Handle create new tree
  const handleCreateTree = useCallback(async () => {
    if (!user || !userPosition || !newTreeData.name || !newTreeData.variety) {
      alert('Vui lòng điền đầy đủ thông tin cây')
      return
    }

    setCreating(true)
    try {
      const newTree: Partial<Tree> = {
        name: newTreeData.name,
        variety: newTreeData.variety,
        zoneCode: newTreeData.zoneCode || 'FIELD',
        latitude: userPosition.lat,
        longitude: userPosition.lng,
        gpsAccuracy: userPosition.accuracy,
        plantingDate: new Date(),
        healthStatus: 'Good',
        manualFruitCount: 0,
        aiFruitCount: 0,
        needsAttention: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const treeId = await createTree(farmId, user.uid, newTree as Omit<Tree, 'id' | 'farmId'>)
      
      const createdTree: Tree = {
        ...newTree,
        id: treeId,
        farmId
      } as Tree

      onTreeCreated?.(createdTree)
      
      // Reset form
      setNewTreeData({ name: '', variety: 'Monthong', zoneCode: '' })
      setShowCreateForm(false)
      
      alert(`✅ Đã tạo cây "${newTreeData.name}" tại vị trí hiện tại!`)
    } catch (error) {
      console.error('Error creating tree:', error)
      alert('❌ Không thể tạo cây. Vui lòng thử lại.')
    } finally {
      setCreating(false)
    }
  }, [user, userPosition, newTreeData, farmId, onTreeCreated])

  // Get tree marker icon
  const getTreeMarkerIcon = (tree: NearbyTree) => {
    const size = tree.distance < 10 ? 24 : tree.distance < 20 ? 20 : 16
    const color = tree.distance < 10 ? '#ef4444' : tree.distance < 20 ? '#f59e0b' : '#22c55e'
    
    return L.divIcon({
      className: 'tree-marker',
      html: `
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        ">
          ${Math.round(tree.distance)}
        </div>
      `,
      iconSize: [size + 4, size + 4],
      iconAnchor: [(size + 4) / 2, (size + 4) / 2]
    })
  }

  const userPathCoordinates = trackingHistory.map(point => [point.lat, point.lng] as [number, number])

  return (
    <>
      {/* Global styles to hide bottom nav */}
      <style jsx global>{`
        body.work-mode-active nav.lg\\:hidden {
          display: none !important;
        }
      `}</style>
      
      <div className="fixed inset-0 bg-white flex flex-col" style={{ zIndex: 9999 }}>
      {/* Fullscreen Map */}
      <div className="flex-1 relative" style={{ zIndex: 1 }}>
        {userPosition ? (
          <MapContainer
            center={[userPosition.lat, userPosition.lng]}
            zoom={20}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={22}
            />
            
            <AutoCenterMap userPosition={userPosition} />

            {/* User tracking path */}
            {userPathCoordinates.length > 1 && (
              <Polyline
                positions={userPathCoordinates}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 3,
                  opacity: 0.6,
                  dashArray: '5,10'
                }}
              />
            )}

            {/* User marker */}
            <Marker
              position={[userPosition.lat, userPosition.lng]}
              icon={L.divIcon({
                className: 'user-marker',
                html: `
                  <div style="
                    width: 24px;
                    height: 24px;
                    background: radial-gradient(circle, #3b82f6 30%, rgba(59, 130, 246, 0.3) 70%);
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
                    animation: pulse 2s infinite;
                  "></div>
                  <style>
                    @keyframes pulse {
                      0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
                      50% { box-shadow: 0 0 30px rgba(59, 130, 246, 1); }
                    }
                  </style>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              })}
            />

            {/* GPS Accuracy Circle */}
            <Circle
              center={[userPosition.lat, userPosition.lng]}
              radius={userPosition.accuracy}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1
              }}
            />

            {/* Nearby trees */}
            {nearbyTrees.map(tree => (
              <Marker
                key={tree.id}
                position={[tree.latitude!, tree.longitude!]}
                icon={getTreeMarkerIcon(tree)}
                eventHandlers={{
                  click: () => onTreeSelect(tree)
                }}
              />
            ))}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center p-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-xl font-semibold text-gray-700">
                {gpsStatus === 'error' ? '❌ Lỗi GPS' : '📍 Đang lấy vị trí GPS...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {gpsStatus === 'error' 
                  ? 'Vui lòng bật GPS và cấp quyền truy cập vị trí'
                  : 'Hãy đảm bảo GPS đã được bật'}
              </p>
            </div>
          </div>
        )}

        {/* Close button - Highest z-index to ensure it's always clickable */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 active:scale-95 transition-all"
          style={{ zIndex: 10000 }}
        >
          <XMarkIcon className="h-6 w-6 text-gray-700" />
        </button>

        {/* GPS Status indicator */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3" style={{ zIndex: 9999 }}>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              gpsStatus === 'active' ? 'bg-green-500 animate-pulse' : 
              gpsStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm font-semibold">
              {gpsStatus === 'active' ? 'GPS Hoạt động' : 
               gpsStatus === 'error' ? 'GPS Lỗi' : 'Đang kết nối...'}
            </span>
          </div>
          {userPosition && (
            <div className="text-xs text-gray-500 mt-1">
              ±{userPosition.accuracy.toFixed(0)}m
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel - Nearby Trees & Actions */}
      <div className="bg-white border-t-4 border-blue-500 shadow-2xl" style={{ maxHeight: '40vh', zIndex: 9998 }}>
        {/* Nearby Trees List */}
        {nearbyTrees.length > 0 && !showCreateForm && (
          <div className="p-4 overflow-y-auto" style={{ maxHeight: '30vh' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />
              Cây gần bạn ({nearbyTrees.length})
            </h3>
            <div className="space-y-2">
              {nearbyTrees.map(tree => (
                <button
                  key={tree.id}
                  onClick={() => onTreeSelect(tree)}
                  className="w-full bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-4 hover:border-blue-400 active:scale-98 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-lg">
                        {tree.name || tree.variety}
                      </div>
                      <div className="text-sm text-gray-600">
                        {tree.variety} • {tree.zoneName || tree.zoneCode}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        tree.distance < 10 ? 'text-red-600' :
                        tree.distance < 20 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {tree.distance.toFixed(1)}m
                      </div>
                      <div className="text-xs text-gray-500">khoảng cách</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No nearby trees message */}
        {nearbyTrees.length === 0 && !showCreateForm && userPosition && (
          <div className="p-6 text-center">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-gray-600 mb-1">Không có cây nào gần bạn</p>
            <p className="text-sm text-gray-500">Trong bán kính 50m</p>
          </div>
        )}

        {/* Create New Tree Form */}
        {showCreateForm && (
          <div className="p-4 overflow-y-auto" style={{ maxHeight: '35vh' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <PlusCircleIcon className="h-5 w-5 mr-2 text-green-600" />
              Tạo cây mới tại vị trí hiện tại
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên cây *
                </label>
                <input
                  type="text"
                  value={newTreeData.name}
                  onChange={(e) => setNewTreeData({ ...newTreeData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  placeholder="Ví dụ: Cây sầu riêng số 1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Giống cây *
                </label>
                <select
                  value={newTreeData.variety}
                  onChange={(e) => setNewTreeData({ ...newTreeData, variety: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                >
                  <option value="Monthong">Monthong</option>
                  <option value="Musang King">Musang King</option>
                  <option value="Kan Yao">Kan Yao</option>
                  <option value="Ri6">Ri6</option>
                  <option value="Black Thorn">Black Thorn</option>
                  <option value="Red Prawn">Red Prawn</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Khu vực (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newTreeData.zoneCode}
                  onChange={(e) => setNewTreeData({ ...newTreeData, zoneCode: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  placeholder="Ví dụ: A01, B05..."
                />
              </div>

              {userPosition && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-700 font-semibold mb-1">📍 Vị trí GPS:</div>
                  <div className="text-xs font-mono text-blue-900">
                    {userPosition.lat.toFixed(6)}, {userPosition.lng.toFixed(6)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Độ chính xác: ±{userPosition.accuracy.toFixed(0)}m
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 active:scale-98 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateTree}
                  disabled={creating || !newTreeData.name || !newTreeData.variety}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Đang tạo...' : 'Tạo cây'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showCreateForm && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowCreateForm(true)}
              disabled={!userPosition}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <PlusCircleIcon className="h-6 w-6" />
              <span>Tạo cây mới tại đây</span>
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}