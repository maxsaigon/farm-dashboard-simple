'use client'

import { useState, useEffect } from 'react'
import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
      if (!navigator.onLine) {
        setShowIndicator(true)
      } else {
        // Delay hiding to show "back online" briefly
        setTimeout(() => setShowIndicator(false), 2000)
      }
    }

    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  if (!showIndicator) return null

  return (
    <div className={`fixed top-16 left-4 right-4 z-50 p-3 rounded-lg shadow-lg backdrop-blur ${
      isOnline ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
    }`}>
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <WifiIcon className="h-5 w-5" />
        ) : (
          <ExclamationTriangleIcon className="h-5 w-5" />
        )}
        <span className="text-sm font-medium">
          {isOnline ? 'Đã kết nối lại internet' : 'Chế độ offline - Dữ liệu được lưu cục bộ'}
        </span>
      </div>
    </div>
  )
}