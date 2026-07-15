'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tree } from '@/lib/types'
import FullscreenTreeShowcase from '@/components/FullscreenTreeShowcase'
import AuthGuard from '@/components/AuthGuard'
import { useSimpleAuth } from '@/lib/optimized-auth-context'

function TreeViewContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const treeId = params?.id as string
  const requestedFarmId = searchParams?.get('farm')
  const { currentFarm, canAccessFarm } = useSimpleAuth()
  const farmId = currentFarm?.id

  const [tree, setTree] = useState<Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTree = async () => {
      if (!treeId || !farmId || !canAccessFarm(farmId) || (requestedFarmId && requestedFarmId !== farmId)) {
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
  }, [treeId, farmId, requestedFarmId, canAccessFarm])

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

  const handleClose = () => {
    // Navigate back to trees page with farm parameter
    if (farmId) {
      router.push(`/trees?farm=${farmId}`)
    } else {
      router.push('/trees')
    }
  }

  const handleSaved = (updatedTree: Tree) => {
    setTree(updatedTree)
  }

  return (
    <FullscreenTreeShowcase 
      tree={tree} 
      isOpen={true}
      onClose={handleClose}
      onSaved={handleSaved}
    />
  )
}

export default function TreeViewPage() {
  return (
    <AuthGuard requiredPermission="read" requireFarmAccess>
      <TreeViewContent />
    </AuthGuard>
  )
}
