#!/usr/bin/env node

/**
 * Super Admin Verification Script
 * Verifies that the super admin is properly configured in the system
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
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

const ADMIN_UID = 'O6aFgoNhDigSIXk6zdYSDrFWhWG2'

async function verifyAdmin() {
  try {
    console.log('🔍 Verifying Super Admin Setup...')
    console.log(`Checking UID: ${ADMIN_UID}`)
    console.log('')

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    let hasErrors = false
    const results = {
      userProfile: false,
      superAdminRole: false,
      adminConfig: false,
      permissions: 0
    }

    // 1. Check User Profile
    console.log('👤 Checking user profile...')
    const userDoc = await getDoc(doc(db, 'users', ADMIN_UID))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      console.log(`   ✅ User exists: ${userData.email} (${userData.displayName})`)
      console.log(`   ✅ Account Status: ${userData.accountStatus}`)
      console.log(`   ✅ Email Verified: ${userData.isEmailVerified}`)
      results.userProfile = true
    } else {
      console.log('   ❌ User profile not found')
      hasErrors = true
    }

    // 2. Check Super Admin Role
    console.log('\n🔐 Checking super admin role...')
    const roleQuery = query(
      collection(db, 'userRoles'),
      where('userId', '==', ADMIN_UID),
      where('roleType', '==', 'super_admin'),
      where('isActive', '==', true)
    )
    const roleSnapshot = await getDocs(roleQuery)
    
    if (!roleSnapshot.empty) {
      const roleDoc = roleSnapshot.docs[0]
      const roleData = roleDoc.data()
      console.log(`   ✅ Super admin role found: ${roleData.roleType}`)
      console.log(`   ✅ Scope: ${roleData.scopeType}`)
      console.log(`   ✅ Active: ${roleData.isActive}`)
      console.log(`   ✅ Permissions: ${roleData.permissions?.length || 0}`)
      results.superAdminRole = true
      results.permissions = roleData.permissions?.length || 0
    } else {
      console.log('   ❌ Super admin role not found')
      hasErrors = true
    }

    // 3. Check Admin Config
    console.log('\n⚙️ Checking admin configuration...')
    const configDoc = await getDoc(doc(db, 'adminConfig', 'main'))
    if (configDoc.exists()) {
      const configData = configDoc.data()
      if (configData.superAdminUsers?.includes(ADMIN_UID)) {
        console.log('   ✅ Admin config exists and includes user')
        console.log(`   ✅ Enhanced Role System: ${configData.enhancedRoleSystem}`)
        results.adminConfig = true
      } else {
        console.log('   ❌ Admin config exists but user not included')
        hasErrors = true
      }
    } else {
      console.log('   ❌ Admin config not found')
      hasErrors = true
    }

    // 4. Check Activity Logs
    console.log('\n📊 Checking recent activity...')
    const activityQuery = query(
      collection(db, 'activityLogs'),
      where('userId', '==', ADMIN_UID)
    )
    const activitySnapshot = await getDocs(activityQuery)
    console.log(`   ✅ Activity logs found: ${activitySnapshot.size} entries`)

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📋 VERIFICATION SUMMARY')
    console.log('='.repeat(50))
    
    if (!hasErrors) {
      console.log('🎉 ALL CHECKS PASSED!')
      console.log('')
      console.log('✅ Super Admin Status: ACTIVE')
      console.log(`✅ User Profile: ${results.userProfile ? 'EXISTS' : 'MISSING'}`)
      console.log(`✅ Super Admin Role: ${results.superAdminRole ? 'ASSIGNED' : 'MISSING'}`)
      console.log(`✅ Admin Configuration: ${results.adminConfig ? 'CONFIGURED' : 'MISSING'}`)
      console.log(`✅ Total Permissions: ${results.permissions}`)
      console.log('')
      console.log('🚀 Ready to use admin features:')
      console.log('   → Login with your credentials')
      console.log('   → Navigate to /admin')
      console.log('   → Access all administrative functions')
    } else {
      console.log('❌ SETUP INCOMPLETE')
      console.log('')
      console.log('Issues found:')
      if (!results.userProfile) console.log('   ❌ Missing user profile')
      if (!results.superAdminRole) console.log('   ❌ Missing super admin role')
      if (!results.adminConfig) console.log('   ❌ Missing admin configuration')
      console.log('')
      console.log('🔧 To fix: Run the setup script:')
      console.log('   npm run setup:admin')
    }

    console.log('')
    return { success: !hasErrors, results }

  } catch (error) {
    console.error('❌ Verification failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Quick permission check function
async function checkPermissions() {
  try {
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    const roleQuery = query(
      collection(db, 'userRoles'),
      where('userId', '==', ADMIN_UID),
      where('isActive', '==', true)
    )
    
    const snapshot = await getDocs(roleQuery)
    const allPermissions = new Set<string>()
    
    snapshot.forEach(doc => {
      const permissions = doc.data().permissions || []
      permissions.forEach((p: string) => allPermissions.add(p))
    })

    console.log('\n🔑 Current Permissions:')
    console.log('='.repeat(30))
    
    const permissionGroups = {
      'System': ['system:admin', 'system:audit', 'system:backup'],
      'Organization': ['org:admin', 'org:settings', 'org:billing', 'org:users'],
      'Farm': ['farms:read', 'farms:write', 'farms:delete', 'farms:create'],
      'User': ['users:read', 'users:invite', 'users:manage', 'users:remove'],
      'Tree': ['trees:read', 'trees:write', 'trees:delete', 'trees:bulk'],
      'Photo': ['photos:read', 'photos:write', 'photos:delete', 'photos:bulk'],
      'Analytics': ['analytics:view', 'analytics:export', 'reports:generate'],
      'API': ['api:read', 'api:write', 'api:manage']
    }

    Object.entries(permissionGroups).forEach(([group, perms]) => {
      const hasPerms = perms.filter(p => allPermissions.has(p))
      const status = hasPerms.length === perms.length ? '✅' : '⚠️'
      console.log(`${status} ${group}: ${hasPerms.length}/${perms.length}`)
    })

    console.log(`\nTotal: ${allPermissions.size} permissions`)
    
  } catch (error) {
    console.error('Error checking permissions:', error)
  }
}

// Main execution
async function main() {
  console.log('🛡️ Super Admin Verification Tool')
  console.log('================================')
  
  const result = await verifyAdmin()
  
  if (result.success) {
    await checkPermissions()
    console.log('\n✅ Verification completed successfully!')
    process.exit(0)
  } else {
    console.log('\n❌ Verification failed!')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { verifyAdmin, checkPermissions }