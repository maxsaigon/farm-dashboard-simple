'use client'

import { useState, useEffect } from 'react'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { getTreeImages } from '@/lib/storage'
import { getTreePhotos, getPhotosWithUrls } from '@/lib/photo-service'

interface TreeImagePreviewProps {
  treeId: string
  farmId?: string
  qrCode?: string
  className?: string
}

export function TreeImagePreview({ treeId, farmId, qrCode, className = '' }: TreeImagePreviewProps) {
  // Use correct farmId - prioritize passed farmId, then fallback to known working farmId
  const effectiveFarmId = farmId && farmId !== 'default' ? farmId : 'F210C3FC-F191-4926-9C15-58D6550A716A'
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadPreviewImage() {
      if (!treeId) return
      
      setLoading(true)
      
      try {
        // Add a small delay to ensure Firebase is ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Try to get from Firestore first (more metadata)
        try {
          const firestorePhotos = await getTreePhotos(treeId)
          if (firestorePhotos.length > 0) {
            const photoWithUrl = await getPhotosWithUrls([firestorePhotos[0]], effectiveFarmId)
            if (photoWithUrl[0]?.thumbnailUrl || photoWithUrl[0]?.imageUrl) {
              setImageUrl(photoWithUrl[0].thumbnailUrl || photoWithUrl[0].imageUrl || null)
              setLoading(false)
              return
            }
          }
        } catch (firestoreError) {
          console.warn('Firestore access failed, trying direct storage:', firestoreError)
        }

        // Fallback to storage direct access with correct path
        try {
          const storageImages = await getTreeImages(treeId, effectiveFarmId)
          if (storageImages.length > 0) {
            setImageUrl(storageImages[0])
            setLoading(false)
            return
          }
        } catch (storageError) {
          console.warn('Storage access failed:', storageError)
        }

        // If QR code exists, try with QR code
        if (qrCode) {
          try {
            const qrImages = await getTreeImages(qrCode, effectiveFarmId)
            if (qrImages.length > 0) {
              setImageUrl(qrImages[0])
            }
          } catch (qrError) {
            console.warn('QR code image loading failed:', qrError)
          }
        }
      } catch (error) {
        console.error('Error loading tree preview image:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPreviewImage()
  }, [treeId, effectiveFarmId, qrCode])

  if (loading) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="animate-pulse">
          <PhotoIcon className="h-6 w-6 text-gray-400" />
        </div>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <PhotoIcon className="h-6 w-6 text-gray-400" />
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <img
        src={imageUrl}
        alt="Tree preview"
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setImageUrl(null)}
      />
    </div>
  )
}