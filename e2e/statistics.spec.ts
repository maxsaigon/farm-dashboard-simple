import { expect, test } from '@playwright/test'

test('authenticated owner views and compares season statistics', async ({ page }) => {
  await page.goto('/statistics')

  await expect(page.getByRole('heading', { name: 'Thống Kê mùa vụ' })).toBeVisible()
  await expect(page.getByLabel('Mùa đang xem')).toHaveValue('2026')
  await expect(page.getByLabel('So sánh với')).toHaveValue('2025')
  await expect(page.getByText('12 trái', { exact: true })).toBeVisible()
  await expect(page.getByText('1.500.000 ₫', { exact: true }).first()).toBeVisible()
  await expect(page.locator('nav.fixed.bottom-0')).toHaveCount(0)

  await page.getByLabel('Mùa đang xem').selectOption('2025')
  await expect(page.getByText('10 trái', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'So sánh mùa 2025 và 2026' })).toBeVisible()
})
