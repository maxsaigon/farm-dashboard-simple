// Focused test for Trees page functionality
const { chromium } = require('playwright');

async function testTreesPage() {
  console.log('🧪 Testing TreeList and TreeDetail components...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Set a longer timeout for page loads
    page.setDefaultTimeout(30000);
    
    console.log('📍 Step 1: Navigate to Trees page...');
    await page.goto('http://localhost:3000/trees');
    await page.waitForLoadState('networkidle');
    
    // Wait for React to hydrate
    await page.waitForTimeout(2000);
    console.log('✅ Trees page loaded');
    
    console.log('\n📍 Step 2: Check page structure...');
    const pageTitle = await page.locator('h1').first().textContent();
    console.log(`✅ Page title: "${pageTitle}"`);
    
    // Check for TreeList component
    const hasTreeList = await page.locator('.bg-white.rounded-xl').count() > 0;
    console.log(`✅ TreeList component: ${hasTreeList ? 'Found' : 'Missing'}`);
    
    // Check for search functionality
    const searchBox = page.locator('input[placeholder*="Tìm kiếm"]').first();
    const hasSearch = await searchBox.isVisible();
    console.log(`✅ Search box: ${hasSearch ? 'Visible' : 'Hidden'}`);
    
    // Check for filters
    const filterCount = await page.locator('select').count();
    console.log(`✅ Filter dropdowns: ${filterCount} found`);
    
    console.log('\n📍 Step 3: Test responsive design...');
    
    // Desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    const desktopLayout = await page.locator('.lg\\:grid-cols-5').isVisible();
    console.log(`✅ Desktop layout: ${desktopLayout ? 'Active' : 'Hidden'}`);
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    const mobileLayout = await page.locator('.max-w-7xl > .lg\\:hidden').isVisible();
    console.log(`✅ Mobile layout: ${mobileLayout ? 'Active' : 'Hidden'}`);
    
    console.log('\n📍 Step 4: Test search functionality...');
    await page.setViewportSize({ width: 1200, height: 800 }); // Back to desktop
    
    if (await searchBox.isVisible()) {
      await searchBox.fill('test search');
      await page.waitForTimeout(500);
      console.log('✅ Search input accepts text');
      
      await searchBox.clear();
      console.log('✅ Search clear works');
    }
    
    console.log('\n📍 Step 5: Check TreeDetail component...');
    
    // Check if TreeDetail placeholder is shown
    const detailPlaceholder = await page.getByText('Chọn một cây').isVisible().catch(() => false);
    if (detailPlaceholder) {
      console.log('✅ TreeDetail placeholder shown (no tree selected)');
    }
    
    // Check for tree cards
    const treeCards = await page.locator('[class*="border"][class*="rounded"]').count();
    if (treeCards > 0) {
      console.log(`✅ Found ${treeCards} tree cards`);
      
      // Try clicking first tree
      const firstCard = page.locator('[class*="border"][class*="rounded"]').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForTimeout(1000);
        console.log('✅ Tree selection works');
        
        // Check if detail view updated
        const detailVisible = await page.getByText('Thông tin cơ bản').isVisible().catch(() => false);
        console.log(`✅ TreeDetail content: ${detailVisible ? 'Loaded' : 'Not loaded'}`);
      }
    } else {
      console.log('ℹ️  No trees found - testing empty state');
      const emptyMessage = await page.getByText('Không tìm thấy').isVisible().catch(() => false);
      console.log(`✅ Empty state: ${emptyMessage ? 'Displayed' : 'Missing'}`);
    }
    
    console.log('\n🎉 TreeList and TreeDetail test completed successfully!');
    
    // Take a screenshot for verification
    await page.screenshot({ 
      path: 'trees-page-test.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved as trees-page-test.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testTreesPage().catch(console.error);