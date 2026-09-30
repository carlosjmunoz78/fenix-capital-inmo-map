import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('CEREBRO gateway binds confirmed SEO action through signed PREPROD transport',async()=>{
  const source=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');
  expect(source).toContain('cerebro-actgw-seo001-preprod');
  expect(source).toContain('CEREBRO_ACTGW_PROD_TO_SEO001_PREPROD_V1');
  expect(source).toContain('x-cerebro-actgw-signature-ed25519');
  expect(source).toContain('status:"ACTION_ACCEPTED"');
  expect(source).toContain('execution_environment:"PREPROD"');
  expect(source).toContain('completed:false');
  expect(source).not.toContain('prod_execution_enabled: true');
});
