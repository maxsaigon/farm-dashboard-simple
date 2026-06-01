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

    // Listeners for logs
    page.on('console', msg => {
      console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
    });

    console.log('Clearing service workers and cache via page evaluation...');
    await page.evaluate(async () => {
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          const success = await registration.unregister();
          console.log(`Unregistered service worker: ${registration.scope} - Success: ${success}`);
        }
      }

      // Clear all caches
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          const success = await caches.delete(key);
          console.log(`Deleted cache: ${key} - Success: ${success}`);
        }
      }

      console.log('Cleared service worker registrations and cache storage.');
    });

    console.log('Reloading page...');
    await page.reload({ waitUntil: 'load' });
    console.log('Reload complete.');

    await browser.close();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
