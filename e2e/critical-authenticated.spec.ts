import { test, expect } from '@playwright/test'

test('authenticated mobile owner sees and searches seeded tree', async ({ page }) => {
  await page.goto('/trees')
  await expect(page).toHaveURL(/\/trees$/)
  await expect(page.getByText('E2E Durian Tree 001', { exact: true })).toBeVisible()

  await page.locator('input[placeholder="Tìm kiếm cây, QR, giống, khu..."]:visible').fill('E2E-QR-001')
  await expect(page.getByText('E2E Durian Tree 001', { exact: true })).toBeVisible()
  await expect(page.locator('div:visible').filter({ hasText: /^1 cây$/ }).first()).toBeVisible()
})

test('authenticated mobile owner opens tree detail', async ({ page }) => {
  await page.goto('/trees')
  await page.getByText('E2E Durian Tree 001', { exact: true }).click()
  await expect(page.getByTestId('tree-showcase').getByText('Monthong', { exact: true }).last()).toBeVisible()
})
