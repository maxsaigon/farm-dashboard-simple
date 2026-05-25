import { getPendingPhotos, deletePendingPhoto } from './offline-photos-db'
import { uploadFile } from './storage'
import { db } from './firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { compressImageSmart } from './photo-compression'
import { AuditService } from './audit-service'

// Check connection details (cellular vs Wifi)
export function isWifiConnection(): boolean {
  if (typeof navigator === 'undefined') return false
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (!conn) return true // Default to WiFi assuming if connection API is not available
  
  // Wifi or high-bandwidth ethernet/cable connection
  return conn.type === 'wifi' || !['cellular', 'wimax', 'bluetooth'].includes(conn.type)
}

export class OfflineSyncService {
  private static isSyncing = false

  static async syncPendingPhotos(
    userId: string, 
    farmId: string, 
    onProgress?: (message: string, type: 'success' | 'info' | 'error') => void
  ): Promise<void> {
    if (this.isSyncing) return
    
    // Check if online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[Sync] Device is offline, skipping sync.')
      return
    }

    // Prioritize WiFi for photo syncing to protect user mobile data limits
    if (!isWifiConnection()) {
      console.log('[Sync] Device is on mobile data, waiting for WiFi to sync photos.')
      const pending = await getPendingPhotos(farmId)
      if (pending.length > 0) {
        onProgress?.(`Có ${pending.length} ảnh đang chờ đồng bộ, nhưng app đang đợi mạng Wifi...`, 'info')
      }
      return
    }

    const pending = await getPendingPhotos(farmId)
    if (pending.length === 0) return

    this.isSyncing = true
    console.log(`[Sync] Starting sync of ${pending.length} offline photos...`)
    onProgress?.(`Đang đồng bộ ${pending.length} ảnh đã chụp ngoại tuyến...`, 'info')

    try {
      for (const item of pending) {
        try {
          // Convert blob to File
          const file = new File([item.imageBlob], `photo_${item.id}.jpg`, { type: 'image/jpeg' })
          
          // Compress photo
          const compressedFile = await compressImageSmart(file, 'general')
          
          // Upload to Firebase Storage
          // Path: farms/{farmId}/trees/{treeId}/photos/{photoId}/compressed.jpg
          const storagePath = `farms/${item.farmId}/trees/${item.treeId}/photos/${item.id}/compressed.jpg`
          const downloadURL = await uploadFile(compressedFile, storagePath)
          
          let finalSeasonYear = item.seasonYear
          if (!finalSeasonYear || finalSeasonYear < 2000) {
            const parsedYear = new Date(item.timestamp).getFullYear()
            finalSeasonYear = parsedYear >= 2020 ? parsedYear : 2025
          }

          // Create document in subcollection farms/{farmId}/photos/{photoId}
          const photoDoc = {
            treeId: item.treeId,
            farmId: item.farmId,
            filename: `photo_${item.id}.jpg`,
            photoType: item.photoType,
            timestamp: new Date(item.timestamp),
            latitude: item.latitude || null,
            longitude: item.longitude || null,
            altitude: item.altitude || null,
            uploadedToServer: true,
            serverProcessed: false,
            needsAIAnalysis: item.photoType === 'fruit',
            compressedPath: storagePath,
            originalPath: storagePath,
            localPath: downloadURL,
            createdAt: serverTimestamp(),
            seasonYear: finalSeasonYear
          }

          // Save document to Firestore under subcollection /farms/{farmId}/photos/{photoId}
          await setDoc(doc(db, 'farms', item.farmId, 'photos', item.id), photoDoc)
          
          // Log to audit system
          try {
            await AuditService.logEvent({
              userId,
              userEmail: 'user@farm.manager',
              action: 'PHOTO_UPLOADED',
              resource: 'photo',
              resourceId: item.treeId,
              details: {
                photoId: item.id,
                photoType: item.photoType,
                treeId: item.treeId,
                farmId: item.farmId,
                source: 'offline_sync'
              },
              severity: 'low',
              category: 'data_modification',
              status: 'success'
            })
          } catch (e) {
            console.error('Audit log failed:', e)
          }

          // Delete from IndexedDB after successful upload
          await deletePendingPhoto(item.id)
          console.log(`[Sync] Synced photo successfully: ${item.id}`)
          
        } catch (photoError) {
          console.error(`[Sync] Failed to sync photo ${item.id}:`, photoError)
        }
      }
      
      onProgress?.('Đồng bộ ảnh chụp ngoại tuyến hoàn tất!', 'success')
    } catch (err) {
      console.error('[Sync] Sync process encountered errors:', err)
      onProgress?.('Đồng bộ ảnh gặp lỗi. Sẽ thử lại sau.', 'error')
    } finally {
      this.isSyncing = false
    }
  }
}
