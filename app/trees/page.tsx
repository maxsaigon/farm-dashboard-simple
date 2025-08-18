'use client'

import { useState } from 'react'
import { Tree } from '@/lib/types'
import { TreeList } from '@/components/TreeList'
import { TreeDetail } from '@/components/TreeDetail'

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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quản Lý Cây Sầu Riêng</h1>
          <p className="text-gray-600 mt-2">
            Theo dõi và quản lý thông tin chi tiết của từng cây trong nông trại
          </p>
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
            <TreeDetail
              tree={selectedTree}
              onClose={handleCloseDetail}
              onTreeUpdate={handleTreeUpdate}
              onTreeDelete={handleTreeDelete}
            />
          )}
        </div>
      </div>
    </div>
  )
}