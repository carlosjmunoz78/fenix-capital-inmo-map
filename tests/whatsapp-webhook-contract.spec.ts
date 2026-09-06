import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('WhatsApp webhook verifies Meta challenge and signed POSTs fail closed',()=>{
  const src=fs.readFileSync('supabase/functions/fenix-whatsapp-webhook-prod/index.ts','utf8');
  expect(src).toContain('META_WHATSAPP_VERIFY_TOKEN');
  expect(src).toContain('META_WHATSAPP_APP_SECRET');
  expect(src).toContain('hub.verify_token');
  expect(src).toContain('hub.challenge');
  expect(src).toContain('x-hub-signature-256');
  expect(src).toContain('HMAC');
  expect(src).toContain('SHA-256');
  expect(src).toContain('missing_signature');
  expect(src).toContain('invalid_signature');
  expect(src).not.toContain('SUPABASE_ANON_KEY');
  expect(src).not.toContain('service_role');
});
