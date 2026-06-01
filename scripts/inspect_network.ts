import { chromium } from 'playwright';

async function main() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const page = browser.contexts()[0].pages().find(p => p.url().includes('localhost:3000/map'));
    
    if (!page) {
      console.log('Map page not found.');
      await browser.close();
      return;
    }

    console.log('Map page found. Reloading and capturing all network requests...');
    
    page.on('request', req => {
      const url = req.url();
      if (url.includes('firebase') || url.includes('firestore') || url.includes('pocketbase') || url.includes('buonme') || url.includes('api/collections')) {
        console.log(`[Network Request] [${req.method()}] ${url}`);
      }
    });

    page.on('response', res => {
      const url = res.url();
      if (url.includes('firebase') || url.includes('firestore') || url.includes('pocketbase') || url.includes('buonme') || url.includes('api/collections')) {
        console.log(`[Network Response] [${res.status()}] ${url}`);
      }
    });

    await page.reload({ waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 6000));
    
    await browser.close();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
