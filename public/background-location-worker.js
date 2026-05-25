self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
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
      // Background location error
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
