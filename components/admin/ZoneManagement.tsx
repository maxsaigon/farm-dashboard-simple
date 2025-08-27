'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MapIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { Zone } from '@/lib/gps-tracking-service'
import { EnhancedFarm } from '@/lib/types-enhanced'
import { AdminService } from '@/lib/admin-service'

interface ZoneManagementProps {
  searchQuery: string
}

export function ZoneManagement({ searchQuery }: ZoneManagementProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [farms, setFarms] = useState<EnhancedFarm[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showZoneModal, setShowZoneModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [zonesData, farmsData] = await Promise.all([
        AdminService.getAllZones(),
        AdminService.getAllFarms()
      ])
      setZones(zonesData)
      setFarms(farmsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.farmId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditZone = (zone: Zone) => {
    setSelectedZone(zone)
    setShowZoneModal(true)
  }

  const handleDeleteZone = async (zoneId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa zone này?')) {
      try {
        await AdminService.deleteZone(zoneId)
        loadData()
      } catch (error) {
        console.error('Error deleting zone:', error)
      }
    }
  }

  const toggleZoneStatus = async (zone: Zone) => {
    try {
      await AdminService.updateZone(zone.id, { ...zone, isActive: !zone.isActive })
      loadData()
    } catch (error) {
      console.error('Error updating zone status:', error)
    }
  }

  const getFarmName = (farmId: string) => {
    const farm = farms.find(f => f.id === farmId)
    return farm?.name || `Farm ${farmId.slice(0, 8)}...`
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
          <h2 className="text-xl font-semibold text-gray-900">Quản lý Zone</h2>
          <p className="text-gray-600 mt-1">Tạo và quản lý khu vực trong nông trại</p>
        </div>
        <button
          onClick={() => {
            setSelectedZone(null)
            setShowZoneModal(true)
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Tạo zone mới
        </button>
      </div>

      {/* Zones Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Danh sách Zone ({filteredZones.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên Zone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nông trại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diện tích
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại đất
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cảnh báo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredZones.map((zone) => (
                <tr key={zone.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{zone.name}</div>
                        <div className="text-sm text-gray-500">ID: {zone.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BuildingStorefrontIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{getFarmName(zone.farmId)}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {zone.metadata.area.toFixed(2)} m²
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {zone.metadata.soilType || 'Chưa xác định'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleZoneStatus(zone)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        zone.isActive 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } transition-colors cursor-pointer`}
                    >
                      {zone.isActive ? (
                        <>
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Hoạt động
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-3 w-3 mr-1" />
                          Không hoạt động
                        </>
                      )}
                    </button>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {zone.alertOnEntry && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Vào
                        </span>
                      )}
                      {zone.alertOnExit && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          Ra
                        </span>
                      )}
                      {!zone.alertOnEntry && !zone.alertOnExit && (
                        <span className="text-gray-500 text-xs">Không có</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditZone(zone)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Chỉnh sửa"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteZone(zone.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Xóa"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredZones.length === 0 && (
          <div className="text-center py-12">
            <MapIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Không có zone</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? 'Không tìm thấy zone phù hợp' : 'Chưa có zone nào trong hệ thống'}
            </p>
            {!searchQuery && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    setSelectedZone(null)
                    setShowZoneModal(true)
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Tạo zone đầu tiên
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone Modal */}
      {showZoneModal && (
        <ZoneModal
          zone={selectedZone}
          farms={farms}
          onClose={() => {
            setShowZoneModal(false)
            setSelectedZone(null)
          }}
          onSuccess={() => {
            loadData()
            setShowZoneModal(false)
            setSelectedZone(null)
          }}
        />
      )}
    </div>
  )
}

// Zone Modal Component
interface ZoneModalProps {
  zone: Zone | null
  farms: EnhancedFarm[]
  onClose: () => void
  onSuccess: () => void
}

function ZoneModal({ zone, farms, onClose, onSuccess }: ZoneModalProps) {
  const [formData, setFormData] = useState({
    name: zone?.name || '',
    farmId: zone?.farmId || '',
    isActive: zone?.isActive !== false,
    alertOnEntry: zone?.alertOnEntry || false,
    alertOnExit: zone?.alertOnExit || false,
    soilType: zone?.metadata.soilType || '',
    drainageLevel: zone?.metadata.drainageLevel || '',
    area: zone?.metadata.area || 0,
    perimeter: zone?.metadata.perimeter || 0,
    boundaries: zone?.boundaries || []
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const zoneData: Partial<Zone> = {
        name: formData.name,
        farmId: formData.farmId,
        isActive: formData.isActive,
        alertOnEntry: formData.alertOnEntry,
        alertOnExit: formData.alertOnExit,
        boundaries: formData.boundaries,
        metadata: {
          soilType: formData.soilType,
          drainageLevel: formData.drainageLevel,
          area: formData.area,
          perimeter: formData.perimeter
        }
      }

      if (zone) {
        await AdminService.updateZone(zone.id, { ...zone, ...zoneData })
      } else {
        await AdminService.createZone(zoneData as Zone)
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving zone:', error)
    } finally {
      setLoading(false)
    }
  }

  const addBoundaryPoint = () => {
    setFormData(prev => ({
      ...prev,
      boundaries: [...prev.boundaries, { lat: 0, lng: 0 }]
    }))
  }

  const removeBoundaryPoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      boundaries: prev.boundaries.filter((_, i) => i !== index)
    }))
  }

  const updateBoundaryPoint = (index: number, field: 'lat' | 'lng', value: number) => {
    setFormData(prev => ({
      ...prev,
      boundaries: prev.boundaries.map((point, i) => 
        i === index ? { ...point, [field]: value } : point
      )
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {zone ? 'Chỉnh sửa Zone' : 'Tạo Zone mới'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên Zone *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Nhập tên zone"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nông trại *
              </label>
              <select
                value={formData.farmId}
                onChange={(e) => setFormData(prev => ({ ...prev, farmId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Chọn nông trại...</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status and Alerts */}
          <div className="space-y-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Zone hoạt động
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="alertOnEntry"
                  checked={formData.alertOnEntry}
                  onChange={(e) => setFormData(prev => ({ ...prev, alertOnEntry: e.target.checked }))}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="alertOnEntry" className="ml-2 block text-sm text-gray-900">
                  Cảnh báo khi vào
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="alertOnExit"
                  checked={formData.alertOnExit}
                  onChange={(e) => setFormData(prev => ({ ...prev, alertOnExit: e.target.checked }))}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="alertOnExit" className="ml-2 block text-sm text-gray-900">
                  Cảnh báo khi ra
                </label>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Thông tin chi tiết</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại đất
                </label>
                <select
                  value={formData.soilType}
                  onChange={(e) => setFormData(prev => ({ ...prev, soilType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Chọn loại đất...</option>
                  <option value="clay">Đất sét</option>
                  <option value="sandy">Đất cát</option>
                  <option value="loamy">Đất thịt</option>
                  <option value="silty">Đất bột</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mức độ thoát nước
                </label>
                <select
                  value={formData.drainageLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, drainageLevel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Chọn mức độ...</option>
                  <option value="poor">Kém</option>
                  <option value="fair">Trung bình</option>
                  <option value="good">Tốt</option>
                  <option value="excellent">Rất tốt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diện tích (m²)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chu vi (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.perimeter}
                  onChange={(e) => setFormData(prev => ({ ...prev, perimeter: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Boundary Points */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">Điểm biên giới</h4>
              <button
                type="button"
                onClick={addBoundaryPoint}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Thêm điểm
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {formData.boundaries.map((point, index) => (
                <div key={index} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Vĩ độ
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={point.lat}
                        onChange={(e) => updateBoundaryPoint(index, 'lat', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="10.762622"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Kinh độ
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={point.lng}
                        onChange={(e) => updateBoundaryPoint(index, 'lng', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="106.660172"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBoundaryPoint(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {formData.boundaries.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">
                Chưa có điểm biên giới nào. Thêm ít nhất 3 điểm để tạo zone.
              </div>
            )}
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
              disabled={loading || !formData.name || !formData.farmId}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : (zone ? 'Cập nhật' : 'Tạo Zone')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}