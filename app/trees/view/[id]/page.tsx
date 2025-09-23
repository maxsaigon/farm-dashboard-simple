'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tree } from '@/lib/types'
import TreeShowcase from '@/components/TreeShowcase'

export default function TreeViewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const treeId = params?.id as string
  const farmId = searchParams?.get('farm')

  const [tree, setTree] = useState<Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTree = async () => {
      if (!treeId || !farmId) {
        setError('Thiếu thông tin cây hoặc trang trại')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const treeRef = doc(db, 'farms', farmId, 'trees', treeId)
        const treeDoc = await getDoc(treeRef)

        if (treeDoc.exists()) {
          const treeData = { id: treeDoc.id, ...treeDoc.data() } as Tree
          setTree(treeData)
        } else {
          setError('Không tìm thấy cây này')
        }
      } catch (error) {
        console.error('Error loading tree:', error)
        setError('Lỗi khi tải thông tin cây')
      } finally {
        setLoading(false)
      }
    }

    loadTree()
  }, [treeId, farmId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải thông tin cây...</p>
        </div>
      </div>
    )
  }

  if (error || !tree) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🌳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Không tìm thấy cây</h1>
          <p className="text-gray-600 mb-6">{error || 'Cây này có thể đã bị xóa hoặc bạn không có quyền truy cập.'}</p>
        </div>
      </div>
    )
  }

  return <TreeShowcase tree={tree} />
}