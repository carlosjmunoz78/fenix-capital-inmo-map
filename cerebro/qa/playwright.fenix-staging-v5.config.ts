import {defineConfig} from '@playwright/test';

const project=(name:string,width:number,height:number)=>({name,use:{browserName:'chromium' as const,viewport:{width,height}}});

export default defineConfig({
  testDir: '.',
  testMatch: ['fenix-staging-v5-acceptance.spec.ts','fenix-staging-h1-jaen.spec.ts'],
  timeout: 75_000,
  expect:{timeout:10_000},
  retries:0,
  workers:2,
  reporter:[['list']],
  use:{trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[
    project('v5-320',320,800),
    project('v5-390',390,844),
    project('v5-768',768,1024),
    project('v5-1024',1024,900),
    project('v5-1440',1440,1000)
  ]
});
