'use client'

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Tree } from '@/lib/types'
// Note: TreeImagePreview import removed as it was unused

interface Zone {
  id: string
  name: string
  description?: string
  color: string
  boundaries: Array<{ latitude: number; longitude: number }> // FIXED: Use correct field names from Firebase
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
  onFullscreenFocus?: () => void
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
  onFullscreenFocus,
  center = [10.762622, 106.660172], // Default to Ho Chi Minh City area
  zoom = 16,
  className = ''
}: OpenStreetMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup())
  const zonesRef = useRef<L.LayerGroup>(new L.LayerGroup())
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Track fullscreen changes - Enhanced for mobile
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Check for all possible fullscreen states across browsers
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      
      setIsFullscreen(isCurrentlyFullscreen)
      console.log('📱 Fullscreen state changed:', isCurrentlyFullscreen)
      
      // Safely invalidate map size when entering/exiting fullscreen
      if (mapRef.current) {
        setTimeout(() => {
          try {
            if (mapRef.current && mapContainerRef.current && mapContainerRef.current.offsetWidth > 0) {
              mapRef.current.invalidateSize({ animate: false, pan: false })
              console.log('📱 Map size invalidated after fullscreen change')
            }
          } catch (error) {
            console.warn('📱 Map invalidation error (safe to ignore):', (error as Error).message)
          }
        }, 150)
      }
    }

    // Listen to all possible fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [])

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

        // Create a unique popup container for React rendering
        const popupId = `tree-popup-${tree.id}`
        
        // Create optimized popup content with better mobile design
        const popupContent = `
          <div id="${popupId}" style="min-width: 280px; max-width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <!-- Thumbnail will be inserted here by React -->
            <div id="${popupId}-thumbnail" style="width: 100%; height: 120px; background: #f3f4f6; border-radius: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; border: 2px solid #e5e7eb;">
              <svg style="width: 32px; height: 32px; color: #9ca3af;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <!-- Simplified, farmer-friendly content -->
            <div style="text-align: center; margin-bottom: 12px;">
              <h3 style="margin: 0; color: #16a34a; font-size: 18px; font-weight: 600;">
                ${tree.variety || 'Sầu riêng'}
              </h3>
              ${tree.name ? `<p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px;">${tree.name}</p>` : ''}
            </div>
            
            <!-- Key information in cards -->
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <div style="flex: 1; background: ${getHealthColor(tree.healthStatus)}15; padding: 8px; border-radius: 6px; text-align: center;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">SỨC KHỎE</div>
                <div style="font-size: 14px; font-weight: 600; color: ${getHealthColor(tree.healthStatus)};">
                  ${getHealthStatusVietnamese(tree.healthStatus)}
                </div>
              </div>
              <div style="flex: 1; background: #16a34a15; padding: 8px; border-radius: 6px; text-align: center;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">SỐ TRÁI</div>
                <div style="font-size: 14px; font-weight: 600; color: #16a34a;">
                  ${((tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)).toLocaleString()}
                </div>
              </div>
            </div>
            
            <!-- Large, touch-friendly button -->
            ${onTreeSelect ? `
            <button 
              id="${popupId}-button"
              onclick="selectTree('${tree.id}')"
              style="
                width: 100%;
                background: linear-gradient(135deg, #16a34a, #15803d);
                color: white;
                border: none;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              "
              onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(22, 163, 74, 0.3)'"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(22, 163, 74, 0.2)'"
              ontouchstart="this.style.transform='scale(0.98)'"
              ontouchend="this.style.transform='scale(1)'"
            >
              <svg style="width: 20px; height: 20px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Xem chi tiết
            </button>
            ` : ''}
          </div>
        `

        marker.bindPopup(popupContent, {
          maxWidth: 320,
          closeButton: true,
          className: 'custom-tree-popup'
        })
        
        // Handle popup open event to render React thumbnail component
        marker.on('popupopen', () => {
          // Small delay to ensure DOM is ready
          setTimeout(async () => {
            const thumbnailContainer = document.getElementById(`${popupId}-thumbnail`)
            if (thumbnailContainer) {
              try {
                // Try to load tree image directly using the storage service
                const { getTreeImages } = await import('@/lib/storage')
                const effectiveFarmId = tree.farmId && tree.farmId !== 'default' ? tree.farmId : 'F210C3FC-F191-4926-9C15-58D6550A716A'
                
                // Try multiple approaches to get the image
                let imageUrl = null
                
                // First try: Direct tree ID
                try {
                  const images = await getTreeImages(tree.id, effectiveFarmId)
                  if (images.length > 0) {
                    imageUrl = images[0]
                  }
                } catch (error) {
                  console.warn('Failed to load image with tree ID:', error)
                }
                
                // Second try: QR Code if available
                if (!imageUrl && tree.qrCode) {
                  try {
                    const images = await getTreeImages(tree.qrCode, effectiveFarmId)
                    if (images.length > 0) {
                      imageUrl = images[0]
                    }
                  } catch (error) {
                    console.warn('Failed to load image with QR code:', error)
                  }
                }
                
                // Update the thumbnail container
                if (imageUrl) {
                  thumbnailContainer.innerHTML = `
                    <img 
                      src="${imageUrl}" 
                      alt="Tree image" 
                      style="
                        width: 100%; 
                        height: 100%; 
                        object-fit: cover; 
                        border-radius: 8px;
                        transition: opacity 0.3s ease;
                      "
                      loading="lazy"
                      onerror="this.parentElement.innerHTML = '\\
                        <div style=\\'display: flex; align-items: center; justify-content: center; color: #9ca3af;\\'>\\
                          <svg style=\\'width: 32px; height: 32px;\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'currentColor\\'>\\
                            <path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'1.5\\' d=\\'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z\\' />\\
                          </svg>\\
                        </div>'"
                    />
                  `
                } else {
                  // No image found - show placeholder
                  thumbnailContainer.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; color: #9ca3af;">
                      <svg style="width: 32px; height: 32px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  `
                }
              } catch (error) {
                console.warn('Error loading tree image for popup:', error)
                // Fallback to placeholder
                thumbnailContainer.innerHTML = `
                  <div style="display: flex; align-items: center; justify-content: center; color: #9ca3af;">
                    <svg style="width: 32px; height: 32px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                `
              }
            }
          }, 100)
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
  
  const getHealthStatusVietnamese = (status?: string) => {
    switch (status) {
      case 'Excellent': return 'Tuyệt vời'
      case 'Good': return 'Tốt' 
      case 'Fair': return 'Khá'
      case 'Poor': return 'Yếu'
      default: return 'Chưa đánh giá'
    }
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
      
      {/* Fullscreen Button - Farmer-Friendly */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={async () => {
            // Target the outermost container element (the one with relative class)
            const mapElement = mapContainerRef.current
            const parentElement = mapElement?.parentElement
            
            if (!mapElement || !parentElement) {
              console.warn('Map container elements not found for fullscreen')
              return
            }
            
            console.log('🖥️ Fullscreen button clicked')
            console.log('🖥️ Map element:', mapElement)
            console.log('🖥️ Parent element:', parentElement)
            
            // Ensure the fullscreen element has proper styling before fullscreen
            parentElement.style.backgroundColor = '#ffffff'
            parentElement.style.position = 'relative'
            parentElement.style.width = '100%'
            parentElement.style.height = '100%'

            // Detect mobile devices
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
            
            console.log('📱 Device detection - Mobile:', isMobile, 'iOS:', isIOS, 'Safari:', isSafari)

            try {
              // Check all possible fullscreen states
              const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement
              )
              
              if (!isCurrentlyFullscreen) {
                // Show loading indicator
                const button = document.activeElement as HTMLButtonElement
                if (button) {
                  button.style.backgroundColor = '#f3f4f6'
                  button.innerHTML = `
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                  `
                }

                // Enter fullscreen mode with mobile-specific handling
                const enterFullscreen = async () => {
                  console.log('🖥️ Attempting to enter fullscreen on element:', parentElement)
                  
                  // iOS Safari and mobile Chrome specific handling
                  if (isIOS || isMobile) {
                    console.log('📱 Using mobile fullscreen approach')
                    
                    // For iOS Safari, try webkit methods first
                    if ((parentElement as any).webkitRequestFullscreen) {
                      console.log('📱 Using webkitRequestFullscreen')
                      return await (parentElement as any).webkitRequestFullscreen()
                    }
                    
                    // Alternative webkit method for older iOS
                    if ((parentElement as any).webkitRequestFullScreen) {
                      console.log('📱 Using webkitRequestFullScreen (legacy)')
                      return await (parentElement as any).webkitRequestFullScreen()
                    }
                  }
                  
                  // Standard and fallback methods
                  if (parentElement.requestFullscreen) {
                    console.log('🖥️ Using standard requestFullscreen')
                    return await parentElement.requestFullscreen()
                  } else if ((parentElement as any).webkitRequestFullscreen) {
                    console.log('🖥️ Using webkitRequestFullscreen')
                    return await (parentElement as any).webkitRequestFullscreen()
                  } else if ((parentElement as any).webkitRequestFullScreen) {
                    console.log('🖥️ Using webkitRequestFullScreen')
                    return await (parentElement as any).webkitRequestFullScreen()
                  } else if ((parentElement as any).msRequestFullscreen) {
                    console.log('🖥️ Using msRequestFullscreen')
                    return await (parentElement as any).msRequestFullscreen()
                  } else if ((parentElement as any).mozRequestFullScreen) {
                    console.log('🖥️ Using mozRequestFullScreen')
                    return await (parentElement as any).mozRequestFullScreen()
                  } else {
                    console.error('📱 No fullscreen method available')
                    throw new Error('Fullscreen not supported on this device/browser')
                  }
                }

                await enterFullscreen()
                console.log('🖥️ Fullscreen request completed')
                
                // After entering fullscreen, ensure proper map display
                setTimeout(() => {
                  console.log('🖥️ Fullscreen entered, setting up map...')
                  
                  // Ensure parent element fills the screen properly
                  if (parentElement) {
                    parentElement.style.width = '100vw'
                    parentElement.style.height = '100vh'
                    parentElement.style.backgroundColor = '#ffffff'
                    console.log('🖥️ Parent element styled for fullscreen')
                  }
                  
                  // Ensure map element fills the parent
                  if (mapElement) {
                    mapElement.style.width = '100%'
                    mapElement.style.height = '100%'
                    mapElement.style.borderRadius = '0'
                    console.log('🖥️ Map element styled for fullscreen')
                  }
                  
                  // First, ensure trees and zones are visible by calling the callback
                  if (onFullscreenFocus) {
                    console.log('🎯 Calling onFullscreenFocus to ensure visibility')
                    onFullscreenFocus()
                  }
                  
                  // Small delay to let the callback update the state
                  setTimeout(() => {
                    if (mapRef.current) {
                      console.log('🎯 Fullscreen activated, refreshing map...')
                      
                      // Safely force multiple map invalidations to ensure proper display
                      try {
                        if (mapContainerRef.current && mapContainerRef.current.offsetWidth > 0) {
                          mapRef.current.invalidateSize({ animate: false, pan: false })
                          console.log('🗺️ Map size invalidated for fullscreen (initial)')
                        }
                      } catch (error) {
                        console.warn('🗺️ Initial map invalidation error (safe to ignore):', (error as Error).message)
                      }
                      
                      setTimeout(() => {
                        if (mapRef.current && mapContainerRef.current && mapContainerRef.current.offsetWidth > 0) {
                          try {
                            mapRef.current.invalidateSize({ animate: true, pan: false })
                            console.log('🗺️ Map size invalidated for fullscreen (animated)')
                          } catch (error) {
                            console.warn('🗺️ Animated map invalidation error (safe to ignore):', (error as Error).message)
                          }
                        }
                      }, 200)
                      
                      setTimeout(() => {
                        if (mapRef.current && mapContainerRef.current && mapContainerRef.current.offsetWidth > 0) {
                          try {
                            mapRef.current.invalidateSize({ animate: false, pan: false })
                            console.log('🗺️ Final map size invalidation')
                          } catch (error) {
                            console.warn('🗺️ Final map invalidation error (safe to ignore):', (error as Error).message)
                          }
                        }
                      }, 500)
                      
                      // Wait a bit more for fullscreen to settle, then focus
                      setTimeout(() => {
                        if (mapRef.current) {
                          // Create a feature group to calculate bounds for all farm content
                          const farmGroup = new L.FeatureGroup()
                          let treesAdded = 0
                          let zonesAdded = 0
                          
                          // Add current visible trees to the group (respects zone focus filtering)
                          console.log('🎯 Fullscreen focusing with', trees.length, 'visible trees and', zones.length, 'visible zones')
                          
                          trees.forEach(tree => {
                            const lat = (tree as any).location?.latitude || (tree as any).latitude
                            const lng = (tree as any).location?.longitude || (tree as any).longitude
                            
                            if (lat && lng && lat !== 0 && lng !== 0) {
                              farmGroup.addLayer(L.marker([lat, lng]))
                              treesAdded++
                            }
                          })
                          
                          // Add current visible zones to the group (respects zone focus filtering)  
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
                                  farmGroup.addLayer(L.polygon(validLatLngs))
                                  zonesAdded++
                                }
                              } catch (error) {
                                console.warn('Error adding zone to fullscreen focus:', zone.id)
                              }
                            }
                          })
                          
                          // Focus on farm content with better zoom control
                          if (farmGroup.getLayers().length > 0) {
                            console.log(`🎯 Focusing on farm: ${treesAdded} trees, ${zonesAdded} zones`)
                            
                            // Calculate appropriate zoom level based on content
                            const bounds = farmGroup.getBounds()
                            const padding: [number, number] = [60, 60] // More padding for fullscreen
                            const options: L.FitBoundsOptions = { 
                              padding,
                              maxZoom: treesAdded > 0 ? 17 : 15 // Zoom closer if we have individual trees
                            }
                            
                            mapRef.current.fitBounds(bounds, options)
                          } else {
                            console.log('🎯 No farm content found, using default location')
                            mapRef.current.setView(center, zoom)
                          }
                        }
                      }, 800) // Additional delay for fullscreen to fully settle
                    }
                  }, 500) // More time for state update  
                }, 200) // Initial delay for fullscreen transition
                
              } else {
                // Exit fullscreen mode with mobile-specific handling
                const exitFullscreen = async () => {
                  console.log('📱 Attempting to exit fullscreen')
                  
                  // iOS Safari and mobile Chrome specific handling
                  if (isIOS || isMobile) {
                    console.log('📱 Using mobile exit fullscreen approach')
                    
                    // For iOS Safari, try webkit methods first
                    if ((document as any).webkitExitFullscreen) {
                      console.log('📱 Using webkitExitFullscreen')
                      return await (document as any).webkitExitFullscreen()
                    }
                    
                    // Alternative webkit method for older iOS
                    if ((document as any).webkitCancelFullScreen) {
                      console.log('📱 Using webkitCancelFullScreen (legacy)')
                      return await (document as any).webkitCancelFullScreen()
                    }
                  }
                  
                  // Standard and fallback methods
                  if (document.exitFullscreen) {
                    console.log('🖥️ Using standard exitFullscreen')
                    return await document.exitFullscreen()
                  } else if ((document as any).webkitExitFullscreen) {
                    console.log('🖥️ Using webkitExitFullscreen')
                    return await (document as any).webkitExitFullscreen()
                  } else if ((document as any).webkitCancelFullScreen) {
                    console.log('🖥️ Using webkitCancelFullScreen')
                    return await (document as any).webkitCancelFullScreen()
                  } else if ((document as any).msExitFullscreen) {
                    console.log('🖥️ Using msExitFullscreen')
                    return await (document as any).msExitFullscreen()
                  } else if ((document as any).mozCancelFullScreen) {
                    console.log('🖥️ Using mozCancelFullScreen')
                    return await (document as any).mozCancelFullScreen()
                  } else {
                    console.error('📱 No exit fullscreen method available')
                    throw new Error('Exit fullscreen not supported on this device/browser')
                  }
                }

                await exitFullscreen()
              }
            } catch (error) {
              console.warn('Fullscreen operation failed:', error)
              
              // Show user-friendly error message for farmers
              const button = document.activeElement as HTMLButtonElement
              if (button) {
                button.style.backgroundColor = '#fecaca'
                button.innerHTML = `
                  <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6m0 0L6 6l12 12" />
                  </svg>
                `
                
                // Reset button after 2 seconds
                setTimeout(() => {
                  if (button && button.isConnected) {
                    button.style.backgroundColor = ''
                    button.innerHTML = `
                      <svg class="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    `
                  }
                }, 2000)
              }
              
              // Could also show a toast notification here for better UX
            }
          }}
          className="bg-white hover:bg-gray-50 active:bg-gray-100 p-3 rounded-xl shadow-lg border border-gray-200 transition-all duration-200 flex items-center justify-center transform hover:scale-105 active:scale-95 min-touch"
          title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình - Xem lớn hơn"}
          style={{
            minWidth: '52px',
            minHeight: '52px',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {isFullscreen ? (
            <svg 
              className="h-7 w-7 text-gray-700" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          ) : (
            <svg 
              className="h-7 w-7 text-gray-700" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" 
              />
            </svg>
          )}
        </button>
      </div>

      {/* Enhanced Controls - Farmer-Friendly */}
      
    </div>
  )
}