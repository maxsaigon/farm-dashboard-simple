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
const FARM_ID = 'F210C3FC-F191-4926-9C15-58D6550A716A';

async function main() {
  try {
    const treesSnap = await db.collection('farms').doc(FARM_ID).collection('trees').get();
    
    console.log('\n=== Trees with zoneCode but no zoneId and no zoneName (27 trees) ===');
    let count27 = 0;
    treesSnap.docs.forEach(doc => {
      const data = doc.data();
      const zId = data.zoneId || '';
      const zCode = data.zoneCode || '';
      const zName = data.zoneName || '';
      if (!zId && zCode && !zName) {
        count27++;
        if (count27 <= 10) {
          console.log(`Doc: ${doc.id} | name: "${data.name}" | variety: "${data.variety}" | zoneCode: "${zCode}" | zoneName: "${zName}"`);
        }
      }
    });
    console.log(`Total found: ${count27}`);

    console.log('\n=== Trees with zoneCode and zoneName but no zoneId (12 trees) ===');
    let count12 = 0;
    treesSnap.docs.forEach(doc => {
      const data = doc.data();
      const zId = data.zoneId || '';
      const zCode = data.zoneCode || '';
      const zName = data.zoneName || '';
      if (!zId && zCode && zName) {
        count12++;
        if (count12 <= 10) {
          console.log(`Doc: ${doc.id} | name: "${data.name}" | variety: "${data.variety}" | zoneCode: "${zCode}" | zoneName: "${zName}"`);
        }
      }
    });
    console.log(`Total found: ${count12}`);

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}

main();
