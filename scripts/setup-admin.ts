import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, collection, getDocs, query, limit, Timestamp } from 'firebase/firestore'

// Firebase config - you'll need to update this with your actual config
const firebaseConfig = {
  // Add your Firebase config here
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const ADMIN_USER = {
  uid: 'O6aFgoNhDigSIXk6zdYSDrFWhWG2',
  email: 'minhdai.bmt@gmail.com', // Update this to your actual email
  displayName: 'Super Admin'
}

async function setupAdmin() {
  try {
    console.log('Setting up admin user...')
    
    // 1. Create/update user document
    await setDoc(doc(db, 'users', ADMIN_USER.uid), {
      uid: ADMIN_USER.uid,
      email: ADMIN_USER.email,
      displayName: ADMIN_USER.displayName,
      createdAt: Timestamp.now(),
      isAdmin: true,
      role: 'admin'
    }, { merge: true })
    
    console.log('✅ Admin user document created/updated')
    
    // 2. Find existing farms or create a default one
    const farmsSnapshot = await getDocs(query(collection(db, 'farms'), limit(10)))
    
    let mainFarmId = null
    
    if (!farmsSnapshot.empty) {
      // Use the first existing farm as the main farm
      const firstFarm = farmsSnapshot.docs[0]
      mainFarmId = firstFarm.id
      console.log(`✅ Found existing farm: ${firstFarm.data().name} (ID: ${mainFarmId})`)
    } else {
      // Create a default main farm
      const farmRef = doc(collection(db, 'farms'))
      mainFarmId = farmRef.id
      
      await setDoc(farmRef, {
        id: mainFarmId,
        name: 'Main Farm',
        ownerName: ADMIN_USER.displayName || ADMIN_USER.email,
        totalArea: 10.0,
        createdDate: Timestamp.now(),
        centerLatitude: 10.8231, // Default to Vietnam coordinates
        centerLongitude: 106.6297,
        boundaryCoordinates: '',
        isMainFarm: true
      })
      
      console.log(`✅ Created main farm with ID: ${mainFarmId}`)
    }
    
    // 3. Grant admin full access to the main farm
    const accessRef = doc(collection(db, 'userFarmAccess'))
    await setDoc(accessRef, {
      id: accessRef.id,
      userId: ADMIN_USER.uid,
      farmId: mainFarmId,
      role: 'owner',
      permissions: [
        'read',
        'write', 
        'delete',
        'manage_users',
        'manage_zones',
        'manage_investments',
        'admin_access',
        'full_control'
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isMainFarmAccess: true
    })
    
    console.log('✅ Admin access granted to main farm')
    
    // 4. Create admin config document
    await setDoc(doc(db, 'adminConfig', 'main'), {
      adminUsers: [ADMIN_USER.uid],
      mainFarmId: mainFarmId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }, { merge: true })
    
    console.log('✅ Admin configuration saved')
    
    console.log('\n🎉 Admin setup complete!')
    console.log(`Admin User: ${ADMIN_USER.email}`)
    console.log(`Main Farm ID: ${mainFarmId}`)
    console.log(`User ID: ${ADMIN_USER.uid}`)
    
    return {
      success: true,
      adminUser: ADMIN_USER,
      mainFarmId
    }
    
  } catch (error) {
    console.error('❌ Error setting up admin:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Run the setup
setupAdmin().then(result => {
  if (result.success) {
    console.log('\n✅ Setup completed successfully!')
    process.exit(0)
  } else {
    console.error('\n❌ Setup failed:', result.error)
    process.exit(1)
  }
})