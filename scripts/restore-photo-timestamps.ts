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
const Timestamp = admin.firestore.Timestamp;

function parseTimestampFromFilename(filename: string): Date | null {
  if (!filename) return null;
  const match = filename.match(/(\d{10,13})(?:\.\d+)?/);
  if (match) {
    const val = parseFloat(match[0]);
    const ms = val < 9999999999 ? val * 1000 : val;
    const date = new Date(ms);
    if (date.getFullYear() >= 2000 && date.getFullYear() <= 2030) {
      return date;
    }
  }
  return null;
}

async function main() {
  console.log('🚀 Starting photo timestamp restoration (fixed timezone handling)...');
  let totalUpdated = 0;

  try {
    // 1. Process Root Photos Collection
    console.log('\n📸 Scanning Root Photos Collection...');
    const rootPhotosSnap = await db.collection('photos').get();
    console.log(`Found ${rootPhotosSnap.size} root photos.`);

    let batch = db.batch();
    let opCount = 0;

    for (const photoDoc of rootPhotosSnap.docs) {
      const data = photoDoc.data();
      const filename = data.filename || '';
      
      const parsedDate = parseTimestampFromFilename(filename);
      if (parsedDate) {
        let currentTimestampDate = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : null;
        
        const isDefaultDate = currentTimestampDate && currentTimestampDate.toISOString() === '2025-01-01T00:00:00.000Z';

        if (isDefaultDate || !currentTimestampDate) {
          console.log(`  🔄 Restoring Root Photo ${photoDoc.id} (${filename}):`);
          console.log(`    Current: ${currentTimestampDate ? currentTimestampDate.toISOString() : 'null'}`);
          console.log(`    Restoring to: ${parsedDate.toISOString()}`);
          
          const updates: any = {
            timestamp: Timestamp.fromDate(parsedDate),
            seasonYear: parsedDate.getFullYear()
          };
          
          batch.update(photoDoc.ref, updates);
          opCount++;
          totalUpdated++;

          if (opCount >= 400) {
            await batch.commit();
            batch = db.batch();
            opCount = 0;
          }
        }
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    // 2. Process Farm Subcollection Photos
    console.log('\n📁 Scanning Farm Subcollections for Photos...');
    const farmsSnap = await db.collection('farms').get();
    console.log(`Found ${farmsSnap.size} farms.`);

    for (const farmDoc of farmsSnap.docs) {
      const farmId = farmDoc.id;
      const farmName = farmDoc.data().name || farmId;
      const subPhotosSnap = await db.collection('farms').doc(farmId).collection('photos').get();
      
      if (subPhotosSnap.empty) continue;

      console.log(`  Processing ${subPhotosSnap.size} subcollection photos for farm "${farmName}"...`);
      let subBatch = db.batch();
      let subOpCount = 0;

      for (const photoDoc of subPhotosSnap.docs) {
        const data = photoDoc.data();
        const filename = data.filename || '';
        
        const parsedDate = parseTimestampFromFilename(filename);
        if (parsedDate) {
          let currentTimestampDate = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : null;
          
          const isDefaultDate = currentTimestampDate && currentTimestampDate.toISOString() === '2025-01-01T00:00:00.000Z';

          if (isDefaultDate || !currentTimestampDate) {
            console.log(`    🔄 Restoring Sub Photo ${photoDoc.id} (${filename}):`);
            console.log(`      Current: ${currentTimestampDate ? currentTimestampDate.toISOString() : 'null'}`);
            console.log(`      Restoring to: ${parsedDate.toISOString()}`);
            
            const updates: any = {
              timestamp: Timestamp.fromDate(parsedDate),
              seasonYear: parsedDate.getFullYear()
            };
            
            subBatch.update(photoDoc.ref, updates);
            subOpCount++;
            totalUpdated++;

            if (subOpCount >= 400) {
              await subBatch.commit();
              subBatch = db.batch();
              subOpCount = 0;
            }
          }
        }
      }

      if (subOpCount > 0) {
        await subBatch.commit();
      }
    }

    console.log(`\n🎉 Restoration completed successfully! Total updated photos: ${totalUpdated}`);
  } catch (err: any) {
    console.error('❌ Error during restoration:', err);
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch(console.error);
