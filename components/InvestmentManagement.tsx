'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
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
import { subscribeToInvestments as subInvestments, addInvestment as addInv, updateInvestment as updInv, deleteInvestment as delInv, migrateLegacyInvestments } from '@/lib/investment-service'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

// Helper function to get season info from date
function getSeasonFromDate(date: Date): { year: number, phase: string } {
  const month = date.getMonth() // 0-11
  const year = date.getFullYear()
  
  // Durian season timeline (adjust for your region)
  if (month >= 3 && month <= 5) {        // Apr-Jun
    return { year, phase: 'pre_season' }   // Preparation
  } else if (month >= 6 && month <= 8) {  // Jul-Sep  
    return { year, phase: 'in_season' }    // Active season
  } else if (month >= 9 && month <= 11) { // Oct-Dec
    return { year, phase: 'post_season' }  // Harvest/cleanup
  } else {                               // Jan-Mar
    return { 
      year: month <= 2 ? year - 1 : year, // Jan-Mar belongs to previous season
      phase: 'off_season' 
    }
  }
}

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
  const { user, hasPermission, currentFarm } = useSimpleAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  
  const [loading, setLoading] = useState(true)
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
  
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
    if (hasPermission('read')) {
      loadInvestments()
      
    }
  }, [hasPermission, currentFarm])

  // Realtime subscription for investments per active farm
  useEffect(() => {
    if (!user || !currentFarm?.id || !hasPermission('read')) {
      setInvestments([])
      return
    }
    const unsubscribe = subInvestments(user.uid, currentFarm.id, (items) => {
      setInvestments(items as unknown as Investment[])
    })
    return () => { try { unsubscribe && unsubscribe() } catch {} }
  }, [user?.uid, currentFarm?.id, hasPermission])

  // Fertilizer calculations hidden in demo

  useEffect(() => {
    calculateSummary()
  }, [investments, filterDateRange])

  const loadInvestments = async () => {
    try {
      setLoading(true)
      
      // Check permission before loading data
      if (!hasPermission('read')) {
        setInvestments([])
        return
      }

      // TODO: Implement Firebase query to load investments
      // const investmentsQuery = await db.collection('investments')
      //   .where('farmId', '==', currentFarm?.id)
      //   .where('isDeleted', '==', false)
      //   .orderBy('date', 'desc')
      //   .get()
      // 
      // const loadedInvestments = investmentsQuery.docs.map(doc => ({
      //   id: doc.id,
      //   ...doc.data(),
      //   date: doc.data().date?.toDate()
      // })) as Investment[]
      // 
      // setInvestments(loadedInvestments)

      // For now, set empty array until Firebase integration is complete
      if (user && currentFarm?.id) {
        try { await migrateLegacyInvestments(user.uid, currentFarm.id) } catch {}
      }
    } catch (error) {
      console.error('Error loading investments:', error)
      setInvestments([])
    } finally {
      setLoading(false)
    }
  }

  /* const loadFertilizerCalculations = async () => {
    try {
      // Check permission before loading data
      if (!hasPermission('read')) {
        setFertilizerCalculations([])
        return
      }

      // TODO: Implement Firebase query to load fertilizer calculations
      // const calculationsQuery = await db.collection('fertilizerCalculations')
      //   .where('farmId', '==', currentFarm?.id)
      //   .where('isActive', '==', true)
      //   .orderBy('createdDate', 'desc')
      //   .get()
      // 
      // const loadedCalculations = calculationsQuery.docs.map(doc => ({
      //   id: doc.id,
      //   ...doc.data(),
      //   createdDate: doc.data().createdDate?.toDate()
      // })) as FertilizerCalculation[]
      // 
      // setFertilizerCalculations(loadedCalculations)

      // For now, set empty array until Firebase integration is complete
      setFertilizerCalculations([])
    } catch (error) {
      console.error('Error loading fertilizer calculations:', error)
      setFertilizerCalculations([])
    }
  }
  */

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

  // Helper to get user display name
  const getUserDisplayName = (userId: string): string => {
    if (userId === user?.uid) return 'Bạn'
    // You can extend this to lookup user names from farm members
    return userId.substring(0, 8) + '...'
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
      if (!user || !currentFarm?.id) throw new Error('Missing user or farm')
      
      if (selectedInvestment) {
        // Update existing investment
        await updInv(user.uid, currentFarm.id, selectedInvestment.id, investmentData)
      } else {
        // Create new investment
        await addInv(user.uid, currentFarm.id, {
          amount: investmentData.amount || 0,
          category: investmentData.category || 'Khác',
          subcategory: investmentData.subcategory,
          date: investmentData.date || new Date(),
          notes: investmentData.notes,
          quantity: investmentData.quantity,
          unit: investmentData.unit,
          pricePerUnit: investmentData.pricePerUnit,
          treeCount: investmentData.treeCount,
          isRecurring: Boolean(investmentData.isRecurring),
          recurringPeriod: investmentData.recurringPeriod,
          createdBy: user.uid,
          userId: user.uid,
        } as any)
      }
      
      setShowInvestmentModal(false)
      setSelectedInvestment(null)
    } catch (error) {
      console.error('Error saving investment:', error)
      alert('Lỗi khi lưu đầu tư: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleDeleteInvestment = async (investmentId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản đầu tư này?')) return
    
    try {
      if (!user || !currentFarm?.id) throw new Error('Missing user or farm')
      await delInv(user.uid, currentFarm.id, investmentId)
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

  if (!hasPermission('read')) {
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
          <p className="text-gray-600">Theo dõi chi phí</p>
        </div>
        <div className="flex space-x-3">
          {hasPermission('read') && (
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Xuất Excel
            </button>
          )}
          {hasPermission('write') && (
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
                            {investment.createdBy && (
                              <div className="flex items-center space-x-1 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  👤 {getUserDisplayName(investment.createdBy)}
                                </span>
                              </div>
                            )}
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
                          {hasPermission('write') && (
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
                          {hasPermission('delete') && (
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
        <div className="space-y-6">
          {/* Season Investment Card */}
          <SeasonInvestmentCard 
            farmId={currentFarm?.id || ''} 
            currentSeasonYear={getSeasonFromDate(new Date()).year}
          />
          <InvestmentSummaryView summary={summary} />
        </div>
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

    </div>
  )
}

// Season Investment Summary Component
function SeasonInvestmentCard({ farmId, currentSeasonYear }: { farmId: string, currentSeasonYear: number }) {
  const [investmentData, setInvestmentData] = useState<{
    lastSeason: { year: number, total: number, count: number },
    currentSeason: { year: number, total: number, count: number }
  }>({
    lastSeason: { year: currentSeasonYear - 1, total: 0, count: 0 },
    currentSeason: { year: currentSeasonYear, total: 0, count: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInvestmentData = async () => {
      try {
        setLoading(true)
        
        // Load current season investments
        const currentSeasonRef = collection(db, 'farms', farmId, 'investments')
        const currentSeasonQuery = query(
          currentSeasonRef,
          where('date', '>=', new Date(`${currentSeasonYear}-01-01`)),
          where('date', '<=', new Date(`${currentSeasonYear}-12-31`))
        )
        const currentSnapshot = await getDocs(currentSeasonQuery)
        
        // Load last season investments  
        const lastSeasonRef = collection(db, 'farms', farmId, 'investments')
        const lastSeasonQuery = query(
          lastSeasonRef,
          where('date', '>=', new Date(`${currentSeasonYear - 1}-01-01`)),
          where('date', '<=', new Date(`${currentSeasonYear - 1}-12-31`))
        )
        const lastSnapshot = await getDocs(lastSeasonQuery)

        // Calculate totals
        const currentTotal = currentSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data()
          return sum + (data.amount || 0)
        }, 0)

        const lastTotal = lastSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data()
          return sum + (data.amount || 0)
        }, 0)

        setInvestmentData({
          lastSeason: { 
            year: currentSeasonYear - 1, 
            total: lastTotal, 
            count: lastSnapshot.docs.length 
          },
          currentSeason: { 
            year: currentSeasonYear, 
            total: currentTotal, 
            count: currentSnapshot.docs.length 
          }
        })
      } catch (error) {
        console.error('Error loading investment data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (farmId) {
      loadInvestmentData()
    }
  }, [farmId, currentSeasonYear])

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl border border-blue-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const { lastSeason, currentSeason } = investmentData
  const difference = currentSeason.total - lastSeason.total
  const percentageChange = lastSeason.total > 0 ? (difference / lastSeason.total) * 100 : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl border border-blue-200 p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">💰</span>
        <h3 className="text-lg font-semibold text-gray-900">Chi phí đầu tư theo mùa</h3>
      </div>
      
      {/* Investment Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/60 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Mùa trước ({lastSeason.year})</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(lastSeason.total)}
          </div>
          <div className="text-xs text-gray-500">
            {lastSeason.count} khoản đầu tư
          </div>
        </div>
        
        <div className="bg-white/60 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Mùa này ({currentSeason.year})</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(currentSeason.total)}
          </div>
          <div className="text-xs text-gray-500">
            {currentSeason.count} khoản đầu tư
          </div>
        </div>
      </div>
      
      {/* Comparison */}
      {lastSeason.total > 0 && (
        <div className="bg-white/60 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">So với mùa trước:</span>
            <div className="flex items-center space-x-2">
              <span className={`font-bold ${
                difference > 0 ? 'text-red-600' : difference < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
              </span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                difference > 0 ? 'bg-red-100 text-red-700' : 
                difference < 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {difference > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
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

// Simplified Investment Modal Component
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
    category: investment?.category || categories[0] || 'Phân bón',
    subcategory: investment?.subcategory || '',
    date: investment?.date ? new Date(investment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: investment?.notes || ''
  })

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formData.amount || formData.amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ')
      return
    }
    onSave({
      ...formData,
      date: new Date(formData.date)
    })
  }

  if (!isOpen) return null

  // Quick category options with emojis
  const quickCategories = [
    { value: 'Phân bón', label: '🌱 Phân bón', subcategories: ['NPK', 'Phân hữu cơ', 'Phân lá', 'Vi lượng'] },
    { value: 'Thuốc BVTV', label: '🛡️ Thuốc BVTV', subcategories: ['Thuốc trừ sâu', 'Thuốc nấm', 'Thuốc cỏ', 'Thuốc kích thích'] },
    { value: 'Công cụ', label: '🔧 Công cụ', subcategories: ['Máy phun', 'Dụng cụ cắt tỉa', 'Ống nước', 'Khác'] },
    { value: 'Lao động', label: '👥 Lao động', subcategories: ['Tỉa cành', 'Bón phân', 'Phun thuốc', 'Thu hoạch'] },
    { value: 'Khác', label: '📦 Khác', subcategories: ['Điện nước', 'Vận chuyển', 'Sửa chữa', 'Khác'] }
  ]

  const selectedCategory = quickCategories.find(cat => cat.value === formData.category)

  return (
    <div className="fixed inset-0 bg-white z-[50000]">
      {/* Header - Fixed (matching FullscreenTreeShowcase) */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={onClose}
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
              title="Đóng"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {investment ? 'Chỉnh sửa chi phí' : 'Thêm chi phí mới'}
              </h1>
              <p className="text-sm text-gray-500 truncate">
                Nhập thông tin đầu tư
              </p>
            </div>
          </div>
          
          <div className="flex-shrink-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
            <span className="text-xl">💰</span>
            <span className="font-medium hidden sm:inline">Chi phí</span>
          </div>
        </div>
      </div>

      {/* Content - Scrollable (matching FullscreenTreeShowcase) */}
      <div className="pt-[73px] pb-6 h-full overflow-y-auto overscroll-behavior-contain">
        {/* Content Cards */}
        <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
          {/* Category Selection Card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-semibold text-green-800 mb-3">Loại chi phí</label>
                <div className="grid grid-cols-2 gap-3">
                  {quickCategories.map(category => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setFormData({...formData, category: category.value, subcategory: ''})}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        formData.category === category.value
                          ? 'border-green-500 bg-green-100 text-green-900 font-semibold shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{category.label.split(' ')[0]}</div>
                      <div className="text-sm font-medium">{category.label.split(' ').slice(1).join(' ')}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Amount Input Card */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-semibold text-blue-800 mb-3">Số tiền (VNĐ)</label>
                
                {/* Quick amount buttons */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[50000, 100000, 200000, 500000].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setFormData({...formData, amount})}
                      className={`px-4 py-3 text-lg rounded-xl border-2 transition-all font-semibold ${
                        formData.amount === amount
                          ? 'border-blue-500 bg-blue-100 text-blue-800 shadow-lg'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {(amount / 1000)}k
                    </button>
                  ))}
                </div>

                {/* Amount input */}
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-6 py-4 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-3xl font-bold text-center text-blue-600 bg-white/80"
                  placeholder="Nhập số tiền"
                  required
                  min="0"
                />
                {formData.amount > 0 && (
                  <p className="text-center text-blue-700 mt-3 text-lg font-medium">
                    {formData.amount.toLocaleString('vi-VN')} VNĐ
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Date & Notes Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="space-y-6">
              {/* Date */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">Ngày</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg bg-white/80"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">Ghi chú</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg bg-white/80"
                  placeholder="Mô tả chi tiết (tùy chọn)"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-all active:scale-95 shadow-lg"
              >
                <CheckCircleIcon className="w-6 h-6" />
                <span>{investment ? 'Cập nhật chi phí' : 'Thêm chi phí'}</span>
              </button>
            </div>
          </div>
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