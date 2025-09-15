'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Tree } from '@/lib/types'
import { 
  MapPinIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  CameraIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

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

interface FarmerFriendlyMapProps {
  trees: Tree[]
  zones: Zone[]
  selectedTree?: Tree | null
  selectedZone?: Zone | null
  onTreeSelect?: (tree: Tree) => void
  onZoneSelect?: (zone: Zone) => void
  center?: [number, number]
  zoom?: number
  className?: string
}

// Farmer-friendly health status mapping
const getHealthStatusInVietnamese = (status: string) => {
  const statusMap: { [key: string]: { label: string; color: string; icon: string } } = {
    'Excellent': { label: 'Tuyệt vời', color: 'text-emerald-600 bg-emerald-100', icon: '🟢' },
    'Good': { label: 'Khỏe mạnh', color: 'text-green-600 bg-green-100', icon: '🟢' },
    'Fair': { label: 'Bình thường', color: 'text-yellow-600 bg-yellow-100', icon: '🟡' },
    'Poor': { label: 'Yếu', color: 'text-red-600 bg-red-100', icon: '🔴' }
  }
  return statusMap[status] || statusMap['Good']
}

// Get tree age in farmer-friendly format
const getTreeAge = (plantingDate: Date | string | null | undefined) => {
  if (!plantingDate) return 'Chưa rõ tuổi'
  
  const date = plantingDate instanceof Date ? plantingDate : new Date(plantingDate)
  if (isNaN(date.getTime())) return 'Chưa rõ tuổi'
  
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffMonths / 12)
  
  if (diffYears > 0) {
    return `${diffYears} năm tuổi`
  } else if (diffMonths > 0) {
    return `${diffMonths} tháng tuổi`
  } else {
    return `${diffDays} ngày tuổi`
  }
}

// Simple map implementation for farmers
export default function FarmerFriendlyMap({
  trees = [],
  zones = [],
  selectedTree,
  selectedZone,
  onTreeSelect,
  onZoneSelect,
  center = [10.762622, 106.660172],
  zoom = 16,
  className = ''
}: FarmerFriendlyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Get user location for "Tôi ở đây" feature
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.log('Location access denied or unavailable')
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  // Initialize simple map view
  useEffect(() => {
    if (mapRef.current && !mapReady) {
      // For this demo, we'll create a simple grid-based representation
      // In production, this would integrate with Leaflet or Google Maps
      setMapReady(true)
    }
  }, [mapReady])

  // Calculate map bounds to show all items
  const calculateBounds = () => {
    const allItems = [
      ...trees.map(t => ({ lat: t.latitude, lng: t.longitude })),
      ...zones.flatMap(z => z.boundaries.map(b => ({ lat: b.latitude, lng: b.longitude })))
    ]
    
    if (allItems.length === 0) return null
    
    const bounds = {
      north: Math.max(...allItems.map(i => i.lat)),
      south: Math.min(...allItems.map(i => i.lat)),
      east: Math.max(...allItems.map(i => i.lng)),
      west: Math.min(...allItems.map(i => i.lng))
    }
    
    return bounds
  }

  // Farmer-friendly tree card
  const TreeCard = ({ tree }: { tree: Tree }) => {
    const healthStatus = getHealthStatusInVietnamese(tree.healthStatus || 'Good')
    const age = getTreeAge(tree.plantingDate || null)
    const isSelected = selectedTree?.id === tree.id
    
    return (
      <div
        onClick={() => onTreeSelect?.(tree)}
        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
          isSelected 
            ? 'border-green-500 bg-green-50 shadow-lg' 
            : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🌳</span>
            <div>
              <h3 className="font-semibold text-gray-900">{tree.name || `Cây ${tree.id.slice(-4)}`}</h3>
              <p className="text-sm text-gray-600">{tree.variety || 'Chưa xác định loại'}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${healthStatus.color}`}>
            {healthStatus.icon} {healthStatus.label}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Tuổi cây:</span>
            <div className="font-medium">{age}</div>
          </div>
          <div>
            <span className="text-gray-500">Hình ảnh:</span>
            <div className="font-medium">{tree.manualFruitCount || 0} ảnh</div>
          </div>
        </div>
        
        {tree.needsAttention && (
          <div className="mt-3 flex items-center space-x-2 text-orange-700 bg-orange-100 px-3 py-2 rounded-lg">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Cần chú ý</span>
          </div>
        )}
        
        <div className="mt-3 flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.location.href = `/camera?tree=${tree.id}`
            }}
            className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
          >
            <CameraIcon className="h-4 w-4" />
            <span>Chụp ảnh</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.location.href = `/trees/${tree.id}`
            }}
            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Chi tiết</span>
          </button>
        </div>
      </div>
    )
  }

  // Farmer-friendly zone card
  const ZoneCard = ({ zone }: { zone: Zone }) => {
    const isSelected = selectedZone?.id === zone.id
    
    return (
      <div
        onClick={() => onZoneSelect?.(zone)}
        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
          isSelected 
            ? 'border-blue-500 bg-blue-50 shadow-lg' 
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div 
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: zone.color + '40' }}
            >
              <span className="text-sm">📍</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{zone.name}</h3>
              <p className="text-sm text-gray-600">{zone.description || 'Khu vực trồng trọt'}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            zone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {zone.isActive ? '✅ Hoạt động' : '⏸️ Tạm dừng'}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{zone.treeCount}</div>
            <div className="text-xs text-blue-700">Số cây</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{zone.area.toFixed(1)}</div>
            <div className="text-xs text-green-700">Hecta</div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.location.href = `/zones/${zone.id}`
            }}
            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Xem chi tiết
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.location.href = `/trees?zone=${zone.id}`
            }}
            className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Xem cây
          </button>
        </div>
      </div>
    )
  }

  // Simple visual map representation for farmers
  const SimpleMapView = () => {
    const problemTrees = trees.filter(t => t.needsAttention || t.healthStatus === 'Poor')
    const healthyTrees = trees.filter(t => !t.needsAttention && (t.healthStatus === 'Good' || t.healthStatus === 'Excellent' || !t.healthStatus))
    
    return (
      <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tổng quan nông trại</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">{healthyTrees.length}</div>
              <div className="text-sm text-green-700">🟢 Cây khỏe</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-orange-600">{problemTrees.length}</div>
              <div className="text-sm text-orange-700">🟠 Cần chú ý</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{zones.length}</div>
              <div className="text-sm text-blue-700">📍 Khu vực</div>
            </div>
          </div>
        </div>
        
        {currentLocation && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
              <MapPinIcon className="h-4 w-4" />
              <span className="text-sm font-medium">📍 Tôi ở đây</span>
            </div>
          </div>
        )}
        
        <div className="text-center text-gray-600">
          <p className="text-sm">
            Bản đồ tương tác sẽ hiển thị ở đây
          </p>
          <p className="text-xs mt-1">
            Nhấn vào cây hoặc khu vực bên dưới để xem chi tiết
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`farmer-friendly-map ${className}`}>
      {/* Simple Map Overview */}
      <div className="mb-6">
        <SimpleMapView />
      </div>
      
      {/* Trees Section */}
      {trees.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span className="text-xl">🌳</span>
              <span>Cây trồng ({trees.length})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {trees.slice(0, 5).map(tree => (
              <TreeCard key={tree.id} tree={tree} />
            ))}
            {trees.length > 5 && (
              <div className="text-center py-4">
                <a
                  href="/trees"
                  className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium"
                >
                  <span>Xem tất cả {trees.length} cây</span>
                  <span>→</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Zones Section */}
      {zones.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span className="text-xl">📍</span>
              <span>Khu vực ({zones.length})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {zones.slice(0, 3).map(zone => (
              <ZoneCard key={zone.id} zone={zone} />
            ))}
            {zones.length > 3 && (
              <div className="text-center py-4">
                <a
                  href="/zones"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span>Xem tất cả {zones.length} khu vực</span>
                  <span>→</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {trees.length === 0 && zones.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPinIcon className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có dữ liệu</h3>
          <p className="text-gray-600 mb-6">
            Chưa có cây hoặc khu vực nào được thêm vào bản đồ
          </p>
          <div className="space-y-3">
            <a
              href="/trees"
              className="block bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              🌳 Thêm cây mới
            </a>
            <a
              href="/zones"
              className="block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              📍 Tạo khu vực
            </a>
          </div>
        </div>
      )}
    </div>
  )
}