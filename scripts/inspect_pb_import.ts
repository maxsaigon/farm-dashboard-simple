import axios from 'axios';

async function main() {
  const url = 'http://localhost:3000/_next/static/chunks/app/map/page.js';
  console.log('Fetching bundle...');
  try {
    const res = await axios.get(url);
    const content = res.data;

    // Search for pocketbase imports in webpack
    const searchStr = 'pocketbase';
    let idx = 0;
    console.log('Searching for pocketbase references:');
    while (true) {
      idx = content.indexOf(searchStr, idx);
      if (idx === -1) break;
      console.log(`- Position ${idx}:`);
      console.log(content.substring(idx - 100, idx + 100));
      idx += searchStr.length;
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
