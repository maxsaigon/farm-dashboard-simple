'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import {
  ChartBarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  BeakerIcon,
  PhotoIcon,
  MapIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid'

interface ReportData {
  farmOverview: {
    totalTrees: number
    totalZones: number
    totalArea: number
    totalPhotos: number
    totalInvestment: number
    averageHealth: number
    productiveTrees: number
    nonproductiveTrees: number
  }
  treeHealth: {
    good: number
    fair: number
    poor: number
    disease: number
    healthTrend: { month: string, score: number }[]
  }
  productivity: {
    totalFruit: number
    averageFruitPerTree: number
    topPerformingZones: { zone: string, avgFruit: number }[]
    fruitTrend: { month: string, count: number }[]
  }
  investments: {
    byCategory: { category: string, amount: number, percentage: number }[]
    monthlyTrend: { month: string, amount: number }[]
    costPerTree: number
    roi: number
  }
  activities: {
    photosTaken: number
    treesInspected: number
    aiAnalysisCompleted: number
    maintenanceTasks: number
    recentActivities: {
      date: Date
      type: string
      description: string
      user: string
    }[]
  }
  zones: {
    performance: {
      zone: string
      trees: number
      health: number
      productivity: number
      efficiency: number
    }[]
    utilizationRate: number
    expansionOpportunities: string[]
  }
}

interface ReportFilters {
  dateRange: {
    start: Date
    end: Date
  }
  zoneIds?: string[]
  includeInactive?: boolean
  reportType: 'summary' | 'detailed' | 'financial' | 'operational'
}

export default function AnalyticsReporting() {
  const { user, hasPermission, currentFarm } = useSimpleAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
      end: new Date()
    },
    reportType: 'summary'
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'productivity' | 'financial' | 'zones'>('overview')
  const [showFilters, setShowFilters] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [availableZones, setAvailableZones] = useState<{id: string, name: string}[]>([])

  const reportTypes = [
    { value: 'summary', label: 'Tổng quan' },
    { value: 'detailed', label: 'Chi tiết' },
    { value: 'financial', label: 'Tài chính' },
    { value: 'operational', label: 'Vận hành' }
  ]

  useEffect(() => {
    if (hasPermission('analytics:view')) {
      loadAnalyticsData()
      loadAvailableZones()
    }
  }, [hasPermission, currentFarm, filters])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Check permission before loading data
      if (!hasPermission('farms:read', currentFarm?.id)) {
        setReportData(null)
        return
      }

      // TODO: Implement Firebase queries to aggregate analytics data
      // This would involve multiple queries to get:
      // 1. Farm overview statistics
      // 2. Tree health distribution and trends
      // 3. Productivity metrics
      // 4. Investment summaries
      // 5. Activity logs
      // 6. Zone performance data
      
      // Example structure:
      // const [trees, zones, investments, activities] = await Promise.all([
      //   db.collection('trees').where('farmId', '==', currentFarm?.id).get(),
      //   db.collection('zones').where('farmId', '==', currentFarm?.id).get(),
      //   db.collection('investments').where('farmId', '==', currentFarm?.id).get(),
      //   db.collection('activities').where('farmId', '==', currentFarm?.id).orderBy('date', 'desc').limit(10).get()
      // ])
      //
      // const analyticsData = calculateAnalytics(trees, zones, investments, activities, filters)
      // setReportData(analyticsData)

      // For now, set empty data structure until Firebase integration is complete
      const emptyReportData: ReportData = {
        farmOverview: {
          totalTrees: 0,
          totalZones: 0,
          totalArea: 0,
          totalPhotos: 0,
          totalInvestment: 0,
          averageHealth: 0,
          productiveTrees: 0,
          nonproductiveTrees: 0
        },
        treeHealth: {
          good: 0,
          fair: 0,
          poor: 0,
          disease: 0,
          healthTrend: []
        },
        productivity: {
          totalFruit: 0,
          averageFruitPerTree: 0,
          topPerformingZones: [],
          fruitTrend: []
        },
        investments: {
          byCategory: [],
          monthlyTrend: [],
          costPerTree: 0,
          roi: 0
        },
        activities: {
          photosTaken: 0,
          treesInspected: 0,
          aiAnalysisCompleted: 0,
          maintenanceTasks: 0,
          recentActivities: []
        },
        zones: {
          performance: [],
          utilizationRate: 0,
          expansionOpportunities: []
        }
      }
      setReportData(emptyReportData)
    } catch (error) {
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableZones = async () => {
    try {
      // Check permission before loading data
      if (!hasPermission('farms:read', currentFarm?.id)) {
        setAvailableZones([])
        return
      }

      // TODO: Implement Firebase query to load zones for filtering
      // const zonesQuery = await db.collection('zones')
      //   .where('farmId', '==', currentFarm?.id)
      //   .where('isActive', '==', true)
      //   .select('name')
      //   .get()
      // 
      // const zones = zonesQuery.docs.map(doc => ({
      //   id: doc.id,
      //   name: doc.data().name
      // }))
      // setAvailableZones(zones)

      // For now, set empty array until Firebase integration is complete
      setAvailableZones([])
    } catch (error) {
      setAvailableZones([])
    }
  }

  const generateReport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!hasPermission('analytics:export')) return

    try {
      setGeneratingReport(true)
      // Generate report in specified format
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate generation
      
      // In real implementation, this would trigger download

      // Simulate file download
      const filename = `farm-report-${filters.reportType}-${new Date().toISOString().split('T')[0]}.${format}`
      alert(`Báo cáo ${filename} đã được tạo và tải xuống!`)
      
    } catch (error) {
      // Error generating report
    } finally {
      setGeneratingReport(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const formatArea = (area: number) => {
    return `${(area / 10000).toFixed(1)} ha`
  }

  const getHealthColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!hasPermission('analytics:view')) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Bạn không có quyền xem báo cáo phân tích.</p>
      </div>
    )
  }

  if (loading || !reportData) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Đang tải dữ liệu phân tích...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Phân tích & Báo cáo</h2>
          <p className="text-gray-600">
            Trang trại {currentFarm?.name} • Từ {filters.dateRange.start.toLocaleDateString('vi-VN')} đến {filters.dateRange.end.toLocaleDateString('vi-VN')}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Bộ lọc
          </button>
          {hasPermission('analytics:export') && (
            <div className="relative inline-block text-left">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    generateReport(e.target.value as 'pdf' | 'excel' | 'csv')
                    e.target.value = ''
                  }
                }}
                disabled={generatingReport}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                <option value="">
                  {generatingReport ? 'Đang tạo...' : 'Xuất báo cáo'}
                </option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={filters.dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: new Date(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={filters.dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: new Date(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại báo cáo
              </label>
              <select
                value={filters.reportType}
                onChange={(e) => setFilters({ ...filters, reportType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Khu vực
              </label>
              <select
                multiple
                value={filters.zoneIds || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setFilters({ ...filters, zoneIds: selected.length > 0 ? selected : undefined })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableZones.map(zone => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Tổng quan', icon: ChartBarIcon },
            { id: 'health', name: 'Sức khỏe cây', icon: BeakerIcon },
            { id: 'productivity', name: 'Năng suất', icon: ArrowTrendingUpIcon },
            { id: 'financial', name: 'Tài chính', icon: CurrencyDollarIcon },
            { id: 'zones', name: 'Khu vực', icon: MapIcon }
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
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <OverviewTab data={reportData} />
      )}
      {activeTab === 'health' && (
        <HealthTab data={reportData} />
      )}
      {activeTab === 'productivity' && (
        <ProductivityTab data={reportData} />
      )}
      {activeTab === 'financial' && (
        <FinancialTab data={reportData} />
      )}
      {activeTab === 'zones' && (
        <ZonesTab data={reportData} />
      )}
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BeakerIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng số cây</p>
              <p className="text-2xl font-semibold text-gray-900">{data.farmOverview.totalTrees}</p>
              <p className="text-xs text-gray-500">
                {data.farmOverview.productiveTrees} có trái • {data.farmOverview.nonproductiveTrees} chưa có trái
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Diện tích</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(data.farmOverview.totalArea / 10000).toFixed(1)} ha
              </p>
              <p className="text-xs text-gray-500">{data.farmOverview.totalZones} khu vực</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng đầu tư</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(data.farmOverview.totalInvestment / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs text-gray-500">
                {(data.farmOverview.totalInvestment / data.farmOverview.totalTrees / 1000).toFixed(0)}K/cây
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <PhotoIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hình ảnh</p>
              <p className="text-2xl font-semibold text-gray-900">{data.farmOverview.totalPhotos}</p>
              <p className="text-xs text-gray-500">
                {Math.round(data.farmOverview.totalPhotos / data.farmOverview.totalTrees)} ảnh/cây
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Health & Productivity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sức khỏe tổng quan</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-700">Khỏe mạnh</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900">{data.treeHealth.good}</span>
                <span className="text-sm text-gray-500 ml-1">
                  ({Math.round((data.treeHealth.good / data.farmOverview.totalTrees) * 100)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-5 w-5 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">Bình thường</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900">{data.treeHealth.fair}</span>
                <span className="text-sm text-gray-500 ml-1">
                  ({Math.round((data.treeHealth.fair / data.farmOverview.totalTrees) * 100)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm text-gray-700">Cần chú ý</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900">
                  {data.treeHealth.poor + data.treeHealth.disease}
                </span>
                <span className="text-sm text-gray-500 ml-1">
                  ({Math.round(((data.treeHealth.poor + data.treeHealth.disease) / data.farmOverview.totalTrees) * 100)}%)
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-center">
              <span className="text-2xl font-bold text-blue-600">
                {data.farmOverview.averageHealth.toFixed(1)}
              </span>
              <span className="text-blue-600">/10</span>
              <p className="text-sm text-blue-700 mt-1">Điểm sức khỏe trung bình</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Năng suất</h3>
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-3xl font-bold text-orange-600">
                {data.productivity.totalFruit.toLocaleString('vi-VN')}
              </span>
              <p className="text-sm text-gray-600">Tổng số trái</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-semibold text-gray-900">
                {data.productivity.averageFruitPerTree.toFixed(1)}
              </span>
              <p className="text-sm text-gray-600">Trái/cây trung bình</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Top khu vực:</h4>
              {data.productivity.topPerformingZones.map((zone, index) => (
                <div key={zone.zone} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {index + 1}. {zone.zone}
                  </span>
                  <span className="font-medium text-gray-900">
                    {zone.avgFruit.toFixed(1)} trái/cây
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Hoạt động gần đây</h3>
        <div className="space-y-4">
          {data.activities.recentActivities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {activity.type === 'photo_analysis' && <PhotoIcon className="h-4 w-4 text-blue-600" />}
                {activity.type === 'tree_inspection' && <BeakerIcon className="h-4 w-4 text-green-600" />}
                {activity.type === 'investment' && <CurrencyDollarIcon className="h-4 w-4 text-yellow-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500">
                  {activity.user} • {activity.date.toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Health Tab Component
function HealthTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      {/* Health Distribution */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Phân bố sức khỏe cây trồng</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.treeHealth.good}</div>
            <div className="text-sm text-green-700">Khỏe mạnh</div>
            <div className="text-xs text-gray-500">
              {Math.round((data.treeHealth.good / (data.treeHealth.good + data.treeHealth.fair + data.treeHealth.poor + data.treeHealth.disease)) * 100)}%
            </div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{data.treeHealth.fair}</div>
            <div className="text-sm text-yellow-700">Bình thường</div>
            <div className="text-xs text-gray-500">
              {Math.round((data.treeHealth.fair / (data.treeHealth.good + data.treeHealth.fair + data.treeHealth.poor + data.treeHealth.disease)) * 100)}%
            </div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{data.treeHealth.poor}</div>
            <div className="text-sm text-orange-700">Kém</div>
            <div className="text-xs text-gray-500">
              {Math.round((data.treeHealth.poor / (data.treeHealth.good + data.treeHealth.fair + data.treeHealth.poor + data.treeHealth.disease)) * 100)}%
            </div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{data.treeHealth.disease}</div>
            <div className="text-sm text-red-700">Bệnh/sâu hại</div>
            <div className="text-xs text-gray-500">
              {Math.round((data.treeHealth.disease / (data.treeHealth.good + data.treeHealth.fair + data.treeHealth.poor + data.treeHealth.disease)) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Health Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Xu hướng sức khỏe theo thời gian</h3>
        <div className="flex items-end space-x-2 h-64">
          {data.treeHealth.healthTrend.map((item, index) => {
            const maxScore = Math.max(...data.treeHealth.healthTrend.map(t => t.score))
            const height = (item.score / maxScore) * 200
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${height}px` }}
                  title={`${item.month}: ${item.score.toFixed(1)}/10`}
                ></div>
                <div className="text-xs text-gray-600 mt-2 text-center">{item.month}</div>
                <div className="text-xs font-medium text-gray-900">{item.score.toFixed(1)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Health Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Khuyến nghị cải thiện</h3>
        <div className="space-y-3">
          {data.treeHealth.disease > 0 && (
            <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Có {data.treeHealth.disease} cây bị bệnh cần xử lý ngay
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Kiểm tra và áp dụng biện pháp phòng trừ phù hợp
                </p>
              </div>
            </div>
          )}
          {data.treeHealth.poor > 0 && (
            <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {data.treeHealth.poor} cây có sức khỏe kém cần chăm sóc đặc biệt
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Tăng cường bón phân và cải thiện chế độ tưới tiêu
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Duy trì chế độ chăm sóc hiện tại cho {data.treeHealth.good} cây khỏe mạnh
              </p>
              <p className="text-xs text-green-600 mt-1">
                Tiếp tục theo dõi và bón phân định kỳ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Productivity Tab Component
function ProductivityTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      {/* Productivity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {data.productivity.totalFruit.toLocaleString('vi-VN')}
          </div>
          <div className="text-sm text-gray-600">Tổng số trái</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {data.productivity.averageFruitPerTree.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Trái/cây trung bình</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {Math.max(...data.productivity.topPerformingZones.map(z => z.avgFruit)).toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Cao nhất (trái/cây)</div>
        </div>
      </div>

      {/* Productivity Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Xu hướng năng suất theo thời gian</h3>
        <div className="flex items-end space-x-2 h-64">
          {data.productivity.fruitTrend.map((item, index) => {
            const maxCount = Math.max(...data.productivity.fruitTrend.map(t => t.count))
            const height = (item.count / maxCount) * 200
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-orange-500 rounded-t transition-all duration-300 hover:bg-orange-600"
                  style={{ height: `${height}px` }}
                  title={`${item.month}: ${item.count.toLocaleString('vi-VN')} trái`}
                ></div>
                <div className="text-xs text-gray-600 mt-2 text-center">{item.month}</div>
                <div className="text-xs font-medium text-gray-900">
                  {item.count.toLocaleString('vi-VN')}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Zone Performance Comparison */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">So sánh năng suất theo khu vực</h3>
        <div className="space-y-4">
          {data.productivity.topPerformingZones.map((zone, index) => {
            const maxFruit = Math.max(...data.productivity.topPerformingZones.map(z => z.avgFruit))
            const percentage = (zone.avgFruit / maxFruit) * 100
            
            return (
              <div key={zone.zone} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    #{index + 1} {zone.zone}
                  </span>
                  <span className="text-sm text-gray-600">
                    {zone.avgFruit.toFixed(1)} trái/cây
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-green-500' :
                      index === 1 ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Financial Tab Component
function FinancialTab({ data }: { data: ReportData }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {(data.investments.monthlyTrend.reduce((sum, item) => sum + item.amount, 0) / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">Tổng chi phí</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">
            {(data.investments.costPerTree / 1000).toFixed(0)}K
          </div>
          <div className="text-sm text-gray-600">Chi phí/cây</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-yellow-600 mb-2">
            {data.investments.roi.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">ROI ước tính</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-purple-600 mb-2">
            {(data.investments.monthlyTrend[data.investments.monthlyTrend.length - 1].amount / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">Tháng này</div>
        </div>
      </div>

      {/* Investment by Category */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Phân bổ chi phí theo danh mục</h3>
        <div className="space-y-4">
          {data.investments.byCategory.map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">
                  {category.category}
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(category.amount)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {category.percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${category.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Investment Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Xu hướng chi phí theo tháng</h3>
        <div className="flex items-end space-x-2 h-64">
          {data.investments.monthlyTrend.map((item, index) => {
            const maxAmount = Math.max(...data.investments.monthlyTrend.map(t => t.amount))
            const height = (item.amount / maxAmount) * 200
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-yellow-500 rounded-t transition-all duration-300 hover:bg-yellow-600"
                  style={{ height: `${height}px` }}
                  title={`${item.month}: ${formatCurrency(item.amount)}`}
                ></div>
                <div className="text-xs text-gray-600 mt-2 text-center">{item.month}</div>
                <div className="text-xs font-medium text-gray-900">
                  {(item.amount / 1000000).toFixed(1)}M
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Financial Health Indicators */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Chỉ số tài chính</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Hiệu quả đầu tư</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ROI dự kiến:</span>
                <span className={`text-sm font-medium ${data.investments.roi > 15 ? 'text-green-600' : data.investments.roi > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {data.investments.roi.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Chi phí trên mỗi trái:</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(data.investments.costPerTree / (data.productivity.averageFruitPerTree || 1) * 1000)} VND
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Hiệu quả sử dụng đất:</span>
                <span className="text-sm font-medium text-gray-900">
                  {(data.investments.costPerTree * 120 / 10000).toFixed(0)} VND/m²
                </span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Khuyến nghị</h4>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                • Chi phí phân bón chiếm {data.investments.byCategory[0].percentage}% - cần cân nhắc tối ưu
              </div>
              <div className="text-sm text-gray-600">
                • ROI hiện tại {data.investments.roi > 15 ? 'tốt' : 'cần cải thiện'}, mục tiêu &gt;15%
              </div>
              <div className="text-sm text-gray-600">
                • Xem xét đầu tư công nghệ để giảm chi phí lao động
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Zones Tab Component
function ZonesTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      {/* Zone Performance Overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Hiệu suất khu vực</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Khu vực</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Số cây</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Sức khỏe</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Năng suất</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Hiệu quả</th>
              </tr>
            </thead>
            <tbody>
              {data.zones.performance.map((zone) => (
                <tr key={zone.zone} className="border-b">
                  <td className="py-3 px-4 font-medium text-gray-900">{zone.zone}</td>
                  <td className="py-3 px-4 text-gray-600">{zone.trees}</td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${
                      zone.health >= 8 ? 'text-green-600' :
                      zone.health >= 6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {zone.health.toFixed(1)}/10
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{zone.productivity.toFixed(1)} trái/cây</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            zone.efficiency >= 90 ? 'bg-green-500' :
                            zone.efficiency >= 80 ? 'bg-blue-500' :
                            zone.efficiency >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${zone.efficiency}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{zone.efficiency}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zone Utilization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tỷ lệ sử dụng</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {data.zones.utilizationRate}%
            </div>
            <div className="text-sm text-gray-600 mb-4">Tỷ lệ sử dụng diện tích</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${data.zones.utilizationRate}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Còn {100 - data.zones.utilizationRate}% diện tích có thể mở rộng
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cơ hội mở rộng</h3>
          <div className="space-y-3">
            {data.zones.expansionOpportunities.map((opportunity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                </div>
                <p className="text-sm text-gray-700">{opportunity}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Comparison Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">So sánh hiệu quả giữa các khu vực</h3>
        <div className="space-y-6">
          {data.zones.performance.map((zone) => {
            const maxTrees = Math.max(...data.zones.performance.map(z => z.trees))
            const treePercentage = (zone.trees / maxTrees) * 100
            
            return (
              <div key={zone.zone} className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">{zone.zone}</h4>
                  <span className="text-sm text-gray-500">{zone.trees} cây</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Sức khỏe</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            zone.health >= 8 ? 'bg-green-500' :
                            zone.health >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(zone.health / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">{zone.health.toFixed(1)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Năng suất</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-orange-500 rounded-full"
                          style={{ width: `${(zone.productivity / 30) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">{zone.productivity.toFixed(1)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Hiệu quả</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${zone.efficiency}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">{zone.efficiency}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}