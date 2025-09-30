'use client'

import React, { useState, useEffect, useRef, useCallback, memo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Circle, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import * as turf from '@turf/turf'
import { Tree } from '@/lib/types'
import { useRealTimeUpdates } from '@/lib/websocket-service'
import { useBackgroundGeolocation } from '@/lib/background-geolocation'
import { useMobileGestures, triggerHapticFeedback } from '@/lib/use-mobile-gestures'

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
}

// Optimized GPS tracking with configurable frequency
const useOptimizedPositioning = (enabled: boolean = true, updateInterval: number = 2000) => {
  const [userPosition, setUserPosition] = useState<{
    lat: number
    lng: number
    accuracy: number
    heading?: number
    speed?: number
    timestamp: number
  } | null>(null)
  const [trackingHistory, setTrackingHistory] = useState<Array<{lat: number, lng: number, timestamp: number}>>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) return

    const updatePosition = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: Date.now()
          }

          setUserPosition(newPos)

          // Keep tracking history (last 20 points for path visualization)
          setTrackingHistory(prev =>
            [...prev, {
              lat: newPos.lat,
              lng: newPos.lng,
              timestamp: newPos.timestamp
            }].slice(-20)
          )
        },
        (error) => console.warn('GPS positioning error:', error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: updateInterval
        }
      )
    }

    // Initial position
    updatePosition()

    // Set up interval for updates
    intervalRef.current = setInterval(updatePosition, updateInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, updateInterval])

  return { userPosition, trackingHistory }
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
  proximityRadius: externalProximityRadius = 30
}: UnifiedMapProps) => {
  const mapRef = useRef<L.Map | null>(null)
  const [showUserPath, setShowUserPath] = useState(externalShowUserPath)
  const [proximityRadius, setProximityRadius] = useState(externalProximityRadius)
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] = useState(false)
  const [filters, setFilters] = useState({
    showTrees: true,
    showZones: true
  })

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

  // GPS state management
  const [gpsEnabled, setGpsEnabled] = useState(false)

  // Optimized positioning (only when GPS is enabled)
  const { userPosition, trackingHistory } = useOptimizedPositioning(gpsEnabled, 2000)
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

  // Tree marker styling based on tree status and other conditions
  const getTreeMarkerIcon = useCallback((tree: Tree) => {
    const isSelected = selectedTree?.id === tree.id
    const isNearby = proximityData.trees.some(t => t.id === tree.id)
    const nearbyTree = proximityData.trees.find(t => t.id === tree.id)

    // Base color based on tree status (support both English and Vietnamese)
    let baseColor = '#6b7280' // default gray

    if (tree.treeStatus === 'Young Tree' || tree.treeStatus === 'Cây Non') {
      baseColor = '#eab308' // yellow for young trees
    } else if (tree.treeStatus === 'Mature' || tree.treeStatus === 'Cây Trưởng Thành') {
      baseColor = '#22c55e' // normal green for mature trees
    } else if (tree.treeStatus === 'Old' || tree.treeStatus === 'Cây Già') {
      baseColor = '#16a34a' // darker green for old trees
    }

    // Override colors for special states
    let color = baseColor
    let size = 16

    if (isSelected) {
      color = '#ef4444' // red for selected (highest priority)
      size = 24
    } else if (isNearby) {
      // Keep the base color but make it slightly brighter for nearby trees
      color = baseColor
      size = 20
    } else if (tree.needsAttention) {
      color = '#8b5cf6' // purple for attention needed (overrides base color)
      size = 18
    }

    // Create status indicator emoji
    let statusEmoji = '🌳'
    if (tree.treeStatus === 'Young Tree' || tree.treeStatus === 'Cây Non') {
      statusEmoji = '🌱'
    } else if (tree.treeStatus === 'Mature' || tree.treeStatus === 'Cây Trưởng Thành') {
      statusEmoji = '🌳'
    } else if (tree.treeStatus === 'Old' || tree.treeStatus === 'Cây Già') {
      statusEmoji = '🌲'
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
          ${nearbyTree ? Math.round(nearbyTree.distance) : statusEmoji}
        </div>
      `,
      iconSize: [size + 6, size + 6],
      iconAnchor: [(size + 6) / 2, (size + 6) / 2]
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
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={22}
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
            <Marker
              key={tree.id}
              position={[tree.latitude!, tree.longitude!]}
              icon={getTreeMarkerIcon(tree)}
              eventHandlers={{
                click: () => handleTreeSelect(tree)
              }}
            />
          ))
        }

        {/* User Position and Tracking (only when GPS is enabled) */}
        {gpsEnabled && userPosition && (
          <>
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


      {/* Map Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setGpsEnabled(!gpsEnabled)}
            className={`p-2 rounded-md transition-colors ${
              gpsEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={gpsEnabled ? 'Tắt GPS' : 'Bật GPS'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-xs text-gray-600">
            {gpsEnabled ? 'GPS ON' : 'GPS OFF'}
          </span>
        </div>

        {/* Show user path toggle (only when GPS is enabled) */}
        {gpsEnabled && (
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showUserPath}
              onChange={(e) => setShowUserPath(e.target.checked)}
              className="rounded"
            />
            <span>Hiển thị đường đi</span>
          </label>
        )}

        {/* Proximity radius slider (only when GPS is enabled) */}
        {gpsEnabled && (
          <div className="space-y-1">
            <label className="text-xs text-gray-600">
              Bán kính phát hiện: {proximityRadius}m
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={proximityRadius}
              onChange={(e) => setProximityRadius(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>

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
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
          <div className="font-bold text-red-600">📍 Vị trí</div>
          <div className="font-mono text-xs space-y-1">
            <div>{userPosition.lat.toFixed(6)}, {userPosition.lng.toFixed(6)}</div>
            <div>±{userPosition.accuracy.toFixed(0)}m</div>
            {userPosition.speed && <div>Tốc độ: {(userPosition.speed * 3.6).toFixed(1)} km/h</div>}
          </div>
        </div>
      )}
    </div>
  )
})

UnifiedMap.displayName = 'UnifiedMap'

export default UnifiedMap