import { db } from './firebase'
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import { Photo } from './types'
import { getImageUrl, getThumbnailUrl } from './storage'

/**
 * Convert Firestore document to Photo with proper date handling
 */
function convertToPhoto(doc: QueryDocumentSnapshot<DocumentData>): Photo {
  const data = doc.data()
  
  return {
    id: doc.id,
    timestamp: data.timestamp?.toDate() || new Date(),
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
    uploadDate: data.uploadDate?.toDate(),
    thumbnailPath: data.thumbnailPath,
    compressedPath: data.compressedPath,
    aiReadyPath: data.aiReadyPath,
    originalPath: data.originalPath,
    localStorageDate: data.localStorageDate?.toDate(),
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
    const q = query(
      photosRef,
      where('treeId', '==', treeId),
      orderBy('timestamp', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(convertToPhoto)
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
  } catch (error) {
    console.error('Error setting up tree photos subscription:', error)
    return () => {}
  }
}

/**
 * Get photos for a specific farm
 */
export async function getFarmPhotos(farmId: string, userId: string): Promise<Photo[]> {
  try {
    const photosRef = collection(db, 'photos')
    const q = query(
      photosRef,
      where('farmId', '==', farmId),
      orderBy('timestamp', 'desc'),
      limit(100) // Limit to recent 100 photos
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(convertToPhoto)
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
    const q = query(
      photosRef,
      where('farmId', '==', farmId),
      where('photoType', '==', photoType),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(convertToPhoto)
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
 * Get photo with download URLs from storage
 */
export async function getPhotoWithUrls(photo: Photo): Promise<PhotoWithUrls> {
  const photoWithUrls: PhotoWithUrls = { ...photo, isLoading: true }
  
  try {
    // Try to get image URL from various paths
    const possiblePaths = [
      photo.originalPath,
      photo.compressedPath,
      photo.aiReadyPath,
      photo.localPath,
      `trees/${photo.treeId}/${photo.filename}`,
      `photos/${photo.id}/${photo.filename}`,
      `farm-photos/${photo.farmId}/${photo.filename}`
    ].filter(Boolean) as string[]
    
    let imageUrl: string | null = null
    
    for (const path of possiblePaths) {
      imageUrl = await getImageUrl(path)
      if (imageUrl) break
    }
    
    photoWithUrls.imageUrl = imageUrl || undefined
    
    // Try to get thumbnail URL
    if (photo.thumbnailPath) {
      photoWithUrls.thumbnailUrl = await getThumbnailUrl(photo.thumbnailPath) || undefined
    } else if (imageUrl) {
      photoWithUrls.thumbnailUrl = imageUrl // Use main image as thumbnail fallback
    }
    
    photoWithUrls.isLoading = false
    photoWithUrls.loadError = !imageUrl
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
export async function getPhotosWithUrls(photos: Photo[]): Promise<PhotoWithUrls[]> {
  try {
    const photoPromises = photos.map(photo => getPhotoWithUrls(photo))
    return await Promise.all(photoPromises)
  } catch (error) {
    console.error('Error loading photos with URLs:', error)
    return photos.map(photo => ({ ...photo, loadError: true }))
  }
}