'use client'

import React, { useState, useEffect, useRef, useCallback, memo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Circle, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import * as turf from '@turf/turf'
import { Tree } from '@/lib/types'
import { useRealTimeUpdates } from '@/lib/websocket-service'
import { useBackgroundGeolocation } from '@/lib/background-geolocation'
import { useMobileGestures, triggerHapticFeedback } from '@/lib/use-mobile-gestures'
import { useIOSOptimizedGPS, IOSGPSPosition } from '@/lib/ios-optimized-gps'

// Import CSS files
if (typeof window !== 'undefined') {
  require('leaflet/dist/leaflet.css')
  require('leaflet-draw/dist/leaflet.draw.css')
}

// Import leaflet-draw dynamically
let LDraw: any = null
if (typeof window !== 'undefined') {
  try {
    LDraw = require('leaflet-draw')
  } catch (e) {
    console.warn('leaflet-draw not available:', e)
  }
}

// Fix for missing marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
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

interface UnifiedMapProps {
  trees: Tree[]
  zones: Zone[]
  selectedTree?: Tree | null
  selectedZone?: Zone | null
  onTreeSelect?: (tree: Tree) => void
  onZoneSelect?: (zone: Zone) => void
  onZoneCreated?: (zoneData: { boundaries: Array<{ latitude: number; longitude: number }> }) => void
  enableDrawing?: boolean
  enableRealTime?: boolean
  farmId?: string // For WebSocket room joining
  center?: [number, number]
  zoom?: number
  className?: string
  showUserPath?: boolean
  backgroundTrackingEnabled?: boolean
  proximityRadius?: number
  highlightedTreeId?: string | null // ID of tree to highlight with pulsing circle
  mapLayer?: MapLayerType // External control of map layer
  onMapLayerChange?: (layer: MapLayerType) => void // Callback when layer changes
}

// Map layer types
type MapLayerType = 'street' | 'satellite' | 'hybrid' | 'auto'

// Component to handle zoom-based layer switching
const ZoomBasedLayerManager = memo(({
  mapLayer,
  onAutoSwitch
}: {
  mapLayer: MapLayerType
  onAutoSwitch: (newLayer: 'street' | 'hybrid') => void
}) => {
  const map = useMap()
  
  useEffect(() => {
    if (mapLayer !== 'auto') return

    const handleZoomEnd = () => {
      const zoom = map.getZoom()
      // Esri World Imagery has good data up to zoom 18
      // Switch to street map at zoom 19+ for better detail
      if (zoom >= 19) {
        onAutoSwitch('street')
      } else {
        onAutoSwitch('hybrid')
      }
    }

    // Initial check
    handleZoomEnd()

    map.on('zoomend', handleZoomEnd)
    return () => {
      map.off('zoomend', handleZoomEnd)
    }
  }, [map, mapLayer, onAutoSwitch])

  return null
})

ZoomBasedLayerManager.displayName = 'ZoomBasedLayerManager'

// iOS-Optimized GPS tracking hook (replaces old useOptimizedPositioning)
const useIOSGPSTracking = (enabled: boolean = true) => {
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
  const [permissionState, setPermissionState] = useState<string>('unknown')

  useEffect(() => {
    console.log('🔄 [UnifiedMap] useIOSGPSTracking effect triggered', {
      enabled,
      timestamp: new Date().toISOString()
    })

    if (enabled) {
      console.log('🚀 [UnifiedMap] Starting iOS-Optimized GPS tracking...')
      
      gps.startTracking({
        onSuccess: (position: IOSGPSPosition) => {
          console.log('✅ [UnifiedMap] onSuccess callback received', {
            lat: position.latitude,
            lng: position.longitude,
            accuracy: position.accuracy,
            timestamp: position.timestamp
          })

          const newPos = {
            lat: position.latitude,
            lng: position.longitude,
            accuracy: position.accuracy,
            heading: position.heading || undefined,
            speed: position.speed || undefined,
            timestamp: position.timestamp
          }
          
          console.log('📝 [UnifiedMap] Setting userPosition state')
          setUserPosition(newPos)
          
          // Keep tracking history (last 20 points for path visualization)
          setTrackingHistory(prev => {
            const newHistory = [...prev, {
              lat: newPos.lat,
              lng: newPos.lng,
              timestamp: newPos.timestamp
            }].slice(-20)
            console.log('📝 [UnifiedMap] Updated tracking history, length:', newHistory.length)
            return newHistory
          })
        },
        onError: (error) => {
          console.error('❌ [UnifiedMap] onError callback received:', {
            code: error.code,
            message: error.message
          })
        },
        onPermissionGranted: () => {
          console.log('✅ [UnifiedMap] onPermissionGranted callback')
          setPermissionState('granted')
        },
        onPermissionDenied: () => {
          console.log('❌ [UnifiedMap] onPermissionDenied callback')
          setPermissionState('denied')
        }
      }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
        distanceFilter: 5 // Only update if moved 5 meters
      }).catch(error => {
        console.error('❌ [UnifiedMap] Failed to start GPS tracking:', error)
      })
    } else {
      console.log('🛑 [UnifiedMap] Stopping GPS tracking...')
      gps.stopTracking()
      setUserPosition(null)
      setTrackingHistory([])
    }

    return () => {
      console.log('🧹 [UnifiedMap] Cleanup: stopping GPS')
      gps.stopTracking()
    }
  }, [enabled])

  return { userPosition, trackingHistory, permissionState, gps }
}

// Proximity detection hook
const useProximityDetection = (
  trees: Tree[],
  zones: Zone[],
  userPosition: { lat: number, lng: number } | null,
  radius: number = 30
) => {
  const [nearbyItems, setNearbyItems] = useState<{
    trees: (Tree & { distance: number })[]
    zones: (Zone & { distance: number, isInside: boolean })[]
    currentZone: Zone | null
  }>({
    trees: [],
    zones: [],
    currentZone: null
  })

  useEffect(() => {
    if (!userPosition) {
      setNearbyItems({ trees: [], zones: [], currentZone: null })
      return
    }

    const userPoint = turf.point([userPosition.lng, userPosition.lat])

    // Find nearby trees
    const nearbyTrees = trees
      .filter(tree => tree.latitude && tree.longitude)
      .map(tree => ({
        ...tree,
        distance: turf.distance(
          userPoint,
          turf.point([tree.longitude!, tree.latitude!]),
          { units: 'meters' }
        )
      }))
      .filter(tree => tree.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    // Check zone proximity and containment
    const zoneProximity = zones.filter(zone => zone.boundaries && zone.boundaries.length >= 3).map(zone => {
      try {
        const coordinates = zone.boundaries.map(coord => [coord.longitude, coord.latitude])
        if (coordinates.length > 0) {
          const firstCoord = coordinates[0]
          const lastCoord = coordinates[coordinates.length - 1]
          if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            coordinates.push(firstCoord)
          }
        }

        const zonePolygon = turf.polygon([coordinates])
        const isInside = turf.booleanPointInPolygon(userPoint, zonePolygon)
        const distance = isInside ? 0 : turf.distance(userPoint, turf.centroid(zonePolygon), { units: 'meters' })

        return {
          ...zone,
          distance,
          isInside
        }
      } catch (error) {
        console.warn('Error processing zone:', zone.id, error)
        return {
          ...zone,
          distance: Infinity,
          isInside: false
        }
      }
    }).sort((a, b) => a.distance - b.distance)

    const currentZone = zoneProximity.find(z => z.isInside) || null

    setNearbyItems({
      trees: nearbyTrees,
      zones: zoneProximity.filter(z => z.distance <= radius || z.isInside),
      currentZone
    })
  }, [userPosition, trees, zones, radius])

  return nearbyItems
}

// Drawing controls component
const DrawingControls = memo(({
  map,
  onZoneCreated
}: {
  map: L.Map | null
  onZoneCreated?: (zoneData: { boundaries: Array<{ latitude: number; longitude: number }> }) => void
}) => {
  useEffect(() => {
    if (!map) return

    // Initialize draw control
    const drawControl = new (L.Control as any).Draw({
      draw: {
        polygon: {
          shapeOptions: {
            color: '#3b82f6',
            weight: 2,
            opacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.2
          }
        },
        marker: false,
        circle: false,
        rectangle: false,
        polyline: false,
        circlemarker: false
      },
      edit: {
        featureGroup: new L.FeatureGroup(),
        edit: false,
        remove: false
      }
    })

    map.addControl(drawControl)

    // Handle draw created
    const handleDrawCreated = (e: any) => {
      const layer = e.layer
      const latlngs = layer.getLatLngs()[0] // For polygons

      const boundaries = latlngs.map((latlng: L.LatLng) => ({
        latitude: latlng.lat,
        longitude: latlng.lng
      }))

      // Add the drawn polygon to map temporarily
      map.addLayer(layer)

      // Notify parent component
      if (onZoneCreated) {
        onZoneCreated({ boundaries })
      }
    }

    if (LDraw && LDraw.Draw && LDraw.Draw.Event) {
      map.on(LDraw.Draw.Event.CREATED, handleDrawCreated)
    }

    return () => {
      map.removeControl(drawControl)
      if (LDraw && LDraw.Draw && LDraw.Draw.Event) {
        map.off(LDraw.Draw.Event.CREATED, handleDrawCreated)
      }
    }
  }, [map, onZoneCreated])

  return null
})

// Calculate optimal center and zoom based on data
const calculateMapBounds = (trees: Tree[], zones: Zone[]) => {
  const coordinates: [number, number][] = []

  // Add tree coordinates
  trees.forEach(tree => {
    if (tree.latitude && tree.longitude && tree.latitude !== 0 && tree.longitude !== 0) {
      coordinates.push([tree.latitude, tree.longitude])
    }
  })

  // Add zone boundary coordinates
  zones.forEach(zone => {
    if (zone.boundaries && zone.boundaries.length > 0) {
      zone.boundaries.forEach(boundary => {
        coordinates.push([boundary.latitude, boundary.longitude])
      })
    }
  })

  if (coordinates.length === 0) {
    // Default to Ho Chi Minh City if no data
    return {
      center: [10.762622, 106.660172] as [number, number],
      zoom: 16
    }
  }

  // Calculate bounds
  const lats = coordinates.map(coord => coord[0])
  const lngs = coordinates.map(coord => coord[1])

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const centerLat = (minLat + maxLat) / 2
  const centerLng = (minLng + maxLng) / 2

  // Calculate zoom level based on bounds
  const latDiff = maxLat - minLat
  const lngDiff = maxLng - minLng
  const maxDiff = Math.max(latDiff, lngDiff)

  // Rough zoom calculation (higher zoom for smaller areas)
  let zoom = 16
  if (maxDiff > 1) zoom = 12
  else if (maxDiff > 0.5) zoom = 13
  else if (maxDiff > 0.2) zoom = 14
  else if (maxDiff > 0.1) zoom = 15
  else if (maxDiff > 0.05) zoom = 16
  else zoom = 17

  return {
    center: [centerLat, centerLng] as [number, number],
    zoom: Math.min(zoom, 22) // Cap at 22 for very close zoom (10m radius)
  }
}

// Main Unified Map Component
const UnifiedMap = memo(({
  trees: initialTrees,
  zones: initialZones,
  selectedTree,
  selectedZone,
  onTreeSelect,
  onZoneSelect,
  onZoneCreated,
  enableDrawing = false,
  enableRealTime = true,
  farmId,
  center,
  zoom,
  className = '',
  showUserPath: externalShowUserPath = false,
  backgroundTrackingEnabled: externalBackgroundTrackingEnabled = false,
  proximityRadius: externalProximityRadius = 30,
  highlightedTreeId = null,
  mapLayer: externalMapLayer = 'auto',
  onMapLayerChange
}: UnifiedMapProps) => {
  const mapRef = useRef<L.Map | null>(null)
  const [showUserPath, setShowUserPath] = useState(externalShowUserPath)
  const [proximityRadius, setProximityRadius] = useState(externalProximityRadius)
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] = useState(false)
  const [mapLayer, setMapLayer] = useState<MapLayerType>(externalMapLayer)
  const [activeLayer, setActiveLayer] = useState<'street' | 'hybrid'>('hybrid') // Actual active layer
  const [filters, setFilters] = useState({
    showTrees: true,
    showZones: true
  })

  // Handle auto layer switching based on zoom
  const handleAutoSwitch = useCallback((newLayer: 'street' | 'hybrid') => {
    if (mapLayer === 'auto' && activeLayer !== newLayer) {
      console.log(`🔄 Auto-switching from ${activeLayer} to ${newLayer}`)
      setActiveLayer(newLayer)
    }
  }, [mapLayer, activeLayer])

  // Sync with external mapLayer prop
  useEffect(() => {
    setMapLayer(externalMapLayer)
  }, [externalMapLayer])

  // Update active layer when manual selection changes
  useEffect(() => {
    if (mapLayer !== 'auto') {
      setActiveLayer(mapLayer === 'satellite' ? 'hybrid' : mapLayer)
    }
  }, [mapLayer])

  // Update local state when external props change
  useEffect(() => {
    console.log('🔄 [UnifiedMap] showUserPath prop changed:', externalShowUserPath)
    setShowUserPath(externalShowUserPath)
  }, [externalShowUserPath])

  useEffect(() => {
    console.log('🔄 [UnifiedMap] proximityRadius prop changed:', externalProximityRadius)
    setProximityRadius(externalProximityRadius)
  }, [externalProximityRadius])

  useEffect(() => {
    console.log('🔄 [UnifiedMap] backgroundTrackingEnabled prop received:', {
      externalBackgroundTrackingEnabled,
      timestamp: new Date().toISOString()
    })
    setBackgroundTrackingEnabled(externalBackgroundTrackingEnabled)
  }, [externalBackgroundTrackingEnabled])

  // Real-time data state
  const [trees, setTrees] = useState<Tree[]>(initialTrees)
  const [zones, setZones] = useState<Zone[]>(initialZones)

  // WebSocket real-time updates
  const { isConnected, isEnabled, connectionStatus, on, off } = useRealTimeUpdates(farmId)

  // Background geolocation
  const { startTracking, stopTracking, isActive: bgTrackingActive } = useBackgroundGeolocation()

  // Calculate optimal center and zoom based on data
  const mapConfig = React.useMemo(() => {
    if (center && zoom) {
      return { center, zoom }
    }
    return calculateMapBounds(trees, zones)
  }, [trees, zones, center, zoom])

  // GPS state management with iOS-Optimized GPS
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const { userPosition, trackingHistory, permissionState: gpsPermissionState, gps } = useIOSGPSTracking(gpsEnabled)
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown')

  // Auto-enable GPS when backgroundTrackingEnabled prop is true
  useEffect(() => {
    console.log('🔄 [UnifiedMap] Auto-enable effect triggered:', {
      externalBackgroundTrackingEnabled,
      currentGpsEnabled: gpsEnabled,
      willEnable: externalBackgroundTrackingEnabled && !gpsEnabled,
      willDisable: !externalBackgroundTrackingEnabled && gpsEnabled,
      timestamp: new Date().toISOString()
    })

    if (externalBackgroundTrackingEnabled && !gpsEnabled) {
      console.log('🚀 [UnifiedMap] Auto-enabling GPS from backgroundTrackingEnabled prop')
      setGpsEnabled(true)
    } else if (!externalBackgroundTrackingEnabled && gpsEnabled) {
      console.log('🛑 [UnifiedMap] Auto-disabling GPS from backgroundTrackingEnabled prop')
      setGpsEnabled(false)
    }
  }, [externalBackgroundTrackingEnabled, gpsEnabled])

  // Sync permission status from GPS service
  useEffect(() => {
    if (gpsPermissionState !== 'unknown') {
      setPermissionStatus(gpsPermissionState)
    }
  }, [gpsPermissionState])

  // Check GPS status on mount
  useEffect(() => {
    console.log('🚀 UnifiedMap Mounted - GPS Debug Info:', {
      hasGeolocation: !!navigator.geolocation,
      isSecureContext: window.isSecureContext,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      location: window.location.href
    })

    // Check initial permission
    gps.checkPermission().then(state => {
      console.log('📋 Initial GPS Permission:', state)
      setPermissionStatus(state)
    })
  }, [])

  const proximityData = useProximityDetection(trees, zones, gpsEnabled ? userPosition : null, proximityRadius)

  // Handle background tracking toggle (only when GPS is enabled)
  useEffect(() => {
    if (backgroundTrackingEnabled && gpsEnabled && farmId) {
      startTracking({
        farmId,
        options: {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000,
          distanceFilter: 10, // 10 meters minimum distance
          updateInterval: 10000 // 10 seconds minimum interval
        },
        onLocationUpdate: (location) => {
          console.log('📍 Background location update:', location)
        },
        onError: (error) => {
          console.error('📍 Background location error:', error)
          setBackgroundTrackingEnabled(false)
        }
      }).catch(error => {
        console.error('Failed to start background tracking:', error)
        setBackgroundTrackingEnabled(false)
      })
    } else if (!backgroundTrackingEnabled || !gpsEnabled) {
      stopTracking()
    }
  }, [backgroundTrackingEnabled, gpsEnabled, farmId, startTracking, stopTracking])

  // Handle real-time updates
  useEffect(() => {
    // Update local state when props change
    setTrees(initialTrees)
    setZones(initialZones)
  }, [initialTrees, initialZones])

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!enableRealTime || !isEnabled) return

    const handleTreeUpdate = (data: { treeId: string, updates: Partial<Tree> }) => {
      console.log('🔄 Real-time tree update:', data)
      setTrees(prevTrees =>
        prevTrees.map(tree =>
          tree.id === data.treeId ? { ...tree, ...data.updates } : tree
        )
      )
    }

    const handleTreeCreated = (data: Tree) => {
      console.log('🆕 Real-time tree created:', data)
      setTrees(prevTrees => [...prevTrees, data])
    }

    const handleTreeDeleted = (data: { treeId: string }) => {
      console.log('🗑️ Real-time tree deleted:', data)
      setTrees(prevTrees => prevTrees.filter(tree => tree.id !== data.treeId))
    }

    const handleZoneUpdate = (data: { zoneId: string, updates: Partial<Zone> }) => {
      console.log('🔄 Real-time zone update:', data)
      setZones(prevZones =>
        prevZones.map(zone =>
          zone.id === data.zoneId ? { ...zone, ...data.updates } : zone
        )
      )
    }

    const handleZoneCreated = (data: Zone) => {
      console.log('🆕 Real-time zone created:', data)
      setZones(prevZones => [...prevZones, data])
    }

    const handleZoneDeleted = (data: { zoneId: string }) => {
      console.log('🗑️ Real-time zone deleted:', data)
      setZones(prevZones => prevZones.filter(zone => zone.id !== data.zoneId))
    }

    const handleFarmAlert = (data: { message: string, type: string, treeId?: string, zoneId?: string }) => {
      console.log('🚨 Farm alert:', data)
      // Could show toast notification or highlight affected items
    }

    // Register event listeners
    on('tree-updated', handleTreeUpdate)
    on('tree-created', handleTreeCreated)
    on('tree-deleted', handleTreeDeleted)
    on('zone-updated', handleZoneUpdate)
    on('zone-created', handleZoneCreated)
    on('zone-deleted', handleZoneDeleted)
    on('farm-alert', handleFarmAlert)

    return () => {
      // Cleanup event listeners
      off('tree-updated', handleTreeUpdate)
      off('tree-created', handleTreeCreated)
      off('tree-deleted', handleTreeDeleted)
      off('zone-updated', handleZoneUpdate)
      off('zone-created', handleZoneCreated)
      off('zone-deleted', handleZoneDeleted)
      off('farm-alert', handleFarmAlert)
    }
  }, [enableRealTime, isEnabled, on, off])

  // Convert zones to GeoJSON
  const zonesGeoJSON = React.useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: zones.filter(zone => zone.boundaries && zone.boundaries.length >= 3).map(zone => {
      try {
        const coordinates = zone.boundaries.map(coord => [coord.longitude, coord.latitude])
        if (coordinates.length > 0) {
          const firstCoord = coordinates[0]
          const lastCoord = coordinates[coordinates.length - 1]
          if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            coordinates.push(firstCoord)
          }
        }

        return {
          type: 'Feature' as const,
          properties: {
            id: zone.id,
            name: zone.name,
            color: zone.color || '#3b82f6',
            area: zone.area || 0,
            treeCount: zone.treeCount,
            isActive: zone.isActive
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [coordinates]
          }
        }
      } catch (error) {
        console.warn('Error generating GeoJSON for zone:', zone.id, error)
        return null
      }
    }).filter(Boolean) as any[]
  }), [zones])

  // Zone styling based on proximity
  const getZoneStyle = useCallback((feature: any) => {
    const zone = proximityData.zones.find(z => z.id === feature.properties.id)
    const isCurrentZone = proximityData.currentZone?.id === feature.properties.id
    const isNearby = zone && zone.distance <= proximityRadius

    return {
      fillColor: isCurrentZone ? '#10b981' : isNearby ? '#f59e0b' : feature.properties.color,
      weight: isCurrentZone ? 4 : isNearby ? 3 : 2,
      opacity: 1,
      color: isCurrentZone ? '#10b981' : isNearby ? '#f59e0b' : feature.properties.color,
      dashArray: isCurrentZone ? '' : isNearby ? '5,5' : '3',
      fillOpacity: isCurrentZone ? 0.4 : isNearby ? 0.3 : 0.2
    }
  }, [proximityData, proximityRadius])

  // Tree marker styling - Color-based classification by treeStatus
  const getTreeMarkerIcon = useCallback((tree: Tree) => {
    const isSelected = selectedTree?.id === tree.id
    const isNearby = proximityData.trees.some(t => t.id === tree.id)
    const nearbyTree = proximityData.trees.find(t => t.id === tree.id)

    // Color classification based on treeStatus
    let color = '#22c55e' // default green for all trees
    let size = 16

    if (isSelected) {
      color = '#ef4444' // red for selected (highest priority)
      size = 24
    } else if (isNearby) {
      // Check treeStatus for nearby trees
      if (tree.treeStatus === 'Cây Non') {
        color = '#eab308' // yellow for "Cây Non"
      } else {
        color = '##147237' // green for other statuses
      }
      size = 20
    } else if (tree.needsAttention) {
      color = '#b40ca1' // amber for attention needed
      size = 18
    } else {
      // Check treeStatus for regular trees
      if (tree.treeStatus === 'Cây Non') {
        color = '#eab308' // yellow for "Cây Non"
      } else {
        color = '#147237' // green for other statuses
      }
    }

    return L.divIcon({
      className: 'tree-marker-unified',
      html: `
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: 1px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        ">
          ${nearbyTree ? Math.round(nearbyTree.distance) : ''}
        </div>
      `,
      iconSize: [size + 2, size + 2],
      iconAnchor: [(size + 2) / 2, (size + 2) / 2]
    })
  }, [selectedTree, proximityData])

  // Handle tree selection
  const handleTreeSelect = useCallback((tree: Tree) => {
    onTreeSelect?.(tree)

    if (mapRef.current && tree.latitude && tree.longitude) {
      mapRef.current.setView([tree.latitude, tree.longitude], 22)
    }
  }, [onTreeSelect])

  // User path coordinates
  const userPathCoordinates = trackingHistory.map(point => [point.lat, point.lng] as [number, number])


  // Disable custom gestures to prevent conflicts with Leaflet
  // Let Leaflet handle all map interactions natively

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ zIndex: 1 }}>
      <MapContainer
        center={mapConfig.center}
        zoom={mapConfig.zoom}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={(map) => { if (map) mapRef.current = map }}
        zoomControl={true}
        attributionControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
      >
        {/* Zoom-based layer manager for auto mode */}
        {mapLayer === 'auto' && (
          <ZoomBasedLayerManager
            mapLayer={mapLayer}
            onAutoSwitch={handleAutoSwitch}
          />
        )}

        {/* Satellite Layer (Esri World Imagery) - with smooth transition */}
        {(mapLayer === 'satellite' || activeLayer === 'hybrid') && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            maxZoom={19}
            className="satellite-layer"
          />
        )}

        {/* Street Map Layer (OpenStreetMap) - with smooth transition */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={22}
          opacity={activeLayer === 'hybrid' ? 0.4 : 1}
          className="street-layer"
        />

        {/* Drawing Controls */}
        {enableDrawing && (
          <DrawingControls
            map={mapRef.current}
            onZoneCreated={onZoneCreated}
          />
        )}

        {/* Zone Polygons */}
        {filters.showZones && (
          <GeoJSON
            data={zonesGeoJSON}
            style={getZoneStyle}
            onEachFeature={(feature, layer) => {
              layer.on('click', () => {
                const zone = zones.find(z => z.id === feature.properties.id)
                if (zone) onZoneSelect?.(zone)
              })

              layer.bindPopup(`
                <div style="min-width: 200px;">
                  <h3 style="color: ${feature.properties.color};">${feature.properties.name}</h3>
                  <div style="font-size: 14px;">
                    <p><strong>Số cây:</strong> ${feature.properties.treeCount}</p>
                    <p><strong>Diện tích:</strong> ${feature.properties.area} ha</p>
                    <p><strong>Trạng thái:</strong> ${feature.properties.isActive ? 'Hoạt động' : 'Không hoạt động'}</p>
                  </div>
                </div>
              `)
            }}
          />
        )}

        {/* Tree Markers */}
        {filters.showTrees && trees
          .filter(tree => tree.latitude && tree.longitude && tree.latitude !== 0 && tree.longitude !== 0)
          .map(tree => (
            <React.Fragment key={tree.id}>
              <Marker
                position={[tree.latitude!, tree.longitude!]}
                icon={getTreeMarkerIcon(tree)}
                eventHandlers={{
                  click: () => handleTreeSelect(tree)
                }}
              />
              {/* Highlight circle for tree navigated from showcase */}
              {highlightedTreeId === tree.id && (
                <>
                  {/* Pulsing outer circle */}
                  <Circle
                    center={[tree.latitude!, tree.longitude!]}
                    radius={3}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.2,
                      weight: 3,
                      className: 'pulsing-circle'
                    }}
                  />
                  {/* Inner solid circle */}
                  <Circle
                    center={[tree.latitude!, tree.longitude!]}
                    radius={1.5}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.4,
                      weight: 2
                    }}
                  />
                </>
              )}
            </React.Fragment>
          ))
        }

        {/* User Position and Tracking (only when GPS is enabled) */}
        {gpsEnabled && userPosition && (
          <>
            {console.log('🗺️ Rendering user position on map:', {
              position: userPosition,
              showUserPath,
              pathCoordinatesLength: userPathCoordinates.length,
              proximityRadius,
              timestamp: new Date().toISOString()
            })}

            {/* User tracking path */}
            {showUserPath && userPathCoordinates.length > 1 && (
              <Polyline
                positions={userPathCoordinates}
                pathOptions={{
                  color: '#ef4444',
                  weight: 3,
                  opacity: 0.7,
                  dashArray: '5,10'
                }}
              />
            )}

            {/* User marker */}
            <Marker
              position={[userPosition.lat, userPosition.lng]}
              icon={L.divIcon({
                className: 'user-marker-unified',
                html: `
                  <div style="
                    width: 20px;
                    height: 20px;
                    background: radial-gradient(circle, #ef4444 30%, rgba(239, 68, 68, 0.3) 70%);
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
                    animation: pulse 2s infinite;
                  "></div>
                  <style>
                    @keyframes pulse {
                      0% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); }
                      50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.8); }
                      100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); }
                    }
                  </style>
                `,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
              })}
            />

            {/* GPS Accuracy Circle */}
            <Circle
              center={[userPosition.lat, userPosition.lng]}
              radius={userPosition.accuracy}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.1,
                weight: 1
              }}
            />

            {/* Proximity Detection Circle */}
            <Circle
              center={[userPosition.lat, userPosition.lng]}
              radius={proximityRadius}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.05,
                weight: 2,
                dashArray: '10,5'
              }}
            />
          </>
        )}
      </MapContainer>


      {/* Current Zone Indicator (only when GPS is enabled) */}
      {gpsEnabled && proximityData.currentZone && (
        <div className="absolute top-4 right-4 bg-green-600 text-white rounded-lg shadow-lg p-3">
          <div className="font-bold">📍 Vùng hiện tại</div>
          <div className="text-sm">{proximityData.currentZone.name}</div>
        </div>
      )}

      {/* Nearby Items Panel (only when GPS is enabled) */}
      {gpsEnabled && (proximityData.trees.length > 0 || proximityData.zones.length > 0) && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <h3 className="font-bold text-green-600 mb-3">🔍 Vật thể gần đây</h3>

          {proximityData.trees.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-1">Cây ({proximityData.trees.length})</h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {proximityData.trees.slice(0, 3).map(tree => (
                  <div
                    key={tree.id}
                    className="flex justify-between text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                    onClick={() => handleTreeSelect(tree)}
                  >
                    <span>{tree.name || tree.variety}</span>
                    <span className="text-green-600 font-mono">{tree.distance.toFixed(1)}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {proximityData.zones.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Vùng ({proximityData.zones.length})</h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {proximityData.zones.slice(0, 3).map(zone => (
                  <div key={zone.id} className="text-xs">
                    <span className={zone.isInside ? 'text-green-600 font-semibold' : ''}>
                      {zone.name} {zone.isInside ? '(Bên trong)' : `(${zone.distance.toFixed(1)}m)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Position Info Panel (only when GPS is enabled) */}
      {gpsEnabled && userPosition && (
        <>
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 text-xs z-[1000]">
            <div className="font-bold text-green-600">📍 Vị trí</div>
            <div className="font-mono space-y-0.5">
              <div>{userPosition.lat.toFixed(6)}, {userPosition.lng.toFixed(6)}</div>
              <div className="text-gray-600">±{userPosition.accuracy.toFixed(0)}m</div>
            </div>
          </div>
        </>
      )}


    </div>
  )
})

UnifiedMap.displayName = 'UnifiedMap'

export default UnifiedMap