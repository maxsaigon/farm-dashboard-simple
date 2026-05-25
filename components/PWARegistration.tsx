'use client'

import { useEffect, useState } from 'react'

export default function PWARegistration() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

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

    // Register the main service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered with scope:', registration.scope)

        // Check if there is already a waiting worker
        if (registration.waiting) {
          handleWaiting(registration)
        }

        // Listen for new workers installing
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

    // Listen for controller changes to reload the page
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    } else {
      window.location.reload()
    }
  }

  if (!showUpdateBanner) return null

  return (
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
  )
}
