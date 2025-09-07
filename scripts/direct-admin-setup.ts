#!/usr/bin/env node

/**
 * Direct Super Admin Setup using existing Firebase config
 * Uses the same configuration as the main app
 */

// Import the existing Firebase setup
import { db } from '../lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const SUPER_ADMIN = {
  uid: 'O6aFgoNhDigSIXk6zdYSDrFWhWG2',
  email: 'minhdai.bmt@gmail.com',
  displayName: 'Super Admin'
}

async function setupSuperAdminDirect() {
  try {
    console.log('🚀 Direct Super Admin Setup...')
    console.log(`UID: ${SUPER_ADMIN.uid}`)
    console.log(`Email: ${SUPER_ADMIN.email}`)
    console.log('')

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
        'system:admin', 'system:audit', 'system:backup',
        'org:admin', 'org:settings', 'org:billing', 'org:users',
        'farms:read', 'farms:write', 'farms:delete', 'farms:create',
        'trees:read', 'trees:write', 'trees:delete', 'trees:bulk',
        'photos:read', 'photos:write', 'photos:delete', 'photos:bulk',
        'investments:read', 'investments:write', 'investments:delete',
        'zones:read', 'zones:write', 'zones:delete',
        'users:read', 'users:invite', 'users:manage', 'users:remove',
        'analytics:view', 'analytics:export', 'reports:generate',
        'api:read', 'api:write', 'api:manage'
      ],
      grantedBy: SUPER_ADMIN.uid,
      grantedAt: new Date(),
      isActive: true,
      metadata: {
        setupType: 'direct_super_admin',
        setupDate: new Date().toISOString()
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
      setupBy: SUPER_ADMIN.uid
    }, { merge: true })
    console.log('✅ Admin configuration updated')

    // 4. Verify Setup
    console.log('🔍 Verifying setup...')
    const userDoc = await getDoc(doc(db, 'users', SUPER_ADMIN.uid))
    const roleDoc = await getDoc(doc(db, 'userRoles', roleId))
    
    if (userDoc.exists() && roleDoc.exists()) {
      console.log('✅ Verification passed')
    } else {
      throw new Error('Verification failed - documents not found')
    }

    console.log('')
    console.log('🎉 Super Admin setup completed successfully!')
    console.log('')
    console.log('📋 Setup Summary:')
    console.log(`   Super Admin UID: ${SUPER_ADMIN.uid}`)
    console.log(`   Email: ${SUPER_ADMIN.email}`)
    console.log(`   Role ID: ${roleId}`)
    console.log(`   Total Permissions: ${superAdminRole.permissions.length}`)
    console.log('')
    console.log('🔗 Next Steps:')
    console.log('   1. Login to your app with the configured email')
    console.log('   2. Navigate to /admin to access the admin panel')
    console.log('   3. Start managing users, organizations, and permissions')
    console.log('')

    return {
      success: true,
      superAdmin: SUPER_ADMIN,
      roleId: roleId,
      permissions: superAdminRole.permissions
    }

  } catch (error) {
    console.error('❌ Error setting up super admin:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Main execution
async function main() {
  console.log('🔧 Direct Super Admin Setup Tool')
  console.log('=================================')
  console.log('')
  
  const result = await setupSuperAdminDirect()
  
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

export { setupSuperAdminDirect }