'use client'

import { useState, useEffect } from 'react'
import { 
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline'
import { getModalZClass, modalStack } from '@/lib/modal-z-index'

interface PhotoViewerProps {
  images: Array<{
    url: string
    thumbnail?: string
    caption?: string
    metadata?: Record<string, any>
  }>
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
  onImageChange?: (index: number) => void
}

export function OptimizedPhotoViewer({ 
  images, 
  initialIndex = 0, 
  isOpen, 
  onClose,
  onImageChange 
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  // Handle modal lifecycle
  useEffect(() => {
    if (isOpen) {
      modalStack.pushModal('photo-viewer')
      // Hide instructions after 3 seconds
      const timer = setTimeout(() => setShowInstructions(false), 3000)
      return () => {
        clearTimeout(timer)
        modalStack.popModal('photo-viewer')
      }
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  // Update current index when initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
    }
  }, [initialIndex, isOpen])

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % images.length
    setCurrentIndex(nextIndex)
    onImageChange?.(nextIndex)
  }

  const goToPrevious = () => {
    const prevIndex = (currentIndex - 1 + images.length) % images.length
    setCurrentIndex(prevIndex)
    onImageChange?.(prevIndex)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.changedTouches[0]
    const diffX = touchStart.x - touch.clientX
    const diffY = touchStart.y - touch.clientY
    
    const threshold = 50
    
    // Horizontal swipe for navigation
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          goToNext() // Swipe left = next
        } else {
          goToPrevious() // Swipe right = previous
        }
      }
    } 
    // Vertical swipe to close
    else if (diffY < -threshold) {
      onClose() // Swipe down = close
    }
    
    setTouchStart(null)
  }

  const toggleFullscreen = () => {
    if (!isFullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else if (isFullscreen && document.exitFullscreen) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (!isOpen || !images.length) return null

  const currentImage = images[currentIndex]

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center ${getModalZClass('PHOTO_VIEWER')}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main content */}
      <div className="relative w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center space-x-4">
            <span className="text-white text-lg font-medium">
              {currentIndex + 1} / {images.length}
            </span>
            {currentImage.caption && (
              <span className="text-white/80 text-sm max-w-xs sm:max-w-md truncate">
                {currentImage.caption}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-3 text-white hover:bg-white/20 rounded-full transition-colors touch-manipulation"
              aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="h-6 w-6" />
              ) : (
                <ArrowsPointingOutIcon className="h-6 w-6" />
              )}
            </button>
            
            <button
              onClick={onClose}
              className="p-3 text-white hover:bg-white/20 rounded-full transition-colors touch-manipulation"
              aria-label="Đóng"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center relative px-4 py-16">
          <img
            src={currentImage.url}
            alt={currentImage.caption || `Ảnh ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
            style={{ 
              touchAction: 'pan-x pan-y pinch-zoom',
              userSelect: 'none'
            }}
            draggable={false}
            loading="lazy"
          />

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors touch-manipulation"
                aria-label="Ảnh trước"
                style={{ minHeight: '48px', minWidth: '48px' }}
              >
                <ChevronLeftIcon className="h-8 w-8" />
              </button>
              
              <button
                onClick={goToNext}
                className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors touch-manipulation"
                aria-label="Ảnh tiếp theo"
                style={{ minHeight: '48px', minWidth: '48px' }}
              >
                <ChevronRightIcon className="h-8 w-8" />
              </button>
            </>
          )}
        </div>

        {/* Mobile instructions */}
        {showInstructions && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-6 py-3 rounded-full text-sm font-medium text-center animate-pulse sm:hidden">
            👆 Chạm bên ngoài, vuốt xuống hoặc nhấn ESC để đóng
          </div>
        )}

        {/* Thumbnail strip for multiple images */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 hidden sm:flex items-center space-x-2 bg-black/50 p-2 rounded-lg max-w-xs overflow-x-auto">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`relative flex-shrink-0 w-12 h-12 rounded overflow-hidden transition-all ${
                  index === currentIndex 
                    ? 'ring-2 ring-white scale-110' 
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={img.thumbnail || img.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}