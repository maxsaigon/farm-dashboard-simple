'use client'

import { useState, useEffect } from 'react'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { getTreeImages } from '@/lib/storage'
import { getTreePhotos, getPhotosWithUrls } from '@/lib/photo-service'

interface TreeImagePreviewProps {
  treeId: string
  qrCode?: string
  className?: string
}

export function TreeImagePreview({ treeId, qrCode, className = '' }: TreeImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadPreviewImage() {
      if (!treeId) return
      
      setLoading(true)
      
      try {
        // Try to get from Firestore first (more metadata)
        const firestorePhotos = await getTreePhotos(treeId)
        if (firestorePhotos.length > 0) {
          const photoWithUrl = await getPhotosWithUrls([firestorePhotos[0]])
          if (photoWithUrl[0]?.thumbnailUrl || photoWithUrl[0]?.imageUrl) {
            setImageUrl(photoWithUrl[0].thumbnailUrl || photoWithUrl[0].imageUrl || null)
            setLoading(false)
            return
          }
        }

        // Fallback to storage direct access
        const storageImages = await getTreeImages(treeId)
        if (storageImages.length > 0) {
          setImageUrl(storageImages[0])
          setLoading(false)
          return
        }

        // If QR code exists, try with QR code
        if (qrCode) {
          const qrImages = await getTreeImages(qrCode)
          if (qrImages.length > 0) {
            setImageUrl(qrImages[0])
          }
        }
      } catch (error) {
        console.error('Error loading tree preview image:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPreviewImage()
  }, [treeId, qrCode])

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