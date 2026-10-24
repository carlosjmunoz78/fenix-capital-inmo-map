import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=(path)=>fs.readFile(new URL(`../../${path}`,import.meta.url),'utf8');
const runtimePath='cerebro/runtime/browser-interactive-session-v3.mjs';
const workflowPath='.github/workflows/cerebro-browser-work-total-v1-prod.yml';

test('Work Total PROD keeps realtime interaction and explicit PROD workspace enablement',async()=>{
  const runtime=await read(runtimePath);
  for(const token of ['ACTIVE_FRAME_INTERVAL_MS','IDLE_FRAME_INTERVAL_MS','POLL_INTERVAL_MS','ACTIVE_WINDOW_MS','immediate_post_action_frame:true'])assert.match(runtime,new RegExp(token));
  assert.match(runtime,/schema_version:'3\.5\.1'/);
  assert.match(runtime,/workspace_prod_enabled:true/);
  assert.match(runtime,/workspace_hibernate_prod:true/);
  assert.match(runtime,/prod_company_scope:'fenix'/);
  assert.match(runtime,/PROD_PROJECT_REF='cluhljgonannaafpmblx'/);
});

test('Work Total PROD preserves encrypted persistence and fail-closed Google identity gates',async()=>{
  const runtime=await read(runtimePath);
  for(const token of ['restoreWorkspace','saveWorkspace','ACCOUNT_IDENTITY_UNVERIFIED','REAUTH_REQUIRED','ACCOUNT_CONFIRMATION_REQUIRED','ACCOUNT_MISMATCH'])assert.match(runtime,new RegExp(token));
  assert.match(runtime,/workspace_tabs_encrypted:true/);
  assert.match(runtime,/workspace_identity_verification:'GOOGLE_HMAC_CONFIRMATION_FAIL_CLOSED'/);
  assert.match(runtime,/raw_cdp_exposed:false/);
  assert.match(runtime,/incremental_cost_eur:0/);
});

test('Work Total PROD canary is isolated to the promotion branch and dedicated endpoints',async()=>{
  const workflow=await read(workflowPath);
  assert.match(workflow,/branches: \['promote\/browser-work-total-prod-20261025'\]/);
  assert.match(workflow,/cerebro-browser-work-total-dispatch-v1-prod/);
  assert.match(workflow,/cerebro-browser-work-total-worker-v2-prod/);
  assert.match(workflow,/cerebro-browser-work-total-v1-prod/);
  assert.match(workflow,/CEREBRO_BROWSER_STAGE_CONCURRENCY: '1'/);
  assert.doesNotMatch(workflow,/CEREBRO_BROWSER_DISPATCH_URL: .*cerebro-browser-dispatch-v2\b/);
});

test('Work Total PROD remains bounded and zero-cost',async()=>{
  const runtime=await read(runtimePath);
  assert.match(runtime,/max_tabs:8/);
  assert.match(runtime,/incremental_cost_eur:0/);
  assert.doesNotMatch(runtime,/TRADING/i);
  assert.doesNotMatch(runtime,/captcha.*bypass/i);
  assert.doesNotMatch(runtime,/mfa.*bypass/i);
});
