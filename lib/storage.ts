import { storage } from './firebase'
import { ref, getDownloadURL, listAll, StorageReference } from 'firebase/storage'

/**
 * Get download URL for a file in Firebase Storage
 */
export async function getImageUrl(path: string): Promise<string | null> {
  try {
    const imageRef = ref(storage, path)
    const url = await getDownloadURL(imageRef)
    return url
  } catch (error) {
    console.error('Error getting image URL:', error)
    return null
  }
}

/**
 * Get all images for a specific tree
 */
export async function getTreeImages(treeId: string): Promise<string[]> {
  try {
    // Try multiple possible path patterns
    const possiblePaths = [
      `trees/${treeId}`,
      `photos/${treeId}`,
      `tree-photos/${treeId}`,
      `images/trees/${treeId}`,
    ]

    const urls: string[] = []
    
    for (const basePath of possiblePaths) {
      try {
        const folderRef = ref(storage, basePath)
        const result = await listAll(folderRef)
        
        // Get URLs for all files in this folder
        const urlPromises = result.items.map(async (itemRef) => {
          try {
            return await getDownloadURL(itemRef)
          } catch (error) {
            console.error(`Error getting URL for ${itemRef.fullPath}:`, error)
            return null
          }
        })
        
        const folderUrls = await Promise.all(urlPromises)
        urls.push(...folderUrls.filter((url): url is string => url !== null))
      } catch (error) {
        // Folder doesn't exist, continue to next path
        console.debug(`No images found in path: ${basePath}`)
      }
    }
    
    return urls
  } catch (error) {
    console.error('Error getting tree images:', error)
    return []
  }
}

/**
 * Get images for a tree by various filename patterns
 */
export async function getTreeImagesByPattern(treeId: string, qrCode?: string): Promise<{
  general: string[]
  health: string[]
  fruitCount: string[]
}> {
  try {
    const allImages = await getTreeImages(treeId)
    
    // If we have QR code, also try to find images by QR code pattern
    if (qrCode) {
      const qrImages = await getTreeImages(qrCode)
      allImages.push(...qrImages)
    }
    
    // Categorize images based on filename patterns
    const categorized = {
      general: [] as string[],
      health: [] as string[],
      fruitCount: [] as string[]
    }
    
    allImages.forEach(url => {
      const filename = url.split('/').pop()?.toLowerCase() || ''
      
      if (filename.includes('health') || filename.includes('disease')) {
        categorized.health.push(url)
      } else if (filename.includes('fruit') || filename.includes('count')) {
        categorized.fruitCount.push(url)
      } else {
        categorized.general.push(url)
      }
    })
    
    return categorized
  } catch (error) {
    console.error('Error categorizing tree images:', error)
    return {
      general: [],
      health: [],
      fruitCount: []
    }
  }
}

/**
 * Get thumbnail URL for an image (with fallback to original)
 */
export async function getThumbnailUrl(originalPath: string): Promise<string | null> {
  try {
    // Try different thumbnail path patterns
    const thumbnailPaths = [
      originalPath.replace('/original/', '/thumbnails/'),
      originalPath.replace('/images/', '/thumbnails/'),
      originalPath.replace('.jpg', '_thumb.jpg'),
      originalPath.replace('.png', '_thumb.png'),
      originalPath.replace('.jpeg', '_thumb.jpeg'),
      `thumbnails/${originalPath}`
    ]
    
    // Try to get thumbnail first
    for (const thumbnailPath of thumbnailPaths) {
      try {
        const thumbnailUrl = await getImageUrl(thumbnailPath)
        if (thumbnailUrl) {
          return thumbnailUrl
        }
      } catch (error) {
        // Continue to next path
      }
    }
    
    // Fallback to original image
    return await getImageUrl(originalPath)
  } catch (error) {
    console.error('Error getting thumbnail URL:', error)
    return null
  }
}

/**
 * Get farm images for background or display
 */
export async function getFarmImages(farmId: string): Promise<string[]> {
  try {
    const possiblePaths = [
      `farms/${farmId}`,
      `farm-photos/${farmId}`,
      `images/farms/${farmId}`
    ]

    const urls: string[] = []
    
    for (const basePath of possiblePaths) {
      try {
        const folderRef = ref(storage, basePath)
        const result = await listAll(folderRef)
        
        const urlPromises = result.items.map(async (itemRef) => {
          try {
            return await getDownloadURL(itemRef)
          } catch (error) {
            return null
          }
        })
        
        const folderUrls = await Promise.all(urlPromises)
        urls.push(...folderUrls.filter((url): url is string => url !== null))
      } catch (error) {
        console.debug(`No images found in farm path: ${basePath}`)
      }
    }
    
    return urls
  } catch (error) {
    console.error('Error getting farm images:', error)
    return []
  }
}

/**
 * Check if a storage path exists
 */
export async function checkStoragePathExists(path: string): Promise<boolean> {
  try {
    const pathRef = ref(storage, path)
    await getDownloadURL(pathRef)
    return true
  } catch (error) {
    return false
  }
}