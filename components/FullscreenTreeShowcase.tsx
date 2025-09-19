'use client'

import React, { useEffect, useState } from 'react'
import { Tree } from '@/lib/types'
import { XMarkIcon, ShareIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ImageGallery } from './ImageGallery'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { updateTree } from '@/lib/firestore'
import { useToast } from './Toast'
import ShareTreeModal from './ShareTreeModal'
import { db } from '@/lib/firebase'
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore'

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

  // Initialize fruit count when tree changes
  useEffect(() => {
    if (tree) {
      setCount(tree.manualFruitCount || 0)
    }
  }, [tree])

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
    if (!user || !currentFarm || !tree) return
    try {
      setSaving(true)
      await updateTree(currentFarm.id, tree.id, user.uid, { manualFruitCount: count })
      onSaved?.({ ...tree, manualFruitCount: count })
      showSuccess('Đã lưu', 'Số lượng trái đã được cập nhật')
    } catch (e) {
      showError('Lỗi', 'Không thể lưu. Vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !tree) {
    return null
  }

  const canSave = !!user && !!currentFarm

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
          {/* Last Season Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-700 mb-1">Mùa trước</div>
                {seasonLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                    <span className="text-amber-600 text-sm">Đang tải...</span>
                  </div>
                ) : lastSeason ? (
                  <div>
                    <div className="text-lg font-semibold text-amber-800 mb-1">
                      {lastSeason.name || 'Mùa gần nhất'}
                    </div>
                    <div className="text-3xl font-bold text-amber-600">
                      {lastSeason.perTreeCount.toLocaleString()} trái
                    </div>
                  </div>
                ) : (
                  <div className="text-amber-600 text-sm">Chưa có dữ liệu mùa</div>
                )}
              </div>
              <div className="text-4xl opacity-50">🍃</div>
            </div>
          </div>

          {/* Fruit Count Card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-green-700 mb-1">Số lượng trái hiện tại</div>
                <div className="text-4xl font-bold text-green-600">{count.toLocaleString()}</div>
              </div>
              <div className="text-5xl opacity-50">🥭</div>
            </div>

            {/* Counter Controls */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <button
                className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-gray-300 bg-white text-2xl font-bold text-gray-600 hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition-all"
                onClick={() => setCount(prev => Math.max(0, prev - 1))}
                aria-label="Giảm 1"
              >
                –
              </button>
              
              <div className="text-center min-w-[80px]">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500">trái</div>
              </div>
              
              <button
                className="flex items-center justify-center w-14 h-14 rounded-full bg-green-600 text-white text-2xl font-bold hover:bg-green-700 active:scale-95 transition-all shadow-lg"
                onClick={() => setCount(prev => prev + 1)}
                aria-label="Tăng 1"
              >
                +
              </button>
            </div>

            {/* Quick increment buttons */}
            <div className="flex items-center justify-center space-x-2 mb-6">
              {[5, 10, 25].map(increment => (
                <button
                  key={increment}
                  onClick={() => setCount(prev => prev + increment)}
                  className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 active:scale-95 transition-all"
                >
                  +{increment}
                </button>
              ))}
            </div>

            {/* Warning for non-authenticated users */}
            {!canSave && (
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
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
                <div className="text-sm text-gray-500">Mã QR</div>
                <div className="font-medium text-gray-900 font-mono text-sm">{tree.qrCode || tree.id}</div>
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