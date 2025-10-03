# Hướng Dẫn Sử Dụng iOS-Optimized GPS

## 🎯 Quick Start

### 1. Import và Setup

```typescript
import { useIOSOptimizedGPS, IOSGPSPosition } from '@/lib/ios-optimized-gps'
import { useState, useEffect } from 'react'

function MyMapComponent() {
  const gps = useIOSOptimizedGPS()
  const [position, setPosition] = useState<IOSGPSPosition | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Component code here...
}
```

### 2. Start/Stop Tracking

```typescript
const handleStartTracking = async () => {
  try {
    await gps.startTracking({
      onSuccess: (pos) => {
        setPosition(pos)
        setError(null)
        console.log('📍 Position:', pos)
      },
      onError: (err) => {
        setError(err.message)
        console.error('❌ GPS Error:', err)
      },
      onPermissionGranted: () => {
        console.log('✅ Permission granted')
        setIsTracking(true)
      },
      onPermissionDenied: () => {
        console.log('❌ Permission denied')
        setError('Location permission denied')
        setIsTracking(false)
      }
    }, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
      distanceFilter: 10 // Only update if moved 10 meters
    })
  } catch (err: any) {
    setError(err.message)
    setIsTracking(false)
  }
}

const handleStopTracking = () => {
  gps.stopTracking()
  setIsTracking(false)
  setPosition(null)
}
```

### 3. Check Permission Before Tracking

```typescript
const checkAndRequestPermission = async () => {
  const status = await gps.checkPermission()
  
  if (status === 'denied') {
    alert('Location permission denied. Please enable in Settings.')
    return false
  }
  
  if (status === 'prompt' || status === 'unknown') {
    // Will prompt user when startTracking is called
    return true
  }
  
  return true // granted
}
```

### 4. Get Single Position (One-time)

```typescript
const getCurrentLocation = async () => {
  try {
    const pos = await gps.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    })
    
    console.log('Current position:', pos)
    setPosition(pos)
  } catch (err: any) {
    console.error('Failed to get position:', err)
    setError(err.message)
  }
}
```

## 📱 Complete Example Component

```typescript
'use client'

import { useIOSOptimizedGPS, IOSGPSPosition } from '@/lib/ios-optimized-gps'
import { useState, useEffect } from 'react'

export default function GPSTrackingExample() {
  const gps = useIOSOptimizedGPS()
  const [position, setPosition] = useState<IOSGPSPosition | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState(gps.getStatus())

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(gps.getStatus())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const handleStartTracking = async () => {
    try {
      await gps.startTracking({
        onSuccess: (pos) => {
          setPosition(pos)
          setError(null)
        },
        onError: (err) => {
          setError(err.message)
        },
        onPermissionGranted: () => {
          setIsTracking(true)
        },
        onPermissionDenied: () => {
          setError('Location permission denied')
          setIsTracking(false)
        }
      }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
        distanceFilter: 10
      })
    } catch (err: any) {
      setError(err.message)
      setIsTracking(false)
    }
  }

  const handleStopTracking = () => {
    gps.stopTracking()
    setIsTracking(false)
    setPosition(null)
  }

  const handleGetCurrentPosition = async () => {
    try {
      const pos = await gps.getCurrentPosition()
      setPosition(pos)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Status Panel */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-bold mb-2">GPS Status</h3>
        <div className="space-y-1 text-sm">
          <div>Supported: {status.isSupported ? '✅' : '❌'}</div>
          <div>iOS: {status.isIOS ? '✅' : '❌'}</div>
          <div>Standalone: {status.isStandalone ? '✅' : '❌'}</div>
          <div>Tracking: {status.isTracking ? '✅' : '❌'}</div>
          <div>Permission: {status.permissionState}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={isTracking ? handleStopTracking : handleStartTracking}
          className={`px-4 py-2 rounded-lg font-medium ${
            isTracking
              ? 'bg-red-600 text-white'
              : 'bg-green-600 text-white'
          }`}
        >
          {isTracking ? 'Stop Tracking' : 'Start Tracking'}
        </button>
        
        <button
          onClick={handleGetCurrentPosition}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
        >
          Get Current Position
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Position Display */}
      {position && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <h3 className="font-bold text-green-700 mb-2">📍 Current Position</h3>
          <div className="space-y-1 text-sm font-mono">
            <div>Lat: {position.latitude.toFixed(6)}</div>
            <div>Lng: {position.longitude.toFixed(6)}</div>
            <div>Accuracy: ±{position.accuracy.toFixed(1)}m</div>
            {position.altitude && (
              <div>Altitude: {position.altitude.toFixed(1)}m</div>
            )}
            {position.speed && (
              <div>Speed: {(position.speed * 3.6).toFixed(1)} km/h</div>
            )}
            {position.heading && (
              <div>Heading: {position.heading.toFixed(0)}°</div>
            )}
            <div>Time: {new Date(position.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
      )}
    </div>
  )
}
```

## 🗺️ Integration with Leaflet Map

```typescript
'use client'

import { useIOSOptimizedGPS, IOSGPSPosition } from '@/lib/ios-optimized-gps'
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet'
import { useState, useEffect } from 'react'
import L from 'leaflet'

export default function MapWithGPS() {
  const gps = useIOSOptimizedGPS()
  const [position, setPosition] = useState<IOSGPSPosition | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [trackingHistory, setTrackingHistory] = useState<IOSGPSPosition[]>([])

  useEffect(() => {
    if (isTracking) {
      gps.startTracking({
        onSuccess: (pos) => {
          setPosition(pos)
          setTrackingHistory(prev => [...prev, pos].slice(-20)) // Keep last 20 positions
        },
        onError: (err) => {
          console.error('GPS Error:', err)
        }
      }, {
        distanceFilter: 5, // Update every 5 meters
        enableHighAccuracy: true
      })
    } else {
      gps.stopTracking()
    }

    return () => gps.stopTracking()
  }, [isTracking])

  const userIcon = L.divIcon({
    className: 'user-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, #ef4444 30%, rgba(239, 68, 68, 0.3) 70%);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
      "></div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  })

  return (
    <div className="relative w-full h-screen">
      <MapContainer
        center={position ? [position.latitude, position.longitude] : [10.762622, 106.660172]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* User Position Marker */}
        {position && (
          <>
            <Marker
              position={[position.latitude, position.longitude]}
              icon={userIcon}
            />
            
            {/* Accuracy Circle */}
            <Circle
              center={[position.latitude, position.longitude]}
              radius={position.accuracy}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.1,
                weight: 1
              }}
            />
          </>
        )}
      </MapContainer>

      {/* GPS Control Button */}
      <button
        onClick={() => setIsTracking(!isTracking)}
        className={`absolute top-4 left-4 z-[1000] px-4 py-2 rounded-lg font-medium ${
          isTracking
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {isTracking ? '📍 GPS ON' : '📍 GPS OFF'}
      </button>

      {/* Position Info */}
      {position && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 text-sm">
          <div className="font-bold text-red-600">📍 Your Position</div>
          <div className="font-mono text-xs space-y-1">
            <div>{position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</div>
            <div>Accuracy: ±{position.accuracy.toFixed(0)}m</div>
            {position.speed && <div>Speed: {(position.speed * 3.6).toFixed(1)} km/h</div>}
          </div>
        </div>
      )}
    </div>
  )
}
```

## ⚙️ Advanced Configuration

### Battery-Aware Tracking

```typescript
const startBatteryAwareTracking = async () => {
  // Check battery level
  let lowBattery = false
  if ('getBattery' in navigator) {
    const battery = await (navigator as any).getBattery()
    lowBattery = battery.level < 0.2
  }

  await gps.startTracking({
    onSuccess: (pos) => setPosition(pos),
    onError: (err) => setError(err.message)
  }, {
    enableHighAccuracy: !lowBattery, // Disable high accuracy on low battery
    timeout: lowBattery ? 10000 : 5000,
    maximumAge: lowBattery ? 30000 : 0,
    distanceFilter: lowBattery ? 20 : 10 // Larger filter on low battery
  })
}
```

### Adaptive Accuracy

```typescript
const [accuracy, setAccuracy] = useState<'high' | 'medium' | 'low'>('high')

const getOptionsForAccuracy = (level: 'high' | 'medium' | 'low') => {
  switch (level) {
    case 'high':
      return {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
        distanceFilter: 5
      }
    case 'medium':
      return {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
        distanceFilter: 10
      }
    case 'low':
      return {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 30000,
        distanceFilter: 20
      }
  }
}

// Use it
await gps.startTracking(callbacks, getOptionsForAccuracy(accuracy))
```

## 🐛 Debugging

### Enable Verbose Logging

```typescript
const gps = useIOSOptimizedGPS()

// Check status
console.log('GPS Status:', gps.getStatus())

// Test permission
const permission = await gps.checkPermission()
console.log('Permission:', permission)

// Test single position
try {
  const pos = await gps.getCurrentPosition()
  console.log('✅ GPS Works:', pos)
} catch (err) {
  console.error('❌ GPS Failed:', err)
}
```

### iOS Safari Remote Debugging

1. Connect iPhone to Mac
2. Enable Web Inspector on iPhone: Settings → Safari → Advanced → Web Inspector
3. Open Safari on Mac → Develop → [Your iPhone] → [Your Site]
4. Check Console for GPS logs

## 📚 API Reference

### `useIOSOptimizedGPS()`

Returns an object with:

- `startTracking(callbacks, options)` - Start continuous tracking
- `stopTracking()` - Stop tracking
- `getCurrentPosition(options)` - Get single position
- `requestPermission()` - Request location permission
- `checkPermission()` - Check current permission state
- `getStatus()` - Get current GPS status
- `getLastPosition()` - Get last known position
- `isSupported()` - Check if geolocation is supported

### Types

```typescript
interface IOSGPSPosition {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number | null
  altitudeAccuracy?: number | null
  heading?: number | null
  speed?: number | null
  timestamp: number
}

interface IOSGPSOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  distanceFilter?: number
}

interface IOSGPSCallbacks {
  onSuccess: (position: IOSGPSPosition) => void
  onError: (error: GeolocationPositionError) => void
  onPermissionDenied?: () => void
  onPermissionGranted?: () => void
}
```

## ✅ Best Practices

1. **Always handle errors** - GPS can fail for many reasons
2. **Request permission explicitly** - Don't assume it's granted
3. **Use distanceFilter** - Reduce unnecessary updates
4. **Consider battery** - Adjust accuracy based on battery level
5. **Test on real devices** - Simulator behavior differs from real iOS
6. **Provide user feedback** - Show loading states and errors
7. **Clean up on unmount** - Always call `stopTracking()` in cleanup
8. **Use HTTPS** - Geolocation requires secure context