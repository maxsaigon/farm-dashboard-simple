// GPS Tracking and Zone Boundary Service
import { db } from './firebase'
import { 
  doc, 
  collection, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore'

export interface GPSCoordinate {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
  timestamp: Date
}

export interface LocationUpdate {
  id: string
  userId: string
  farmId: string
  coordinate: GPSCoordinate
  zoneId?: string
  isInsideAnyZone: boolean
  nearbyTreeIds: string[]
  batteryLevel?: number
  isOnline: boolean
  metadata: {
    deviceInfo?: string
    appVersion?: string
    connectionType?: string
  }
}

export interface Zone {
  id: string
  name: string
  boundaries: Array<{ lat: number; lng: number }>
  farmId: string
  isActive: boolean
  alertOnEntry: boolean
  alertOnExit: boolean
  allowedUserIds?: string[]
  metadata: {
    soilType?: string
    drainageLevel?: string
    area: number
    perimeter: number
  }
}

export interface GeofenceEvent {
  id: string
  userId: string
  zoneId: string
  eventType: 'enter' | 'exit' | 'dwell'
  timestamp: Date
  coordinate: GPSCoordinate
  duration?: number // for dwell events
  metadata?: Record<string, any>
}

export interface TrackingSession {
  id: string
  userId: string
  farmId: string
  startTime: Date
  endTime?: Date
  totalDistance: number
  averageAccuracy: number
  locationCount: number
  zonesVisited: string[]
  isActive: boolean
}

export class GPSTrackingService {
  private watchId: number | null = null
  private currentSession: TrackingSession | null = null
  private locationBuffer: GPSCoordinate[] = []
  private zones: Zone[] = []
  private lastKnownZone: string | null = null
  private isClient: boolean = false
  
  // Real-time listeners
  private locationListeners: Set<(location: LocationUpdate) => void> = new Set()
  private geofenceListeners: Set<(event: GeofenceEvent) => void> = new Set()
  private sessionListeners: Set<(session: TrackingSession) => void> = new Set()

  // Configuration
  private config = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000,
    minAccuracy: 50, // meters
    minDistance: 5, // minimum distance to log new location
    bufferSize: 10, // number of locations to keep in memory
    geofenceBuffer: 10, // meters buffer for zone boundary detection
    dwellTime: 300000, // 5 minutes in milliseconds
    batchUploadSize: 5,
    offlineStorageLimit: 1000
  }

  constructor() {
    this.isClient = typeof window !== 'undefined'
    if (this.isClient) {
      this.loadZones()
      this.setupOfflineSync()
    }
  }

  // Start GPS tracking
  async startTracking(userId: string, farmId: string): Promise<TrackingSession> {
    if (!this.isClient) {
      throw new Error('GPS tracking is only available in the browser')
    }
    
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser')
      }

      // Request permission
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      if (permission.state === 'denied') {
        throw new Error('Location permission denied')
      }

      // Create new tracking session
      const session: TrackingSession = {
        id: `session_${Date.now()}_${userId}`,
        userId,
        farmId,
        startTime: new Date(),
        totalDistance: 0,
        averageAccuracy: 0,
        locationCount: 0,
        zonesVisited: [],
        isActive: true
      }

      // Start watching position
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position, session),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge
        }
      )

      // Save session to Firebase
      await setDoc(doc(db, 'trackingSessions', session.id), {
        ...session,
        startTime: serverTimestamp()
      })

      this.currentSession = session
      this.notifySessionListeners(session)

      return session

    } catch (error) {
      throw error
    }
  }

  // Stop GPS tracking
  async stopTracking(): Promise<TrackingSession | null> {
    if (!this.isClient || !this.currentSession || this.watchId === null) {
      return null
    }

    try {
      // Stop watching position
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null

      // Update session
      const endTime = new Date()
      const updatedSession: TrackingSession = {
        ...this.currentSession,
        endTime,
        isActive: false
      }

      // Save final session state
      await updateDoc(doc(db, 'trackingSessions', this.currentSession.id), {
        endTime: serverTimestamp(),
        totalDistance: updatedSession.totalDistance,
        averageAccuracy: updatedSession.averageAccuracy,
        locationCount: updatedSession.locationCount,
        zonesVisited: updatedSession.zonesVisited,
        isActive: false
      })

      // Upload any remaining buffered locations
      await this.uploadLocationBuffer()

      const completedSession = updatedSession
      this.currentSession = null
      this.notifySessionListeners(completedSession)

      return completedSession

    } catch (error) {
      throw error
    }
  }

  // Handle location updates from GPS
  private async handleLocationUpdate(position: GeolocationPosition, session: TrackingSession) {
    try {
      const coordinate: GPSCoordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined,
        timestamp: new Date(position.timestamp)
      }

      // Check accuracy threshold
      if (coordinate.accuracy > this.config.minAccuracy) {
        return
      }

      // Check minimum distance from last location
      if (this.locationBuffer.length > 0) {
        const lastLocation = this.locationBuffer[this.locationBuffer.length - 1]
        const distance = this.calculateDistance(lastLocation, coordinate)

        if (distance < this.config.minDistance) {
          return
        }

        // Update total distance
        session.totalDistance += distance
      }

      // Add to buffer
      this.locationBuffer.push(coordinate)
      if (this.locationBuffer.length > this.config.bufferSize) {
        this.locationBuffer.shift()
      }

      // Check which zone we're in
      const currentZone = this.findContainingZone(coordinate)
      const zoneId = currentZone?.id

      // Detect zone transitions
      if (zoneId !== this.lastKnownZone) {
        await this.handleZoneTransition(coordinate, this.lastKnownZone || null, zoneId || null, session.userId)
        this.lastKnownZone = zoneId || null
      }

      // Find nearby trees
      const nearbyTreeIds = await this.findNearbyTrees(coordinate, 50) // within 50 meters

      // Create location update
      const locationUpdate: LocationUpdate = {
        id: `loc_${Date.now()}_${session.userId}`,
        userId: session.userId,
        farmId: session.farmId,
        coordinate,
        zoneId,
        isInsideAnyZone: !!zoneId,
        nearbyTreeIds,
        batteryLevel: await this.getBatteryLevel(),
        isOnline: this.isClient ? navigator.onLine : false,
        metadata: {
          deviceInfo: this.isClient ? navigator.userAgent : 'Server',
          appVersion: '1.0.0',
          connectionType: await this.getConnectionType()
        }
      }

      // Update session statistics
      session.locationCount += 1
      session.averageAccuracy = (session.averageAccuracy * (session.locationCount - 1) + coordinate.accuracy) / session.locationCount
      
      if (zoneId && !session.zonesVisited.includes(zoneId)) {
        session.zonesVisited.push(zoneId)
      }

      // Notify listeners
      this.notifyLocationListeners(locationUpdate)
      this.notifySessionListeners(session)

      // Buffer for batch upload
      await this.bufferLocationUpdate(locationUpdate)

    } catch (error) {
      // Error handling location update
    }
  }

  // Handle location errors
  private handleLocationError(error: GeolocationPositionError) {
    let errorMessage = 'Unknown location error'
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied by user'
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable'
        break
      case error.TIMEOUT:
        errorMessage = 'Location request timed out'
        break
    }

    // Location error
  }

  // Zone boundary detection
  private findContainingZone(coordinate: GPSCoordinate): Zone | null {
    for (const zone of this.zones) {
      if (!zone.isActive) continue
      
      if (this.isPointInPolygon(coordinate, zone.boundaries)) {
        return zone
      }
    }
    return null
  }

  // Point-in-polygon algorithm
  private isPointInPolygon(point: GPSCoordinate, polygon: Array<{ lat: number; lng: number }>): boolean {
    const x = point.longitude
    const y = point.latitude
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng
      const yi = polygon[i].lat
      const xj = polygon[j].lng
      const yj = polygon[j].lat

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }

    return inside
  }

  // Handle zone transition events
  private async handleZoneTransition(
    coordinate: GPSCoordinate, 
    fromZoneId: string | null, 
    toZoneId: string | null,
    userId: string
  ) {
    try {
      const events: GeofenceEvent[] = []

      // Exit event
      if (fromZoneId) {
        const exitEvent: GeofenceEvent = {
          id: `exit_${Date.now()}_${userId}`,
          userId,
          zoneId: fromZoneId,
          eventType: 'exit',
          timestamp: new Date(),
          coordinate
        }
        events.push(exitEvent)
      }

      // Enter event
      if (toZoneId) {
        const enterEvent: GeofenceEvent = {
          id: `enter_${Date.now()}_${userId}`,
          userId,
          zoneId: toZoneId,
          eventType: 'enter',
          timestamp: new Date(),
          coordinate
        }
        events.push(enterEvent)
      }

      // Save events and notify listeners
      for (const event of events) {
        await setDoc(doc(db, 'geofenceEvents', event.id), {
          ...event,
          timestamp: serverTimestamp()
        })
        
        this.notifyGeofenceListeners(event)
      }

    } catch (error) {
      // Error handling zone transition
    }
  }

  // Find nearby trees using spatial indexing
  private async findNearbyTrees(coordinate: GPSCoordinate, radiusMeters: number): Promise<string[]> {
    try {
      // In a real implementation, you would use geospatial queries
      // For now, we'll use a simple distance calculation
      const treesRef = collection(db, 'trees')
      const snapshot = await getDocs(query(treesRef, limit(100)))
      
      const nearbyTrees: string[] = []
      
      snapshot.forEach(doc => {
        const treeData = doc.data()
        if (treeData.latitude && treeData.longitude) {
          const distance = this.calculateDistance(coordinate, {
            latitude: treeData.latitude,
            longitude: treeData.longitude,
            accuracy: 0,
            timestamp: new Date()
          })
          
          if (distance <= radiusMeters) {
            nearbyTrees.push(doc.id)
          }
        }
      })

      return nearbyTrees
    } catch (error) {
      return []
    }
  }

  // Calculate distance between two coordinates using Haversine formula
  private calculateDistance(coord1: GPSCoordinate, coord2: GPSCoordinate): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI / 180
    const φ2 = coord2.latitude * Math.PI / 180
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  // Load zones from Firebase
  private async loadZones(): Promise<void> {
    try {
      const zonesRef = collection(db, 'zones')
      const snapshot = await getDocs(query(zonesRef, where('isActive', '==', true)))
      
      this.zones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        metadata: {
          ...doc.data().metadata,
          area: doc.data().metadata?.area || 0,
          perimeter: doc.data().metadata?.perimeter || 0
        }
      } as Zone))
    } catch (error) {
      // Error loading zones
    }
  }

  // Buffer location updates for batch upload
  private locationUpdateBuffer: LocationUpdate[] = []
  
  private async bufferLocationUpdate(update: LocationUpdate): Promise<void> {
    this.locationUpdateBuffer.push(update)
    
    if (this.locationUpdateBuffer.length >= this.config.batchUploadSize) {
      await this.uploadLocationBuffer()
    }
  }

  // Upload buffered locations
  private async uploadLocationBuffer(): Promise<void> {
    if (this.locationUpdateBuffer.length === 0) return

    try {
      const batch = this.locationUpdateBuffer.splice(0, this.config.batchUploadSize)
      
      const uploadPromises = batch.map(update => 
        setDoc(doc(db, 'locationUpdates', update.id), {
          ...update,
          coordinate: {
            ...update.coordinate,
            timestamp: serverTimestamp()
          }
        })
      )

      await Promise.all(uploadPromises)
    } catch (error) {
      // Re-add failed updates to buffer for retry
      this.locationUpdateBuffer.unshift(...this.locationUpdateBuffer.splice(-this.config.batchUploadSize))
    }
  }

  // Utility functions
  private async getBatteryLevel(): Promise<number | undefined> {
    if (!this.isClient) return undefined
    
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery()
        return Math.round(battery.level * 100)
      }
    } catch (error) {
      // Battery API not available
    }
    return undefined
  }

  private async getConnectionType(): Promise<string> {
    if (!this.isClient) return 'unknown'
    
    try {
      if ('connection' in navigator) {
        return (navigator as any).connection.effectiveType || 'unknown'
      }
    } catch (error) {
      // Connection API not available
    }
    return 'unknown'
  }

  // Offline sync setup
  private setupOfflineSync(): void {
    if (!this.isClient) return

    window.addEventListener('online', () => {
      this.uploadLocationBuffer()
    })
  }

  // Listener management
  addLocationListener(callback: (location: LocationUpdate) => void): () => void {
    this.locationListeners.add(callback)
    return () => this.locationListeners.delete(callback)
  }

  addGeofenceListener(callback: (event: GeofenceEvent) => void): () => void {
    this.geofenceListeners.add(callback)
    return () => this.geofenceListeners.delete(callback)
  }

  addSessionListener(callback: (session: TrackingSession) => void): () => void {
    this.sessionListeners.add(callback)
    return () => this.sessionListeners.delete(callback)
  }

  private notifyLocationListeners(location: LocationUpdate): void {
    this.locationListeners.forEach(callback => {
      try {
        callback(location)
      } catch (error) {
        // Location listener error
      }
    })
  }

  private notifyGeofenceListeners(event: GeofenceEvent): void {
    this.geofenceListeners.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        // Geofence listener error
      }
    })
  }

  private notifySessionListeners(session: TrackingSession): void {
    this.sessionListeners.forEach(callback => {
      try {
        callback(session)
      } catch (error) {
        // Session listener error
      }
    })
  }

  // Public API for getting current state
  getCurrentSession(): TrackingSession | null {
    return this.currentSession
  }

  getCurrentLocation(): GPSCoordinate | null {
    return this.locationBuffer.length > 0 ? this.locationBuffer[this.locationBuffer.length - 1] : null
  }

  getCurrentZone(): Zone | null {
    const currentLocation = this.getCurrentLocation()
    return currentLocation ? this.findContainingZone(currentLocation) : null
  }

  getLoadedZones(): Zone[] {
    return this.zones
  }

  isTracking(): boolean {
    return this.watchId !== null && this.currentSession?.isActive === true
  }

  // Configuration
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): typeof this.config {
    return { ...this.config }
  }
}

// Export singleton instance
export const gpsTrackingService = new GPSTrackingService()