import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function verifyMapClicks() {
  console.log('🚀 Starting map click verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = context.pages()[0] || await context.newPage();

  // Wire up console & page errors logging
  page.on('console', msg => {
    console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.error(`[Browser PageError] ${err.message}\nStack: ${err.stack}`);
  });

  try {
    // 1. Go to Login Page
    console.log('🌐 Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'load' });
    console.log('⏳ Waiting 3s for React hydration...');
    await page.waitForTimeout(3000);

    // Verify input selectors exist
    console.log('🔍 Checking login inputs...');
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitBtn = page.locator('button[type="submit"]');

    console.log(`- Email input count: ${await emailInput.count()}`);
    console.log(`- Password input count: ${await passwordInput.count()}`);

    // 2. Perform Login
    console.log('🔑 Filling inputs...');
    await emailInput.fill('minhdai.bmt@gmail.com');
    await passwordInput.fill('test-password');

    console.log(`- Filled email: "${await emailInput.inputValue()}"`);

    // Click submit button or press Enter
    console.log('⚡ Pressing Enter on password field to submit form...');
    await passwordInput.press('Enter');
    
    console.log('⏳ Waiting for navigation after login...');
    
    // Wait up to 10 seconds for redirection
    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/select-farm' || url.pathname.includes('select-farm'), { timeout: 10000 });
    console.log('✅ Logged in successfully. Current URL:', page.url());

    // 3. Select a Farm (if needed)
    console.log('🚜 Checking farm selection...');
    if (page.url().includes('select-farm')) {
      // Wait for farm list/cards to load
      await page.waitForSelector('text=Rẫy, text=Trang Trại 1, .cursor-pointer', { timeout: 5000 });
      // Click the first farm card/list item
      await page.click('text=Rẫy');
      console.log('⏳ Waiting for navigation to dashboard...');
      await page.waitForURL((url) => url.pathname === '/', { timeout: 10000 });
      console.log('✅ Farm selected successfully.');
    }

    // 4. Navigate to Map
    console.log('🗺️ Navigating to Map page...');
    await page.goto('http://localhost:3000/map', { waitUntil: 'load' });
    await page.waitForTimeout(5000); // Allow map tiles and data to load

    // 5. Check if Map canvas and tree markers are rendered in DOM
    const mapCanvasExists = await page.locator('.maplibregl-canvas').count();
    console.log(`🗺️ MapLibre Canvas count in DOM: ${mapCanvasExists}`);
    if (mapCanvasExists === 0) {
      throw new Error('MapLibre canvas not found on /map!');
    }

    // Look for markers. Standard Markers in react-map-gl are rendered as DOM elements.
    // They are usually divs with cursor: pointer or class maplibregl-marker.
    const markers = page.locator('.maplibregl-marker');
    const markerCount = await markers.count();
    console.log(`🌳 Tree Marker elements found in DOM: ${markerCount}`);
    if (markerCount === 0) {
      throw new Error('No tree markers found on the map!');
    }

    // 6. Test Tree Click
    console.log('🎯 Attempting to click a Tree marker...');
    // Let's click the first tree marker
    const firstMarker = markers.first();
    await firstMarker.click();
    console.log('⏳ Waiting after clicking tree marker...');
    await page.waitForTimeout(3000);

    // Verify detail sidebar/panel appeared
    const showcaseExists = await page.locator('text=Thông tin cây, text=Chi tiết cây, text=Sức khỏe, text=variety, text=Trạng thái').count();
    console.log(`📋 Tree detail sidebar/panel showing match count: ${showcaseExists}`);
    
    // Print visible title if any
    const headingText = await page.evaluate(() => {
      // Look for side panels or headings
      const h3 = Array.from(document.querySelectorAll('h3, h2, h1')).map(el => el.textContent);
      return h3.filter(txt => txt && (txt.includes('Cây') || txt.includes('Chi tiết') || txt.includes('Thao tác')));
    });
    console.log('💬 Heading elements found in view:', headingText);

    if (showcaseExists > 0 || headingText.length > 0) {
      console.log('✅ SUCCESS: Clicking tree marker correctly opened tree details.');
    } else {
      console.warn('⚠️ WARNING: Tree click event did not display showcase panels. Checked DOM content.');
    }

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    const screenshotPath = '/Users/daibui/.gemini/antigravity-ide/brain/0ef792f7-6284-42bd-b0a0-476b3b16ebe3/scratch/verify_error.png';
    try {
      await page.screenshot({ path: screenshotPath });
      console.log(`📸 Saved failure screenshot to: ${screenshotPath}`);
      const textContent = await page.evaluate(() => document.body.innerText);
      console.log('📄 Current page text content:\n', textContent.substring(0, 1000));
    } catch (e: any) {
      console.error('Failed to capture screenshot/text:', e.message);
    }
  } finally {
    await browser.close();
    console.log('🏁 Verification process complete.');
  }
}

verifyMapClicks();
