'use client'

import React, { useState, useEffect } from 'react'
import { Tree } from '@/lib/types'
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PhotoIcon, EyeIcon, CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { PhotoWithUrls, getPhotosWithUrls, subscribeToTreePhotos } from '@/lib/photo-service'
import { getTreeImagesByPattern } from '@/lib/storage'
import { getModalZClass, modalStack } from '@/lib/modal-z-index'

interface ImageGalleryProps {
  tree: Tree
  className?: string
}

interface StorageImage {
  imageUrl: string
  isStorage: boolean
  thumbnailUrl?: string
}

type DisplayImage = PhotoWithUrls | StorageImage

export function ImageGallery({ tree, className = '' }: ImageGalleryProps) {
  // Use correct farmId - prioritize tree.farmId, then fallback to known working farmId  
  const effectiveFarmId = tree.farmId && tree.farmId !== 'default' ? tree.farmId : 'F210C3FC-F191-4926-9C15-58D6550A716A'
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
      const photosWithUrls = await getPhotosWithUrls(firestorePhotos, effectiveFarmId)
      setPhotos(photosWithUrls)
    })

    return unsubscribe
  }, [tree.id, effectiveFarmId])

  // Load images from Storage
  useEffect(() => {
    async function loadStorageImages() {
      if (!tree.id) return

      try {
        const images = await getTreeImagesByPattern(tree.id, tree.qrCode, effectiveFarmId)
        setStorageImages(images)
      } catch (error) {
        console.error('Error loading storage images:', error)
      }
    }

    loadStorageImages()
  }, [tree.id, tree.qrCode, effectiveFarmId])

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

  // Close modal on escape key and handle body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null)
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
    }

    if (selectedImage !== null) {
      // Use modal stack manager to handle body scroll
      modalStack.pushModal('image-gallery')
      document.addEventListener('keydown', handleKeyDown)
      
      return () => {
        modalStack.popModal('image-gallery')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [selectedImage, totalImages])

  // Handle touch gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart(touch.clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.changedTouches[0]
    const diff = touchStart - touch.clientY
    
    // Swipe down to close (threshold: 50px)
    if (diff < -50) {
      setSelectedImage(null)
    }
    
    setTouchStart(null)
  }

  // Track touch position for swipe gesture
  const [touchStart, setTouchStart] = useState<number | null>(null)

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
      <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ${className}`}>
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
              <div className="h-6 bg-gray-300 rounded-lg w-48"></div>
            </div>
            <div className="flex space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-300 rounded-lg w-20"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl animate-pulse">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 100}ms` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`bg-white border border-gray-100 backdrop-blur-sm ${className}`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <PhotoIcon className="h-8 w-8 text-green-600 drop-shadow-sm" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Hình Ảnh Cây</h3>
                <p className="text-sm text-gray-600 font-medium">
                  {totalImages > 0 ? `${totalImages} ảnh được tìm thấy` : 'Chưa có ảnh nào'}
                </p>
              </div>
            </div>
            {totalImages > 0 && (
              <div className="hidden sm:flex items-center space-x-2 bg-white bg-opacity-70 rounded-full px-4 py-2 backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Đã tải xong</span>
              </div>
            )}
          </div>

          
        </div>

        {/* Enhanced Image Grid */}
        <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
          {filteredImages.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto flex items-center justify-center shadow-inner">
                  <PhotoIcon className="h-12 w-12 text-gray-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🌿</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Chưa có hình ảnh</h3>
              <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                Chưa có hình ảnh nào cho cây này trong danh mục{' '}
                <span className="font-semibold text-blue-600">
                  "{activeTab === 'all' ? 'tất cả' :
                    activeTab === 'general' ? 'chung' :
                    activeTab === 'health' ? 'sức khỏe' : 'đếm trái'}"
                </span>
              </p>
              <div className="mt-6">
                <div className="inline-flex items-center space-x-2 text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-full">
                  <span>💡</span>
                  <span>Chụp ảnh để theo dõi cây trồng</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image, index) => (
                <div
                  key={index}
                  className="group relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-200/50"
                  onClick={() => setSelectedImage(index)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Image Container */}
                  <div className="relative w-full h-full overflow-hidden">
                    {image.imageUrl ? (
                      <>
                        {/* Lazy Loading Placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse">
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-8 h-8 bg-gray-300 rounded-full animate-bounce"></div>
                          </div>
                        </div>
                        
                        {/* Actual Image */}
                        <img
                          src={image.thumbnailUrl || image.imageUrl}
                          alt={`Tree ${tree.name || tree.qrCode} photo ${index + 1}`}
                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                          loading="lazy"
                          onLoad={(e) => {
                            // Hide placeholder when image loads
                            const placeholder = e.currentTarget.previousElementSibling;
                            if (placeholder) {
                              (placeholder as HTMLElement).style.display = 'none';
                            }
                            e.currentTarget.style.opacity = '1';
                          }}
                          style={{ opacity: '0' }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <div className="text-center">
                          <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <span className="text-xs text-gray-500">Không có ảnh</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <EyeIcon className="h-6 w-6 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Photo type badge */}
                  {'photoType' in image && image.photoType && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm border border-white/20 ${
                        (image as PhotoWithUrls).photoType === 'health' 
                          ? 'bg-red-500/90 text-white'
                          : (image as PhotoWithUrls).photoType === 'fruit_count'
                          ? 'bg-orange-500/90 text-white'
                          : 'bg-blue-500/90 text-white'
                      }`}>
                        {(image as PhotoWithUrls).photoType === 'health' ? '🏥 Sức Khỏe' :
                         (image as PhotoWithUrls).photoType === 'fruit_count' ? '🍎 Đếm Trái' : '📸 Chung'}
                      </span>
                    </div>
                  )}

                  {/* Image number indicator */}
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                    {index + 1}
                  </div>

                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Fullscreen Modal */}
      {selectedImage !== null && (
        <div 
          className={`fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center ${getModalZClass('PHOTO_VIEWER')} animate-in fade-in duration-300`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedImage(null)
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="max-w-7xl max-h-full w-full h-full flex flex-col p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            {/* Enhanced Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4 bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {tree.name || `Cây ${tree.qrCode}`}
                    </h3>
                    <p className="text-sm text-gray-300">
                      Ảnh {selectedImage + 1} / {totalImages}
                    </p>
                  </div>
                </div>
                {'timestamp' in filteredImages[selectedImage] && (
                  <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-300 border-l border-white/20 pl-4">
                    <div className="flex items-center space-x-2">
                      <CalendarDaysIcon className="h-4 w-4" />
                      <span>{formatDate((filteredImages[selectedImage] as PhotoWithUrls).timestamp)}</span>
                    </div>
                    {(filteredImages[selectedImage] as PhotoWithUrls).latitude && (
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="h-4 w-4" />
                        <span>GPS có sẵn</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setSelectedImage(null)}
                className="bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-2xl p-4 text-white transition-all duration-200 border border-white/10 hover:border-white/30 group"
                aria-label="Đóng hình ảnh"
              >
                <XMarkIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Enhanced Image Container */}
            <div className="flex-1 flex items-center justify-center relative rounded-2xl overflow-hidden">
              {filteredImages[selectedImage].imageUrl && (
                <>
                  {/* Image with enhanced styling */}
                  <img
                    src={filteredImages[selectedImage].imageUrl}
                    alt={`Tree photo ${selectedImage + 1}`}
                    className="max-w-full max-h-full object-contain select-none rounded-xl shadow-2xl"
                    style={{ 
                      touchAction: 'pan-x pan-y pinch-zoom',
                      userSelect: 'none' 
                    }}
                    draggable={false}
                  />
                  
                  {/* Subtle glow effect around image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none rounded-xl"></div>
                </>
              )}

              {/* Enhanced Navigation buttons */}
              {totalImages > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-2xl p-4 text-white transition-all duration-200 border border-white/10 hover:border-white/30 group hover:scale-110"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeftIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-2xl p-4 text-white transition-all duration-200 border border-white/10 hover:border-white/30 group hover:scale-110"
                    aria-label="Ảnh tiếp theo"
                  >
                    <ChevronRightIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  </button>
                </>
              )}

              {/* Enhanced counter overlay */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold border border-white/20 shadow-lg">
                {selectedImage + 1} / {totalImages}
              </div>

              {/* Enhanced mobile instructions */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-6 py-3 rounded-full text-sm font-medium text-center border border-white/20 sm:hidden">
                <div className="flex items-center space-x-2">
                  <span>👆</span>
                  <span>Chạm bên ngoài hoặc vuốt xuống để đóng</span>
                </div>
              </div>
            </div>

            {/* Enhanced Footer with photo info */}
            {'photoType' in filteredImages[selectedImage] && (
              <div className="mt-6">
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(filteredImages[selectedImage] as PhotoWithUrls).userNotes && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">📝</span>
                          <span className="text-sm font-bold text-white">Ghi chú:</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {(filteredImages[selectedImage] as PhotoWithUrls).userNotes}
                        </p>
                      </div>
                    )}
                    {(filteredImages[selectedImage] as PhotoWithUrls).manualFruitCount && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🍎</span>
                          <span className="text-sm font-bold text-white">Số trái đếm:</span>
                        </div>
                        <p className="text-green-400 text-lg font-bold">
                          {(filteredImages[selectedImage] as PhotoWithUrls).manualFruitCount} trái
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}