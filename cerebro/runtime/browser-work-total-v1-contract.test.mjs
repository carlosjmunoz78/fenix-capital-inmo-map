import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=(path)=>fs.readFile(new URL(`../../${path}`,import.meta.url),'utf8');
const paths={
 runtime:'cerebro/runtime/browser-interactive-session-v3.mjs',
 bundle:'cerebro/runtime/browser-session-bundle-v1.mjs',
 owner:'supabase/functions/cerebro-browser-work-total-owner-v1-preprod/index.ts',
 broker:'supabase/functions/cerebro-browser-work-total-v1-preprod/index.ts',
 worker:'supabase/functions/cerebro-browser-work-total-worker-v1-preprod/index.ts',
 dispatch:'supabase/functions/cerebro-browser-work-total-dispatch-v1-preprod/index.ts',
 migration:'supabase/migrations/20261024223500_browser_workspace_v1_contracts.sql'
};

test('Work Total keeps realtime interaction and immediate post-action frames',async()=>{
 const runtime=await read(paths.runtime);
 for(const token of ['ACTIVE_FRAME_INTERVAL_MS','IDLE_FRAME_INTERVAL_MS','POLL_INTERVAL_MS','ACTIVE_WINDOW_MS','immediate_post_action_frame:true'])assert.match(runtime,new RegExp(token));
 assert.match(runtime,/schema_version:'3\.5\.0'/);
});

test('Work Total hibernates immediately and keeps encrypted workspace state',async()=>{
 const runtime=await read(paths.runtime);const bundle=await read(paths.bundle);
 assert.match(runtime,/poll\.hibernate===true\|\|poll\.state==='HIBERNATE_PENDING'/);
 assert.match(runtime,/state:workspace\?\.hibernated===true\?'HIBERNATED':'CLOSED'/);
 assert.match(bundle,/encryption:'AES-256-GCM'/);
 assert.match(bundle,/indexed_db:true/);
 assert.match(bundle,/virtual_webauthn_credentials:false/);
 assert.match(bundle,/raw_secret_logging:false/);
});

test('Work Total OIDC is pinned to isolated PREPROD branch and workflow',async()=>{
 const sources=await Promise.all([paths.dispatch,paths.worker,paths.broker].map(read));
 for(const source of sources){
  assert.match(source,/refs\/heads\/feat\/browser-work-total-v1-20261024/);
  assert.match(source,/\.github\/workflows\/cerebro-browser-work-total-v1-preprod\.yml/);
  assert.doesNotMatch(source,/refs\/heads\/main/);
 }
});

test('Work Total profile login is human governed and secret free',async()=>{
 const owner=await read(paths.owner);const broker=await read(paths.broker);
 for(const token of ['HUMAN_LOGIN_REQUIRED','confirm-account','forget-session'])assert.match(owner,new RegExp(token));
 assert.match(broker,/HMAC-SHA256/);
 assert.match(broker,/secret_material_logged:false/);
 assert.doesNotMatch(owner,/password\s*:/i);
 assert.doesNotMatch(broker,/password\s*:/i);
});

test('Work Total migration contains hibernation and account audit lifecycle',async()=>{
 const sql=await read(paths.migration);
 for(const token of ['HIBERNATED','PROFILE_SELECTED','PROFILE_LEASE_ACQUIRED','PROFILE_SWITCH_REQUESTED','SESSION_HIBERNATED','SESSION_RESUMED','ACCOUNT_VERIFICATION_OBSERVED','ACCOUNT_VERIFIED','REAUTH_REQUIRED','LEASE_RELEASED'])assert.match(sql,new RegExp(token));
 assert.match(sql,/cerebro_browser_workspace_profile_v1/);
});

test('Work Total is PREPROD only and zero incremental cost',async()=>{
 const sources=await Promise.all([paths.owner,paths.broker,paths.worker,paths.dispatch].map(read));
 for(const source of sources){assert.match(source,/PREPROD/);assert.match(source,/incremental_cost_eur:0/);assert.match(source,/trading_access:false/);}
 const runtime=await read(paths.runtime);assert.match(runtime,/workspace_prod_enabled:false/);assert.match(runtime,/incremental_cost_eur:0/);
});
