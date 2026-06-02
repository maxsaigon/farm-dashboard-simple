'use client'

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import Map, { Source, Layer, Marker, Popup, NavigationControl, MapRef } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import * as turf from '@turf/turf'
import { Tree } from '@/lib/types'
import { useRealTimeUpdates } from '@/lib/websocket-service'
import { useBackgroundGeolocation } from '@/lib/background-geolocation'
import { useMobileGestures, triggerHapticFeedback } from '@/lib/use-mobile-gestures'
import { useIOSOptimizedGPS, IOSGPSPosition } from '@/lib/ios-optimized-gps'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useControl } from 'react-map-gl/maplibre'

// Import MapLibre & Mapbox Draw CSS
import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

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

// Custom DrawControl wrapper for Mapbox Draw with MapLibre
interface DrawControlProps {
  onCreate?: (evt: any) => void;
  onUpdate?: (evt: any) => void;
  onDelete?: (evt: any) => void;
  drawRef?: React.MutableRefObject<MapboxDraw | null>;
}

const DrawControl = (props: DrawControlProps) => {
  const draw = useControl<any>(
    () => new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
      defaultMode: 'draw_polygon',
      styles: [
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.2
          }
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
            'line-opacity': 0.8
          }
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#ffffff',
            'circle-stroke-color': '#3b82f6',
            'circle-stroke-width': 2
          }
        }
      ]
    }),
    ({ map }: { map: any }) => {
      if (props.onCreate) map.on('draw.create', props.onCreate);
      if (props.onUpdate) map.on('draw.update', props.onUpdate);
      if (props.onDelete) map.on('draw.delete', props.onDelete);
    },
    ({ map }: { map: any }) => {
      if (props.onCreate) map.off('draw.create', props.onCreate);
      if (props.onUpdate) map.off('draw.update', props.onUpdate);
      if (props.onDelete) map.off('draw.delete', props.onDelete);
    },
    {
      position: 'top-left'
    }
  );

  useEffect(() => {
    if (props.drawRef) {
      props.drawRef.current = draw;
    }
    return () => {
      if (props.drawRef) {
        props.drawRef.current = null;
      }
    };
  }, [draw, props.drawRef]);

  return null;
};

// iOS-Optimized GPS tracking hook
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
        distanceFilter: 5,
        accuracyFilter: 25
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

// Calculate centroid of a zone
const getZoneCentroid = (zone: Zone): [number, number] => {
  try {
    const coordinates = zone.boundaries.map(coord => [coord.longitude, coord.latitude])
    if (coordinates.length > 0) {
      const firstCoord = coordinates[0]
      const lastCoord = coordinates[coordinates.length - 1]
      if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
        coordinates.push(firstCoord)
      }
    }
    const poly = turf.polygon([coordinates])
    const cent = turf.centroid(poly)
    return [cent.geometry.coordinates[0], cent.geometry.coordinates[1]]
  } catch (error) {
    if (zone.boundaries && zone.boundaries.length > 0) {
      return [zone.boundaries[0].longitude, zone.boundaries[0].latitude]
    }
    return [106.660172, 10.762622]
  }
}

// Calculate optimal center and zoom based on data
const calculateMapBounds = (trees: Tree[], zones: Zone[]) => {
  const coordinates: [number, number][] = []

  trees.forEach(tree => {
    if (tree.latitude && tree.longitude && tree.latitude !== 0 && tree.longitude !== 0) {
      coordinates.push([tree.latitude, tree.longitude])
    }
  })

  zones.forEach(zone => {
    if (zone.boundaries && zone.boundaries.length > 0) {
      zone.boundaries.forEach(boundary => {
        coordinates.push([boundary.latitude, boundary.longitude])
      })
    }
  })

  if (coordinates.length === 0) {
    return {
      center: [10.762622, 106.660172] as [number, number],
      zoom: 16
    }
  }

  const lats = coordinates.map(coord => coord[0])
  const lngs = coordinates.map(coord => coord[1])

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const centerLat = (minLat + maxLat) / 2
  const centerLng = (minLng + maxLng) / 2

  const latDiff = maxLat - minLat
  const lngDiff = maxLng - minLng
  const maxDiff = Math.max(latDiff, lngDiff)

  let zoom = 16
  if (maxDiff > 1) zoom = 12
  else if (maxDiff > 0.5) zoom = 13
  else if (maxDiff > 0.2) zoom = 14
  else if (maxDiff > 0.1) zoom = 15
  else if (maxDiff > 0.05) zoom = 16
  else zoom = 17

  return {
    center: [centerLat, centerLng] as [number, number],
    zoom: Math.min(zoom, 22)
  }
}

// Interactive Marker using Native Event Listeners to bypass MapLibre event swallowing
export const InteractiveMarker = memo(({
  tree,
  color,
  size,
  zIndex,
  distanceLabel,
  onSelect,
  isClickable = true
}: {
  tree: Tree
  color: string
  size: number
  zIndex: number
  distanceLabel: string
  onSelect: (tree: Tree) => void
  isClickable?: boolean
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !isClickable) return

    const handleNativeClick = (e: MouseEvent | TouchEvent) => {
      console.log('🌳 Native click on marker:', tree.name || tree.id)
      e.stopPropagation()
      e.preventDefault()
      onSelect(tree)
    }

    const preventBubble = (e: Event) => {
      e.stopPropagation()
    }

    // Bind click & touchstart natively
    el.addEventListener('click', handleNativeClick)
    el.addEventListener('touchstart', handleNativeClick)
    
    // Prevent map navigation triggers on mouse/pointer events
    el.addEventListener('pointerdown', preventBubble)
    el.addEventListener('mousedown', preventBubble)

    return () => {
      el.removeEventListener('click', handleNativeClick)
      el.removeEventListener('touchstart', handleNativeClick)
      el.removeEventListener('pointerdown', preventBubble)
      el.removeEventListener('mousedown', preventBubble)
    }
  }, [tree, onSelect, isClickable])

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        cursor: isClickable ? 'pointer' : 'default',
        zIndex: zIndex,
        pointerEvents: isClickable ? 'auto' : 'none',
        opacity: isClickable ? 1.0 : 0.75, // slightly faded when non-clickable
        transition: 'opacity 0.2s ease, transform 0.2s ease'
      }}
    >
      {distanceLabel}
    </div>
  )
})
InteractiveMarker.displayName = 'InteractiveMarker'

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
  const mapRef = useRef<MapRef | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const [showUserPath, setShowUserPath] = useState(externalShowUserPath)
  const [proximityRadius, setProximityRadius] = useState(externalProximityRadius)
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] = useState(false)
  const [mapLayer, setMapLayer] = useState<MapLayerType>(externalMapLayer)
  const [activeLayer, setActiveLayer] = useState<'street' | 'hybrid'>('hybrid')
  const [selectedZonePopup, setSelectedZonePopup] = useState<Zone | null>(null)
  const [cursor, setCursor] = useState<string>('auto')
  const [isZoomedIn, setIsZoomedIn] = useState<boolean>((zoom || 16) >= 18)
  
  const [filters, setFilters] = useState({
    showTrees: true,
    showZones: true
  })

  // Handle auto layer switching based on zoom
  const updateLayerForZoom = useCallback((zoomLevel: number) => {
    if (mapLayer !== 'auto') return
    if (zoomLevel >= 19) {
      setActiveLayer(prev => {
        if (prev !== 'street') {
          console.log(`🔄 Auto-switching to street (zoom: ${zoomLevel})`)
          return 'street'
        }
        return prev
      })
    } else {
      setActiveLayer(prev => {
        if (prev !== 'hybrid') {
          console.log(`🔄 Auto-switching to hybrid (zoom: ${zoomLevel})`)
          return 'hybrid'
        }
        return prev
      })
    }
  }, [mapLayer])

  const handleZoomEnd = useCallback((e: any) => {
    const currentZoom = e.target.getZoom()
    updateLayerForZoom(currentZoom)
  }, [updateLayerForZoom])

  const handleMapLoad = useCallback((e: any) => {
    const currentZoom = e.target.getZoom()
    updateLayerForZoom(currentZoom)
  }, [updateLayerForZoom])

  // Sync with external mapLayer prop
  useEffect(() => {
    setMapLayer(externalMapLayer)
  }, [externalMapLayer])


  const handleZoom = useCallback((e: any) => {
    const currentZoom = e.target.getZoom()
    const zoomedIn = currentZoom >= 18
    setIsZoomedIn(prev => (prev !== zoomedIn ? zoomedIn : prev))
  }, [])



  // Update local state when external props change
  useEffect(() => {
    setShowUserPath(externalShowUserPath)
  }, [externalShowUserPath])

  useEffect(() => {
    setProximityRadius(externalProximityRadius)
  }, [externalProximityRadius])

  useEffect(() => {
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

  // Sync isZoomedIn with mapConfig zoom changes
  useEffect(() => {
    setIsZoomedIn(mapConfig.zoom >= 18)
  }, [mapConfig.zoom])

  // Update active layer when mapLayer changes or on map configuration changes
  useEffect(() => {
    if (mapLayer !== 'auto') {
      setActiveLayer(mapLayer === 'satellite' ? 'hybrid' : mapLayer)
    } else {
      // For auto mode, perform initial check based on current map zoom or mapConfig.zoom
      const map = mapRef.current?.getMap()
      if (map) {
        updateLayerForZoom(map.getZoom())
      } else {
        updateLayerForZoom(mapConfig.zoom)
      }
    }
  }, [mapLayer, mapConfig.zoom, updateLayerForZoom])

  // GPS state management with iOS-Optimized GPS
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const { userPosition, trackingHistory, permissionState: gpsPermissionState, gps } = useIOSGPSTracking(gpsEnabled)
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown')

  // Auto-enable GPS when backgroundTrackingEnabled prop is true
  useEffect(() => {
    if (externalBackgroundTrackingEnabled && !gpsEnabled) {
      setGpsEnabled(true)
    } else if (!externalBackgroundTrackingEnabled && gpsEnabled) {
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
    gps.checkPermission().then(state => {
      setPermissionStatus(state)
    })
  }, [])

  const proximityData = useProximityDetection(trees, zones, gpsEnabled ? userPosition : null, proximityRadius)

  const centerOnUser = useCallback(() => {
    if (userPosition && mapRef.current) {
      console.log('🎯 [UnifiedMap] Centering map on user position:', userPosition)
      mapRef.current.easeTo({
        center: [userPosition.lng, userPosition.lat],
        zoom: 19,
        duration: 1000
      })
      triggerHapticFeedback()
    } else {
      console.log('🎯 [UnifiedMap] User position not available, enabling GPS')
      setGpsEnabled(true)
    }
  }, [userPosition, setGpsEnabled])

  // Handle background tracking toggle (only when GPS is enabled)
  useEffect(() => {
    if (backgroundTrackingEnabled && gpsEnabled && farmId) {
      startTracking({
        farmId,
        options: {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000,
          distanceFilter: 10,
          updateInterval: 10000
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
    setTrees(initialTrees)
    setZones(initialZones)
  }, [initialTrees, initialZones])

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!enableRealTime || !isEnabled) return

    const handleTreeUpdate = (data: { treeId: string, updates: Partial<Tree> }) => {
      setTrees(prevTrees =>
        prevTrees.map(tree =>
          tree.id === data.treeId ? { ...tree, ...data.updates } : tree
        )
      )
    }

    const handleTreeCreated = (data: Tree) => {
      setTrees(prevTrees => [...prevTrees, data])
    }

    const handleTreeDeleted = (data: { treeId: string }) => {
      setTrees(prevTrees => prevTrees.filter(tree => tree.id !== data.treeId))
    }

    const handleZoneUpdate = (data: { zoneId: string, updates: Partial<Zone> }) => {
      setZones(prevZones =>
        prevZones.map(zone =>
          zone.id === data.zoneId ? { ...zone, ...data.updates } : zone
        )
      )
    }

    const handleZoneCreated = (data: Zone) => {
      setZones(prevZones => [...prevZones, data])
    }

    const handleZoneDeleted = (data: { zoneId: string }) => {
      setZones(prevZones => prevZones.filter(zone => zone.id !== data.zoneId))
    }

    const handleFarmAlert = (data: { message: string, type: string, treeId?: string, zoneId?: string }) => {
      console.log('🚨 Farm alert:', data)
    }

    on('tree-updated', handleTreeUpdate)
    on('tree-created', handleTreeCreated)
    on('tree-deleted', handleTreeDeleted)
    on('zone-updated', handleZoneUpdate)
    on('zone-created', handleZoneCreated)
    on('zone-deleted', handleZoneDeleted)
    on('farm-alert', handleFarmAlert)

    return () => {
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

        const isCurrentZone = proximityData.currentZone?.id === zone.id
        const nearbyZone = proximityData.zones.find(z => z.id === zone.id)
        const isNearby = nearbyZone && nearbyZone.distance <= proximityRadius

        return {
          type: 'Feature' as const,
          properties: {
            id: zone.id,
            name: zone.name,
            color: isCurrentZone ? '#10b981' : isNearby ? '#f59e0b' : (zone.color || '#3b82f6'),
            borderColor: isCurrentZone ? '#10b981' : isNearby ? '#f59e0b' : (zone.color || '#3b82f6'),
            area: zone.area || 0,
            treeCount: zone.treeCount,
            isActive: zone.isActive,
            isCurrentZone,
            isNearby
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
  }), [zones, proximityData.currentZone, proximityData.zones, proximityRadius])

  // Bulk trees GeoJSON dataset
  const treesGeoJSON = React.useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: trees
      .filter(tree => tree.latitude && tree.longitude && tree.latitude !== 0 && tree.longitude !== 0)
      .map(tree => {
        // Color classification based on status/needs
        let color = '#147237' // default green
        if (tree.needsAttention) {
          color = '#b40ca1' // amber-magenta attention
        } else if (tree.treeStatus === 'Cây Non') {
          color = '#eab308' // yellow
        }

        return {
          type: 'Feature' as const,
          properties: {
            id: tree.id,
            name: tree.name,
            variety: tree.variety,
            treeStatus: tree.treeStatus,
            color
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [tree.longitude, tree.latitude]
          }
        }
      })
  }), [trees])

  // Handle tree selection
  const handleTreeSelect = useCallback((tree: Tree) => {
    onTreeSelect?.(tree)
    if (mapRef.current && tree.latitude && tree.longitude) {
      mapRef.current.easeTo({
        center: [tree.longitude, tree.latitude],
        zoom: 22,
        duration: 1000
      })
    }
  }, [onTreeSelect])

  // User path GeoJSON
  const pathGeoJSON = useMemo(() => ({
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: trackingHistory.map(point => [point.lng, point.lat])
    },
    properties: {}
  }), [trackingHistory])

  // Accuracy and Proximity Turf Circles
  const accuracyCircleGeoJSON = useMemo(() => {
    if (!userPosition) return null
    try {
      return turf.circle([userPosition.lng, userPosition.lat], userPosition.accuracy, { units: 'meters' })
    } catch (e) {
      return null
    }
  }, [userPosition])

  const proximityCircleGeoJSON = useMemo(() => {
    if (!userPosition) return null
    try {
      return turf.circle([userPosition.lng, userPosition.lat], proximityRadius, { units: 'meters' })
    } catch (e) {
      return null
    }
  }, [userPosition, proximityRadius])

  // Mouse move handler to change cursor to pointer when hovering zones
  const handleMouseMove = useCallback((e: any) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['zones-layer-fill']
    });
    setCursor(features.length > 0 ? 'pointer' : 'auto');
  }, []);

  // Handle map click events (specifically for zone selection)
  const handleMapClick = useCallback((e: any) => {
    // If drawing is enabled and active, bypass selection click
    if (drawRef.current && (drawRef.current as any).getMode() !== 'simple_select') {
      return;
    }

    const map = mapRef.current?.getMap();
    if (!map) return;

    // Query features at the clicked point for zones layer
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['zones-layer-fill']
    });

    const zoneFeature = features.find((f: any) => f.layer?.id === 'zones-layer-fill');
    if (zoneFeature) {
      const clickedZoneId = zoneFeature.properties?.id;
      const clickedZone = zones.find(z => z.id === clickedZoneId);
      console.log('🗺️ Found zone clicked in handler:', clickedZone);
      if (clickedZone) {
        onZoneSelect?.(clickedZone);
        setSelectedZonePopup(clickedZone);
        return;
      }
    }
  }, [zones, onZoneSelect]);

  // Draw created event callback
  const handleDrawCreate = useCallback((e: any) => {
    const feature = e.features[0]
    if (feature && feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0]
      const boundaries = coords.slice(0, -1).map((coord: any) => ({
        latitude: coord[1],
        longitude: coord[0]
      }))

      if (onZoneCreated) {
        onZoneCreated({ boundaries })
      }

      // Remove the temporary drawing overlay
      drawRef.current?.deleteAll()
    }
  }, [onZoneCreated])

  // Re-center when mapConfig changes or selectedTree changes
  const prevFarmIdRef = useRef<string | undefined>(farmId);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedTree && selectedTree.latitude && selectedTree.longitude) {
      map.easeTo({
        center: [selectedTree.longitude, selectedTree.latitude],
        zoom: 22,
        duration: 1000
      });
    } else {
      map.easeTo({
        center: [mapConfig.center[1], mapConfig.center[0]],
        zoom: mapConfig.zoom,
        duration: prevFarmIdRef.current !== farmId ? 0 : 1000
      });
      prevFarmIdRef.current = farmId;
    }
  }, [selectedTree, mapConfig, farmId]);

  // Selected Zone Centroid for popup positioning
  const selectedZonePopupCentroid = useMemo(() => {
    if (!selectedZonePopup) return null
    return getZoneCentroid(selectedZonePopup)
  }, [selectedZonePopup])

  // Find highlighted tree details
  const highlightedTree = useMemo(() => {
    if (!highlightedTreeId) return null
    return trees.find(t => t.id === highlightedTreeId)
  }, [trees, highlightedTreeId])

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ zIndex: 1 }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: mapConfig.center[1],
          latitude: mapConfig.center[0],
          zoom: mapConfig.zoom
        }}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
        mapLib={maplibregl}
        onZoomEnd={handleZoomEnd}
        onZoom={handleZoom}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        cursor={cursor}
        attributionControl={false}
      >
        {/* Base Map Sources */}
        {(mapLayer === 'satellite' || activeLayer === 'hybrid') && (
          <Source
            id="satellite"
            type="raster"
            tiles={["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]}
            tileSize={256}
            maxzoom={18}
          >
            <Layer
              id="satellite-layer"
              type="raster"
              beforeId={activeLayer === 'hybrid' ? 'street-layer' : undefined}
            />
          </Source>
        )}

        <Source
          id="street"
          type="raster"
          tiles={["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]}
          tileSize={256}
          maxzoom={22}
        >
          <Layer
            id="street-layer"
            type="raster"
            paint={{
              'raster-opacity': activeLayer === 'hybrid' ? 0.4 : 1.0
            }}
          />
        </Source>

        {/* Zones Layers */}
        {filters.showZones && (
          <Source id="zones" type="geojson" data={zonesGeoJSON}>
            <Layer
              id="zones-layer-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': [
                  'case',
                  ['boolean', ['get', 'isCurrentZone'], false], 0.4,
                  ['boolean', ['get', 'isNearby'], false], 0.3,
                  0.2
                ]
              }}
            />
            <Layer
              id="zones-layer-outline"
              type="line"
              paint={{
                'line-color': ['get', 'borderColor'],
                'line-width': [
                  'case',
                  ['boolean', ['get', 'isCurrentZone'], false], 4,
                  ['boolean', ['get', 'isNearby'], false], 3,
                  2
                ]
              }}
            />
          </Source>
        )}

        {/* Tree Markers Loop (DOM-based, matching Leaflet styling and click reliability) */}
        {filters.showTrees && trees
          .filter(tree => tree.latitude && tree.longitude && tree.latitude !== 0 && tree.longitude !== 0)
          .map(tree => {
            const isSelected = selectedTree?.id === tree.id
            const isNearby = proximityData.trees.some(t => t.id === tree.id)
            const nearbyTree = proximityData.trees.find(t => t.id === tree.id)

            // Color classification based on status/needs
            let color = '#22c55e' // default green for all trees
            let size = 16

            if (isSelected) {
              color = '#ef4444' // red for selected
              size = 24
            } else if (isNearby) {
              if (tree.treeStatus === 'Cây Non' || tree.treeStatus === 'Young Tree') {
                color = '#eab308' // yellow for "Cây Non"
              } else {
                color = '#147237' // dark green
              }
              size = 20
            } else if (tree.needsAttention) {
              color = '#b40ca1' // amber-magenta attention
              size = 18
            } else {
              if (tree.treeStatus === 'Cây Non' || tree.treeStatus === 'Young Tree') {
                color = '#eab308' // yellow for "Cây Non"
              } else {
                color = '#147237' // dark green
              }
            }

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
                  zIndex={isSelected ? 15 : isNearby ? 12 : 10}
                  distanceLabel={nearbyTree ? String(Math.round(nearbyTree.distance)) : ''}
                  onSelect={handleTreeSelect}
                  isClickable={isZoomedIn}
                />
              </Marker>
            )
          })}

        {/* Pulsing circle highlight for selected tree */}
        {highlightedTree && highlightedTree.latitude && highlightedTree.longitude && (
          <Marker
            longitude={highlightedTree.longitude}
            latitude={highlightedTree.latitude}
            anchor="center"
          >
            <div className="relative flex items-center justify-center" style={{ width: 40, height: 40 }}>
              <div className="absolute w-8 h-8 rounded-full bg-red-500 opacity-25 animate-ping" />
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md" />
            </div>
          </Marker>
        )}

        {/* User Breadcrumb Trail */}
        {gpsEnabled && showUserPath && trackingHistory.length > 1 && (
          <Source id="user-path" type="geojson" data={pathGeoJSON}>
            <Layer
              id="user-path-layer"
              type="line"
              paint={{
                'line-color': '#ef4444',
                'line-width': 3,
                'line-opacity': 0.7,
                'line-dasharray': [2, 4]
              }}
            />
          </Source>
        )}

        {/* GPS Accuracy Circle */}
        {gpsEnabled && accuracyCircleGeoJSON && (
          <Source id="accuracy-circle" type="geojson" data={accuracyCircleGeoJSON}>
            <Layer
              id="accuracy-circle-layer"
              type="fill"
              paint={{
                'fill-color': '#ef4444',
                'fill-opacity': 0.1
              }}
            />
            <Layer
              id="accuracy-circle-line"
              type="line"
              paint={{
                'line-color': '#ef4444',
                'line-width': 1
              }}
            />
          </Source>
        )}

        {/* Proximity Circle */}
        {gpsEnabled && proximityCircleGeoJSON && (
          <Source id="proximity-circle" type="geojson" data={proximityCircleGeoJSON}>
            <Layer
              id="proximity-circle-layer"
              type="fill"
              paint={{
                'fill-color': '#10b981',
                'fill-opacity': 0.05
              }}
            />
            <Layer
              id="proximity-circle-line"
              type="line"
              paint={{
                'line-color': '#10b981',
                'line-width': 2,
                'line-dasharray': [5, 2]
              }}
            />
          </Source>
        )}

        {/* User Location Pulsing Dot */}
        {gpsEnabled && userPosition && (
          <Marker
            longitude={userPosition.lng}
            latitude={userPosition.lat}
            anchor="center"
          >
            <div style={{
              width: 20,
              height: 20,
              background: 'radial-gradient(circle, #3b82f6 30%, rgba(59, 130, 246, 0.3) 70%)',
              borderRadius: '50%',
              border: '3px solid white',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.6)',
              animation: 'pulse-blue 2s infinite'
            }} />
            <style>{`
              @keyframes pulse-blue {
                0% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); }
                50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.8); }
                100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.6); }
              }
            `}</style>
          </Marker>
        )}

        {/* Mapbox Draw Control integration */}
        {enableDrawing && (
          <DrawControl
            drawRef={drawRef}
            onCreate={handleDrawCreate}
            onUpdate={handleDrawCreate}
          />
        )}

        {/* Default zoom and compass controls removed for cleaner mobile-first layout */}

        {/* Zone Detail Popup */}
        {selectedZonePopup && selectedZonePopupCentroid && (
          <Popup
            longitude={selectedZonePopupCentroid[0]}
            latitude={selectedZonePopupCentroid[1]}
            anchor="bottom"
            onClose={() => setSelectedZonePopup(null)}
            closeOnClick={false}
          >
            <div className="p-2 min-w-[200px] text-gray-800">
              <h3 className="font-bold text-base mb-1" style={{ color: selectedZonePopup.color || '#3b82f6' }}>
                {selectedZonePopup.name}
              </h3>
              <div className="text-xs space-y-0.5">
                <p><strong>Số cây:</strong> {selectedZonePopup.treeCount}</p>
                <p><strong>Diện tích:</strong> {selectedZonePopup.area} ha</p>
                <p><strong>Trạng thái:</strong> {selectedZonePopup.isActive ? 'Hoạt động' : 'Không hoạt động'}</p>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Current Zone Indicator (only when GPS is enabled) */}
      {gpsEnabled && proximityData.currentZone && (
        <div className="absolute top-[132px] lg:top-4 right-3 lg:right-4 bg-green-600/90 backdrop-blur-sm text-white rounded-xl shadow-md p-2.5 z-[10] text-xs font-semibold">
          <div className="font-bold flex items-center">
            <span className="mr-1">📍</span> Vùng hiện tại
          </div>
          <div className="text-[11px] opacity-90">{proximityData.currentZone.name}</div>
        </div>
      )}

      {/* Nearby Items Panel (only when GPS is enabled) */}
      {gpsEnabled && (proximityData.trees.length > 0 || proximityData.zones.length > 0) && (
        <div className="absolute bottom-[124px] lg:bottom-16 left-3 lg:left-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 max-w-[280px] z-[10] text-gray-800 border border-gray-100">
          <h3 className="font-bold text-green-600 mb-2.5 text-xs flex items-center">
            <span className="mr-1">🔍</span> Vật thể gần đây
          </h3>

          {proximityData.trees.length > 0 && (
            <div className="mb-2.5">
              <h4 className="font-semibold text-[11px] text-gray-500 mb-1">Cây ({proximityData.trees.length})</h4>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {proximityData.trees.slice(0, 3).map(tree => (
                  <div
                    key={tree.id}
                    className="flex justify-between text-[11px] cursor-pointer hover:bg-gray-50 p-1 rounded"
                    onClick={() => handleTreeSelect(tree)}
                  >
                    <span className="truncate max-w-[150px]">{tree.name || tree.variety}</span>
                    <span className="text-green-600 font-mono font-semibold">{tree.distance.toFixed(1)}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {proximityData.zones.length > 0 && (
            <div>
              <h4 className="font-semibold text-[11px] text-gray-500 mb-1">Vùng ({proximityData.zones.length})</h4>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {proximityData.zones.slice(0, 3).map(zone => (
                  <div key={zone.id} className="text-[11px] truncate">
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
        <div className="absolute bottom-[72px] lg:bottom-4 left-3 lg:left-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-2 text-[9px] z-[10] text-gray-800 border border-gray-100">
          <div className="font-bold text-green-600 flex items-center">
            <span className="mr-0.5">📍</span> Vị trí GPS
          </div>
          <div className="font-mono text-gray-600 mt-0.5">
            <div>{userPosition.lat.toFixed(6)}, {userPosition.lng.toFixed(6)}</div>
            <div>Sai số: ±{userPosition.accuracy.toFixed(0)}m</div>
          </div>
        </div>
      )}

      {/* Locate Me (Center on User) Floating Button */}
      <button
        onClick={centerOnUser}
        className="absolute bottom-[calc(76px+env(safe-area-inset-bottom))] lg:bottom-6 right-3 lg:right-4 z-10 w-11 h-11 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 active:scale-90 active:bg-gray-100 hover:text-green-600 transition-all"
        title="Định vị vị trí của tôi"
      >
        <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 0V3m0 18v-5M3 12h5m13 0h-5" />
        </svg>
      </button>
    </div>
  )
})

UnifiedMap.displayName = 'UnifiedMap'

export default UnifiedMap