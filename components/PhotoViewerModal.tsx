'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, MapPinIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { Tree } from '@/lib/types'
import { getModalZClass, modalStack } from '@/lib/modal-z-index'
import { useImageZoomPan } from '@/lib/hooks/use-image-zoom-pan'
import {
  DisplayImage,
  getPhotoType,
  getPhotoTypeName,
  getImageDate,
  formatDateFriendly
} from '@/lib/photo-utils'
import { PhotoWithUrls } from '@/lib/photo-service'

interface PhotoViewerModalProps {
  isOpen: boolean
  onClose: () => void
  tree: Tree
  totalImages: number
  filteredImages: DisplayImage[]
  selectedImage: number | null
  nextImage: () => void
  prevImage: () => void
}

export function PhotoViewerModal({
  isOpen,
  onClose,
  tree,
  totalImages,
  filteredImages,
  selectedImage,
  nextImage,
  prevImage
}: PhotoViewerModalProps) {
  // Call zoom-pan custom hook
  const {
    scale,
    position,
    isDragging,
    isTouchDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleWheel,
    handleImageClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useImageZoomPan({
    resetDependency: selectedImage,
    onSwipeDown: onClose
  })

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && scale === 1) nextImage()
      if (e.key === 'ArrowLeft' && scale === 1) prevImage()
    }

    modalStack.pushModal('photo-viewer')
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      modalStack.popModal('photo-viewer')
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, scale, nextImage, prevImage, onClose])

  if (!isOpen || selectedImage === null) return null

  const currentImage = filteredImages[selectedImage]
  if (!currentImage) return null

  const currentType = getPhotoType(currentImage)
  const isFirestoreImage = 'photoType' in currentImage
  const castedFirestoreImage = currentImage as PhotoWithUrls

  return (
    <div 
      className={`fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center ${getModalZClass('PHOTO_VIEWER')} animate-in fade-in duration-300`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onWheel={handleWheel}
    >
      <div className="max-w-7xl max-h-full w-full h-full flex flex-col p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-md rounded-2xl px-5 py-3.5 border border-white/10 max-w-[85%]">
            <div className="flex items-center space-x-3">
              <div className="relative flex-shrink-0">
                <div className={`w-3.5 h-3.5 rounded-full ${
                  currentType === 'health' ? 'bg-red-500' :
                  currentType === 'fruit_count' ? 'bg-orange-500' : 'bg-blue-500'
                }`}></div>
                <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${
                  currentType === 'health' ? 'bg-red-400' :
                  currentType === 'fruit_count' ? 'bg-orange-400' : 'bg-blue-400'
                }`}></div>
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{getPhotoTypeName(currentImage)}</span>
                  <span className="text-xs font-normal text-gray-400 px-2 py-0.5 bg-white/10 rounded-full">
                    Ảnh {selectedImage + 1} / {totalImages}
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="font-semibold text-green-400">{tree.variety || tree.name || `Cây ${tree.qrCode}`}</span>
                  {tree.zoneName && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-300">{tree.zoneName}</span>
                    </>
                  )}
                  {isFirestoreImage && castedFirestoreImage.latitude && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-xs text-blue-400 flex items-center">
                        <MapPinIcon className="h-3 w-3 mr-0.5" />
                        GPS
                      </span>
                    </>
                  )}
                </p>
                {getImageDate(currentImage) && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center space-x-1.5">
                    <CalendarDaysIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                    <span>Chụp lúc: {formatDateFriendly(getImageDate(currentImage))}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="bg-black/50 backdrop-blur-md hover:bg-black/70 rounded-2xl p-3 sm:p-4 text-white transition-all duration-200 border border-white/10 hover:border-white/30 group flex-shrink-0"
            aria-label="Đóng hình ảnh"
          >
            <XMarkIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Enhanced Image Container */}
        <div className="flex-1 flex items-center justify-center relative rounded-2xl overflow-hidden">
          {currentImage.imageUrl && (
            <>
              {/* Image with zoom/pan */}
              <Image
                src={currentImage.imageUrl}
                alt={`Tree photo ${selectedImage + 1}`}
                className="max-w-full max-h-full object-contain select-none rounded-xl shadow-2xl"
                width={800}
                height={600}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transition: isDragging || isTouchDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  touchAction: 'none',
                  userSelect: 'none'
                }}
                draggable={false}
                unoptimized
                onMouseDown={handleMouseDown}
                onClick={handleImageClick}
              />
              
              {/* Subtle glow effect around image */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none rounded-xl"></div>
            </>
          )}

          {/* Floating Close Button */}
          <div className="absolute right-6 bottom-8 sm:bottom-12 z-30">
            <button
              onClick={onClose}
              className="bg-black/60 backdrop-blur-md border border-white/20 text-white rounded-2xl p-4 hover:bg-black/80 hover:border-white/40 transition-all active:scale-95 shadow-xl flex items-center justify-center group"
              title="Thoát xem ảnh"
              aria-label="Thoát xem ảnh"
            >
              <XMarkIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Enhanced Navigation buttons */}
          {totalImages > 1 && scale === 1 && (
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
        </div>

        {/* Enhanced Footer with photo info */}
        {isFirestoreImage && (
          <div className="mt-6">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {castedFirestoreImage.userNotes && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">📝</span>
                      <span className="text-sm font-bold text-white">Ghi chú:</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {castedFirestoreImage.userNotes}
                    </p>
                  </div>
                )}
                {castedFirestoreImage.manualFruitCount && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🍎</span>
                      <span className="text-sm font-bold text-white">Số trái đếm:</span>
                    </div>
                    <p className="text-green-400 text-lg font-bold">
                      {castedFirestoreImage.manualFruitCount} trái
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
