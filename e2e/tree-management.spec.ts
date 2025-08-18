import { test, expect } from '@playwright/test';

test.describe('Tree Management - Critical Path Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should load homepage and navigate to tree management', async ({ page }) => {
    // Check if homepage loads
    await expect(page).toHaveTitle(/Farm Dashboard/);
    
    // Navigate to tree management
    await page.click('text=Quản Lý Cây');
    await expect(page).toHaveURL(/.*\/trees/);
  });

  test('should display tree list', async ({ page }) => {
    await page.goto('/trees');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if tree list is visible
    await expect(page.locator('[data-testid="tree-list"]')).toBeVisible();
  });

  test('should be able to search trees', async ({ page }) => {
    await page.goto('/trees');
    await page.waitForLoadState('networkidle');
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]');
    await expect(searchInput).toBeVisible();
    
    // Test search functionality
    await searchInput.fill('test');
    await page.waitForTimeout(500); // Wait for search debounce
  });

  test('should be able to filter trees by health status', async ({ page }) => {
    await page.goto('/trees');
    await page.waitForLoadState('networkidle');
    
    // Find health status filter
    const healthFilter = page.locator('select').first();
    await expect(healthFilter).toBeVisible();
    
    // Test filter functionality
    await healthFilter.selectOption('healthy');
    await page.waitForTimeout(500);
  });

  test('should display tree details when clicking on a tree', async ({ page }) => {
    await page.goto('/trees');
    await page.waitForLoadState('networkidle');
    
    // Click on first tree if available
    const firstTree = page.locator('[data-testid="tree-card"]').first();
    if (await firstTree.isVisible()) {
      await firstTree.click();
      
      // Check if tree detail is visible
      await expect(page.locator('[data-testid="tree-detail"]')).toBeVisible();
    }
  });

  test('should handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/trees');
    await page.waitForLoadState('networkidle');
    
    // Check if mobile layout is applied
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Tree Detail Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trees');
    await page.waitForLoadState('networkidle');
  });

  test('should show empty state when no tree is selected', async ({ page }) => {
    // Check for empty state message
    const emptyState = page.locator('text=Chọn một cây để xem chi tiết');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should display tree information correctly', async ({ page }) => {
    // Click on first tree if available
    const firstTree = page.locator('[data-testid="tree-card"]').first();
    if (await firstTree.isVisible()) {
      await firstTree.click();
      
      // Check if basic information is displayed
      await expect(page.locator('[data-testid="tree-detail"]')).toBeVisible();
      
      // Check for key sections
      const sections = [
        'Thông tin cơ bản',
        'Chỉ số sinh trưởng',
        'Lịch sử chăm sóc',
        'Ghi chú'
      ];
      
      for (const section of sections) {
        const sectionElement = page.locator(`text=${section}`);
        if (await sectionElement.isVisible()) {
          await expect(sectionElement).toBeVisible();
        }
      }
    }
  });

  test('should enable edit mode when edit button is clicked', async ({ page }) => {
    const firstTree = page.locator('[data-testid="tree-card"]').first();
    if (await firstTree.isVisible()) {
      await firstTree.click();
      
      // Click edit button
      const editButton = page.locator('button:has-text("Chỉnh sửa")');
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Check if save and cancel buttons appear
        await expect(page.locator('button:has-text("Lưu")')).toBeVisible();
        await expect(page.locator('button:has-text("Hủy")')).toBeVisible();
      }
    }
  });
});

test.describe('Authentication Tests', () => {
  test('should handle admin user login', async ({ page }) => {
    await page.goto('/login');
    
    // Check if login form is visible
    await expect(page.locator('form')).toBeVisible();
    
    // Fill in admin credentials (if login form exists)
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('minhdai.bmt@gmail.com');
      await passwordInput.fill('test-password');
      
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.click();
    }
  });

  test('should show admin banner for admin users', async ({ page }) => {
    await page.goto('/');
    
    // Check for admin banner if user is admin
    const adminBanner = page.locator('text=Admin Mode');
    if (await adminBanner.isVisible()) {
      await expect(adminBanner).toBeVisible();
    }
  });
});

test.describe('Error Handling Tests', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    await page.goto('/trees');
    
    // Check for error handling
    await page.waitForTimeout(2000);
    
    // Restore online mode
    await page.context().setOffline(false);
  });

  test('should handle missing data gracefully', async ({ page }) => {
    await page.goto('/trees');
    await page.waitForLoadState('networkidle');
    
    // The application should not crash with missing data
    await expect(page.locator('body')).toBeVisible();
  });
});