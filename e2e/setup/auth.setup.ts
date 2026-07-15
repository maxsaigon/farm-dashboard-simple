import { test as setup, expect } from '@playwright/test'
import { E2E_USER, seedFirebaseEmulators } from '../helpers/firebase-emulator-admin'

const authFile = 'playwright/.auth/mobile-chromium.json'

setup('seed and authenticate mobile owner', async ({ page }) => {
  await seedFirebaseEmulators()
  await page.goto('/login')
  await page.getByLabel('Email').fill(E2E_USER.email)
  await page.getByLabel('Mật khẩu').fill(E2E_USER.password)
  await page.getByRole('button', { name: 'Đăng Nhập' }).click()
  await expect(page).toHaveURL(/\/(map|select-farm|trees)?$/)
  await page.goto('/trees')
  await expect(page.getByText('E2E Durian Tree 001', { exact: true })).toBeVisible()
  await page.context().storageState({ path: authFile, indexedDB: true })
})
