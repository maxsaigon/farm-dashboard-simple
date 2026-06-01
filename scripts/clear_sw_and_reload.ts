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

    console.log('Map page found. Clearing Service Workers and caching...');

    // Evaluate script to unregister all service workers and clear caches
    await page.evaluate(async () => {
      // 1. Unregister Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[Dev Script] Unregistered SW:', registration.scope);
        }
      }

      // 2. Clear Caches
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
          console.log('[Dev Script] Deleted cache:', key);
        }
      }

      // 3. Clear Local Storage farm cache to force reload
      localStorage.removeItem('farm_trees_634f8a11945d964');
      localStorage.removeItem('farm_zones_634f8a11945d964');
      localStorage.removeItem('farm_data_timestamp_634f8a11945d964');
      console.log('[Dev Script] Cleared local storage farm cache.');
    });

    console.log('Waiting 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));

    // Setup network and console logging
    page.on('console', msg => {
      console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
    });

    page.on('request', req => {
      const url = req.url();
      if (url.includes('firebase') || url.includes('firestore') || url.includes('pocketbase') || url.includes('buonme') || url.includes('api/collections')) {
        console.log(`[Network Request] [${req.method()}] ${url}`);
      }
    });

    console.log('Reloading page (forcing hard reload/bypass cache)...');
    // Reload bypassing cache (using location.reload(true) via page.evaluate or reload option)
    await page.reload({ waitUntil: 'load' });

    console.log('Page reloaded. Waiting 8 seconds to capture console logs and requests...');
    await new Promise(r => setTimeout(r, 8000));

    await browser.close();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
