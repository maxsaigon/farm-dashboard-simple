import { chromium, devices } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'Design', 'V1');

// Setup readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log('🚀 Starting Screenshot Capture Script...');
  
  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    console.log(`📁 Created directory: ${SCREENSHOT_DIR}`);
  }

  // Device configuration matching Mobile Safari / iPhone
  const iphone = devices['iPhone 12'];
  
  // Determine if we run headless or not
  const email = process.env.PLAYWRIGHT_EMAIL || '';
  const password = process.env.PLAYWRIGHT_PASSWORD || '';
  
  const isAutomated = email !== '' && password !== '';
  const headless = isAutomated; // Headless if we can log in automatically, otherwise show browser

  console.log(`🔧 Mode: ${isAutomated ? 'Automated' : 'Interactive (Manual Login Required)'}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);

  // Launch browser
  const browser = await chromium.launch({
    headless: headless,
    args: ['--disable-web-security'] // To prevent CORS issues if any
  });

  const context = await browser.newContext({
    ...iphone,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    geolocation: { latitude: 10.762622, longitude: 106.660172 },
    permissions: ['geolocation']
  });

  const page = await context.newPage();
  
  // Helper to remove Dev Tools floating button so screenshots look clean and clicks aren't blocked
  const hideDevTools = async () => {
    try {
      await page.evaluate(() => {
        // Remove local test harness button
        const devTools = document.querySelector('.fixed.bottom-6.right-6');
        if (devTools) devTools.remove();
        
        // Remove demo mode indicator if it gets in the way
        const demoIndicator = document.querySelector('.bg-yellow-500.text-white');
        if (demoIndicator && demoIndicator.textContent?.includes('Demo')) {
          demoIndicator.remove();
        }
      });
    } catch (e) {
      // Ignore errors if elements don't exist yet
    }
  };

  // Helper to take a screenshot and log it
  const takeScreenshot = async (name: string, delayMs = 1500) => {
    await hideDevTools();
    console.log(`⏳ Waiting ${delayMs}ms before capturing: ${name}...`);
    await page.waitForTimeout(delayMs);
    await hideDevTools(); // Ensure it remains hidden after delay
    const filePath = path.join(SCREENSHOT_DIR, name);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`📸 Saved: docs/Design/V1/${name}`);
  };

  const navigateTo = async (urlPath: string) => {
    console.log(`👉 Navigating to ${urlPath}...`);
    await page.goto(`${BASE_URL}${urlPath}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Allow react state to render
    await hideDevTools();
  };

  try {
    // 1. Capture Login Page
    console.log('👉 Navigating to Login Page...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await takeScreenshot('01_login.png');

    // Perform Authentication
    if (isAutomated) {
      console.log(`🔐 Logging in automatically as: ${email}...`);
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]', { force: true });
      console.log('⏳ Waiting for authentication redirection...');
      await page.waitForURL(`${BASE_URL}/`);
    } else {
      console.log('\n=============================================================');
      console.log('⚠️  MANUAL LOGIN REQUIRED');
      console.log('   Please log in using the Chromium browser window that opened.');
      console.log('   Once you are successfully logged in and see the dashboard map,');
      console.log('   return to this terminal and press ENTER to continue.');
      console.log('=============================================================\n');
      await askQuestion('Press ENTER here after you have logged in: ');
    }

    // 2. Capture No-Access Page
    await navigateTo('/no-access');
    await takeScreenshot('02_no_access.png');

    // 3. Capture Select Farm Page (if it's accessible or has multiple farms)
    await navigateTo('/select-farm');
    await takeScreenshot('03_select_farm.png');

    // 4. Capture Main Dashboard / Map Page
    console.log('👉 Navigating to Dashboard Map...');
    await page.goto(`${BASE_URL}/map`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    // Wait for the map element to render
    try {
      await page.waitForSelector('.leaflet-container', { timeout: 5000 });
      console.log('🗺️ Map container found!');
    } catch (e) {
      console.log('⚠️ Leaflet map container not found or slow to load.');
    }
    await takeScreenshot('04_dashboard_map.png', 3000);

    // 5. Capture Zones Page
    await navigateTo('/zones');
    await takeScreenshot('05_zones.png');

    // 6. Capture Admin Zones Page
    await navigateTo('/admin-zones');
    await takeScreenshot('06_admin_zones.png');

    // 7. Capture Trees List Page
    await navigateTo('/trees');
    // Wait for data to load from Firestore (which can take a few seconds)
    console.log('⏳ Waiting for tree cards to load from Firestore...');
    try {
      await page.waitForSelector('[data-testid="tree-card"], .border, .rounded', { timeout: 6000 });
      console.log('🌳 Tree cards loaded successfully!');
    } catch (e) {
      console.log('⚠️ Warning: Tree cards took too long to load or are empty.');
    }
    await takeScreenshot('07_trees_list.png', 1000);

    // 8. Capture Tree Detail (Clicking on first tree card)
    console.log('👉 Opening Tree Detail...');
    const treeCard = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /Cây|cây|QR/ }).first();
    if (await treeCard.isVisible()) {
      await treeCard.click({ force: true });
      await takeScreenshot('08_tree_detail.png', 2000);
      
      // Close detail view if needed (by clicking back button or tapping outside) to return to main trees state
      const backButton = page.locator('button:has-text("Quay lại"), button:has-text("Back"), [data-testid="back-button"]').first();
      if (await backButton.isVisible()) {
        await backButton.click({ force: true });
        await page.waitForTimeout(500);
      }
    } else {
      console.log('⚠️ No tree card found to click for detail view.');
    }

    // 9. Capture Camera Page
    await navigateTo('/camera');
    await takeScreenshot('09_camera.png');

    // 10. Capture Investment/Money Page
    await navigateTo('/money');
    await takeScreenshot('10_investment_money.png');

    // 11. Capture Super Admin Dashboard
    await navigateTo('/admin');
    await takeScreenshot('11_super_admin_dashboard.png');

    // 12. Capture Super Admin Users Section
    console.log('👉 Navigating to Super Admin Users section...');
    const usersButton = page.locator('nav button:has-text("Người dùng")').first();
    if (await usersButton.isVisible()) {
      await usersButton.click({ force: true });
      await takeScreenshot('12_super_admin_users.png');
    } else {
      // Fallback: visit section state via navigation if possible
      console.log('⚠️ "Người dùng" button not found. Attempting to click bottom nav grid...');
      const gridButtons = page.locator('nav button').filter({ hasText: /Người dùng|nhân viên/i }).first();
      if (await gridButtons.isVisible()) {
        await gridButtons.click({ force: true });
        await takeScreenshot('12_super_admin_users.png');
      }
    }

    // 13. Capture Super Admin Farms Section
    console.log('👉 Navigating to Super Admin Farms section...');
    const farmsButton = page.locator('nav button:has-text("Nông trại")').first();
    if (await farmsButton.isVisible()) {
      await farmsButton.click({ force: true });
      await takeScreenshot('13_super_admin_farms.png');
    }

    // 14. Capture Super Admin Roles Section
    console.log('👉 Navigating to Super Admin Roles section...');
    const rolesButton = page.locator('nav button:has-text("Phân quyền")').first();
    if (await rolesButton.isVisible()) {
      await rolesButton.click({ force: true });
      await takeScreenshot('14_super_admin_roles.png');
    }

    // 15. Capture Super Admin Settings Section
    console.log('👉 Navigating to Super Admin Settings section...');
    const settingsButton = page.locator('nav button:has-text("Cài đặt")').first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click({ force: true });
      await takeScreenshot('15_super_admin_settings.png');
    }

    console.log('\n🎉 All screenshots captured successfully!');
    console.log(`📂 Location: ${SCREENSHOT_DIR}`);
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
  } finally {
    rl.close();
    await browser.close();
    console.log('👋 Browser closed. Script finished.');
  }
}

main().catch(console.error);
