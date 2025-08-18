// Comprehensive Playwright test for Firebase Storage image loading
const { chromium } = require('playwright');

async function testImageLoading() {
  console.log('🖼️  Testing Firebase Storage Image Loading with Playwright MCP...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Set longer timeout for image loading
    page.setDefaultTimeout(30000);
    
    console.log('📍 Step 1: Navigate to Trees page...');
    await page.goto('http://localhost:3000/trees');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for React hydration
    console.log('✅ Trees page loaded');
    
    console.log('\n📍 Step 2: Check TreeImagePreview components in list...');
    
    // Wait for tree cards to load
    const treeCards = page.locator('[class*="border"][class*="rounded"]');
    const cardCount = await treeCards.count();
    console.log(`✅ Found ${cardCount} tree cards`);
    
    if (cardCount > 0) {
      // Check for TreeImagePreview components (48x48px thumbnails)
      const imagePreviewElements = page.locator('.w-12.h-12');
      const previewCount = await imagePreviewElements.count();
      console.log(`✅ Found ${previewCount} image preview components`);
      
      // Test image loading in previews
      for (let i = 0; i < Math.min(previewCount, 3); i++) {
        const preview = imagePreviewElements.nth(i);
        const img = preview.locator('img');
        const imgCount = await img.count();
        
        if (imgCount > 0) {
          // Check if image has loaded
          const imgSrc = await img.getAttribute('src');
          const imgAlt = await img.getAttribute('alt');
          console.log(`✅ Tree ${i + 1} preview: Has image with src="${imgSrc ? 'loaded' : 'none'}" alt="${imgAlt}"`);
          
          // Verify image is not broken
          await page.waitForTimeout(1000);
          const naturalWidth = await img.evaluate(el => el.naturalWidth);
          const naturalHeight = await img.evaluate(el => el.naturalHeight);
          
          if (naturalWidth > 0 && naturalHeight > 0) {
            console.log(`✅ Tree ${i + 1} preview: Image loaded successfully (${naturalWidth}x${naturalHeight})`);
          } else if (imgSrc) {
            console.log(`⚠️  Tree ${i + 1} preview: Image failed to load or still loading`);
          }
        } else {
          // Check for placeholder icon
          const placeholderIcon = preview.locator('svg');
          const hasPlaceholder = await placeholderIcon.count() > 0;
          console.log(`📷 Tree ${i + 1} preview: ${hasPlaceholder ? 'Placeholder icon shown' : 'No image or icon'}`);
        }
      }
    }
    
    console.log('\n📍 Step 3: Test tree selection and ImageGallery...');
    
    // Click on first tree to open TreeDetail
    if (cardCount > 0) {
      await treeCards.first().click();
      await page.waitForTimeout(2000);
      console.log('✅ Selected first tree');
      
      // Look for ImageGallery component
      const galleryComponent = page.locator('text=Hình Ảnh Cây').first();
      const hasGallery = await galleryComponent.isVisible();
      console.log(`✅ ImageGallery component: ${hasGallery ? 'Visible' : 'Not found'}`);
      
      if (hasGallery) {
        // Check gallery tabs
        const tabButtons = page.locator('button').filter({ hasText: /Tất Cả|Chung|Sức Khỏe|Đếm Trái/ });
        const tabCount = await tabButtons.count();
        console.log(`✅ Gallery tabs found: ${tabCount}`);
        
        // Check for image grid
        const imageGrid = page.locator('.grid.grid-cols-2, .grid.grid-cols-3, .grid.grid-cols-4');
        const hasGrid = await imageGrid.isVisible();
        console.log(`✅ Image grid: ${hasGrid ? 'Visible' : 'Not visible'}`);
        
        if (hasGrid) {
          // Count images in gallery
          const galleryImages = imageGrid.locator('img');
          const galleryImgCount = await galleryImages.count();
          console.log(`✅ Images in gallery: ${galleryImgCount}`);
          
          // Test a few images
          for (let i = 0; i < Math.min(galleryImgCount, 3); i++) {
            const galleryImg = galleryImages.nth(i);
            const src = await galleryImg.getAttribute('src');
            const loading = await galleryImg.getAttribute('loading');
            
            console.log(`✅ Gallery image ${i + 1}: src="${src ? 'set' : 'none'}" loading="${loading}"`);
            
            // Check if image loaded
            if (src) {
              try {
                const naturalWidth = await galleryImg.evaluate(el => el.naturalWidth);
                const naturalHeight = await galleryImg.evaluate(el => el.naturalHeight);
                if (naturalWidth > 0 && naturalHeight > 0) {
                  console.log(`✅ Gallery image ${i + 1}: Loaded successfully (${naturalWidth}x${naturalHeight})`);
                } else {
                  console.log(`⚠️  Gallery image ${i + 1}: Still loading or failed`);
                }
              } catch (error) {
                console.log(`❌ Gallery image ${i + 1}: Error checking dimensions`);
              }
            }
          }
          
          // Test modal functionality
          if (galleryImgCount > 0) {
            console.log('\n📍 Step 4: Test image modal...');
            
            // Click first image to open modal
            await galleryImages.first().click();
            await page.waitForTimeout(1000);
            
            // Check if modal opened
            const modal = page.locator('.fixed.inset-0.z-50');
            const modalVisible = await modal.isVisible();
            console.log(`✅ Image modal: ${modalVisible ? 'Opened' : 'Not opened'}`);
            
            if (modalVisible) {
              // Check modal image
              const modalImage = modal.locator('img');
              const modalImgCount = await modalImage.count();
              console.log(`✅ Modal image: ${modalImgCount > 0 ? 'Present' : 'Missing'}`);
              
              if (modalImgCount > 0) {
                const modalSrc = await modalImage.getAttribute('src');
                console.log(`✅ Modal image src: ${modalSrc ? 'Set' : 'None'}`);
              }
              
              // Test navigation buttons
              const prevButton = modal.locator('button').filter({ hasText: /previous|prev/ });
              const nextButton = modal.locator('button').filter({ hasText: /next/ });
              const prevVisible = await prevButton.isVisible().catch(() => false);
              const nextVisible = await nextButton.isVisible().catch(() => false);
              console.log(`✅ Modal navigation: Previous=${prevVisible} Next=${nextVisible}`);
              
              // Test close button
              const closeButton = modal.locator('button', { hasText: /close|×/ }).or(modal.locator('svg'));
              await closeButton.first().click();
              await page.waitForTimeout(500);
              
              const modalClosed = !(await modal.isVisible().catch(() => true));
              console.log(`✅ Modal close: ${modalClosed ? 'Working' : 'Failed'}`);
            }
          }
        } else {
          // Check for empty state
          const emptyState = page.locator('text*="Chưa có hình ảnh"');
          const hasEmptyState = await emptyState.isVisible();
          console.log(`📷 Gallery empty state: ${hasEmptyState ? 'Shown' : 'Not shown'}`);
        }
      }
    }
    
    console.log('\n📍 Step 5: Test image loading errors and fallbacks...');
    
    // Test console errors for failed image loads
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('image')) {
        errors.push(msg.text());
      }
    });
    
    // Test network failures
    page.on('response', response => {
      if (response.url().includes('firebase') && response.status() >= 400) {
        console.log(`⚠️  Network error: ${response.status()} for ${response.url()}`);
      }
    });
    
    // Reload page to catch any loading errors
    await page.reload();
    await page.waitForTimeout(3000);
    
    if (errors.length > 0) {
      console.log(`⚠️  Image loading errors detected: ${errors.length}`);
      errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    } else {
      console.log('✅ No image loading errors detected');
    }
    
    console.log('\n📍 Step 6: Test responsive image behavior...');
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const mobileImagePreviews = page.locator('.w-12.h-12');
    const mobilePreviewCount = await mobileImagePreviews.count();
    console.log(`✅ Mobile view image previews: ${mobilePreviewCount}`);
    
    // Test tablet view  
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    const tabletImagePreviews = page.locator('.w-12.h-12');
    const tabletPreviewCount = await tabletImagePreviews.count();
    console.log(`✅ Tablet view image previews: ${tabletPreviewCount}`);
    
    // Back to desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    
    console.log('\n📍 Step 7: Performance and loading metrics...');
    
    // Measure page load performance
    const navigationTiming = await page.evaluate(() => JSON.stringify(window.performance.timing));
    const timing = JSON.parse(navigationTiming);
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    console.log(`✅ Page load time: ${loadTime}ms`);
    
    // Count total images on page
    const allImages = page.locator('img');
    const totalImages = await allImages.count();
    console.log(`✅ Total images on page: ${totalImages}`);
    
    // Check for lazy loading
    const lazyImages = page.locator('img[loading="lazy"]');
    const lazyCount = await lazyImages.count();
    console.log(`✅ Lazy loaded images: ${lazyCount}`);
    
    console.log('\n🎉 Image Loading Test Completed Successfully!');
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'image-loading-test-result.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved as image-loading-test-result.png');
    
  } catch (error) {
    console.error('❌ Image loading test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: 'image-loading-test-error.png', 
      fullPage: true 
    });
    console.log('📸 Error screenshot saved');
    
  } finally {
    await browser.close();
  }
}

// Run the test
testImageLoading().catch(console.error);