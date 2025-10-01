'use client'

import React from 'react'
import { useDataReconciliation } from '@/lib/hooks/use-data-reconciliation'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface DataReconciliationStatusProps {
  className?: string
  showDetails?: boolean
}

export function DataReconciliationStatus({ className = '', showDetails = true }: DataReconciliationStatusProps) {
  const {
    reconciliationResult,
    loading,
    error,
    needsReconciliation,
    refreshReconciliation,
    migrateMissingTrees,
    isMigrating
  } = useDataReconciliation()

  if (loading) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-medium text-blue-800">Đang kiểm tra dữ liệu...</p>
            <p className="text-xs text-blue-600">So sánh dữ liệu từ iOS và web app</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">Lỗi kiểm tra dữ liệu</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
          <button
            onClick={refreshReconciliation}
            className="ml-auto px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  if (!reconciliationResult) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-gray-600" />
          <div>
            <p className="text-sm font-medium text-gray-800">Không thể kiểm tra dữ liệu</p>
            <p className="text-xs text-gray-600">Chưa có thông tin nông trại</p>
          </div>
        </div>
      </div>
    )
  }

  const { summary } = reconciliationResult

  if (!needsReconciliation) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Dữ liệu đồng bộ</p>
            <p className="text-xs text-green-600">
              Tất cả cây đã được đồng bộ giữa iOS và web app
            </p>
          </div>
          <button
            onClick={refreshReconciliation}
            className="ml-auto px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            title="Kiểm tra lại"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-orange-800">Cần đồng bộ dữ liệu</p>
          <p className="text-xs text-orange-600 mb-3">
            Phát hiện dữ liệu cây chưa được đồng bộ giữa iOS và web app
          </p>

          {showDetails && (
            <div className="space-y-2 mb-3">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-orange-700">Cây cần di chuyển:</span>
                  <span className="font-medium text-orange-800">{summary.treesToMigrate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700">Cây có xung đột:</span>
                  <span className="font-medium text-orange-800">{summary.treesWithConflicts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700">Chỉ có trong web:</span>
                  <span className="font-medium text-orange-800">{summary.treesOnlyInWeb}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700">Chỉ có trong iOS:</span>
                  <span className="font-medium text-orange-800">{summary.treesOnlyInIos}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={migrateMissingTrees}
              disabled={isMigrating || summary.treesToMigrate === 0}
              className="flex-1 px-3 py-2 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
            >
              {isMigrating ? (
                <>
                  <ArrowPathIcon className="h-3 w-3 animate-spin" />
                  <span>Đang di chuyển...</span>
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="h-3 w-3" />
                  <span>Đồng bộ dữ liệu</span>
                </>
              )}
            </button>

            <button
              onClick={refreshReconciliation}
              disabled={isMigrating}
              className="px-3 py-2 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Làm mới"
            >
              <ArrowPathIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}