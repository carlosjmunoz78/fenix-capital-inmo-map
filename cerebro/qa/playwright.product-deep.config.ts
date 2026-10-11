import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['aion-product-zero-payment.spec.ts'],
  timeout: 120_000,
  expect:{timeout:10_000},
  retries:0,
  reporter:[['list']],
  use:{
    ...devices['Desktop Chrome'],
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  projects:[{name:'aion-product-deep-chromium',use:{...devices['Desktop Chrome']}}]
});
