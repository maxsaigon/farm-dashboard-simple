'use client'

import React, { useEffect, useState } from 'react'
import { Tree } from '@/lib/types'
import { XMarkIcon, ShareIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ImageGallery } from './ImageGallery'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { updateTree } from '@/lib/firestore'
import { useToast } from './Toast'
import ShareTreeModal from './ShareTreeModal'
import TreeNoteSystem from './TreeNoteSystem'
import { db } from '@/lib/firebase'
import { collection, getDocs, orderBy, limit, query, where } from 'firebase/firestore'

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

// Helper function to get durian season status (reusable)
function getDurianSeasonStatus(lastSeason: { name?: string; perTreeCount: number; endDate?: any } | null) {
  if (!lastSeason) {
    return {
      status: 'new_tree',
      icon: '🌱',
      title: 'Cây mới hoặc chưa có dữ liệu',
      description: 'Chưa có thông tin mùa vụ trước',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  }

  // Get actual season end date
  const now = new Date()
  let lastSeasonEndDate: Date
  
  if (lastSeason.endDate) {
    // Convert Firestore timestamp to Date
    lastSeasonEndDate = lastSeason.endDate.toDate ? lastSeason.endDate.toDate() : new Date(lastSeason.endDate)
  } else {
    // Fallback: estimate based on current date - typically durian season ends around Aug-Sept
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    // If we're before August, assume last season was previous year
    // If we're after August, assume last season was this year
    const seasonYear = currentMonth < 7 ? currentYear - 1 : currentYear
    lastSeasonEndDate = new Date(seasonYear, 8, 30) // End of September
  }

  // Calculate months since last season ended
  const monthsSinceHarvest = Math.floor((now.getTime() - lastSeasonEndDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
  const seasonYear = lastSeasonEndDate.getFullYear()

  if (monthsSinceHarvest < 0) {
    // We're still in the season
    return {
      status: 'current_season',
      icon: '🥭',
      title: 'Đang trong mùa sầu riêng',
      description: 'Có thể đếm và cập nhật số trái',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      lastCount: lastSeason.perTreeCount,
      seasonYear,
      expectedNextSeason: 'Mùa hiện tại'
    }
  } else if (monthsSinceHarvest <= 3) {
    // 0-3 months after harvest
    return {
      status: 'post_harvest',
      icon: '✂️',
      title: 'Giai đoạn sau thu hoạch',
      description: 'Cây đang nghỉ ngơi và tái tạo, số trái = 0',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      lastCount: lastSeason.perTreeCount,
      seasonYear,
      expectedNextSeason: '6-9 tháng nữa'
    }
  } else if (monthsSinceHarvest <= 9) {
    // 3-9 months: growing phase
    return {
      status: 'growing',
      icon: '🌿',
      title: 'Giai đoạn tăng trưởng',
      description: 'Cây đang phát triển lá và cành, chưa ra trái',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      lastCount: lastSeason.perTreeCount,
      seasonYear,
      expectedNextSeason: `${Math.max(1, 9 - monthsSinceHarvest)} tháng nữa`
    }
  } else if (monthsSinceHarvest <= 12) {
    // 9-12 months: flowering phase
    return {
      status: 'flowering',
      icon: '🌸',
      title: 'Giai đoạn ra hoa',
      description: 'Cây bắt đầu ra hoa, có thể xuất hiện trái non',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      lastCount: lastSeason.perTreeCount,
      seasonYear,
      expectedNextSeason: 'Sắp tới mùa mới'
    }
  } else {
    // 12+ months: new season should have started
    const nextSeasonYear = seasonYear + 1
    return {
      status: 'new_season',
      icon: '🥭',
      title: `Mùa sầu riêng ${nextSeasonYear}`,
      description: 'Có thể đếm trái chín cho mùa mới',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      lastCount: lastSeason.perTreeCount,
      seasonYear,
      expectedNextSeason: `Mùa ${nextSeasonYear}`
    }
  }
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
            {lastSeason.total.toLocaleString()} VNĐ
          </div>
          <div className="text-xs text-gray-500">
            {lastSeason.count} khoản đầu tư
          </div>
        </div>
        
        <div className="bg-white/60 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Mùa này ({currentSeason.year})</div>
          <div className="text-2xl font-bold text-green-600">
            {currentSeason.total.toLocaleString()} VNĐ
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
                {difference > 0 ? '+' : ''}{difference.toLocaleString()} VNĐ
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

// Durian Season Status Component
function DurianSeasonStatus({ lastSeason }: { lastSeason: { name?: string; perTreeCount: number; endDate?: any } | null }) {
  const status = getDurianSeasonStatus(lastSeason)

  return (
    <div>
      <div className="flex items-center space-x-3 mb-3">
        <div className={`w-12 h-12 rounded-full ${status.bgColor} flex items-center justify-center`}>
          <span className="text-2xl">{status.icon}</span>
        </div>
        <div>
          <div className={`text-lg font-semibold ${status.color}`}>
            {status.title}
          </div>
          <div className="text-sm text-amber-700">
            {status.description}
          </div>
        </div>
      </div>

      {status.lastCount && (
        <div className="bg-white/60 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-amber-700">
              Mùa trước{status.seasonYear ? ` (${status.seasonYear})` : ''}:
            </span>
            <span className="font-bold text-amber-800">{status.lastCount.toLocaleString()} trái</span>
          </div>
          {status.expectedNextSeason && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-700">Mùa tiếp theo:</span>
              <span className="text-sm font-medium text-amber-800">{status.expectedNextSeason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  tree: Tree | null
  isOpen: boolean
  onClose: () => void
  onSaved?: (tree: Tree) => void
}

export default function FullscreenTreeShowcase({ tree, isOpen, onClose, onSaved }: Props) {
  const { user, currentFarm } = useSimpleAuth()
  const { showSuccess, showError, ToastContainer } = useToast()
  const [showShareModal, setShowShareModal] = useState(false)
  const [count, setCount] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [seasonLoading, setSeasonLoading] = useState(false)
  const [lastSeason, setLastSeason] = useState<{ name?: string; perTreeCount: number } | null>(null)

  // Initialize fruit count when tree changes, considering durian season status
  useEffect(() => {
    console.log('🔥 DEBUG: Tree changed, initializing count:', {
      tree: !!tree,
      treeId: tree?.id,
      manualFruitCount: tree?.manualFruitCount,
      newCount: tree?.manualFruitCount || 0
    })
    if (tree) {
      // Check if we're in a new season that should reset count to 0
      const shouldResetCount = lastSeason && getDurianSeasonStatus(lastSeason)?.expectedNextSeason === 'Mùa hiện tại'
      
      if (shouldResetCount) {
        console.log('🔥 DEBUG: New season detected, resetting count to 0')
        setCount(0)
      } else {
        setCount(tree.manualFruitCount || 0)
      }
    }
  }, [tree, lastSeason])

  // Handle fullscreen mode
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !showShareModal) {
          onClose()
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose, showShareModal])

  // Fetch last season data
  useEffect(() => {
    async function fetchLastSeason() {
      if (!currentFarm?.id || !tree?.id) return
      try {
        setSeasonLoading(true)
        const seasonsRef = collection(db, 'farms', currentFarm.id, 'seasons')
        const q = query(seasonsRef, orderBy('endDate', 'desc'), limit(1))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const docSnap = snap.docs[0]
          const data = docSnap.data() as any
          const perTreeBreakdown = data.perTreeBreakdown || {}
          const toNum = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? (parseInt(v, 10) || 0) : 0)
          let perTreeCount = 0
          const entry = perTreeBreakdown[tree.id]
          if (typeof entry === 'number' || typeof entry === 'string') {
            perTreeCount = toNum(entry)
          } else if (entry && typeof entry === 'object') {
            if ('count' in entry) perTreeCount = toNum((entry as any).count)
            else if ('total' in entry) perTreeCount = toNum((entry as any).total)
            else if ('fruitCount' in entry) perTreeCount = toNum((entry as any).fruitCount)
            else if ('numberOFfrust' in entry) perTreeCount = toNum((entry as any).numberOFfrust)
            else if ('numberOfFrust' in entry) perTreeCount = toNum((entry as any).numberOfFrust)
            else if ('frustCount' in entry) perTreeCount = toNum((entry as any).frustCount)
          }
          setLastSeason({ name: data.name, perTreeCount })
        } else {
          setLastSeason(null)
        }
      } catch (e) {
        console.warn('Failed to fetch seasons', e)
        setLastSeason(null)
      } finally {
        setSeasonLoading(false)
      }
    }
    if (isOpen && tree) {
      fetchLastSeason()
    }
  }, [currentFarm?.id, tree?.id, isOpen])

  const handleSave = async () => {
    console.log('🔥 DEBUG: handleSave clicked!')
    console.log('🔥 DEBUG: Current state:', {
      user: !!user,
      userId: user?.uid,
      currentFarm: !!currentFarm,
      farmId: currentFarm?.id,
      tree: !!tree,
      treeId: tree?.id,
      count: count,
      canSave: !!user && !!currentFarm,
      saving: saving
    })

    if (!user) {
      console.log('❌ DEBUG: No user logged in')
      showError('Lỗi', 'Bạn chưa đăng nhập')
      return
    }
    
    if (!currentFarm) {
      console.log('❌ DEBUG: No farm selected')
      showError('Lỗi', 'Chưa chọn trang trại')
      return
    }
    
    if (!tree) {
      console.log('❌ DEBUG: No tree data')
      showError('Lỗi', 'Không có dữ liệu cây')
      return
    }

    console.log('✅ DEBUG: All validations passed, starting save...')
    
    // Debug: Check user's farm access and admin status
    try {
      const { FarmService } = await import('@/lib/farm-service')
      const { AdminService } = await import('@/lib/admin-service')
      
      const isAdmin = AdminService.isAdmin(user.uid)
      console.log('🔥 DEBUG: Is user admin?', isAdmin)
      
      const userAccess = await FarmService.getUserFarmAccess(user.uid, currentFarm.id)
      console.log('🔥 DEBUG: User farm access:', userAccess)
      
      // Also check what farms the user DOES have access to
      const userFarms = await FarmService.getUserFarms(user.uid)
      console.log('🔥 DEBUG: All user farms:', userFarms.map(f => ({ id: f.id, name: f.name })))
      console.log('🔥 DEBUG: Current farm trying to access:', { id: currentFarm.id, name: currentFarm.name })
      
    } catch (error) {
      console.log('❌ DEBUG: Could not check user access:', error)
    }
    
    try {
      setSaving(true)
      console.log('🔥 DEBUG: Calling updateTree with:', {
        farmId: currentFarm.id,
        treeId: tree.id,
        userId: user.uid,
        data: { manualFruitCount: count }
      })
      
      await updateTree(currentFarm.id, tree.id, user.uid, { manualFruitCount: count })
      
      console.log('✅ DEBUG: updateTree successful!')
      
      onSaved?.({ ...tree, manualFruitCount: count })
      console.log('✅ DEBUG: onSaved callback called')
      
      showSuccess('Đã lưu', 'Số lượng trái đã được cập nhật')
      console.log('✅ DEBUG: Success message shown')
      
    } catch (e) {
      console.error('❌ DEBUG: Save failed:', e)
      console.error('❌ DEBUG: Error details:', {
        message: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : 'No stack trace'
      })
      showError('Lỗi', `Không thể lưu: ${e instanceof Error ? e.message : 'Lỗi không xác định'}`)
    } finally {
      setSaving(false)
      console.log('🔥 DEBUG: Save operation completed, saving set to false')
    }
  }

  if (!isOpen || !tree) {
    return null
  }

  const canSave = !!user && !!currentFarm

  // Debug logging for button state
  console.log('🔥 DEBUG: Button render state:', {
    canSave,
    saving,
    user: !!user,
    currentFarm: !!currentFarm,
    tree: !!tree,
    count,
    buttonDisabled: !canSave || saving
  })

  return (
    <div className="fixed inset-0 z-[50000] bg-white">
      <ToastContainer />
      
      {/* Header - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={onClose}
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
              title="Đóng"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {tree.name || tree.variety || 'Cây trồng'}
              </h1>
              <p className="text-sm text-gray-500 truncate">
                {tree.zoneName || tree.zoneCode || 'Không có khu vực'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowShareModal(true)}
            className="flex-shrink-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors active:scale-95"
            title="Chia sẻ cây này"
          >
            <ShareIcon className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">Chia sẻ</span>
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="pt-[73px] pb-6 h-full overflow-y-auto overscroll-behavior-contain">
        {/* Image Gallery */}
        <div className="relative bg-black">
          <ImageGallery tree={tree} className="w-full aspect-[4/3] sm:aspect-[16/9] object-cover" />
        </div>

        {/* Content Cards */}
        <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
          {/* Collaborative Notes System */}
          {currentFarm?.id && (
            <TreeNoteSystem 
              treeId={tree.id} 
              farmId={currentFarm.id}
            />
          )}

          {/* Durian Season Status Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-700 mb-2">Trạng thái cây sầu riêng</div>
                {seasonLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                    <span className="text-amber-600 text-sm">Đang tải...</span>
                  </div>
                ) : (
                  <DurianSeasonStatus lastSeason={lastSeason} />
                )}
              </div>
            </div>
          </div>


          {/* Fruit Count Card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 shadow-sm">
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-green-800 mb-3">Số lượng trái hiện tại</label>
                <input
                  type="number"
                  value={count || ''}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0
                    console.log('🔥 DEBUG: Input changed:', {
                      inputValue: e.target.value,
                      parsedValue: newValue,
                      oldCount: count
                    })
                    setCount(newValue)
                  }}
                  className="w-full px-6 py-4 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-3xl font-bold text-center text-green-600 bg-white/80"
                  placeholder="Nhập số lượng trái"
                  min="0"
                  disabled={!canSave}
                />
                {count > 0 && (
                  <p className="text-center text-green-700 mt-3 text-lg font-medium">
                    {count.toLocaleString()} trái
                  </p>
                )}
              </div>

              {/* Warning for non-authenticated users */}
              {!canSave && (
                <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium mb-1">Cần đăng nhập</div>
                    <div>Đăng nhập và chọn trang trại để lưu thay đổi.</div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all active:scale-95 shadow-lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-6 h-6" />
                    <span>Lưu số lượng</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tree Info Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cây</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Giống cây</div>
                <div className="font-medium text-gray-900">{tree.variety || 'Chưa xác định'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Tình trạng</div>
                <div className="font-medium text-gray-900">{tree.healthStatus || 'Tốt'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Khu vực</div>
                <div className="font-medium text-gray-900">{tree.zoneName || tree.zoneCode || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Sức Khoẻ</div>
                <div className="font-medium text-gray-900 font-mono text-sm">{tree.healthNotes || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Vị trí GPS</div>
                <div className="font-medium text-gray-900 font-mono text-sm">{tree.gpsAccuracy || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareTreeModal
        tree={tree}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  )
}