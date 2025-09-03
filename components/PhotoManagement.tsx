'use client'

import { useState, useEffect, useRef } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import {
  PhotoIcon,
  CameraIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon,
  MapPinIcon,
  BeakerIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'
import {
  HeartIcon as HeartIconSolid,
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid'

interface Photo {
  id: string
  treeId: string
  treeName?: string
  timestamp: Date
  localPath: string
  farmId: string
  filename: string
  photoType: 'general' | 'fruit' | 'disease' | 'growth' | 'maintenance'
  userNotes?: string
  manualFruitCount?: number
  latitude?: number
  longitude?: number
  altitude?: number
  needsAIAnalysis: boolean
  uploadedToServer: boolean
  serverProcessed: boolean
  uploadDate?: Date
  thumbnailPath?: string
  compressedPath?: string
  aiReadyPath?: string
  originalPath?: string
  localStorageDate: Date
  totalLocalSize: number
  aiAnalysisResult?: {
    fruitCount: number
    confidence: number
    diseaseDetected: boolean
    growthStage?: string
    healthScore: number
  }
}

interface PhotoFilters {
  photoType?: string
  treeId?: string
  needsAIAnalysis?: boolean
  uploadedToServer?: boolean
  hasAIResults?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

export default function PhotoManagement() {
  const { user, hasPermission, currentFarm } = useEnhancedAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([])
  const [trees, setTrees] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<PhotoFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'date' | 'tree' | 'type' | 'ai'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [aiProcessingQueue, setAiProcessingQueue] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const photoTypes = [
    { value: 'general', label: 'Tổng quan', color: 'blue' },
    { value: 'fruit', label: 'Trái cây', color: 'orange' },
    { value: 'disease', label: 'Bệnh tật', color: 'red' },
    { value: 'growth', label: 'Phát triển', color: 'green' },
    { value: 'maintenance', label: 'Bảo dưỡng', color: 'purple' }
  ]

  useEffect(() => {
    if (hasPermission('photos:read')) {
      loadPhotos()
      loadTrees()
    }
  }, [hasPermission, currentFarm])

  useEffect(() => {
    applyFiltersAndSearch()
  }, [photos, searchTerm, filters, sortBy, sortOrder])

  const loadPhotos = async () => {
    try {
      setLoading(true)
      // Load photos from Firebase
      // Load real photos data from API - no mock data
      // TODO: Implement actual API call to load photos
      setPhotos([])
          needsAIAnalysis: false,
          uploadedToServer: true,
          serverProcessed: true,
          uploadDate: new Date('2024-01-15T10:35:00'),
          thumbnailPath: '/photos/thumbs/tree1_20240115_1_thumb.jpg',
          compressedPath: '/photos/compressed/tree1_20240115_1_comp.jpg',
          localStorageDate: new Date('2024-01-15T10:30:00'),
          totalLocalSize: 2840000,
          aiAnalysisResult: {
            fruitCount: 27,
            confidence: 0.92,
            diseaseDetected: false,
            growthStage: 'mature',
            healthScore: 8.5
          }
        },
        {
          id: '2',
          treeId: 'tree2',
          treeName: 'DUR-002',
          timestamp: new Date('2024-01-16T14:20:00'),
          localPath: '/photos/tree2_20240116_1.jpg',
          farmId: currentFarm?.id || 'farm1',
          filename: 'tree2_disease_check.jpg',
          photoType: 'disease',
          userNotes: 'Phát hiện vết đốm trên lá',
          latitude: 10.8235,
          longitude: 106.6299,
          needsAIAnalysis: true,
          uploadedToServer: false,
          serverProcessed: false,
          localStorageDate: new Date('2024-01-16T14:20:00'),
          totalLocalSize: 3200000
        },
        {
          id: '3',
          treeId: 'tree1',
          treeName: 'DUR-001',
          timestamp: new Date('2024-01-17T08:45:00'),
          localPath: '/photos/tree1_20240117_1.jpg',
          farmId: currentFarm?.id || 'farm1',
          filename: 'tree1_growth_check.jpg',
          photoType: 'growth',
          userNotes: 'Kiểm tra phát triển sau bón phân',
          latitude: 10.8231,
          longitude: 106.6297,
          needsAIAnalysis: true,
          uploadedToServer: true,
          serverProcessed: false,
          uploadDate: new Date('2024-01-17T09:00:00'),
          localStorageDate: new Date('2024-01-17T08:45:00'),
          totalLocalSize: 2950000
    } catch (error) {
      console.error('Error loading photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTrees = async () => {
    try {
      // Load tree list for filtering
      const mockTrees = [
        { id: 'tree1', name: 'DUR-001' },
        { id: 'tree2', name: 'DUR-002' },
        { id: 'tree3', name: 'DUR-003' }
      ]
      setTrees(mockTrees)
    } catch (error) {
      console.error('Error loading trees:', error)
    }
  }

  const applyFiltersAndSearch = () => {
    let filtered = [...photos]

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(photo =>
        photo.treeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.userNotes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply filters
    if (filters.photoType) {
      filtered = filtered.filter(photo => photo.photoType === filters.photoType)
    }
    if (filters.treeId) {
      filtered = filtered.filter(photo => photo.treeId === filters.treeId)
    }
    if (filters.needsAIAnalysis !== undefined) {
      filtered = filtered.filter(photo => photo.needsAIAnalysis === filters.needsAIAnalysis)
    }
    if (filters.uploadedToServer !== undefined) {
      filtered = filtered.filter(photo => photo.uploadedToServer === filters.uploadedToServer)
    }
    if (filters.hasAIResults !== undefined) {
      filtered = filtered.filter(photo => 
        filters.hasAIResults ? !!photo.aiAnalysisResult : !photo.aiAnalysisResult
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = a.timestamp.getTime() - b.timestamp.getTime()
          break
        case 'tree':
          comparison = (a.treeName || '').localeCompare(b.treeName || '')
          break
        case 'type':
          comparison = a.photoType.localeCompare(b.photoType)
          break
        case 'ai':
          const aHasAI = !!a.aiAnalysisResult
          const bHasAI = !!b.aiAnalysisResult
          comparison = aHasAI === bHasAI ? 0 : aHasAI ? -1 : 1
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredPhotos(filtered)
  }

  const handlePhotoUpload = async (files: FileList) => {
    if (!hasPermission('photos:write')) return

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Create new photo record
        const newPhoto: Photo = {
          id: Date.now().toString() + i,
          treeId: '', // Would be selected in upload modal
          timestamp: new Date(),
          localPath: URL.createObjectURL(file),
          farmId: currentFarm?.id || '',
          filename: file.name,
          photoType: 'general',
          needsAIAnalysis: true,
          uploadedToServer: false,
          serverProcessed: false,
          localStorageDate: new Date(),
          totalLocalSize: file.size
        }
        
        setPhotos(prev => [...prev, newPhoto])
      }
    } catch (error) {
      console.error('Error uploading photos:', error)
    }
  }

  const handleBulkUpload = async (selectedPhotos: string[]) => {
    try {
      // Upload selected photos to server
      for (const photoId of selectedPhotos) {
        setPhotos(prev => prev.map(photo => 
          photo.id === photoId 
            ? { ...photo, uploadedToServer: true, uploadDate: new Date() }
            : photo
        ))
      }
      setBulkSelection(new Set())
      setShowBulkActions(false)
    } catch (error) {
      console.error('Error bulk uploading:', error)
    }
  }

  const handleBulkAIAnalysis = async (selectedPhotos: string[]) => {
    try {
      // Queue photos for AI analysis
      setAiProcessingQueue(new Set(selectedPhotos))
      
      // Simulate AI processing
      for (const photoId of selectedPhotos) {
        setTimeout(() => {
          setPhotos(prev => prev.map(photo => 
            photo.id === photoId 
              ? { 
                  ...photo, 
                  needsAIAnalysis: false,
                  serverProcessed: true,
                  aiAnalysisResult: {
                    fruitCount: Math.floor(Math.random() * 30) + 5,
                    confidence: 0.8 + Math.random() * 0.2,
                    diseaseDetected: Math.random() > 0.8,
                    growthStage: 'mature',
                    healthScore: 7 + Math.random() * 3
                  }
                }
              : photo
          ))
          setAiProcessingQueue(prev => {
            const newSet = new Set(prev)
            newSet.delete(photoId)
            return newSet
          })
        }, 2000 + Math.random() * 3000)
      }
      
      setBulkSelection(new Set())
      setShowBulkActions(false)
    } catch (error) {
      console.error('Error bulk AI analysis:', error)
    }
  }

  const handleBulkDelete = async (selectedPhotos: string[]) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedPhotos.length} ảnh?`)) return
    
    try {
      setPhotos(prev => prev.filter(photo => !selectedPhotos.includes(photo.id)))
      setBulkSelection(new Set())
      setShowBulkActions(false)
    } catch (error) {
      console.error('Error bulk deleting photos:', error)
    }
  }

  const getPhotoTypeInfo = (type: string) => {
    return photoTypes.find(pt => pt.value === type) || photoTypes[0]
  }

  const getStorageSizeDisplay = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!hasPermission('photos:read')) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Bạn không có quyền xem hình ảnh.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Đang tải hình ảnh...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý hình ảnh</h2>
          <p className="text-gray-600">
            Tổng {photos.length} ảnh, {filteredPhotos.length} ảnh hiển thị
            {bulkSelection.size > 0 && ` • ${bulkSelection.size} ảnh được chọn`}
          </p>
        </div>
        <div className="flex space-x-2">
          {bulkSelection.size > 0 && (
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              Thao tác hàng loạt ({bulkSelection.size})
            </button>
          )}
          {hasPermission('photos:write') && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <CameraIcon className="h-4 w-4 mr-2" />
                Thêm ảnh
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && bulkSelection.size > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {bulkSelection.size} ảnh được chọn
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkUpload(Array.from(bulkSelection))}
                className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
              >
                <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                Tải lên
              </button>
              <button
                onClick={() => handleBulkAIAnalysis(Array.from(bulkSelection))}
                className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50"
              >
                <BeakerIcon className="h-4 w-4 mr-1" />
                Phân tích AI
              </button>
              <button
                onClick={() => handleBulkDelete(Array.from(bulkSelection))}
                className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Xóa
              </button>
              <button
                onClick={() => setBulkSelection(new Set())}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm ảnh, cây, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sắp xếp theo ngày</option>
              <option value="tree">Sắp xếp theo cây</option>
              <option value="type">Sắp xếp theo loại</option>
              <option value="ai">Sắp xếp theo AI</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Bộ lọc
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại ảnh
                </label>
                <select
                  value={filters.photoType || ''}
                  onChange={(e) => setFilters({...filters, photoType: e.target.value || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả loại</option>
                  {photoTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cây
                </label>
                <select
                  value={filters.treeId || ''}
                  onChange={(e) => setFilters({...filters, treeId: e.target.value || undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả cây</option>
                  {trees.map(tree => (
                    <option key={tree.id} value={tree.id}>{tree.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái AI
                </label>
                <select
                  value={filters.hasAIResults === undefined ? '' : filters.hasAIResults.toString()}
                  onChange={(e) => setFilters({...filters, hasAIResults: e.target.value === '' ? undefined : e.target.value === 'true'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả</option>
                  <option value="true">Đã phân tích AI</option>
                  <option value="false">Chưa phân tích AI</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setFilters({})}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              viewMode === 'grid' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Lưới
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              viewMode === 'list' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Danh sách
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const allPhotoIds = filteredPhotos.map(p => p.id)
              setBulkSelection(bulkSelection.size === allPhotoIds.length ? new Set() : new Set(allPhotoIds))
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {bulkSelection.size === filteredPhotos.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
        </div>
      </div>

      {/* Photos Grid/List */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không có ảnh nào</h3>
          <p className="text-gray-500">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Không tìm thấy ảnh phù hợp với tiêu chí tìm kiếm.'
              : 'Chưa có ảnh nào được tải lên.'
            }
          </p>
          {hasPermission('photos:write') && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <CameraIcon className="h-4 w-4 mr-2" />
              Thêm ảnh đầu tiên
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPhotos.map((photo) => (
            <PhotoCard 
              key={photo.id} 
              photo={photo} 
              onViewDetails={(photo) => {
                setSelectedPhoto(photo)
                setShowDetailModal(true)
              }}
              onToggleSelection={(photoId) => {
                const newSelection = new Set(bulkSelection)
                if (newSelection.has(photoId)) {
                  newSelection.delete(photoId)
                } else {
                  newSelection.add(photoId)
                }
                setBulkSelection(newSelection)
              }}
              isSelected={bulkSelection.has(photo.id)}
              isProcessing={aiProcessingQueue.has(photo.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredPhotos.map((photo) => (
              <PhotoListItem 
                key={photo.id} 
                photo={photo}
                onViewDetails={(photo) => {
                  setSelectedPhoto(photo)
                  setShowDetailModal(true)
                }}
                onToggleSelection={(photoId) => {
                  const newSelection = new Set(bulkSelection)
                  if (newSelection.has(photoId)) {
                    newSelection.delete(photoId)
                  } else {
                    newSelection.add(photoId)
                  }
                  setBulkSelection(newSelection)
                }}
                isSelected={bulkSelection.has(photo.id)}
                isProcessing={aiProcessingQueue.has(photo.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Photo Detail Modal */}
      {showDetailModal && selectedPhoto && (
        <PhotoDetailModal
          photo={selectedPhoto}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedPhoto(null)
          }}
        />
      )}
    </div>
  )
}

// Photo Card Component (Grid View)
function PhotoCard({ 
  photo, 
  onViewDetails,
  onToggleSelection,
  isSelected,
  isProcessing 
}: { 
  photo: Photo
  onViewDetails: (photo: Photo) => void
  onToggleSelection: (photoId: string) => void
  isSelected: boolean
  isProcessing: boolean
}) {
  const typeInfo = photoTypes.find(t => t.value === photo.photoType) || photoTypes[0]
  
  return (
    <div className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="relative">
        {/* Photo Preview */}
        <div className="aspect-w-4 aspect-h-3 bg-gray-200">
          <img
            src={photo.thumbnailPath || photo.localPath}
            alt={photo.filename}
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-image.png'
            }}
          />
        </div>
        
        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(photo.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>

        {/* Status Badges */}
        <div className="absolute top-2 right-2 flex flex-col space-y-1">
          {isProcessing && (
            <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              <BeakerIcon className="h-3 w-3 mr-1" />
              Đang xử lý
            </div>
          )}
          {photo.aiAnalysisResult && (
            <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              AI
            </div>
          )}
          {!photo.uploadedToServer && (
            <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
              Chưa tải
            </div>
          )}
        </div>
        
        {/* Photo Type Badge */}
        <div className="absolute bottom-2 left-2">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
            {typeInfo.label}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {photo.treeName}
          </h3>
          <span className="text-xs text-gray-500">
            {photo.timestamp.toLocaleDateString('vi-VN')}
          </span>
        </div>
        
        {photo.userNotes && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {photo.userNotes}
          </p>
        )}

        {/* AI Analysis Results */}
        {photo.aiAnalysisResult && (
          <div className="mb-3 p-2 bg-green-50 rounded text-xs">
            <div className="flex justify-between">
              <span>Số trái: {photo.aiAnalysisResult.fruitCount}</span>
              <span>Độ tin cậy: {Math.round(photo.aiAnalysisResult.confidence * 100)}%</span>
            </div>
            {photo.aiAnalysisResult.diseaseDetected && (
              <div className="text-red-600 mt-1">⚠️ Phát hiện bệnh</div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={() => onViewDetails(photo)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Xem chi tiết
          </button>
          <div className="flex items-center space-x-2">
            {photo.latitude && photo.longitude && (
              <MapPinIcon className="h-4 w-4 text-gray-400" />
            )}
            {photo.manualFruitCount && (
              <span className="text-xs text-gray-500">{photo.manualFruitCount} trái</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Photo List Item Component (List View)
function PhotoListItem({ 
  photo, 
  onViewDetails,
  onToggleSelection,
  isSelected,
  isProcessing 
}: { 
  photo: Photo
  onViewDetails: (photo: Photo) => void
  onToggleSelection: (photoId: string) => void
  isSelected: boolean
  isProcessing: boolean
}) {
  const typeInfo = photoTypes.find(t => t.value === photo.photoType) || photoTypes[0]
  
  return (
    <li className={`px-6 py-4 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(photo.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="flex-shrink-0">
            <img
              src={photo.thumbnailPath || photo.localPath}
              alt={photo.filename}
              className="h-12 w-16 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-image.png'
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900">{photo.treeName}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
                {typeInfo.label}
              </span>
              {photo.aiAnalysisResult && (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              )}
              {isProcessing && (
                <BeakerIcon className="h-4 w-4 text-yellow-500 animate-pulse" />
              )}
            </div>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{photo.timestamp.toLocaleDateString('vi-VN')}</span>
              {photo.userNotes && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-xs">{photo.userNotes}</span>
                </>
              )}
              {photo.aiAnalysisResult && (
                <>
                  <span>•</span>
                  <span>{photo.aiAnalysisResult.fruitCount} trái (AI)</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(photo)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Chi tiết
          </button>
        </div>
      </div>
    </li>
  )
}

// Photo Detail Modal Component
function PhotoDetailModal({
  photo,
  isOpen,
  onClose
}: {
  photo: Photo
  isOpen: boolean
  onClose: () => void
}) {
  const typeInfo = photoTypes.find(t => t.value === photo.photoType) || photoTypes[0]
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Chi tiết ảnh: {photo.filename}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Photo Display */}
            <div>
              <img
                src={photo.localPath}
                alt={photo.filename}
                className="w-full h-96 object-contain bg-gray-100 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-image.png'
                }}
              />
            </div>
            
            {/* Photo Information */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Thông tin cơ bản</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cây:</span>
                    <span className="text-sm text-gray-900">{photo.treeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Loại ảnh:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Ngày chụp:</span>
                    <span className="text-sm text-gray-900">
                      {photo.timestamp.toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Kích thước:</span>
                    <span className="text-sm text-gray-900">
                      {(photo.totalLocalSize / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  {photo.latitude && photo.longitude && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Vị trí:</span>
                      <span className="text-sm text-gray-900">
                        {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Status */}
              <div>
                <h4 className="text-sm font-medium text-gray-700">Trạng thái</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Đã tải lên:</span>
                    <div className="flex items-center">
                      {photo.uploadedToServer ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <span className="text-sm text-gray-900">
                        {photo.uploadedToServer ? 'Đã tải lên' : 'Chưa tải lên'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Đã xử lý:</span>
                    <div className="flex items-center">
                      {photo.serverProcessed ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-1" />
                      )}
                      <span className="text-sm text-gray-900">
                        {photo.serverProcessed ? 'Đã xử lý' : 'Đang chờ'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Notes */}
              {photo.userNotes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Ghi chú</h4>
                  <p className="mt-2 text-sm text-gray-900">{photo.userNotes}</p>
                </div>
              )}

              {/* Manual Count */}
              {photo.manualFruitCount && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Đếm thủ công</h4>
                  <p className="mt-2 text-sm text-gray-900">{photo.manualFruitCount} trái</p>
                </div>
              )}

              {/* AI Analysis Results */}
              {photo.aiAnalysisResult && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Kết quả phân tích AI</h4>
                  <div className="mt-2 p-3 bg-green-50 rounded">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Số trái:</span>
                        <span className="ml-2 font-medium text-green-800">
                          {photo.aiAnalysisResult.fruitCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Độ tin cậy:</span>
                        <span className="ml-2 font-medium text-green-800">
                          {Math.round(photo.aiAnalysisResult.confidence * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Điểm sức khỏe:</span>
                        <span className="ml-2 font-medium text-green-800">
                          {photo.aiAnalysisResult.healthScore.toFixed(1)}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Giai đoạn:</span>
                        <span className="ml-2 font-medium text-green-800">
                          {photo.aiAnalysisResult.growthStage}
                        </span>
                      </div>
                    </div>
                    {photo.aiAnalysisResult.diseaseDetected && (
                      <div className="mt-2 p-2 bg-red-100 text-red-800 rounded text-sm">
                        ⚠️ Phát hiện dấu hiệu bệnh tật - cần kiểm tra thêm
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const photoTypes = [
  { value: 'general', label: 'Tổng quan', color: 'blue' },
  { value: 'fruit', label: 'Trái cây', color: 'orange' },
  { value: 'disease', label: 'Bệnh tật', color: 'red' },
  { value: 'growth', label: 'Phát triển', color: 'green' },
  { value: 'maintenance', label: 'Bảo dưỡng', color: 'purple' }
]