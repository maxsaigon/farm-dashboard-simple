'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Circle, ImageOverlay, Polyline } from 'react-leaflet'
import L from 'leaflet'
import * as turf from '@turf/turf'
import { Tree } from '@/lib/types'

// Zone interface for vector map
interface Zone {
  id: string
  name: string
  code?: string
  description?: string
  color?: string
  coordinates: Array<{ lat: number; lng: number }>
  area?: number
  treeCount?: number
  isActive?: boolean
  createdAt?: Date
}

// Pure Vector-based Custom Farm Map (No OSM dependency)
interface CustomFarmVectorMapProps {
  trees: Tree[]
  zones: Zone[]
  farmBounds: [[number, number], [number, number]] // [[minLat, minLng], [maxLat, maxLng]]
  farmImageUrl?: string // Optional farm satellite/drone image
  onTreeSelect?: (tree: Tree) => void
  onZoneSelect?: (zone: Zone) => void
  coordinateSystem?: 'geographic' | 'custom' // lat/lng vs custom x,y
  customOrigin?: { lat: number, lng: number } // For custom coordinate calibration
}

// Hook for coordinate system conversion (custom x,y to lat/lng)
const useCoordinateSystem = (
  coordinateSystem: 'geographic' | 'custom',
  customOrigin?: { lat: number, lng: number }
) => {
  const convertToLatLng = (x: number, y: number) => {
    if (coordinateSystem === 'geographic') {
      return { lat: x, lng: y }
    }
    
    // Custom coordinate system - convert meters to lat/lng offset
    if (customOrigin) {
      // Rough conversion: 1 degree ≈ 111,000 meters
      const latOffset = y / 111000
      const lngOffset = x / (111000 * Math.cos(customOrigin.lat * Math.PI / 180))
      
      return {
        lat: customOrigin.lat + latOffset,
        lng: customOrigin.lng + lngOffset
      }
    }
    
    return { lat: x, lng: y }
  }

  return { convertToLatLng }
}

// Real-time positioning with enhanced accuracy
const useEnhancedPositioning = () => {
  const [userPosition, setUserPosition] = useState<{
    lat: number
    lng: number
    accuracy: number
    heading?: number
    speed?: number
  } | null>(null)
  const [trackingHistory, setTrackingHistory] = useState<Array<{lat: number, lng: number, timestamp: number}>>([])

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined
        }
        
        setUserPosition(newPos)
        
        // Keep tracking history (last 50 points for path visualization)
        setTrackingHistory(prev => 
          [...prev, { 
            lat: newPos.lat, 
            lng: newPos.lng, 
            timestamp: Date.now() 
          }].slice(-50)
        )
      },
      (error) => console.error('Enhanced positioning error:', error),
      {
        enableHighAccuracy: true,
        timeout: 3000,
        maximumAge: 500 // Very fresh data for real-time tracking
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return { userPosition, trackingHistory }
}

// Advanced proximity detection with zones
const useAdvancedProximity = (
  trees: Tree[],
  zones: Zone[],
  userPosition: { lat: number, lng: number } | null,
  radius: number
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
    const zoneProximity = zones.filter(zone => zone.coordinates && zone.coordinates.length >= 3).map(zone => {
      try {
        // Ensure polygon is closed (first and last coordinates must be the same)
        const coordinates = zone.coordinates.map(coord => [coord.lng, coord.lat])
        if (coordinates.length > 0) {
          const firstCoord = coordinates[0]
          const lastCoord = coordinates[coordinates.length - 1]
          if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            coordinates.push(firstCoord) // Close the polygon
          }
        }
        
        const zonePolygon = turf.polygon([coordinates])
        const isInside = turf.booleanPointInPolygon(userPoint, zonePolygon)
        
        // Calculate distance to zone (use centroid for simplicity)
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

// Main Custom Farm Vector Map Component
export default function CustomFarmVectorMap({
  trees,
  zones,
  farmBounds,
  farmImageUrl,
  onTreeSelect,
  onZoneSelect,
  coordinateSystem = 'geographic',
  customOrigin
}: CustomFarmVectorMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null)
  const [showUserPath, setShowUserPath] = useState(false)
  const [proximityRadius, setProximityRadius] = useState(30)
  const [showBaseMap, setShowBaseMap] = useState(true)

  // Debug logging to see what data reaches the vector map
  console.log('🎯 CustomFarmVectorMap received:', {
    treesCount: trees.length,
    zonesCount: zones.length,
    farmBounds,
    trees: trees.slice(0, 3), // Show first 3 trees
    zones: zones.slice(0, 3)   // Show first 3 zones
  })

  // Add test data when no real data is available
  const testTrees: Tree[] = trees.length === 0 ? [
    {
      id: 'test-tree-1',
      farmId: 'test-farm',
      latitude: 10.762,
      longitude: 106.660,
      name: 'Test Tree 1',
      variety: 'Sầu riêng',
      treeStatus: 'Mature',
      healthStatus: 'Good',
      manualFruitCount: 5,
      aiFruitCount: 7,
      needsAttention: false
    },
    {
      id: 'test-tree-2', 
      farmId: 'test-farm',
      latitude: 10.7622,
      longitude: 106.6602,
      name: 'Test Tree 2',
      variety: 'Sầu riêng',
      treeStatus: 'Young Tree',
      healthStatus: 'Excellent',
      manualFruitCount: 3,
      aiFruitCount: 4,
      needsAttention: true
    }
  ] : trees

  const testZones: Zone[] = zones.length === 0 ? [
    {
      id: 'test-zone-1',
      name: 'Test Zone A',
      color: '#3B82F6',
      coordinates: [
        { lat: 10.7615, lng: 106.6595 },
        { lat: 10.7625, lng: 106.6595 },
        { lat: 10.7625, lng: 106.6605 },
        { lat: 10.7615, lng: 106.6605 },
        { lat: 10.7615, lng: 106.6595 } // Close the polygon
      ]
    }
  ] : zones

  console.log('🧪 Using data (test + real):', {
    treesCount: testTrees.length,
    zonesCount: testZones.length
  })
  
  // Enhanced positioning and coordinate conversion
  const { userPosition, trackingHistory } = useEnhancedPositioning()
  const { convertToLatLng } = useCoordinateSystem(coordinateSystem, customOrigin)
  const proximityData = useAdvancedProximity(testTrees, testZones, userPosition, proximityRadius)

  // Convert zones to GeoJSON with enhanced properties
  const zonesGeoJSON = {
    type: 'FeatureCollection' as const,
    features: testZones.filter(zone => zone.coordinates && zone.coordinates.length >= 3).map(zone => {
      try {
        // Ensure polygon is closed (first and last coordinates must be the same)
        const coordinates = zone.coordinates.map(coord => [coord.lng, coord.lat])
        if (coordinates.length > 0) {
          const firstCoord = coordinates[0]
          const lastCoord = coordinates[coordinates.length - 1]
          if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            coordinates.push(firstCoord) // Close the polygon
          }
        }

        return {
          type: 'Feature' as const,
          properties: {
            id: zone.id,
            name: zone.name,
            color: zone.color || '#3B82F6',
            area: zone.area || 0,
            treeCount: testTrees.filter(tree =>
              (tree.zoneName || tree.zoneCode) === zone.code || (tree.zoneName || tree.zoneCode) === zone.name
            ).length
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
  }

  // Enhanced zone styling based on user proximity
  const getZoneStyle = (feature: any) => {
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
  }

  // Enhanced tree marker styling
  const getTreeMarkerIcon = (tree: Tree) => {
    const isSelected = selectedTree?.id === tree.id
    const isNearby = proximityData.trees.some(t => t.id === tree.id)
    const nearbyTree = proximityData.trees.find(t => t.id === tree.id)
    
    let color = '#6b7280' // default gray
    let size = 16
    
    if (isSelected) {
      color = '#ef4444' // red for selected
      size = 24
    } else if (isNearby) {
      color = '#10b981' // green for nearby
      size = 20
    } else if (tree.needsAttention) {
      color = '#f59e0b' // amber for attention needed
      size = 18
    }

    return L.divIcon({
      className: 'tree-marker-custom',
      html: `
        <div style="
          background-color: ${color}; 
          width: ${size}px; 
          height: ${size}px; 
          border-radius: 50%; 
          border: 3px solid white; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        ">
          ${nearbyTree ? Math.round(nearbyTree.distance) : '🌳'}
        </div>
      `,
      iconSize: [size + 6, size + 6],
      iconAnchor: [(size + 6) / 2, (size + 6) / 2]
    })
  }

  // Handle tree selection
  const handleTreeSelect = (tree: Tree) => {
    setSelectedTree(tree)
    onTreeSelect?.(tree)
    
    if (mapRef.current && tree.latitude && tree.longitude) {
      // Access the Leaflet map instance from react-leaflet
      const leafletMap = (mapRef.current as any)._leaflet_map || mapRef.current
      if (leafletMap && leafletMap.setView) {
        leafletMap.setView([tree.latitude, tree.longitude], 19)
      }
    }
  }

  // User path coordinates for visualization
  const userPathCoordinates = trackingHistory.map(point => [point.lat, point.lng] as [number, number])

  return (
    <div className="relative w-full h-full overflow-hidden">
      <MapContainer
        center={[
          (farmBounds[0][0] + farmBounds[1][0]) / 2,
          (farmBounds[0][1] + farmBounds[1][1]) / 2
        ]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        crs={coordinateSystem === 'custom' ? L.CRS.Simple : L.CRS.EPSG3857}
        ref={(map) => { if (map) mapRef.current = map }}
        zoomControl={true}
        attributionControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        bounds={farmBounds}
        boundsOptions={{ padding: [20, 20] }}
      >
        {/* Base Map Layer for Geographic Context */}
        {showBaseMap && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            opacity={0.7}
          />
        )}

        {/* Optional Farm Image Overlay */}
        {farmImageUrl && (
          <ImageOverlay
            url={farmImageUrl}
            bounds={farmBounds}
            opacity={0.8}
          />
        )}

        {/* Vector Zone Rendering */}
        <GeoJSON
          data={zonesGeoJSON}
          style={getZoneStyle}
          onEachFeature={(feature, layer) => {
            layer.on('click', () => {
              const zone = testZones.find(z => z.id === feature.properties.id)
              if (zone) onZoneSelect?.(zone)
            })
            
            layer.bindPopup(`
              <div class="p-3">
                <h3 class="font-bold text-lg">${feature.properties.name}</h3>
                <div class="text-sm space-y-1">
                  <p>Area: ${feature.properties.area || 'N/A'} ha</p>
                  <p>Trees: ${feature.properties.treeCount}</p>
                  <p class="text-xs text-gray-500">ID: ${feature.properties.id}</p>
                </div>
              </div>
            `)
          }}
        />

        {/* Enhanced Tree Markers */}
        {testTrees
          .filter(tree => tree.latitude && tree.longitude)
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

        {/* User Position with Enhanced Visualization */}
        {userPosition && (
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

            {/* User marker with direction indicator */}
            <Marker
              position={[userPosition.lat, userPosition.lng]}
              icon={L.divIcon({
                className: 'user-marker-enhanced',
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

      {/* Enhanced Control Panel */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 space-y-3">
        <h3 className="font-bold text-gray-800">Vector Farm Map</h3>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showBaseMap}
              onChange={(e) => setShowBaseMap(e.target.checked)}
              className="rounded"
            />
            <span>Show base map</span>
          </label>

          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showUserPath}
              onChange={(e) => setShowUserPath(e.target.checked)}
              className="rounded"
            />
            <span>Show tracking path</span>
          </label>
          
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Proximity radius: {proximityRadius}m</label>
            <input
              type="range"
              min="10"
              max="100"
              value={proximityRadius}
              onChange={(e) => setProximityRadius(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Current Zone Indicator */}
      {proximityData.currentZone && (
        <div className="absolute top-4 right-4 bg-green-600 text-white rounded-lg shadow-lg p-3">
          <div className="font-bold">📍 Current Zone</div>
          <div className="text-sm">{proximityData.currentZone.name}</div>
        </div>
      )}

      {/* Nearby Items Panel */}
      {(proximityData.trees.length > 0 || proximityData.zones.length > 0) && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <h3 className="font-bold text-green-600 mb-3">🔍 Nearby Items</h3>
          
          {proximityData.trees.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-1">Trees ({proximityData.trees.length})</h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {proximityData.trees.slice(0, 3).map(tree => (
                  <div
                    key={tree.id}
                    className="flex justify-between text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                    onClick={() => handleTreeSelect(tree)}
                  >
                    <span>{tree.name}</span>
                    <span className="text-green-600 font-mono">{tree.distance.toFixed(1)}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {proximityData.zones.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Zones ({proximityData.zones.length})</h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {proximityData.zones.slice(0, 3).map(zone => (
                  <div key={zone.id} className="text-xs">
                    <span className={zone.isInside ? 'text-green-600 font-semibold' : ''}>
                      {zone.name} {zone.isInside ? '(Inside)' : `(${zone.distance.toFixed(1)}m)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Position Info Panel */}
      {userPosition && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
          <div className="font-bold text-red-600">📍 Position</div>
          <div className="font-mono text-xs space-y-1">
            <div>{userPosition.lat.toFixed(6)}, {userPosition.lng.toFixed(6)}</div>
            <div>±{userPosition.accuracy.toFixed(0)}m</div>
            {userPosition.speed && <div>Speed: {(userPosition.speed * 3.6).toFixed(1)} km/h</div>}
            {userPosition.heading && <div>Heading: {userPosition.heading.toFixed(0)}°</div>}
          </div>
        </div>
      )}
    </div>
  )
}