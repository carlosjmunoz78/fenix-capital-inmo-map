import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['human-readonly-observation.spec.ts'],
  timeout: 60_000,
  expect: {timeout: 7_500},
  retries: 0,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {name:'qa-desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'qa-mobile-chromium',use:{...devices['Pixel 7']}}
  ]
});
