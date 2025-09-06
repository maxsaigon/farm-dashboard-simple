'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import {
  BuildingOfficeIcon,
  MapIcon,
  Cog6ToothIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import {
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  CheckCircleIcon as CheckCircleIconSolid
} from '@heroicons/react/24/solid'

interface EnhancedFarm {
  id: string
  name: string
  organizationId?: string
  farmType: 'personal' | 'commercial' | 'cooperative'
  status: 'active' | 'inactive' | 'archived'
  createdDate: Date
  settings: {
    timezone: string
    currency: string
    units: 'metric' | 'imperial'
    language: string
    enableGPSTracking: boolean
    enablePhotoGeotagging: boolean
    dataRetentionDays: number
    backupFrequency: 'daily' | 'weekly' | 'monthly'
  }
  contacts?: FarmContact[]
  certifications?: FarmCertification[]
  metadata?: Record<string, any>
  location?: {
    address?: string
    latitude?: number
    longitude?: number
    area?: number // in square meters
    boundaries?: { lat: number, lng: number }[]
  }
  description?: string
  establishedYear?: number
  ownerInfo?: {
    name: string
    email: string
    phone?: string
  }
}

interface Organization {
  id: string
  name: string
  displayName?: string
  subscriptionType: 'free' | 'pro' | 'enterprise'
  subscriptionStatus: 'active' | 'suspended' | 'cancelled'
  maxFarms: number
  maxUsersPerFarm: number
  maxUsersTotal: number
  features: string[]
  settings: {
    allowSelfRegistration: boolean
    requireEmailVerification: boolean
    requireAdminApproval: boolean
    defaultUserRole: string
    sessionTimeout: number
    enableAuditLogging: boolean
    enableAPIAccess: boolean
  }
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

interface FarmContact {
  id: string
  type: 'owner' | 'manager' | 'consultant' | 'supplier' | 'buyer'
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

interface FarmCertification {
  id: string
  type: 'organic' | 'gap' | 'haccp' | 'iso' | 'vietgap' | 'other'
  issuer: string
  certificateNumber: string
  issueDate: Date
  expiryDate: Date
  status: 'active' | 'expired' | 'pending' | 'suspended'
  documentUrl?: string
}

interface FarmStatistics {
  totalUsers: number
  totalTrees: number
  totalZones: number
  totalPhotos: number
  totalInvestment: number
  lastActivity: Date
  healthScore: number
  productivity: number
}

export default function FarmManagement() {
  const { user, hasPermission, farms, organizations, currentFarm } = useEnhancedAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'farms' | 'organizations' | 'settings'>('farms')
  const [showCreateFarmModal, setShowCreateFarmModal] = useState(false)
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)
  const [selectedFarm, setSelectedFarm] = useState<EnhancedFarm | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [farmStats, setFarmStats] = useState<{[key: string]: FarmStatistics}>({})

  useEffect(() => {
    if (hasPermission('farms:read')) {
      loadFarmStatistics()
    }
    setLoading(false)
  }, [hasPermission, farms])

  const loadFarmStatistics = async () => {
    try {
      // Check permission before loading data
      if (!hasPermission('farms:read')) {
        setFarmStats({})
        return
      }

      // TODO: Implement Firebase queries to load real farm statistics
      const statsPromises = farms.map(async (farm) => {
        // Check individual farm permission
        if (!hasPermission('farms:read', farm.id)) {
          return { [farm.id]: null }
        }

        try {
          // TODO: Query Firebase for actual statistics
          // const [trees, zones, photos, investments, activities] = await Promise.all([
          //   db.collection('trees').where('farmId', '==', farm.id).get(),
          //   db.collection('zones').where('farmId', '==', farm.id).get(),
          //   db.collection('photos').where('farmId', '==', farm.id).get(),
          //   db.collection('investments').where('farmId', '==', farm.id).get(),
          //   db.collection('activities').where('farmId', '==', farm.id).orderBy('date', 'desc').limit(1).get()
          // ])
          //
          // const stats: FarmStatistics = {
          //   totalUsers: await getUserCountForFarm(farm.id),
          //   totalTrees: trees.size,
          //   totalZones: zones.size,
          //   totalPhotos: photos.size,
          //   totalInvestment: investments.docs.reduce((sum, doc) => sum + doc.data().amount, 0),
          //   lastActivity: activities.docs[0]?.data().date?.toDate() || new Date(),
          //   healthScore: calculateAverageHealth(trees.docs),
          //   productivity: calculateProductivity(trees.docs)
          // }

          // For now, return empty stats until Firebase integration is complete
          const emptyStats: FarmStatistics = {
            totalUsers: 0,
            totalTrees: 0,
            totalZones: 0,
            totalPhotos: 0,
            totalInvestment: 0,
            lastActivity: new Date(),
            healthScore: 0,
            productivity: 0
          }
          return { [farm.id]: emptyStats }
        } catch (error) {
          console.error(`Error loading stats for farm ${farm.id}:`, error)
          return { [farm.id]: null }
        }
      })
      
      const statsResults = await Promise.all(statsPromises)
      const allStats = statsResults.reduce((acc, curr) => ({ ...acc, ...(curr || {}) }), {})
      setFarmStats(allStats)
    } catch (error) {
      console.error('Error loading farm statistics:', error)
      setFarmStats({})
    }
  }

  const handleCreateFarm = async (farmData: Partial<EnhancedFarm>) => {
    try {
      // In real implementation, this would create the farm in Firebase
      console.log('Creating farm:', farmData)
      setShowCreateFarmModal(false)
      // Refresh farms list
    } catch (error) {
      console.error('Error creating farm:', error)
    }
  }

  const handleCreateOrganization = async (orgData: Partial<Organization>) => {
    try {
      // In real implementation, this would create the organization in Firebase
      console.log('Creating organization:', orgData)
      setShowCreateOrgModal(false)
      // Refresh organizations list
    } catch (error) {
      console.error('Error creating organization:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  if (!hasPermission('farms:read')) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIconSolid className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Bạn không có quyền quản lý trang trại.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Đang tải thông tin trang trại...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý trang trại</h2>
          <p className="text-gray-600">
            Quản lý trang trại, tổ chức và cài đặt hệ thống
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'farms', name: 'Trang trại', icon: BuildingOfficeIcon, count: farms.length },
            { id: 'organizations', name: 'Tổ chức', icon: UserGroupIcon, count: organizations.length },
            { id: 'settings', name: 'Cài đặt', icon: Cog6ToothIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'farms' && (
        <FarmsTab 
          farms={farms as any}
          farmStats={farmStats}
          onCreateFarm={() => setShowCreateFarmModal(true)}
          onEditFarm={(farm) => setSelectedFarm(farm)}
        />
      )}

      {activeTab === 'organizations' && (
        <OrganizationsTab 
          organizations={organizations}
          onCreateOrganization={() => setShowCreateOrgModal(true)}
          onEditOrganization={(org) => setSelectedOrg(org)}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab currentFarm={currentFarm as any} />
      )}

      {/* Modals */}
      {showCreateFarmModal && (
        <FarmModal
          farm={null}
          organizations={organizations}
          isOpen={showCreateFarmModal}
          onClose={() => setShowCreateFarmModal(false)}
          onSave={handleCreateFarm}
        />
      )}

      {showCreateOrgModal && (
        <OrganizationModal
          organization={null}
          isOpen={showCreateOrgModal}
          onClose={() => setShowCreateOrgModal(false)}
          onSave={handleCreateOrganization}
        />
      )}

      {selectedFarm && (
        <FarmModal
          farm={selectedFarm}
          organizations={organizations}
          isOpen={!!selectedFarm}
          onClose={() => setSelectedFarm(null)}
          onSave={(data) => {
            console.log('Updating farm:', data)
            setSelectedFarm(null)
          }}
        />
      )}
    </div>
  )
}

// Farms Tab Component
function FarmsTab({ 
  farms, 
  farmStats, 
  onCreateFarm,
  onEditFarm 
}: { 
  farms: EnhancedFarm[]
  farmStats: {[key: string]: FarmStatistics}
  onCreateFarm: () => void
  onEditFarm: (farm: EnhancedFarm) => void
}) {
  const { hasPermission } = useEnhancedAuth()

  return (
    <div className="space-y-6">
      {/* Create Farm Button */}
      {hasPermission('farms:create') && (
        <div className="flex justify-end">
          <button
            onClick={onCreateFarm}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Tạo trang trại mới
          </button>
        </div>
      )}

      {/* Farms Grid */}
      {farms.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có trang trại</h3>
          <p className="text-gray-500 mb-4">
            Bạn chưa có quyền truy cập trang trại nào hoặc chưa có trang trại được tạo.
          </p>
          {hasPermission('farms:create') && (
            <button
              onClick={onCreateFarm}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Tạo trang trại đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <FarmCard 
              key={farm.id} 
              farm={farm} 
              stats={farmStats[farm.id]} 
              onEdit={() => onEditFarm(farm)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Organizations Tab Component
function OrganizationsTab({ 
  organizations, 
  onCreateOrganization,
  onEditOrganization 
}: { 
  organizations: Organization[]
  onCreateOrganization: () => void
  onEditOrganization: (org: Organization) => void
}) {
  const { hasPermission } = useEnhancedAuth()

  return (
    <div className="space-y-6">
      {/* Create Organization Button */}
      {hasPermission('organizations:create' as any) && (
        <div className="flex justify-end">
          <button
            onClick={onCreateOrganization}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Tạo tổ chức mới
          </button>
        </div>
      )}

      {/* Organizations List */}
      {organizations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có tổ chức</h3>
          <p className="text-gray-500 mb-4">
            Bạn chưa thuộc tổ chức nào hoặc chưa có tổ chức được tạo.
          </p>
          {hasPermission('organizations:create' as any) && (
            <button
              onClick={onCreateOrganization}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Tạo tổ chức đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => (
            <OrganizationCard 
              key={org.id} 
              organization={org} 
              onEdit={() => onEditOrganization(org)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Settings Tab Component
function SettingsTab({ currentFarm }: { currentFarm: EnhancedFarm | null }) {
  const { user, hasPermission } = useEnhancedAuth()
  const [settings, setSettings] = useState(currentFarm?.settings || null)

  if (!currentFarm) {
    return (
      <div className="text-center py-8">
        <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn trang trại</h3>
        <p className="text-gray-500">Chọn một trang trại để xem và chỉnh sửa cài đặt.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Cài đặt trang trại: {currentFarm.name}
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Cài đặt cơ bản</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Múi giờ
                </label>
                <select 
                  value={settings?.timezone || 'Asia/Ho_Chi_Minh'}
                  disabled={!hasPermission('farms:write')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="Asia/Ho_Chi_Minh">Việt Nam (UTC+7)</option>
                  <option value="Asia/Bangkok">Thái Lan (UTC+7)</option>
                  <option value="Asia/Singapore">Singapore (UTC+8)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đơn vị tiền tệ
                </label>
                <select 
                  value={settings?.currency || 'VND'}
                  disabled={!hasPermission('farms:write')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="VND">Việt Nam Đồng (VND)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hệ đo lường
                </label>
                <select 
                  value={settings?.units || 'metric'}
                  disabled={!hasPermission('farms:write')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="metric">Mét (Metric)</option>
                  <option value="imperial">Anh (Imperial)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngôn ngữ
                </label>
                <select 
                  value={settings?.language || 'vi-VN'}
                  disabled={!hasPermission('farms:write')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="vi-VN">Tiếng Việt</option>
                  <option value="en-US">English</option>
                  <option value="zh-CN">中文</option>
                </select>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Bảo mật & Quyền riêng tư</h4>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings?.enableGPSTracking ?? true}
                  disabled={!hasPermission('farms:write')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:bg-gray-100"
                />
                <span className="ml-2 text-sm text-gray-700">Bật định vị GPS cho cây trồng</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings?.enablePhotoGeotagging ?? true}
                  disabled={!hasPermission('farms:write')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:bg-gray-100"
                />
                <span className="ml-2 text-sm text-gray-700">Tự động gắn vị trí cho ảnh</span>
              </label>
            </div>
          </div>

          {/* Data Management */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Quản lý dữ liệu</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lưu trữ dữ liệu (ngày)
                </label>
                <input
                  type="number"
                  value={settings?.dataRetentionDays || 365}
                  disabled={!hasPermission('farms:write')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tần suất sao lưu
                </label>
                <select 
                  value={settings?.backupFrequency || 'daily'}
                  disabled={!hasPermission('farms:write')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="daily">Hàng ngày</option>
                  <option value="weekly">Hàng tuần</option>
                  <option value="monthly">Hàng tháng</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {hasPermission('farms:write') && (
            <div className="pt-4 border-t border-gray-200">
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Lưu cài đặt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Farm Card Component
function FarmCard({ 
  farm, 
  stats, 
  onEdit 
}: { 
  farm: EnhancedFarm
  stats?: FarmStatistics
  onEdit: () => void
}) {
  const { hasPermission } = useEnhancedAuth()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{farm.name}</h3>
          <p className="text-sm text-gray-600">
            {farm.farmType === 'personal' ? 'Cá nhân' : 
             farm.farmType === 'commercial' ? 'Thương mại' : 'Hợp tác xã'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            farm.status === 'active' ? 'bg-green-100 text-green-800' :
            farm.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {farm.status === 'active' ? 'Hoạt động' :
             farm.status === 'inactive' ? 'Tạm ngưng' : 'Lưu trữ'}
          </span>
          {hasPermission('farms:write') && (
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Người dùng:</span>
              <span className="ml-2 font-medium text-gray-900">{stats.totalUsers}</span>
            </div>
            <div>
              <span className="text-gray-600">Cây trồng:</span>
              <span className="ml-2 font-medium text-gray-900">{stats.totalTrees}</span>
            </div>
            <div>
              <span className="text-gray-600">Khu vực:</span>
              <span className="ml-2 font-medium text-gray-900">{stats.totalZones}</span>
            </div>
            <div>
              <span className="text-gray-600">Hình ảnh:</span>
              <span className="ml-2 font-medium text-gray-900">{stats.totalPhotos}</span>
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Sức khỏe:</span>
              <span className={`font-medium ${
                stats.healthScore >= 8 ? 'text-green-600' :
                stats.healthScore >= 6 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stats.healthScore.toFixed(1)}/10
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-600">Đầu tư:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(stats.totalInvestment)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Tạo lúc: {farm.createdDate.toLocaleDateString('vi-VN')}
        </p>
        {stats && (
          <p className="text-xs text-gray-500">
            Hoạt động cuối: {stats.lastActivity.toLocaleDateString('vi-VN')}
          </p>
        )}
      </div>
    </div>
  )
}

// Organization Card Component
function OrganizationCard({ 
  organization, 
  onEdit 
}: { 
  organization: Organization
  onEdit: () => void
}) {
  const { hasPermission } = useEnhancedAuth()

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{organization.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{organization.displayName}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Gói:</span>
              <span className="ml-2 font-medium text-gray-900 capitalize">
                {organization.subscriptionType}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Tối đa trang trại:</span>
              <span className="ml-2 font-medium text-gray-900">{organization.maxFarms}</span>
            </div>
            <div>
              <span className="text-gray-600">Tối đa người dùng:</span>
              <span className="ml-2 font-medium text-gray-900">{organization.maxUsersTotal}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
            <span>Tạo: {organization.createdAt.toLocaleDateString('vi-VN')}</span>
            <span>•</span>
            <span>Cập nhật: {organization.updatedAt.toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            organization.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' :
            organization.subscriptionStatus === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {organization.subscriptionStatus === 'active' ? 'Hoạt động' :
             organization.subscriptionStatus === 'suspended' ? 'Tạm ngưng' : 'Đã hủy'}
          </span>
          {hasPermission('organizations:write' as any) && (
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Farm Modal Component
function FarmModal({
  farm,
  organizations,
  isOpen,
  onClose,
  onSave
}: {
  farm: EnhancedFarm | null
  organizations: Organization[]
  isOpen: boolean
  onClose: () => void
  onSave: (farm: Partial<EnhancedFarm>) => void
}) {
  const [formData, setFormData] = useState({
    name: farm?.name || '',
    farmType: farm?.farmType || 'personal' as 'personal' | 'commercial' | 'cooperative',
    organizationId: farm?.organizationId || '',
    description: farm?.description || '',
    establishedYear: farm?.establishedYear || new Date().getFullYear(),
    'location.address': farm?.location?.address || '',
    'ownerInfo.name': farm?.ownerInfo?.name || '',
    'ownerInfo.email': farm?.ownerInfo?.email || '',
    'ownerInfo.phone': farm?.ownerInfo?.phone || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      location: {
        address: formData['location.address']
      },
      ownerInfo: {
        name: formData['ownerInfo.name'],
        email: formData['ownerInfo.email'],
        phone: formData['ownerInfo.phone']
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            {farm ? 'Chỉnh sửa trang trại' : 'Tạo trang trại mới'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tên trang trại</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Loại trang trại</label>
                <select
                  value={formData.farmType}
                  onChange={(e) => setFormData({...formData, farmType: e.target.value as any})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="personal">Cá nhân</option>
                  <option value="commercial">Thương mại</option>
                  <option value="cooperative">Hợp tác xã</option>
                </select>
              </div>
            </div>

            {organizations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Tổ chức</label>
                <select
                  value={formData.organizationId}
                  onChange={(e) => setFormData({...formData, organizationId: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Không thuộc tổ chức</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Năm thành lập</label>
                <input
                  type="number"
                  value={formData.establishedYear}
                  onChange={(e) => setFormData({...formData, establishedYear: parseInt(e.target.value)})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                <input
                  type="text"
                  value={formData['location.address']}
                  onChange={(e) => setFormData({...formData, 'location.address': e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Thông tin chủ sở hữu</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Họ tên</label>
                  <input
                    type="text"
                    value={formData['ownerInfo.name']}
                    onChange={(e) => setFormData({...formData, 'ownerInfo.name': e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData['ownerInfo.email']}
                    onChange={(e) => setFormData({...formData, 'ownerInfo.email': e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                  <input
                    type="tel"
                    value={formData['ownerInfo.phone']}
                    onChange={(e) => setFormData({...formData, 'ownerInfo.phone': e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {farm ? 'Cập nhật' : 'Tạo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Organization Modal Component  
function OrganizationModal({
  organization,
  isOpen,
  onClose,
  onSave
}: {
  organization: Organization | null
  isOpen: boolean
  onClose: () => void
  onSave: (org: Partial<Organization>) => void
}) {
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    displayName: organization?.displayName || '',
    subscriptionType: organization?.subscriptionType || 'free' as 'free' | 'pro' | 'enterprise'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {organization ? 'Chỉnh sửa tổ chức' : 'Tạo tổ chức mới'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên tổ chức</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên hiển thị</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Gói dịch vụ</label>
              <select
                value={formData.subscriptionType}
                onChange={(e) => setFormData({...formData, subscriptionType: e.target.value as any})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="free">Miễn phí</option>
                <option value="pro">Chuyên nghiệp</option>
                <option value="enterprise">Doanh nghiệp</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                {organization ? 'Cập nhật' : 'Tạo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}