'use client'

import { getWebSocketService } from './websocket-service'

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number | null
  heading?: number | null
  speed?: number | null
  timestamp: number
}

interface GeolocationOptions {
  enableHighAccuracy: boolean
  timeout: number
  maximumAge: number
  distanceFilter: number // Minimum distance in meters to trigger update
  updateInterval: number // Minimum time in ms between updates
}

interface BackgroundLocationConfig {
  farmId: string
  userId?: string
  options: GeolocationOptions
  onLocationUpdate?: (location: LocationData) => void
  onError?: (error: GeolocationPositionError) => void
}

class BackgroundGeolocationService {
  private watchId: number | null = null
  private config: BackgroundLocationConfig | null = null
  private lastLocation: LocationData | null = null
  private lastUpdateTime = 0
  private isActive = false
  private wsService = getWebSocketService()

  // Default configuration
  private defaultOptions: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 10000,
    distanceFilter: 10, // 10 meters
    updateInterval: 5000 // 5 seconds
  }

  startTracking(config: BackgroundLocationConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      if (this.isActive) {
        this.stopTracking()
      }

      this.config = { ...config, options: { ...this.defaultOptions, ...config.options } }
      this.isActive = true

      console.log('📍 Starting background geolocation tracking:', this.config)

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.handleLocationUpdate(position)
          resolve()
        },
        (error) => {
          console.error('Background geolocation error:', error)
          this.config?.onError?.(error)
          reject(error)
        },
        this.config.options
      )
    })
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    this.isActive = false
    this.config = null
    this.lastLocation = null
    this.lastUpdateTime = 0
    console.log('📍 Stopped background geolocation tracking')
  }

  private handleLocationUpdate(position: GeolocationPosition): void {
    const now = Date.now()
    const location: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: now
    }

    // Check distance filter
    if (this.lastLocation && this.config?.options.distanceFilter) {
      const distance = this.calculateDistance(this.lastLocation, location)
      if (distance < this.config.options.distanceFilter) {
        return // Skip update if distance is too small
      }
    }

    // Check time interval
    if (this.config?.options.updateInterval &&
        (now - this.lastUpdateTime) < this.config.options.updateInterval) {
      return // Skip update if too soon
    }

    this.lastLocation = location
    this.lastUpdateTime = now

    // Send to WebSocket
    if (this.config) {
      this.wsService.sendLocation({
        userId: this.config.userId || 'anonymous',
        farmId: this.config.farmId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading || undefined,
        speed: location.speed || undefined,
        timestamp: location.timestamp
      })
    }

    // Call callback if provided
    this.config?.onLocationUpdate?.(location)

    console.log('📍 Background location update:', location)
  }

  private calculateDistance(loc1: LocationData, loc2: LocationData): number {
    const R = 6371000 // Earth's radius in meters
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c // Distance in meters
  }

  // Get current status
  getStatus() {
    return {
      isActive: this.isActive,
      lastLocation: this.lastLocation,
      lastUpdateTime: this.lastUpdateTime,
      config: this.config
    }
  }

  // Update configuration while running
  updateConfig(updates: Partial<BackgroundLocationConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...updates }
      console.log('📍 Updated background geolocation config:', updates)
    }
  }
}

// Singleton instance
let bgLocationService: BackgroundGeolocationService | null = null

export const getBackgroundGeolocationService = (): BackgroundGeolocationService => {
  if (!bgLocationService) {
    bgLocationService = new BackgroundGeolocationService()
  }
  return bgLocationService
}

// React hook for background geolocation
export const useBackgroundGeolocation = () => {
  const service = getBackgroundGeolocationService()

  return {
    startTracking: (config: BackgroundLocationConfig) => service.startTracking(config),
    stopTracking: () => service.stopTracking(),
    updateConfig: (updates: Partial<BackgroundLocationConfig>) => service.updateConfig(updates),
    getStatus: () => service.getStatus(),
    isActive: service.getStatus().isActive
  }
}

// Service Worker for background geolocation (when app is not active)
export const registerBackgroundLocationWorker = () => {
  if ('serviceWorker' in navigator && 'geolocation' in navigator) {
    navigator.serviceWorker.register('/background-location-worker.js')
      .then(registration => {
        console.log('📍 Background location worker registered:', registration.scope)
      })
      .catch(error => {
        console.error('📍 Background location worker registration failed:', error)
      })
  }
}

// Background location worker script (to be placed in public/background-location-worker.js)
export const createBackgroundLocationWorkerScript = (): string => {
  return `
self.addEventListener('install', event => {
  console.log('Background location worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  console.log('Background location worker activated')
  event.waitUntil(clients.claim())
})

// Handle background location updates
self.addEventListener('message', event => {
  if (event.data.type === 'START_BACKGROUND_LOCATION') {
    startBackgroundTracking(event.data.config)
  } else if (event.data.type === 'STOP_BACKGROUND_LOCATION') {
    stopBackgroundTracking()
  }
})

let backgroundWatchId = null

function startBackgroundTracking(config) {
  if (backgroundWatchId) {
    navigator.geolocation.clearWatch(backgroundWatchId)
  }

  backgroundWatchId = navigator.geolocation.watchPosition(
    position => {
      // Send location to main thread
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'BACKGROUND_LOCATION_UPDATE',
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now()
            }
          })
        })
      })
    },
    error => {
      console.error('Background location error:', error)
    },
    config.options || {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 10000
    }
  )
}

function stopBackgroundTracking() {
  if (backgroundWatchId) {
    navigator.geolocation.clearWatch(backgroundWatchId)
    backgroundWatchId = null
  }
}
`
}