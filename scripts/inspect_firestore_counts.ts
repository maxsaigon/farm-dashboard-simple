import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.join(__dirname, '../config/firebase-sa.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Cannot find service account key at: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  console.log('🚀 Connecting to Firestore to inspect counts...');
  try {
    // 1. Root level collections
    // Check root /farms
    const farmsSnap = await db.collection('farms').get();
    console.log(`\n📋 Root farms collection size: ${farmsSnap.size}`);
    
    // Check root /trees
    const rootTreesSnap = await db.collection('trees').get();
    console.log(`🌳 Root trees collection size: ${rootTreesSnap.size}`);

    // Check root /zones
    const rootZonesSnap = await db.collection('zones').get();
    console.log(`📍 Root zones collection size: ${rootZonesSnap.size}`);

    // 2. Subcollections under each farm
    let totalSubcollectionTrees = 0;
    let totalSubcollectionZones = 0;

    for (const farmDoc of farmsSnap.docs) {
      const farmData = farmDoc.data();
      
      const subTreesSnap = await db.collection('farms').doc(farmDoc.id).collection('trees').get();
      const subZonesSnap = await db.collection('farms').doc(farmDoc.id).collection('zones').get();
      
      console.log(`\nFarm: "${farmData.name || 'Unnamed'}" (ID: ${farmDoc.id})`);
      console.log(`  - Subcollection trees count: ${subTreesSnap.size}`);
      console.log(`  - Subcollection zones count: ${subZonesSnap.size}`);
      
      totalSubcollectionTrees += subTreesSnap.size;
      totalSubcollectionZones += subZonesSnap.size;

      // Sample tree fields from root/sub to inspect layout
      if (subTreesSnap.size > 0) {
        console.log(`  - Sample subtree:`, JSON.stringify(subTreesSnap.docs[0].data(), null, 2));
      }
    }

    console.log(`\n--- Aggregate Firestore Totals ---`);
    console.log(`Total Root-level trees: ${rootTreesSnap.size}`);
    console.log(`Total Subcollection trees: ${totalSubcollectionTrees}`);
    console.log(`Total Root-level zones: ${rootZonesSnap.size}`);
    console.log(`Total Subcollection zones: ${totalSubcollectionZones}`);

    // Inspect root-level trees sample
    if (rootTreesSnap.size > 0) {
      console.log(`\nSample Root-level tree:`, JSON.stringify(rootTreesSnap.docs[0].data(), null, 2));
    }
    // Inspect root-level zones sample
    if (rootZonesSnap.size > 0) {
      console.log(`\nSample Root-level zone:`, JSON.stringify(rootZonesSnap.docs[0].data(), null, 2));
    }

  } catch (err: any) {
    console.error('❌ Error inspecting Firestore:', err.message, err.stack);
  }
}

main();
