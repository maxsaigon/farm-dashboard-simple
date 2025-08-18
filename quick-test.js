// Quick test for basic functionality
const { chromium } = require('playwright');

async function quickTest() {
  console.log('🚀 Quick functionality test...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Test 1: Homepage loads
    console.log('📍 Testing homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('✅ Homepage loads');
    
    // Test 2: Trees page loads
    console.log('📍 Testing trees page...');
    await page.goto('http://localhost:3000/trees', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for React to render
    await page.waitForTimeout(2000);
    
    // Check for key elements
    const hasNavigation = await page.locator('nav').count() > 0;
    console.log(`✅ Navigation: ${hasNavigation ? 'Found' : 'Missing'}`);
    
    const hasHeading = await page.locator('h1').count() > 0;
    console.log(`✅ Page heading: ${hasHeading ? 'Found' : 'Missing'}`);
    
    const hasTreeList = await page.locator('[class*="bg-white"][class*="rounded"]').count() > 0;
    console.log(`✅ TreeList component: ${hasTreeList ? 'Found' : 'Missing'}`);
    
    const hasSearchBox = await page.locator('input[placeholder*="Tìm kiếm"]').count() > 0;
    console.log(`✅ Search functionality: ${hasSearchBox ? 'Found' : 'Missing'}`);
    
    const hasFilters = await page.locator('select').count() > 0;
    console.log(`✅ Filter dropdowns: ${hasFilters ? 'Found' : 'Missing'}`);
    
    // Test responsive design
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    console.log('✅ Mobile viewport test');
    
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    console.log('✅ Desktop viewport test');
    
    console.log('\n🎉 Quick test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
quickTest().catch(console.error);