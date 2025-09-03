'use client'

import { Tree } from '@/lib/types'
import { 
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface TreeCardProps {
  tree: Tree
  onSelect?: (tree: Tree) => void
  onEdit?: (tree: Tree) => void
  isSelected?: boolean
  showActions?: boolean
  className?: string
}

export function TreeCard({ 
  tree, 
  onSelect, 
  onEdit, 
  isSelected = false, 
  showActions = true, 
  className = '' 
}: TreeCardProps) {
  
  const getHealthIcon = () => {
    if (tree.needsAttention) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
    }
    if (['Excellent', 'Good'].includes(tree.healthStatus || '')) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    }
    return <ClockIcon className="h-5 w-5 text-yellow-500" />
  }

  const getHealthStatusColor = (status?: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800'
      case 'Good': return 'bg-blue-100 text-blue-800'
      case 'Fair': return 'bg-yellow-100 text-yellow-800'
      case 'Poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (date?: Date | null) => {
    if (!date) return 'N/A'
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  const totalFruits = (tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)

  return (
    <div
      onClick={() => onSelect?.(tree)}
      className={`p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md ${
        isSelected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 hover:border-gray-300'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Health Icon */}
          <div className="flex-shrink-0">
            {getHealthIcon()}
          </div>

          {/* Tree Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {tree.name || `Cây ${tree.variety || tree.zoneName || tree.id.slice(0, 8)}`}
              </h3>
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-600">
              {tree.zoneCode && (
                <span className="flex items-center">
                  <MapPinIcon className="h-3 w-3 mr-1" />
                  Khu {tree.zoneCode}
                </span>
              )}
              <span>Trồng: {formatDate(tree.plantingDate)}</span>
              <span>
                Trái: {totalFruits.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Health Status */}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(tree.healthStatus)}`}>
            {tree.healthStatus || 'Chưa đánh giá'}
          </span>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect?.(tree)
                }}
                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                title="Xem chi tiết"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(tree)
                }}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Chỉnh sửa"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Additional info when selected */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Chiều cao:</span>
              <div className="font-medium">{tree.treeHeight ? `${tree.treeHeight}m` : 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500">Đường kính:</span>
              <div className="font-medium">{tree.trunkDiameter ? `${tree.trunkDiameter}cm` : 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500">Phân bón:</span>
              <div className="font-medium">{formatDate(tree.fertilizedDate)}</div>
            </div>
            <div>
              <span className="text-gray-500">Tỉa cành:</span>
              <div className="font-medium">{formatDate(tree.prunedDate)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}