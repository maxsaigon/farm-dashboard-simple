#!/usr/bin/env node

/**
 * Manual Super Admin Setup with hardcoded Firebase config
 * Bypasses environment variable issues
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

const SUPER_ADMIN = {
  uid: 'O6aFgoNhDigSIXk6zdYSDrFWhWG2',
  email: 'minhdai.bmt@gmail.com',
  displayName: 'Super Admin'
}

async function setupSuperAdminManual() {
  try {
    console.log('🚀 Manual Super Admin Setup...')
    console.log(`UID: ${SUPER_ADMIN.uid}`)
    console.log(`Email: ${SUPER_ADMIN.email}`)
    console.log(`Project: ${firebaseConfig.projectId}`)
    console.log('')

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)
    console.log('✅ Firebase initialized')

    // 1. Create Enhanced User Profile
    console.log('📝 Creating user profile...')
    const userProfile = {
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
          widgetLayout: ['stats', 'recent-activity', 'quick-actions']
        },
        privacy: {
          profileVisibility: 'private',
          shareActivityData: false,
          allowDataExport: true
        }
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await setDoc(doc(db, 'users', SUPER_ADMIN.uid), userProfile, { merge: true })
    console.log('✅ User profile created')

    // 2. Create Super Admin Role
    console.log('🔐 Creating super admin role...')
    const roleId = `${SUPER_ADMIN.uid}_super_admin_system`
    const superAdminRole = {
      id: roleId,
      userId: SUPER_ADMIN.uid,
      roleType: 'super_admin',
      scopeType: 'system',
      permissions: [
        // System administration
        'system:admin',
        'system:audit', 
        'system:backup',
        // Organization management
        'org:admin',
        'org:settings',
        'org:billing',
        'org:users',
        // Farm management
        'farms:read',
        'farms:write',
        'farms:delete',
        'farms:create',
        // Tree management
        'trees:read',
        'trees:write',
        'trees:delete',
        'trees:bulk',
        // Photo management
        'photos:read',
        'photos:write',
        'photos:delete',
        'photos:bulk',
        // Investment tracking
        'investments:read',
        'investments:write',
        'investments:delete',
        // Zone management
        'zones:read',
        'zones:write',
        'zones:delete',
        // User management
        'users:read',
        'users:invite',
        'users:manage',
        'users:remove',
        // Analytics and reporting
        'analytics:view',
        'analytics:export',
        'reports:generate',
        // API access
        'api:read',
        'api:write',
        'api:manage'
      ],
      grantedBy: SUPER_ADMIN.uid,
      grantedAt: new Date(),
      isActive: true,
      metadata: {
        setupType: 'manual_super_admin',
        setupDate: new Date().toISOString(),
        version: '2.0.0'
      }
    }

    await setDoc(doc(db, 'userRoles', roleId), superAdminRole)
    console.log('✅ Super admin role created')

    // 3. Update Admin Config
    console.log('⚙️ Updating admin configuration...')
    await setDoc(doc(db, 'adminConfig', 'main'), {
      superAdminUsers: [SUPER_ADMIN.uid],
      systemVersion: '2.0.0',
      enhancedRoleSystem: true,
      lastUpdated: new Date(),
      setupBy: SUPER_ADMIN.uid,
      setupMethod: 'manual_script'
    }, { merge: true })
    console.log('✅ Admin configuration updated')

    // 4. Create Activity Log
    console.log('📊 Creating activity log...')
    const activityId = `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await setDoc(doc(db, 'activityLogs', activityId), {
      id: activityId,
      userId: SUPER_ADMIN.uid,
      action: 'super_admin:setup',
      resource: 'user',
      resourceId: SUPER_ADMIN.uid,
      details: {
        roleType: 'super_admin',
        setupType: 'manual_script_setup',
        permissions: superAdminRole.permissions.length,
        roleId: roleId
      },
      timestamp: new Date(),
      status: 'success'
    })
    console.log('✅ Activity logged')

    // 5. Verify Setup
    console.log('🔍 Verifying setup...')
    const userDoc = await getDoc(doc(db, 'users', SUPER_ADMIN.uid))
    const roleDoc = await getDoc(doc(db, 'userRoles', roleId))
    const configDoc = await getDoc(doc(db, 'adminConfig', 'main'))
    
    if (userDoc.exists() && roleDoc.exists() && configDoc.exists()) {
      console.log('✅ Verification passed - all documents created')
      
      const userData = userDoc.data()
      const roleData = roleDoc.data()
      const configData = configDoc.data()
      
      console.log('✅ User account status:', userData.accountStatus)
      console.log('✅ Role permissions count:', roleData.permissions?.length || 0)
      console.log('✅ Admin config includes user:', configData.superAdminUsers?.includes(SUPER_ADMIN.uid))
    } else {
      throw new Error('Verification failed - some documents not found')
    }

    console.log('')
    console.log('🎉 Super Admin setup completed successfully!')
    console.log('')
    console.log('📋 Setup Summary:')
    console.log(`   Super Admin UID: ${SUPER_ADMIN.uid}`)
    console.log(`   Email: ${SUPER_ADMIN.email}`)
    console.log(`   Role ID: ${roleId}`)
    console.log(`   Total Permissions: ${superAdminRole.permissions.length}`)
    console.log(`   Firebase Project: ${firebaseConfig.projectId}`)
    console.log('')
    console.log('🔗 Next Steps:')
    console.log('   1. Login to your app with the email: minhdai.bmt@gmail.com')
    console.log('   2. Navigate to /admin to access the admin panel')
    console.log('   3. Start creating organizations and inviting users')
    console.log('   4. Use the role management tools to assign permissions')
    console.log('')
    console.log('🛡️ Security Note:')
    console.log(`   UID ${SUPER_ADMIN.uid} now has COMPLETE SYSTEM ACCESS`)
    console.log('   This includes all user, organization, and system management')
    console.log('')

    return {
      success: true,
      superAdmin: SUPER_ADMIN,
      roleId: roleId,
      permissions: superAdminRole.permissions.length,
      project: firebaseConfig.projectId
    }

  } catch (error) {
    console.error('❌ Error setting up super admin:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    
    if (error instanceof Error) {
      if (error.message.includes('PERMISSION_DENIED')) {
        console.error('\n💡 Permission denied - check your Firestore security rules')
      } else if (error.message.includes('INVALID_ARGUMENT')) {
        console.error('\n💡 Invalid argument - check data format')
      } else if (error.message.includes('auth/')) {
        console.error('\n💡 Authentication issue - check Firebase config')
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Main execution
async function main() {
  console.log('🔧 Manual Super Admin Setup Tool')
  console.log('=================================')
  console.log('')
  
  const result = await setupSuperAdminManual()
  
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

export { setupSuperAdminManual }