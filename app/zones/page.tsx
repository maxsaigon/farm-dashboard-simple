'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MapPinIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline'

interface Zone {
  id: string
  name: string
  description?: string
  color: string
  boundaries: Array<{ latitude: number; longitude: number }>
  soilType?: string
  drainageLevel?: 'poor' | 'fair' | 'good' | 'excellent'
  treeCount: number
  area: number
  isActive: boolean
  createdAt: Date
}

export default function ZonesPage() {
  const { currentFarm } = useEnhancedAuth()
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debugFarmId = "F210C3FC-F191-4926-9C15-58D6550A716A"
  const debugFarm = { id: debugFarmId, name: "Debug Farm" }
  const displayFarm = currentFarm || debugFarm

  useEffect(() => {
    if (displayFarm.id) {
      loadZones()
    }
  }, [displayFarm.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadZones = async () => {
    const farmId = displayFarm.id
    if (!farmId) return

    setLoading(true)
    setError(null)
    try {
      console.log('Loading zones for farm:', farmId)
      
      let zonesRef = collection(db, 'farms', farmId, 'zones')
      let zonesSnapshot = await getDocs(zonesRef)
      
      if (zonesSnapshot.empty) {
        zonesRef = collection(db, 'zones')
        zonesSnapshot = await getDocs(query(zonesRef, where('farmId', '==', farmId)))
      }
      
      const zonesData = zonesSnapshot.docs.map(doc => {
        const data = doc.data()
        const boundaries = data.boundary || data.boundaries || data.coordinates || data.polygon || data.points || []
        
        return {
          id: doc.id,
          name: data.name || `Zone ${doc.id}`,
          description: data.description || '',
          color: data.color || '#3b82f6',
          boundaries: boundaries,
          soilType: data.soilType || 'unknown',
          drainageLevel: data.drainageLevel || 'fair',
          treeCount: data.treeCount || 0,
          area: data.area || 0,
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date()
        }
      })
      
      setZones(zonesData)
      console.log('Zones loaded:', zonesData.length)
    } catch (error) {
      console.error('Error loading zones:', error)
      setError('Không thể tải dữ liệu khu vực')
    } finally {
      setLoading(false)
    }
  }

  const handleViewOnMap = (zone: Zone) => {
    window.location.href = `/map?zone=${zone.id}`
  }

  const getDrainageLevelText = (level: string) => {
    const levels = {
      poor: 'Kém',
      fair: 'Trung bình', 
      good: 'Tốt',
      excellent: 'Xuất sắc'
    }
    return levels[level as keyof typeof levels] || level
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải khu vực...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Lỗi</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadZones}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Square3Stack3DIcon className="h-8 w-8 text-green-600 mr-3" />
                Khu Vực Nông Trại
              </h1>
              <p className="text-gray-600 mt-1">{displayFarm.name} • {zones.length} khu vực</p>
            </div>
            <a
              href="/map"
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <MapPinIcon className="h-5 w-5" />
              <span>Xem Trên Bản Đồ</span>
            </a>
          </div>
        </div>

        {/* Zones Grid */}
        {zones.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Square3Stack3DIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có khu vực</h3>
            <p className="text-gray-600">
              Nông trại này chưa có khu vực nào được định nghĩa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Zone Header */}
                <div 
                  className="h-4"
                  style={{ backgroundColor: zone.color }}
                ></div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {zone.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      zone.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {zone.isActive ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                  </div>

                  {zone.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {zone.description}
                    </p>
                  )}

                  {/* Zone Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{zone.treeCount}</div>
                      <div className="text-xs text-gray-600">Cây trồng</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{zone.area}</div>
                      <div className="text-xs text-gray-600">hecta</div>
                    </div>
                  </div>

                  {/* Zone Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Loại đất:</span>
                      <span className="font-medium capitalize">{zone.soilType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Thoát nước:</span>
                      <span className="font-medium">{getDrainageLevelText(zone.drainageLevel || '')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleViewOnMap(zone)}
                    className="w-full bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <MapPinIcon className="h-4 w-4" />
                    <span>Xem Trên Bản Đồ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}