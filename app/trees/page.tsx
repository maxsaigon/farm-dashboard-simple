'use client'

import { useState } from 'react'
import { Tree } from '@/lib/types'
import { TreeList } from '@/components/TreeList'
import FullscreenTreeShowcase from '@/components/FullscreenTreeShowcase'
import BottomSheet from '@/components/ui/BottomSheet'
import LargeTitleHeader from '@/components/ui/LargeTitleHeader'
import AuthGuard from '@/components/AuthGuard'

export default function TreesPage() {
   const [selectedTree, setSelectedTree] = useState<Tree | null>(null)
   const [showFullscreenTree, setShowFullscreenTree] = useState(false)

   const handleTreeSelect = (tree: Tree) => {
     setSelectedTree(tree)
     setShowFullscreenTree(true)
   }

   const handleTreeUpdate = (updatedTree: Tree) => {
     setSelectedTree(updatedTree)
   }

   const handleTreeDelete = () => {
     setSelectedTree(null)
     setShowFullscreenTree(false)
   }

   const handleCloseDetail = () => {
     setShowFullscreenTree(false)
     setSelectedTree(null)
   }

  return (
    <AuthGuard requiredPermission="read" requireFarmAccess={true}>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-2">
            {/* iOS large title */}
            <LargeTitleHeader
              title="Quản Lý Cây Sầu Riêng"
              subtitle="Theo dõi và quản lý thông tin chi tiết của từng cây trong nông trại"
            />
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-6">
            {/* Tree List - 2 columns */}
            <div className="lg:col-span-2">
              <TreeList
                onTreeSelect={handleTreeSelect}
                selectedTreeId={selectedTree?.id}
                showActions={true}
              />
            </div>

            {/* Tree Detail - 3 columns */}
            <div className="lg:col-span-3">
              {selectedTree && !showFullscreenTree ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">🌳</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Xem chi tiết cây</h3>
                    <p className="text-gray-600 mb-4">
                      Nhấn vào tên cây để xem thông tin chi tiết đầy đủ.
                    </p>
                    <button
                      onClick={() => setShowFullscreenTree(true)}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">👆</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn một cây để xem chi tiết</h3>
                    <p className="text-gray-600">
                      Nhấn vào một cây trong danh sách để xem thông tin chi tiết.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            <TreeList
              onTreeSelect={handleTreeSelect}
              showActions={true}
            />
          </div>
        </div>
      </div>

      {/* Fullscreen Tree Showcase */}
      <FullscreenTreeShowcase
        tree={selectedTree}
        isOpen={showFullscreenTree}
        onClose={handleCloseDetail}
        onSaved={handleTreeUpdate}
      />
    </AuthGuard>
  )
}