import { PhotoWithUrls } from '@/lib/photo-service'

export interface StorageImage {
  imageUrl: string
  isStorage: boolean
  thumbnailUrl?: string
}

export type DisplayImage = PhotoWithUrls | StorageImage

export const formatDate = (date?: Date | any): string => {
  if (!date) return 'N/A'
  
  // Handle Firestore Timestamp or standard Date
  const d = date.toDate ? date.toDate() : new Date(date)
  if (isNaN(d.getTime())) return 'N/A'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

export const getTimestampFromUrl = (url: string): Date | undefined => {
  try {
    let date: Date | undefined

    // 1. Try to find timestamp in URL path: /photos/(\d+)/
    const photosMatch = url.match(/\/photos%2F(\d+)/i) || url.match(/\/photos\/(\d+)/i)
    if (photosMatch && photosMatch[1]) {
      const ts = parseInt(photosMatch[1], 10)
      if (ts > 0) {
        // If it's in seconds (10 digits), convert to ms
        date = new Date(ts < 9999999999 ? ts * 1000 : ts)
      }
    }

    // 2. Try to find 10-digit or 13-digit timestamp in the URL/filename
    if (!date) {
      const filename = url.split('/').pop()?.split('?')[0] || ''
      const tsMatch = filename.match(/(\d{10,13})/)
      if (tsMatch && tsMatch[1]) {
        const ts = parseInt(tsMatch[1], 10)
        date = new Date(ts < 9999999999 ? ts * 1000 : ts)
      }
    }

    // Ignore any parsed dates before year 2000 (likely invalid/1970)
    if (date && date.getFullYear() >= 2000) {
      return date
    }
  } catch (e) {
    console.error('Error parsing timestamp from storage URL:', e)
  }
  return undefined
}

export const getImageDate = (image: DisplayImage): Date | undefined => {
  if ('timestamp' in image && image.timestamp) {
    // Handle Firestore Timestamp or Date
    const date = (image.timestamp as any).toDate ? (image.timestamp as any).toDate() : new Date(image.timestamp)
    if (date.getFullYear() >= 2000) {
      return date
    }
  }
  // For storage images, try to parse timestamp from URL
  if (image.imageUrl) {
    return getTimestampFromUrl(image.imageUrl)
  }
  return undefined
}

export const formatDateFriendly = (date?: Date | any): string => {
  if (!date) return 'Không rõ thời gian'
  const d = date.toDate ? date.toDate() : new Date(date)
  if (isNaN(d.getTime())) return 'Không rõ thời gian'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(d)
}

export const formatDateOnly = (date?: Date | any): string => {
  if (!date) return ''
  const d = date.toDate ? date.toDate() : new Date(date)
  if (isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

export const getPhotoType = (image: DisplayImage): 'general' | 'health' | 'fruit_count' => {
  if ('photoType' in image && image.photoType) {
    return image.photoType as 'general' | 'health' | 'fruit_count'
  }
  // For storage images, try to parse from URL/filename
  if (image.imageUrl) {
    const filename = image.imageUrl.toLowerCase()
    if (filename.includes('health') || filename.includes('disease')) return 'health'
    if (filename.includes('fruit') || filename.includes('count')) return 'fruit_count'
  }
  return 'general'
}

export const getPhotoTypeName = (image: DisplayImage): string => {
  const type = getPhotoType(image)
  if (type === 'health') return '🏥 Sức Khỏe'
  if (type === 'fruit_count') return '🍎 Đếm Trái'
  return '📸 Chung'
}

export const getSeasonLabel = (image: DisplayImage): string => {
  if ('seasonYear' in image && image.seasonYear && image.seasonYear >= 2000) {
    return `${image.seasonYear}`
  }
  if ('timestamp' in image && image.timestamp) {
    const d = (image.timestamp as any).toDate ? (image.timestamp as any).toDate() : new Date(image.timestamp)
    const year = d.getFullYear()
    if (year >= 2000) {
      return `${year}`
    }
  }
  return ''
}
