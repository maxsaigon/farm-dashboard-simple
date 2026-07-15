// Farm Manager Service Worker
const STATIC_CACHE_NAME = 'farm-manager-static-v3'
const IMAGE_CACHE_NAME = 'farm-manager-images-v3'

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login',
  '/trees',
  '/manifest.json',
  '/icons/favicon.ico',
  '/icons/web-app-manifest-192x192.png',
  '/icons/web-app-manifest-512x512.png'
]

// Image patterns to cache
const IMAGE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i, // Match file extension at end or followed by query params
  /\/photos\//,
  /\/images\//,
  /\/icons\//,
  /firebasestorage\.googleapis\.com/i, // Match Firebase Storage images
  /tile\.openstreetmap\.org/i, // Match OpenStreetMap tiles
  /arcgisonline\.com/i // Match Esri Satellite tiles
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

  // Next.js build assets are content-versioned and must not be served from an
  // old app-shell cache after a deployment or during local hot reload.
  if (url.pathname.startsWith('/_next/')) return

  // Skip Firebase, Firestore, Google Auth, and Google Analytics services
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('securetoken') ||
    url.hostname.includes('google-analytics') ||
    url.hostname.includes('analytics.google')
  ) {
    // Exception: Allow image GET requests from Firebase Storage to be cached
    if (isImageRequest(request)) {
      event.respondWith(handleImageRequest(request))
      return
    }
    return // Let the browser handle these directly without service worker interference
  }
  
  // Handle different types of requests
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request))
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
    
    // Support caching opaque responses (status 0) for cross-origin resources
    if (networkResponse.ok || networkResponse.status === 0) {
      console.log('[SW] Caching new image:', request.url)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Image request failed:', error)
    return new Response('Image not available offline', { status: 404 })
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

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html'))
}

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) return
  
  try {
    const data = event.data.json()
    console.log('[SW] Push notification received:', data)
    
    const options = {
      body: data.body || 'Farm Manager notification',
      icon: '/icons/web-app-manifest-192x192.png',
      badge: '/icons/favicon-96x96.png',
      tag: data.tag || 'farm-manager',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'Xem'
        },
        {
          action: 'dismiss',
          title: 'Bỏ qua'
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

// Listen for messages from client (e.g. SKIP_WAITING)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
