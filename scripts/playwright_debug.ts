import { chromium } from 'playwright';

async function main() {
  console.log('Connecting to Chrome remote debugging port 9222...');
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} contexts.`);

    for (const context of contexts) {
      const pages = context.pages();
      for (const page of pages) {
        if (page.url().includes('localhost:3000/map')) {
          console.log(`\nFound map page. Reloading and capturing console logs for: ${page.url()}`);
          
          // Setup console listener
          page.on('console', msg => {
            console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
          });

          // Setup page error listener
          page.on('pageerror', err => {
            console.error(`[Browser Error] ${err.message}\nStack: ${err.stack}`);
          });

          // Reload the page
          await page.reload({ waitUntil: 'load' });
          console.log('Page reloaded. Waiting 8 seconds for all network requests to settle...');
          
          await new Promise(r => setTimeout(r, 8000));
          
          // Check state after reload
          const state = await page.evaluate(() => {
            const treesLen = (window as any).trees?.length;
            const zonesLen = (window as any).zones?.length;
            
            // Let's see if we can check local React state or elements
            const noDataEl = document.querySelector('h3');
            const noDataText = noDataEl ? noDataEl.textContent : 'none';

            return {
              treesLen,
              zonesLen,
              noDataText,
              html: document.body.innerHTML.substring(0, 1000)
            };
          });

          console.log('Page State:', JSON.stringify(state, null, 2));
        }
      }
    }

    await browser.close();
  } catch (err: any) {
    console.error('❌ Playwright debug failed:', err.message, err.stack);
  }
}

main();
