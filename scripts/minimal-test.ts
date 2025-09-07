#!/usr/bin/env node

/**
 * Minimal Firebase test to isolate the issue
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

async function minimalTest() {
  try {
    console.log('🔥 Minimal Firebase test...')
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)
    console.log('✅ Firebase initialized')

    // Test 1: Simple string document
    console.log('📝 Test 1: Simple document...')
    await setDoc(doc(db, 'test', 'simple'), {
      message: 'hello'
    })
    console.log('✅ Simple document created')

    // Test 2: Document with number
    console.log('📝 Test 2: Document with number...')
    await setDoc(doc(db, 'test', 'number'), {
      count: 42
    })
    console.log('✅ Number document created')

    // Test 3: Document with boolean
    console.log('📝 Test 3: Document with boolean...')
    await setDoc(doc(db, 'test', 'boolean'), {
      isActive: true
    })
    console.log('✅ Boolean document created')

    // Test 4: Document with Date
    console.log('📝 Test 4: Document with Date...')
    await setDoc(doc(db, 'test', 'date'), {
      timestamp: new Date()
    })
    console.log('✅ Date document created')

    console.log('🎉 All tests passed!')
    return true

  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

// Main execution
async function main() {
  console.log('🧪 Minimal Firebase Test')
  console.log('========================')
  
  const success = await minimalTest()
  
  if (success) {
    console.log('\n✅ Firebase is working correctly!')
    process.exit(0)
  } else {
    console.log('\n❌ Firebase has issues!')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { minimalTest }