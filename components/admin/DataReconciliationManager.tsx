'use client'

import React, { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { DataReconciliationService, ReconciliationResult } from '@/lib/data-reconciliation-service'
import { FarmService } from '@/lib/farm-service'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  InformationCircleIcon,
  EyeIcon,
  ServerStackIcon
} from '@heroicons/react/24/outline'

interface FarmReconciliationStatus {
  farmId: string
  farmName: string
  result: ReconciliationResult | null
  loading: boolean
  error: string | null
}

export function DataReconciliationManager() {
  const { user } = useSimpleAuth()
  const [farmStatuses, setFarmStatuses] = useState<FarmReconciliationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [globalMigrating, setGlobalMigrating] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      loadAllFarmStatuses()
    }
  }, [user])

  const loadAllFarmStatuses = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get all farms the user has access to
      const farms = await FarmService.getUserFarms(user.uid)

      const statuses: FarmReconciliationStatus[] = []

      for (const farm of farms) {
        try {
          const result = await DataReconciliationService.compareTreesForFarm(farm.id, user.uid)
          statuses.push({
            farmId: farm.id,
            farmName: farm.name,
            result,
            loading: false,
            error: null
          })
        } catch (error) {
          statuses.push({
            farmId: farm.id,
            farmName: farm.name,
            result: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      setFarmStatuses(statuses)
    } catch (error) {
      console.error('Error loading farm statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  const migrateFarmTrees = async (farmId: string) => {
    const status = farmStatuses.find(s => s.farmId === farmId)
    if (!status?.result) return 0

    setGlobalMigrating(prev => new Set(prev).add(farmId))

    try {
      const migratedCount = await DataReconciliationService.migrateMissingTrees(
        farmId,
        status.result.missingInWeb
      )

      // Refresh the status
      const updatedResult = await DataReconciliationService.compareTreesForFarm(farmId, user.uid)
      setFarmStatuses(prev => prev.map(s =>
        s.farmId === farmId
          ? { ...s, result: updatedResult, loading: false, error: null }
          : s
      ))

      return migratedCount
    } catch (error) {
      console.error(`Error migrating trees for farm ${farmId}:`, error)
      setFarmStatuses(prev => prev.map(s =>
        s.farmId === farmId
          ? { ...s, error: error instanceof Error ? error.message : 'Migration failed' }
          : s
      ))
      return 0
    } finally {
      setGlobalMigrating(prev => {
        const newSet = new Set(prev)
        newSet.delete(farmId)
        return newSet
      })
    }
  }

  const getTotalSummary = () => {
    return farmStatuses.reduce((acc, status) => {
      if (status.result) {
        acc.treesToMigrate += status.result.summary.treesToMigrate
        acc.treesWithConflicts += status.result.summary.treesWithConflicts
        acc.treesOnlyInWeb += status.result.summary.treesOnlyInWeb
        acc.treesOnlyInIos += status.result.summary.treesOnlyInIos
      }
      return acc
    }, { treesToMigrate: 0, treesWithConflicts: 0, treesOnlyInWeb: 0, treesOnlyInIos: 0 })
  }

  const totalSummary = getTotalSummary()
  const needsReconciliation = totalSummary.treesToMigrate > 0 || totalSummary.treesWithConflicts > 0

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Đang tải trạng thái đồng bộ dữ liệu...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ServerStackIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quản lý đồng bộ dữ liệu</h2>
            <p className="text-sm text-gray-600">Đồng bộ dữ liệu cây từ iOS app và web app</p>
          </div>
        </div>
        <button
          onClick={loadAllFarmStatuses}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <ArrowPathIcon className="h-4 w-4" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Global Summary */}
      <div className={`p-4 rounded-lg mb-6 ${needsReconciliation ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-center space-x-3 mb-3">
          {needsReconciliation ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
          ) : (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          )}
          <h3 className={`font-semibold ${needsReconciliation ? 'text-orange-800' : 'text-green-800'}`}>
            {needsReconciliation ? 'Cần đồng bộ dữ liệu' : 'Dữ liệu đã đồng bộ'}
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className={`text-lg font-bold ${needsReconciliation ? 'text-orange-600' : 'text-green-600'}`}>
              {totalSummary.treesToMigrate}
            </div>
            <div className={needsReconciliation ? 'text-orange-700' : 'text-green-700'}>
              Cần di chuyển
            </div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${needsReconciliation ? 'text-orange-600' : 'text-green-600'}`}>
              {totalSummary.treesWithConflicts}
            </div>
            <div className={needsReconciliation ? 'text-orange-700' : 'text-green-700'}>
              Có xung đột
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {totalSummary.treesOnlyInWeb}
            </div>
            <div className="text-blue-700">Chỉ trong web</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {totalSummary.treesOnlyInIos}
            </div>
            <div className="text-purple-700">Chỉ trong iOS</div>
          </div>
        </div>
      </div>

      {/* Farm-by-farm status */}
      <div className="space-y-4">
        {farmStatuses.map(status => (
          <div key={status.farmId} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h4 className="font-semibold text-gray-900">{status.farmName}</h4>
                {status.loading && (
                  <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin" />
                )}
              </div>

              <div className="flex items-center space-x-2">
                {status.result && (
                  <button
                    onClick={() => {/* Show detailed view */}}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 flex items-center space-x-1"
                  >
                    <EyeIcon className="h-3 w-3" />
                    <span>Chi tiết</span>
                  </button>
                )}

                {status.result && status.result.summary.treesToMigrate > 0 && (
                  <button
                    onClick={() => migrateFarmTrees(status.farmId)}
                    disabled={globalMigrating.has(status.farmId)}
                    className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:bg-gray-400 flex items-center space-x-1"
                  >
                    {globalMigrating.has(status.farmId) ? (
                      <>
                        <ArrowPathIcon className="h-3 w-3 animate-spin" />
                        <span>Đang di chuyển...</span>
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="h-3 w-3" />
                        <span>Đồng bộ ({status.result.summary.treesToMigrate})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {status.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">Lỗi: {status.error}</p>
              </div>
            ) : status.result ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="text-center p-2 bg-orange-50 rounded">
                  <div className="font-medium text-orange-800">{status.result.summary.treesToMigrate}</div>
                  <div className="text-orange-700">Cần di chuyển</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-medium text-yellow-800">{status.result.summary.treesWithConflicts}</div>
                  <div className="text-yellow-700">Có xung đột</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-medium text-blue-800">{status.result.summary.treesOnlyInWeb}</div>
                  <div className="text-blue-700">Chỉ web</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="font-medium text-purple-800">{status.result.summary.treesOnlyInIos}</div>
                  <div className="text-purple-700">Chỉ iOS</div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <p className="text-sm text-gray-600">Đang tải...</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {farmStatuses.length === 0 && (
        <div className="text-center py-12">
          <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không có nông trại nào</h3>
          <p className="text-gray-600">Bạn chưa có quyền truy cập nông trại nào để quản lý đồng bộ dữ liệu.</p>
        </div>
      )}
    </div>
  )
}