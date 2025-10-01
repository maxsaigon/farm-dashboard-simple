import { storage } from './firebase'
import { ref, getDownloadURL, listAll, StorageReference, uploadBytes, UploadResult } from 'firebase/storage'

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
 * Get all images for a specific tree using correct Firebase Storage structure
 * Path: farms/{farmId}/trees/{treeId}/photos/{photoId}/
 */
export async function getTreeImages(treeId: string, farmId?: string): Promise<string[]> {
   try {
     const urls: string[] = []
     console.log('🔍 Storage: Getting tree images for treeId:', treeId, 'farmId:', farmId)

     if (farmId) {
       // Use correct path structure: farms/{farmId}/trees/{treeId}/photos/
       try {
         const treePath = `farms/${farmId}/trees/${treeId}/photos`
         console.log('📁 Storage: Looking in path:', treePath)
         const treeRef = ref(storage, treePath)
         const result = await listAll(treeRef)
         console.log('📁 Storage: Found', result.prefixes.length, 'photo folders')

         // For each photo folder, get only the best quality image (one per photoID)
         for (const photoFolder of result.prefixes) {
           console.log('📁 Storage: Processing photo folder:', photoFolder.name)
           const photoResult = await listAll(photoFolder)
           console.log('  Found', photoResult.items.length, 'files in folder')

           // Priority order: compressed.jpg > ai_ready.jpg > thumbnail.jpg > any other image
           const priorityOrder = ['compressed.jpg', 'ai_ready.jpg', 'thumbnail.jpg']
           let selectedUrl: string | null = null

           // First, try to find images in priority order
           for (const priority of priorityOrder) {
             const matchingItem = photoResult.items.find(item =>
               item.name.toLowerCase() === priority
             )
             if (matchingItem) {
               console.log('  Found priority file:', matchingItem.name)
               try {
                 selectedUrl = await getDownloadURL(matchingItem)
                 console.log('  Got URL:', selectedUrl)
                 break
               } catch (error) {
                 console.error(`Error getting URL for ${matchingItem.fullPath}:`, error)
               }
             }
           }

           // If no priority image found, take the first available image
           if (!selectedUrl && photoResult.items.length > 0) {
             console.log('  No priority file found, trying first available')
             for (const itemRef of photoResult.items) {
               try {
                 selectedUrl = await getDownloadURL(itemRef)
                 console.log('  Got URL from first available:', selectedUrl)
                 break
               } catch (error) {
                 console.error(`Error getting URL for ${itemRef.fullPath}:`, error)
               }
             }
           }

           if (selectedUrl) {
             console.log('  Adding URL to results:', selectedUrl)
             urls.push(selectedUrl)
           } else {
             console.log('  No valid URL found for this photo folder')
           }
         }
         console.log('📁 Storage: Total URLs from correct path:', urls.length)
       } catch (error) {
         console.debug(`No images found in farms/${farmId}/trees/${treeId}/photos`)
       }
     }
    
    // Fallback to legacy path patterns if farmId not provided or no images found
    if (urls.length === 0) {
      const legacyPaths = [
        `trees/${treeId}`,
        `photos/${treeId}`,
        `tree-photos/${treeId}`,
        `images/trees/${treeId}`,
      ]

      for (const basePath of legacyPaths) {
        try {
          const folderRef = ref(storage, basePath)
          const result = await listAll(folderRef)
          
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
          console.debug(`No images found in path: ${basePath}`)
        }
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
export async function getTreeImagesByPattern(treeId: string, qrCode?: string, farmId?: string): Promise<{
   general: string[]
   health: string[]
   fruitCount: string[]
 }> {
   try {
     console.log('🔍 Storage: Getting images by pattern for treeId:', treeId, 'qrCode:', qrCode, 'farmId:', farmId)

     const allImages = await getTreeImages(treeId, farmId)
     console.log('📁 Storage: Images from treeId:', allImages.length, 'images')

     // If we have QR code, also try to find images by QR code pattern
     if (qrCode) {
       console.log('🔍 Storage: Also searching by QR code:', qrCode)
       const qrImages = await getTreeImages(qrCode, farmId)
       console.log('📁 Storage: Images from QR code:', qrImages.length, 'images')

       // Check for duplicates before adding
       const existingUrls = new Set(allImages)
       const newQrImages = qrImages.filter(url => !existingUrls.has(url))
       console.log('📁 Storage: New QR images after deduplication:', newQrImages.length, 'images')

       allImages.push(...newQrImages)
     }

     console.log('📁 Storage: Total combined images before categorization:', allImages.length)

     // Categorize images based on filename patterns
     const categorized = {
       general: [] as string[],
       health: [] as string[],
       fruitCount: [] as string[]
     }

     allImages.forEach((url, index) => {
       const filename = url.split('/').pop()?.toLowerCase() || ''
       console.log(`  Image ${index}: ${filename} -> category: ${
         filename.includes('health') || filename.includes('disease') ? 'health' :
         filename.includes('fruit') || filename.includes('count') ? 'fruitCount' : 'general'
       }`)

       if (filename.includes('health') || filename.includes('disease')) {
         categorized.health.push(url)
       } else if (filename.includes('fruit') || filename.includes('count')) {
         categorized.fruitCount.push(url)
       } else {
         categorized.general.push(url)
       }
     })

     console.log('📊 Storage: Final categorization:')
     console.log('  General:', categorized.general.length)
     console.log('  Health:', categorized.health.length)
     console.log('  FruitCount:', categorized.fruitCount.length)

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

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

/**
 * Upload multiple files to Firebase Storage
 */
export async function uploadFiles(files: File[], basePath: string): Promise<string[]> {
  try {
    const uploadPromises = files.map(async (file, index) => {
      const fileName = `${Date.now()}_${index}_${file.name}`
      const path = `${basePath}/${fileName}`
      return await uploadFile(file, path)
    })

    return await Promise.all(uploadPromises)
  } catch (error) {
    console.error('Error uploading files:', error)
    throw error
  }
}