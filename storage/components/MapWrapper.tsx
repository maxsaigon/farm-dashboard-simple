'use client'

import React, { lazy, Suspense } from 'react'
import { Tree } from '@/lib/types'

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

// Lazy load the unified map component with no SSR
const UnifiedMap = lazy(() => import('./UnifiedMap'))

const MapLoadingFallback = () => (
  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Đang tải bản đồ thống nhất...</p>
    </div>
  </div>
)

interface MapWrapperProps {
  trees: Tree[]
  zones?: Zone[]
  selectedTree?: Tree | null
  selectedZone?: Zone | null
  onTreeSelect?: (tree: Tree) => void
  onZoneSelect?: (zone: Zone) => void
  onZoneCreated?: (zoneData: { boundaries: Array<{ latitude: number; longitude: number }> }) => void
  onFullscreenFocus?: () => void
  farmId?: string
  center?: [number, number]
  zoom?: number
  className?: string
  enableDrawing?: boolean
  enableRealTime?: boolean
}

function MapWrapper({
  zones = [],
  enableDrawing = false,
  enableRealTime = true,
  farmId,
  ...props
}: MapWrapperProps) {
  return (
    <Suspense fallback={<MapLoadingFallback />}>
      <UnifiedMap
        zones={zones}
        enableDrawing={enableDrawing}
        enableRealTime={enableRealTime}
        farmId={farmId}
        {...props}
      />
    </Suspense>
  )
}

export default MapWrapper
export { MapWrapper }