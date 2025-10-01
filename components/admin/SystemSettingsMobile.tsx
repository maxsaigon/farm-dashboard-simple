'use client'

import { useState, useEffect } from 'react'
import {
  Cog6ToothIcon, BellIcon, ShieldCheckIcon,
  GlobeAltIcon, ServerIcon, KeyIcon
} from '@heroicons/react/24/outline'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface SystemSettings {
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    smsNotifications: boolean
    maintenanceAlerts: boolean
  }
  security: {
    requireStrongPasswords: boolean
    enableTwoFactor: boolean
    sessionTimeout: number
    loginAttempts: number
  }
  system: {
    maintenanceMode: boolean
    debugMode: boolean
    logLevel: string
    backupFrequency: string
  }
}

export default function SystemSettingsMobile() {
  const [settings, setSettings] = useState<SystemSettings>({
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      maintenanceAlerts: true
    },
    security: {
      requireStrongPasswords: true,
      enableTwoFactor: false,
      sessionTimeout: 30,
      loginAttempts: 5
    },
    system: {
      maintenanceMode: false,
      debugMode: false,
      logLevel: 'info',
      backupFrequency: 'daily'
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const settingsDoc = await getDoc(doc(db, 'system', 'settings'))

      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        setSettings({
          notifications: data.notifications || settings.notifications,
          security: data.security || settings.security,
          system: data.system || settings.system
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const settingsRef = doc(db, 'system', 'settings')

      await setDoc(settingsRef, {
        ...settings,
        updatedAt: new Date(),
        updatedBy: 'admin' // You would get this from current user
      })

      alert('Cài đặt đã được lưu thành công!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Lỗi khi lưu cài đặt. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const toggleSetting = (category: keyof typeof settings, setting: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting as keyof typeof prev[typeof category]]
      }
    }))
  }

  const SettingSection = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white rounded-lg border mb-4">
      <div className="p-4 border-b">
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="font-semibold">{title}</h3>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Cài đặt hệ thống</h2>
          <p className="text-gray-600">Quản lý cấu hình và bảo mật</p>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải cài đặt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Cài đặt hệ thống</h2>
        <p className="text-gray-600">Quản lý cấu hình và bảo mật</p>
      </div>

      {/* Notifications */}
      <SettingSection title="Thông báo" icon={BellIcon}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Email notifications</span>
            <button
              onClick={() => toggleSetting('notifications', 'emailNotifications')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notifications.emailNotifications ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                settings.notifications.emailNotifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span>Push notifications</span>
            <button
              onClick={() => toggleSetting('notifications', 'pushNotifications')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notifications.pushNotifications ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                settings.notifications.pushNotifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </SettingSection>

      {/* Security */}
      <SettingSection title="Bảo mật" icon={ShieldCheckIcon}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Yêu cầu mật khẩu mạnh</span>
            <button
              onClick={() => toggleSetting('security', 'requireStrongPasswords')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.security.requireStrongPasswords ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                settings.security.requireStrongPasswords ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Thời gian timeout phiên (phút)
            </label>
            <input
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                security: {
                  ...prev.security,
                  sessionTimeout: parseInt(e.target.value)
                }
              }))}
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
      </SettingSection>

      {/* System */}
      <SettingSection title="Hệ thống" icon={Cog6ToothIcon}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span>Chế độ bảo trì</span>
              <p className="text-sm text-gray-600">Tạm dừng hệ thống</p>
            </div>
            <button
              onClick={() => toggleSetting('system', 'maintenanceMode')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.system.maintenanceMode ? 'bg-red-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                settings.system.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tần suất sao lưu
            </label>
            <select
              className="w-full p-2 border rounded-lg"
              value={settings.system.backupFrequency}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                system: {
                  ...prev.system,
                  backupFrequency: e.target.value
                }
              }))}
            >
              <option value="daily">Hàng ngày</option>
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
            </select>
          </div>
        </div>
      </SettingSection>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className={`w-full py-3 rounded-lg font-semibold ${
          saving
            ? 'bg-gray-400 text-gray-600'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
      </button>
    </div>
  )
}