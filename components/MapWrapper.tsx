'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Tree } from '@/lib/types'

// Dynamically import OpenStreetMap with no SSR
const OpenStreetMapNoSSR = dynamic(() => import('./OpenStreetMap').then(mod => ({ default: mod.OpenStreetMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang tải bản đồ...</p>
      </div>
    </div>
  )
})

interface MapWrapperProps {
  trees: Tree[]
  selectedTree?: Tree | null
  onTreeSelect?: (tree: Tree) => void
  center?: [number, number]
  zoom?: number
  className?: string
}

export function MapWrapper(props: MapWrapperProps) {
  return <OpenStreetMapNoSSR {...props} />
}