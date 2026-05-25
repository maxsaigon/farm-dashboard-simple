'use client'

import { useEffect, useState } from 'react'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { OfflineSyncService } from '@/lib/offline-sync-service'

export default function PWARegistration() {
  const { user, currentFarm } = useSimpleAuth()
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  
  // Sync state
  const [syncStatus, setSyncStatus] = useState<{
    message: string
    type: 'success' | 'info' | 'error' | null
  }>({ message: '', type: null })

  // 1. Service Worker Registration & Update Handling
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handleWaiting = (registration: ServiceWorkerRegistration) => {
      const worker = registration.waiting
      if (worker) {
        setWaitingWorker(worker)
        setShowUpdateBanner(true)
      }
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered with scope:', registration.scope)

        if (registration.waiting) {
          handleWaiting(registration)
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                handleWaiting(registration)
              }
            })
          }
        })
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error)
      })

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  // 2. Offline Photo Sync Trigger
  useEffect(() => {
    if (!user || !currentFarm) return

    const triggerSync = async () => {
      try {
        await OfflineSyncService.syncPendingPhotos(
          user.uid,
          currentFarm.id,
          (msg, type) => {
            setSyncStatus({ message: msg, type })
            // Clear success messages after 4 seconds
            if (type === 'success') {
              setTimeout(() => setSyncStatus({ message: '', type: null }), 4000)
            }
          }
        )
      } catch (error) {
        console.error('[Sync] Sync failed', error)
      }
    }

    // Run sync on mount/auth load
    triggerSync()

    // Run sync when connection goes online
    window.addEventListener('online', triggerSync)
    return () => window.removeEventListener('online', triggerSync)
  }, [user, currentFarm])

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    } else {
      window.location.reload()
    }
  }

  return (
    <>
      {/* 1. App Update Banner */}
      {showUpdateBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-[9999] md:left-auto md:right-4 md:w-96 animate-fade-in-up">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-green-200/60 dark:border-green-800/60 p-4 rounded-2xl shadow-2xl flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 dark:bg-green-950 p-2.5 rounded-xl text-green-600 dark:text-green-400 text-lg">
                ✨
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-950 dark:text-white">Cập nhật ứng dụng</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phiên bản mới đã sẵn sàng.</p>
              </div>
            </div>
            <button
              onClick={handleUpdate}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Cập nhật
            </button>
          </div>
        </div>
      )}

      {/* 2. Photo Synchronization Toast */}
      {syncStatus.type && (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-4 md:w-96 animate-fade-in-up">
          <div className={`p-4 rounded-2xl shadow-2xl flex items-center space-x-3 border backdrop-blur-md ${
            syncStatus.type === 'success' 
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' 
              : syncStatus.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-800'
              : 'bg-blue-50/95 border-blue-200 text-blue-800'
          }`}>
            <div className="text-lg">
              {syncStatus.type === 'success' ? '✅' : syncStatus.type === 'error' ? '❌' : '🔄'}
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                {syncStatus.type === 'success' ? 'Hoàn thành' : syncStatus.type === 'error' ? 'Lỗi đồng bộ' : 'Đồng bộ ảnh'}
              </h4>
              <p className="text-sm font-medium mt-0.5">{syncStatus.message}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
