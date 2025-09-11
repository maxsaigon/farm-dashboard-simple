// Alternative: Use the FarmService to grant access properly
// Run this in browser console

async function grantUserFarmAccess() {
  try {
    console.log('🔧 Granting farm access using FarmService...');
    
    // Import the FarmService
    const { FarmService } = await import('./lib/farm-service.js');
    
    // User and farm details
    const userId = 'H3s0TX2LbYbVC2VXezCDr2oBs0n2';
    const farmId = 'F210C3FC-F191-4926-9C15-58D6550A716A';
    
    // Grant farm access using the proper service method
    await FarmService.grantFarmAccess(
      userId,
      farmId,
      'owner',
      ['read', 'write', 'delete', 'manage_users', 'manage_zones', 'manage_investments']
    );
    
    console.log('✅ Farm access granted via FarmService');
    console.log('🔄 Please refresh the page.');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error granting access:', error);
    
    // If FarmService method fails, fall back to direct database access
    console.log('🔄 Falling back to direct database method...');
    
    const { db } = await import('./lib/firebase.js');
    const { collection, doc, setDoc, Timestamp } = await import('firebase/firestore');
    
    const userId = 'H3s0TX2LbYbVC2VXezCDr2oBs0n2';
    const farmId = 'F210C3FC-F191-4926-9C15-58D6550A716A';
    
    // Direct database access
    const accessRef = doc(collection(db, 'userFarmAccess'));
    await setDoc(accessRef, {
      id: accessRef.id,
      userId: userId,
      farmId: farmId,
      role: 'owner',
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_zones', 'manage_investments'],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    console.log('✅ Access granted via direct database method');
    return { success: true };
  }
}

grantUserFarmAccess();