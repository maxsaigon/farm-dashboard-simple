#!/usr/bin/env node

/**
 * Firebase Setup Helper Script
 * Run this script to quickly set up your Firebase environment variables
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ENV_FILE = '.env.local';

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setupFirebase() {
  console.log('\n🔥 Firebase Setup Helper\n');
  console.log('Please have your Firebase config ready from:');
  console.log('https://console.firebase.google.com/ → Project Settings → Your apps\n');

  try {
    const apiKey = await askQuestion('Enter FIREBASE_API_KEY: ');
    const authDomain = await askQuestion('Enter FIREBASE_AUTH_DOMAIN (your-project.firebaseapp.com): ');
    const projectId = await askQuestion('Enter FIREBASE_PROJECT_ID: ');
    const storageBucket = await askQuestion('Enter FIREBASE_STORAGE_BUCKET (your-project.appspot.com): ');
    const messagingSenderId = await askQuestion('Enter FIREBASE_MESSAGING_SENDER_ID: ');
    const appId = await askQuestion('Enter FIREBASE_APP_ID: ');

    const envContent = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${apiKey}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${authDomain}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${projectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${storageBucket}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId}
NEXT_PUBLIC_FIREBASE_APP_ID=${appId}
`;

    fs.writeFileSync(ENV_FILE, envContent);
    console.log(`\n✅ Successfully created ${ENV_FILE}`);
    console.log('\n🚀 Next steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Enable Authentication and Firestore in Firebase Console');
    console.log('3. Check FIREBASE_SETUP_GUIDE.md for detailed instructions');
    console.log('\n🎉 Your admin system with real Firebase data is ready!');

  } catch (error) {
    console.error('❌ Error setting up Firebase:', error.message);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  setupFirebase();
}

module.exports = { setupFirebase };