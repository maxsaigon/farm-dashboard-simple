'use client'

import React, { useState } from 'react'
import { Tree } from '@/lib/types'
import { MapWrapper } from '@/components/MapWrapper'
import { TreeDetail } from '@/components/TreeDetail'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  MapPinIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

// Demo trees data for the map
const DEMO_TREES: Tree[] = [
  {
    id: "demo-tree-1",
    farmId: "demo-farm-1",
    qrCode: "DEMO-001", 
    name: "Cây Sầu Riêng 001",
    variety: "Monthong",
    zoneCode: "Z01_01",
    plantingDate: new Date('2020-03-15'),
    healthStatus: "Excellent",
    needsAttention: false,
    manualFruitCount: 25,
    aiFruitCount: 28,
    latitude: 10.762622,
    longitude: 106.660172
  },
  {
    id: "demo-tree-2", 
    farmId: "demo-farm-1",
    qrCode: "DEMO-002",
    name: "Cây Sầu Riêng 002",
    variety: "Kan Yao",
    zoneCode: "Z01_02", 
    plantingDate: new Date('2019-08-20'),
    healthStatus: "Good",
    needsAttention: false,
    manualFruitCount: 18,
    aiFruitCount: 22,
    latitude: 10.763122,
    longitude: 106.660672
  },
  {
    id: "demo-tree-3",
    farmId: "demo-farm-1",
    qrCode: "DEMO-003",
    name: "Cây Sầu Riêng 003", 
    variety: "Kan Yao",
    zoneCode: "Z01_03",
    plantingDate: new Date('2021-01-10'),
    healthStatus: "Fair",
    needsAttention: true,
    manualFruitCount: 8,
    aiFruitCount: 5,
    latitude: 10.763622,
    longitude: 106.661172
  },
  {
    id: "demo-tree-4",
    farmId: "demo-farm-1",
    qrCode: "DEMO-004", 
    name: "Cây Sầu Riêng 004",
    variety: "Monthong",
    zoneCode: "Z02_01",
    plantingDate: new Date('2018-11-05'),
    healthStatus: "Good",
    needsAttention: false,
    manualFruitCount: 35,
    aiFruitCount: 31,
    latitude: 10.762122,
    longitude: 106.659672
  },
  {
    id: "demo-tree-5",
    farmId: "demo-farm-1",
    qrCode: "DEMO-005",
    name: "Cây Sầu Riêng 005",
    variety: "Golden Pillow",
    zoneCode: "Z02_02", 
    plantingDate: new Date('2020-06-25'),
    healthStatus: "Excellent",
    needsAttention: false,
    manualFruitCount: 42,
    aiFruitCount: 38,
    latitude: 10.761622,
    longitude: 106.659172
  }
]

export default function MapPage() {
  const [trees] = useState<Tree[]>(DEMO_TREES)
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Filter trees based on search and status
  const filteredTrees = trees.filter(tree => {
    const matchesSearch = !searchTerm || 
      tree.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tree.qrCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tree.zoneCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tree.variety?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'healthy' && ['Excellent', 'Good'].includes(tree.healthStatus || '')) ||
      (filterStatus === 'needs_attention' && tree.needsAttention) ||
      (filterStatus === 'poor' && ['Fair', 'Poor'].includes(tree.healthStatus || ''))

    return matchesSearch && matchesStatus
  })

  const handleTreeSelect = (tree: Tree) => {
    setSelectedTree(tree)
  }

  const handleCloseDetail = () => {
    setSelectedTree(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Bản Đồ Nông Trại</h1>
        
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm cây theo tên, mã QR, khu vực..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Bộ lọc</span>
            </button>
            
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <MapPinIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                {filteredTrees.length} cây
              </span>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Bộ lọc</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="healthy">Khỏe mạnh</option>
                <option value="needs_attention">Cần chú ý</option>
                <option value="poor">Yếu</option>
              </select>
              
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('all')
                }}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map and Detail Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)]">
        {/* Map */}
        <div className="flex-1 order-2 lg:order-1">
          <MapWrapper
            trees={filteredTrees}
            selectedTree={selectedTree}
            onTreeSelect={handleTreeSelect}
            className="w-full h-full"
          />
        </div>

        {/* Tree Detail Sidebar */}
        <div className={`lg:w-96 order-1 lg:order-2 ${selectedTree ? 'block' : 'hidden lg:block'}`}>
          {selectedTree ? (
            <TreeDetail
              tree={selectedTree}
              onClose={handleCloseDetail}
              className="h-full overflow-y-auto"
            />
          ) : (
            <div className="h-full bg-white border-l border-gray-200 p-6 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <EyeIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Chọn một cây trên bản đồ
                </h3>
                <p className="text-gray-600">
                  Nhấn vào marker trên bản đồ để xem thông tin chi tiết của cây.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 justify-center">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span className="text-gray-600">
              Xuất sắc: {trees.filter(t => t.healthStatus === 'Excellent').length}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-gray-600">
              Tốt: {trees.filter(t => t.healthStatus === 'Good').length}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
            <span className="text-gray-600">
              Trung bình: {trees.filter(t => t.healthStatus === 'Fair').length}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-gray-600">
              Cần chú ý: {trees.filter(t => t.needsAttention).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}