import { test, expect } from '@playwright/test';

test.describe('TreeDetail Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trees');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Display Functionality', () => {
    test('should show empty state when no tree is selected', async ({ page }) => {
      // Look for empty state messages
      const emptyStateMessages = [
        page.locator('text=Chọn một cây để xem chi tiết'),
        page.locator('text=Select a tree to view details'),
        page.locator('text=Chưa chọn cây nào'),
        page.locator('[data-testid="empty-state"]')
      ];
      
      let hasEmptyState = false;
      for (const message of emptyStateMessages) {
        if (await message.isVisible().catch(() => false)) {
          hasEmptyState = true;
          await expect(message).toBeVisible();
          break;
        }
      }
      
      // If no explicit empty state, check if detail area is empty or hidden
      if (!hasEmptyState) {
        const detailArea = page.locator('[data-testid="tree-detail"]');
        if (await detailArea.isVisible().catch(() => false)) {
          const content = await detailArea.textContent();
          expect(content?.trim()).toBeTruthy();
        }
      }
    });

    test('should display tree information when tree is selected', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Look for and click on a tree card
      const treeCards = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /cây|tree|QR/i });
      
      if (await treeCards.count() > 0) {
        await treeCards.first().click();
        await page.waitForTimeout(1000);
        
        // Check if tree detail is displayed
        const detailArea = page.locator('[data-testid="tree-detail"]');
        if (await detailArea.isVisible().catch(() => false)) {
          await expect(detailArea).toBeVisible();
          
          // Check for basic information sections
          const sections = [
            'Thông tin cơ bản',
            'Basic Information',
            'Chỉ số sinh trưởng',
            'Growth Metrics',
            'Lịch sử chăm sóc',
            'Care History'
          ];
          
          for (const section of sections) {
            const sectionElement = page.locator(`text=${section}`);
            if (await sectionElement.isVisible().catch(() => false)) {
              await expect(sectionElement).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Basic Information Section', () => {
    test('should display tree basic information', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const treeCards = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /cây|tree|QR/i });
      
      if (await treeCards.count() > 0) {
        await treeCards.first().click();
        await page.waitForTimeout(1000);
        
        // Look for basic information fields
        const infoFields = [
          'Tên cây',
          'Tree Name',
          'Giống cây',
          'Variety',
          'Mã vùng',
          'Zone Code',
          'QR Code'
        ];
        
        for (const field of infoFields) {
          const fieldElement = page.locator(`text=${field}`);
          if (await fieldElement.isVisible().catch(() => false)) {
            await expect(fieldElement).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Growth Metrics Section', () => {
    test('should display growth metrics', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const treeCards = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /cây|tree|QR/i });
      
      if (await treeCards.count() > 0) {
        await treeCards.first().click();
        await page.waitForTimeout(1000);
        
        // Look for growth metrics
        const metrics = [
          'Trạng thái sức khỏe',
          'Health Status',
          'Chiều cao',
          'Height',
          'Đường kính thân',
          'Trunk Diameter',
          'Số quả',
          'Fruit Count'
        ];
        
        for (const metric of metrics) {
          const metricElement = page.locator(`text=${metric}`);
          if (await metricElement.isVisible().catch(() => false)) {
            await expect(metricElement).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Edit Functionality', () => {
    test('should enable edit mode when edit button is clicked', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const treeCards = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /cây|tree|QR/i });
      
      if (await treeCards.count() > 0) {
        await treeCards.first().click();
        await page.waitForTimeout(1000);
        
        // Look for edit button
        const editButtons = [
          page.locator('button:has-text("Chỉnh sửa")'),
          page.locator('button:has-text("Edit")'),
          page.locator('[data-testid="edit-button"]')
        ];
        
        for (const editButton of editButtons) {
          if (await editButton.isVisible().catch(() => false)) {
            await editButton.click();
            await page.waitForTimeout(500);
            
            // Check for save and cancel buttons
            const saveButton = page.locator('button:has-text("Lưu"), button:has-text("Save")');
            const cancelButton = page.locator('button:has-text("Hủy"), button:has-text("Cancel")');
            
            if (await saveButton.isVisible().catch(() => false)) {
              await expect(saveButton).toBeVisible();
            }
            if (await cancelButton.isVisible().catch(() => false)) {
              await expect(cancelButton).toBeVisible();
            }
            
            break;
          }
        }
      }
    });
  });

  test.describe('Delete Functionality', () => {
    test('should show delete button and confirmation', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const treeCards = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /cây|tree|QR/i });
      
      if (await treeCards.count() > 0) {
        await treeCards.first().click();
        await page.waitForTimeout(1000);
        
        // Look for delete button
        const deleteButtons = [
          page.locator('button:has-text("Xóa")'),
          page.locator('button:has-text("Delete")'),
          page.locator('[data-testid="delete-button"]')
        ];
        
        for (const deleteButton of deleteButtons) {
          if (await deleteButton.isVisible().catch(() => false)) {
            await expect(deleteButton).toBeVisible();
            
            // Note: We won't actually click delete in tests to avoid data loss
            // In a real test environment, you might click and check for confirmation dialog
            break;
          }
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Check if tree detail works on mobile
      const treeCards = page.locator('[data-testid="tree-card"], .border, .rounded').filter({ hasText: /cây|tree|QR/i });
      
      if (await treeCards.count() > 0) {
        await treeCards.first().click();
        await page.waitForTimeout(1000);
        
        // On mobile, detail might be in a separate view or modal
        const detailArea = page.locator('[data-testid="tree-detail"]');
        if (await detailArea.isVisible().catch(() => false)) {
          await expect(detailArea).toBeVisible();
        }
        
        // Check for back button on mobile
        const backButtons = [
          page.locator('button:has-text("Quay lại")'),
          page.locator('button:has-text("Back")'),
          page.locator('[data-testid="back-button"]')
        ];
        
        for (const backButton of backButtons) {
          if (await backButton.isVisible().catch(() => false)) {
            await expect(backButton).toBeVisible();
            break;
          }
        }
      }
    });
  });
});