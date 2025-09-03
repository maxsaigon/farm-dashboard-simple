import { db } from './firebase'
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import { Photo } from './types'
import { getImageUrl, getThumbnailUrl } from './storage'

/**
 * Convert Firestore document to Photo with proper date handling
 */
function convertToPhoto(doc: QueryDocumentSnapshot<DocumentData>): Photo {
  const data = doc.data()
  
  // Helper function to safely convert timestamps
  const safeToDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined
    if (timestamp instanceof Date) return timestamp
    if (typeof timestamp?.toDate === 'function') return timestamp.toDate()
    if (typeof timestamp === 'string') return new Date(timestamp)
    if (typeof timestamp === 'number') return new Date(timestamp)
    return undefined
  }
  
  return {
    id: doc.id,
    timestamp: safeToDate(data.timestamp) || new Date(),
    localPath: data.localPath || '',
    farmId: data.farmId || '',
    filename: data.filename,
    photoType: data.photoType,
    userNotes: data.userNotes,
    manualFruitCount: data.manualFruitCount,
    latitude: data.latitude,
    longitude: data.longitude,
    altitude: data.altitude,
    needsAIAnalysis: data.needsAIAnalysis || false,
    uploadedToServer: data.uploadedToServer || false,
    serverProcessed: data.serverProcessed || false,
    uploadDate: safeToDate(data.uploadDate),
    thumbnailPath: data.thumbnailPath,
    compressedPath: data.compressedPath,
    aiReadyPath: data.aiReadyPath,
    originalPath: data.originalPath,
    localStorageDate: safeToDate(data.localStorageDate),
    totalLocalSize: data.totalLocalSize,
    treeId: data.treeId,
    farmName: data.farmName
  }
}

/**
 * Get photos for a specific tree
 */
export async function getTreePhotos(treeId: string): Promise<Photo[]> {
  try {
    const photosRef = collection(db, 'photos')
    
    // Try with orderBy first, fallback to simple query if index doesn't exist
    try {
      const q = query(
        photosRef,
        where('treeId', '==', treeId),
        orderBy('timestamp', 'desc')
      )
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(convertToPhoto)
    } catch (indexError: any) {
      console.warn('Index not available, using simple query:', indexError?.message || indexError)
      
      // Fallback to simple query without orderBy
      const simpleQ = query(
        photosRef,
        where('treeId', '==', treeId)
      )
      const querySnapshot = await getDocs(simpleQ)
      const photos = querySnapshot.docs.map(convertToPhoto)
      
      // Sort manually by timestamp
      return photos.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }
  } catch (error) {
    console.error('Error getting tree photos:', error)
    return []
  }
}

/**
 * Subscribe to photos for a specific tree
 */
export function subscribeToTreePhotos(
  treeId: string,
  callback: (photos: Photo[]) => void
): () => void {
  try {
    const photosRef = collection(db, 'photos')
    
    // Try with orderBy first, fallback to simple query if index doesn't exist
    try {
      const q = query(
        photosRef,
        where('treeId', '==', treeId),
        orderBy('timestamp', 'desc')
      )
      
      return onSnapshot(q, (querySnapshot) => {
        const photos = querySnapshot.docs.map(convertToPhoto)
        callback(photos)
      }, (error) => {
        console.error('Error subscribing to tree photos:', error)
        callback([])
      })
    } catch (indexError) {
      console.warn('Index not available for subscription, using simple query')
      
      // Fallback to simple query without orderBy
      const simpleQ = query(
        photosRef,
        where('treeId', '==', treeId)
      )
      
      return onSnapshot(simpleQ, (querySnapshot) => {
        const photos = querySnapshot.docs.map(convertToPhoto)
        // Sort manually by timestamp
        const sortedPhotos = photos.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        callback(sortedPhotos)
      }, (error) => {
        console.error('Error subscribing to tree photos:', error)
        callback([])
      })
    }
  } catch (error) {
    console.error('Error setting up tree photos subscription:', error)
    return () => {}
  }
}

/**
 * Get photos for a specific farm
 */
export async function getFarmPhotos(farmId: string): Promise<Photo[]> {
  try {
    const photosRef = collection(db, 'photos')
    
    // Try with orderBy first, fallback to simple query if index doesn't exist
    try {
      const q = query(
        photosRef,
        where('farmId', '==', farmId),
        orderBy('timestamp', 'desc'),
        limit(100) // Limit to recent 100 photos
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(convertToPhoto)
    } catch (indexError) {
      console.warn('Index not available for farm photos, using simple query')
      
      // Fallback to simple query without orderBy
      const simpleQ = query(
        photosRef,
        where('farmId', '==', farmId),
        limit(100)
      )
      const querySnapshot = await getDocs(simpleQ)
      const photos = querySnapshot.docs.map(convertToPhoto)
      
      // Sort manually by timestamp
      return photos.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }
  } catch (error) {
    console.error('Error getting farm photos:', error)
    return []
  }
}

/**
 * Get recent photos across all accessible farms for a user
 */
export async function getRecentPhotos(farmIds: string[], limitCount: number = 20): Promise<Photo[]> {
  try {
    if (farmIds.length === 0) {
      return []
    }

    const photosRef = collection(db, 'photos')
    const q = query(
      photosRef,
      where('farmId', 'in', farmIds.slice(0, 10)), // Firestore limit
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(convertToPhoto)
  } catch (error) {
    console.error('Error getting recent photos:', error)
    return []
  }
}

/**
 * Get photos by type
 */
export async function getPhotosByType(
  farmId: string,
  photoType: 'general' | 'health' | 'fruit_count'
): Promise<Photo[]> {
  try {
    const photosRef = collection(db, 'photos')
    
    // Try with orderBy first, fallback to simple query if index doesn't exist
    try {
      const q = query(
        photosRef,
        where('farmId', '==', farmId),
        where('photoType', '==', photoType),
        orderBy('timestamp', 'desc'),
        limit(50)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(convertToPhoto)
    } catch (indexError) {
      console.warn('Index not available for photos by type, using simple query')
      
      // Fallback to simple query without orderBy
      const simpleQ = query(
        photosRef,
        where('farmId', '==', farmId),
        where('photoType', '==', photoType),
        limit(50)
      )
      const querySnapshot = await getDocs(simpleQ)
      const photos = querySnapshot.docs.map(convertToPhoto)
      
      // Sort manually by timestamp
      return photos.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }
  } catch (error) {
    console.error('Error getting photos by type:', error)
    return []
  }
}

/**
 * Enhanced photo with download URLs
 */
export interface PhotoWithUrls extends Photo {
  imageUrl?: string
  thumbnailUrl?: string
  isLoading?: boolean
  loadError?: boolean
}

/**
 * Get photo with download URLs from storage using correct path structure
 * Path: farms/{farmId}/trees/{treeId}/photos/{photoId}/
 */
export async function getPhotoWithUrls(photo: Photo, actualFarmId?: string): Promise<PhotoWithUrls> {
  const photoWithUrls: PhotoWithUrls = { ...photo, isLoading: true }
  
  try {
    // Correct Firebase Storage path structure
    const correctPaths: string[] = []
    
    // Use actualFarmId if provided, otherwise fall back to photo.farmId
    const effectiveFarmId = actualFarmId || photo.farmId
    console.log(`🔧 Using farmId: '${effectiveFarmId}' (actualFarmId: '${actualFarmId}', photo.farmId: '${photo.farmId}')`)
    
    if (effectiveFarmId && photo.treeId && photo.id) {
      console.log(`🔧 Building paths with farmId: '${effectiveFarmId}', treeId: '${photo.treeId}', photoId: '${photo.id}'`)
      const basePath = `farms/${effectiveFarmId}/trees/${photo.treeId}/photos/${photo.id}`
      console.log(`🔧 Base path: ${basePath}`)
      
      correctPaths.push(
        `${basePath}/thumbnail.jpg`,
        `${basePath}/compressed.jpg`, 
        `${basePath}/ai_ready.jpg`,
        `${basePath}/${photo.filename}` // If filename is provided
      )
      
      console.log(`🔧 Correct paths generated:`, correctPaths)
    } else {
      console.warn(`🔧 Missing required fields - effectiveFarmId: '${effectiveFarmId}', treeId: '${photo.treeId}', photoId: '${photo.id}'`)
    }
    
    // Legacy/fallback paths for backwards compatibility
    const fallbackPaths = [
      photo.originalPath,
      photo.compressedPath,
      photo.aiReadyPath,
      photo.thumbnailPath,
      photo.localPath,
      `trees/${photo.treeId}/${photo.filename}`,
      `photos/${photo.id}/${photo.filename}`,
      `farm-photos/${photo.farmId}/${photo.filename}`
    ].filter(Boolean) as string[]
    
    const allPaths = [...correctPaths, ...fallbackPaths]
    
    let imageUrl: string | null = null
    let thumbnailUrl: string | null = null
    
    // Try to get thumbnail first (prioritize thumbnail.jpg from correct path)
    for (const path of allPaths) {
      if (path.includes('thumbnail.jpg') || path === photo.thumbnailPath) {
        thumbnailUrl = await getImageUrl(path)
        if (thumbnailUrl) {
          console.log(`Found thumbnail at: ${path}`)
          break
        }
      }
    }
    
    // Try to get main image (prioritize compressed.jpg, then ai_ready.jpg)
    for (const path of allPaths) {
      if (path.includes('compressed.jpg') || path.includes('ai_ready.jpg') || path === photo.compressedPath || path === photo.aiReadyPath) {
        imageUrl = await getImageUrl(path)
        if (imageUrl) {
          console.log(`Found image at: ${path}`)
          break
        }
      }
    }
    
    // If no compressed image found, try any remaining paths
    if (!imageUrl) {
      for (const path of allPaths) {
        if (!path.includes('thumbnail.jpg')) { // Skip thumbnails for main image
          imageUrl = await getImageUrl(path)
          if (imageUrl) {
            console.log(`Found fallback image at: ${path}`)
            break
          }
        }
      }
    }
    
    photoWithUrls.imageUrl = imageUrl || undefined
    photoWithUrls.thumbnailUrl = thumbnailUrl || imageUrl || undefined // Use main image as thumbnail fallback
    
    photoWithUrls.isLoading = false
    photoWithUrls.loadError = !imageUrl && !thumbnailUrl
    
    if (photoWithUrls.loadError) {
      console.warn('Failed to load any image for photo:', photo.id, 'Tried paths:', allPaths)
    }
  } catch (error) {
    console.error('Error loading photo URLs:', error)
    photoWithUrls.isLoading = false
    photoWithUrls.loadError = true
  }
  
  return photoWithUrls
}

/**
 * Get multiple photos with URLs (batch processing)
 */
export async function getPhotosWithUrls(photos: Photo[], actualFarmId?: string): Promise<PhotoWithUrls[]> {
  try {
    const photoPromises = photos.map(photo => getPhotoWithUrls(photo, actualFarmId))
    return await Promise.all(photoPromises)
  } catch (error) {
    console.error('Error loading photos with URLs:', error)
    return photos.map(photo => ({ ...photo, loadError: true }))
  }
}