'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Circle, useMap } from 'react-leaflet'
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

// Vector MAP Enhancement for existing farm map
interface VectorEnhancedMapProps {
  trees: Tree[]
  zones: Zone[]
  onTreeSelect?: (tree: Tree) => void
  onZoneSelect?: (zone: Zone) => void
  showUserLocation?: boolean
  enableTreeProximity?: boolean
  proximityRadius?: number // meters
}

// Custom hook for real-time user tracking (like robot vacuum)
const useRealTimeLocation = (enabled: boolean) => {
  const [userPosition, setUserPosition] = useState<{lat: number, lng: number, accuracy: number} | null>(null)
  const [watchId, setWatchId] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setUserPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (error) => console.error('Location tracking error:', error),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 1000, // Update every second like robot vacuum
      }
    )

    setWatchId(id)

    return () => {
      if (id) navigator.geolocation.clearWatch(id)
    }
  }, [enabled])

  return userPosition
}

// Component for proximity-based tree highlighting
const TreeProximityLayer: React.FC<{
  trees: Tree[]
  userPosition: {lat: number, lng: number} | null
  radius: number
  onNearbyTreesChange: (trees: Tree[]) => void
}> = ({ trees, userPosition, radius, onNearbyTreesChange }) => {
  
  useEffect(() => {
    if (!userPosition || !trees.length) {
      onNearbyTreesChange([])
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

    onNearbyTreesChange(nearbyTrees)
  }, [userPosition, trees, radius, onNearbyTreesChange])

  return null
}

// Convert zones to GeoJSON for vector rendering
const zonesToGeoJSON = (zones: Zone[]) => {
  return {
    type: 'FeatureCollection' as const,
    features: zones.map(zone => ({
      type: 'Feature' as const,
      properties: {
        id: zone.id,
        name: zone.name,
        color: zone.color || '#3B82F6'
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [zone.coordinates.map(coord => [coord.lng, coord.lat])]
      }
    }))
  }
}

// Main Vector Enhanced Map Component
export default function VectorEnhancedMap({
  trees,
  zones,
  onTreeSelect,
  onZoneSelect,
  showUserLocation = true,
  enableTreeProximity = true,
  proximityRadius = 50
}: VectorEnhancedMapProps) {
  const [nearbyTrees, setNearbyTrees] = useState<Tree[]>([])
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  
  // Real-time user location tracking
  const userPosition = useRealTimeLocation(showUserLocation)
  
  // Convert zones to GeoJSON for vector rendering
  const zonesGeoJSON = zonesToGeoJSON(zones)

  // Handle tree selection with proximity feedback
  const handleTreeSelect = (tree: Tree) => {
    setSelectedTree(tree)
    onTreeSelect?.(tree)
    
    // Pan to tree location
    if (mapRef.current && tree.latitude && tree.longitude) {
      mapRef.current.setView([tree.latitude, tree.longitude], 18)
    }
  }

  // Style function for zones (vector-based styling)
  const getZoneStyle = (feature: any) => {
    return {
      fillColor: feature.properties.color,
      weight: 2,
      opacity: 1,
      color: feature.properties.color,
      dashArray: '3',
      fillOpacity: 0.2
    }
  }

  // Get marker color based on proximity and selection
  const getTreeMarkerColor = (tree: Tree) => {
    if (selectedTree?.id === tree.id) return 'red'
    if (nearbyTrees.some(t => t.id === tree.id)) return 'green'
    return 'blue'
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[10.762622, 106.660172]} // Default center
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        ref={(map) => { if (map) mapRef.current = map }}
      >
        {/* OSM Base Layer (can be removed for pure vector approach) */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Vector-based Zone Rendering */}
        <GeoJSON
          data={zonesGeoJSON}
          style={getZoneStyle}
          onEachFeature={(feature, layer) => {
            layer.on('click', () => {
              const zone = zones.find(z => z.id === feature.properties.id)
              if (zone) onZoneSelect?.(zone)
            })
            
            layer.bindPopup(`
              <div class="p-2">
                <h3 class="font-bold">${feature.properties.name}</h3>
                <p class="text-sm">Zone ID: ${feature.properties.id}</p>
              </div>
            `)
          }}
        />

        {/* Tree Markers with Proximity Enhancement */}
        {trees
          .filter(tree => tree.latitude && tree.longitude)
          .map(tree => (
            <Marker
              key={tree.id}
              position={[tree.latitude!, tree.longitude!]}
              icon={L.divIcon({
                className: 'tree-marker',
                html: `<div style="background-color: ${getTreeMarkerColor(tree)}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}
              eventHandlers={{
                click: () => handleTreeSelect(tree)
              }}
            />
          ))
        }

        {/* User Location with Accuracy Circle */}
        {userPosition && showUserLocation && (
          <>
            <Marker
              position={[userPosition.lat, userPosition.lng]}
              icon={L.divIcon({
                className: 'user-marker',
                html: '<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              })}
            />
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
            
            {/* Proximity Circle */}
            {enableTreeProximity && (
              <Circle
                center={[userPosition.lat, userPosition.lng]}
                radius={proximityRadius}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.05,
                  weight: 2,
                  dashArray: '5,5'
                }}
              />
            )}
          </>
        )}

        {/* Proximity Detection Component */}
        <TreeProximityLayer
          trees={trees}
          userPosition={userPosition}
          radius={proximityRadius}
          onNearbyTreesChange={setNearbyTrees}
        />
      </MapContainer>

      {/* Nearby Trees Panel (Robot Vacuum Style) */}
      {nearbyTrees.length > 0 && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="font-bold text-green-600 mb-2">
            🌳 Nearby Trees ({nearbyTrees.length})
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {nearbyTrees.slice(0, 5).map(tree => (
              <div
                key={tree.id}
                className="flex justify-between items-center text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                onClick={() => handleTreeSelect(tree)}
              >
                <span>{tree.name || 'Unnamed Tree'}</span>
                <span className="text-green-600 font-mono">
                  Nearby
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Position Info */}
      {userPosition && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
          <div className="font-bold text-red-600">📍 Your Location</div>
          <div className="font-mono text-xs">
            {userPosition.lat.toFixed(6)}, {userPosition.lng.toFixed(6)}
          </div>
          <div className="text-gray-500 text-xs">
            Accuracy: ±{userPosition.accuracy.toFixed(0)}m
          </div>
        </div>
      )}
    </div>
  )
}