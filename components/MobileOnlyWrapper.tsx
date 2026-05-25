'use client'

import { useEffect, useState } from 'react'
import { DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

interface Props {
  children: React.ReactNode
}

export default function MobileOnlyWrapper({ children }: Props) {
  const [isMobile, setIsMobile] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const checkDeviceType = () => {
      // Check user agent for mobile devices
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileKeywords = [
        'mobile', 'android', 'iphone', 'ipad', 'ipod', 
        'blackberry', 'windows phone', 'opera mini',
        'iemobile', 'wpdesktop'
      ]
      
      const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword))
      
      // Check screen size (mobile if width < 768px)
      const isMobileScreen = window.innerWidth < 768
      
      // Check touch capability
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Consider it mobile if ANY of these conditions are true
      const isMobileDevice = isMobileUA || isMobileScreen || isTouchDevice
      
      setIsMobile(isMobileDevice)
      setIsLoading(false)
    }

    // Check on mount
    checkDeviceType()

    // Check on resize
    const handleResize = () => {
      const isMobileScreen = window.innerWidth < 768
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileKeywords = [
        'mobile', 'android', 'iphone', 'ipad', 'ipod', 
        'blackberry', 'windows phone', 'opera mini',
        'iemobile', 'wpdesktop'
      ]
      const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword))
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      setIsMobile(isMobileUA || isMobileScreen || isTouchDevice)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Show loading spinner while checking device type
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra thiết bị...</p>
        </div>
      </div>
    )
  }

  // Show mobile-only message for desktop users
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {/* Icon Animation */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center justify-center">
              <ComputerDesktopIcon className="w-24 h-24 text-red-300 animate-pulse" />
            </div>
            <div className="relative z-10 flex justify-center">
              <div className="bg-red-100 rounded-full p-4 animate-bounce">
                <DevicePhoneMobileIcon className="w-16 h-16 text-red-600" />
              </div>
            </div>
          </div>

          {/* Main Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Chỉ hỗ trợ thiết bị di động
          </h1>
          
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            Ứng dụng quản lý trang trại này được thiết kế đặc biệt cho điện thoại và máy tính bảng. 
            Vui lòng truy cập bằng thiết bị di động để có trải nghiệm tối ưu.
          </p>

          {/* Features List */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-200 mb-8">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-center">
              <DevicePhoneMobileIcon className="w-5 h-5 mr-2 text-green-600" />
              Tại sao cần thiết bị di động?
            </h3>
            <ul className="text-left space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">📱</span>
                <span>Chụp ảnh cây trồng trực tiếp tại vườn</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">📍</span>
                <span>Định vị GPS chính xác vị trí cây</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">👆</span>
                <span>Giao diện cảm ứng tối ưu cho thao tác nhanh</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">🔄</span>
                <span>Đồng bộ dữ liệu ngay cả khi offline</span>
              </li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl p-6 border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3">Cách truy cập:</h3>
            <div className="space-y-2 text-blue-800">
              <p>📱 <strong>Điện thoại:</strong> Mở trình duyệt và truy cập URL này</p>
              <p>📲 <strong>Máy tính bảng:</strong> Sử dụng Safari, Chrome hoặc Firefox</p>
              <p>💻 <strong>Máy tính:</strong> Bật chế độ Developer Tools và chọn mobile view</p>
            </div>
          </div>

          {/* QR Code Hint */}
          <div className="mt-8 p-4 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-600 text-sm">
              💡 <strong>Mẹo:</strong> Quét mã QR từ điện thoại để truy cập nhanh chóng
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show the app for mobile users
  return <>{children}</>
}