import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { DataReconciliationService, ReconciliationResult } from '@/lib/data-reconciliation-service'
import { Tree } from '@/lib/types'

export interface UseDataReconciliationReturn {
  reconciliationResult: ReconciliationResult | null
  loading: boolean
  error: string | null
  needsReconciliation: boolean
  refreshReconciliation: () => Promise<void>
  migrateMissingTrees: () => Promise<number>
  isMigrating: boolean
}

export function useDataReconciliation(): UseDataReconciliationReturn {
  const { user, currentFarm } = useSimpleAuth()
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMigrating, setIsMigrating] = useState(false)

  const refreshReconciliation = async () => {
    if (!user?.uid || !currentFarm?.id) {
      setReconciliationResult(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await DataReconciliationService.compareTreesForFarm(currentFarm.id, user.uid)
      setReconciliationResult(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check data reconciliation'
      setError(errorMessage)
      console.error('Error refreshing reconciliation:', err)
    } finally {
      setLoading(false)
    }
  }

  const migrateMissingTrees = async (): Promise<number> => {
    if (!currentFarm?.id || !reconciliationResult) {
      return 0
    }

    setIsMigrating(true)
    try {
      const migratedCount = await DataReconciliationService.migrateMissingTrees(
        currentFarm.id,
        reconciliationResult.missingInWeb
      )

      // Refresh reconciliation data after migration
      await refreshReconciliation()

      return migratedCount
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to migrate trees'
      setError(errorMessage)
      console.error('Error migrating trees:', err)
      return 0
    } finally {
      setIsMigrating(false)
    }
  }

  useEffect(() => {
    refreshReconciliation()
  }, [user?.uid, currentFarm?.id])

  const needsReconciliation = reconciliationResult ?
    (reconciliationResult.summary.treesToMigrate > 0 || reconciliationResult.summary.treesWithConflicts > 0) :
    false

  return {
    reconciliationResult,
    loading,
    error,
    needsReconciliation,
    refreshReconciliation,
    migrateMissingTrees,
    isMigrating
  }
}