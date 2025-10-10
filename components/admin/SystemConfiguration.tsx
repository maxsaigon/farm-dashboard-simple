'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { 
  Cog6ToothIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  BellIcon,
  CircleStackIcon,
  CloudIcon,
  KeyIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface SystemSettings {
  general: {
    siteName: string
    siteDescription: string
    defaultLanguage: string
    defaultTimezone: string
    maintenanceMode: boolean
    maintenanceMessage: string
  }
  security: {
    passwordMinLength: number
    passwordRequireSpecialChars: boolean
    sessionTimeoutMinutes: number
    maxLoginAttempts: number
    lockoutDurationMinutes: number
    enableTwoFactor: boolean
    enableAuditLogging: boolean
    allowedDomains: string[]
  }
  notifications: {
    emailEnabled: boolean
    smsEnabled: boolean
    pushEnabled: boolean
    defaultSender: string
    smtpHost: string
    smtpPort: number
    smtpUsername: string
    smtpPassword: string
  }
  storage: {
    provider: 'firebase' | 'aws' | 'local'
    maxFileSize: number
    allowedFileTypes: string[]
    compressionEnabled: boolean
    backupEnabled: boolean
    backupFrequency: 'daily' | 'weekly' | 'monthly'
  }
  api: {
    rateLimit: number
    enableCors: boolean
    allowedOrigins: string[]
    apiKeyRequired: boolean
    webhookEnabled: boolean
    webhookUrl: string
  }
}

interface ConfigSection {
  id: keyof SystemSettings
  name: string
  description: string
  icon: any
  color: string
}

export default function SystemConfiguration() {
  const { user } = useSimpleAuth()
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      siteName: 'Farm Management System',
      siteDescription: 'Comprehensive farm and user management platform',
      defaultLanguage: 'en',
      defaultTimezone: 'UTC',
      maintenanceMode: false,
      maintenanceMessage: 'System is under maintenance. Please check back later.'
    },
    security: {
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      sessionTimeoutMinutes: 480,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30,
      enableTwoFactor: false,
      enableAuditLogging: true,
      allowedDomains: []
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      defaultSender: 'noreply@farmmanagement.com',
      smtpHost: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: ''
    },
    storage: {
      provider: 'firebase',
      maxFileSize: 10,
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'csv', 'xlsx'],
      compressionEnabled: true,
      backupEnabled: true,
      backupFrequency: 'daily'
    },
    api: {
      rateLimit: 1000,
      enableCors: true,
      allowedOrigins: [],
      apiKeyRequired: false,
      webhookEnabled: false,
      webhookUrl: ''
    }
  })

  const [activeSection, setActiveSection] = useState<keyof SystemSettings>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const configSections: ConfigSection[] = [
    {
      id: 'general',
      name: 'General Settings',
      description: 'Basic system configuration',
      icon: Cog6ToothIcon,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'security',
      name: 'Security',
      description: 'Authentication and security policies',
      icon: ShieldCheckIcon,
      color: 'bg-red-100 text-red-600'
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Email, SMS, and push notification settings',
      icon: BellIcon,
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      id: 'storage',
      name: 'Storage & Backup',
      description: 'File storage and backup configuration',
      icon: CircleStackIcon,
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'api',
      name: 'API & Integrations',
      description: 'API settings and external integrations',
      icon: CloudIcon,
      color: 'bg-purple-100 text-purple-600'
    }
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      // Mock loading - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Settings are already initialized with default values
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      // Mock saving - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLastSaved(new Date())
      
      // Show success message
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      return
    }

    // Reset to default values
    setSettings({
      general: {
        siteName: 'Farm Management System',
        siteDescription: 'Comprehensive farm and user management platform',
        defaultLanguage: 'en',
        defaultTimezone: 'UTC',
        maintenanceMode: false,
        maintenanceMessage: 'System is under maintenance. Please check back later.'
      },
      security: {
        passwordMinLength: 8,
        passwordRequireSpecialChars: true,
        sessionTimeoutMinutes: 480,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 30,
        enableTwoFactor: false,
        enableAuditLogging: true,
        allowedDomains: []
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        defaultSender: 'noreply@farmmanagement.com',
        smtpHost: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: ''
      },
      storage: {
        provider: 'firebase',
        maxFileSize: 10,
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'csv', 'xlsx'],
        compressionEnabled: true,
        backupEnabled: true,
        backupFrequency: 'daily'
      },
      api: {
        rateLimit: 1000,
        enableCors: true,
        allowedOrigins: [],
        apiKeyRequired: false,
        webhookEnabled: false,
        webhookUrl: ''
      }
    })
  }

  const updateSettings = (section: keyof SystemSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
        <input
          type="text"
          value={settings.general.siteName}
          onChange={(e) => updateSettings('general', 'siteName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
        <textarea
          value={settings.general.siteDescription}
          onChange={(e) => updateSettings('general', 'siteDescription', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Language</label>
          <select
            value={settings.general.defaultLanguage}
            onChange={(e) => updateSettings('general', 'defaultLanguage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="vi">Vietnamese</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Timezone</label>
          <select
            value={settings.general.defaultTimezone}
            onChange={(e) => updateSettings('general', 'defaultTimezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Asia/Ho_Chi_Minh">Vietnam Time</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-medium text-gray-900">Maintenance Mode</h4>
            <p className="text-sm text-gray-500">Enable to temporarily disable access to the system</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.general.maintenanceMode}
              onChange={(e) => updateSettings('general', 'maintenanceMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {settings.general.maintenanceMode && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Message</label>
            <textarea
              value={settings.general.maintenanceMessage}
              onChange={(e) => updateSettings('general', 'maintenanceMessage', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password Min Length</label>
          <input
            type="number"
            min="6"
            max="32"
            value={settings.security.passwordMinLength}
            onChange={(e) => updateSettings('security', 'passwordMinLength', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
          <input
            type="number"
            min="30"
            max="1440"
            value={settings.security.sessionTimeoutMinutes}
            onChange={(e) => updateSettings('security', 'sessionTimeoutMinutes', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
          <input
            type="number"
            min="3"
            max="10"
            value={settings.security.maxLoginAttempts}
            onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Lockout Duration (minutes)</label>
          <input
            type="number"
            min="5"
            max="120"
            value={settings.security.lockoutDurationMinutes}
            onChange={(e) => updateSettings('security', 'lockoutDurationMinutes', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Require Special Characters in Passwords</h4>
            <p className="text-xs text-gray-500">Passwords must contain at least one special character</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.passwordRequireSpecialChars}
              onChange={(e) => updateSettings('security', 'passwordRequireSpecialChars', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Enable Two-Factor Authentication</h4>
            <p className="text-xs text-gray-500">Require 2FA for all admin users</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.enableTwoFactor}
              onChange={(e) => updateSettings('security', 'enableTwoFactor', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Enable Audit Logging</h4>
            <p className="text-xs text-gray-500">Log all admin actions for security auditing</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.enableAuditLogging}
              onChange={(e) => updateSettings('security', 'enableAuditLogging', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>
    </div>
  )

  // Continue with other render functions in next part...
  const renderCurrentSection = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings()
      case 'security':
        return renderSecuritySettings()
      case 'notifications':
        return <div className="p-6 bg-gray-50 rounded-lg"><p className="text-gray-600">Notification settings coming soon...</p></div>
      case 'storage':
        return <div className="p-6 bg-gray-50 rounded-lg"><p className="text-gray-600">Storage settings coming soon...</p></div>
      case 'api':
        return <div className="p-6 bg-gray-50 rounded-lg"><p className="text-gray-600">API settings coming soon...</p></div>
      default:
        return renderGeneralSettings()
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-600">Configure global system settings and preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {configSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className={`p-2 rounded-lg mr-3 ${section.color}`}>
                  <section.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{section.name}</div>
                  <div className="text-xs text-gray-500">{section.description}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {configSections.find(s => s.id === activeSection)?.name}
              </h2>
              <p className="text-gray-600">
                {configSections.find(s => s.id === activeSection)?.description}
              </p>
            </div>

            {renderCurrentSection()}
          </div>
        </div>
      </div>
    </div>
  )
}