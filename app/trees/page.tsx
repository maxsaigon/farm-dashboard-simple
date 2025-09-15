'use client'

import { useState } from 'react'
import { Tree } from '@/lib/types'
import { TreeList } from '@/components/TreeList'
import { TreeDetail } from '@/components/TreeDetail'
import BottomSheet from '@/components/ui/BottomSheet'
import LargeTitleHeader from '@/components/ui/LargeTitleHeader'
import AuthGuard from '@/components/AuthGuard'

export default function TreesPage() {
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null)

  const handleTreeSelect = (tree: Tree) => {
    setSelectedTree(tree)
  }

  const handleTreeUpdate = (updatedTree: Tree) => {
    setSelectedTree(updatedTree)
  }

  const handleTreeDelete = () => {
    setSelectedTree(null)
  }

  const handleCloseDetail = () => {
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
              <TreeDetail
                tree={selectedTree}
                onClose={handleCloseDetail}
                onTreeUpdate={handleTreeUpdate}
                onTreeDelete={handleTreeDelete}
                fullScreen={true}
              />
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            {!selectedTree ? (
              <TreeList
                onTreeSelect={handleTreeSelect}
                showActions={true}
              />
            ) : (
              <BottomSheet
                isOpen={!!selectedTree}
                onClose={handleCloseDetail}
                initialDetent="full"
                detents={["full", "large", "medium"]}
                header={
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Thông tin cây</h2>
                      <p className="text-sm text-gray-500">{selectedTree?.name || selectedTree?.id}</p>
                    </div>
                    <button onClick={handleCloseDetail} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200">Đóng</button>
                  </div>
                }
              >
                <TreeDetail
                  tree={selectedTree}
                  onClose={handleCloseDetail}
                  onTreeUpdate={handleTreeUpdate}
                  onTreeDelete={handleTreeDelete}
                  fullScreen={false}
                  disableMobileFullscreen={true}
                />
              </BottomSheet>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}