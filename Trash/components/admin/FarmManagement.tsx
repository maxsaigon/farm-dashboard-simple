'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BuildingStorefrontIcon,
  MapPinIcon,
  UsersIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { EnhancedFarm, EnhancedUser } from '@/lib/types-enhanced'
import { Farm } from '@/lib/types'
import { AdminService } from '@/lib/admin-service'

interface FarmManagementProps {
  searchQuery: string
}

export function FarmManagement({ searchQuery }: FarmManagementProps) {
  const [farms, setFarms] = useState<Farm[]>([])
  const [users, setUsers] = useState<EnhancedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [showFarmModal, setShowFarmModal] = useState(false)
  const [farmStats, setFarmStats] = useState<Record<string, { trees: number; zones: number; users: number }>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [farmsData, usersData] = await Promise.all([
        AdminService.getAllFarms(),
        AdminService.getAllUsers()
      ])
      setFarms(farmsData)
      setUsers(usersData)
      
      // Load statistics for each farm
      const statsPromises = farmsData.map(async (farm) => {
        try {
          const [trees, zones] = await Promise.all([
            AdminService.getAllTrees().then(trees => trees.filter(t => t.farmId === farm.id)),
            AdminService.getAllZones().then(zones => zones.filter(z => z.farmId === farm.id))
          ])
          
          // Count users associated with this farm
          const farmUsers = usersData.filter(user => user.currentFarmId === farm.id)
          
          return {
            farmId: farm.id,
            stats: {
              trees: trees.length,
              zones: zones.length,
              users: farmUsers.length
            }
          }
        } catch (error) {
          console.warn(`Error loading stats for farm ${farm.id}:`, error)
          return {
            farmId: farm.id,
            stats: { trees: 0, zones: 0, users: 0 }
          }
        }
      })
      
      const statsResults = await Promise.all(statsPromises)
      const statsMap = statsResults.reduce((acc, { farmId, stats }) => {
        acc[farmId] = stats
        return acc
      }, {} as Record<string, { trees: number; zones: number; users: number }>)
      
      setFarmStats(statsMap)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredFarms = farms.filter(farm =>
    farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farm.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditFarm = (farm: Farm) => {
    setSelectedFarm(farm)
    setShowFarmModal(true)
  }

  const handleDeleteFarm = async (farmId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa nông trại này?')) {
      try {
        await AdminService.deleteFarm(farmId)
        loadData()
      } catch (error) {
        console.error('Error deleting farm:', error)
      }
    }
  }

  const getFarmStats = (farm: Farm) => {
    const stats = farmStats[farm.id] || { trees: 0, zones: 0, users: 0 }
    return {
      totalUsers: stats.users,
      totalTrees: stats.trees,
      totalZones: stats.zones
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quản lý nông trại</h2>
          <p className="text-gray-600 mt-1">Tạo và quản lý tất cả nông trại trong hệ thống</p>
        </div>
        <button
          onClick={() => {
            setSelectedFarm(null)
            setShowFarmModal(true)
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Tạo nông trại mới
        </button>
      </div>

      {/* Farms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFarms.map((farm) => {
          const stats = getFarmStats(farm)
          
          return (
            <div key={farm.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              {/* Farm Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{farm.name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {farm.ownerName || 'Chưa có chủ sở hữu'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Tạo: {farm.createdDate.toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditFarm(farm)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Chỉnh sửa"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFarm(farm.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Xóa"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Farm Stats */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <UsersIcon className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-semibold text-gray-900">{stats.totalUsers}</div>
                      <div className="text-xs text-gray-500">Người dùng</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-lg font-semibold text-gray-900">{stats.totalTrees}</div>
                      <div className="text-xs text-gray-500">Cây trồng</div>
                      <div className="text-lg">🌳</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <MapPinIcon className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                      <div className="text-lg font-semibold text-gray-900">{stats.totalZones}</div>
                      <div className="text-xs text-gray-500">Zone</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Farm Details */}
              <div className="px-6 pb-4 border-t border-gray-100">
                <div className="pt-4 space-y-2">
                  {farm.ownerName && (
                    <div>
                      <p className="text-sm text-gray-500">Chủ nông trại:</p>
                      <p className="text-sm font-medium text-gray-900">{farm.ownerName}</p>
                    </div>
                  )}
                  {farm.totalArea && (
                    <div>
                      <p className="text-sm text-gray-500">Diện tích:</p>
                      <p className="text-sm font-medium text-gray-900">{farm.totalArea} ha</p>
                    </div>
                  )}
                  {(farm.centerLatitude && farm.centerLongitude) && (
                    <div>
                      <p className="text-sm text-gray-500">Tọa độ:</p>
                      <p className="text-sm font-medium text-gray-900">
                        {farm.centerLatitude?.toFixed(6)}, {farm.centerLongitude?.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredFarms.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'Không tìm thấy nông trại' : 'Chưa có nông trại'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Thử tìm kiếm với từ khóa khác' 
              : 'Tạo nông trại đầu tiên để bắt đầu quản lý'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => {
                setSelectedFarm(null)
                setShowFarmModal(true)
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Tạo nông trại đầu tiên
            </button>
          )}
        </div>
      )}

      {/* Farm Modal */}
      {showFarmModal && (
        <FarmModal
          farm={selectedFarm}
          onClose={() => {
            setShowFarmModal(false)
            setSelectedFarm(null)
          }}
          onSuccess={() => {
            loadData()
            setShowFarmModal(false)
            setSelectedFarm(null)
          }}
        />
      )}
    </div>
  )
}

// Farm Modal Component
interface FarmModalProps {
  farm: Farm | null
  onClose: () => void
  onSuccess: () => void
}

function FarmModal({ farm, onClose, onSuccess }: FarmModalProps) {
  const [formData, setFormData] = useState({
    name: farm?.name || '',
    ownerName: farm?.ownerName || '',
    totalArea: farm?.totalArea || 0,
    centerLatitude: farm?.centerLatitude || 0,
    centerLongitude: farm?.centerLongitude || 0,
    boundaryCoordinates: farm?.boundaryCoordinates || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (farm) {
        await AdminService.updateFarm(farm.id, formData)
      } else {
        await AdminService.createFarm(formData)
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving farm:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {farm ? 'Chỉnh sửa nông trại' : 'Tạo nông trại mới'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên nông trại *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Nhập tên nông trại"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diện tích (ha)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.totalArea}
                onChange={(e) => setFormData(prev => ({ ...prev, totalArea: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tọa độ ranh giới (JSON)
            </label>
            <textarea
              value={formData.boundaryCoordinates}
              onChange={(e) => setFormData(prev => ({ ...prev, boundaryCoordinates: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder='[{"lat": 10.762622, "lng": 106.660172}]'
            />
          </div>

          {/* Owner Information */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Thông tin chủ nông trại</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên chủ nông trại
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Nhập tên chủ nông trại"
              />
            </div>
          </div>

          {/* Location Coordinates */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Tọa độ trung tâm</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vĩ độ (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.centerLatitude}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    centerLatitude: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="10.762622"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kinh độ (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.centerLongitude}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    centerLongitude: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="106.660172"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : (farm ? 'Cập nhật' : 'Tạo nông trại')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}