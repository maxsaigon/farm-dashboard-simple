#!/usr/bin/env node

/**
 * Super Admin Setup Script for Enhanced Role System
 * Sets up the specified UID as a super admin with full system access
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

// Firebase config - using environment variables or defaults
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Super Admin Configuration
const SUPER_ADMIN = {
  uid: 'O6aFgoNhDigSIXk6zdYSDrFWhWG2',
  email: 'minhdai.bmt@gmail.com', // Update this to your actual email
  displayName: 'Super Admin'
}

// Enhanced User Profile for Super Admin
const createEnhancedUserProfile = () => ({
  uid: SUPER_ADMIN.uid,
  email: SUPER_ADMIN.email,
  displayName: SUPER_ADMIN.displayName,
  language: 'vi-VN',
  timezone: 'Asia/Ho_Chi_Minh',
  loginCount: 0,
  isEmailVerified: true,
  isPhoneVerified: false,
  accountStatus: 'active',
  twoFactorEnabled: false,
  preferences: {
    theme: 'light',
    language: 'vi-VN',
    notifications: {
      email: true,
      push: true,
      sms: false,
      harvestReminders: true,
      healthAlerts: true,
      systemUpdates: true
    },
    dashboard: {
      widgetLayout: ['stats', 'recent-activity', 'quick-actions'],
      chartPreferences: {}
    },
    privacy: {
      profileVisibility: 'private',
      shareActivityData: false,
      allowDataExport: true
    }
  },
  isActive: true
})

// Super Admin Role Definition
const createSuperAdminRole = () => ({
  id: `${SUPER_ADMIN.uid}_super_admin_system`,
  userId: SUPER_ADMIN.uid,
  roleType: 'super_admin',
  scopeType: 'system',
  permissions: [
    // System administration
    'system:admin', 'system:audit', 'system:backup',
    // Organization management
    'org:admin', 'org:settings', 'org:billing', 'org:users',
    // Farm management
    'farms:read', 'farms:write', 'farms:delete', 'farms:create',
    // Tree management
    'trees:read', 'trees:write', 'trees:delete', 'trees:bulk',
    // Photo management
    'photos:read', 'photos:write', 'photos:delete', 'photos:bulk',
    // Investment tracking
    'investments:read', 'investments:write', 'investments:delete',
    // Zone management
    'zones:read', 'zones:write', 'zones:delete',
    // User management
    'users:read', 'users:invite', 'users:manage', 'users:remove',
    // Analytics and reporting
    'analytics:view', 'analytics:export', 'reports:generate',
    // API access
    'api:read', 'api:write', 'api:manage'
  ],
  grantedBy: SUPER_ADMIN.uid,
  isActive: true,
  metadata: {
    setupType: 'initial_super_admin',
    setupDate: new Date().toISOString()
  }
})

async function setupSuperAdmin() {
  try {
    console.log('🚀 Setting up Super Admin for Enhanced Role System...')
    console.log(`UID: ${SUPER_ADMIN.uid}`)
    console.log(`Email: ${SUPER_ADMIN.email}`)
    console.log(`Display Name: ${SUPER_ADMIN.displayName}`)
    console.log('')

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    // 1. Create Enhanced User Profile
    console.log('📝 Creating enhanced user profile...')
    const userProfile = createEnhancedUserProfile()
    await setDoc(doc(db, 'users', SUPER_ADMIN.uid), {
      ...userProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true })
    console.log('✅ Enhanced user profile created')

    // 2. Create Super Admin Role
    console.log('🔐 Creating super admin role...')
    const superAdminRole = createSuperAdminRole()
    await setDoc(doc(db, 'userRoles', superAdminRole.id), {
      ...superAdminRole,
      grantedAt: serverTimestamp()
    })
    console.log('✅ Super admin role created')

    // 3. Create/Update Admin Config
    console.log('⚙️ Updating admin configuration...')
    await setDoc(doc(db, 'adminConfig', 'main'), {
      superAdminUsers: [SUPER_ADMIN.uid],
      systemVersion: '2.0.0',
      enhancedRoleSystem: true,
      lastUpdated: serverTimestamp(),
      setupBy: SUPER_ADMIN.uid
    }, { merge: true })
    console.log('✅ Admin configuration updated')

    // 4. Create Activity Log
    console.log('📊 Logging setup activity...')
    const activityId = `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await setDoc(doc(db, 'activityLogs', activityId), {
      id: activityId,
      userId: SUPER_ADMIN.uid,
      action: 'super_admin:setup',
      resource: 'user',
      resourceId: SUPER_ADMIN.uid,
      details: {
        roleType: 'super_admin',
        setupType: 'initial_system_setup',
        permissions: superAdminRole.permissions.length
      },
      timestamp: serverTimestamp(),
      status: 'success'
    })
    console.log('✅ Activity logged')

    console.log('')
    console.log('🎉 Super Admin setup completed successfully!')
    console.log('')
    console.log('📋 Setup Summary:')
    console.log(`   Super Admin UID: ${SUPER_ADMIN.uid}`)
    console.log(`   Email: ${SUPER_ADMIN.email}`)
    console.log(`   Total Permissions: ${superAdminRole.permissions.length}`)
    console.log(`   Role Scope: System-wide`)
    console.log('')
    console.log('🔗 Next Steps:')
    console.log('   1. Login to your app with the configured email')
    console.log('   2. Navigate to /admin to access the admin panel')
    console.log('   3. Create organizations and invite users')
    console.log('   4. Manage roles and permissions as needed')
    console.log('')
    console.log('🛡️ Security Note:')
    console.log('   This user now has FULL SYSTEM ACCESS including:')
    console.log('   - All user management capabilities')
    console.log('   - Organization creation and management')
    console.log('   - System administration functions')
    console.log('   - Complete audit and backup access')
    console.log('')

    return {
      success: true,
      superAdmin: SUPER_ADMIN,
      roleId: superAdminRole.id,
      permissions: superAdminRole.permissions
    }

  } catch (error) {
    console.error('❌ Error setting up super admin:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Validation function
function validateConfig() {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing)
    console.warn('   Script will continue with hardcoded config if available')
  }
  
  return missing.length === 0
}

// Main execution
async function main() {
  console.log('🔧 Enhanced Super Admin Setup Tool')
  console.log('==================================')
  console.log('')
  
  // Validate configuration
  validateConfig()
  
  const result = await setupSuperAdmin()
  
  if (result.success) {
    console.log('✅ Setup completed successfully!')
    process.exit(0)
  } else {
    console.error('❌ Setup failed:', result.error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { setupSuperAdmin, SUPER_ADMIN }