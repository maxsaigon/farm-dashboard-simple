import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'
import { getStorage, FirebaseStorage } from 'firebase/storage'

// Fallback configuration for development
const fallbackConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
}

// Load Firebase configuration dynamically from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackConfig.appId
}

// Validate Firebase configuration
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
]

let app: FirebaseApp
let db: Firestore
let auth: Auth
let storage: FirebaseStorage

try {
  // Prevent multiple Firebase initialization
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }

  // Initialize Firebase services with safer settings for v12+
  try {
    // Enable persistent offline cache using persistentLocalCache & persistentMultipleTabManager
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: 40 * 1024 * 1024 // 40MB cache size
      }),
      experimentalForceLongPolling: false,
      ignoreUndefinedProperties: true, // Help with type safety
    })
  } catch (firestoreError) {
    // Fallback to default getFirestore
    db = getFirestore(app)
  }

  auth = getAuth(app)
  storage = getStorage(app)

  console.log('[Firebase] ✅ Firebase initialized successfully')
  console.log('[Firebase] - App name:', app.name)
  console.log('[Firebase] - Project ID:', firebaseConfig.projectId)
  console.log('[Firebase] - Auth domain:', firebaseConfig.authDomain)

} catch (error) {
  console.error('[Firebase] ❌ Firebase initialization error:', error)
  throw error
}

export const isDemoConfig = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
export { db, auth, storage }
export default app