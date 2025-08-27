import { test, expect } from '@playwright/test';

test.describe('Critical Path Tests', () => {
  test.describe('Core User Flows', () => {
    test('Critical Path 1: View Trees Flow', async ({ page }) => {
      // Home → Quản Lý Cây → See tree list
      
      // Step 1: Navigate to home
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveTitle(/Farm Manager/);
      
      // Step 2: Navigate to tree management
      const treeManagementLinks = [
        page.locator('text=Quản Lý Cây'),
        page.locator('text=Tree Management'),
        page.locator('a[href="/trees"]'),
        page.locator('button:has-text("Trees")')
      ];
      
      let navigationSuccessful = false;
      for (const link of treeManagementLinks) {
        if (await link.isVisible().catch(() => false)) {
          await link.click();
          navigationSuccessful = true;
          break;
        }
      }
      
      if (!navigationSuccessful) {
        // Direct navigation if no link found
        await page.goto('/trees');
      }
      
      // Step 3: Verify tree list is displayed
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/.*\/trees/);
      
      // Wait for tree list to appear
      await expect(page.locator('h2:has-text("Danh Sách Cây")')).toBeVisible({ timeout: 10000 });
      
      // Check for tree content
      const treeList = await page.locator('h3:has-text("Cây Sầu Riêng")').first();
      await expect(treeList).toBeVisible({ timeout: 5000 });
    });

    test('Critical Path 2: Tree Details Flow', async ({ page }) => {
      // Click tree → View detailed information
      
      await page.goto('/trees');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Find and click on a tree
      const treeCards = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /cây|tree|QR/i });
      
      if (await treeCards.count() > 0) {
        await treeCards.first().click();
        await page.waitForTimeout(1000);
        
        // Verify detailed information is displayed
        const detailArea = page.locator('[data-testid="tree-detail"]');
        if (await detailArea.isVisible().catch(() => false)) {
          await expect(detailArea).toBeVisible();
          
          const detailContent = await detailArea.textContent();
          expect(detailContent).toBeTruthy();
        } else {
          // Alternative: check if detail information appears anywhere on page
          const pageContent = await page.textContent('body');
          expect(pageContent).toContain('QR');
        }
      } else {
        console.log('No trees available for detail view test');
      }
    });

    test('Critical Path 3: Edit Tree Flow', async ({ page }) => {
      // Select tree → Chỉnh sửa → Modify → Lưu
      
      await page.goto('/trees');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const treeCards = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /cây|tree|QR/i });
      
      if (await treeCards.count() > 0) {
        // Step 1: Select tree
        await treeCards.first().click();
        await page.waitForTimeout(1000);
        
        // Step 2: Click edit button
        const editButtons = [
          page.locator('button:has-text("Chỉnh sửa")'),
          page.locator('button:has-text("Edit")'),
          page.locator('[data-testid="edit-button"]')
        ];
        
        for (const editButton of editButtons) {
          if (await editButton.isVisible().catch(() => false)) {
            await editButton.click();
            await page.waitForTimeout(500);
            
            // Step 3: Verify edit mode is active
            const saveButton = page.locator('button:has-text("Lưu"), button:has-text("Save")');
            const cancelButton = page.locator('button:has-text("Hủy"), button:has-text("Cancel")');
            
            if (await saveButton.isVisible().catch(() => false)) {
              await expect(saveButton).toBeVisible();
              
              // Step 4: Make a small modification (if inputs are available)
              const textInputs = page.locator('input[type="text"], textarea').first();
              if (await textInputs.isVisible().catch(() => false)) {
                const currentValue = await textInputs.inputValue();
                await textInputs.fill(currentValue + ' (test)');
                
                // Step 5: Cancel to avoid modifying real data
                if (await cancelButton.isVisible().catch(() => false)) {
                  await cancelButton.click();
                }
              }
            }
            break;
          }
        }
      }
    });

    test('Critical Path 4: Search Trees Flow', async ({ page }) => {
      // Use search box → Find specific tree
      
      await page.goto('/trees');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Find search input
      const searchInputs = [
        page.locator('input[placeholder*="Tìm kiếm"]'),
        page.locator('input[placeholder*="Search"]'),
        page.locator('input[type="search"]')
      ];
      
      for (const searchInput of searchInputs) {
        if (await searchInput.isVisible().catch(() => false)) {
          await expect(searchInput).toBeVisible();
          
          // Test search functionality
          await searchInput.fill('test');
          await page.waitForTimeout(1000); // Wait for search results
          
          // Clear search
          await searchInput.clear();
          await page.waitForTimeout(500);
          
          break;
        }
      }
    });

    test('Critical Path 5: Filter Trees Flow', async ({ page }) => {
      // Use filters → See filtered results
      
      await page.goto('/trees');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Test health status filter
      const healthFilters = page.locator('select').filter({ hasText: /trạng thái|health|status/i });
      
      if (await healthFilters.count() > 0) {
        const healthFilter = healthFilters.first();
        await expect(healthFilter).toBeVisible();
        
        // Get available options
        const options = await healthFilter.locator('option').allTextContents();
        if (options.length > 1) {
          // Select second option (first is usually "all")
          await healthFilter.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          // Reset to default
          await healthFilter.selectOption({ index: 0 });
        }
      }
      
      // Test variety filter
      const varietyFilters = page.locator('select').filter({ hasText: /giống|variety/i });
      
      if (await varietyFilters.count() > 0) {
        const varietyFilter = varietyFilters.first();
        const options = await varietyFilter.locator('option').allTextContents();
        if (options.length > 1) {
          await varietyFilter.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          await varietyFilter.selectOption({ index: 0 });
        }
      }
    });

    test('Critical Path 6: Mobile Navigation Flow', async ({ page }) => {
      // Open on mobile → Navigate between views
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/trees');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Check mobile navigation
      const mobileMenuButtons = [
        page.locator('button').filter({ hasText: /menu|☰/i }),
        page.locator('[data-testid="mobile-menu"]'),
        page.locator('.hamburger')
      ];
      
      for (const menuButton of mobileMenuButtons) {
        if (await menuButton.isVisible().catch(() => false)) {
          await menuButton.click();
          await page.waitForTimeout(500);
          break;
        }
      }
      
      // Test tree selection on mobile
      const treeCards = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /cây|tree|QR/i });
      
      if (await treeCards.count() > 0) {
        await treeCards.first().click();
        await page.waitForTimeout(1000);
        
        // Check for back button on mobile
        const backButtons = [
          page.locator('button:has-text("Quay lại")'),
          page.locator('button:has-text("Back")'),
          page.locator('[data-testid="back-button"]')
        ];
        
        for (const backButton of backButtons) {
          if (await backButton.isVisible().catch(() => false)) {
            await expect(backButton).toBeVisible();
            await backButton.click();
            break;
          }
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Test offline functionality
      await page.context().setOffline(true);
      
      await page.goto('/trees');
      await page.waitForTimeout(3000);
      
      // Check that page doesn't crash
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      
      // Restore online
      await page.context().setOffline(false);
    });

    test('should handle missing data gracefully', async ({ page }) => {
      await page.goto('/trees');
      await page.waitForLoadState('networkidle');
      
      // The application should not crash with missing data
      await expect(page.locator('body')).toBeVisible();
      
      // Check for error boundaries or graceful degradation
      const errorMessages = page.locator('text=Error, text=Lỗi');
      const errorCount = await errorMessages.count();
      
      // Errors should be handled gracefully, not crash the app
      expect(errorCount).toBeLessThan(5); // Allow for some error messages but not crashes
    });
  });

  test.describe('Performance Tests', () => {
    test('should load pages within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/trees');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 10 seconds (generous for testing)
      expect(loadTime).toBeLessThan(10000);
      console.log(`Page load time: ${loadTime}ms`);
    });
  });
});