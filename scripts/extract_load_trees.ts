import axios from 'axios';

async function main() {
  const url = 'http://localhost:3000/_next/static/chunks/app/map/page.js';
  console.log('Fetching bundle...');
  try {
    const res = await axios.get(url);
    const content = res.data;

    // Search for loadTrees function
    const startIdx = content.indexOf('loadTrees =');
    if (startIdx !== -1) {
      console.log('--- loadTrees function in bundle ---');
      console.log(content.substring(startIdx, startIdx + 1500));
    } else {
      console.log('Could not find "loadTrees =" in bundle. Searching "loadTrees" general context:');
      const idx = content.indexOf('loadTrees');
      if (idx !== -1) {
        console.log(content.substring(idx - 100, idx + 1000));
      }
    }

    // Search for loadZones function
    const startIdx2 = content.indexOf('loadZones =');
    if (startIdx2 !== -1) {
      console.log('\n--- loadZones function in bundle ---');
      console.log(content.substring(startIdx2, startIdx2 + 1500));
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
