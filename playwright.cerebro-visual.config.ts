import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./qa',
  testMatch:'cerebro-console-v3.visual.spec.ts',
  timeout:30_000,
  expect:{timeout:8_000},
  fullyParallel:false,
  workers:1,
  reporter:[['line']],
  use:{
    baseURL:'http://127.0.0.1:4175',
    browserName:'chromium',
    colorScheme:'dark',
    screenshot:'only-on-failure',
    trace:'retain-on-failure'
  },
  outputDir:'qa-artifacts/test-results'
});
