'use client'

import { useState, useEffect, useRef } from 'react'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
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
  TagIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { XMarkIcon } from '@heroicons/react/24/solid'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid'
import { subscribeToInvestments as subInvestments, addInvestment as addInv, updateInvestment as updInv, deleteInvestment as delInv, migrateLegacyInvestments } from '@/lib/investment-service'
import { FarmService } from '@/lib/farm-service'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { compressImageSmart } from '@/lib/photo-compression'
import { uploadFiles } from '@/lib/storage'
import { getModalZClass, MODAL_Z_INDEX } from '@/lib/modal-z-index'

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
  images?: string[]
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
  const { user, hasPermission, currentFarm, selectedSeasonYear } = useSimpleAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [farmMembers, setFarmMembers] = useState<Array<{userId: string, displayName?: string, email?: string}>>([])
  const [loading, setLoading] = useState(true)
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
  
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Investment | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
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
    'Thuốc BVTV',
    'Công cụ',
    'Lao động',
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
      loadFarmMembers()
    }
  }, [hasPermission, currentFarm])

  // Realtime subscription for farm-scoped investments (single query)
  useEffect(() => {
    if (!user || !currentFarm?.id || !hasPermission('read')) {
      setInvestments([])
      return
    }

    console.log(`Setting up single farm-scoped subscription for farm: ${currentFarm.id}`)
    const unsubscribe = subInvestments(user.uid, currentFarm.id, (items) => {
      setInvestments(items as unknown as Investment[])
    })

    return () => {
      try { if (unsubscribe) unsubscribe() } catch {}
    }
  }, [user?.uid, currentFarm?.id, hasPermission])

  // Fertilizer calculations hidden in demo

  useEffect(() => {
    calculateSummary()
  }, [investments, filterDateRange, selectedSeasonYear])

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

  const loadFarmMembers = async () => {
    if (!user || !currentFarm?.id || !hasPermission('read')) {
      return
    }

    try {
      const members = await FarmService.getFarmMembersWithDisplayNames(currentFarm.id, user.uid)
      setFarmMembers(members)
    } catch (error) {
      console.error('Error loading farm members:', error)
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
    
    // Filter investments by selectedSeasonYear first
    const seasonInvestments = investments.filter(inv => {
      const invDate = inv.date instanceof Date ? inv.date : new Date(inv.date)
      return invDate.getFullYear() === selectedSeasonYear
    })
    
    let filteredInvestments = seasonInvestments
    
    if (filterDateRange === 'thisMonth') {
      filteredInvestments = seasonInvestments.filter(inv => {
        const invDate = inv.date instanceof Date ? inv.date : new Date(inv.date)
        return invDate.getMonth() === currentMonth
      })
    }

    const totalInvestment = filteredInvestments.reduce((sum, inv) => sum + inv.amount, 0)
    const thisMonthInvestment = seasonInvestments.filter(inv => {
      const invDate = inv.date instanceof Date ? inv.date : new Date(inv.date)
      return invDate.getMonth() === currentMonth
    }).reduce((sum, inv) => sum + inv.amount, 0)

    const categoryBreakdown: {[key: string]: number} = {}
    filteredInvestments.forEach(inv => {
      categoryBreakdown[inv.category] = (categoryBreakdown[inv.category] || 0) + inv.amount
    })

    // Calculate monthly trend for the selected season year
    const monthlyTrend = []
    const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12']
    for (let m = 0; m < 12; m++) {
      const monthLabel = `${monthNames[m]} ${selectedSeasonYear.toString().substring(2)}`
      const amount = seasonInvestments.filter(inv => {
        const invDate = inv.date instanceof Date ? inv.date : new Date(inv.date)
        return invDate.getMonth() === m
      }).reduce((sum, inv) => sum + inv.amount, 0)
      monthlyTrend.push({ month: monthLabel, amount })
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

    // Look up user name from farm members
    const member = farmMembers.find(m => m.userId === userId)
    if (member?.displayName) {
      return member.displayName
    }
    if (member?.email) {
      return member.email.split('@')[0] // Show email username part
    }

    // Fallback to truncated ID if no name found
    return userId.substring(0, 8) + '...'
  }

  const filteredInvestments = investments.filter(investment => {
    if (filterCategory !== 'all' && investment.category !== filterCategory) return false
    
    const invDate = investment.date instanceof Date ? investment.date : new Date(investment.date)
    const invYear = invDate.getFullYear()
    
    // By default, only show investments matching the selected season year
    if (invYear !== selectedSeasonYear) return false
    
    if (filterDateRange === 'thisMonth') {
      const now = new Date()
      return invDate.getMonth() === now.getMonth()
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
          images: investmentData.images,
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
                <option value="all">Cả niên vụ {selectedSeasonYear}</option>
                <option value="thisMonth">Tháng này</option>
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
            <div className="bg-gray-50">
              <ul className="space-y-0">
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
                    <li key={investment.id} className="py-1">
                      {/* Compact card design optimized for mobile */}
                      <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        {/* Header: Category + User (compact) */}
                        <div className="px-3 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200 flex items-center justify-between gap-2">
                          {/* Category with icon */}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-base flex-shrink-0">
                              {investment.category === 'Phân bón' ? '🌱' :
                               investment.category === 'Thuốc BVTV' ? '🛡️' :
                               investment.category === 'Công cụ' ? '🔧' :
                               investment.category === 'Lao động' ? '👥' : '📦'}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {investment.subcategory || investment.category}
                            </span>
                            {investment.isRecurring && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 flex-shrink-0">
                                🔄
                              </span>
                            )}
                          </div>

                          {/* User DisplayName - clear and prominent for farmers */}
                          {investment.createdBy && (
                            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 flex-shrink-0">
                              {getUserDisplayName(investment.createdBy)}
                            </span>
                          )}
                        </div>

                        {/* Body: Compact layout */}
                        <div className="p-3">
                          <div className="flex items-start gap-2">
                            {/* Invoice thumbnail - smaller */}
                            {investment.images && investment.images.length > 0 ? (
                              <div
                                className="h-12 w-12 rounded border border-blue-200 cursor-pointer hover:border-blue-400 transition-colors flex-shrink-0"
                                onClick={() => {
                                  setSelectedPhoto(investment)
                                  setShowPhotoModal(true)
                                }}
                              >
                                <img
                                  src={investment.images[0]}
                                  alt="Hoá đơn"
                                  className="h-full w-full object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-image.png'
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <CurrencyDollarIcon className="h-6 w-6 text-blue-500" />
                              </div>
                            )}

                            {/* Amount and details - compact */}
                            <div className="flex-1 min-w-0">
                              {/* Amount - prominent but compact */}
                              <div className="text-xl font-bold text-blue-600 leading-tight">
                                {formatCurrency(investment.amount)}
                              </div>
                              
                              {/* Secondary info: Date + Quantity - single line */}
                              <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                                <span className="flex items-center gap-0.5">
                                  <CalendarIcon className="h-3 w-3" />
                                  {new Date(investment.date).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit'
                                  })}
                                </span>
                                {investment.quantity && investment.unit && (
                                  <span className="flex items-center gap-0.5">
                                    <TagIcon className="h-3 w-3" />
                                    {investment.quantity} {investment.unit}
                                  </span>
                                )}
                              </div>

                              {/* Notes - compact */}
                              {investment.notes && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                  {investment.notes}
                                </p>
                              )}
                            </div>

                            {/* Action buttons - compact horizontal layout */}
                            <div className="flex gap-1 flex-shrink-0">
                              {hasPermission('write') && (
                                <button
                                  onClick={() => {
                                    setSelectedInvestment(investment)
                                    setShowInvestmentModal(true)
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Sửa"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              )}
                              {hasPermission('delete') && (
                                <button
                                  onClick={() => handleDeleteInvestment(investment.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Xóa"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
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
            investments={investments}
            currentSeasonYear={selectedSeasonYear}
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

      {/* Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <PhotoModal
          investment={selectedPhoto}
          isOpen={showPhotoModal}
          onClose={() => {
            setShowPhotoModal(false)
            setSelectedPhoto(null)
          }}
        />
      )}

    </div>
  )
}

// Photo Modal Component for viewing invoices
function PhotoModal({
  investment,
  isOpen,
  onClose
}: {
  investment: Investment
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || !investment.images || investment.images.length === 0) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 ${getModalZClass('PHOTO_VIEWER')}`}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Hoá đơn - {investment.category} - {formatCurrency(investment.amount)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[80vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {investment.images.map((imageUrl, index) => (
              <div key={index} className="space-y-2">
                <div className="text-sm text-gray-600">
                  Hoá đơn {index + 1}
                </div>
                <img
                  src={imageUrl}
                  alt={`Hoá đơn ${index + 1}`}
                  className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png'
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Danh mục:</span>
                <span className="ml-2 text-gray-900">{investment.category}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Số tiền:</span>
                <span className="ml-2 text-gray-900">{formatCurrency(investment.amount)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Ngày:</span>
                <span className="ml-2 text-gray-900">{new Date(investment.date).toLocaleDateString('vi-VN')}</span>
              </div>
              {investment.notes && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Ghi chú:</span>
                  <span className="ml-2 text-gray-900">{investment.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Season Investment Summary Component
function SeasonInvestmentCard({ investments, currentSeasonYear }: { investments: Investment[], currentSeasonYear: number }) {
  const [investmentData, setInvestmentData] = useState<{
    lastSeason: { year: number, total: number, count: number },
    currentSeason: { year: number, total: number, count: number }
  }>({
    lastSeason: { year: currentSeasonYear - 1, total: 0, count: 0 },
    currentSeason: { year: currentSeasonYear, total: 0, count: 0 }
  })

  useEffect(() => {
    // Calculate seasonal investment data from provided investments
    const lastSeasonInvestments = investments.filter(inv => {
      const invYear = new Date(inv.date).getFullYear()
      return invYear === currentSeasonYear - 1
    })

    const currentSeasonInvestments = investments.filter(inv => {
      const invYear = new Date(inv.date).getFullYear()
      return invYear === currentSeasonYear
    })

    setInvestmentData({
      lastSeason: {
        year: currentSeasonYear - 1,
        total: lastSeasonInvestments.reduce((sum, inv) => sum + inv.amount, 0),
        count: lastSeasonInvestments.length
      },
      currentSeason: {
        year: currentSeasonYear,
        total: currentSeasonInvestments.reduce((sum, inv) => sum + inv.amount, 0),
        count: currentSeasonInvestments.length
      }
    })
  }, [investments, currentSeasonYear])


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
    notes: investment?.notes || '',
    images: investment?.images || []
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formData.amount || formData.amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ')
      return
    }

    try {
      let imageUrls: string[] = formData.images || []

      // Upload new images if any
      if (selectedFiles.length > 0) {
        setUploadingImages(true)
        const compressedFiles = await Promise.all(
          selectedFiles.map(file => compressImageSmart(file, 'general'))
        )

        const basePath = `investments/${Date.now()}`
        const uploadedUrls = await uploadFiles(compressedFiles, basePath)
        imageUrls = [...imageUrls, ...uploadedUrls]
        setUploadingImages(false)
      }

      onSave({
        ...formData,
        images: imageUrls,
        date: new Date(formData.date)
      })
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Lỗi khi tải lên hình ảnh: ' + (error instanceof Error ? error.message : String(error)))
      setUploadingImages(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || []
    }))
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
    <div className={`fixed inset-0 bg-white ${getModalZClass('MANAGEMENT_MODAL')}`}>
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

              {/* Image Upload */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">Hoá đơn</label>
                <div className="space-y-4">
                  {/* Existing Images */}
                  {formData.images && formData.images.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Hoá đơn hiện có:</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {formData.images.map((imageUrl, index) => (
                          <div key={index} className="relative">
                            <img
                              src={imageUrl}
                              alt={`Investment ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Images to Upload */}
                  {selectedFiles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Hoá đơn mới:</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`New ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removeSelectedFile(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex items-center space-x-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImages}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium"
                    >
                      <PhotoIcon className="h-4 w-4" />
                      <span>{uploadingImages ? 'Đang tải...' : 'Chọn hoá đơn'}</span>
                    </button>
                    {selectedFiles.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {selectedFiles.length} hoá đơn được chọn
                      </span>
                    )}
                  </div>
                </div>
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