'use client'

import { useState, useEffect } from 'react'
import { 
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  ClockIcon,
  CircleStackIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface SystemSettings {
  notifications: {
    emailEnabled: boolean
    pushEnabled: boolean
    smsEnabled: boolean
    alertTypes: string[]
  }
  security: {
    maxLoginAttempts: number
    sessionTimeout: number
    requireEmailVerification: boolean
    enableTwoFactor: boolean
  }
  system: {
    backupFrequency: string
    dataRetention: number
    maintenanceWindow: string
    maxUsersPerFarm: number
  }
  features: {
    gpsTracking: boolean
    aiAnalysis: boolean
    weatherIntegration: boolean
    reportGeneration: boolean
  }
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    notifications: {
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      alertTypes: ['zone_entry', 'zone_exit', 'system_error']
    },
    security: {
      maxLoginAttempts: 5,
      sessionTimeout: 24,
      requireEmailVerification: true,
      enableTwoFactor: false
    },
    system: {
      backupFrequency: 'daily',
      dataRetention: 365,
      maintenanceWindow: '02:00-04:00',
      maxUsersPerFarm: 50
    },
    features: {
      gpsTracking: true,
      aiAnalysis: true,
      weatherIntegration: false,
      reportGeneration: true
    }
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateNotificationSetting = (key: keyof SystemSettings['notifications'], value: any) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
  }

  const updateSecuritySetting = (key: keyof SystemSettings['security'], value: any) => {
    setSettings(prev => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }))
  }

  const updateSystemSetting = (key: keyof SystemSettings['system'], value: any) => {
    setSettings(prev => ({
      ...prev,
      system: { ...prev.system, [key]: value }
    }))
  }

  const updateFeatureSetting = (key: keyof SystemSettings['features'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      features: { ...prev.features, [key]: value }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cài đặt hệ thống</h2>
          <p className="text-gray-600 mt-1">Cấu hình toàn bộ hệ thống Farm Manager</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            saved 
              ? 'bg-green-600 text-white' 
              : 'bg-green-600 text-white hover:bg-green-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Đang lưu...' : saved ? '✓ Đã lưu' : 'Lưu cài đặt'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <BellIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Thông báo</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Email thông báo</label>
              <input
                type="checkbox"
                checked={settings.notifications.emailEnabled}
                onChange={(e) => updateNotificationSetting('emailEnabled', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Push notification</label>
              <input
                type="checkbox"
                checked={settings.notifications.pushEnabled}
                onChange={(e) => updateNotificationSetting('pushEnabled', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">SMS thông báo</label>
              <input
                type="checkbox"
                checked={settings.notifications.smsEnabled}
                onChange={(e) => updateNotificationSetting('smsEnabled', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại cảnh báo
              </label>
              <div className="space-y-2">
                {[
                  { key: 'zone_entry', label: 'Vào zone' },
                  { key: 'zone_exit', label: 'Ra zone' },
                  { key: 'system_error', label: 'Lỗi hệ thống' },
                  { key: 'maintenance', label: 'Bảo trì' }
                ].map((alert) => (
                  <div key={alert.key} className="flex items-center">
                    <input
                      type="checkbox"
                      id={alert.key}
                      checked={settings.notifications.alertTypes.includes(alert.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateNotificationSetting('alertTypes', [...settings.notifications.alertTypes, alert.key])
                        } else {
                          updateNotificationSetting('alertTypes', settings.notifications.alertTypes.filter(t => t !== alert.key))
                        }
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor={alert.key} className="ml-2 text-sm text-gray-700">
                      {alert.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Bảo mật</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lần đăng nhập tối đa
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.security.maxLoginAttempts}
                onChange={(e) => updateSecuritySetting('maxLoginAttempts', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian phiên (giờ)
              </label>
              <select
                value={settings.security.sessionTimeout}
                onChange={(e) => updateSecuritySetting('sessionTimeout', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={1}>1 giờ</option>
                <option value={8}>8 giờ</option>
                <option value={24}>24 giờ</option>
                <option value={168}>7 ngày</option>
                <option value={720}>30 ngày</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Yêu cầu xác thực email</label>
              <input
                type="checkbox"
                checked={settings.security.requireEmailVerification}
                onChange={(e) => updateSecuritySetting('requireEmailVerification', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Bật xác thực 2 lớp</label>
              <input
                type="checkbox"
                checked={settings.security.enableTwoFactor}
                onChange={(e) => updateSecuritySetting('enableTwoFactor', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <CircleStackIcon className="h-6 w-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Hệ thống</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tần suất backup
              </label>
              <select
                value={settings.system.backupFrequency}
                onChange={(e) => updateSystemSetting('backupFrequency', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="hourly">Hàng giờ</option>
                <option value="daily">Hàng ngày</option>
                <option value="weekly">Hàng tuần</option>
                <option value="monthly">Hàng tháng</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lưu trữ dữ liệu (ngày)
              </label>
              <input
                type="number"
                min="30"
                max="3650"
                value={settings.system.dataRetention}
                onChange={(e) => updateSystemSetting('dataRetention', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khung giờ bảo trì
              </label>
              <input
                type="text"
                value={settings.system.maintenanceWindow}
                onChange={(e) => updateSystemSetting('maintenanceWindow', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="02:00-04:00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tối đa người dùng/nông trại
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={settings.system.maxUsersPerFarm}
                onChange={(e) => updateSystemSetting('maxUsersPerFarm', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Feature Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Cog6ToothIcon className="h-6 w-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Tính năng</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">GPS Tracking</label>
                <p className="text-xs text-gray-500">Theo dõi vị trí người dùng</p>
              </div>
              <input
                type="checkbox"
                checked={settings.features.gpsTracking}
                onChange={(e) => updateFeatureSetting('gpsTracking', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Phân tích AI</label>
                <p className="text-xs text-gray-500">Phân tích ảnh và dữ liệu</p>
              </div>
              <input
                type="checkbox"
                checked={settings.features.aiAnalysis}
                onChange={(e) => updateFeatureSetting('aiAnalysis', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Tích hợp thời tiết</label>
                <p className="text-xs text-gray-500">Dữ liệu thời tiết tự động</p>
              </div>
              <input
                type="checkbox"
                checked={settings.features.weatherIntegration}
                onChange={(e) => updateFeatureSetting('weatherIntegration', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Tạo báo cáo</label>
                <p className="text-xs text-gray-500">Xuất báo cáo tự động</p>
              </div>
              <input
                type="checkbox"
                checked={settings.features.reportGeneration}
                onChange={(e) => updateFeatureSetting('reportGeneration', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Thông tin hệ thống</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">v1.0.0</div>
              <div className="text-sm text-gray-600">Phiên bản</div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">24/7</div>
              <div className="text-sm text-gray-600">Hỗ trợ</div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Lưu ý quan trọng</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Thay đổi cài đặt hệ thống có thể ảnh hưởng đến toàn bộ ứng dụng. 
                Vui lòng kiểm tra kỹ trước khi lưu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}