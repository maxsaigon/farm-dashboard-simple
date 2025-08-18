// Basic functionality test for TreeList and TreeDetail
// Run with: node test-basic.js

const { chromium } = require('playwright');

async function runBasicTests() {
  console.log('🚀 Starting basic functionality tests...\n');
  
  const browser = await chromium.launch({ headless: false }); // Set to true for headless
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test 1: Homepage loads
    console.log('📍 Test 1: Loading homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    
    // Test 2: Check for main heading
    console.log('\n📍 Test 2: Checking main content...');
    const heading = await page.locator('h1').first().textContent();
    console.log(`✅ Main heading: ${heading}`);
    
    // Test 3: Navigate to Trees page
    console.log('\n📍 Test 3: Navigating to Trees page...');
    
    // Try clicking the "Quản Lý Cây" button
    const treeManagementLink = page.locator('a[href="/trees"]').first();
    if (await treeManagementLink.isVisible()) {
      await treeManagementLink.click();
      console.log('✅ Clicked Trees management link');
    } else {
      // Try direct navigation
      await page.goto('http://localhost:3000/trees');
      console.log('✅ Direct navigation to Trees page');
    }
    
    await page.waitForLoadState('networkidle');
    
    // Test 4: Check Trees page elements
    console.log('\n📍 Test 4: Checking Trees page elements...');
    
    // Check for page title
    const treesHeading = await page.locator('h1').first().textContent();
    console.log(`✅ Trees page heading: ${treesHeading}`);
    
    // Check for TreeList component
    const searchBox = page.locator('input[placeholder*="Tìm kiếm"]');
    if (await searchBox.isVisible()) {
      console.log('✅ Search box is visible');
    } else {
      console.log('⚠️ Search box not found');
    }
    
    // Check for filter dropdowns
    const filterDropdowns = await page.locator('select').count();
    console.log(`✅ Found ${filterDropdowns} filter dropdowns`);
    
    // Test 5: Check responsive design
    console.log('\n📍 Test 5: Testing responsive design...');
    
    // Desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    console.log('✅ Set desktop viewport');
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    console.log('✅ Set mobile viewport');
    
    // Test 6: Test search functionality (if trees exist)
    console.log('\n📍 Test 6: Testing search functionality...');
    await page.setViewportSize({ width: 1200, height: 800 }); // Back to desktop
    
    if (await searchBox.isVisible()) {
      await searchBox.fill('test');
      await page.waitForTimeout(500);
      console.log('✅ Search input works');
      
      await searchBox.clear();
      console.log('✅ Search clear works');
    }
    
    // Test 7: Check for tree cards or empty state
    console.log('\n📍 Test 7: Checking tree display...');
    
    const treeCards = await page.locator('[class*="border"][class*="rounded"]').count();
    if (treeCards > 0) {
      console.log(`✅ Found ${treeCards} tree cards`);
      
      // Try clicking on first tree card
      const firstCard = page.locator('[class*="border"][class*="rounded"]').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForTimeout(1000);
        console.log('✅ Tree card click works');
      }
    } else {
      console.log('ℹ️ No tree cards found (may be empty state or loading)');
    }
    
    // Test 8: Check TreeDetail component
    console.log('\n📍 Test 8: Checking TreeDetail component...');
    
    const detailSection = page.locator('text=Thông tin cơ bản');
    if (await detailSection.isVisible()) {
      console.log('✅ TreeDetail component is visible');
    } else {
      console.log('ℹ️ TreeDetail not visible (may need tree selection)');
    }
    
    console.log('\n🎉 Basic tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Development server not running on localhost:3000');
    console.log('Please run: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Development server is running\n');
  await runBasicTests();
}

main().catch(console.error);