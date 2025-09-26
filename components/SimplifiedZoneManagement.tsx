'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  MapIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { MapPinIcon } from '@heroicons/react/24/solid'

// Calculate polygon area in hectares from coordinates
function polygonAreaHectares(coords: Array<{ latitude: number; longitude: number }>): number {
  if (!coords || coords.length < 3) return 0

  const R = 6371000 // earth radius in meters

  // Compute centroid latitude for scale
  const lat0 = coords.reduce((sum, p) => sum + p.latitude, 0) / coords.length
  const lat0Rad = (lat0 * Math.PI) / 180

  // Convert to x/y (meters) using equirectangular approximation
  const points = coords.map(p => {
    const x = (p.longitude * Math.PI / 180) * R * Math.cos(lat0Rad)
    const y = (p.latitude * Math.PI / 180) * R
    return { x, y }
  })

  // Shoelace formula
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    sum += points[i].x * points[j].y - points[j].x * points[i].y
  }
  const areaMeters2 = Math.abs(sum) / 2
  const areaHectares = areaMeters2 / 10000
  return areaHectares
}

interface Zone {
  id: string
  name: string
  code?: string
  description?: string
  color?: string
  boundaries?: Array<{ latitude: number; longitude: number }>
  area: number // square meters
  treeCount: number
  plantedTreeCount?: number
  youngTreeCount?: number
  matureTreeCount?: number
  deadTreeCount?: number
  averageHealth: number
  lastInspectionDate?: Date
  isActive: boolean
  createdAt?: Date
  needsAttention?: boolean
}

export default function SimplifiedZoneManagement() {
  const { user, currentFarm } = useSimpleAuth()
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)

  // Load zones from Firebase
  useEffect(() => {
    const loadZones = async () => {
      if (!currentFarm?.id) {
        setZones([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Try farm-specific collection first
        let zonesRef = collection(db, 'farms', currentFarm.id, 'zones')

        let zonesSnapshot = await getDocs(zonesRef)

        // If no zones found in farm collection, try global zones collection
        if (zonesSnapshot.empty) {
          zonesRef = collection(db, 'zones')
          const globalQuery = query(zonesRef, where('farmId', '==', currentFarm.id))
          zonesSnapshot = await getDocs(globalQuery)
        }

        const zonesData = zonesSnapshot.docs.map(doc => {
          const data = doc.data()

          // Handle different possible field names for boundaries (from debug code)
          let boundaries = data.boundary || data.boundaries || data.coordinates || data.polygon || data.points || []

          if (boundaries && Array.isArray(boundaries) && boundaries.length > 0) {
            boundaries = boundaries.map((point: any, index: number) => {
              // Handle Firebase GeoPoint format
              if (point && typeof point === 'object' && ('_lat' in point || 'latitude' in point)) {
                const converted = {
                  latitude: point._lat || point.latitude,
                  longitude: point._long || point.longitude
                }
                return converted
              }
              return point
            })
          }

          // Calculate area from boundaries if available
          let computedArea = data.area || 0

          if (boundaries && Array.isArray(boundaries) && boundaries.length >= 3) {
            try {
              computedArea = polygonAreaHectares(boundaries)
            } catch (error) {
              // Failed to compute area for zone
            }
          }

          // Handle metadata object (from debug code)
          const metadata = data.metadata || {}
          
          // Determine if zone needs attention
          const twoWeeksAgo = new Date()
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
          const lastInspection = data.lastInspectionDate?.toDate?.() || data.lastInspectionDate
          const needsAttention = !lastInspection || 
                                lastInspection < twoWeeksAgo || 
                                (data.averageHealth && data.averageHealth < 7)

          const finalArea = computedArea || metadata.area || 0

          return {
            id: doc.id,
            name: data.name || `Zone ${doc.id}`,
            code: data.code || doc.id.toUpperCase(),
            description: data.description || '',
            color: data.color || '#10b981',
            boundaries: boundaries,
            area: finalArea,
            treeCount: data.treeCount || 0,
            plantedTreeCount: data.plantedTreeCount || 0,
            youngTreeCount: data.youngTreeCount || 0,
            matureTreeCount: data.matureTreeCount || 0,
            deadTreeCount: data.deadTreeCount || 0,
            averageHealth: data.averageHealth || 8.0,
            lastInspectionDate: lastInspection instanceof Date ? lastInspection : (lastInspection?.toDate?.() || null),
            isActive: data.isActive !== false,
            createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
            needsAttention
          } as Zone
        })

        setZones(zonesData)
      } catch (error) {
        setZones([])
      } finally {
        setLoading(false)
      }
    }

    loadZones()
  }, [currentFarm?.id])

  // Filter zones based on search
  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (zone.code && zone.code.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Calculate simple stats
  const totalZones = zones.length
  const totalTrees = zones.reduce((sum, zone) => sum + zone.treeCount, 0)
  const zonesNeedingAttention = zones.filter(zone => zone.needsAttention).length

  const formatArea = (zone: Zone) => {
    // Calculate area from boundaries if available
    if (zone.boundaries && zone.boundaries.length >= 3) {
      try {
        const calculatedArea = polygonAreaHectares(zone.boundaries)
        return `${calculatedArea.toFixed(1)} ha`
      } catch (error) {
        // Failed to calculate area from boundaries
      }
    }

    // Fallback to stored area
    if (zone.area === 0) {
      return "Chưa có dữ liệu"
    }

    const fallbackArea = (zone.area / 10000).toFixed(1)
    return `${fallbackArea} ha`
  }

  const getHealthColor = (health: number) => {
    if (health >= 8) return 'text-green-600 bg-green-50'
    if (health >= 6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const handleZoneAction = async (action: string, zone: Zone) => {
    switch (action) {
      case 'view_map':
        // Navigate to map focused on this zone
        if (zone.boundaries && zone.boundaries.length > 0) {
          const centerLat = zone.boundaries.reduce((sum, p) => sum + p.latitude, 0) / zone.boundaries.length
          const centerLng = zone.boundaries.reduce((sum, p) => sum + p.longitude, 0) / zone.boundaries.length
          window.location.href = `/map?lat=${centerLat}&lng=${centerLng}&zoom=16&zone=${zone.id}`
        } else {
          window.location.href = `/map?zone=${zone.id}`
        }
        break
      case 'inspect':
        if (!currentFarm?.id) return
        try {
          // Update in Firebase
          const zoneRef = doc(db, 'farms', currentFarm.id, 'zones', zone.id)
          await updateDoc(zoneRef, {
            lastInspectionDate: new Date()
          })
          
          // Update local state
          setZones(prev => prev.map(z =>
            z.id === zone.id
              ? { ...z, lastInspectionDate: new Date(), needsAttention: false }
              : z
          ))
        } catch (error) {
          // Failed to update zone inspection
        }
        break
    }
  }

  if (!currentFarm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Chọn trang trại</h2>
          <p className="text-gray-600">Vui lòng chọn trang trại để xem các khu vực.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải khu vực...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Khu vực</h1>
        
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm khu vực..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{totalZones}</div>
            <div className="text-xs text-gray-600 mt-1">Khu vực</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{totalTrees}</div>
            <div className="text-xs text-gray-600 mt-1">Cây trồng</div>
          </div>
          
        </div>
      </div>

      {/* Zones List */}
      <div className="px-4 pb-20">
        {filteredZones.length === 0 ? (
          <div className="text-center py-12">
            <MapIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Không tìm thấy khu vực' : 'Chưa có khu vực'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Thử từ khóa khác' : 'Khu vực giúp bạn tổ chức và quản lý trang trại hiệu quả hơn'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => window.location.href = '/map'}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors inline-flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Tạo khu vực đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredZones.map((zone) => (
              <ZoneCard 
                key={zone.id} 
                zone={zone} 
                onAction={handleZoneAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Simplified Zone Card
function ZoneCard({ 
  zone, 
  onAction 
}: { 
  zone: Zone
  onAction: (action: string, zone: Zone) => void
}) {
  const healthColor = zone.averageHealth >= 8 ? 'bg-green-100 text-green-800' : 
                     zone.averageHealth >= 6 ? 'bg-yellow-100 text-yellow-800' : 
                     'bg-red-100 text-red-800'

  const formatAreaFromZone = (zone: Zone) => {
    // Calculate area from boundaries if available
    if (zone.boundaries && zone.boundaries.length >= 3) {
      try {
        const calculatedArea = polygonAreaHectares(zone.boundaries)
        return `${calculatedArea.toFixed(1)} ha`
      } catch (error) {
        // Failed to calculate area from boundaries
      }
    }

    // Fallback to stored area
    if (zone.area === 0) {
      return "Chưa có dữ liệu"
    }

    const fallbackArea = (zone.area / 10000).toFixed(1)
    return `${fallbackArea} ha`
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            {/* Zone Color Indicator */}
            <div 
              className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: zone.color || '#10b981' }}
            ></div>
            <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
            
          </div>
          
        </div>
        
        {/* Health Badge */}
        
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{zone.treeCount}</div>
          <div className="text-xs text-gray-600">Cây</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600">
            {formatAreaFromZone(zone)}
          </div>
          <div className="text-xs text-gray-600">Diện tích</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={() => onAction('view_map', zone)}
          className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <MapPinIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Xem vị trí</span>
        </button>
        
        
      </div>
    </div>
  )
}