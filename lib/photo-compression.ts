/**
 * Photo compression utilities for agricultural app
 * Compresses photos to optimal sizes for different use cases
 */

export interface CompressionOptions {
  maxWidth: number
  maxHeight: number
  quality: number // 0.1 to 1.0
  format: 'jpeg' | 'webp' | 'png'
  maxSizeKB: number
}

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxWidth: 1920,      // HD resolution
  maxHeight: 1080,     // HD resolution  
  quality: 0.8,        // 80% quality
  format: 'jpeg',      // Best compression
  maxSizeKB: 1024      // 1MB limit
}

/**
 * Get optimal compression settings based on photo type
 */
export function getCompressionSettings(photoType: 'general' | 'health' | 'fruit_count'): CompressionOptions {
  switch (photoType) {
    case 'fruit_count':
      // Fruit counting needs higher quality for AI analysis
      return {
        maxWidth: 2048,
        maxHeight: 1536,
        quality: 0.9,
        format: 'jpeg',
        maxSizeKB: 1536 // 1.5MB for AI processing
      }
      
    case 'health':
      // Health photos need good detail for disease detection
      return {
        maxWidth: 1920,
        maxHeight: 1080, 
        quality: 0.85,
        format: 'jpeg',
        maxSizeKB: 1024 // 1MB
      }
      
    case 'general':
      // General photos can be more compressed
      return {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.75,
        format: 'jpeg', 
        maxSizeKB: 512 // 0.5MB
      }
  }
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number, 
  maxWidth: number,
  maxHeight: number
): { width: number, height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight }
  
  // Scale down if too large
  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }
  
  if (height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }
  
  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * Compress canvas to target file size by adjusting quality
 */
async function compressToTargetSize(
  canvas: HTMLCanvasElement,
  options: CompressionOptions,
  originalFileName: string
): Promise<File> {
  let quality = options.quality
  let blob: Blob | null = null
  let bestBlob: Blob | null = null
  let attempts = 0
  
  console.log(`📸 Starting compression with target: ${options.maxSizeKB}KB`)
  
  // Try decreasing quality until size target is met
  while (attempts < 10) {
    blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, `image/${options.format}`, quality)
    })
    
    if (!blob) throw new Error('Failed to compress image')
    
    const sizeKB = blob.size / 1024
    console.log(`📸 Attempt ${attempts + 1}: ${sizeKB.toFixed(1)}KB at ${(quality * 100).toFixed(0)}% quality`)
    
    // Always keep the best result so far
    if (!bestBlob || blob.size < bestBlob.size) {
      bestBlob = blob
    }
    
    // Success if size is acceptable
    if (sizeKB <= options.maxSizeKB || quality <= 0.1) {
      break
    }
    
    // Reduce quality for next attempt
    quality = Math.max(0.1, quality - 0.1)
    attempts++
  }
  
  if (!bestBlob) throw new Error('Failed to compress image')
  
  // Convert blob to File
  const extension = options.format === 'jpeg' ? 'jpg' : options.format
  const baseName = originalFileName.split('.')[0] || 'compressed'
  const fileName = `${baseName}_compressed.${extension}`
  
  const finalSizeKB = bestBlob.size / 1024
  console.log(`📸 Final compressed size: ${finalSizeKB.toFixed(1)}KB`)
  
  return new File([bestBlob], fileName, { 
    type: `image/${options.format}`,
    lastModified: Date.now()
  })
}

/**
 * Main compression function using Canvas API
 */
export async function compressImage(
  file: File, 
  options: Partial<CompressionOptions> = {}
): Promise<File> {
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options }
  
  console.log(`📸 Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
  
  return new Promise((resolve, reject) => {
    // Only process image files
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'))
      return
    }
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }
    
    img.onload = async () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        const { width, height } = calculateDimensions(
          img.width, 
          img.height, 
          opts.maxWidth, 
          opts.maxHeight
        )
        
        console.log(`📸 Resizing from ${img.width}x${img.height} to ${width}x${height}`)
        
        canvas.width = width
        canvas.height = height
        
        // High quality drawing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        // Compress to target size
        const compressedFile = await compressToTargetSize(canvas, opts, file.name)
        
        const originalSizeMB = file.size / 1024 / 1024
        const compressedSizeMB = compressedFile.size / 1024 / 1024
        const reduction = ((originalSizeMB - compressedSizeMB) / originalSizeMB * 100)
        
        console.log(`📸 Compression complete: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${reduction.toFixed(1)}% reduction)`)
        
        resolve(compressedFile)
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Quick compression with smart defaults
 */
export async function compressImageSmart(
  file: File,
  photoType: 'general' | 'health' | 'fruit_count'
): Promise<File> {
  const settings = getCompressionSettings(photoType)
  return compressImage(file, settings)
}

/**
 * Check if compression is needed (file size check)
 */
export function needsCompression(file: File, maxSizeKB: number = 1024): boolean {
  const sizeKB = file.size / 1024
  return sizeKB > maxSizeKB
}

/**
 * Get compression info without actually compressing
 */
export function getCompressionInfo(file: File, photoType: 'general' | 'health' | 'fruit_count') {
  const settings = getCompressionSettings(photoType)
  const currentSizeKB = file.size / 1024
  const targetSizeKB = settings.maxSizeKB
  const needsCompression = currentSizeKB > targetSizeKB
  
  return {
    currentSizeKB: Math.round(currentSizeKB),
    targetSizeKB,
    needsCompression,
    estimatedReduction: needsCompression ? Math.round((currentSizeKB - targetSizeKB) / currentSizeKB * 100) : 0
  }
}