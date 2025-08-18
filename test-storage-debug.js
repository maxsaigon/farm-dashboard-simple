// Debug test for Firebase Storage connection
const { chromium } = require('playwright');

async function debugStorageConnection() {
  console.log('🔍 Debugging Firebase Storage Connection...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console logs from the browser
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('firebase') || request.url().includes('storage') || request.url().includes('photo')) {
      networkRequests.push(`REQUEST: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('firebase') || response.url().includes('storage') || response.url().includes('photo')) {
      networkRequests.push(`RESPONSE: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('📍 Step 1: Navigate to Trees page...');
    await page.goto('http://localhost:3000/trees');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Wait longer for async operations
    
    console.log('📍 Step 2: Inject debug script to test Firebase Storage...');
    
    // Inject JavaScript to test Firebase Storage directly
    const storageTest = await page.evaluate(async () => {
      try {
        // Test if Firebase is available
        if (typeof window !== 'undefined' && window.firebase) {
          return { firebase: 'Available (v8)', error: null };
        }
        
        // Try to access Firebase Storage through our modules
        const results = {
          firebase: 'Not directly available',
          storage: null,
          trees: [],
          error: null
        };
        
        // Check if we can access our storage functions
        if (window.__NEXT_DATA__) {
          results.nextData = 'Available';
        }
        
        return results;
      } catch (error) {
        return { error: error.message, firebase: 'Error' };
      }
    });
    
    console.log('📍 Step 3: Storage test results...');
    console.log('✅ Firebase availability:', storageTest.firebase);
    if (storageTest.error) {
      console.log('❌ Storage error:', storageTest.error);
    }
    
    console.log('📍 Step 4: Check tree data and image paths...');
    
    // Click on first tree to trigger image loading
    const treeCards = page.locator('[class*="border"][class*="rounded"]');
    const cardCount = await treeCards.count();
    
    if (cardCount > 0) {
      // Get tree information
      const treeInfo = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="border"][class*="rounded"]');
        const trees = [];
        
        for (let i = 0; i < Math.min(cards.length, 3); i++) {
          const card = cards[i];
          const nameElement = card.querySelector('h3');
          const name = nameElement ? nameElement.textContent : 'Unknown';
          
          // Look for any data attributes or IDs
          const treeData = {
            name: name,
            hasImage: card.querySelector('img') !== null,
            hasIcon: card.querySelector('svg') !== null,
            dataAttributes: Array.from(card.attributes).map(attr => `${attr.name}="${attr.value}"`),
            innerHTML: card.innerHTML.substring(0, 200) + '...'
          };
          
          trees.push(treeData);
        }
        
        return trees;
      });
      
      console.log('✅ Tree information:');
      treeInfo.forEach((tree, i) => {
        console.log(`  Tree ${i + 1}: ${tree.name}`);
        console.log(`    Has image: ${tree.hasImage}`);
        console.log(`    Has icon: ${tree.hasIcon}`);
      });
      
      // Click first tree and wait for detail view
      console.log('📍 Step 5: Test tree detail loading...');
      await treeCards.first().click();
      await page.waitForTimeout(3000);
      
      // Check for ImageGallery component and debug its state
      const galleryDebug = await page.evaluate(() => {
        const galleryTitle = document.querySelector('*:has-text("Hình Ảnh Cây")');
        const hasGalleryTitle = galleryTitle !== null;
        
        // Look for gallery container
        const galleryContainer = document.querySelector('.bg-white.rounded-xl.shadow-lg');
        const hasGalleryContainer = galleryContainer !== null;
        
        // Look for image grid
        const imageGrid = document.querySelector('.grid.grid-cols-2, .grid.grid-cols-3, .grid.grid-cols-4');
        const hasImageGrid = imageGrid !== null;
        
        // Look for empty state
        const emptyState = document.querySelector('*:has-text("Chưa có hình ảnh")');
        const hasEmptyState = emptyState !== null;
        
        // Count any images
        const allImages = document.querySelectorAll('img');
        const imageCount = allImages.length;
        
        return {
          hasGalleryTitle,
          hasGalleryContainer, 
          hasImageGrid,
          hasEmptyState,
          imageCount,
          galleryHTML: galleryContainer ? galleryContainer.innerHTML.substring(0, 300) + '...' : 'Not found'
        };
      });
      
      console.log('✅ Gallery debug info:');
      console.log(`  Gallery title found: ${galleryDebug.hasGalleryTitle}`);
      console.log(`  Gallery container: ${galleryDebug.hasGalleryContainer}`);
      console.log(`  Image grid: ${galleryDebug.hasImageGrid}`);
      console.log(`  Empty state: ${galleryDebug.hasEmptyState}`);
      console.log(`  Total images: ${galleryDebug.imageCount}`);
    }
    
    console.log('📍 Step 6: Network activity analysis...');
    if (networkRequests.length > 0) {
      console.log('✅ Firebase/Storage network requests:');
      networkRequests.forEach(req => console.log(`  ${req}`));
    } else {
      console.log('⚠️  No Firebase/Storage network requests detected');
    }
    
    console.log('📍 Step 7: Console log analysis...');
    const relevantLogs = consoleLogs.filter(log => 
      log.includes('firebase') || 
      log.includes('storage') || 
      log.includes('photo') || 
      log.includes('image') ||
      log.includes('error')
    );
    
    if (relevantLogs.length > 0) {
      console.log('✅ Relevant console logs:');
      relevantLogs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('✅ No relevant error logs detected');
    }
    
    console.log('📍 Step 8: Environment check...');
    
    // Check if we're actually connected to Firebase
    const envCheck = await page.evaluate(() => {
      // Try to find any Firebase-related global objects
      const globals = Object.keys(window).filter(key => 
        key.toLowerCase().includes('firebase') || 
        key.toLowerCase().includes('storage')
      );
      
      return {
        globals,
        hasDocument: typeof document !== 'undefined',
        hasWindow: typeof window !== 'undefined',
        userAgent: navigator.userAgent,
        currentUrl: window.location.href
      };
    });
    
    console.log('✅ Environment check:');
    console.log(`  Current URL: ${envCheck.currentUrl}`);
    console.log(`  Firebase globals: ${envCheck.globals.length > 0 ? envCheck.globals.join(', ') : 'None'}`);
    
    // Take screenshot for visual inspection
    await page.screenshot({ 
      path: 'storage-debug-result.png', 
      fullPage: true 
    });
    console.log('📸 Debug screenshot saved as storage-debug-result.png');
    
    console.log('\n🎉 Storage Debug Test Completed!');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    
    // Show recent console logs on error
    console.log('📋 Recent console logs:');
    consoleLogs.slice(-10).forEach(log => console.log(`  ${log}`));
    
  } finally {
    await browser.close();
  }
}

// Run the debug test
debugStorageConnection().catch(console.error);