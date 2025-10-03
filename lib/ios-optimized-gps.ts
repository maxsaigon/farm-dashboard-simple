'use client'

/**
 * iOS-Optimized GPS Tracking Service
 * 
 * Giải quyết các vấn đề GPS trên iOS Safari:
 * 1. Sử dụng watchPosition thay vì getCurrentPosition trong interval
 * 2. Xử lý permissions đúng cách cho iOS
 * 3. Tối ưu battery và accuracy
 * 4. Fallback strategies cho các trường hợp lỗi
 */

export interface IOSGPSPosition {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number | null
  altitudeAccuracy?: number | null
  heading?: number | null
  speed?: number | null
  timestamp: number
}

export interface IOSGPSOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  distanceFilter?: number // Minimum distance in meters to trigger update
}

export interface IOSGPSCallbacks {
  onSuccess: (position: IOSGPSPosition) => void
  onError: (error: GeolocationPositionError) => void
  onPermissionDenied?: () => void
  onPermissionGranted?: () => void
}

export type IOSGPSPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown'

class IOSOptimizedGPS {
  private watchId: number | null = null
  private isTracking = false
  private lastPosition: IOSGPSPosition | null = null
  private permissionState: IOSGPSPermissionState = 'unknown'
  private callbacks: IOSGPSCallbacks | null = null
  private options: IOSGPSOptions = {}

  // Detect if running on iOS
  private isIOS(): boolean {
    if (typeof window === 'undefined') return false
    
    const userAgent = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }

  // Detect if running in standalone mode (PWA)
  private isStandalone(): boolean {
    if (typeof window === 'undefined') return false
    return (window.navigator as any).standalone === true || 
           window.matchMedia('(display-mode: standalone)').matches
  }

  // Get iOS-optimized options
  private getOptimizedOptions(userOptions: IOSGPSOptions = {}): PositionOptions {
    const isIOS = this.isIOS()
    const isStandalone = this.isStandalone()

    // iOS-specific optimizations
    if (isIOS) {
      return {
        enableHighAccuracy: userOptions.enableHighAccuracy ?? true,
        timeout: userOptions.timeout ?? 5000, // Shorter timeout for iOS
        maximumAge: userOptions.maximumAge ?? 0 // Always get fresh position on iOS
      }
    }

    // Standard options for other platforms
    return {
      enableHighAccuracy: userOptions.enableHighAccuracy ?? true,
      timeout: userOptions.timeout ?? 10000,
      maximumAge: userOptions.maximumAge ?? 5000
    }
  }

  // Check if geolocation is supported
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator
  }

  // Request permission (iOS-compatible way)
  async requestPermission(): Promise<IOSGPSPermissionState> {
    if (!this.isSupported()) {
      this.permissionState = 'denied'
      return 'denied'
    }

    try {
      // iOS doesn't support permissions.query() properly
      // We need to actually request location to check permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false, // Use low accuracy for permission check
            timeout: 10000,
            maximumAge: 60000 // Can use cached position for permission check
          }
        )
      })

      this.permissionState = 'granted'
      console.log('✅ GPS Permission granted')
      return 'granted'

    } catch (error: any) {
      if (error.code === 1) { // PERMISSION_DENIED
        this.permissionState = 'denied'
        console.log('❌ GPS Permission denied')
        return 'denied'
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        this.permissionState = 'prompt'
        console.log('⚠️ GPS Position unavailable')
        return 'prompt'
      } else if (error.code === 3) { // TIMEOUT
        this.permissionState = 'prompt'
        console.log('⏱️ GPS Timeout')
        return 'prompt'
      }
      
      this.permissionState = 'unknown'
      return 'unknown'
    }
  }

  // Check current permission state (best effort on iOS)
  async checkPermission(): Promise<IOSGPSPermissionState> {
    if (!this.isSupported()) {
      return 'denied'
    }

    // Try to use Permissions API if available (not on iOS Safari)
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        this.permissionState = result.state as IOSGPSPermissionState
        return result.state as IOSGPSPermissionState
      } catch (e) {
        // Permissions API not available, fall through
      }
    }

    // For iOS, we can't check without requesting
    return this.permissionState
  }

  // Start tracking with watchPosition (iOS-optimized)
  async startTracking(callbacks: IOSGPSCallbacks, options: IOSGPSOptions = {}): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported')
    }

    if (this.isTracking) {
      console.log('⚠️ Already tracking, stopping previous session')
      this.stopTracking()
    }

    this.callbacks = callbacks
    this.options = options

    // Request permission first
    const permission = await this.requestPermission()
    
    if (permission === 'denied') {
      callbacks.onPermissionDenied?.()
      throw new Error('Location permission denied')
    }

    if (permission === 'granted') {
      callbacks.onPermissionGranted?.()
    }

    const positionOptions = this.getOptimizedOptions(options)

    console.log('🚀 Starting GPS tracking with options:', positionOptions)

    // Use watchPosition for continuous tracking
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleSuccess(position),
      (error) => this.handleError(error),
      positionOptions
    )

    this.isTracking = true
    console.log('✅ GPS tracking started, watchId:', this.watchId)
  }

  // Stop tracking
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
      console.log('🛑 GPS tracking stopped')
    }
    
    this.isTracking = false
    this.callbacks = null
    this.lastPosition = null
  }

  // Handle successful position update
  private handleSuccess(position: GeolocationPosition): void {
    const newPosition: IOSGPSPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    }

    // Apply distance filter if specified
    if (this.options.distanceFilter && this.lastPosition) {
      const distance = this.calculateDistance(this.lastPosition, newPosition)
      if (distance < this.options.distanceFilter) {
        console.log(`📍 Position update skipped (distance: ${distance.toFixed(1)}m < ${this.options.distanceFilter}m)`)
        return
      }
    }

    console.log('📍 GPS Position updated:', {
      lat: newPosition.latitude.toFixed(6),
      lng: newPosition.longitude.toFixed(6),
      accuracy: newPosition.accuracy.toFixed(1) + 'm'
    })

    this.lastPosition = newPosition
    this.callbacks?.onSuccess(newPosition)
  }

  // Handle position error
  private handleError(error: GeolocationPositionError): void {
    console.error('❌ GPS Error:', {
      code: error.code,
      message: error.message,
      type: error.code === 1 ? 'PERMISSION_DENIED' :
            error.code === 2 ? 'POSITION_UNAVAILABLE' :
            error.code === 3 ? 'TIMEOUT' : 'UNKNOWN'
    })

    if (error.code === 1) {
      this.permissionState = 'denied'
      this.callbacks?.onPermissionDenied?.()
    }

    this.callbacks?.onError(error)
  }

  // Calculate distance between two positions (Haversine formula)
  private calculateDistance(pos1: IOSGPSPosition, pos2: IOSGPSPosition): number {
    const R = 6371000 // Earth's radius in meters
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.latitude * Math.PI / 180) * 
              Math.cos(pos2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Get current tracking status
  getStatus() {
    return {
      isTracking: this.isTracking,
      isSupported: this.isSupported(),
      isIOS: this.isIOS(),
      isStandalone: this.isStandalone(),
      permissionState: this.permissionState,
      lastPosition: this.lastPosition,
      watchId: this.watchId
    }
  }

  // Get last known position
  getLastPosition(): IOSGPSPosition | null {
    return this.lastPosition
  }

  // Get single position (one-time request)
  async getCurrentPosition(options: IOSGPSOptions = {}): Promise<IOSGPSPosition> {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported')
    }

    const positionOptions = this.getOptimizedOptions(options)

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsPosition: IOSGPSPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          }
          resolve(gpsPosition)
        },
        (error) => {
          reject(error)
        },
        positionOptions
      )
    })
  }
}

// Export singleton instance
export const iosOptimizedGPS = new IOSOptimizedGPS()

// React Hook for iOS-optimized GPS
export function useIOSOptimizedGPS() {
  return {
    startTracking: (callbacks: IOSGPSCallbacks, options?: IOSGPSOptions) => 
      iosOptimizedGPS.startTracking(callbacks, options),
    stopTracking: () => iosOptimizedGPS.stopTracking(),
    requestPermission: () => iosOptimizedGPS.requestPermission(),
    checkPermission: () => iosOptimizedGPS.checkPermission(),
    getCurrentPosition: (options?: IOSGPSOptions) => iosOptimizedGPS.getCurrentPosition(options),
    getStatus: () => iosOptimizedGPS.getStatus(),
    getLastPosition: () => iosOptimizedGPS.getLastPosition(),
    isSupported: () => iosOptimizedGPS.isSupported()
  }
}