'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Tree } from '@/lib/types'
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PhotoIcon, EyeIcon, CalendarDaysIcon, MapPinIcon, CameraIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { PhotoWithUrls, getPhotosWithUrls, subscribeToTreePhotos, getTreePhotos } from '@/lib/photo-service'
import { getTreeImagesByPattern } from '@/lib/storage'
import { getModalZClass, modalStack } from '@/lib/modal-z-index'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { useToast } from './Toast'
import { collection, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { compressImageSmart, getCompressionInfo, needsCompression } from '@/lib/photo-compression'
import { FarmService } from '@/lib/farm-service'
import { AuditService } from '@/lib/audit-service'

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

// Simple cache for storage images to avoid repeated slow Firebase calls
const storageImagesCache = new Map<string, { general: string[], health: string[], fruitCount: string[] }>()

export function ImageGallery({ tree, className = '' }: ImageGalleryProps) {
   const { user, currentFarm } = useSimpleAuth()
   const { showSuccess, showError } = useToast()
   const fileInputRef = useRef<HTMLInputElement>(null)
   const cameraInputRef = useRef<HTMLInputElement>(null)

   console.log('🎯 ImageGallery: Component render for tree:', tree.id, 'name:', tree.name, 'qrCode:', tree.qrCode)

  // Use correct farmId - prioritize tree.farmId, then fallback to known working farmId
  const effectiveFarmId = tree.farmId && tree.farmId !== 'default' ? tree.farmId : 'F210C3FC-F191-4926-9C15-58D6550A716A'
  const [photos, setPhotos] = useState<PhotoWithUrls[]>([])
  const [storageImages, setStorageImages] = useState<{ general: string[], health: string[], fruitCount: string[] }>({
    general: [],
    health: [],
    fruitCount: []
  })
  const [loading, setLoading] = useState(true)
  const [storageImagesLoading, setStorageImagesLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [showPhotoTypeModal, setShowPhotoTypeModal] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [compressionInfo, setCompressionInfo] = useState<{
    currentSizeKB: number
    targetSizeKB: number
    needsCompression: boolean
    estimatedReduction: number
  } | null>(null)
  const [newPhotoAdded, setNewPhotoAdded] = useState(false)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithUrls | null>(null)
  const [canManagePhotos, setCanManagePhotos] = useState(false)

  // Load photos from Firestore
  useEffect(() => {
    if (!tree.id) return

    console.log('🔄 ImageGallery: Loading Firestore photos for tree:', tree.id)

    const unsubscribe = subscribeToTreePhotos(tree.id, async (firestorePhotos) => {
      console.log('📸 ImageGallery: Received Firestore photos:', firestorePhotos.length, 'photos')
      firestorePhotos.forEach((photo, index) => {
        console.log(`  Photo ${index}: ID=${photo.id}, filename=${photo.filename}, path=${photo.localPath}`)
      })

      const photosWithUrls = await getPhotosWithUrls(firestorePhotos, effectiveFarmId)
      console.log('🔗 ImageGallery: Photos with URLs:', photosWithUrls.length, 'photos')
      photosWithUrls.forEach((photo, index) => {
        console.log(`  PhotoWithUrl ${index}: ID=${photo.id}, imageUrl=${photo.imageUrl}, thumbnailUrl=${photo.thumbnailUrl}`)
      })

      setPhotos(photosWithUrls)
      // Set loading to false as soon as Firestore photos are loaded
      setLoading(false)
    })

    return unsubscribe
  }, [tree.id, effectiveFarmId])

  // Load images from Storage (background loading with caching)
  useEffect(() => {
    async function loadStorageImages() {
      if (!tree.id) return

      // Create cache key
      const cacheKey = `${tree.id}-${tree.qrCode || ''}-${effectiveFarmId}`
      console.log('🔄 ImageGallery: Loading storage images for tree:', tree.id, 'cacheKey:', cacheKey)

      // Check cache first
      const cachedImages = storageImagesCache.get(cacheKey)
      if (cachedImages) {
        console.log('💾 ImageGallery: Using cached storage images:', cachedImages)
        setStorageImages(cachedImages)
        return
      }

      setStorageImagesLoading(true)
      try {
        console.log('📁 ImageGallery: Fetching storage images from service...')
        const images = await getTreeImagesByPattern(tree.id, tree.qrCode, effectiveFarmId)
        console.log('📁 ImageGallery: Storage images loaded:', images)
        console.log('  General:', images.general.length, 'images')
        console.log('  Health:', images.health.length, 'images')
        console.log('  FruitCount:', images.fruitCount.length, 'images')

        // Cache the result
        storageImagesCache.set(cacheKey, images)
        setStorageImages(images)
      } catch (error) {
        console.error('Error loading storage images:', error)
      } finally {
        setStorageImagesLoading(false)
      }
    }

    loadStorageImages()
  }, [tree.id, tree.qrCode, effectiveFarmId])

  // Check user permissions for photo management
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user || !currentFarm) {
        setCanManagePhotos(false)
        return
      }

      try {
        // Check if user has management permissions (owner or manager)
        const hasAccess = await FarmService.checkFarmAccess(user.uid, currentFarm.id, ['write', 'delete'])
        setCanManagePhotos(hasAccess)
      } catch (error) {
        console.error('📸 Error checking permissions:', error)
        setCanManagePhotos(false)
      }
    }

    checkPermissions()
  }, [user, currentFarm])

  // Get all images (no filtering needed since tabs are removed)
  const getFilteredImages = (): DisplayImage[] => {
    const firestoreImages = photos.filter(photo => photo.imageUrl)
    console.log('🔍 ImageGallery: Filtering images...')
    console.log('  Firestore images:', firestoreImages.length, 'images')
    firestoreImages.forEach((img, index) => {
      console.log(`    Firestore ${index}: ID=${img.id}, URL=${img.imageUrl}`)
    })

    // Create a set of Firestore image URLs to avoid duplicates
    const firestoreImageUrls = new Set(firestoreImages.map(img => img.imageUrl))
    console.log('  Firestore URLs set size:', firestoreImageUrls.size)

    // Filter out storage images that already exist in Firestore
    const generalStorageFiltered = storageImages.general.filter(url => !firestoreImageUrls.has(url))
    const healthStorageFiltered = storageImages.health.filter(url => !firestoreImageUrls.has(url))
    const fruitCountStorageFiltered = storageImages.fruitCount.filter(url => !firestoreImageUrls.has(url))

    console.log('  Storage images after filtering:')
    console.log('    General:', generalStorageFiltered.length, 'images')
    console.log('    Health:', healthStorageFiltered.length, 'images')
    console.log('    FruitCount:', fruitCountStorageFiltered.length, 'images')

    const uniqueStorageImages = [
      ...generalStorageFiltered.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url })),
      ...healthStorageFiltered.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url })),
      ...fruitCountStorageFiltered.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url }))
    ]

    const result = [
      ...firestoreImages,
      ...uniqueStorageImages
    ]

    console.log('  Final combined images:', result.length, 'images')
    result.forEach((img, index) => {
      console.log(`    Final ${index}: ${'id' in img ? `Firestore ID=${img.id}` : 'Storage'}, URL=${img.imageUrl}`)
    })

    return result
  }

  const filteredImages = getFilteredImages()
  const totalImages = filteredImages.length

  // Modal navigation
  const nextImage = useCallback(() => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % totalImages)
    }
  }, [selectedImage, totalImages])

  const prevImage = useCallback(() => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + totalImages) % totalImages)
    }
  }, [selectedImage, totalImages])

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
  }, [selectedImage, totalImages, nextImage, prevImage])

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

  // Force refresh image gallery after upload
  const refreshImageGallery = async () => {
    try {
      setLoading(true)

      // Reload photos from Firestore
      const photosWithUrls = await getPhotosWithUrls(await getTreePhotos(tree.id), effectiveFarmId)
      setPhotos(photosWithUrls)

      // Clear cache and reload storage images
      const cacheKey = `${tree.id}-${tree.qrCode || ''}-${effectiveFarmId}`
      storageImagesCache.delete(cacheKey)

      setStorageImagesLoading(true)
      const images = await getTreeImagesByPattern(tree.id, tree.qrCode, effectiveFarmId)
      storageImagesCache.set(cacheKey, images)
      setStorageImages(images)
      setStorageImagesLoading(false)

    } catch (error) {
      console.error('Error refreshing gallery:', error)
    } finally {
      setLoading(false)
    }
  }

  // Photo deletion functions
  const handleDeletePhotoClick = (photo: PhotoWithUrls) => {
    if (!canManagePhotos) {
      showError('Không có quyền', 'Bạn không có quyền xóa ảnh')
      return
    }
    
    setPhotoToDelete(photo)
    setShowDeleteConfirm(true)
  }

  const handleDeletePhoto = async () => {
    if (!photoToDelete || !canManagePhotos) {
      showError('Lỗi', 'Không thể xóa ảnh')
      return
    }

    try {
      setDeletingPhotoId(photoToDelete.id)

      // Delete from Firestore
      await deleteDoc(doc(db, 'photos', photoToDelete.id))

      // Try to delete from Storage (best effort)
      if (photoToDelete.originalPath || photoToDelete.localPath) {
        try {
          const storagePath = photoToDelete.originalPath || photoToDelete.localPath
          const storageRef = ref(storage, storagePath)
          await deleteObject(storageRef)
        } catch (storageError) {
          console.warn('Could not delete from Storage (file may not exist):', storageError)
        }
      }

      // Refresh gallery
      await refreshImageGallery()

      showSuccess('Đã xóa', 'Ảnh đã được xóa khỏi thư viện')
      setShowDeleteConfirm(false)
      setPhotoToDelete(null)
    } catch (error) {
      console.error('🗑️ Delete error:', error)
      showError('Lỗi', 'Không thể xóa ảnh. Vui lòng thử lại')
    } finally {
      setDeletingPhotoId(null)
    }
  }

  // Camera and photo upload functions
  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  const handleGalleryClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPendingFile(file)

      // Show compression info for general photos by default
      const info = getCompressionInfo(file, 'general')
      setCompressionInfo(info)

      setShowPhotoTypeModal(true)
    }
    // Reset input value to allow selecting the same file again
    event.target.value = ''
  }

  const handlePhotoUpload = async (photoType: 'general' | 'health' | 'fruit_count') => {
    if (!pendingFile || !user || !currentFarm) {
      showError('Lỗi', 'Thiếu thông tin cần thiết để tải ảnh')
      return
    }

    try {
      // STEP 1: COMPRESSION
      let fileToUpload = pendingFile
      
      if (needsCompression(pendingFile)) {
        setCompressing(true)

        try {
          fileToUpload = await compressImageSmart(pendingFile, photoType)
        } catch (compressionError) {
          console.warn('Compression failed, using original file:', compressionError)
          fileToUpload = pendingFile // Fallback to original file
        }

        setCompressing(false)
      }

      // STEP 2: UPLOAD
      setUploading(true)

      // Get current location if available
      let latitude, longitude
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false
            })
          })
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        } catch {
          // Location not available, continue without GPS data
        }
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = 'jpg' // Force JPEG after compression
      const filename = `compressed_${timestamp}.${fileExtension}`
      
      // Upload to Firebase Storage
      const storagePath = `farms/${currentFarm.id}/trees/${tree.id}/photos/${timestamp}/${filename}`
      const storageRef = ref(storage, storagePath)

      await uploadBytes(storageRef, fileToUpload)

      // Save photo metadata to Firestore
      const photoData = {
        treeId: tree.id,
        farmId: currentFarm.id,
        filename: filename,
        photoType: photoType,
        userNotes: `Ảnh ${photoType} cho cây ${tree.name || tree.qrCode}`,
        latitude: latitude || null,
        longitude: longitude || null,
        timestamp: Timestamp.now(),
        uploadDate: Timestamp.now(),
        localPath: storagePath,
        originalPath: storagePath,
        uploadedToServer: true,
        needsAIAnalysis: photoType === 'fruit_count',
        farmName: currentFarm.name || 'Unknown Farm'
      }
      
      const photosRef = collection(db, 'photos')
      const photoDocRef = await addDoc(photosRef, photoData)

      // Log photo upload to audit system
      try {
        await AuditService.logEvent({
          userId: user.uid,
          userEmail: user.email || 'Unknown User',
          action: 'PHOTO_UPLOADED',
          resource: 'photo',
          resourceId: tree.id,
          details: {
            photoId: photoDocRef.id,
            photoType: photoType,
            treeId: tree.id,
            farmId: currentFarm.id,
            hasGPS: !!(latitude && longitude)
          },
          severity: 'low',
          category: 'data_modification',
          status: 'success'
        })
      } catch (auditError) {
        console.error('Failed to log photo upload:', auditError)
      }

      // Force refresh the image gallery
      await refreshImageGallery()

      // Show new photo indicator
      setNewPhotoAdded(true)
      setTimeout(() => setNewPhotoAdded(false), 5000) // Hide after 5 seconds

      const photoTypeNames = {
        general: 'chung',
        health: 'sức khỏe', 
        fruit_count: 'đếm trái'
      }

      showSuccess(
        'Ảnh đã được thêm!', 
        `Ảnh ${photoTypeNames[photoType]} mới đã xuất hiện trong thư viện. Xem ngay bên dưới!`
      )
      setShowPhotoTypeModal(false)
      setPendingFile(null)
      setCompressionInfo(null)
    } catch (error) {
      console.error('📸 Upload error:', error)
      showError('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại')
    } finally {
      setCompressing(false)
      setUploading(false)
    }
  }

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

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ${className}`}>
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
              <div className="h-6 bg-gray-300 rounded-lg w-48"></div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-200 rounded-xl overflow-hidden"
              >
                <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 animate-pulse"></div>
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
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                  Hình Ảnh Cây
                  {newPhotoAdded && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 animate-pulse">
                      ✨ Mới
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 font-medium">
                  {totalImages > 0 ? `${totalImages} ảnh được tìm thấy` : 'Chưa có ảnh nào'}
                  {storageImagesLoading && (
                    <span className="text-blue-600 font-medium ml-2 flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent mr-1"></div>
                      Đang tải thêm ảnh...
                    </span>
                  )}
                  {newPhotoAdded && (
                    <span className="text-green-600 font-semibold ml-2">
                      🎉 Ảnh mới đã được thêm!
                    </span>
                  )}
                </p>
              </div>
            </div>
            {/* Camera Controls */}
            {user && currentFarm && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCameraClick}
                  disabled={uploading || compressing}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl active:scale-95"
                  title="Chụp ảnh"
                >
                  <CameraIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">
                    {compressing ? 'Đang nén...' : uploading ? 'Đang tải...' : 'Chụp ảnh'}
                  </span>
                </button>
                <button
                  onClick={handleGalleryClick}
                  disabled={uploading || compressing}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl active:scale-95"
                  title="Chọn từ thư viện"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Thêm ảnh</span>
                </button>
              </div>
            )}
          </div>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
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
                Chưa có hình ảnh nào cho cây này
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
                  className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                  onClick={() => setSelectedImage(index)}
                >
                  {/* Image Container */}
                  <div className="relative w-full h-full">
                    {image.imageUrl ? (
                      <Image
                        src={image.thumbnailUrl || image.imageUrl}
                        alt={`Tree ${tree.name || tree.qrCode} photo ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        loading="lazy"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                          <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <span className="text-xs text-gray-500">Không có ảnh</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <EyeIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Delete button for managers (only for Firestore photos) */}
                    {canManagePhotos && 'photoType' in image && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePhotoClick(image as PhotoWithUrls)
                        }}
                        disabled={deletingPhotoId === (image as PhotoWithUrls).id}
                        className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-700 disabled:bg-red-400 text-white rounded-full p-2 backdrop-blur-sm border border-white/20 transition-colors shadow-lg"
                        title="Xóa ảnh"
                      >
                        {deletingPhotoId === (image as PhotoWithUrls).id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}
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
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {index + 1}
                  </div>
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
                  <Image
                    src={filteredImages[selectedImage].imageUrl}
                    alt={`Tree photo ${selectedImage + 1}`}
                    className="max-w-full max-h-full object-contain select-none rounded-xl shadow-2xl"
                    width={800}
                    height={600}
                    style={{
                      touchAction: 'pan-x pan-y pinch-zoom',
                      userSelect: 'none'
                    }}
                    draggable={false}
                    unoptimized
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

      {/* Photo Type Selection Modal */}
      {showPhotoTypeModal && pendingFile && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center ${getModalZClass('MANAGEMENT_MODAL')} z-[60000]`}>
          <div className="bg-white rounded-2xl max-w-md w-full m-4 shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <CameraIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Chọn loại ảnh</h3>
                  <p className="text-sm text-gray-600">Phân loại ảnh cho cây {tree.name || tree.qrCode}</p>
                </div>
              </div>
            </div>

            {/* Photo Type Options */}
            <div className="p-6 space-y-4">
              {/* Compression Info */}
              {compressionInfo && (
                <div className={`p-4 rounded-lg border ${
                  compressionInfo.needsCompression 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{compressionInfo.needsCompression ? '📐' : '✅'}</span>
                    <div className="font-medium text-gray-900">
                      {compressionInfo.needsCompression ? 'Sẽ nén ảnh' : 'Kích thước phù hợp'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Kích thước hiện tại: <span className="font-medium">{compressionInfo.currentSizeKB}KB</span></div>
                    {compressionInfo.needsCompression && (
                      <>
                        <div>Kích thước sau nén: <span className="font-medium">~{compressionInfo.targetSizeKB}KB</span></div>
                        <div>Giảm khoảng: <span className="font-medium text-orange-600">{compressionInfo.estimatedReduction}%</span></div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                <button
                  onClick={() => handlePhotoUpload('general')}
                  disabled={uploading}
                  className="flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📸</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Ảnh chung</div>
                    <div className="text-sm text-gray-600">Ảnh tổng quát về cây</div>
                  </div>
                </button>

                <button
                  onClick={() => handlePhotoUpload('health')}
                  disabled={uploading}
                  className="flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🏥</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Ảnh sức khỏe</div>
                    <div className="text-sm text-gray-600">Ảnh bệnh tật, sâu bệnh</div>
                  </div>
                </button>

                <button
                  onClick={() => handlePhotoUpload('fruit_count')}
                  disabled={uploading}
                  className="flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🍎</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Ảnh đếm trái</div>
                    <div className="text-sm text-gray-600">Ảnh để đếm số lượng trái</div>
                  </div>
                </button>
              </div>

              {/* Progress States */}
              {(compressing || uploading) && (
                <div className={`rounded-lg p-4 border ${
                  compressing 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`animate-spin rounded-full h-6 w-6 border-2 border-t-transparent ${
                      compressing ? 'border-orange-600' : 'border-blue-600'
                    }`}></div>
                    <div>
                      <div className={`font-medium ${
                        compressing ? 'text-orange-900' : 'text-blue-900'
                      }`}>
                        {compressing ? 'Đang nén ảnh...' : 'Đang tải ảnh lên...'}
                      </div>
                      <div className={`text-sm ${
                        compressing ? 'text-orange-700' : 'text-blue-700'
                      }`}>
                        {compressing 
                          ? 'Giảm kích thước file để tải nhanh hơn' 
                          : 'Vui lòng chờ trong giây lát'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowPhotoTypeModal(false)
                  setPendingFile(null)
                  setCompressionInfo(null)
                  setCompressing(false)
                  setUploading(false)
                }}
                disabled={uploading || compressing}
                className="w-full px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 rounded-xl font-medium transition-colors"
              >
                {(uploading || compressing) ? 'Đang xử lý...' : 'Hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && photoToDelete && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center ${getModalZClass('MANAGEMENT_MODAL')} z-[60000]`}>
          <div className="bg-white rounded-2xl max-w-md w-full m-4 shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <TrashIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Xóa ảnh</h3>
                  <p className="text-sm text-gray-600">Bạn có chắc chắn muốn xóa ảnh này?</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Photo preview */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {photoToDelete.imageUrl && (
                      <Image
                        src={photoToDelete.thumbnailUrl || photoToDelete.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        width={64}
                        height={64}
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      Ảnh {photoToDelete.photoType === 'health' ? 'sức khỏe' :
                           photoToDelete.photoType === 'fruit_count' ? 'đếm trái' : 'chung'}
                    </div>
                    {photoToDelete.timestamp && (
                      <div className="text-sm text-gray-600">
                        {formatDate(photoToDelete.timestamp)}
                      </div>
                    )}
                    {photoToDelete.userNotes && (
                      <div className="text-sm text-gray-500 truncate">
                        {photoToDelete.userNotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium mb-1">Hành động này không thể hoàn tác</div>
                    <div>Ảnh sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục.</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setPhotoToDelete(null)
                  }}
                  disabled={deletingPhotoId !== null}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 rounded-xl font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeletePhoto}
                  disabled={deletingPhotoId !== null}
                  className="flex-1 px-4 py-3 text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  {deletingPhotoId === photoToDelete.id ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-5 w-5" />
                      <span>Xóa ảnh</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}