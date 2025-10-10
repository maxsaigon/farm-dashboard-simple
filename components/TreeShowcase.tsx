'use client'

import React, { useEffect, useState } from 'react'
import { Tree } from '@/lib/types'
import { ImageGallery } from './ImageGallery'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
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

  useEffect(() => {
    setCount(tree?.manualFruitCount || 0)
  }, [tree?.manualFruitCount])

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
      <div className="relative">
        <div className=" bg-gray-100">
          <ImageGallery tree={tree} className="w-full h-full" />
        </div>

        
      </div>

      {/* Fruit count */}
      <div className="px-4 py-3">

        <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng trái hiện tại</label>
              <input
                type="number"
                value={count || ''}
                onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-2xl font-bold text-center text-green-600"
                placeholder="Nhập số lượng trái"
                min="0"
                disabled={!canSave}
              />
              {count > 0 && (
                <p className="text-center text-gray-600 mt-2 text-sm">
                  {count.toLocaleString()} trái
                </p>
              )}
            </div>

            {!canSave && (
              <div className="flex items-center text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                Đăng nhập và chọn trang trại để lưu thay đổi.
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="px-6 py-3 rounded-xl bg-green-600 text-white disabled:opacity-50 inline-flex items-center gap-2 font-semibold hover:bg-green-700 transition-colors"
              >
                {saving ? 'Đang lưu…' : 'Lưu số lượng'}
                {!saving && <CheckCircleIcon className="h-5 w-5 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
