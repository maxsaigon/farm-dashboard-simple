import { chromium, devices } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'Design', 'V1');
const FINAL_VIDEO_PATH = path.join(OUTPUT_DIR, 'app-walkthrough.webm');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log('🚀 Starting Walkthrough Video Recording Script...');

  // Ensure directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created directory: ${OUTPUT_DIR}`);
  }

  const iphone = devices['iPhone 12'];
  const browser = await chromium.launch({
    headless: false, // Run in headful mode so the user can log in and see the actions
    args: ['--disable-web-security']
  });

  // Setup context with video recording enabled
  const context = await browser.newContext({
    ...iphone,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    geolocation: { latitude: 10.762622, longitude: 106.660172 },
    permissions: ['geolocation'],
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 390, height: 844 } // Match iPhone 12 viewport size
    }
  });

  const page = await context.newPage();

  // Helper to remove Dev Tools floating button so video is clean
  const hideDevTools = async () => {
    try {
      await page.evaluate(() => {
        const devTools = document.querySelector('.fixed.bottom-6.right-6');
        if (devTools) devTools.remove();
        const demoIndicator = document.querySelector('.bg-yellow-500.text-white');
        if (demoIndicator && demoIndicator.textContent?.includes('Demo')) {
          demoIndicator.remove();
        }
      });
    } catch (e) {}
  };

  const slowScroll = async (selector: string, distance: number, steps: number, delayMs: number) => {
    try {
      await page.evaluate(({ sel, dist, st, dl }) => {
        const el = document.querySelector(sel);
        if (!el) return;
        let current = 0;
        const stepDist = dist / st;
        const interval = setInterval(() => {
          el.scrollBy(0, stepDist);
          current += 1;
          if (current >= st) {
            clearInterval(interval);
          }
        }, dl);
      }, { sel: selector, dist: distance, st: steps, dl: delayMs });
      await page.waitForTimeout(steps * delayMs + 100);
    } catch (e) {}
  };

  try {
    // 1. Open Login Screen
    console.log('👉 Navigating to Login Page...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    await page.waitForTimeout(2000); // Let viewer read the login page

    console.log('\n=============================================================');
    console.log('⚠️  MANUAL LOGIN REQUIRED');
    console.log('   Please log in using the Chromium browser window that opened.');
    console.log('   Once you are successfully logged in and see the dashboard map,');
    console.log('   return to this terminal and press ENTER to start the automated walkthrough.');
    console.log('=============================================================\n');
    
    await askQuestion('Press ENTER here after you have logged in: ');
    await hideDevTools();
    
    console.log('⏳ Waiting for authentication flow to complete and session to be established...');
    
    // Wait for URL to leave login page
    try {
      await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 10000 });
      console.log('✅ Successfully left login page.');
    } catch (e) {
      console.log('⚠️ Timeout waiting to leave login page. Current URL:', page.url());
    }
    
    // Wait for auth guards and loading overlays to finish rendering
    try {
      await page.waitForFunction(() => {
        const text = document.body.innerText;
        return !text.includes('Đang chuyển đến') && 
               !text.includes('Đang kiểm tra') && 
               !text.includes('Đang chọn') && 
               !text.includes('Loading: true');
      }, { timeout: 15000 });
      console.log('✅ Authentication states and loading screen resolved.');
    } catch (e) {
      console.log('⚠️ Timeout waiting for loading states to resolve.');
    }
    
    await page.waitForTimeout(3000); // 3-second buffer to let React state and Map render fully
    await hideDevTools();

    // 2. Select Farm Page (Check if redirected or navigate manually to show selection)
    if (page.url().includes('/select-farm')) {
      console.log('👉 Currently on Select Farm page, waiting for selection...');
      await page.waitForTimeout(2000);
      const farmCard = page.locator('.border-2').first();
      if (await farmCard.isVisible()) {
        await farmCard.click({ force: true });
        await page.waitForTimeout(1000);
        const submitBtn = page.locator('button:has-text("Vào Nông Trại"), button:has-text("Vào"), button:has-text("Confirm")').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click({ force: true });
        }
      }
      await page.waitForURL('**/map', { timeout: 10000 });
    }

    // 3. Map Dashboard Page Walkthrough
    console.log('👉 Walkthrough: Map Dashboard...');
    await page.goto(`${BASE_URL}/map`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    
    try {
      await page.waitForSelector('.maplibregl-canvas', { timeout: 10000 });
      console.log('✅ Maplibre Map Container loaded.');
    } catch (e) {
      console.log('⚠️ Maplibre Map container did not load or timed out.');
    }

    await page.waitForTimeout(2000);

    // Toggle Trees off
    console.log('👆 Toggling off trees...');
    const treeToggle = page.locator('button:has-text("Cây")').first();
    if (await treeToggle.isVisible()) {
      await treeToggle.click({ force: true });
      await page.waitForTimeout(1500);
      // Toggle back on
      console.log('👆 Toggling trees back on...');
      await treeToggle.click({ force: true });
      await page.waitForTimeout(1500);
    }

    // Toggle Zones off
    console.log('👆 Toggling off zones...');
    const zoneToggle = page.locator('button:has-text("Khu")').first();
    if (await zoneToggle.isVisible()) {
      await zoneToggle.click({ force: true });
      await page.waitForTimeout(1500);
      // Toggle back on
      console.log('👆 Toggling zones back on...');
      await zoneToggle.click({ force: true });
      await page.waitForTimeout(1500);
    }

    // Open Advanced settings panel
    console.log('👆 Opening Advanced Settings...');
    const settingsBtn = page.locator('button[title="Cài đặt"], button:has-text("Cài đặt")').first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click({ force: true });
      await page.waitForTimeout(1500);
      
      // Toggle Map layer to Street
      console.log('👆 Switching map to Street layer...');
      const streetBtn = page.locator('button:has-text("đường phố"), button:has-text("Street")').first();
      if (await streetBtn.isVisible()) {
        await streetBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }

      // Close settings
      console.log('👆 Closing Advanced Settings...');
      await settingsBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Open On-Farm Work Mode
    console.log('👆 Opening On-farm Work Mode...');
    const workModeBtn = page.locator('button:has-text("Làm việc"), button:has-text("Work")').first();
    if (await workModeBtn.isVisible()) {
      await workModeBtn.click({ force: true });
      await page.waitForTimeout(2500); // Wait for work mode to initialize

      // Trigger GPS Calibration
      console.log('👆 Triggering GPS Calibration...');
      const calibrateBtn = page.locator('button:has-text("Calibrate"), button:has-text("Hiệu chuẩn"), button:has-text("Độ chính xác")').first();
      if (await calibrateBtn.isVisible()) {
        await calibrateBtn.click({ force: true });
        await page.waitForTimeout(3000); // Let the calibration progress bar display
      }

      // Exit Work Mode
      console.log('👆 Exiting Work Mode...');
      const exitWorkBtn = page.locator('button:has-text("Đóng"), button:has-text("Thoát"), button:has-text("Close")').first();
      if (await exitWorkBtn.isVisible()) {
        await exitWorkBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }
    }

    // 4. Trees List Page Walkthrough
    console.log('👉 Navigating to /trees page...');
    await page.goto(`${BASE_URL}/trees`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    await page.waitForTimeout(4000); // Increased wait time for trees to populate from Firestore

    // Scroll the tree list
    console.log('📜 Scrolling tree list...');
    await slowScroll('.overflow-y-auto, div.h-full.overflow-y-auto', 300, 10, 100);
    await page.waitForTimeout(2000);

    // Open Tree Detail via click
    console.log('👆 Selecting a tree card from list...');
    const treeCard = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /Cây|cây|QR/ }).first();
    if (await treeCard.isVisible()) {
      await treeCard.click({ force: true });
      await page.waitForTimeout(4000); // Increased wait for bottom sheet details to stream
      
      // Scroll tree detail bottom sheet (using unique overscroll class to avoid scrolling background list)
      console.log('📜 Scrolling tree detail BottomSheet...');
      await slowScroll('.overscroll-behavior-contain', 350, 10, 120);
      await page.waitForTimeout(2000);

      // Close Tree Detail BottomSheet
      console.log('👆 Closing BottomSheet...');
      const backBtn = page.locator('button:has-text("Quay lại"), button:has-text("Back"), [data-testid="back-button"]').first();
      if (await backBtn.isVisible()) {
        await backBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }
    }

    // Direct link to specific Tree View (simulating QR scanner redirect or deep link)
    console.log('👉 Navigating directly to specific Tree View URL (QR flow)...');
    const specificTreeUrl = `/trees/view/50194978-BD18-48AB-8EC4-200EFEB90F40?farm=F210C3FC-F191-4926-9C15-58D6550A716A&qr=DURIAN_Z00_1754985978_50194978`;
    await page.goto(`${BASE_URL}${specificTreeUrl}`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    await page.waitForTimeout(5000); // 5s wait to stream specific tree details

    console.log('📜 Scrolling specific tree details...');
    await slowScroll('.overscroll-behavior-contain', 450, 15, 120);
    await page.waitForTimeout(2500);

    // Click Edit on specific tree detail
    console.log('👆 Clicking Edit on specific tree...');
    const specificEditBtn = page.locator('button:has-text("Chỉnh sửa"), button:has-text("Edit")').first();
    if (await specificEditBtn.isVisible()) {
      await specificEditBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Modify manual count field
      console.log('✍️ Modifying fruit count to 48...');
      const countInput = page.locator('input[type="number"], input[name="manualFruitCount"]').first();
      if (await countInput.isVisible()) {
        await countInput.click({ force: true });
        await countInput.fill('48');
        await page.waitForTimeout(2000);
      }

      // Save tree changes
      console.log('👆 Saving changes...');
      const saveBtn = page.locator('button:has-text("Lưu"), button:has-text("Save")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click({ force: true });
        await page.waitForTimeout(3500); // Wait for save mutation & toast to display clearly
      }
    }

    // Close specific Tree View to return
    console.log('👆 Closing specific tree detail...');
    const specificBackBtn = page.locator('button:has-text("Quay lại"), button:has-text("Back"), [data-testid="back-button"]').first();
    if (await specificBackBtn.isVisible()) {
      await specificBackBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // 5. Zones Page Walkthrough
    console.log('👉 Navigating to /zones page...');
    await page.goto(`${BASE_URL}/zones`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    await page.waitForTimeout(2000);
    await slowScroll('.overflow-y-auto', 200, 5, 100);
    await page.waitForTimeout(1000);

    // 6. Admin Zones Page Walkthrough
    console.log('👉 Navigating to /admin-zones page...');
    await page.goto(`${BASE_URL}/admin-zones`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    await page.waitForTimeout(3000); // Map loading

    // 7. Camera Page Walkthrough
    console.log('👉 Navigating to /camera page...');
    await page.goto(`${BASE_URL}/camera`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    await page.waitForTimeout(3000); // Simulate camera opening

    // 8. Money (Financial) Page Walkthrough
    console.log('👉 Navigating to /money page...');
    await page.goto(`${BASE_URL}/money`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    await page.waitForTimeout(2000);
    
    // Toggle Summary View
    console.log('👆 Toggling summary charts view...');
    const summaryBtn = page.locator('button:has-text("Biểu đồ"), button:has-text("Thống kê"), button:has-text("Summary")').first();
    if (await summaryBtn.isVisible()) {
      await summaryBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }
    
    await slowScroll('.overflow-y-auto', 300, 10, 100);
    await page.waitForTimeout(1500);

    // 9. Admin Page Walkthrough (Super Admin)
    console.log('👉 Navigating to Super Admin /admin page...');
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('domcontentloaded');
    await hideDevTools();
    await page.waitForTimeout(2500);

    // Users Tab
    console.log('👆 Navigating to Members tab...');
    const usersBtn = page.locator('nav button:has-text("Người dùng"), button:has-text("Thành viên")').first();
    if (await usersBtn.isVisible()) {
      await usersBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // Farms Tab
    console.log('👆 Navigating to Farms tab...');
    const farmsBtn = page.locator('nav button:has-text("Nông trại"), button:has-text("Farms")').first();
    if (await farmsBtn.isVisible()) {
      await farmsBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // Roles Tab
    console.log('👆 Navigating to Roles/Permissions tab...');
    const rolesBtn = page.locator('nav button:has-text("Phân quyền"), button:has-text("Permissions")').first();
    if (await rolesBtn.isVisible()) {
      await rolesBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // Settings Tab
    console.log('👆 Navigating to Settings tab...');
    const adminSettingsBtn = page.locator('nav button:has-text("Cài đặt"), button:has-text("Hệ thống")').first();
    if (await adminSettingsBtn.isVisible()) {
      await adminSettingsBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }

    console.log('🎉 Automated walkthrough recording sequence complete!');
  } catch (error) {
    console.error('❌ Error during walkthrough recording:', error);
  } finally {
    rl.close();
    
    // Get the path of the recorded video before closing browser
    const video = page.video();
    let videoPath = '';
    if (video) {
      videoPath = await video.path();
      console.log(`🎥 Recorded temporary video file: ${videoPath}`);
    }
    
    await context.close();
    await browser.close();
    console.log('👋 Browser closed.');

    // Rename the video file to target path
    if (videoPath && fs.existsSync(videoPath)) {
      try {
        fs.renameSync(videoPath, FINAL_VIDEO_PATH);
        console.log(`🎬 Saved final video walkthrough to: docs/Design/V1/app-walkthrough.webm`);
      } catch (err) {
        console.error('❌ Error renaming video file:', err);
        // Fallback: Copy file
        try {
          fs.copyFileSync(videoPath, FINAL_VIDEO_PATH);
          fs.unlinkSync(videoPath);
          console.log(`🎬 Saved final video walkthrough to: docs/Design/V1/app-walkthrough.webm (via copy)`);
        } catch (copyErr) {
          console.error('❌ Fallback copy failed:', copyErr);
        }
      }
    } else {
      console.log('⚠️ Could not locate the recorded video file.');
    }
  }
}

main().catch(console.error);
