import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('communications PROD uses direct provider APIs without Make in the send path',()=>{
  const src=fs.readFileSync('supabase/functions/fenix-communications-gateway-prod/index.ts','utf8');
  expect(src).toContain('https://api.brevo.com/v3/smtp/email');
  expect(src).toContain('https://graph.facebook.com/v26.0/');
  expect(src).toContain("if(mode!=='REAL')");
  expect(src).toContain("mode==='SIMULATED'");
  expect(src).toContain('fenix_prod_communications_send_claim_server');
  expect(src).toContain('fenix_prod_communications_send_finalize_server');
  expect(src).not.toContain('make.com');
  expect(src).not.toContain('hook.eu');
});

test('real external send remains server-side and protected by explicit provider configuration',()=>{
  const src=fs.readFileSync('supabase/functions/fenix-communications-gateway-prod/index.ts','utf8');
  expect(src).toContain("Deno.env.get('BREVO_API_KEY')");
  expect(src).toContain("Deno.env.get('META_WHATSAPP_TOKEN')");
  expect(src).toContain("error:'brevo_not_configured'");
  expect(src).toContain("error:'whatsapp_not_configured'");
});
