'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth, SimpleFarm } from '@/lib/optimized-auth-context'
import { 
  XMarkIcon, 
  CheckCircleIcon,
  MapIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface FarmSelectorModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FarmSelectorModal({ isOpen, onClose }: FarmSelectorModalProps) {
  const { farms, currentFarm, setCurrentFarm, getUserRole, farmAccess } = useSimpleAuth()
  const [selectedFarm, setSelectedFarm] = useState<SimpleFarm | null>(currentFarm)

  useEffect(() => {
    setSelectedFarm(currentFarm)
  }, [currentFarm])

  const handleSelectFarm = () => {
    if (selectedFarm) {
      setCurrentFarm(selectedFarm)
      onClose()
    }
  }

  const getRoleLabel = (farmId: string) => {
    const role = getUserRole(farmId)
    switch (role) {
      case 'owner': return { label: 'Chủ trại', color: 'text-red-600 bg-red-100' }
      case 'manager': return { label: 'Quản lý', color: 'text-blue-600 bg-blue-100' }
      case 'viewer': return { label: 'Xem', color: 'text-green-600 bg-green-100' }
      default: return { label: 'Không rõ', color: 'text-gray-600 bg-gray-100' }
    }
  }

  const getAccessDate = (farmId: string) => {
    const access = farmAccess.find(a => a.farmId === farmId)
    return access?.grantedAt || new Date()
  }

  if (!isOpen || farms.length <= 1) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md mx-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Chọn nông trại</h2>
            <p className="text-sm text-gray-600">Bạn có quyền truy cập {farms.length} nông trại</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Farm List */}
        <div className="p-6">
          <div className="space-y-3">
            {farms.map((farm) => {
              const role = getRoleLabel(farm.id)
              const accessDate = getAccessDate(farm.id)
              const isSelected = selectedFarm?.id === farm.id
              const isCurrent = currentFarm?.id === farm.id

              return (
                <div
                  key={farm.id}
                  onClick={() => setSelectedFarm(farm)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <MapIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                        <p className="text-sm text-gray-600">{farm.ownerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isCurrent && (
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Hiện tại
                        </span>
                      )}
                      {isSelected && !isCurrent && (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${role.color}`}>
                        {role.label}
                      </span>
                      <div className="flex items-center space-x-1 text-gray-500">
                        <UserGroupIcon className="h-4 w-4" />
                        <span>{farm.totalArea?.toFixed(1) || '0'} hecta</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <ClockIcon className="h-4 w-4" />
                      <span>Từ {accessDate.toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  {farm.isActive === false && (
                    <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      ⏸️ Nông trại tạm ngưng hoạt động
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSelectFarm}
            disabled={!selectedFarm || selectedFarm.id === currentFarm?.id}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {selectedFarm?.id === currentFarm?.id ? 'Đang sử dụng' : 'Chọn nông trại'}
          </button>
        </div>
      </div>
    </div>
  )
}