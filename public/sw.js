// Farm Manager Service Worker
const CACHE_NAME = 'farm-manager-v1.0.0'
const STATIC_CACHE_NAME = 'farm-manager-static-v1.0.0'
const DYNAMIC_CACHE_NAME = 'farm-manager-dynamic-v1.0.0'
const IMAGE_CACHE_NAME = 'farm-manager-images-v1.0.0'

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login',
  '/trees',
  '/dashboard',
  '/photos',
  '/manifest.json',
  '/favicon.ico'
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/trees/,
  /\/api\/photos/,
  /\/api\/farms/,
  /\/api\/user/
]

// Image patterns to cache
const IMAGE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg)$/i,
  /\/photos\//,
  /\/images\//,
  /\/icons\//
]

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== IMAGE_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') return
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return
  
  // Handle different types of requests
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request))
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request))
  } else {
    event.respondWith(handleStaticRequest(request))
  }
})

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      console.log('[SW] Serving cached image:', request.url)
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      console.log('[SW] Caching new image:', request.url)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Image request failed:', error)
    return new Response('Image not available offline', { status: 404 })
  }
}

// Handle API requests with network-first, then cache
async function handleAPIRequest(request) {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 5000)
      )
    ])
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
      console.log('[SW] API response cached:', request.url)
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url)
    
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      // Add offline indicator to response
      const offlineResponse = cachedResponse.clone()
      return addOfflineHeader(offlineResponse)
    }
    
    // Return offline fallback for API requests
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This data is not available offline',
      offline: true
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline': 'true'
      }
    })
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log('[SW] Navigation request failed, serving offline page')
    
    const cache = await caches.open(STATIC_CACHE_NAME)
    const offlinePage = await cache.match('/') || 
                        await cache.match('/login') ||
                        new Response('Offline - Please check your connection', {
                          status: 503,
                          headers: { 'Content-Type': 'text/html' }
                        })
    
    return offlinePage
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Static request failed:', error)
    return new Response('Resource not available offline', { status: 404 })
  }
}

// Helper functions
function isImageRequest(request) {
  return IMAGE_PATTERNS.some(pattern => pattern.test(request.url)) ||
         request.destination === 'image'
}

function isAPIRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url)) ||
         request.url.includes('/api/')
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'))
}

function addOfflineHeader(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Offline', 'true')
  headers.set('X-Cache-Source', 'service-worker')
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  })
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'photo-upload') {
    event.waitUntil(syncPhotos())
  } else if (event.tag === 'tree-update') {
    event.waitUntil(syncTreeUpdates())
  }
})

// Sync offline photos
async function syncPhotos() {
  try {
    const offlinePhotos = await getOfflineData('photos')
    
    for (const photo of offlinePhotos) {
      try {
        const response = await fetch('/api/photos', {
          method: 'POST',
          body: photo.formData
        })
        
        if (response.ok) {
          await removeOfflineData('photos', photo.id)
          console.log('[SW] Photo synced successfully:', photo.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync photo:', photo.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Photo sync failed:', error)
  }
}

// Sync offline tree updates
async function syncTreeUpdates() {
  try {
    const offlineUpdates = await getOfflineData('trees')
    
    for (const update of offlineUpdates) {
      try {
        const response = await fetch(`/api/trees/${update.treeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(update.data)
        })
        
        if (response.ok) {
          await removeOfflineData('trees', update.id)
          console.log('[SW] Tree update synced:', update.treeId)
        }
      } catch (error) {
        console.error('[SW] Failed to sync tree update:', update.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Tree sync failed:', error)
  }
}

// IndexedDB helpers for offline data
async function getOfflineData(type) {
  // Implementation would use IndexedDB to store/retrieve offline data
  return []
}

async function removeOfflineData(type, id) {
  // Implementation would remove synced data from IndexedDB
  console.log(`[SW] Removing offline ${type} data:`, id)
}

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) return
  
  try {
    const data = event.data.json()
    console.log('[SW] Push notification received:', data)
    
    const options = {
      body: data.body || 'Farm Manager notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'farm-manager',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'Xem',
          icon: '/icons/view-action.png'
        },
        {
          action: 'dismiss',
          title: 'Bỏ qua',
          icon: '/icons/dismiss-action.png'
        }
      ],
      requireInteraction: data.urgent || false
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Farm Manager', options)
    )
  } catch (error) {
    console.error('[SW] Push notification error:', error)
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification.data)
  
  event.notification.close()
  
  if (event.action === 'view') {
    const url = event.notification.data.url || '/'
    event.waitUntil(
      clients.openWindow(url)
    )
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})