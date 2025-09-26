import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore'
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

// Use direct config that we know works
const firebaseConfig = {
  apiKey: "AIzaSyBEMsHC6A6azD2AFrCgW36j2s0H-ZcxrNw",
  authDomain: "lettest-ecom.firebaseapp.com", 
  projectId: "lettest-ecom",
  storageBucket: "lettest-ecom.firebasestorage.app",
  messagingSenderId: "832836231786",
  appId: "1:832836231786:web:bc029ed19ed87ea3f0e013"
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
    // More conservative Firestore initialization to avoid assertion errors
    db = initializeFirestore(app, {
      cacheSizeBytes: 40 * 1024 * 1024, // 40MB instead of unlimited
      experimentalForceLongPolling: false,
      ignoreUndefinedProperties: true, // Help with type safety
    })
  } catch (firestoreError) {
    // Fallback to default getFirestore
    db = getFirestore(app)
  }

  auth = getAuth(app)
  storage = getStorage(app)

} catch (error) {
  throw error
}

export const isDemoConfig = false
export { db, auth, storage }
export default app