'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Tree } from '@/lib/types'

interface Zone {
  id: string
  name: string
  description?: string
  color: string
  boundaries: Array<{ latitude: number; longitude: number }> // FIXED: Use correct field names from Firebase
  soilType?: string
  drainageLevel?: 'poor' | 'fair' | 'good' | 'excellent'
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
  center = [10.762622, 106.660172], // Default to Ho Chi Minh City area
  zoom = 16,
  className = ''
}: OpenStreetMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup())
  const zonesRef = useRef<L.LayerGroup>(new L.LayerGroup())

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    // Initialize map
    if (!mapRef.current) {
      try {
        // Ensure container has dimensions before creating map
        const container = mapContainerRef.current
        if (container.clientWidth === 0 || container.clientHeight === 0) {
          console.log('⏳ Container not ready, retrying after delay...')
          setTimeout(() => {
            if (mapContainerRef.current && !mapRef.current) {
              console.log('⏳ Retry: Container dimensions:', mapContainerRef.current.clientWidth, 'x', mapContainerRef.current.clientHeight)
              // Trigger re-run of this effect
              mapContainerRef.current.style.minHeight = '400px'
            }
          }, 100)
          return
        }

        console.log('🗺️ Initializing Leaflet map with dimensions:', container.clientWidth, 'x', container.clientHeight)

        const map = L.map(container, {
          center: center,
          zoom: zoom,
          scrollWheelZoom: true,
          touchZoom: true,
          doubleClickZoom: true,
          boxZoom: false,
          keyboard: true,
          zoomControl: true,
          preferCanvas: false, // Changed to false to avoid canvas issues
          renderer: L.svg() // Use SVG renderer explicitly
        })

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map)

        mapRef.current = map
        zonesRef.current.addTo(map)
        markersRef.current.addTo(map)

        // Invalidate size after a short delay to fix positioning issues
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
          console.log('🧹 Cleaning up Leaflet map')
          
          // Clear layer groups first
          if (markersRef.current) {
            markersRef.current.clearLayers()
            markersRef.current.remove()
          }
          if (zonesRef.current) {
            zonesRef.current.clearLayers()
            zonesRef.current.remove()
          }
          
          // Remove map
          mapRef.current.remove()
          mapRef.current = null
          
          console.log('🧹 Map cleanup complete')
        } catch (error) {
          console.error('Error cleaning up Leaflet map:', error)
        }
      }
    }
  }, [center, zoom])

  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !zonesRef.current) return

    console.log('🗺️ MAP UPDATE: Processing', trees.length, 'trees and', zones.length, 'zones')

    // Clear existing markers and zones
    markersRef.current.clearLayers()
    zonesRef.current.clearLayers()

    // Add zone polygons first (so they appear behind markers)
    console.log('🔷 Processing zones for map:', zones.length)
    zones.forEach(zone => {
      console.log('Processing zone:', zone.id, 'boundaries:', zone.boundaries?.length || 0)
      if (zone.boundaries && zone.boundaries.length > 0) {
        try {
          // Handle different coordinate formats
          console.log('Processing boundaries for zone:', zone.id, 'raw boundaries:', zone.boundaries)
          
          const latLngs = zone.boundaries.map((point, index) => {
            console.log(`Processing boundary point ${index}:`, point)
            
            // Handle {latitude, longitude} format FIRST (this is the correct format!)
            if (typeof point === 'object' && point !== null && 'latitude' in point && 'longitude' in point) {
              const lat = Number(point.latitude)
              const lng = Number(point.longitude)
              if (!isNaN(lat) && !isNaN(lng)) {
                console.log(`✅ Point ${index}: {latitude: ${lat}, longitude: ${lng}}`)
                return [lat, lng] as [number, number]
              }
            }
            
            // Handle {lat, lng} format (fallback)
            if (typeof point === 'object' && point !== null && 'lat' in point && 'lng' in point) {
              const lat = Number(point.lat)
              const lng = Number(point.lng)
              if (!isNaN(lat) && !isNaN(lng)) {
                console.log(`✅ Point ${index}: {lat: ${lat}, lng: ${lng}}`)
                return [lat, lng] as [number, number]
              }
            }
            
            // Handle [lat, lng] array format
            if (Array.isArray(point) && point.length >= 2) {
              const lat = Number(point[0])
              const lng = Number(point[1])
              if (!isNaN(lat) && !isNaN(lng)) {
                console.log(`Point ${index}: [${lat}, ${lng}]`)
                return [lat, lng] as [number, number]
              }
            }
            
            console.warn('Invalid coordinate format at index', index, ':', point)
            return null
          }).filter(coord => coord !== null) as [number, number][]
          
          console.log('Processed coordinates for zone', zone.id, ':', latLngs)
          
          if (latLngs.length < 3) {
            console.warn('Zone has insufficient valid coordinates:', zone.id, 'got', latLngs.length, 'need at least 3')
            // Show as marker instead for debugging
            if (latLngs.length > 0) {
              const centerLat = latLngs.reduce((sum, coord) => sum + coord[0], 0) / latLngs.length
              const centerLng = latLngs.reduce((sum, coord) => sum + coord[1], 0) / latLngs.length
              
              const marker = L.marker([centerLat, centerLng], {
                icon: L.divIcon({
                  className: 'zone-marker-debug',
                  html: `<div style="background: ${zone.color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${zone.name} (${latLngs.length})</div>`,
                  iconSize: [80, 20],
                  iconAnchor: [40, 10]
                })
              })
              
              marker.bindPopup(`<div><strong>${zone.name}</strong><br/>Insufficient coordinates: ${latLngs.length}/3</div>`)
              zonesRef.current.addLayer(marker)
            }
            return
          }
        
        const polygon = L.polygon(latLngs, {
          color: zone.color,
          weight: 2,
          opacity: 0.8,
          fillColor: zone.color,
          fillOpacity: zone.isActive ? 0.2 : 0.1
        })

        // Create popup content for zone
        const zonePopupContent = `
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: ${zone.color}; font-size: 14px;">
              ${zone.name}
            </h3>
            <div style="font-size: 12px; color: #666;">
              ${zone.description ? `<p style="margin: 4px 0;">${zone.description}</p>` : ''}
              <p style="margin: 4px 0;"><strong>Số cây:</strong> ${zone.treeCount}</p>
              <p style="margin: 4px 0;"><strong>Diện tích:</strong> ${zone.area} ha</p>
              <p style="margin: 4px 0;"><strong>Loại đất:</strong> ${zone.soilType}</p>
              <p style="margin: 4px 0;"><strong>Thoát nước:</strong> ${zone.drainageLevel}</p>
              <p style="margin: 4px 0;"><strong>Trạng thái:</strong> 
                <span style="color: ${zone.isActive ? '#16a34a' : '#ef4444'};">
                  ${zone.isActive ? 'Hoạt động' : 'Không hoạt động'}
                </span>
              </p>
            </div>
            ${onZoneSelect ? '<div style="margin-top: 8px;"><button onclick="selectZone(\'' + zone.id + '\')" style="background: ' + zone.color + '; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Xem chi tiết</button></div>' : ''}
          </div>
        `

        polygon.bindPopup(zonePopupContent, {
          maxWidth: 250,
          closeButton: true
        })

        // Handle zone click
        polygon.on('click', (e) => {
          try {
            console.log('🔷 Zone polygon clicked:', zone.id, zone.name)
            if (onZoneSelect && zone) {
              onZoneSelect(zone)
            }
          } catch (error) {
            console.error('🔷 Error in zone click handler:', error)
            console.error('🔷 Zone data:', zone)
          }
          e.originalEvent?.stopPropagation?.()
        })

        console.log('Successfully created polygon for zone:', zone.id, 'adding to map')
        zonesRef.current.addLayer(polygon)
        console.log('Zone polygon added to layer group:', zone.id)
        
        } catch (error) {
          console.error('Error processing zone polygon:', zone.id, error)
          console.error('Error details:', error)
        }
      } else {
        console.log('🔸 Zone has no valid boundaries, showing as fallback marker:', zone.id)
        
        // Create a fallback marker for zones without boundaries
        // Use a default position (center of Vietnam) or try to derive from farm location
        const defaultLat = 10.762622 // Ho Chi Minh City area default
        const defaultLng = 106.660172
        
        // Try to get center from zone data or use default
        let markerLat = defaultLat
        let markerLng = defaultLng
        
        if (zone.boundaries && zone.boundaries.length > 0) {
          // Try to compute center from invalid boundaries - FIXED: prioritize latitude/longitude
          const validCoords = zone.boundaries.filter(p => p && p.latitude && p.longitude)
          if (validCoords.length > 0) {
            const firstCoord = validCoords[0]
            markerLat = firstCoord.latitude || defaultLat
            markerLng = firstCoord.longitude || defaultLng
          }
        }
        
        console.log(`🔸 Creating fallback marker for zone ${zone.id} at [${markerLat}, ${markerLng}]`)
        
        const marker = L.marker([markerLat, markerLng], {
          icon: L.divIcon({
            className: 'zone-marker-fallback',
            html: `<div style="background: ${zone.color}; color: white; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${zone.name}</div>`,
            iconSize: [80, 24],
            iconAnchor: [40, 12]
          })
        })
        
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: ${zone.color}; font-size: 14px;">${zone.name}</h3>
            <div style="font-size: 12px; color: #666;">
              <p style="margin: 4px 0;"><strong>Trạng thái:</strong> Thiếu tọa độ biên giới</p>
              <p style="margin: 4px 0;"><strong>Số cây:</strong> ${zone.treeCount || 0}</p>
              <p style="margin: 4px 0;"><strong>Diện tích:</strong> ${zone.area || 0} ha</p>
            </div>
          </div>
        `)
        
        // Handle zone click
        marker.on('click', (e) => {
          try {
            console.log('🔸 Fallback zone marker clicked:', zone.id, zone.name)
            if (onZoneSelect && zone) {
              onZoneSelect(zone)
            }
          } catch (error) {
            console.error('🔸 Error in fallback zone click handler:', error)
            console.error('🔸 Zone data:', zone)
          }
          e.originalEvent?.stopPropagation?.()
        })
        
        zonesRef.current.addLayer(marker)
        console.log('🔸 Fallback zone marker added:', zone.id)
      }
    })

    // Create custom icons
    const createTreeIcon = (tree: Tree) => {
      const color = getTreeColor(tree)
      return L.divIcon({
        className: 'custom-tree-marker',
        html: `
          <div style="
            width: 24px; 
            height: 24px; 
            background-color: ${color}; 
            border: 2px solid white; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 12px;
            color: white;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            🌳
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
    }

    // Add tree markers
    trees.forEach(tree => {
      // Handle both data structures: tree.location.lat/lng and tree.latitude/longitude
      const lat = (tree as any).location?.latitude || (tree as any).latitude
      const lng = (tree as any).location?.longitude || (tree as any).longitude
      
      if (lat && lng && lat !== 0 && lng !== 0) {
        const marker = L.marker([lat, lng], { icon: createTreeIcon(tree) })

        // Create popup content
        const popupContent = `
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #16a34a; font-size: 14px;">
              ${tree.name || `Cây ${tree.qrCode || tree.id.slice(0, 8)}`}
            </h3>
            <div style="font-size: 12px; color: #666;">
              <p style="margin: 4px 0;"><strong>Giống:</strong> ${tree.variety || 'Không xác định'}</p>
              <p style="margin: 4px 0;"><strong>Khu vực:</strong> ${tree.zoneCode || 'N/A'}</p>
              <p style="margin: 4px 0;"><strong>Sức khỏe:</strong> 
                <span style="color: ${getHealthColor(tree.healthStatus)};">
                  ${tree.healthStatus || 'Chưa đánh giá'}
                </span>
              </p>
              <p style="margin: 4px 0;"><strong>Trái:</strong> ${((tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)).toLocaleString()}</p>
              <p style="margin: 4px 0;"><strong>Ngày trồng:</strong> ${formatDate(tree.plantingDate)}</p>
            </div>
            ${onTreeSelect ? '<div style="margin-top: 8px;"><button onclick="selectTree(\'' + tree.id + '\')" style="background: #16a34a; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Xem chi tiết</button></div>' : ''}
          </div>
        `

        marker.bindPopup(popupContent, {
          maxWidth: 250,
          closeButton: true
        })

        // Handle marker click
        marker.on('click', () => {
          if (onTreeSelect) {
            onTreeSelect(tree)
          }
        })

        markersRef.current.addLayer(marker)
      }
    })

    // Fit map to show all markers and zones
    console.log('🗺️ Calculating map bounds for', trees.length, 'trees and', zones.length, 'zones')
    if (trees.length > 0 || zones.length > 0) {
      const group = new L.FeatureGroup()
      
      // Add tree markers to bounds
      let treesAdded = 0
      trees.forEach(tree => {
        const lat = (tree as any).location?.latitude || (tree as any).latitude
        const lng = (tree as any).location?.longitude || (tree as any).longitude
        
        if (lat && lng && lat !== 0 && lng !== 0) {
          group.addLayer(L.marker([lat, lng]))
          treesAdded++
        }
      })
      
      // Add zone polygons and markers to bounds
      let zonesAdded = 0
      zones.forEach(zone => {
        if (zone.boundaries && zone.boundaries.length >= 3) {
          try {
            const validLatLngs = zone.boundaries
              .map(point => {
                if (point && point.latitude && point.longitude) {
                  return [point.latitude, point.longitude] as [number, number]
                }
                return null
              })
              .filter(coord => coord !== null) as [number, number][]
            
            if (validLatLngs.length >= 3) {
              group.addLayer(L.polygon(validLatLngs))
              zonesAdded++
            }
          } catch (error) {
            console.warn('Error adding zone to bounds:', zone.id, error)
          }
        } else if (zone.boundaries && zone.boundaries.length > 0) {
          // Add fallback marker position to bounds - FIXED: prioritize latitude/longitude
          const validCoords = zone.boundaries.filter(p => p && p.latitude && p.longitude)
          if (validCoords.length > 0) {
            const firstCoord = validCoords[0]
            const lat = firstCoord.latitude
            const lng = firstCoord.longitude
            if (lat && lng) {
              group.addLayer(L.marker([lat, lng]))
              zonesAdded++
            }
          }
        }
      })
      
      console.log('🗺️ Added to bounds:', treesAdded, 'trees,', zonesAdded, 'zones')
      
      if (group.getLayers().length > 0) {
        console.log('🗺️ Fitting map to bounds')
        mapRef.current.fitBounds(group.getBounds(), { padding: [20, 20] })
      } else {
        console.log('🗺️ No valid coordinates found, using default center')
        mapRef.current.setView(center, zoom)
      }
    }
  }, [trees, zones, onTreeSelect, onZoneSelect])

  // Highlight selected tree
  useEffect(() => {
    if (!mapRef.current || !selectedTree) return
    
    const lat = (selectedTree as any).location?.latitude || (selectedTree as any).latitude
    const lng = (selectedTree as any).location?.longitude || (selectedTree as any).longitude
    
    if (lat && lng && lat !== 0 && lng !== 0) {
      mapRef.current.setView([lat, lng], 18)
    }
  }, [selectedTree])

  // Highlight selected zone
  useEffect(() => {
    if (!mapRef.current || !selectedZone) return
    
    if (selectedZone.boundaries && selectedZone.boundaries.length > 0) {
      try {
        // Handle both latitude/longitude and lat/lng formats
        const latLngs = selectedZone.boundaries
          .map(point => {
            const lat = point.latitude
            const lng = point.longitude
            
            // Validate coordinates
            if (typeof lat !== 'number' || typeof lng !== 'number' || 
                isNaN(lat) || isNaN(lng) || 
                Math.abs(lat) > 90 || Math.abs(lng) > 180) {
              console.warn('Invalid coordinates:', point)
              return null
            }
            
            return [lat, lng] as [number, number]
          })
          .filter(Boolean) as [number, number][]
        
        if (latLngs.length >= 3) {
          const polygon = L.polygon(latLngs)
          const bounds = polygon.getBounds()
          
          // Validate bounds before fitting
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [20, 20] })
          } else {
            console.warn('Invalid bounds for zone:', selectedZone.name, bounds)
          }
        } else {
          console.warn('Not enough valid coordinates for zone:', selectedZone.name, latLngs.length)
        }
      } catch (error) {
        console.error('Error fitting bounds for selected zone:', error, selectedZone)
      }
    }
  }, [selectedZone])

  const getTreeColor = (tree: Tree) => {
    if (tree.needsAttention) return '#ef4444' // red
    switch (tree.healthStatus) {
      case 'Excellent': return '#16a34a' // green
      case 'Good': return '#3b82f6' // blue  
      case 'Fair': return '#f59e0b' // yellow
      case 'Poor': return '#ef4444' // red
      default: return '#6b7280' // gray
    }
  }

  const getHealthColor = (status?: string) => {
    switch (status) {
      case 'Excellent': return '#16a34a'
      case 'Good': return '#3b82f6'
      case 'Fair': return '#f59e0b' 
      case 'Poor': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const formatDate = (date?: Date | null) => {
    if (!date) return 'N/A'
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    }).format(date)
  }

  // Add global functions for popup buttons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).selectTree = (treeId: string) => {
        const tree = trees.find(t => t.id === treeId)
        if (tree && onTreeSelect) {
          onTreeSelect(tree)
        }
      }
      
      (window as any).selectZone = (zoneId: string) => {
        try {
          console.log('🔷 Global selectZone called for:', zoneId)
          const zone = zones.find(z => z.id === zoneId)
          if (zone && onZoneSelect) {
            console.log('🔷 Zone found and calling onZoneSelect:', zone.name)
            onZoneSelect(zone)
          } else {
            console.log('🔷 Zone not found or no onZoneSelect:', { zone: !!zone, onZoneSelect: !!onZoneSelect })
          }
        } catch (error) {
          console.error('🔷 Error in global selectZone:', error)
        }
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).selectTree
        delete (window as any).selectZone
      }
    }
  }, [trees, zones, onTreeSelect, onZoneSelect])

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapContainerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-[1000]">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Chú thích</h4>
        <div className="space-y-2">
          {trees.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Cây trồng</div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-3 h-3 bg-green-600 rounded-full border border-white"></div>
                  <span>Xuất sắc</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-3 h-3 bg-blue-600 rounded-full border border-white"></div>
                  <span>Tốt</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full border border-white"></div>
                  <span>Trung bình</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-3 h-3 bg-red-600 rounded-full border border-white"></div>
                  <span>Yếu/Cần chú ý</span>
                </div>
              </div>
            </div>
          )}
          
          {zones.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Khu vực</div>
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-3 h-3 border-2 border-gray-400 bg-gray-200 bg-opacity-30"></div>
                <span>Polygon khu vực</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-white p-2 rounded-lg shadow-lg border border-gray-200 z-[1000]">
        <div className="text-xs text-gray-600 space-y-1">
          <div>{trees.length} cây trên bản đồ</div>
          {zones.length > 0 && <div>{zones.length} khu vực</div>}
        </div>
      </div>
    </div>
  )
}