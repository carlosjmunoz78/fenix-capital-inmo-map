import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=(path)=>fs.readFile(new URL(`../../${path}`,import.meta.url),'utf8');
const runtimePath='cerebro/runtime/browser-interactive-session-v3.mjs';
const workflowPath='.github/workflows/cerebro-browser-work-total-v1-prod.yml';
const ownerPath='supabase/functions/cerebro-browser-work-total-owner-v1-prod/index.ts';
const workspacePath='supabase/functions/cerebro-browser-work-total-v1-prod/index.ts';
const dockPath='src/cerebroBrowserWorkTotalDock.ts';
const appEntryPath='src/main.tsx';

test('Work Total PROD preserves the validated fast private human-input loop',async()=>{
  const runtime=await read(runtimePath);
  assert.match(runtime,/POLL_INTERVAL_MS=Math\.max\(25,Number\(process\.env\.CEREBRO_BROWSER_INTERACTIVE_POLL_MS\|\|35\)\)/);
  assert.match(runtime,/let processedCommand=false/);
  assert.match(runtime,/else if\(!processedCommand&&Date\.now\(\)-lastFrameAt>=FRAME_INTERVAL_MS\)/);
  assert.match(runtime,/if\(processedCommand\)continue/);
  assert.match(runtime,/immediate_post_action_frame:false/);
  assert.match(runtime,/privacy_frame_suppression_during_human_input:true/);
  assert.match(runtime,/workspace_prod_enabled:true/);
  assert.match(runtime,/workspace_hibernate_prod:true/);
  assert.match(runtime,/prod_company_scope:'fenix'/);
  assert.match(runtime,/PROD_PROJECT_REF='cluhljgonannaafpmblx'/);
});

test('Work Total PROD preserves encrypted persistence and VERIFIED-only Google identity gates',async()=>{
  const runtime=await read(runtimePath);
  for(const token of ['restoreWorkspace','saveWorkspace','ACCOUNT_IDENTITY_UNVERIFIED','REAUTH_REQUIRED','ACCOUNT_CONFIRMATION_REQUIRED','ACCOUNT_MISMATCH'])assert.match(runtime,new RegExp(token));
  assert.match(runtime,/verificationState!=='VERIFIED'/);
  assert.match(runtime,/requireVerifiedIdentity/);
  assert.match(runtime,/workspace_tabs_encrypted:true/);
  assert.match(runtime,/workspace_identity_verification:'GOOGLE_HMAC_VERIFIED_ONLY_FAIL_CLOSED'/);
  assert.match(runtime,/raw_cdp_exposed:false/);
  assert.match(runtime,/incremental_cost_eur:0/);
});

test('Work Total PROD workspace fails closed for all non-VERIFIED bundles',async()=>{
  const workspace=await read(workspacePath);
  assert.match(workspace,/const VERIFIED='VERIFIED'/);
  assert.match(workspace,/requireVerifiedProfile/);
  assert.match(workspace,/WORKSPACE_IDENTITY_NOT_VERIFIED/);
  assert.match(workspace,/profileState!==VERIFIED\|\|bundleState!==VERIFIED/);
  assert.match(workspace,/\.eq\('verification_state',VERIFIED\)/);
  assert.match(workspace,/verification_state:VERIFIED/);
  assert.match(workspace,/identity_gate:'VERIFIED_ONLY_FAIL_CLOSED'/);
  assert.match(workspace,/trading_access:false/);
  assert.doesNotMatch(workspace,/verificationState=\['VERIFIED','REAUTH_REQUIRED','MISMATCH'\]/);
});

test('Work Total PROD owner is Fenix-only, CARLOS-ADMIN-only and never exposes secrets',async()=>{
  const owner=await read(ownerPath);
  assert.match(owner,/const ENV='PROD'/);
  assert.match(owner,/const COMPANY='fenix'/);
  assert.match(owner,/const OWNER_ACTOR='CARLOS-ADMIN'/);
  assert.match(owner,/fenix_prod_actor_context_by_auth_server/);
  assert.match(owner,/company!==COMPANY/);
  assert.match(owner,/browser-work-total-v1-prod-/);
  assert.match(owner,/verified_bundle_reuse_only:true/);
  assert.match(owner,/secret_material_exposed:false/);
  assert.match(owner,/trading_access:false/);
  assert.match(owner,/incremental_cost_eur:0/);
  assert.doesNotMatch(owner,/preprod_test_actor_context_by_auth_server/);
});

test('Work Total dock is enabled and actually mounted in governed PROD',async()=>{
  const dock=await read(dockPath);
  const appEntry=await read(appEntryPath);
  assert.match(dock,/IS_PRODUCTION\?'cerebro-browser-work-total-owner-v1-prod'/);
  assert.match(dock,/IS_PRODUCTION\?'browser-work-total-v1-prod-ui-'/);
  assert.match(dock,/WORK TOTAL · \$\{ENVIRONMENT\}/);
  assert.doesNotMatch(dock,/if\(IS_PRODUCTION\)return/);
  assert.doesNotMatch(dock,/PROD intacto/);
  assert.match(appEntry,/import ['"]\.\/cerebroBrowserWorkTotalDock['"];?/);
});

test('Work Total PROD canary remains isolated to its promotion branch and dedicated endpoints',async()=>{
  const workflow=await read(workflowPath);
  assert.match(workflow,/branches: \['promote\/browser-work-total-prod-20261025'\]/);
  assert.match(workflow,/cerebro-browser-work-total-dispatch-v1-prod/);
  assert.match(workflow,/cerebro-browser-work-total-worker-v2-prod/);
  assert.match(workflow,/cerebro-browser-work-total-v1-prod/);
  assert.match(workflow,/src\/main\.tsx/);
  assert.match(workflow,/CEREBRO_BROWSER_STAGE_CONCURRENCY: '1'/);
  assert.match(workflow,/CEREBRO_BROWSER_INTERACTIVE_POLL_MS: '35'/);
  assert.match(workflow,/CEREBRO_BROWSER_INTERACTIVE_FRAME_MS: '1400'/);
  assert.doesNotMatch(workflow,/CEREBRO_BROWSER_DISPATCH_URL: .*cerebro-browser-dispatch-v2\b/);
});

test('Work Total PROD remains bounded and zero-cost',async()=>{
  const runtime=await read(runtimePath);
  assert.match(runtime,/max_tabs:8/);
  assert.match(runtime,/incremental_cost_eur:0/);
  assert.doesNotMatch(runtime,/captcha.*bypass/i);
  assert.doesNotMatch(runtime,/mfa.*bypass/i);
});
