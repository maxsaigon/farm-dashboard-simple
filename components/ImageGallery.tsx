'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Tree } from '@/lib/types'
import { PhotoIcon, EyeIcon, CameraIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { subscribeToTreePhotos, getPhotosWithUrls, getTreePhotos, PhotoWithUrls } from '@/lib/photo-service'
import { getTreeImagesByPattern } from '@/lib/storage'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { useToast } from './Toast'
import { collection, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { compressImageSmart, getCompressionInfo, needsCompression } from '@/lib/photo-compression'
import { FarmService } from '@/lib/farm-service'
import { AuditService } from '@/lib/audit-service'
import logger from '@/lib/logger'

// Subcomponents
import { PhotoViewerModal } from './PhotoViewerModal'
import { PhotoTypeModal } from './PhotoTypeModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'

// Utilities
import {
  DisplayImage,
  formatDateOnly,
  getImageDate,
  getPhotoType,
  getSeasonLabel
} from '@/lib/photo-utils'

interface ImageGalleryProps {
  tree: Tree
  className?: string
}

// Simple cache for storage images to avoid repeated slow Firebase calls
const storageImagesCache = new Map<string, { general: string[], health: string[], fruitCount: string[] }>()

export function ImageGallery({ tree, className = '' }: ImageGalleryProps) {
  const { user, currentFarm, selectedSeasonYear } = useSimpleAuth()
  const [filterSeason, setFilterSeason] = useState<string>('all')
  const { showSuccess, showError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

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

    logger.debug('🔄 ImageGallery: Loading Firestore photos for tree:', tree.id)

    const unsubscribe = subscribeToTreePhotos(tree.id, async (firestorePhotos) => {
      logger.debug('📸 ImageGallery: Received Firestore photos:', firestorePhotos.length, 'photos')
      
      const photosWithUrls = await getPhotosWithUrls(firestorePhotos, effectiveFarmId)
      logger.debug('🔗 ImageGallery: Photos with URLs:', photosWithUrls.length, 'photos')

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

      const cacheKey = `${tree.id}-${tree.qrCode || ''}-${effectiveFarmId}`
      logger.debug('🔄 ImageGallery: Loading storage images for tree:', tree.id, 'cacheKey:', cacheKey)

      // Check cache first
      const cachedImages = storageImagesCache.get(cacheKey)
      if (cachedImages) {
        logger.debug('💾 ImageGallery: Using cached storage images:', cachedImages)
        setStorageImages(cachedImages)
        return
      }

      setStorageImagesLoading(true)
      try {
        logger.debug('📁 ImageGallery: Fetching storage images from service...')
        const images = await getTreeImagesByPattern(tree.id, tree.qrCode, effectiveFarmId)
        logger.debug('📁 ImageGallery: Storage images loaded:', images)

        // Cache the result
        storageImagesCache.set(cacheKey, images)
        setStorageImages(images)
      } catch (error) {
        logger.error('Error loading storage images:', error)
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
        const hasAccess = await FarmService.checkFarmAccess(user.uid, currentFarm.id, ['write', 'delete'])
        setCanManagePhotos(hasAccess)
      } catch (error) {
        logger.error('📸 Error checking permissions:', error)
        setCanManagePhotos(false)
      }
    }

    checkPermissions()
  }, [user, currentFarm])

  // Get all images (no filtering needed since tabs are removed)
  const getFilteredImages = useCallback((): DisplayImage[] => {
    const firestoreImages = photos.filter(photo => photo.imageUrl)
    
    // Create a set of Firestore image URLs to avoid duplicates
    const firestoreImageUrls = new Set(firestoreImages.map(img => img.imageUrl))

    // Filter out storage images that already exist in Firestore
    const generalStorageFiltered = storageImages.general.filter(url => !firestoreImageUrls.has(url))
    const healthStorageFiltered = storageImages.health.filter(url => !firestoreImageUrls.has(url))
    const fruitCountStorageFiltered = storageImages.fruitCount.filter(url => !firestoreImageUrls.has(url))

    const uniqueStorageImages = [
      ...generalStorageFiltered.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url })),
      ...healthStorageFiltered.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url })),
      ...fruitCountStorageFiltered.map(url => ({ imageUrl: url, isStorage: true, thumbnailUrl: url }))
    ]

    return [
      ...firestoreImages,
      ...uniqueStorageImages
    ]
  }, [photos, storageImages])

  const allCombinedImages = useMemo(() => {
    return getFilteredImages()
  }, [getFilteredImages])

  const availableSeasonsForTree = useMemo(() => {
    const seasonsSet = new Set<number>()
    photos.forEach(p => {
      if (p.seasonYear && p.seasonYear >= 2000) {
        seasonsSet.add(p.seasonYear)
      } else if (p.timestamp) {
        const year = new Date(p.timestamp).getFullYear()
        if (year >= 2000) {
          seasonsSet.add(year)
        }
      }
    })
    return Array.from(seasonsSet).sort((a, b) => b - a)
  }, [photos])

  const filteredImagesBySeason = useCallback((season: number | 'all') => {
    if (season === 'all') return allCombinedImages
    return allCombinedImages.filter(img => {
      if ('seasonYear' in img && img.seasonYear) {
        return img.seasonYear === season
      }
      if ('timestamp' in img && img.timestamp) {
        return new Date(img.timestamp).getFullYear() === season
      }
      return false
    })
  }, [allCombinedImages])

  const displayedImages = useMemo(() => {
    return filterSeason === 'all' ? allCombinedImages : filteredImagesBySeason(parseInt(filterSeason, 10))
  }, [filterSeason, allCombinedImages, filteredImagesBySeason])

  const displayedImagesCount = displayedImages.length
  const totalImages = allCombinedImages.length

  // Modal navigation
  const nextImage = useCallback(() => {
    if (selectedImage !== null && displayedImagesCount > 0) {
      setSelectedImage((selectedImage + 1) % displayedImagesCount)
    }
  }, [selectedImage, displayedImagesCount])

  const prevImage = useCallback(() => {
    if (selectedImage !== null && displayedImagesCount > 0) {
      setSelectedImage((selectedImage - 1 + displayedImagesCount) % displayedImagesCount)
    }
  }, [selectedImage, displayedImagesCount])

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
      logger.error('Error refreshing gallery:', error)
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
          logger.warn('Could not delete from Storage (file may not exist):', storageError)
        }
      }

      // Refresh gallery
      await refreshImageGallery()

      showSuccess('Đã xóa', 'Ảnh đã được xóa khỏi thư viện')
      setShowDeleteConfirm(false)
      setPhotoToDelete(null)
    } catch (error) {
      logger.error('🗑️ Delete error:', error)
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
          logger.warn('Compression failed, using original file:', compressionError)
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
        farmName: currentFarm.name || 'Unknown Farm',
        seasonYear: selectedSeasonYear
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
        logger.error('Failed to log photo upload:', auditError)
      }

      // Force refresh the image gallery
      await refreshImageGallery()

      // Show new photo indicator
      setNewPhotoAdded(true)
      setTimeout(() => setNewPhotoAdded(false), 5000)

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
      logger.error('📸 Upload error:', error)
      showError('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại')
    } finally {
      setCompressing(false)
      setUploading(false)
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
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-200 rounded-xl overflow-hidden animate-pulse"
              >
                <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100"></div>
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
                <div className="text-sm text-gray-600 font-medium">
                  {totalImages > 0 ? `${totalImages} ảnh được tìm thấy` : 'Chưa có ảnh nào'}
                  {storageImagesLoading && (
                    <span className="text-blue-600 font-medium ml-2 inline-flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent mr-1"></div>
                      Đang tải thêm ảnh...
                    </span>
                  )}
                  {newPhotoAdded && (
                    <span className="text-green-600 font-semibold ml-2">
                      🎉 Ảnh mới đã được thêm!
                    </span>
                  )}
                </div>
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

        {/* Season Filter Tabs */}
        {availableSeasonsForTree.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 px-6 pt-2">
            <button
              onClick={() => setFilterSeason('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterSeason === 'all'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả ({totalImages})
            </button>
            {availableSeasonsForTree.map(y => {
              const count = filteredImagesBySeason(y).length
              return (
                <button
                  key={y}
                  onClick={() => setFilterSeason(String(y))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    filterSeason === String(y)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Niên vụ {y} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Enhanced Image Grid */}
        <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
          {displayedImages.length === 0 ? (
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
              <p className="text-gray-600 max-w-md mx-auto leading-relaxed font-medium text-sm">
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
              {displayedImages.map((image, index) => (
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
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 shadow-md">
                        <EyeIcon className="h-6 w-6 text-white animate-pulse" />
                      </div>
                    </div>

                    {/* Delete button (only for Firestore photos) */}
                    {canManagePhotos && 'photoType' in image && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePhotoClick(image as PhotoWithUrls)
                        }}
                        disabled={deletingPhotoId === (image as PhotoWithUrls).id}
                        className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-700 disabled:bg-red-400 text-white rounded-full p-2 backdrop-blur-sm border border-white/20 transition-colors shadow-lg active:scale-90"
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

                  {/* Bottom Info Badges */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
                    <div className="flex flex-wrap gap-1">
                      {getSeasonLabel(image) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-sm">
                          📅 Mùa {getSeasonLabel(image)}
                        </span>
                      )}
                      {getImageDate(image) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-sm">
                          🕒 {formatDateOnly(getImageDate(image))}
                        </span>
                      )}
                    </div>
                    <div className="bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {index + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photo Viewer Modal */}
      <PhotoViewerModal
        isOpen={selectedImage !== null}
        onClose={() => setSelectedImage(null)}
        tree={tree}
        totalImages={totalImages}
        filteredImages={displayedImages}
        selectedImage={selectedImage}
        nextImage={nextImage}
        prevImage={prevImage}
      />

      {/* Photo Type Selection Modal */}
      <PhotoTypeModal
        isOpen={showPhotoTypeModal}
        onClose={() => {
          setShowPhotoTypeModal(false)
          setPendingFile(null)
          setCompressionInfo(null)
        }}
        pendingFile={pendingFile}
        treeNameOrQr={tree.name || tree.qrCode || ''}
        compressionInfo={compressionInfo}
        uploading={uploading}
        compressing={compressing}
        onUpload={handlePhotoUpload}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setPhotoToDelete(null)
        }}
        photoToDelete={photoToDelete}
        deletingPhotoId={deletingPhotoId}
        onDelete={handleDeletePhoto}
      />
    </>
  )
}