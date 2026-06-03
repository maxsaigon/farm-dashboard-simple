'use client'

import { Tree } from '@/lib/types'
import { 
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { TreeImagePreview } from './TreeImagePreview'
import { normalizeVariety, normalizeZone } from '@/lib/normalization'

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
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
    }
    if (['Excellent', 'Good'].includes(tree.healthStatus || '')) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />
    }
    return <ClockIcon className="h-4 w-4 text-yellow-500" />
  }

  const getAccentBorderClass = () => {
    if (tree.needsAttention || tree.healthStatus === 'Poor') {
      return 'border-l-red-500'
    }
    if (['Excellent', 'Good'].includes(tree.healthStatus || '')) {
      return 'border-l-emerald-500'
    }
    if (tree.healthStatus === 'Fair') {
      return 'border-l-amber-500'
    }
    return 'border-l-gray-300'
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
      className={`p-2.5 sm:p-3 border rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md border-l-4 ${getAccentBorderClass()} ${
        isSelected
          ? 'border-green-500 bg-green-50/20'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Tree Image Preview */}
          <div className="flex-shrink-0">
            <TreeImagePreview 
              treeId={tree.id}
              farmId={tree.farmId}
              qrCode={tree.qrCode}
              className="w-11 h-11"
            />
          </div>

          {/* Tree Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-0.5">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                {tree.name || `Cây ${normalizeVariety(tree.variety) || tree.id.slice(0, 8)}`}
              </h3>
              {tree.variety && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-100/50">
                  {normalizeVariety(tree.variety)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
             {tree.zoneName && (
               <span className="flex items-center">
                  <MapPinIcon className="h-3 w-3 mr-0.5 text-gray-400" />
                  {normalizeZone(tree.zoneName)}
                </span>
              )}
              <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:inline" />
              <span>Trồng: {formatDate(tree.plantingDate)}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>
                Trái: <span className="font-semibold text-gray-700">{totalFruits.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Health Icon + Edit Action */}
        <div className="flex items-center space-x-2 ml-2">
          {getHealthIcon()}
          
          {showActions && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(tree)
              }}
              className="p-1.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-gray-400 hover:text-green-600 transition-colors"
              title="Chỉnh sửa thông tin"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Additional info when selected */}
      {isSelected && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-gray-50/50 p-1.5 sm:p-2 rounded-lg border border-gray-100/80">
              <span className="text-gray-400 font-medium block">Chiều cao</span>
              <span className="font-semibold text-gray-700">{tree.treeHeight ? `${tree.treeHeight}m` : 'N/A'}</span>
            </div>
            <div className="bg-gray-50/50 p-1.5 sm:p-2 rounded-lg border border-gray-100/80">
              <span className="text-gray-400 font-medium block">Đường kính</span>
              <span className="font-semibold text-gray-700">{tree.trunkDiameter ? `${tree.trunkDiameter}cm` : 'N/A'}</span>
            </div>
            <div className="bg-gray-50/50 p-1.5 sm:p-2 rounded-lg border border-gray-100/80">
              <span className="text-gray-400 font-medium block">Phân bón</span>
              <span className="font-semibold text-gray-700 truncate block">{formatDate(tree.fertilizedDate)}</span>
            </div>
            <div className="bg-gray-50/50 p-1.5 sm:p-2 rounded-lg border border-gray-100/80">
              <span className="text-gray-400 font-medium block">Tỉa cành</span>
              <span className="font-semibold text-gray-700 truncate block">{formatDate(tree.prunedDate)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}