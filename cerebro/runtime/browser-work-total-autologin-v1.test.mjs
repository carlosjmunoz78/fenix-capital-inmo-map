import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=(path)=>fs.readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('interactive Work Total materializes credentials only in the governed worker path',async()=>{
 const runner=await read('cerebro/runtime/browser-job-runner-v2.mjs');
 assert.doesNotMatch(runner,/INTERACTIVE_V3_CREDENTIAL_MATERIALIZATION_NOT_YET_ALLOWED/);
 assert.match(runner,/interactiveCredentialFlow/);
 assert.match(runner,/job\.credential_ref_id\|\|interactiveCredentialFlow/);
 assert.match(runner,/callAutologin\('worker\/materialize'/);
 assert.match(runner,/credential:credentialMaterialized\?\{provider:credentialProvider,secret_payload:secretPayload,login_origin:credentialLoginOrigin,allowed_origins:credentialAllowedOrigins,login_config:credentialLoginConfig\}:null/);
 assert.match(runner,/scrub\(secretPayload\)/);
 assert.match(runner,/secret_material_logged:false/);
 assert.match(runner,/interactive_vault_autologin:true/);
});

test('autonomous login keeps Google specialized and adds universal governed fallback',async()=>{
 const runtime=await read('cerebro/runtime/browser-interactive-session-v3.mjs');
 assert.match(runtime,/credential_broker_autologin:true/);
 assert.match(runtime,/google_autologin_adapter:true/);
 assert.match(runtime,/universal_form_autologin:true/);
 assert.match(runtime,/manual_login_default:false/);
 assert.match(runtime,/allowed_origin_bound:true/);
 assert.match(runtime,/login_metadata_separated:true/);
 assert.match(runtime,/credentialLoginMetadata/);
 assert.match(runtime,/credential\.login_config/);
 assert.match(runtime,/CREDENTIAL_LOGIN_URL_REQUIRED/);
 assert.match(runtime,/AUTH_LOGIN_ORIGIN_DENIED/);
 assert.match(runtime,/AUTH_REDIRECT_ORIGIN_DENIED/);
 assert.match(runtime,/worker\/confirm-bound-login/);
 assert.match(runtime,/type:'FILL'.*usernameSelector/s);
 assert.match(runtime,/type:'FILL'.*passwordSelector/s);
 assert.match(runtime,/AUTH_CHALLENGE_REQUIRED/);
 assert.match(runtime,/async function captureFrame\(/);
 assert.match(runtime,/async function saveWorkspace\(/);
 assert.match(runtime,/export async function runInteractiveBrowserSessionV3/);
 assert.doesNotMatch(runtime,/AUTO_LOGIN_PROVIDER_NOT_READY/);
 assert.doesNotMatch(runtime,/stealth|captcha.*bypass|mfa.*bypass/i);
});

test('universal login metadata is additive and non-secret',async()=>{
 const migration=await read('supabase/migrations/20261026123000_cerebro_browser_workspace_login_config_v1.sql');
 assert.match(migration,/add column if not exists login_config jsonb not null default '\{\}'::jsonb/);
 assert.match(migration,/Non-secret browser login adapter metadata/);
 assert.match(migration,/Credentials remain in the credential broker\/vault/);
});

test('owner surface remains canonical and does not materialize credentials',async()=>{
 const owner=await read('supabase/functions/cerebro-browser-work-total-owner-v1-prod/index.ts');
 assert.match(owner,/p_credential_ref_id:null/);
 assert.match(owner,/credential_materialization:false/);
 assert.doesNotMatch(owner,/secret_payload|vault\.decrypted_secrets|credential_materialize_v3/);
});

test('interactive credential broker v3 remains lease-bound and maps interactive to existing act permission',async()=>{
 const migration=await read('supabase/migrations/20261026100000_cerebro_browser_credential_broker_v3_interactive.sql');
 assert.match(migration,/status='LEASED'/);
 assert.match(migration,/lease_expires_at>now\(\)/);
 assert.match(migration,/v_job\.capability is distinct from 'browser1\.interactive'/);
 assert.match(migration,/'browser1\.act'=any\(v_binding\.allowed_capabilities\)/);
 assert.match(migration,/CREDENTIAL_IDENTITY_DENIED/);
 assert.match(migration,/CREDENTIAL_ACCOUNT_DENIED/);
 assert.match(migration,/CREDENTIAL_ORIGIN_DENIED/);
 assert.match(migration,/p_credential_ref_id text/);
 assert.match(migration,/p_origin text/);
 assert.match(migration,/secret_material_logged boolean not null default false/);
});

test('autologin broker resolves any authorized provider and returns only scoped metadata beside the secret',async()=>{
 const edge=await read('supabase/functions/cerebro-browser-work-total-autologin-v1-prod/index.ts');
 assert.match(edge,/profileForJob/);
 assert.match(edge,/login_policy.*CREDENTIAL_BROKER_ALLOWED/s);
 assert.match(edge,/cerebro_browser_credential_materialize_v3/);
 assert.match(edge,/allowed_origins:allowed/);
 assert.match(edge,/login_config:p\.login_config/);
 assert.match(edge,/universal_form_autologin:true/);
 assert.match(edge,/manual_login_default:false/);
 assert.match(edge,/confirmBoundLogin/);
 assert.match(edge,/CREDENTIAL_BROKER_AUTH_ACCEPTED/);
 assert.match(edge,/BOUND_LOGIN_FINAL_ORIGIN_DENIED/);
 assert.match(edge,/auth_challenge_requires_human:true/);
 assert.doesNotMatch(edge,/AUTO_LOGIN_PROVIDER_NOT_READY/);
 assert.doesNotMatch(edge,/console\.log\(|secret_payload\s*:\s*secret\.secret_payload/);
});
