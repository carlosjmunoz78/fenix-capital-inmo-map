import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=(path)=>fs.readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('interactive Work Total materializes credentials only in the governed worker path',async()=>{
 const runner=await read('cerebro/runtime/browser-job-runner-v2.mjs');
 assert.doesNotMatch(runner,/INTERACTIVE_V3_CREDENTIAL_MATERIALIZATION_NOT_YET_ALLOWED/);
 assert.match(runner,/callAutologin\('worker\/materialize'/);
 assert.match(runner,/credential:credentialMaterialized\?\{provider:credentialProvider,secret_payload:secretPayload\}:null/);
 assert.match(runner,/scrub\(secretPayload\)/);
 assert.match(runner,/secret_material_logged:false/);
 assert.match(runner,/interactive_vault_autologin:true/);
});

test('Google autonomous login uses direct fill and escalates auth challenges to human',async()=>{
 const runtime=await read('cerebro/runtime/browser-interactive-session-v3.mjs');
 assert.match(runtime,/credential_broker_autologin:true/);
 assert.match(runtime,/google_autologin_adapter:true/);
 assert.match(runtime,/type:'FILL'.*input\[type="email"\]/s);
 assert.match(runtime,/type:'FILL'.*input\[type="password"\]/s);
 assert.match(runtime,/AUTH_CHALLENGE_REQUIRED/);
 assert.match(runtime,/AUTO_LOGIN_PROVIDER_NOT_READY/);
 assert.match(runtime,/auth_challenge_requires_human:true/);
 assert.doesNotMatch(runtime,/stealth|captcha.*bypass|mfa.*bypass/i);
});

test('owner chooses broker auto-login when no verified session can be restored',async()=>{
 const owner=await read('supabase/functions/cerebro-browser-work-total-owner-v1-prod/index.ts');
 assert.match(owner,/credentialRef=String\(p\.login_policy\|\|''\)==='CREDENTIAL_BROKER_ALLOWED'/);
 assert.match(owner,/p_credential_ref_id:resumable\?null:\(credentialRef\|\|null\)/);
 assert.match(owner,/https:\/\/accounts\.google\.com\/ServiceLogin/);
 assert.match(owner,/auto_login_expected:Boolean\(!resumable&&credentialRef\)/);
 assert.match(owner,/human_login_required:Boolean\(!resumable&&!credentialRef\)/);
 assert.match(owner,/automatic_relogin:true/);
});

test('interactive credential broker v3 remains lease-bound and maps interactive to existing act permission',async()=>{
 const migration=await read('supabase/migrations/20261026100000_cerebro_browser_credential_broker_v3_interactive.sql');
 assert.match(migration,/status='LEASED'/);
 assert.match(migration,/lease_expires_at>now\(\)/);
 assert.match(migration,/browser1\.interactive/);
 assert.match(migration,/v_binding_capability:='browser1\.act'/);
 assert.match(migration,/CREDENTIAL_IDENTITY_DENIED/);
 assert.match(migration,/CREDENTIAL_ACCOUNT_DENIED/);
 assert.match(migration,/CREDENTIAL_ORIGIN_DENIED/);
 assert.match(migration,/secret_material_logged boolean not null default false/);
});

test('autologin broker auto-confirms only an exact credential/account match and exposes no secret to the frontend',async()=>{
 const edge=await read('supabase/functions/cerebro-browser-work-total-autologin-v1-prod/index.ts');
 assert.match(edge,/cerebro_browser_credential_materialize_v3/);
 assert.match(edge,/credentialEmail!==observed/);
 assert.match(edge,/expectedMismatch\|\|credentialMismatch/);
 assert.match(edge,/verification_state:'VERIFIED'/);
 assert.match(edge,/verification_state:'MISMATCH'/);
 assert.match(edge,/secret_material_exposed_to_frontend:false/);
 assert.match(edge,/mfa_bypass:false/);
 assert.match(edge,/captcha_bypass:false/);
 assert.doesNotMatch(edge,/console\.log\(|secret_payload\s*:\s*secret\.secret_payload/);
});
