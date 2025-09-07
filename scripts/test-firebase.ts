#!/usr/bin/env node

/**
 * Simple Firebase connection test
 * Tests if we can connect to Firestore and perform basic operations
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

async function testFirebaseConnection() {
  try {
    console.log('🔥 Testing Firebase connection...')
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)
    console.log('✅ Firebase initialized')

    // Test document creation
    const testDocId = `test_${Date.now()}`
    const testData = {
      message: 'Hello from setup script',
      timestamp: serverTimestamp(),
      isTest: true
    }

    console.log('📝 Creating test document...')
    await setDoc(doc(db, 'test', testDocId), testData)
    console.log('✅ Test document created')

    // Test document reading
    console.log('📖 Reading test document...')
    const docSnapshot = await getDoc(doc(db, 'test', testDocId))
    
    if (docSnapshot.exists()) {
      console.log('✅ Test document read successfully')
      console.log('📄 Document data:', docSnapshot.data())
    } else {
      console.log('❌ Test document not found')
      return false
    }

    console.log('🎉 Firebase connection test PASSED!')
    return true

  } catch (error) {
    console.error('❌ Firebase connection test FAILED:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

// Main execution
async function main() {
  console.log('🧪 Firebase Connection Test')
  console.log('===========================')
  
  const success = await testFirebaseConnection()
  
  if (success) {
    console.log('\n✅ All tests passed! Firebase is ready.')
    process.exit(0)
  } else {
    console.log('\n❌ Tests failed! Check your Firebase configuration.')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { testFirebaseConnection }