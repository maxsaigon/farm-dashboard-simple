import axios from 'axios';

async function main() {
  const url = 'http://localhost:3000/_next/static/chunks/app/map/page.js';
  console.log('Fetching bundle from:', url);
  try {
    const res = await axios.get(url);
    const content = res.data;
    console.log('Bundle size:', content.length, 'bytes');

    const hasPb = content.includes('pb.collection') || content.includes('.collection("trees")') || content.includes('trees0000000');
    const hasDb = content.includes('db,') || content.includes('\"collection\"') || content.includes('\"getDocs\"');
    const hasFirebase = content.includes('firebase');

    console.log('Bundle analysis:');
    console.log('  - Contains PocketBase patterns (pb.collection):', hasPb);
    console.log('  - Contains Firestore patterns (db, getDocs):', hasDb);
    console.log('  - Contains "firebase" keyword:', hasFirebase);

    // Let's print some occurrences of loadTrees or Firestore
    const idx = content.indexOf('loadTrees');
    if (idx !== -1) {
      console.log('\nFound "loadTrees" snippet:');
      console.log(content.substring(idx - 100, idx + 400));
    } else {
      console.log('\n"loadTrees" not found in bundle.');
    }

    const idx2 = content.indexOf('loadData');
    if (idx2 !== -1) {
      console.log('\nFound "loadData" snippet:');
      console.log(content.substring(idx2 - 100, idx2 + 400));
    }

  } catch (err: any) {
    console.error('Error fetching bundle:', err.message);
  }
}

main();
