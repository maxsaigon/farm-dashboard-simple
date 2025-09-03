'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { gpsTrackingService, LocationUpdate, TrackingSession, GeofenceEvent } from '@/lib/gps-tracking-service'
import { MobileInput } from './MobileCards'
import { 
  MapPinIcon,
  PlayIcon,
  StopIcon,
  RadioIcon,
  BoltIcon,
  ClockIcon,
  ViewfinderCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CameraIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface LiveTreePosition {
  id: string
  name: string
  currentLatitude: number
  currentLongitude: number
  accuracy: number
  lastUpdated: Date
  isBeingTracked: boolean
  userId: string
}

interface TreePositioningMode {
  mode: 'add_new' | 'update_existing' | 'survey'
  targetTreeId?: string
  newTreeName?: string
  variety?: string
}

export default function RealTimeTreePositioning() {
  const { user, currentFarm } = useEnhancedAuth()
  
  // Tracking state
  const [isTracking, setIsTracking] = useState(false)
  const [currentSession, setCurrentSession] = useState<TrackingSession | null>(null)
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null)
  const [trackingAccuracy, setTrackingAccuracy] = useState<number>(0)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  
  // Tree positioning
  const [positioningMode, setPositioningMode] = useState<TreePositioningMode>({ mode: 'add_new' })
  const [liveTreePositions, setLiveTreePositions] = useState<LiveTreePosition[]>([])
  const [pendingTreePosition, setPendingTreePosition] = useState<Partial<LiveTreePosition> | null>(null)
  
  // Zone and geofence
  const [currentZone, setCurrentZone] = useState<string | null>(null)
  const [geofenceEvents, setGeofenceEvents] = useState<GeofenceEvent[]>([])
  const [nearbyTrees, setNearbyTrees] = useState<string[]>([])
  
  // UI state
  const [showPositionForm, setShowPositionForm] = useState(false)
  const [isCapturingPosition, setIsCapturingPosition] = useState(false)
  const [captureProgress, setCaptureProgress] = useState(0)
  
  // Statistics
  const [sessionStats, setSessionStats] = useState({
    totalDistance: 0,
    locationsRecorded: 0,
    zonesVisited: 0,
    treesPositioned: 0,
    averageAccuracy: 0
  })

  // Setup GPS tracking listeners
  useEffect(() => {
    if (!user || !currentFarm) return

    // Location updates listener
    const locationUnsubscribe = gpsTrackingService.addLocationListener((location: LocationUpdate) => {
      setCurrentLocation(location)
      setTrackingAccuracy(location.coordinate.accuracy)
      setBatteryLevel(location.batteryLevel || null)
      setCurrentZone(location.zoneId || null)
      setNearbyTrees(location.nearbyTreeIds)
      
      // Update session stats
      const session = gpsTrackingService.getCurrentSession()
      if (session) {
        setSessionStats({
          totalDistance: session.totalDistance,
          locationsRecorded: session.locationCount,
          zonesVisited: session.zonesVisited.length,
          treesPositioned: liveTreePositions.length,
          averageAccuracy: session.averageAccuracy
        })
      }
    })

    // Geofence events listener
    const geofenceUnsubscribe = gpsTrackingService.addGeofenceListener((event: GeofenceEvent) => {
      setGeofenceEvents(prev => [event, ...prev].slice(0, 10)) // Keep last 10 events
      
      // Show notification for zone transitions
      if (event.eventType === 'enter') {
        showZoneEntryNotification(event)
      } else if (event.eventType === 'exit') {
        showZoneExitNotification(event)
      }
    })

    // Session updates listener
    const sessionUnsubscribe = gpsTrackingService.addSessionListener((session: TrackingSession) => {
      setCurrentSession(session)
      setIsTracking(session.isActive)
    })

    return () => {
      locationUnsubscribe()
      geofenceUnsubscribe()
      sessionUnsubscribe()
    }
  }, [user, currentFarm])

  // Auto-start tracking if in positioning mode
  useEffect(() => {
    if (positioningMode.mode !== 'survey' && !isTracking && user && currentFarm) {
      // Auto-start for tree positioning modes
      handleStartTracking()
    }
  }, [positioningMode, user, currentFarm])

  const handleStartTracking = async () => {
    if (!user || !currentFarm) return

    try {
      const session = await gpsTrackingService.startTracking(user.uid, currentFarm.id)
      setCurrentSession(session)
      setIsTracking(true)
      console.log('Started GPS tracking for tree positioning')
    } catch (error) {
      console.error('Failed to start GPS tracking:', error)
      alert('Không thể bắt đầu theo dõi GPS. Vui lòng kiểm tra quyền truy cập vị trí.')
    }
  }

  const handleStopTracking = async () => {
    try {
      const completedSession = await gpsTrackingService.stopTracking()
      setCurrentSession(completedSession)
      setIsTracking(false)
      console.log('Stopped GPS tracking')
    } catch (error) {
      console.error('Failed to stop GPS tracking:', error)
    }
  }

  const handleCaptureTreePosition = async () => {
    if (!currentLocation || !user) return

    setIsCapturingPosition(true)
    setCaptureProgress(0)

    try {
      // Capture multiple GPS readings for better accuracy
      const readings: LocationUpdate[] = []
      const maxReadings = 10
      const readingInterval = 1000 // 1 second

      for (let i = 0; i < maxReadings; i++) {
        await new Promise(resolve => setTimeout(resolve, readingInterval))
        
        const currentReading = gpsTrackingService.getCurrentLocation()
        if (currentReading && gpsTrackingService.getCurrentSession()) {
          const locationUpdate: LocationUpdate = {
            id: `reading_${Date.now()}_${i}`,
            userId: user.uid,
            farmId: currentFarm!.id,
            coordinate: currentReading,
            zoneId: currentZone || undefined,
            isInsideAnyZone: !!currentZone,
            nearbyTreeIds: [],
            isOnline: navigator.onLine,
            metadata: {}
          }
          readings.push(locationUpdate)
        }
        
        setCaptureProgress(((i + 1) / maxReadings) * 100)
      }

      // Calculate average position from readings
      if (readings.length > 0) {
        const avgLatitude = readings.reduce((sum, r) => sum + r.coordinate.latitude, 0) / readings.length
        const avgLongitude = readings.reduce((sum, r) => sum + r.coordinate.longitude, 0) / readings.length
        const avgAccuracy = readings.reduce((sum, r) => sum + r.coordinate.accuracy, 0) / readings.length

        const newPosition: LiveTreePosition = {
          id: positioningMode.targetTreeId || `new_tree_${Date.now()}`,
          name: positioningMode.newTreeName || `Cây mới ${liveTreePositions.length + 1}`,
          currentLatitude: avgLatitude,
          currentLongitude: avgLongitude,
          accuracy: avgAccuracy,
          lastUpdated: new Date(),
          isBeingTracked: true,
          userId: user.uid
        }

        setPendingTreePosition(newPosition)
        setShowPositionForm(true)
      }

    } catch (error) {
      console.error('Error capturing tree position:', error)
      alert('Không thể ghi nhận vị trí cây. Vui lòng thử lại.')
    } finally {
      setIsCapturingPosition(false)
      setCaptureProgress(0)
    }
  }

  const handleSaveTreePosition = async () => {
    if (!pendingTreePosition) return

    try {
      // Add to live positions
      setLiveTreePositions(prev => [pendingTreePosition as LiveTreePosition, ...prev])
      
      // In real app, save to Firebase
      console.log('Saving tree position:', pendingTreePosition)
      
      // Reset state
      setPendingTreePosition(null)
      setShowPositionForm(false)
      
      // Update stats
      setSessionStats(prev => ({
        ...prev,
        treesPositioned: prev.treesPositioned + 1
      }))

      alert('Vị trí cây đã được lưu thành công!')

    } catch (error) {
      console.error('Error saving tree position:', error)
      alert('Không thể lưu vị trí cây. Vui lòng thử lại.')
    }
  }

  const showZoneEntryNotification = (event: GeofenceEvent) => {
    // In real app, show native notification
    console.log('Entered zone:', event.zoneId)
  }

  const showZoneExitNotification = (event: GeofenceEvent) => {
    // In real app, show native notification
    console.log('Exited zone:', event.zoneId)
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 5) return 'text-green-600'
    if (accuracy <= 15) return 'text-yellow-600'
    if (accuracy <= 30) return 'text-orange-600'
    return 'text-red-600'
  }

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy <= 5) return <CheckCircleIcon className="h-4 w-4" />
    if (accuracy <= 15) return <RadioIcon className="h-4 w-4" />
    if (accuracy <= 30) return <ExclamationTriangleIcon className="h-4 w-4" />
    return <ExclamationTriangleIcon className="h-4 w-4" />
  }

  if (!user || !currentFarm) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <MapPinIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cần đăng nhập</h2>
          <p className="text-gray-600">Vui lòng đăng nhập để sử dụng tính năng định vị cây.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with tracking status */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">Định vị cây thời gian thực</h1>
          <button
            onClick={isTracking ? handleStopTracking : handleStartTracking}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isTracking 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isTracking ? (
              <>
                <StopIcon className="h-4 w-4" />
                <span>Dừng</span>
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                <span>Bắt đầu</span>
              </>
            )}
          </button>
        </div>

        {/* Current GPS Status */}
        {currentLocation && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <div className={getAccuracyColor(trackingAccuracy)}>
                {getAccuracyIcon(trackingAccuracy)}
              </div>
              <span className="text-gray-600">±{trackingAccuracy.toFixed(1)}m</span>
            </div>
            
            {batteryLevel && (
              <div className="flex items-center space-x-2">
                <BoltIcon className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">{batteryLevel}%</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">
                {currentLocation.coordinate.timestamp.toLocaleTimeString('vi-VN')}
              </span>
            </div>
          </div>
        )}

        {/* Current Zone */}
        {currentZone && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <ViewfinderCircleIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">Đang ở khu vực: {currentZone}</span>
            </div>
          </div>
        )}
      </div>

      {/* Positioning Mode Selector */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setPositioningMode({ mode: 'add_new' })}
            className={`p-3 rounded-lg text-center transition-colors ${
              positioningMode.mode === 'add_new'
                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <PlusIcon className="h-6 w-6 mx-auto mb-1" />
            <span className="text-xs font-medium">Thêm cây mới</span>
          </button>
          
          <button
            onClick={() => setPositioningMode({ mode: 'update_existing' })}
            className={`p-3 rounded-lg text-center transition-colors ${
              positioningMode.mode === 'update_existing'
                ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <ArrowPathIcon className="h-6 w-6 mx-auto mb-1" />
            <span className="text-xs font-medium">Cập nhật vị trí</span>
          </button>
          
          <button
            onClick={() => setPositioningMode({ mode: 'survey' })}
            className={`p-3 rounded-lg text-center transition-colors ${
              positioningMode.mode === 'survey'
                ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <MapPinIcon className="h-6 w-6 mx-auto mb-1" />
            <span className="text-xs font-medium">Khảo sát</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Capture Position Button */}
        {isTracking && currentLocation && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <h3 className="font-semibold text-gray-900 mb-4">Ghi nhận vị trí cây</h3>
            
            {currentLocation && (
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Vĩ độ: {currentLocation.coordinate.latitude.toFixed(6)}</div>
                  <div>Kinh độ: {currentLocation.coordinate.longitude.toFixed(6)}</div>
                  <div className={`${getAccuracyColor(currentLocation.coordinate.accuracy)}`}>
                    Độ chính xác: ±{currentLocation.coordinate.accuracy.toFixed(1)}m
                  </div>
                </div>
              </div>
            )}

            {nearbyTrees.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Có {nearbyTrees.length} cây gần đây. Đảm bảo vị trí chính xác trước khi ghi nhận.
                </p>
              </div>
            )}

            <button
              onClick={handleCaptureTreePosition}
              disabled={isCapturingPosition || trackingAccuracy > 20}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isCapturingPosition ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Đang ghi nhận... {captureProgress.toFixed(0)}%</span>
                </>
              ) : (
                <>
                  <ViewfinderCircleIcon className="h-5 w-5" />
                  <span>Ghi nhận vị trí cây</span>
                </>
              )}
            </button>
            
            {trackingAccuracy > 20 && (
              <p className="text-sm text-red-600 mt-2">
                Độ chính xác GPS quá thấp. Di chuyển đến nơi có tín hiệu tốt hơn.
              </p>
            )}
          </div>
        )}

        {/* Session Statistics */}
        {currentSession && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Thống kê phiên</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Khoảng cách</div>
                <div className="font-medium">{sessionStats.totalDistance.toFixed(0)}m</div>
              </div>
              <div>
                <div className="text-gray-500">Điểm GPS</div>
                <div className="font-medium">{sessionStats.locationsRecorded}</div>
              </div>
              <div>
                <div className="text-gray-500">Khu vực</div>
                <div className="font-medium">{sessionStats.zonesVisited}</div>
              </div>
              <div>
                <div className="text-gray-500">Cây đã định vị</div>
                <div className="font-medium text-green-600">{sessionStats.treesPositioned}</div>
              </div>
            </div>
          </div>
        )}

        {/* Live Tree Positions */}
        {liveTreePositions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Cây đã định vị ({liveTreePositions.length})</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {liveTreePositions.map((tree) => (
                <div key={tree.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{tree.name}</h4>
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        <div>Vĩ độ: {tree.currentLatitude.toFixed(6)}</div>
                        <div>Kinh độ: {tree.currentLongitude.toFixed(6)}</div>
                        <div className={getAccuracyColor(tree.accuracy)}>
                          Độ chính xác: ±{tree.accuracy.toFixed(1)}m
                        </div>
                        <div className="text-gray-500">
                          {tree.lastUpdated.toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex space-x-2">
                      <button
                        onClick={() => window.location.href = `/camera?lat=${tree.currentLatitude}&lng=${tree.currentLongitude}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <CameraIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.location.href = `/map?lat=${tree.currentLatitude}&lng=${tree.currentLongitude}`}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <MapPinIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Geofence Events */}
        {geofenceEvents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Sự kiện khu vực</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {geofenceEvents.map((event) => (
                <div key={event.id} className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      event.eventType === 'enter' ? 'bg-green-500' : 
                      event.eventType === 'exit' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {event.eventType === 'enter' ? 'Vào khu vực' : 
                         event.eventType === 'exit' ? 'Rời khu vực' : 'Ở lại khu vực'} {event.zoneId}
                      </div>
                      <div className="text-sm text-gray-500">
                        {event.timestamp.toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Position Form Modal */}
      {showPositionForm && pendingTreePosition && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowPositionForm(false)} />
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-md relative">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Xác nhận vị trí cây</h3>
              
              <div className="space-y-4">
                <MobileInput
                  label="Tên cây"
                  value={pendingTreePosition.name || ''}
                  onChange={(value) => setPendingTreePosition(prev => ({ ...prev, name: value }))}
                  placeholder="Nhập tên cây..."
                  required
                />

                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vĩ độ:</span>
                      <span className="font-mono">{pendingTreePosition.currentLatitude?.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kinh độ:</span>
                      <span className="font-mono">{pendingTreePosition.currentLongitude?.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Độ chính xác:</span>
                      <span className={getAccuracyColor(pendingTreePosition.accuracy || 0)}>
                        ±{pendingTreePosition.accuracy?.toFixed(1)}m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowPositionForm(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveTreePosition}
                    disabled={!pendingTreePosition.name}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Lưu vị trí
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}