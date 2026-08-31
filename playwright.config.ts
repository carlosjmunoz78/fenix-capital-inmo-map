import { defineConfig, devices } from '@playwright/test';

const webServerCommand=process.env.PLAYWRIGHT_SKIP_BUILD==='1'
  ? 'npm run preview -- --host 127.0.0.1'
  : 'npm run build && npm run preview -- --host 127.0.0.1';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: webServerCommand,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'tablet-chromium',
      testMatch: ['**/ui.spec.ts','**/direction-context-fallback.spec.ts'],
      use: { viewport: { width: 820, height: 1180 } }
    },
    {
      name: 'mobile-chromium',
      testMatch: ['**/ui.spec.ts','**/direction-context-fallback.spec.ts','**/operational-mobile-shell.spec.ts'],
      use: { ...devices['Pixel 7'] }
    }
  ]
});