import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'mobile-chromium-authenticated',
      dependencies: ['setup'],
      testMatch: /critical-authenticated\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/mobile-chromium.json'
      }
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-farm-dashboard NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-farm-dashboard.firebaseapp.com NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-farm-dashboard.appspot.com NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789 NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:e2e npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
  },
})
