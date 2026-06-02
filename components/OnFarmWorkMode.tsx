'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Tree } from '@/lib/types'
import Map, { Source, Layer, Marker, MapRef } from 'react-map-gl/maplibre'
import { InteractiveMarker } from './UnifiedMap'
import maplibregl from 'maplibre-gl'
import * as turf from '@turf/turf'
import { useIOSOptimizedGPS, IOSGPSPosition } from '@/lib/ios-optimized-gps'
import { useWakeLock } from '@/lib/use-wake-lock'
import { PlusCircleIcon, XMarkIcon, MapPinIcon, ArrowPathIcon, CameraIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { createTree, updateTree } from '@/lib/firestore'
import { compressImageSmart } from '@/lib/photo-compression'
import { uploadFile } from '@/lib/storage'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from '@/lib/audit-service'
import { savePendingPhoto } from '@/lib/offline-photos-db'
import { isWifiConnection } from '@/lib/offline-sync-service'

import 'maplibre-gl/dist/maplibre-gl.css'

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
  onTreeUpdated?: (tree: Tree) => void
  farmId: string
}

interface NearbyTree extends Tree {
  distance: number
}

// AutoCenterMap helper removed since MapLibre uses direct useEffect centering

export default function OnFarmWorkMode({ trees, zones, onClose, onTreeSelect, onTreeCreated, onTreeUpdated, farmId }: OnFarmWorkModeProps) {
  const { user, selectedSeasonYear } = useSimpleAuth()
  const gps = useIOSOptimizedGPS()
  const mapRef = useRef<MapRef | null>(null)
  
  // Keep device screen active during active farm work
  useWakeLock(true)
  
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
  const [ambiguousTrees, setAmbiguousTrees] = useState<Tree[] | null>(null)
  const [showAmbiguityResolver, setShowAmbiguityResolver] = useState(false)
  const [quickUpdatingGPS, setQuickUpdatingGPS] = useState<string | null>(null)
  
  // GPS Calibration (Burst Mode) & Drag-drop fine-tuning states
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [calibratedPosition, setCalibratedPosition] = useState<{
    lat: number
    lng: number
    accuracy: number
  } | null>(null)
  const [isPlacingNewTree, setIsPlacingNewTree] = useState(false)
  const [isZoomedIn, setIsZoomedIn] = useState<boolean>(true) // Work mode starts at 20 (zoomed in)

  const handleZoom = useCallback((e: any) => {
    const currentZoom = e.target.getZoom()
    const zoomedIn = currentZoom >= 18
    setIsZoomedIn(prev => (prev !== zoomedIn ? zoomedIn : prev))
  }, [])
  
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
      distanceFilter: 3, // Update every 3 meters
      accuracyFilter: 20 // Skip inaccurate cell-tower positions (>20m error)
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

  // Auto-center map when userPosition updates
  useEffect(() => {
    if (userPosition && mapRef.current) {
      mapRef.current.easeTo({
        center: [userPosition.lng, userPosition.lat],
        zoom: 20,
        duration: 1000
      })
    }
  }, [userPosition])

  // Camera functions
  const startCamera = async () => {
    try {
      console.log('📸 Starting camera...')
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported')
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      console.log('✅ Camera stream obtained')
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
        console.log('✅ Camera active')
      }
    } catch (error) {
      console.error('❌ Camera error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`❌ Không thể mở camera: ${errorMessage}\n\nVui lòng:\n1. Kiểm tra quyền truy cập camera\n2. Đảm bảo không có ứng dụng nào khác đang dùng camera\n3. Thử tải lại trang`)
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

  const handleStartTreePlacement = async () => {
    if (!userPosition) return
    
    setIsCalibrating(true)
    setCalibrationProgress(10)
    
    try {
      // Simulate progress bar movement during burst
      const progressInterval = setInterval(() => {
        setCalibrationProgress(prev => Math.min(prev + 15, 90))
      }, 400)
      
      const calibrated = await gps.getGPSBurst(4, 500, { enableHighAccuracy: true })
      
      clearInterval(progressInterval)
      setCalibrationProgress(100)
      
      setTimeout(() => {
        setIsCalibrating(false)
        setCalibratedPosition({
          lat: calibrated.latitude,
          lng: calibrated.longitude,
          accuracy: calibrated.accuracy
        })
        setIsPlacingNewTree(true)
      }, 300)
      
    } catch (error) {
      console.error('Calibration failed, falling back to current user position:', error)
      setIsCalibrating(false)
      setCalibratedPosition({
        lat: userPosition.lat,
        lng: userPosition.lng,
        accuracy: userPosition.accuracy
      })
      setIsPlacingNewTree(true)
    }
  }

  const handleQuickUpdateGPS = async (tree: Tree) => {
    if (!user || !userPosition) {
      alert('Không tìm thấy thông tin người dùng hoặc vị trí GPS hiện tại.')
      return
    }

    const confirmUpdate = window.confirm(
      `Bạn có chắc chắn muốn cập nhật tọa độ của cây "${tree.name || tree.variety}"?\n` +
      `Hệ thống sẽ chạy chuẩn hóa vị trí GPS trong 3 giây để triệt tiêu sai số.`
    )
    if (!confirmUpdate) return

    setQuickUpdatingGPS(tree.id)
    setIsCalibrating(true)
    setCalibrationProgress(15)

    try {
      const progressInterval = setInterval(() => {
        setCalibrationProgress(prev => Math.min(prev + 20, 90))
      }, 500)

      const calibrated = await gps.getGPSBurst(4, 500, { enableHighAccuracy: true })
      
      clearInterval(progressInterval)
      setCalibrationProgress(100)
      
      setTimeout(async () => {
        setIsCalibrating(false)
        try {
          await updateTree(farmId, tree.id, user.uid, {
            latitude: calibrated.latitude,
            longitude: calibrated.longitude,
            gpsAccuracy: calibrated.accuracy,
            updatedAt: new Date()
          })
          
          const updatedTree = {
            ...tree,
            latitude: calibrated.latitude,
            longitude: calibrated.longitude,
            gpsAccuracy: calibrated.accuracy,
            updatedAt: new Date()
          }

          onTreeUpdated?.(updatedTree)
          alert('Cập nhật tọa độ GPS chuẩn hóa thành công!')
        } catch (error) {
          console.error('Error updating tree GPS:', error)
          alert('Lỗi cập nhật GPS. Vui lòng thử lại.')
        }
      }, 300)

    } catch (error) {
      console.error('Calibration failed, falling back to current user position:', error)
      setIsCalibrating(false)
      try {
        await updateTree(farmId, tree.id, user.uid, {
          latitude: userPosition.lat,
          longitude: userPosition.lng,
          gpsAccuracy: userPosition.accuracy,
          updatedAt: new Date()
        })
        
        const updatedTree = {
          ...tree,
          latitude: userPosition.lat,
          longitude: userPosition.lng,
          gpsAccuracy: userPosition.accuracy,
          updatedAt: new Date()
        }

        onTreeUpdated?.(updatedTree)
        alert('Không thể chuẩn hóa, đã cập nhật GPS theo vị trí hiện tại của bạn!')
      } catch (innerError) {
        console.error('Fallback update failed:', innerError)
        alert('Lỗi cập nhật GPS. Vui lòng thử lại.')
      }
    } finally {
      setQuickUpdatingGPS(null)
    }
  }

  const handleMarkerClick = (clickedTree: Tree) => {
    if (!clickedTree.latitude || !clickedTree.longitude) {
      onTreeSelect(clickedTree)
      return
    }

    const clickedPoint = turf.point([clickedTree.longitude, clickedTree.latitude])
    
    // Find all trees within 4 meters of the clicked tree
    const overlapping = trees.filter(t => {
      if (!t.latitude || !t.longitude) return false
      const distance = turf.distance(
        clickedPoint,
        turf.point([t.longitude, t.latitude]),
        { units: 'meters' }
      )
      return distance <= 4
    })

    if (overlapping.length > 1) {
      setAmbiguousTrees(overlapping)
      setShowAmbiguityResolver(true)
    } else {
      onTreeSelect(clickedTree)
    }
  }

  // Handle create new tree with photo upload
  const handleCreateTree = useCallback(async () => {
    if (!user || !newTreeData.variety || !newTreeData.zoneName) {
      alert('Vui lòng chọn giống cây và khu vực')
      return
    }

    const activeLat = calibratedPosition?.lat ?? userPosition?.lat
    const activeLng = calibratedPosition?.lng ?? userPosition?.lng
    const activeAccuracy = calibratedPosition?.accuracy ?? userPosition?.accuracy

    if (!activeLat || !activeLng || activeAccuracy === undefined) {
      alert('Không xác định được tọa độ để tạo cây')
      return
    }

    if (activeAccuracy > 15) {
      const confirmSave = window.confirm(
        `⚠️ Cảnh báo: Độ chính xác GPS hiện tại khá kém (±${activeAccuracy.toFixed(0)}m).\n` +
        `Tọa độ lưu lại có thể bị lệch nhiều so với thực tế.\n\n` +
        `Bạn có muốn tiếp tục tạo cây tại vị trí này không?`
      )
      if (!confirmSave) return
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
        latitude: activeLat,
        longitude: activeLng,
        gpsAccuracy: activeAccuracy,
        plantingDate: new Date(),
        manualFruitCount: 0,
        aiFruitCount: 0,
        needsAttention: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        seasonalStats: {
          [selectedSeasonYear]: {
            manualFruitCount: 0,
            aiFruitCount: 0,
            healthStatus: 'Good',
            notes: '',
            updatedAt: new Date()
          }
        }
      }

      const treeId = await createTree(farmId, user.uid, newTree as Omit<Tree, 'id' | 'farmId'>)
      console.log('✅ [OnFarmWorkMode] Tree created with ID:', treeId)
      
      // Step 2: Upload or queue photos offline
      if (capturedPhotos.length > 0) {
        const isOnline = typeof navigator !== 'undefined' && navigator.onLine
        const isWifi = isWifiConnection()

        if (isOnline && isWifi) {
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
                latitude: activeLat,
                longitude: activeLng,
                uploadedToServer: true,
                serverProcessed: false,
                needsAIAnalysis: false,
                compressedPath: storagePath,
                originalPath: storagePath,
                localPath: downloadURL,
                createdAt: serverTimestamp(),
                seasonYear: selectedSeasonYear
              }
              
              await setDoc(doc(db, 'farms', farmId, 'photos', photoId), photoDoc)
              console.log(`  ✅ Photo document created: ${photoId}`)
              
              // Log photo upload to audit system
              try {
                await AuditService.logEvent({
                  userId: user.uid,
                  userEmail: user.email || 'Unknown User',
                  action: 'PHOTO_UPLOADED',
                  resource: 'photo',
                  resourceId: treeId,
                  details: {
                    photoId: photoId,
                    photoType: 'general',
                    treeId: treeId,
                    farmId: farmId,
                    hasGPS: true,
                    source: 'on_farm_work_mode'
                  },
                  severity: 'low',
                  category: 'data_modification',
                  status: 'success'
                })
              } catch (auditError) {
                console.error('Failed to log photo upload:', auditError)
              }
              
            } catch (photoError) {
              console.error(`  ❌ Error uploading photo ${i + 1}:`, photoError)
            }
          }
        } else {
          console.log(`📦 [OnFarmWorkMode] Device offline or not on Wifi. Storing ${capturedPhotos.length} photos in IndexedDB queue...`)
          
          for (let i = 0; i < capturedPhotos.length; i++) {
            const photoUrl = capturedPhotos[i]
            try {
              const response = await fetch(photoUrl)
              const blob = await response.blob()
              
              const photoId = `pending_photo_${Date.now()}_${i}`
              
              await savePendingPhoto({
                id: photoId,
                treeId,
                farmId,
                photoType: 'general',
                timestamp: new Date().toISOString(),
                imageBlob: blob,
                latitude: activeLat,
                longitude: activeLng,
                seasonYear: selectedSeasonYear
              })
              console.log(`  ✅ Photo ${i + 1} saved to IndexedDB: ${photoId}`)
            } catch (err) {
              console.error(`  ❌ Failed to save photo ${i + 1} to IndexedDB:`, err)
            }
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
      setIsPlacingNewTree(false)
      setCalibratedPosition(null)
      
      if (typeof navigator !== 'undefined' && navigator.onLine && isWifiConnection()) {
        alert(`✅ Đã tạo cây "${autoName}" với ${capturedPhotos.length} ảnh!`)
      } else {
        alert(`✅ Đã tạo cây "${autoName}" ngoại tuyến! ${capturedPhotos.length} ảnh đã được lưu vào thiết bị và sẽ tự động đồng bộ khi có kết nối Wifi.`)
      }
      console.log('🎉 [OnFarmWorkMode] Tree creation completed successfully!')
      
    } catch (error) {
      console.error('❌ [OnFarmWorkMode] Error creating tree:', error)
      alert('❌ Không thể tạo cây. Vui lòng thử lại.')
    } finally {
      setCreating(false)
    }
  }, [user, userPosition, newTreeData, farmId, capturedPhotos, onTreeCreated, selectedSeasonYear])

  // getTreeMarkerIcon helper removed (now rendered directly via React Markers in JSX)

  const pathGeoJSON = useMemo(() => ({
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: trackingHistory.map(point => [point.lng, point.lat])
    },
    properties: {}
  }), [trackingHistory])

  const accuracyCircleGeoJSON = useMemo(() => {
    if (!userPosition) return null
    try {
      return turf.circle([userPosition.lng, userPosition.lat], userPosition.accuracy, { units: 'meters' })
    } catch (e) {
      return null
    }
  }, [userPosition])

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
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
      
      <div className="fixed inset-0 bg-white flex flex-col" style={{ zIndex: 9999 }}>
      {/* Fullscreen Map */}
      <div className="flex-1 relative" style={{ zIndex: 1 }}>
        {userPosition ? (
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: userPosition.lng,
              latitude: userPosition.lat,
              zoom: 20
            }}
            bearing={userPosition.heading ? -userPosition.heading : 0}
            style={{ height: '100%', width: '100%' }}
            mapLib={maplibregl}
            onZoom={handleZoom}
          >
            {/* Street Map Layer (OpenStreetMap) */}
            <Source
              id="street"
              type="raster"
              tiles={["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]}
              tileSize={256}
              maxzoom={22}
            >
              <Layer id="street-layer" type="raster" />
            </Source>

            {/* User tracking path */}
            {trackingHistory.length > 1 && (
              <Source id="work-user-path" type="geojson" data={pathGeoJSON}>
                <Layer
                  id="work-user-path-layer"
                  type="line"
                  paint={{
                    'line-color': '#3b82f6',
                    'line-width': 3,
                    'line-opacity': 0.6,
                    'line-dasharray': [2, 4]
                  }}
                />
              </Source>
            )}

            {/* GPS Accuracy Circle */}
            {accuracyCircleGeoJSON && (
              <Source id="work-accuracy-circle" type="geojson" data={accuracyCircleGeoJSON}>
                <Layer
                  id="work-accuracy-circle-layer"
                  type="fill"
                  paint={{
                    'fill-color': '#3b82f6',
                    'fill-opacity': 0.1
                  }}
                />
                <Layer
                  id="work-accuracy-circle-line"
                  type="line"
                  paint={{
                    'line-color': '#3b82f6',
                    'line-width': 1
                  }}
                />
              </Source>
            )}

            {/* User marker */}
            <Marker
              longitude={userPosition.lng}
              latitude={userPosition.lat}
              anchor="center"
            >
              <div style={{ position: 'relative', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {userPosition.heading !== undefined && userPosition.heading !== null && !isNaN(userPosition.heading) && (
                  <svg style={{
                    position: 'absolute',
                    width: 80,
                    height: 80,
                    top: -25,
                    left: -25,
                    pointerEvents: 'none'
                  }} viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="beamGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d="M 50 50 L 32 15 L 68 15 Z" fill="url(#beamGradient)"/>
                  </svg>
                )}
                <div style={{
                  position: 'relative',
                  width: 20,
                  height: 20,
                  background: 'radial-gradient(circle, #3b82f6 30%, rgba(59, 130, 246, 0.3) 70%)',
                  borderRadius: '50%',
                  border: '3px solid white',
                  boxShadow: '0 0 15px rgba(59, 130, 246, 0.8)',
                  zIndex: 10
                }}></div>
              </div>
            </Marker>

            {/* Draggable Temporary New Tree Marker */}
            {isPlacingNewTree && calibratedPosition && (
              <Marker
                longitude={calibratedPosition.lng}
                latitude={calibratedPosition.lat}
                draggable={true}
                onDragEnd={(e) => {
                  const { lng, lat } = e.lngLat
                  console.log('📌 Dragged new tree pin to:', { lat, lng })
                  setCalibratedPosition(prev => prev ? {
                    ...prev,
                    lat,
                    lng
                  } : null)
                }}
                anchor="center"
              >
                <div style={{
                  width: 28,
                  height: 28,
                  backgroundColor: '#10b981',
                  borderRadius: '50%',
                  border: '3px solid white',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                  animation: 'pulse-green 1.5s infinite',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 14,
                  cursor: 'grab'
                }}>🌱</div>
                <style>{`
                  @keyframes pulse-green {
                    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                  }
                `}</style>
              </Marker>
            )}

            {/* Nearby trees */}
            {nearbyTrees.map(tree => {
              const size = tree.distance < 10 ? 24 : tree.distance < 20 ? 20 : 16
              const color = tree.distance < 10 ? '#ef4444' : tree.distance < 20 ? '#f59e0b' : '#22c55e'
              
              return (
                <Marker
                  key={tree.id}
                  longitude={tree.longitude!}
                  latitude={tree.latitude!}
                  anchor="center"
                >
                  <InteractiveMarker
                    tree={tree}
                    color={color}
                    size={size}
                    zIndex={12}
                    distanceLabel={String(Math.round(tree.distance))}
                    onSelect={handleMarkerClick}
                    isClickable={isZoomedIn}
                  />
                </Marker>
              )
            })}
          </Map>
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

      {/* Bottom Panel - Nearby Trees & Actions OR Placement controller */}
      <div className="bg-white border-t-4 border-blue-500 shadow-2xl" style={{ maxHeight: '45vh', zIndex: 9998 }}>
        {isPlacingNewTree && calibratedPosition ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl animate-bounce">
              📍
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Xác nhận vị trí cây mới</h3>
              <p className="text-sm text-slate-500 mt-1">
                Kéo biểu tượng mầm cây xanh <span className="font-semibold text-emerald-600">🌱</span> trên bản đồ vệ tinh để khớp với gốc cây thực tế, sau đó bấm tiếp tục.
              </p>
            </div>
            <div className="flex space-x-3 max-w-md mx-auto">
              <button
                onClick={() => {
                  setIsPlacingNewTree(false)
                  setCalibratedPosition(null)
                }}
                className="flex-1 py-3.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl active:scale-95 transition-all text-center"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(true)
                }}
                className="flex-1 py-3.5 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all text-center"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        ) : (
          /* Nearby Trees List */
          nearbyTrees.length > 0 && !showCreateForm && (
          <div className="p-4 overflow-y-auto" style={{ maxHeight: '30vh' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />
              Cây gần bạn ({nearbyTrees.length})
            </h3>
            <div className="space-y-2">
              {nearbyTrees.map(tree => {
                const canQuickUpdate = tree.distance <= 15
                return (
                  <div
                    key={tree.id}
                    className="w-full bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-4 hover:border-blue-300 transition-all flex items-center justify-between"
                  >
                    {/* Clickable details area */}
                    <button
                      onClick={() => onTreeSelect(tree)}
                      className="flex-1 text-left focus:outline-none min-touch"
                    >
                      <div className="font-bold text-gray-900 text-lg">
                        {tree.name || tree.variety}
                      </div>
                      <div className="text-sm text-gray-600">
                        {tree.variety} • {tree.zoneName || tree.zoneCode}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                        <span>Khoảng cách:</span>
                        <span className={`font-semibold ${
                          tree.distance < 10 ? 'text-red-600' :
                          tree.distance < 20 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {tree.distance.toFixed(1)}m
                        </span>
                      </div>
                    </button>

                    {/* Quick GPS update button */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        disabled={!canQuickUpdate || quickUpdatingGPS === tree.id}
                        onClick={() => handleQuickUpdateGPS(tree)}
                        className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center space-x-1 ${
                          canQuickUpdate
                            ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95 shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={canQuickUpdate ? "Cập nhật GPS về vị trí hiện tại của bạn" : "Đứng gần hơn (<= 15m) để cập nhật GPS"}
                      >
                        {quickUpdatingGPS === tree.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                            <span className="hidden sm:inline">Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <ArrowPathIcon className="h-3.5 w-3.5" />
                            <span>Cập nhật GPS</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

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
                      onClick={() => {
                        startCamera().catch(err => {
                          console.error('Failed to start camera:', err)
                        })
                      }}
                      className="bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 active:scale-98 transition-all flex items-center justify-center space-x-2"
                    >
                      <CameraIcon className="h-5 w-5" />
                      <span>Mở Camera</span>
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

              {(() => {
                const displayLat = calibratedPosition?.lat ?? userPosition?.lat
                const displayLng = calibratedPosition?.lng ?? userPosition?.lng
                const displayAccuracy = calibratedPosition?.accuracy ?? userPosition?.accuracy
                
                if (displayLat === undefined || displayLng === undefined || displayAccuracy === undefined) return null;
                
                return (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-blue-700 font-semibold mb-1">📍 Vị trí GPS cây:</div>
                      <div className="text-xs font-mono text-blue-900">
                        {displayLat.toFixed(6)}, {displayLng.toFixed(6)}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Độ chính xác chuẩn hóa: ±{displayAccuracy.toFixed(0)}m
                        {calibratedPosition && <span className="ml-1 text-green-600 font-semibold">(Đã căn chỉnh)</span>}
                      </div>
                    </div>
                    {displayAccuracy > 15 && (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start space-x-2 shadow-sm">
                        <span className="text-lg">⚠️</span>
                        <div className="text-xs">
                          <div className="font-bold text-amber-800">Tín hiệu GPS yếu</div>
                          <div className="text-amber-700 mt-0.5">
                            Độ chính xác ±{displayAccuracy.toFixed(0)}m (kém hơn 15m). Tọa độ lưu lại có thể bị lệch.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white pb-4">
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    stopCamera()
                    setCapturedPhotos([])
                    setIsPlacingNewTree(false)
                    setCalibratedPosition(null)
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
        {!showCreateForm && !isPlacingNewTree && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleStartTreePlacement}
              disabled={!userPosition}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <PlusCircleIcon className="h-6 w-6" />
              <span>Tạo cây mới tại đây</span>
            </button>
          </div>
        )}
      </div>

      {/* Overlapping Trees Resolver Panel */}
      {showAmbiguityResolver && ambiguousTrees && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center" style={{ zIndex: 10002 }}>
          <div className="bg-white rounded-t-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center">
                <MapPinIcon className="h-6 w-6 mr-2 animate-bounce" />
                Chọn cây chính xác (Trùng vị trí)
              </h3>
              <button
                onClick={() => {
                  setShowAmbiguityResolver(false)
                  setAmbiguousTrees(null)
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
              <p className="text-sm text-gray-500 mb-2">
                Phát hiện {ambiguousTrees.length} cây ở khoảng cách rất gần nhau. Vui lòng chọn cây bạn muốn thao tác:
              </p>
              
              <div className="space-y-2">
                {ambiguousTrees.map(tree => {
                  // Calculate distance from user position if available
                  let distanceText = 'Không rõ khoảng cách'
                  if (userPosition && tree.latitude && tree.longitude) {
                    const userPoint = turf.point([userPosition.lng, userPosition.lat])
                    const treePoint = turf.point([tree.longitude, tree.latitude])
                    const dist = turf.distance(userPoint, treePoint, { units: 'meters' })
                    distanceText = `${dist.toFixed(1)}m`
                  }
                  
                  return (
                    <button
                      key={tree.id}
                      onClick={() => {
                        onTreeSelect(tree)
                        setShowAmbiguityResolver(false)
                        setAmbiguousTrees(null)
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 hover:border-blue-400 active:scale-98 transition-all text-left flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-lg">
                          {tree.name || tree.variety}
                        </div>
                        <div className="text-sm text-slate-500">
                          {tree.variety} • {tree.zoneName || tree.zoneCode}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {distanceText}
                        </div>
                        <div className="text-xs text-slate-400">cách bạn</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-4 pt-2">
              <button
                onClick={() => {
                  setShowAmbiguityResolver(false)
                  setAmbiguousTrees(null)
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-95 transition-all text-center"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* GPS Calibration Overlay */}
      {isCalibrating && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center" style={{ zIndex: 20000 }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Đang chuẩn hóa GPS...</h4>
              <p className="text-sm text-slate-500 mt-1">Lấy mẫu dữ liệu và khử nhiễu môi trường để tăng độ chính xác vị trí</p>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${calibrationProgress}%` }}></div>
            </div>
            <div className="text-xs text-slate-400 font-mono">Tiến trình: {calibrationProgress}%</div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}