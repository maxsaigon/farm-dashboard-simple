'use client'

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Tree } from '@/lib/types'

interface Zone {
  id: string
  name: string
  description?: string
  color: string
  boundaries: Array<{ latitude: number; longitude: number }>
  treeCount: number
  area: number
  isActive: boolean
  createdAt: Date
}

// Fix for missing marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface OpenStreetMapProps {
  trees: Tree[]
  zones?: Zone[]
  selectedTree?: Tree | null
  selectedZone?: Zone | null
  onTreeSelect?: (tree: Tree) => void
  onZoneSelect?: (zone: Zone) => void
  center?: [number, number]
  zoom?: number
  className?: string
}

export function OpenStreetMap({
  trees = [],
  zones = [],
  selectedTree,
  selectedZone,
  onTreeSelect,
  onZoneSelect,
  center = [10.762622, 106.660172],
  zoom = 16,
  className = ''
}: OpenStreetMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup())
  const zonesRef = useRef<L.LayerGroup>(new L.LayerGroup())

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    if (!mapRef.current) {
      try {
        const container = mapContainerRef.current
        if (container.clientWidth === 0 || container.clientHeight === 0) {
          setTimeout(() => {
            if (mapContainerRef.current && !mapRef.current) {
              mapContainerRef.current.style.minHeight = '400px'
            }
          }, 100)
          return
        }

        const map = L.map(container, {
          center: center,
          zoom: zoom,
          scrollWheelZoom: true,
          touchZoom: true,
          doubleClickZoom: true,
          boxZoom: false,
          keyboard: true,
          zoomControl: true,
          preferCanvas: false,
          renderer: L.svg()
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map)

        mapRef.current = map
        zonesRef.current.addTo(map)
        markersRef.current.addTo(map)

        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize()
          }
        }, 100)
      } catch (error) {
        console.error('Error initializing Leaflet map:', error)
      }
    }

    return () => {
      if (mapRef.current) {
        try {
          if (markersRef.current) {
            markersRef.current.clearLayers()
            markersRef.current.remove()
          }
          if (zonesRef.current) {
            zonesRef.current.clearLayers()
            zonesRef.current.remove()
          }
          mapRef.current.remove()
          mapRef.current = null
        } catch (error) {
          console.error('Error cleaning up Leaflet map:', error)
        }
      }
    }
  }, [center, zoom])

  // Update map with trees and zones
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !zonesRef.current) return

    console.log('🗺️ MAP UPDATE: Processing', trees.length, 'trees and', zones.length, 'zones')

    markersRef.current.clearLayers()
    zonesRef.current.clearLayers()

    // Add zones
    zones.forEach(zone => {
      if (zone.boundaries && zone.boundaries.length >= 3) {
        try {
          const latLngs = zone.boundaries
            .map(point => {
              if (point && point.latitude && point.longitude) {
                const lat = Number(point.latitude)
                const lng = Number(point.longitude)
                if (!isNaN(lat) && !isNaN(lng)) {
                  return [lat, lng] as [number, number]
                }
              }
              return null
            })
            .filter(coord => coord !== null) as [number, number][]

          if (latLngs.length >= 3) {
            const polygon = L.polygon(latLngs, {
              color: zone.color,
              weight: 2,
              opacity: 0.8,
              fillColor: zone.color,
              fillOpacity: zone.isActive ? 0.2 : 0.1
            })

            polygon.bindPopup(`
              <div style="min-width: 200px;">
                <h3 style="color: ${zone.color};">${zone.name}</h3>
                <p><strong>Số cây:</strong> ${zone.treeCount}</p>
                <p><strong>Diện tích:</strong> ${zone.area} ha</p>
              </div>
            `)

            polygon.on('click', () => {
              if (onZoneSelect) onZoneSelect(zone)
            })

            zonesRef.current.addLayer(polygon)
          }
        } catch (error) {
          console.error('Error processing zone:', zone.id, error)
        }
      }
    })

    // Add trees
    trees.forEach(tree => {
      const lat = (tree as any).location?.latitude || (tree as any).latitude
      const lng = (tree as any).location?.longitude || (tree as any).longitude
      
      if (lat && lng && lat !== 0 && lng !== 0) {
        const color = tree.needsAttention ? '#ef4444' : '#16a34a'
        
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'custom-tree-marker',
            html: `
              <div style="
                width: 24px; height: 24px; 
                background-color: ${color}; 
                border: 2px solid white; 
                border-radius: 50%; 
                display: flex; align-items: center; justify-content: center;
                font-size: 12px; color: white; font-weight: bold;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">🌳</div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
        })

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="color: #16a34a;">${tree.variety || 'Sầu riêng'}</h3>
            ${tree.name ? `<p>${tree.name}</p>` : ''}
            <p><strong>Sức khỏe:</strong> ${tree.healthStatus || 'Tốt'}</p>
            <p><strong>Số trái:</strong> ${(tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)}</p>
          </div>
        `)

        marker.on('click', () => {
          if (onTreeSelect) onTreeSelect(tree)
        })

        markersRef.current.addLayer(marker)
      }
    })

    // Fit map to show all content
    if (trees.length > 0 || zones.length > 0) {
      const group = new L.FeatureGroup()
      
      trees.forEach(tree => {
        const lat = (tree as any).location?.latitude || (tree as any).latitude
        const lng = (tree as any).location?.longitude || (tree as any).longitude
        if (lat && lng && lat !== 0 && lng !== 0) {
          group.addLayer(L.marker([lat, lng]))
        }
      })
      
      zones.forEach(zone => {
        if (zone.boundaries && zone.boundaries.length >= 3) {
          const latLngs = zone.boundaries
            .map(point => point && point.latitude && point.longitude ? 
              [point.latitude, point.longitude] as [number, number] : null)
            .filter(Boolean) as [number, number][]
          
          if (latLngs.length >= 3) {
            group.addLayer(L.polygon(latLngs))
          }
        }
      })
      
      if (group.getLayers().length > 0) {
        mapRef.current.fitBounds(group.getBounds(), { padding: [20, 20] })
      }
    }
  }, [trees, zones, onTreeSelect, onZoneSelect])


  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapContainerRef}
        className="w-full h-full rounded-lg overflow-hidden z-[1]"
        style={{ minHeight: '400px' }}
      />
    </div>
  )
}