'use client'

import React, { useEffect, useState } from 'react'
import { Tree } from '@/lib/types'
import { ImageGallery } from './ImageGallery'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { updateTree } from '@/lib/firestore'
import { CheckCircleIcon, MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useToast } from './Toast'
import { db } from '@/lib/firebase'
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore'

interface Props {
  tree: Tree | null
  onSaved?: (tree: Tree) => void
}

export default function TreeShowcase({ tree, onSaved }: Props) {
  const { user, currentFarm } = useSimpleAuth()
  const { showSuccess, showError, ToastContainer } = useToast()
  const [count, setCount] = useState<number>(tree?.manualFruitCount || 0)
  const [saving, setSaving] = useState(false)
  const [seasonLoading, setSeasonLoading] = useState(false)
  const [lastSeason, setLastSeason] = useState<{ name?: string; perTreeCount: number } | null>(null)

  useEffect(() => {
    setCount(tree?.manualFruitCount || 0)
  }, [tree?.manualFruitCount])

  // Fetch last season summary for the farm
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
          // perTreeBreakdown is expected to be a map of treeId -> count or object { count }
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
    fetchLastSeason()
  }, [currentFarm?.id, tree?.id])

  if (!tree) {
    return (
      <div className="p-6 text-center text-gray-600">Chưa chọn cây</div>
    )
  }

  const canSave = !!user && !!currentFarm

  const handleSave = async () => {
    if (!canSave) return
    try {
      setSaving(true)
      await updateTree(currentFarm!.id, tree.id, user!.uid, { manualFruitCount: count })
      onSaved?.({ ...tree, manualFruitCount: count })
      showSuccess('Đã lưu', 'Số lượng trái đã được cập nhật')
    } catch (e) {
      showError('Lỗi', 'Không thể lưu. Vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white min-h-screen relative z-[10011]">
      <ToastContainer />
      {/* Hero */}
      <div className="relative bg-black">
        <div className=" bg-gray-100">
          <ImageGallery tree={tree} className="w-full h-full" />
        </div>

        
      </div>

      {/* Fruit count */}
      <div className="px-4 py-3 space-y-3">
        {/* Last season summary */}
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Mùa trước</div>
              {seasonLoading ? (
                <div className="text-gray-400 text-sm">Đang tải…</div>
              ) : lastSeason ? (
                <div>
                  <div className="text-lg font-medium text-gray-800">{lastSeason.name || 'Mùa gần nhất'}</div>
                  <div className="text-2xl font-bold text-amber-600">{lastSeason.perTreeCount.toLocaleString()} trái</div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">Chưa có dữ liệu mùa</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Số lượng trái</div>
              <div className="text-3xl font-bold text-green-600">{count.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-12 w-12 rounded-full border-2 border-gray-200 text-2xl active:scale-95"
                onClick={() => setCount(prev => Math.max(0, prev - 1))}
                aria-label="Giảm 1"
              >
                –
              </button>
              <button
                className="h-12 w-12 rounded-full bg-green-600 text-white text-2xl active:scale-95"
                onClick={() => setCount(prev => prev + 1)}
                aria-label="Tăng 1"
              >
                +
              </button>
            </div>
          </div>

          {!canSave && (
            <div className="mt-3 flex items-center text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Đăng nhập và chọn trang trại để lưu thay đổi.
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? 'Đang lưu…' : 'Lưu'}
              {!saving && <CheckCircleIcon className="h-5 w-5 text-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
