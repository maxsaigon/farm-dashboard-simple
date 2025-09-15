// Authentication data migration script
// Run with: node scripts/migrate-auth-data.js

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore')

// Firebase config (use your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  // or read from environment variables
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateAuthData() {
  console.log('🔄 Starting authentication data migration...')
  
  try {
    // 1. Migrate user profiles to simplified format
    await migrateUserProfiles()
    
    // 2. Convert complex userRoles to simple farmAccess
    await migrateUserRoles()
    
    // 3. Validate migration
    await validateMigration()
    
    console.log('✅ Authentication data migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

async function migrateUserProfiles() {
  console.log('📝 Migrating user profiles...')
  
  const usersSnapshot = await getDocs(collection(db, 'users'))
  console.log(`Found ${usersSnapshot.docs.length} users to migrate`)
  
  const batch = writeBatch(db)
  let migratedCount = 0
  
  usersSnapshot.docs.forEach(userDoc => {
    const oldData = userDoc.data()
    
    // Transform to simplified user profile
    const newData = {
      uid: userDoc.id,
      email: oldData.email || null,
      displayName: oldData.displayName || oldData.name || null,
      phoneNumber: oldData.phoneNumber || null,
      emailVerified: oldData.emailVerified || false,
      createdAt: oldData.createdAt || new Date(),
      preferredLanguage: oldData.language || oldData.preferredLanguage || 'vi',
      timezone: oldData.timezone || 'Asia/Ho_Chi_Minh',
      // Preserve any additional fields that might be useful
      lastLoginAt: oldData.lastLoginAt || null
    }
    
    // Update user document with simplified structure
    batch.set(doc(db, 'users', userDoc.id), newData)
    migratedCount++
    
    if (migratedCount % 10 === 0) {
      console.log(`  Processed ${migratedCount} users...`)
    }
  })
  
  await batch.commit()
  console.log(`✅ Migrated ${migratedCount} user profiles`)
}

async function migrateUserRoles() {
  console.log('🔐 Migrating user roles to farm access...')
  
  const rolesSnapshot = await getDocs(collection(db, 'userRoles'))
  console.log(`Found ${rolesSnapshot.docs.length} roles to process`)
  
  const batch = writeBatch(db)
  let migratedCount = 0
  let skippedCount = 0
  
  rolesSnapshot.docs.forEach(roleDoc => {
    const oldRole = roleDoc.data()
    
    // Only migrate active farm roles
    if (oldRole.scopeType === 'farm' && oldRole.isActive) {
      const farmAccess = {
        farmId: oldRole.scopeId,
        userId: oldRole.userId,
        role: mapOldRoleToNew(oldRole.roleType),
        grantedAt: oldRole.grantedAt || new Date(),
        grantedBy: oldRole.grantedBy || 'system',
        isActive: true
      }
      
      // Use consistent ID format: userId_farmId
      const accessId = `${oldRole.userId}_${oldRole.scopeId}`
      batch.set(doc(db, 'farmAccess', accessId), farmAccess)
      migratedCount++
      
      if (migratedCount % 10 === 0) {
        console.log(`  Processed ${migratedCount} farm access records...`)
      }
    } else {
      skippedCount++
      console.log(`  Skipped role: ${oldRole.roleType} (${oldRole.scopeType}, active: ${oldRole.isActive})`)
    }
  })
  
  await batch.commit()
  console.log(`✅ Migrated ${migratedCount} farm access records`)
  console.log(`ℹ️  Skipped ${skippedCount} non-farm or inactive roles`)
}

async function validateMigration() {
  console.log('✅ Validating migration...')
  
  // Check user profiles
  const usersSnapshot = await getDocs(collection(db, 'users'))
  console.log(`✓ Found ${usersSnapshot.docs.length} user profiles`)
  
  // Check farm access
  const accessSnapshot = await getDocs(collection(db, 'farmAccess'))
  console.log(`✓ Found ${accessSnapshot.docs.length} farm access records`)
  
  // Validate data structure
  const sampleUser = usersSnapshot.docs[0]?.data()
  if (sampleUser) {
    const requiredFields = ['uid', 'email', 'preferredLanguage', 'timezone']
    const missingFields = requiredFields.filter(field => !(field in sampleUser))
    
    if (missingFields.length === 0) {
      console.log('✓ User profile structure is valid')
    } else {
      console.warn(`⚠️ Missing fields in user profile: ${missingFields.join(', ')}`)
    }
  }
  
  const sampleAccess = accessSnapshot.docs[0]?.data()
  if (sampleAccess) {
    const requiredFields = ['farmId', 'userId', 'role', 'isActive']
    const missingFields = requiredFields.filter(field => !(field in sampleAccess))
    
    if (missingFields.length === 0) {
      console.log('✓ Farm access structure is valid')
    } else {
      console.warn(`⚠️ Missing fields in farm access: ${missingFields.join(', ')}`)
    }
  }
}

function mapOldRoleToNew(oldRole) {
  // Map complex old roles to simple new roles
  const roleMap = {
    // Owner roles
    'farm_owner': 'owner',
    'farm_admin': 'owner',
    'super_admin': 'owner',
    
    // Manager roles  
    'farm_manager': 'manager',
    'farm_editor': 'manager',
    'tree_manager': 'manager',
    'photo_manager': 'manager',
    
    // Viewer roles
    'farm_viewer': 'viewer',
    'farm_user': 'viewer',
    'tree_viewer': 'viewer',
    'photo_viewer': 'viewer'
  }
  
  const newRole = roleMap[oldRole] || 'viewer'
  console.log(`  Mapping ${oldRole} → ${newRole}`)
  return newRole
}

// Performance monitoring
function logProgress(current, total, operation) {
  const percentage = Math.round((current / total) * 100)
  if (current % 10 === 0 || current === total) {
    console.log(`  ${operation}: ${current}/${total} (${percentage}%)`)
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAuthData().then(() => {
    console.log('🎉 Migration completed! You can now switch to the new auth system.')
    process.exit(0)
  }).catch(error => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
}

module.exports = {
  migrateAuthData,
  migrateUserProfiles,
  migrateUserRoles,
  validateMigration
}