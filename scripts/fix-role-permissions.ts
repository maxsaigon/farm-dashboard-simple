#!/usr/bin/env node

/**
 * Fix Role Permissions Script
 * Updates existing roles to have proper permissions from ROLE_PERMISSIONS
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'

// You'll need to add your Firebase config here
const firebaseConfig = {
  // Add your Firebase config
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Role permissions mapping (copy from types-enhanced.ts)
const ROLE_PERMISSIONS = {
  super_admin: [
    'system:admin', 'system:audit', 'system:backup',
    'org:admin', 'org:settings', 'org:billing', 'org:users',
    'farms:read', 'farms:write', 'farms:delete', 'farms:create',
    'trees:read', 'trees:write', 'trees:delete', 'trees:bulk',
    'photos:read', 'photos:write', 'photos:delete', 'photos:bulk',
    'users:read', 'users:invite', 'users:manage', 'users:remove',
    'analytics:view', 'analytics:export', 'reports:generate',
    'api:read', 'api:write', 'api:manage'
  ],
  organization_admin: [
    'org:admin', 'org:settings', 'org:users',
    'farms:read', 'farms:write', 'farms:create',
    'users:read', 'users:invite', 'users:manage',
    'analytics:view', 'analytics:export', 'reports:generate'
  ],
  organization_member: [
    'farms:read', 'users:read'
  ],
  farm_owner: [
    'farms:read', 'farms:write',
    'trees:read', 'trees:write', 'trees:delete', 'trees:bulk',
    'photos:read', 'photos:write', 'photos:delete', 'photos:bulk',
    'investments:read', 'investments:write', 'investments:delete',
    'zones:read', 'zones:write', 'zones:delete',
    'users:read', 'users:invite', 'users:manage',
    'analytics:view', 'analytics:export', 'reports:generate'
  ],
  farm_manager: [
    'farms:read',
    'trees:read', 'trees:write', 'trees:bulk',
    'photos:read', 'photos:write', 'photos:bulk',
    'investments:read', 'investments:write',
    'zones:read', 'zones:write',
    'users:read',
    'analytics:view'
  ],
  farm_viewer: [
    'farms:read',
    'trees:read',
    'photos:read',
    'investments:read',
    'zones:read',
    'users:read',
    'analytics:view'
  ],
  seasonal_worker: [
    'trees:read', 'trees:write',
    'photos:read', 'photos:write'
  ],
  api_user: [
    'api:read', 'api:write'
  ]
}

async function fixRolePermissions() {
  console.log('🔧 Starting role permissions fix...')
  
  try {
    // Get all user roles
    const rolesRef = collection(db, 'userRoles')
    const snapshot = await getDocs(rolesRef)
    
    console.log(`📋 Found ${snapshot.size} roles to check`)
    
    let fixedCount = 0
    
    for (const roleDoc of snapshot.docs) {
      const roleData = roleDoc.data()
      const roleType = roleData.roleType
      
      // Check if permissions are missing or empty
      const hasPermissions = roleData.permissions && roleData.permissions.length > 0
      
      if (!hasPermissions && roleType in ROLE_PERMISSIONS) {
        const correctPermissions = ROLE_PERMISSIONS[roleType as keyof typeof ROLE_PERMISSIONS]
        
        console.log(`🔧 Fixing role ${roleDoc.id} (${roleType}):`)
        console.log(`  - Adding ${correctPermissions.length} permissions`)
        
        await updateDoc(doc(db, 'userRoles', roleDoc.id), {
          permissions: correctPermissions,
          updatedAt: new Date()
        })
        
        fixedCount++
      } else if (hasPermissions) {
        console.log(`✅ Role ${roleDoc.id} (${roleType}) already has permissions`)
      } else {
        console.log(`⚠️  Unknown role type: ${roleType}`)
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} roles`)
    console.log('🔄 Users should refresh their browsers to see the changes')
    
  } catch (error) {
    console.error('❌ Error fixing role permissions:', error)
  }
}

if (require.main === module) {
  fixRolePermissions().then(() => process.exit(0))
}

export { fixRolePermissions }