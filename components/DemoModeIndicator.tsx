'use client'

import { useState, useEffect } from 'react'
import { ExclamationTriangleIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export default function DemoModeIndicator() {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Check if we're in demo mode by looking for demo farm or Firebase warnings
    const checkDemoMode = () => {
      // Check localStorage for demo indicators
      const hasFirebaseConfig = !!(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key'
      )
      
      if (!hasFirebaseConfig) {
        setIsDemoMode(true)
      }
    }

    checkDemoMode()
    
    // Also listen for console messages about demo mode
    const originalConsoleWarn = console.warn
    console.warn = (...args) => {
      if (args.some(arg => typeof arg === 'string' && arg.includes('🔥'))) {
        setIsDemoMode(true)
      }
      originalConsoleWarn.apply(console, args)
    }

    return () => {
      console.warn = originalConsoleWarn
    }
  }, [])

  // Don't show if not in demo mode or user has dismissed
  if (!isDemoMode || !isVisible) {
    return null
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 mb-1">
                🧪 Chế độ Demo
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                Ứng dụng đang chạy ở chế độ demo với dữ liệu mẫu. 
                Tất cả tính năng UI hoạt động bình thường.
              </p>
              <div className="space-y-1 text-xs text-amber-600">
                <div>✅ Giao diện người dùng</div>
                <div>✅ Điều hướng và menu</div>
                <div>✅ Hệ thống admin</div>
                <div>⚠️ Dữ liệu không được lưu vĩnh viễn</div>
              </div>
              <details className="mt-3">
                <summary className="text-xs text-amber-600 cursor-pointer hover:text-amber-800">
                  Cách kích hoạt Firebase →
                </summary>
                <div className="mt-2 text-xs text-amber-600 space-y-1 pl-4">
                  <div>1. Sao chép .env.local.template thành .env.local</div>
                  <div>2. Thêm thông tin Firebase project</div>
                  <div>3. Khởi động lại server</div>
                </div>
              </details>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
            aria-label="Đóng thông báo"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}