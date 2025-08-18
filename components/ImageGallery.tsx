'use client'

import { useState, useEffect } from 'react'
import { PhotoWithUrls, getPhotosWithUrls, subscribeToTreePhotos } from '@/lib/photo-service'

interface StorageImage {
  imageUrl: string
  isStorage: boolean
  thumbnailUrl?: string
}

type DisplayImage = PhotoWithUrls | StorageImage
import { getTreeImagesByPattern } from '@/lib/storage'
import { 
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon,
  EyeIcon,
  CalendarDaysIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { Tree } from '@/lib/types'

interface ImageGalleryProps {
  tree: Tree
  className?: string
}

export function ImageGallery({ tree, className = '' }: ImageGalleryProps) {
  const [photos, setPhotos] = useState<PhotoWithUrls[]>([])
  const [storageImages, setStorageImages] = useState<{ general: string[], health: string[], fruitCount: string[] }>({
    general: [],
    health: [],
    fruitCount: []
  })
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'general' | 'health' | 'fruit_count'>('all')

  // Load photos from Firestore
  useEffect(() => {
    if (!tree.id) return

    const unsubscribe = subscribeToTreePhotos(tree.id, async (firestorePhotos) => {
      const photosWithUrls = await getPhotosWithUrls(firestorePhotos)
      setPhotos(photosWithUrls)
    })

    return unsubscribe
  }, [tree.id])

  // Load images from Storage
  useEffect(() => {
    async function loadStorageImages() {
      if (!tree.id) return

      try {
        const images = await getTreeImagesByPattern(tree.id, tree.qrCode)
        setStorageImages(images)
      } catch (error) {
        console.error('Error loading storage images:', error)
      }
    }

    loadStorageImages()
  }, [tree.id, tree.qrCode])

  // Set loading state
  useEffect(() => {
    setLoading(false)
  }, [photos, storageImages])

  // Get filtered images based on active tab
  const getFilteredImages = (): DisplayImage[] => {
    const firestoreImages = photos.filter(photo => photo.imageUrl)
    
    switch (activeTab) {
      case 'general':
        return [
          ...firestoreImages.filter(p => p.photoType === 'general'),
          ...storageImages.general.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url }))
        ]
      case 'health':
        return [
          ...firestoreImages.filter(p => p.photoType === 'health'),
          ...storageImages.health.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url }))
        ]
      case 'fruit_count':
        return [
          ...firestoreImages.filter(p => p.photoType === 'fruit_count'),
          ...storageImages.fruitCount.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url }))
        ]
      default:
        return [
          ...firestoreImages,
          ...storageImages.general.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url })),
          ...storageImages.health.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url })),
          ...storageImages.fruitCount.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url }))
        ]
    }
  }

  const filteredImages = getFilteredImages()
  const totalImages = filteredImages.length

  // Modal navigation
  const nextImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % totalImages)
    }
  }

  const prevImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + totalImages) % totalImages)
    }
  }

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null)
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
    }

    if (selectedImage !== null) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedImage, totalImages])

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A'
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getTabCount = (tab: typeof activeTab) => {
    switch (tab) {
      case 'general':
        return photos.filter(p => p.photoType === 'general').length + storageImages.general.length
      case 'health':
        return photos.filter(p => p.photoType === 'health').length + storageImages.health.length
      case 'fruit_count':
        return photos.filter(p => p.photoType === 'fruit_count').length + storageImages.fruitCount.length
      default:
        return totalImages
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PhotoIcon className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-bold text-gray-900">Hình Ảnh Cây</h3>
              <span className="text-sm text-gray-500">({totalImages} ảnh)</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-4">
            {[
              { key: 'all', label: 'Tất Cả', count: totalImages },
              { key: 'general', label: 'Chung', count: getTabCount('general') },
              { key: 'health', label: 'Sức Khỏe', count: getTabCount('health') },
              { key: 'fruit_count', label: 'Đếm Trái', count: getTabCount('fruit_count') }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Image Grid */}
        <div className="p-6">
          {filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có hình ảnh</h3>
              <p className="text-gray-600">
                Chưa có hình ảnh nào cho cây này trong danh mục "{
                  activeTab === 'all' ? 'tất cả' :
                  activeTab === 'general' ? 'chung' :
                  activeTab === 'health' ? 'sức khỏe' : 'đếm trái'
                }".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image, index) => (
                <div
                  key={index}
                  className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => setSelectedImage(index)}
                >
                  {image.imageUrl ? (
                    <img
                      src={image.thumbnailUrl || image.imageUrl}
                      alt={`Tree ${tree.name || tree.qrCode} photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PhotoIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <EyeIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Photo type badge */}
                  {'photoType' in image && image.photoType && (
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        (image as PhotoWithUrls).photoType === 'health' 
                          ? 'bg-red-100 text-red-800'
                          : (image as PhotoWithUrls).photoType === 'fruit_count'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {(image as PhotoWithUrls).photoType === 'health' ? 'Sức Khỏe' :
                         (image as PhotoWithUrls).photoType === 'fruit_count' ? 'Đếm Trái' : 'Chung'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {selectedImage !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="max-w-5xl max-h-full w-full h-full flex flex-col p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 text-white">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold">
                  {tree.name || `Cây ${tree.qrCode}`} - Ảnh {selectedImage + 1} / {totalImages}
                </h3>
                {'timestamp' in filteredImages[selectedImage] && (
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <CalendarDaysIcon className="h-4 w-4" />
                      <span>{formatDate((filteredImages[selectedImage] as PhotoWithUrls).timestamp)}</span>
                    </div>
                    {(filteredImages[selectedImage] as PhotoWithUrls).latitude && (
                      <div className="flex items-center space-x-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>GPS</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center relative">
              {filteredImages[selectedImage].imageUrl && (
                <img
                  src={filteredImages[selectedImage].imageUrl}
                  alt={`Tree photo ${selectedImage + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              )}

              {/* Navigation buttons */}
              {totalImages > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
                  >
                    <ChevronLeftIcon className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Footer - Photo info */}
            {'photoType' in filteredImages[selectedImage] && (
              <div className="mt-4 text-white">
                <div className="bg-black bg-opacity-50 rounded-lg p-4">
                  {(filteredImages[selectedImage] as PhotoWithUrls).userNotes && (
                    <p className="mb-2">
                      <strong>Ghi chú:</strong> {(filteredImages[selectedImage] as PhotoWithUrls).userNotes}
                    </p>
                  )}
                  {(filteredImages[selectedImage] as PhotoWithUrls).manualFruitCount && (
                    <p>
                      <strong>Số trái đếm:</strong> {(filteredImages[selectedImage] as PhotoWithUrls).manualFruitCount}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}