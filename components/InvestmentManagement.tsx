'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import {
  CurrencyDollarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  CalculatorIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid'

interface Investment {
  id: string
  amount: number
  category: string
  subcategory?: string
  date: Date
  notes?: string
  quantity?: number
  unit?: string
  pricePerUnit?: number
  treeCount?: number
  isRecurring: boolean
  recurringPeriod?: string
  farmId: string
  createdBy: string
}

interface FertilizerCalculation {
  id: string
  fertilizerType: string
  amountPerTree: number
  unit: string
  treeStatus?: string
  season?: string
  createdDate: Date
  isActive: boolean
}

interface InvestmentSummary {
  totalInvestment: number
  thisMonthInvestment: number
  categoryBreakdown: {[key: string]: number}
  monthlyTrend: {month: string, amount: number}[]
}

export default function InvestmentManagement() {
  const { user, hasPermission, currentFarm } = useEnhancedAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [fertilizerCalculations, setFertilizerCalculations] = useState<FertilizerCalculation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
  const [showCalculatorModal, setShowCalculatorModal] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'summary' | 'calculator'>('list')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDateRange, setFilterDateRange] = useState('all')
  const [summary, setSummary] = useState<InvestmentSummary>({
    totalInvestment: 0,
    thisMonthInvestment: 0,
    categoryBreakdown: {},
    monthlyTrend: []
  })

  const investmentCategories = [
    'Phân bón',
    'Thuốc trừ sâu',
    'Dụng cụ',
    'Lao động',
    'Điện nước',
    'Vận chuyển',
    'Bảo dưỡng',
    'Khác'
  ]

  const fertilizerTypes = [
    'NPK 16-16-8',
    'NPK 20-20-15',
    'Urê 46%N',
    'Phân hữu cơ',
    'Phân vi sinh',
    'Phân lân',
    'Phân kali',
    'Phân bón lá'
  ]

  const treeStatusOptions = [
    'Young Tree',
    'Mature',
    'Old Tree'
  ]

  const seasonOptions = [
    'Mùa khô',
    'Mùa mưa',
    'Trước ra hoa',
    'Sau thu hoạch'
  ]

  useEffect(() => {
    if (hasPermission('investments:read')) {
      loadInvestments()
      loadFertilizerCalculations()
    }
  }, [hasPermission, currentFarm])

  useEffect(() => {
    calculateSummary()
  }, [investments, filterDateRange])

  const loadInvestments = async () => {
    try {
      setLoading(true)
      // In a real implementation, this would load from Firebase
      const mockInvestments: Investment[] = [
        {
          id: '1',
          amount: 2500000,
          category: 'Phân bón',
          subcategory: 'NPK 16-16-8',
          date: new Date('2024-01-15'),
          notes: 'Bón phân đợt 1 năm 2024',
          quantity: 50,
          unit: 'kg',
          pricePerUnit: 50000,
          treeCount: 125,
          isRecurring: true,
          recurringPeriod: 'quarterly',
          farmId: currentFarm?.id || '',
          createdBy: user?.uid || ''
        },
        {
          id: '2',
          amount: 1200000,
          category: 'Thuốc trừ sâu',
          subcategory: 'Thuốc diệt sâu đục thân',
          date: new Date('2024-01-20'),
          notes: 'Phun thuốc phòng trừ sâu bệnh',
          quantity: 3,
          unit: 'chai',
          pricePerUnit: 400000,
          treeCount: 125,
          isRecurring: false,
          farmId: currentFarm?.id || '',
          createdBy: user?.uid || ''
        },
        {
          id: '3',
          amount: 800000,
          category: 'Lao động',
          date: new Date('2024-01-25'),
          notes: 'Cắt tỉa cành',
          treeCount: 125,
          isRecurring: false,
          farmId: currentFarm?.id || '',
          createdBy: user?.uid || ''
        }
      ]
      setInvestments(mockInvestments)
    } catch (error) {
      console.error('Error loading investments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFertilizerCalculations = async () => {
    try {
      // Load fertilizer calculations from Firebase
      const mockCalculations: FertilizerCalculation[] = [
        {
          id: '1',
          fertilizerType: 'NPK 16-16-8',
          amountPerTree: 2.5,
          unit: 'kg',
          treeStatus: 'Mature',
          season: 'Trước ra hoa',
          createdDate: new Date(),
          isActive: true
        },
        {
          id: '2',
          fertilizerType: 'Phân hữu cơ',
          amountPerTree: 10,
          unit: 'kg',
          treeStatus: 'Young Tree',
          season: 'Mùa mưa',
          createdDate: new Date(),
          isActive: true
        }
      ]
      setFertilizerCalculations(mockCalculations)
    } catch (error) {
      console.error('Error loading fertilizer calculations:', error)
    }
  }

  const calculateSummary = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    let filteredInvestments = investments
    
    if (filterDateRange === 'thisMonth') {
      filteredInvestments = investments.filter(inv => {
        const invDate = new Date(inv.date)
        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear
      })
    } else if (filterDateRange === 'thisYear') {
      filteredInvestments = investments.filter(inv => {
        return new Date(inv.date).getFullYear() === currentYear
      })
    }

    const totalInvestment = filteredInvestments.reduce((sum, inv) => sum + inv.amount, 0)
    const thisMonthInvestment = investments.filter(inv => {
      const invDate = new Date(inv.date)
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear
    }).reduce((sum, inv) => sum + inv.amount, 0)

    const categoryBreakdown: {[key: string]: number} = {}
    filteredInvestments.forEach(inv => {
      categoryBreakdown[inv.category] = (categoryBreakdown[inv.category] || 0) + inv.amount
    })

    // Calculate monthly trend for the last 6 months
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const month = date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })
      const amount = investments.filter(inv => {
        const invDate = new Date(inv.date)
        return invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear()
      }).reduce((sum, inv) => sum + inv.amount, 0)
      monthlyTrend.push({ month, amount })
    }

    setSummary({
      totalInvestment,
      thisMonthInvestment,
      categoryBreakdown,
      monthlyTrend
    })
  }

  const filteredInvestments = investments.filter(investment => {
    if (filterCategory !== 'all' && investment.category !== filterCategory) return false
    
    if (filterDateRange === 'thisMonth') {
      const now = new Date()
      const invDate = new Date(investment.date)
      return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear()
    }
    if (filterDateRange === 'thisYear') {
      const invDate = new Date(investment.date)
      return invDate.getFullYear() === new Date().getFullYear()
    }
    
    return true
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const handleSaveInvestment = async (investmentData: Partial<Investment>) => {
    try {
      if (selectedInvestment) {
        // Update existing investment
        setInvestments(prev => prev.map(inv => 
          inv.id === selectedInvestment.id 
            ? { ...inv, ...investmentData }
            : inv
        ))
      } else {
        // Create new investment
        const newInvestment: Investment = {
          id: Date.now().toString(),
          farmId: currentFarm?.id || '',
          createdBy: user?.uid || '',
          isRecurring: false,
          ...investmentData
        } as Investment
        setInvestments(prev => [...prev, newInvestment])
      }
      
      setShowInvestmentModal(false)
      setSelectedInvestment(null)
    } catch (error) {
      console.error('Error saving investment:', error)
    }
  }

  const handleDeleteInvestment = async (investmentId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản đầu tư này?')) return
    
    try {
      setInvestments(prev => prev.filter(inv => inv.id !== investmentId))
    } catch (error) {
      console.error('Error deleting investment:', error)
    }
  }

  const exportToCSV = () => {
    const headers = ['Ngày', 'Danh mục', 'Phân loại', 'Số tiền', 'Số lượng', 'Đơn vị', 'Ghi chú']
    const csvData = filteredInvestments.map(inv => [
      new Date(inv.date).toLocaleDateString('vi-VN'),
      inv.category,
      inv.subcategory || '',
      inv.amount,
      inv.quantity || '',
      inv.unit || '',
      inv.notes || ''
    ])
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dau-tu-${currentFarm?.name || 'farm'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!hasPermission('investments:read')) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Bạn không có quyền xem thông tin đầu tư.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý đầu tư</h2>
          <p className="text-gray-600">Theo dõi chi phí và tính toán phân bón</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCalculatorModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <CalculatorIcon className="h-4 w-4 mr-2" />
            Tính phân bón
          </button>
          {hasPermission('investments:export') && (
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Xuất Excel
            </button>
          )}
          {hasPermission('investments:write') && (
            <button
              onClick={() => setShowInvestmentModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Thêm đầu tư
            </button>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'list', name: 'Danh sách', icon: CurrencyDollarIcon },
            { id: 'summary', name: 'Tổng quan', icon: ChartBarIcon },
            { id: 'calculator', name: 'Máy tính phân bón', icon: CalculatorIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === tab.id
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

      {viewMode === 'list' && (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả danh mục</option>
                {investmentCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả thời gian</option>
                <option value="thisMonth">Tháng này</option>
                <option value="thisYear">Năm này</option>
              </select>
            </div>
          </div>

          {/* Investment List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Đang tải...</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredInvestments.length === 0 ? (
                  <li className="px-6 py-8 text-center">
                    <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có khoản đầu tư nào</h3>
                    <p className="text-gray-500">
                      {filterCategory !== 'all' || filterDateRange !== 'all'
                        ? 'Không tìm thấy khoản đầu tư phù hợp với bộ lọc.'
                        : 'Bắt đầu theo dõi chi phí bằng cách thêm khoản đầu tư đầu tiên.'}
                    </p>
                  </li>
                ) : (
                  filteredInvestments.map((investment) => (
                    <li key={investment.id}>
                      <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">
                                {investment.subcategory || investment.category}
                              </p>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {investment.category}
                              </span>
                              {investment.isRecurring && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Định kỳ
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-lg font-semibold text-blue-600">
                                {formatCurrency(investment.amount)}
                              </p>
                              {investment.quantity && investment.unit && (
                                <p className="text-sm text-gray-500">
                                  {investment.quantity} {investment.unit}
                                </p>
                              )}
                              <p className="text-sm text-gray-500">
                                {new Date(investment.date).toLocaleDateString('vi-VN')}
                              </p>
                            </div>
                            {investment.notes && (
                              <p className="text-sm text-gray-600 mt-1">{investment.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {hasPermission('investments:write') && (
                            <button
                              onClick={() => {
                                setSelectedInvestment(investment)
                                setShowInvestmentModal(true)
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600"
                              title="Chỉnh sửa"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('investments:delete') && (
                            <button
                              onClick={() => handleDeleteInvestment(investment.id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Xóa"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </>
      )}

      {viewMode === 'summary' && (
        <InvestmentSummaryView summary={summary} />
      )}

      {viewMode === 'calculator' && (
        <FertilizerCalculatorView 
          calculations={fertilizerCalculations}
          onCalculationSaved={loadFertilizerCalculations}
        />
      )}

      {/* Investment Modal */}
      {showInvestmentModal && (
        <InvestmentModal
          investment={selectedInvestment}
          categories={investmentCategories}
          isOpen={showInvestmentModal}
          onClose={() => {
            setShowInvestmentModal(false)
            setSelectedInvestment(null)
          }}
          onSave={handleSaveInvestment}
        />
      )}

      {/* Calculator Modal */}
      {showCalculatorModal && (
        <FertilizerCalculatorModal
          calculations={fertilizerCalculations}
          fertilizerTypes={fertilizerTypes}
          treeStatusOptions={treeStatusOptions}
          seasonOptions={seasonOptions}
          isOpen={showCalculatorModal}
          onClose={() => setShowCalculatorModal(false)}
          onSave={loadFertilizerCalculations}
        />
      )}
    </div>
  )
}

// Investment Summary Component
function InvestmentSummaryView({ summary }: { summary: InvestmentSummary }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng đầu tư</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summary.totalInvestment)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tháng này</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summary.thisMonthInvestment)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Phân bổ theo danh mục</h3>
        <div className="space-y-3">
          {Object.entries(summary.categoryBreakdown)
            .sort(([,a], [,b]) => b - a)
            .map(([category, amount]) => (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center">
                <TagIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700">{category}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(amount)}</span>
                <div className="text-xs text-gray-500">
                  {Math.round((amount / summary.totalInvestment) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Xu hướng theo tháng</h3>
        <div className="flex items-end space-x-2 h-48">
          {summary.monthlyTrend.map((item, index) => {
            const maxAmount = Math.max(...summary.monthlyTrend.map(t => t.amount))
            const height = maxAmount > 0 ? (item.amount / maxAmount) * 160 : 0
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${height}px` }}
                  title={formatCurrency(item.amount)}
                ></div>
                <div className="text-xs text-gray-600 mt-2 text-center">{item.month}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Fertilizer Calculator Component
function FertilizerCalculatorView({ 
  calculations, 
  onCalculationSaved 
}: { 
  calculations: FertilizerCalculation[]
  onCalculationSaved: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Bảng tính phân bón</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại phân bón
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lượng/cây
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái cây
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mùa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calculations.map((calc) => (
                <tr key={calc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {calc.fertilizerType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {calc.amountPerTree} {calc.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {calc.treeStatus || 'Tất cả'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {calc.season || 'Tất cả'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      calc.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {calc.isActive ? 'Đang sử dụng' : 'Không sử dụng'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Investment Modal Component
function InvestmentModal({
  investment,
  categories,
  isOpen,
  onClose,
  onSave
}: {
  investment: Investment | null
  categories: string[]
  isOpen: boolean
  onClose: () => void
  onSave: (investment: Partial<Investment>) => void
}) {
  const [formData, setFormData] = useState({
    amount: investment?.amount || 0,
    category: investment?.category || categories[0],
    subcategory: investment?.subcategory || '',
    date: investment?.date ? new Date(investment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: investment?.notes || '',
    quantity: investment?.quantity || 0,
    unit: investment?.unit || '',
    pricePerUnit: investment?.pricePerUnit || 0,
    treeCount: investment?.treeCount || 0,
    isRecurring: investment?.isRecurring || false,
    recurringPeriod: investment?.recurringPeriod || 'monthly'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      date: new Date(formData.date),
      amount: formData.pricePerUnit && formData.quantity 
        ? formData.pricePerUnit * formData.quantity 
        : formData.amount
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            {investment ? 'Chỉnh sửa khoản đầu tư' : 'Thêm khoản đầu tư mới'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Danh mục</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phân loại</label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: NPK 16-16-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Số lượng</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Đơn vị</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="kg, chai, bao..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Giá/đơn vị (VNĐ)</label>
                <input
                  type="number"
                  value={formData.pricePerUnit}
                  onChange={(e) => setFormData({...formData, pricePerUnit: parseFloat(e.target.value) || 0})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tổng tiền (VNĐ)
                  {formData.pricePerUnit && formData.quantity && (
                    <span className="text-xs text-gray-500 ml-2">
                      Tự động: {(formData.pricePerUnit * formData.quantity).toLocaleString('vi-VN')}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ngày</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Số cây áp dụng</label>
              <input
                type="number"
                value={formData.treeCount}
                onChange={(e) => setFormData({...formData, treeCount: parseInt(e.target.value) || 0})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Chi phí định kỳ</span>
              </label>
              {formData.isRecurring && (
                <select
                  value={formData.recurringPeriod}
                  onChange={(e) => setFormData({...formData, recurringPeriod: e.target.value})}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="weekly">Hàng tuần</option>
                  <option value="monthly">Hàng tháng</option>
                  <option value="quarterly">Hàng quý</option>
                  <option value="yearly">Hàng năm</option>
                </select>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
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
                {investment ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Fertilizer Calculator Modal Component
function FertilizerCalculatorModal({
  calculations,
  fertilizerTypes,
  treeStatusOptions,
  seasonOptions,
  isOpen,
  onClose,
  onSave
}: {
  calculations: FertilizerCalculation[]
  fertilizerTypes: string[]
  treeStatusOptions: string[]
  seasonOptions: string[]
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Máy tính phân bón</h3>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h4 className="font-medium text-blue-900 mb-2">Hướng dẫn sử dụng:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Chọn loại phân bón và nhập lượng khuyến nghị trên mỗi cây</li>
              <li>• Có thể chỉ định cho trạng thái cây và mùa cụ thể</li>
              <li>• Hệ thống sẽ tự động tính toán tổng lượng cần cho toàn bộ vườn</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}