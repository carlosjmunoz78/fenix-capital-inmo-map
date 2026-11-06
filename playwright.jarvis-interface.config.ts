import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
 testDir:'./tests',
 testMatch:['jarvis-interface-presence-lab.spec.ts'],
 timeout:30_000,
 retries:0,
 reporter:[['list']],
 use:{
  baseURL:'http://127.0.0.1:4174',
  trace:'retain-on-failure',
  screenshot:'only-on-failure'
 },
 webServer:{
  command:'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
  url:'http://127.0.0.1:4174/tests/jarvis-ui-lab-harness.html',
  reuseExistingServer:false,
  timeout:120_000
 },
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
  {name:'mobile-chromium',use:{...devices['Pixel 7']}}
 ]
});
