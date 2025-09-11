// Quick fix for the specific farm access issue
// Copy and paste this into your browser console while logged into the app

async function quickFixFarmAccess() {
  try {
    console.log('🔧 Starting quick farm access fix...');
    
    // Import Firebase modules
    const { auth } = await import('./lib/firebase.js');
    const { db } = await import('./lib/firebase.js');
    const { collection, doc, setDoc, Timestamp } = await import('firebase/firestore');
    
    // User and farm details from the error
    const userId = 'H3s0TX2LbYbVC2VXezCDr2oBs0n2';
    const farmId = 'F210C3FC-F191-4926-9C15-58D6550A716A';
    const userEmail = 'daibui.sg@gmail.com';
    const farmName = 'Rẫy';
    
    console.log('👤 User:', userEmail, userId);
    console.log('🏭 Farm:', farmName, farmId);
    
    // 1. Grant farm access in userFarmAccess collection
    console.log('🔧 Creating farm access record...');
    const accessRef = doc(collection(db, 'userFarmAccess'));
    await setDoc(accessRef, {
      id: accessRef.id,
      userId: userId,
      farmId: farmId,
      role: 'owner',
      permissions: [
        'read',
        'write', 
        'delete',
        'manage_users',
        'manage_zones',
        'manage_investments'
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log('✅ Farm access record created');
    
    // 2. Create user role for enhanced auth system
    console.log('🔧 Creating user role...');
    const roleRef = doc(collection(db, 'userRoles'));
    await setDoc(roleRef, {
      id: roleRef.id,
      userId: userId,
      roleType: 'farm_owner',
      scopeType: 'farm',
      scopeId: farmId,
      permissions: [
        'farms:read', 'farms:write',
        'trees:read', 'trees:write', 'trees:delete', 'trees:bulk',
        'photos:read', 'photos:write', 'photos:delete', 'photos:bulk',
        'investments:read', 'investments:write', 'investments:delete',
        'zones:read', 'zones:write', 'zones:delete',
        'users:read', 'users:invite', 'users:manage',
        'analytics:view', 'analytics:export', 'reports:generate'
      ],
      grantedBy: userId, // Self-granted for now
      grantedAt: Timestamp.now(),
      isActive: true,
      metadata: {
        autoGranted: true,
        reason: 'Quick fix for farm access issue',
        fixedAt: new Date().toISOString()
      }
    });
    console.log('✅ User role created');
    
    console.log('🎉 Farm access fix completed!');
    console.log('🔄 Please refresh the page to see the changes.');
    
    return {
      success: true,
      message: `Access granted to ${farmName} for ${userEmail}`
    };
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the fix
quickFixFarmAccess().then(result => {
  if (result.success) {
    alert('✅ Farm access fixed! Please refresh the page.');
  } else {
    alert('❌ Fix failed: ' + result.error);
  }
});