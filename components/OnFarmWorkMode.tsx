'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Tree } from '@/lib/types'
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import * as turf from '@turf/turf'
import { useIOSOptimizedGPS, IOSGPSPosition } from '@/lib/ios-optimized-gps'
import { PlusCircleIcon, XMarkIcon, MapPinIcon, ArrowPathIcon, CameraIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { createTree } from '@/lib/firestore'
import { compressImageSmart } from '@/lib/photo-compression'
import { uploadFile } from '@/lib/storage'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

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

interface Zone {
  id: string
  name: string
  code?: string
  boundaries: Array<{ latitude: number; longitude: number }>
  color?: string
}

interface OnFarmWorkModeProps {
  trees: Tree[]
  zones: Zone[]
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

export default function OnFarmWorkMode({ trees, zones, onClose, onTreeSelect, onTreeCreated, farmId }: OnFarmWorkModeProps) {
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
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [nearestZone, setNearestZone] = useState<Zone | null>(null)
  const [selectedZone, setSelectedZone] = useState<string>('')
  
  // Find nearest zone when user position changes
  useEffect(() => {
    if (!userPosition || zones.length === 0) {
      setNearestZone(null)
      return
    }

    const userPoint = turf.point([userPosition.lng, userPosition.lat])
    
    // Find zones that contain the user or are closest
    const zonesWithDistance = zones
      .filter(zone => zone.boundaries && zone.boundaries.length >= 3)
      .map(zone => {
        try {
          const coordinates = zone.boundaries.map(b => [b.longitude, b.latitude])
          // Close the polygon
          if (coordinates.length > 0) {
            const first = coordinates[0]
            const last = coordinates[coordinates.length - 1]
            if (first[0] !== last[0] || first[1] !== last[1]) {
              coordinates.push(first)
            }
          }
          
          const polygon = turf.polygon([coordinates])
          const isInside = turf.booleanPointInPolygon(userPoint, polygon)
          const distance = isInside ? 0 : turf.distance(userPoint, turf.centroid(polygon), { units: 'meters' })
          
          return { zone, distance, isInside }
        } catch (error) {
          return { zone, distance: Infinity, isInside: false }
        }
      })
      .sort((a, b) => a.distance - b.distance)

    if (zonesWithDistance.length > 0) {
      const nearest = zonesWithDistance[0]
      setNearestZone(nearest.zone)
      setSelectedZone(nearest.zone.name)
      
      // Update form data with nearest zone name
      setNewTreeData(prev => ({
        ...prev,
        zoneName: nearest.zone.name
      }))
    }
  }, [userPosition, zones])
  
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
    zoneName: '',
    treeStatus: 'Cây Non' as 'Young Tree' | 'Mature' | 'Old' | 'Cây Non' | 'Cây Trưởng Thành' | 'Cây Già'
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

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
      }
    } catch (error) {
      console.error('Camera error:', error)
      alert('❌ Không thể mở camera. Vui lòng kiểm tra quyền truy cập.')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        setCapturedPhotos(prev => [...prev, url])
        stopCamera()
      }
    }, 'image/jpeg', 0.9)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCapturedPhotos(prev => [...prev, url])
    }
  }

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => {
      const newPhotos = [...prev]
      URL.revokeObjectURL(newPhotos[index])
      newPhotos.splice(index, 1)
      return newPhotos
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      capturedPhotos.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  // Handle create new tree with photo upload
  const handleCreateTree = useCallback(async () => {
    if (!user || !userPosition || !newTreeData.variety || !newTreeData.zoneName) {
      alert('Vui lòng chọn giống cây và khu vực')
      return
    }

    setCreating(true)
    try {
      // Step 1: Create tree in Firestore
      console.log('📝 [OnFarmWorkMode] Step 1: Creating tree...')
      const autoName = newTreeData.name || `${newTreeData.variety} ${new Date().toLocaleDateString('vi-VN')}`
      
      const newTree: Partial<Tree> = {
        name: autoName,
        variety: newTreeData.variety,
        zoneName: newTreeData.zoneName,
        zoneCode: newTreeData.zoneName,
        treeStatus: newTreeData.treeStatus,
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
      console.log('✅ [OnFarmWorkMode] Tree created with ID:', treeId)
      
      // Step 2: Upload photos if any
      if (capturedPhotos.length > 0) {
        console.log(`📸 [OnFarmWorkMode] Step 2: Uploading ${capturedPhotos.length} photos...`)
        
        for (let i = 0; i < capturedPhotos.length; i++) {
          const photoUrl = capturedPhotos[i]
          console.log(`  Processing photo ${i + 1}/${capturedPhotos.length}`)
          
          try {
            // Convert blob URL to File
            const response = await fetch(photoUrl)
            const blob = await response.blob()
            const file = new File([blob], `photo_${Date.now()}_${i}.jpg`, { type: 'image/jpeg' })
            
            // Compress photo
            console.log(`  Compressing photo ${i + 1}...`)
            const compressedFile = await compressImageSmart(file, 'general')
            console.log(`  Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`)
            
            // Upload to Firebase Storage
            // Path: farms/{farmId}/trees/{treeId}/photos/{photoId}/compressed.jpg
            const photoId = `photo_${Date.now()}_${i}`
            const storagePath = `farms/${farmId}/trees/${treeId}/photos/${photoId}/compressed.jpg`
            console.log(`  Uploading to: ${storagePath}`)
            
            const downloadURL = await uploadFile(compressedFile, storagePath)
            console.log(`  ✅ Uploaded, URL: ${downloadURL}`)
            
            // Create photo document in Firestore
            const photoDoc = {
              treeId,
              farmId,
              filename: `photo_${i + 1}.jpg`,
              photoType: 'general',
              timestamp: serverTimestamp(),
              latitude: userPosition.lat,
              longitude: userPosition.lng,
              uploadedToServer: true,
              serverProcessed: false,
              needsAIAnalysis: false,
              compressedPath: storagePath,
              originalPath: storagePath,
              localPath: downloadURL,
              createdAt: serverTimestamp()
            }
            
            await setDoc(doc(db, 'farms', farmId, 'photos', photoId), photoDoc)
            console.log(`  ✅ Photo document created: ${photoId}`)
            
          } catch (photoError) {
            console.error(`  ❌ Error uploading photo ${i + 1}:`, photoError)
            // Continue with other photos even if one fails
          }
        }
        
        console.log('✅ [OnFarmWorkMode] All photos processed')
      }
      
      // Step 3: Create final tree object and notify parent
      const createdTree: Tree = {
        ...newTree,
        id: treeId,
        farmId
      } as Tree

      console.log('✅ [OnFarmWorkMode] Notifying parent component...')
      onTreeCreated?.(createdTree)
      
      // Step 4: Reset form and cleanup
      console.log('🧹 [OnFarmWorkMode] Cleaning up...')
      setNewTreeData({ name: '', variety: 'Monthong', zoneName: '', treeStatus: 'Cây Non' })
      
      // Cleanup photo URLs
      capturedPhotos.forEach(url => URL.revokeObjectURL(url))
      setCapturedPhotos([])
      setShowCreateForm(false)
      
      alert(`✅ Đã tạo cây "${autoName}" với ${capturedPhotos.length} ảnh!`)
      console.log('🎉 [OnFarmWorkMode] Tree creation completed successfully!')
      
    } catch (error) {
      console.error('❌ [OnFarmWorkMode] Error creating tree:', error)
      alert('❌ Không thể tạo cây. Vui lòng thử lại.')
    } finally {
      setCreating(false)
    }
  }, [user, userPosition, newTreeData, farmId, capturedPhotos, onTreeCreated])

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
      {/* Global styles to hide bottom nav - target the specific BottomTabBar */}
      <style jsx global>{`
        body.work-mode-active nav[class*="lg:hidden"],
        body.work-mode-active nav[class*="fixed bottom-0"],
        body.work-mode-active nav[class*="z-[9999]"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
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

        {/* Create New Tree Form - 75vh Modal */}
        {showCreateForm && (
          <div
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ height: '75vh', zIndex: 10001 }}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center">
                <PlusCircleIcon className="h-6 w-6 mr-2" />
                Tạo cây mới
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  stopCamera()
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-4 space-y-4" style={{ height: 'calc(75vh - 64px)' }}>
            {/* Camera Section */}
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-300">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <CameraIcon className="h-5 w-5 mr-2 text-blue-600" />
                Chụp ảnh cây
              </h4>
              
              {cameraActive ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden bg-black" style={{ height: '200px' }}>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-32 h-32 border-2 border-white border-opacity-50 rounded-lg"></div>
                    </div>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex space-x-2">
                    <button
                      onClick={capturePhoto}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 active:scale-98 transition-all flex items-center justify-center space-x-2"
                    >
                      <CameraIcon className="h-5 w-5" />
                      <span>Chụp</span>
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {capturedPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {capturedPhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-20 object-cover rounded-lg" />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={startCamera}
                      className="bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 active:scale-98 transition-all flex items-center justify-center space-x-2"
                    >
                      <CameraIcon className="h-5 w-5" />
                      <span>Mở camera</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 active:scale-98 transition-all flex items-center justify-center space-x-2"
                    >
                      <PhotoIcon className="h-5 w-5" />
                      <span>Chọn ảnh</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tree Information Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-2">
                  🌳 Tên cây (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newTreeData.name}
                  onChange={(e) => setNewTreeData({ ...newTreeData, name: e.target.value })}
                  className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 bg-white shadow-sm"
                  placeholder="Để trống sẽ tự động đặt tên"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nếu để trống: "{newTreeData.variety} {new Date().toLocaleDateString('vi-VN')}"
                </p>
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  🌱 Giống cây
                  <span className="text-red-500 ml-2">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'Monthong', label: 'Monthong' },
                    { value: 'Musang King', label: 'Musang King' },
                    { value: 'Kan Yao', label: 'Kan Yao' },
                    { value: 'Ri6', label: 'Ri6' },
                    { value: 'Black Thorn', label: 'Black Thorn' },
                    { value: 'Red Prawn', label: 'Red Prawn' },
                  ].map((variety) => (
                    <button
                      key={variety.value}
                      type="button"
                      onClick={() => setNewTreeData({ ...newTreeData, variety: variety.value })}
                      className={`p-4 border-2 rounded-xl text-center transition-all min-touch active:scale-95 ${
                        newTreeData.variety === variety.value
                          ? 'border-green-500 bg-green-50 text-green-800 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold text-lg">{variety.value}</div>
                      <div className="text-sm text-gray-500">{variety.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  🌿 Trạng thái cây
                  <span className="text-red-500 ml-2">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'Cây Non', label: 'Cây Non', icon: '🌱' },
                    { value: 'Cây Trưởng Thành', label: 'Trưởng Thành', icon: '🌳' },
                    { value: 'Cây Già', label: 'Cây Già', icon: '🌲' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => setNewTreeData({ ...newTreeData, treeStatus: status.value as any })}
                      className={`p-4 border-2 rounded-xl text-center transition-all min-touch active:scale-95 ${
                        newTreeData.treeStatus === status.value
                          ? 'border-green-500 bg-green-50 text-green-800 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-2xl mb-1">{status.icon}</div>
                      <div className="font-semibold text-sm">{status.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  📍 Khu vực
                  <span className="text-red-500 ml-2">*</span>
                  {nearestZone && (
                    <span className="ml-2 text-xs text-green-600 font-normal">
                      (⭐ Gần nhất)
                    </span>
                  )}
                </label>
                {zones.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {zones.map((zone) => (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => {
                          setSelectedZone(zone.name)
                          setNewTreeData({ ...newTreeData, zoneName: zone.name })
                        }}
                        className={`p-4 border-2 rounded-xl text-center transition-all min-touch active:scale-95 ${
                          newTreeData.zoneName === zone.name
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : nearestZone?.id === zone.id
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          {nearestZone?.id === zone.id && <span className="text-lg">⭐</span>}
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: zone.color || '#3b82f6' }}
                          />
                        </div>
                        <div className="font-semibold text-base">{zone.name}</div>
                        {zone.code && (
                          <div className="text-xs text-gray-500 mt-1">{zone.code}</div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-yellow-700">
                      Chưa có khu vực nào. Vui lòng tạo khu vực trước.
                    </p>
                  </div>
                )}
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

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white pb-4">
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    stopCamera()
                    setCapturedPhotos([])
                  }}
                  className="flex-1 px-4 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-300 active:scale-98 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateTree}
                  disabled={creating || !newTreeData.variety || !newTreeData.zoneName}
                  className="flex-1 px-4 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:shadow-xl active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Đang tạo...' : 'Tạo cây'}
                </button>
              </div>
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
    </>
  )
}