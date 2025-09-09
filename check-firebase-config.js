#!/usr/bin/env node

/**
 * Firebase Configuration Checker
 * Validates that all required Firebase environment variables are set
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

function checkFirebaseConfig() {
  console.log('🔍 Checking Firebase Configuration...\n');

  // Check if .env.local exists
  const envPath = '.env.local';
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found');
    console.log('📝 Please run: node setup-firebase.js');
    return false;
  }

  // Read and parse .env.local
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });

  // Check each required variable
  let allValid = true;
  const results = [];

  REQUIRED_VARS.forEach(varName => {
    const value = envVars[varName];
    const isSet = value && value.length > 0 && !value.includes('your_') && !value.includes('_here');
    
    results.push({
      name: varName,
      isSet,
      value: isSet ? '✓ Set' : '❌ Missing/Empty'
    });

    if (!isSet) allValid = false;
  });

  // Display results
  console.log('Configuration Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  results.forEach(result => {
    console.log(`${result.value.padEnd(12)} ${result.name}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (allValid) {
    console.log('✅ All Firebase environment variables are configured!');
    console.log('🚀 Your admin system should now work with real Firebase data.');
    console.log('\n🔧 Next steps:');
    console.log('1. Restart your dev server if it\'s running');
    console.log('2. Make sure Authentication and Firestore are enabled in Firebase Console');
    console.log('3. Set up security rules (see FIREBASE_SETUP_GUIDE.md)');
    return true;
  } else {
    console.log('⚠️  Some Firebase environment variables are missing.');
    console.log('📝 Please run: node setup-firebase.js');
    console.log('📖 Or manually edit .env.local with your Firebase config');
    return false;
  }
}

if (require.main === module) {
  checkFirebaseConfig();
}

module.exports = { checkFirebaseConfig };