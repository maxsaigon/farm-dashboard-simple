'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Tree } from '@/lib/types'

// Fix for missing marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface OpenStreetMapProps {
  trees: Tree[]
  selectedTree?: Tree | null
  onTreeSelect?: (tree: Tree) => void
  center?: [number, number]
  zoom?: number
  className?: string
}

export function OpenStreetMap({
  trees = [],
  selectedTree,
  onTreeSelect,
  center = [10.762622, 106.660172], // Default to Ho Chi Minh City area
  zoom = 16,
  className = ''
}: OpenStreetMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup())

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    // Initialize map
    if (!mapRef.current) {
      try {
        const map = L.map(mapContainerRef.current, {
          center: center,
          zoom: zoom,
          scrollWheelZoom: true,
          touchZoom: true,
          doubleClickZoom: true,
          boxZoom: false,
          keyboard: true,
          zoomControl: true,
          preferCanvas: true
        })

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map)

        mapRef.current = map
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
          mapRef.current.remove()
          mapRef.current = null
        } catch (error) {
          console.error('Error cleaning up Leaflet map:', error)
        }
      }
    }
  }, [center, zoom])

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return

    // Clear existing markers
    markersRef.current.clearLayers()

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
      if ((tree as any).location && (tree as any).location.latitude && (tree as any).location.longitude) {
        const marker = L.marker(
          [(tree as any).location.latitude, (tree as any).location.longitude],
          { icon: createTreeIcon(tree) }
        )

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

    // Fit map to show all markers if there are trees
    if (trees.length > 0 && trees.some(t => (t as any).location)) {
      const group = new L.FeatureGroup()
      trees.forEach(tree => {
        if ((tree as any).location && (tree as any).location.latitude && (tree as any).location.longitude) {
          group.addLayer(L.marker([(tree as any).location.latitude, (tree as any).location.longitude]))
        }
      })
      
      if (group.getLayers().length > 0) {
        mapRef.current.fitBounds(group.getBounds(), { padding: [20, 20] })
      }
    }
  }, [trees, onTreeSelect])

  // Highlight selected tree
  useEffect(() => {
    if (!mapRef.current || !selectedTree || !(selectedTree as any).location) return

    mapRef.current.setView([(selectedTree as any).location.latitude, (selectedTree as any).location.longitude], 18)
  }, [selectedTree])

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

  // Add global function for popup buttons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).selectTree = (treeId: string) => {
        const tree = trees.find(t => t.id === treeId)
        if (tree && onTreeSelect) {
          onTreeSelect(tree)
        }
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).selectTree
      }
    }
  }, [trees, onTreeSelect])

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
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-4 h-4 bg-green-600 rounded-full border border-white"></div>
            <span>Xuất sắc</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-4 h-4 bg-blue-600 rounded-full border border-white"></div>
            <span>Tốt</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-4 h-4 bg-yellow-600 rounded-full border border-white"></div>
            <span>Trung bình</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-4 h-4 bg-red-600 rounded-full border border-white"></div>
            <span>Yếu/Cần chú ý</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-white p-2 rounded-lg shadow-lg border border-gray-200 z-[1000]">
        <div className="text-xs text-gray-600">
          {trees.length} cây trên bản đồ
        </div>
      </div>
    </div>
  )
}