import axios from 'axios';

async function main() {
  try {
    const response = await axios.get('http://127.0.0.1:9222/json/list');
    console.log('Chrome targets:', JSON.stringify(response.data, null, 2));
  } catch (err: any) {
    console.error('Error connecting to Chrome remote debug port:', err.message);
  }
}

main();
