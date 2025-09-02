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

  const handleEditFarm = (farm: EnhancedFarm) => {
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

  const getFarmStats = (farm: EnhancedFarm) => {
    const farmUsers = users.filter(user => user.uid)
    return {
      totalUsers: farmUsers.length,
      totalTrees: 0,
      totalZones: 0
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
                      {farm.location || 'Chưa có địa chỉ'}
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

              {/* Farm Owner */}
              {farm.ownerName && (
                <div className="px-6 pb-4 border-t border-gray-100">
                  <div className="pt-4">
                    <p className="text-sm text-gray-500">Chủ nông trại:</p>
                    <p className="text-sm font-medium text-gray-900">{farm.ownerName}</p>
                  </div>
                </div>
              )}

              {/* Farm Description */}
              {farm.description && (
                <div className="px-6 pb-6">
                  <p className="text-sm text-gray-600 line-clamp-2">{farm.description}</p>
                </div>
              )}
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
  farm: EnhancedFarm | null
  onClose: () => void
  onSuccess: () => void
}

function FarmModal({ farm, onClose, onSuccess }: FarmModalProps) {
  const [formData, setFormData] = useState({
    name: farm?.name || '',
    location: farm?.location || '',
    description: farm?.description || '',
    ownerName: farm?.ownerName || '',
    ownerEmail: farm?.ownerEmail || '',
    area: farm?.area || 0,
    coordinates: {
      latitude: farm?.coordinates?.latitude || 0,
      longitude: farm?.coordinates?.longitude || 0
    }
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (farm) {
        await FarmService.updateFarm(farm.id, 'admin', formData)
      } else {
        await FarmService.createFarm('admin', formData)
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
                value={formData.area}
                onChange={(e) => setFormData(prev => ({ ...prev, area: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Địa chỉ
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Nhập địa chỉ nông trại"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Mô tả về nông trại..."
            />
          </div>

          {/* Owner Information */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Thông tin chủ nông trại</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email chủ nông trại
                </label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="owner@example.com"
                />
              </div>
            </div>
          </div>

          {/* Location Coordinates */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Tọa độ GPS</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vĩ độ (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.coordinates.latitude}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    coordinates: { ...prev.coordinates, latitude: parseFloat(e.target.value) || 0 }
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
                  value={formData.coordinates.longitude}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    coordinates: { ...prev.coordinates, longitude: parseFloat(e.target.value) || 0 }
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