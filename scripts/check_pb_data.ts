import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://farmbackend.buonme.com';
const pb = new PocketBase(pbUrl);

async function main() {
  console.log('Connecting to PocketBase at:', pbUrl);
  try {
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@buonme.com';
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'BuonMeFarm2026!';
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as superuser successfully.');

    // Fetch all farms
    const farms = await pb.collection('farms').getFullList();
    console.log(`\n📋 Total Farms found: ${farms.length}`);

    // Fetch ALL trees in PocketBase
    const allTrees = await pb.collection('trees').getFullList();
    console.log(`🌳 Total Trees in DB: ${allTrees.length}`);

    // Fetch ALL zones in PocketBase
    const allZones = await pb.collection('zones').getFullList();
    console.log(`📍 Total Zones in DB: ${allZones.length}`);

    // Fetch ALL photos in PocketBase
    const allPhotos = await pb.collection('photos').getFullList({ requestKey: null });
    console.log(`📷 Total Photos in DB: ${allPhotos.length}`);

    // Map counts by farm ID
    const farmTreeCounts: Record<string, number> = {};
    const farmZoneCounts: Record<string, number> = {};

    allTrees.forEach(t => {
      const fId = t.farm;
      farmTreeCounts[fId] = (farmTreeCounts[fId] || 0) + 1;
    });

    allZones.forEach(z => {
      const fId = z.farm;
      farmZoneCounts[fId] = (farmZoneCounts[fId] || 0) + 1;
    });

    console.log('\n--- Farm details and counts ---');
    farms.forEach(f => {
      const treesCount = farmTreeCounts[f.id] || 0;
      const zonesCount = farmZoneCounts[f.id] || 0;
      console.log(`Farm: "${f.name}" (ID: ${f.id})`);
      console.log(`  - Trees: ${treesCount}`);
      console.log(`  - Zones: ${zonesCount}`);
    });

    if (allTrees.length > 0) {
      console.log('\nSample Tree record:', JSON.stringify(allTrees[0], null, 2));
    }
    if (allZones.length > 0) {
      console.log('\nSample Zone record:', JSON.stringify(allZones[0], null, 2));
    }

  } catch (err: any) {
    console.error('❌ Error executing check:', err.message, err.stack);
  }
}

main();
