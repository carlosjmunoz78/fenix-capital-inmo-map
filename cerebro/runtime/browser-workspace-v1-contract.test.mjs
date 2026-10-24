import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=(path)=>fs.readFile(new URL(`../../${path}`,import.meta.url),'utf8');

const paths={
  runtime:'cerebro/runtime/browser-interactive-session-v3.mjs',
  owner:'supabase/functions/cerebro-browser-workspace-owner-v1-preprod/index.ts',
  broker:'supabase/functions/cerebro-browser-workspace-v1-preprod/index.ts',
  worker:'supabase/functions/cerebro-browser-workspace-worker-v1-preprod/index.ts',
  dispatch:'supabase/functions/cerebro-browser-workspace-dispatch-v1-preprod/index.ts',
  migration:'supabase/migrations/20261024223500_browser_workspace_v1_contracts.sql'
};

test('Workspace V1 consumes hibernate immediately and preserves a hibernated terminal state',async()=>{
  const runtime=await read(paths.runtime);
  const worker=await read(paths.worker);
  assert.match(runtime,/poll\.hibernate===true\|\|poll\.state==='HIBERNATE_PENDING'/);
  assert.match(runtime,/state:workspace\?\.hibernated===true\?'HIBERNATED':'CLOSED'/);
  assert.match(worker,/requested==='HIBERNATED'\?'HIBERNATED':'CLOSED'/);
});

test('Workspace V1 OIDC is pinned to its isolated PREPROD branch and workflow',async()=>{
  const files=await Promise.all([paths.broker,paths.worker,paths.dispatch].map(read));
  for(const source of files){
    assert.match(source,/refs\/heads\/feat\/browser-workspace-v1-20261024/);
    assert.match(source,/\.github\/workflows\/cerebro-browser-workspace-v1-preprod\.yml/);
    assert.doesNotMatch(source,/refs\/heads\/main/);
  }
});

test('Workspace V1 keeps login secret-free and human-governed',async()=>{
  const owner=await read(paths.owner);
  const broker=await read(paths.broker);
  assert.match(owner,/HUMAN_LOGIN_REQUIRED/);
  assert.match(owner,/confirm-account/);
  assert.match(owner,/forget-session/);
  assert.match(broker,/HMAC-SHA256/);
  assert.match(broker,/secret_material_logged:false/);
  assert.doesNotMatch(owner,/password\s*:/i);
  assert.doesNotMatch(broker,/password\s*:/i);
});

test('Workspace V1 migration contains Work lifecycle audit events and HIBERNATED state',async()=>{
  const sql=await read(paths.migration);
  for(const token of ['HIBERNATED','PROFILE_SELECTED','PROFILE_LEASE_ACQUIRED','PROFILE_SWITCH_REQUESTED','SESSION_HIBERNATED','SESSION_RESUMED','ACCOUNT_VERIFICATION_OBSERVED','ACCOUNT_VERIFIED','REAUTH_REQUIRED','LEASE_RELEASED'])assert.match(sql,new RegExp(token));
  assert.match(sql,/cerebro_browser_workspace_profile_v1/);
});

test('Google PREPROD profile is metadata-only and never copies PROD credential material',async()=>{
  const sql=await read(paths.migration);
  assert.match(sql,/iam:carlos-google-primary/);
  assert.match(sql,/acct:carlos-google-primary/);
  assert.match(sql,/null,'HUMAN_LOGIN_REQUIRED','UNVERIFIED'/);
  assert.doesNotMatch(sql,/vault_secret/i);
});
