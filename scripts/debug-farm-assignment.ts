#!/usr/bin/env node

/**
 * Farm Assignment Debug Tool
 * Diagnoses and fixes farm assignment issues
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'

// You'll need to add your Firebase config here
const firebaseConfig = {
  // Add your Firebase config
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

interface DiagnosticResult {
  userId: string
  userEmail: string
  roles: any[]
  farmRoles: any[]
  activeRoles: any[]
  farms: any[]
  issues: string[]
  recommendations: string[]
}

async function diagnoseUser(userEmail: string): Promise<DiagnosticResult> {
  console.log(`🔍 Diagnosing user: ${userEmail}`)
  
  const result: DiagnosticResult = {
    userId: '',
    userEmail,
    roles: [],
    farmRoles: [],
    activeRoles: [],
    farms: [],
    issues: [],
    recommendations: []
  }

  try {
    // 1. Find user by email
    const usersQuery = query(collection(db, 'users'), where('email', '==', userEmail))
    const usersSnapshot = await getDocs(usersQuery)
    
    if (usersSnapshot.empty) {
      result.issues.push('User not found in users collection')
      return result
    }

    const userDoc = usersSnapshot.docs[0]
    result.userId = userDoc.id
    const userData = userDoc.data()
    
    console.log(`✅ Found user: ${userData.displayName || 'No name'} (${result.userId})`)

    // 2. Get all roles for user
    const rolesQuery = query(collection(db, 'userRoles'), where('userId', '==', result.userId))
    const rolesSnapshot = await getDocs(rolesQuery)
    
    result.roles = rolesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      grantedAt: doc.data().grantedAt?.toDate()
    }))

    console.log(`📋 Total roles: ${result.roles.length}`)

    // 3. Filter farm roles
    result.farmRoles = result.roles.filter(role => role.scopeType === 'farm')
    console.log(`🏭 Farm roles: ${result.farmRoles.length}`)

    // 4. Filter active roles
    result.activeRoles = result.farmRoles.filter(role => role.isActive)
    console.log(`✅ Active farm roles: ${result.activeRoles.length}`)

    // 5. Check farms exist
    for (const role of result.activeRoles) {
      try {
        const farmDoc = await getDoc(doc(db, 'farms', role.scopeId))
        if (farmDoc.exists()) {
          const farmData = farmDoc.data()
          result.farms.push({
            id: role.scopeId,
            ...farmData,
            roleType: role.roleType,
            grantedAt: role.grantedAt
          })
          console.log(`✅ Farm exists: ${farmData.name}`)
        } else {
          result.issues.push(`Farm ${role.scopeId} referenced in role but doesn't exist`)
          console.log(`❌ Farm ${role.scopeId} doesn't exist`)
        }
      } catch (error) {
        result.issues.push(`Error loading farm ${role.scopeId}: ${error}`)
      }
    }

    // 6. Analyze issues
    if (result.farmRoles.length === 0) {
      result.issues.push('No farm roles assigned to user')
      result.recommendations.push('Assign user to a farm using the Farm Assignment System')
    } else if (result.activeRoles.length === 0) {
      result.issues.push('User has farm roles but none are active')
      result.recommendations.push('Check role isActive status in userRoles collection')
    } else if (result.farms.length === 0) {
      result.issues.push('User has active roles but referenced farms don\'t exist')
      result.recommendations.push('Check that farm documents exist in farms collection')
    } else if (result.farms.length > 0) {
      console.log('✅ User should have access to farms')
      result.recommendations.push('User should have farm access. If not visible, try refreshing the page or clearing browser cache.')
    }

    // 7. Check user account status
    if (userData.accountStatus && userData.accountStatus !== 'active') {
      result.issues.push(`User account status is: ${userData.accountStatus}`)
      result.recommendations.push('Ensure user account status is active')
    }

    if (!userData.isEmailVerified) {
      result.issues.push('User email is not verified')
      result.recommendations.push('User should verify their email address')
    }

  } catch (error) {
    result.issues.push(`Diagnostic error: ${error}`)
  }

  return result
}

async function fixUserFarmAccess(userEmail: string, fixOptions: {
  activateRoles?: boolean
  activateAccount?: boolean
  verifyEmail?: boolean
} = {}): Promise<void> {
  console.log(`🔧 Attempting to fix farm access for: ${userEmail}`)

  try {
    // Find user
    const usersQuery = query(collection(db, 'users'), where('email', '==', userEmail))
    const usersSnapshot = await getDocs(usersQuery)
    
    if (usersSnapshot.empty) {
      console.error('❌ User not found')
      return
    }

    const userDoc = usersSnapshot.docs[0]
    const userId = userDoc.id

    // Fix user account if needed
    if (fixOptions.activateAccount || fixOptions.verifyEmail) {
      const updates: any = {}
      if (fixOptions.activateAccount) {
        updates.accountStatus = 'active'
      }
      if (fixOptions.verifyEmail) {
        updates.isEmailVerified = true
      }
      
      await updateDoc(doc(db, 'users', userId), updates)
      console.log('✅ Updated user account')
    }

    // Fix roles if needed
    if (fixOptions.activateRoles) {
      const rolesQuery = query(collection(db, 'userRoles'), where('userId', '==', userId))
      const rolesSnapshot = await getDocs(rolesQuery)
      
      for (const roleDoc of rolesSnapshot.docs) {
        const roleData = roleDoc.data()
        if (roleData.scopeType === 'farm' && !roleData.isActive) {
          await updateDoc(doc(db, 'userRoles', roleDoc.id), {
            isActive: true,
            updatedAt: new Date()
          })
          console.log(`✅ Activated role: ${roleData.roleType} for farm ${roleData.scopeId}`)
        }
      }
    }

    console.log('✅ Fix completed')

  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
Usage:
  npm run debug:farm-assignment <user-email>              # Diagnose issues
  npm run debug:farm-assignment <user-email> --fix        # Fix common issues
  npm run debug:farm-assignment <user-email> --fix-all    # Fix all issues
    `)
    return
  }

  const userEmail = args[0]
  const shouldFix = args.includes('--fix') || args.includes('--fix-all')
  const fixAll = args.includes('--fix-all')

  // Diagnose
  const result = await diagnoseUser(userEmail)
  
  console.log('\n📊 DIAGNOSTIC RESULTS:')
  console.log('═'.repeat(50))
  console.log(`User: ${result.userEmail} (${result.userId})`)
  console.log(`Total Roles: ${result.roles.length}`)
  console.log(`Farm Roles: ${result.farmRoles.length}`)
  console.log(`Active Farm Roles: ${result.activeRoles.length}`)
  console.log(`Accessible Farms: ${result.farms.length}`)
  
  if (result.issues.length > 0) {
    console.log('\n❌ ISSUES FOUND:')
    result.issues.forEach(issue => console.log(`  - ${issue}`))
  }
  
  if (result.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:')
    result.recommendations.forEach(rec => console.log(`  - ${rec}`))
  }

  if (result.farms.length > 0) {
    console.log('\n🏭 ACCESSIBLE FARMS:')
    result.farms.forEach(farm => {
      console.log(`  - ${farm.name} (${farm.roleType}) - Granted: ${farm.grantedAt?.toLocaleDateString()}`)
    })
  }

  // Apply fixes if requested
  if (shouldFix && result.issues.length > 0) {
    console.log('\n🔧 APPLYING FIXES...')
    
    const hasInactiveRoles = result.farmRoles.some(role => !role.isActive)
    
    await fixUserFarmAccess(userEmail, {
      activateRoles: hasInactiveRoles || fixAll,
      activateAccount: fixAll,
      verifyEmail: fixAll
    })
    
    console.log('\n✅ Fixes applied. User should refresh their browser/app.')
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { diagnoseUser, fixUserFarmAccess }