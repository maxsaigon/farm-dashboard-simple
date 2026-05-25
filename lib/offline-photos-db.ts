export interface PendingPhoto {
  id: string
  treeId: string
  farmId: string
  photoType: 'general' | 'fruit' | 'disease' | 'growth' | 'maintenance'
  userNotes?: string
  latitude?: number
  longitude?: number
  altitude?: number
  timestamp: string // Store Date as ISO string
  imageBlob: Blob
}

const DB_NAME = 'OfflinePhotosDB'
const DB_VERSION = 1
const STORE_NAME = 'pendingPhotos'

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePendingPhoto(photo: PendingPhoto): Promise<void> {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(photo)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPendingPhotos(farmId?: string): Promise<PendingPhoto[]> {
  try {
    const db = await openOfflineDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onsuccess = () => {
        const all = request.result as PendingPhoto[]
        if (farmId) {
          resolve(all.filter(p => p.farmId === farmId))
        } else {
          resolve(all)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[OfflineDB] IndexedDB is not available or failed to load:', error)
    return []
  }
}

export async function deletePendingPhoto(id: string): Promise<void> {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
