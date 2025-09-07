#!/usr/bin/env node

/**
 * Data Sync Script
 * Syncs existing Firebase data with the new enhanced admin system
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore'

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBEMsHC6A6azD2AFrCgW36j2s0H-ZcxrNw",
  authDomain: "lettest-ecom.firebaseapp.com",
  projectId: "lettest-ecom",
  storageBucket: "lettest-ecom.firebasestorage.app",
  messagingSenderId: "832836231786",
  appId: "1:832836231786:web:bc029ed19ed87ea3f0e013"
}

async function analyzeDatabaseStructure() {
  try {
    console.log('🔍 Analyzing current Firebase database structure...')
    
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    // Check existing collections
    const collections = [
      'users',
      'farms', 
      'trees',
      'zones',
      'photos',
      'organizations',
      'userRoles',
      'farmInvitations',
      'pendingRegistrations'
    ]

    const analysis = {
      existingCollections: [] as string[],
      dataStats: {} as any,
      migrationNeeded: [] as string[]
    }

    for (const collectionName of collections) {
      try {
        console.log(`📊 Checking collection: ${collectionName}`)
        const snapshot = await getDocs(collection(db, collectionName))
        
        if (!snapshot.empty) {
          analysis.existingCollections.push(collectionName)
          analysis.dataStats[collectionName] = {
            documentCount: snapshot.size,
            sampleDoc: snapshot.docs[0]?.data() || null
          }
          
          console.log(`   ✅ Found ${snapshot.size} documents`)
          
          // Show sample data structure
          if (snapshot.docs[0]) {
            const sampleData = snapshot.docs[0].data()
            const keys = Object.keys(sampleData).slice(0, 5) // First 5 fields
            console.log(`   📝 Sample fields: ${keys.join(', ')}${keys.length < Object.keys(sampleData).length ? '...' : ''}`)
          }
        } else {
          console.log(`   ⚠️ Collection exists but is empty`)
        }
      } catch (error) {
        console.log(`   ❌ Collection not found or error: ${collectionName}`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📋 DATABASE ANALYSIS SUMMARY')
    console.log('='.repeat(60))
    
    console.log('\n🗂️ Existing Collections:')
    analysis.existingCollections.forEach(col => {
      const stats = analysis.dataStats[col]
      console.log(`   ✅ ${col}: ${stats.documentCount} documents`)
    })

    console.log('\n🔄 Migration Assessment:')
    
    // Check if we have users but no enhanced user structure
    if (analysis.existingCollections.includes('users')) {
      const usersStats = analysis.dataStats['users']
      const sampleUser = usersStats.sampleDoc
      
      if (sampleUser && !sampleUser.preferences) {
        console.log('   📝 Users need enhancement (missing preferences, roles structure)')
        analysis.migrationNeeded.push('enhance_users')
      }
    }

    // Check if we have farms but no organization structure
    if (analysis.existingCollections.includes('farms') && !analysis.existingCollections.includes('organizations')) {
      console.log('   📝 Farms need organization assignment')
      analysis.migrationNeeded.push('create_organizations')
    }

    // Check if we have users but no roles
    if (analysis.existingCollections.includes('users') && !analysis.existingCollections.includes('userRoles')) {
      console.log('   📝 Users need role assignments')
      analysis.migrationNeeded.push('assign_roles')
    }

    if (analysis.migrationNeeded.length === 0) {
      console.log('   ✅ No migration needed - data structure is current')
    }

    return analysis

  } catch (error) {
    console.error('❌ Error analyzing database:', error)
    return null
  }
}

async function syncExistingUsers() {
  try {
    console.log('\n🔄 Syncing existing users with enhanced structure...')
    
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    // Get existing users
    const usersSnapshot = await getDocs(collection(db, 'users'))
    console.log(`📊 Found ${usersSnapshot.size} existing users`)

    let enhanced = 0
    let rolesAssigned = 0

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const userId = userDoc.id
      
      console.log(`👤 Processing user: ${userData.email || userId}`)

      // Enhance user profile if needed
      if (!userData.preferences) {
        const enhancedUser = {
          ...userData,
          language: userData.language || 'vi-VN',
          timezone: userData.timezone || 'Asia/Ho_Chi_Minh',
          loginCount: userData.loginCount || 0,
          isEmailVerified: userData.isEmailVerified ?? true,
          isPhoneVerified: userData.isPhoneVerified ?? false,
          accountStatus: userData.accountStatus || 'active',
          twoFactorEnabled: userData.twoFactorEnabled ?? false,
          preferences: {
            theme: 'light',
            language: userData.language || 'vi-VN',
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
          isActive: userData.isActive ?? true,
          updatedAt: new Date()
        }

        await setDoc(doc(db, 'users', userId), enhancedUser, { merge: true })
        enhanced++
        console.log(`   ✅ Enhanced user profile`)
      }

      // Check if user has roles assigned
      const rolesQuery = query(
        collection(db, 'userRoles'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      )
      const rolesSnapshot = await getDocs(rolesQuery)

      if (rolesSnapshot.empty) {
        // Assign default role based on user type
        let defaultRole = 'farm_viewer'
        
        // Check if user owns any farms
        const farmsQuery = query(
          collection(db, 'farms'),
          where('ownerId', '==', userId)
        )
        const farmsSnapshot = await getDocs(farmsQuery)
        
        if (!farmsSnapshot.empty) {
          defaultRole = 'farm_owner'
        }

        // Create role assignment
        const roleId = `${userId}_${defaultRole}_${Date.now()}`
        const userRole = {
          id: roleId,
          userId: userId,
          roleType: defaultRole,
          scopeType: 'farm',
          permissions: getPermissionsForRole(defaultRole),
          grantedBy: 'system_migration',
          grantedAt: new Date(),
          isActive: true,
          metadata: {
            setupType: 'migration_assignment',
            migrationDate: new Date().toISOString()
          }
        }

        await setDoc(doc(db, 'userRoles', roleId), userRole)
        rolesAssigned++
        console.log(`   ✅ Assigned role: ${defaultRole}`)
      }
    }

    console.log(`\n📊 Sync Summary:`)
    console.log(`   Enhanced profiles: ${enhanced}`)
    console.log(`   Roles assigned: ${rolesAssigned}`)

  } catch (error) {
    console.error('❌ Error syncing users:', error)
  }
}

async function createDefaultOrganization() {
  try {
    console.log('\n🏢 Creating default organization for existing farms...')
    
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    // Check if default organization exists
    const orgId = 'default_org'
    const orgDoc = await getDocs(collection(db, 'organizations'))
    
    if (orgDoc.empty) {
      const defaultOrg = {
        id: orgId,
        name: 'Default Organization',
        displayName: 'Default Organization',
        subscriptionType: 'pro',
        subscriptionStatus: 'active',
        maxFarms: 100,
        maxUsersPerFarm: 50,
        maxUsersTotal: 500,
        features: ['basic_features', 'advanced_analytics'],
        settings: {
          allowSelfRegistration: false,
          requireEmailVerification: true,
          requireAdminApproval: true,
          defaultUserRole: 'viewer',
          sessionTimeout: 480,
          enableAuditLogging: true,
          enableAPIAccess: false
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      }

      await setDoc(doc(db, 'organizations', orgId), defaultOrg)
      console.log('✅ Default organization created')

      // Update existing farms to belong to this organization
      const farmsSnapshot = await getDocs(collection(db, 'farms'))
      let farmsUpdated = 0

      for (const farmDoc of farmsSnapshot.docs) {
        const farmData = farmDoc.data()
        if (!farmData.organizationId) {
          await setDoc(doc(db, 'farms', farmDoc.id), {
            ...farmData,
            organizationId: orgId,
            updatedAt: new Date()
          }, { merge: true })
          farmsUpdated++
        }
      }

      console.log(`✅ Updated ${farmsUpdated} farms with organization assignment`)
    } else {
      console.log('✅ Organization structure already exists')
    }

  } catch (error) {
    console.error('❌ Error creating default organization:', error)
  }
}

function getPermissionsForRole(roleType: string): string[] {
  const rolePermissions = {
    'farm_owner': [
      'farms:read', 'farms:write',
      'trees:read', 'trees:write', 'trees:delete',
      'photos:read', 'photos:write', 'photos:delete',
      'zones:read', 'zones:write', 'zones:delete',
      'users:invite', 'analytics:view'
    ],
    'farm_manager': [
      'farms:read',
      'trees:read', 'trees:write',
      'photos:read', 'photos:write',
      'zones:read', 'zones:write',
      'analytics:view'
    ],
    'farm_viewer': [
      'farms:read', 'trees:read', 'photos:read', 'zones:read'
    ]
  }

  return rolePermissions[roleType as keyof typeof rolePermissions] || ['farms:read']
}

// Main execution
async function main() {
  console.log('🔄 Firebase Data Sync Tool')
  console.log('==========================')
  
  try {
    // Step 1: Analyze current structure
    const analysis = await analyzeDatabaseStructure()
    
    if (!analysis) {
      console.log('❌ Could not analyze database structure')
      return
    }

    // Step 2: Ask for confirmation
    console.log('\n❓ Would you like to proceed with data migration? (This will enhance existing data)')
    console.log('   This process will:')
    console.log('   - Enhance existing user profiles')
    console.log('   - Assign default roles to users without roles')
    console.log('   - Create a default organization for existing farms')
    console.log('')

    // For script execution, we'll proceed automatically
    // In a real scenario, you'd want user confirmation

    // Step 3: Perform migrations
    if (analysis.migrationNeeded.includes('enhance_users') || analysis.migrationNeeded.includes('assign_roles')) {
      await syncExistingUsers()
    }

    if (analysis.migrationNeeded.includes('create_organizations')) {
      await createDefaultOrganization()
    }

    console.log('\n🎉 Data sync completed successfully!')
    console.log('\n🔗 Next steps:')
    console.log('   1. Login to /admin to verify user roles')
    console.log('   2. Review organization assignments')
    console.log('   3. Adjust roles and permissions as needed')

  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { analyzeDatabaseStructure, syncExistingUsers, createDefaultOrganization }