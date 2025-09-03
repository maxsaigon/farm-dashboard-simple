import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'
import { getStorage, FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Validate Firebase configuration
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
]

const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar])
if (missingVars.length > 0) {
  console.error('Missing Firebase environment variables:', missingVars)
}

let app: FirebaseApp
let db: Firestore
let auth: Auth
let storage: FirebaseStorage

try {
  // Prevent multiple Firebase initialization
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
    console.log('Firebase initialized successfully')
  } else {
    app = getApps()[0]
    console.log('Using existing Firebase app')
  }
  
  // Initialize Firebase services with custom settings
  try {
    // Initialize Firestore with specific settings to avoid assertion errors
    db = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: false, // Disable long polling which can cause issues
    })
    console.log('Firestore initialized with custom settings')
  } catch (firestoreError) {
    console.warn('Custom Firestore initialization failed, using default:', firestoreError)
    db = getFirestore(app)
  }
  
  auth = getAuth(app)
  storage = getStorage(app)
  
} catch (error) {
  console.error('Error initializing Firebase:', error)
  throw error
}

export { db, auth, storage }
export default app