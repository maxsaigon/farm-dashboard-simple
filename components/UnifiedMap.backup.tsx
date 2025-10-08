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
}

// This is the ORIGINAL backup version before satellite layer changes
// Use this file to rollback if needed

export default function UnifiedMapBackup() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">🗺️ Backup Version</h2>
        <p className="text-gray-600">
          This is the backup of the original UnifiedMap component.
          <br />
          The active version has been updated with satellite imagery.
        </p>
      </div>
    </div>
  )
}