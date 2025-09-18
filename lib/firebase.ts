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

const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar])
if (missingVars.length > 0) {
  console.warn('Missing Firebase environment variables:', missingVars)
  console.warn('Using fallback demo configuration. Please set up environment variables for production.')
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

export const isDemoConfig = (firebaseConfig.apiKey === fallbackConfig.apiKey) || missingVars.length > 0
export { db, auth, storage }
export default app