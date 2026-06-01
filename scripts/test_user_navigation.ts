import { chromium } from 'playwright';

async function main() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const page = browser.contexts()[0].pages()[0];
    
    if (!page) {
      console.log('No active page found.');
      await browser.close();
      return;
    }

    console.log('Active page found:', page.url());

    // Disable caching via CDP session
    const session = await page.context().newCDPSession(page);
    await session.send('Network.clearBrowserCache');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    console.log('Browser cache cleared and disabled.');

    // Listeners for logs
    page.on('console', msg => {
      console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
    });

    page.on('request', req => {
      const url = req.url();
      if (url.includes('firebase') || url.includes('firestore') || url.includes('pocketbase') || url.includes('buonme') || url.includes('api/collections')) {
        console.log(`[Network Request] [${req.method()}] ${url}`);
      }
    });

    page.on('response', res => {
      const url = res.url();
      const status = res.status();
      if (status >= 400) {
        console.log(`[Network Error] [${status}] ${res.request().method()} ${url}`);
      } else if (url.includes('firebase') || url.includes('firestore') || url.includes('pocketbase') || url.includes('buonme') || url.includes('api/collections')) {
        console.log(`[Network Response] [${status}] ${url}`);
      }
    });

    // Let's first navigate to homepage /
    console.log('\n--- Navigating to / ---');
    await page.goto('http://localhost:3000/', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 4000));

    // Next, navigate to /trees
    console.log('\n--- Navigating to /trees ---');
    await page.goto('http://localhost:3000/trees', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 4000));

    // Let's get the list of trees displayed on /trees page
    const treesCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-testid="tree-card"]').length;
    });
    console.log(`Trees displayed on /trees: ${treesCount}`);

    // Next, navigate to /map
    console.log('\n--- Navigating to /map ---');
    await page.goto('http://localhost:3000/map', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 4000));

    await browser.close();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
