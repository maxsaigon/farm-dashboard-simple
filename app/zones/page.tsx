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
    <div className="min-h-screen bg-gray-50 p-4 safe-bottom safe-top">
      <div className="max-w-6xl mx-auto">
        {/* Header - Enhanced for Farmers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📍</span>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Khu Vực Nông Trại
                  </h1>
                  <p className="text-base lg:text-lg text-gray-600 font-medium">
                    {displayFarm.name}
                  </p>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                  <span className="text-blue-600 font-bold">📍</span>
                  <span className="text-blue-800 font-semibold text-lg">
                    {zones.length} Khu Vực
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                  <span className="text-green-600 font-bold">🌳</span>
                  <span className="text-green-800 font-semibold text-lg">
                    {zones.reduce((total, zone) => total + zone.treeCount, 0)} Cây
                  </span>
                </div>
              </div>
            </div>
            
            <a
              href="/map"
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-colors text-base font-bold shadow-md min-touch lg:w-auto w-full"
              style={{
                minHeight: '52px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span className="text-xl">🗺️</span>
              <span>Xem Trên Bản Đồ</span>
            </a>
          </div>
        </div>

        {/* Zones Grid - Enhanced for Farmers */}
        {zones.length === 0 ? (
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <span className="text-3xl">📍</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Chưa Có Khu Vực</h3>
            <p className="text-gray-700 text-lg mb-6">
              Nông trại này chưa có khu vực nào được định nghĩa.
              <br />Hãy tạo khu vực để quản lý cây trồng hiệu quả hơn.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors min-touch">
                <span className="text-xl">➕</span>
                <span>Tạo Khu Vực</span>
              </button>
              <button className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-colors min-touch">
                <span className="text-xl">❓</span>
                <span>Hướng Dẫn</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden active:scale-98 min-touch"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Zone Header - Enhanced */}
                <div 
                  className="h-2"
                  style={{ backgroundColor: zone.color }}
                ></div>
                
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div 
                          className="w-6 h-6 rounded-full shadow-sm"
                          style={{ backgroundColor: zone.color }}
                        ></div>
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {zone.name}
                        </h3>
                      </div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        zone.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {zone.isActive ? '✓ Hoạt động' : '⊗ Không hoạt động'}
                      </span>
                    </div>
                  </div>

                  {zone.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {zone.description}
                    </p>
                  )}

                  {/* Zone Stats - Enhanced */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-green-50 p-4 rounded-xl text-center border border-green-100">
                      <div className="text-2xl font-bold text-green-700 mb-1">{zone.treeCount}</div>
                      <div className="text-sm text-green-600 font-medium">🌳 Cây trồng</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                      <div className="text-2xl font-bold text-blue-700 mb-1">{zone.area || 0}</div>
                      <div className="text-sm text-blue-600 font-medium">📏 Hecta</div>
                    </div>
                  </div>

                  {/* Zone Details - Enhanced */}
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-lg">
                      <span className="text-gray-600 font-medium">🌱 Loại đất:</span>
                      <span className="font-bold capitalize text-gray-800">{zone.soilType || 'Chưa xác định'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-lg">
                      <span className="text-gray-600 font-medium">💧 Thoát nước:</span>
                      <span className="font-bold text-gray-800">{getDrainageLevelText(zone.drainageLevel || 'fair')}</span>
                    </div>
                  </div>

                  {/* Actions - Enhanced */}
                  <button
                    onClick={() => handleViewOnMap(zone)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-xl text-base font-bold transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg active:scale-95 min-touch"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span className="text-xl">🗺️</span>
                    <span>XEM TRÊN BẢN ĐỒ</span>
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