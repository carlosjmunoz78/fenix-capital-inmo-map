import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const path=fileURLToPath(new URL('./operativa-no-actions.mjs',import.meta.url));
const cleaned={...process.env,CEREBRO_LAB_SESSION_E2E_ARM:'',CEREBRO_LAB_PROJECT_REF:'',CEREBRO_LAB_SERVICE_ROLE_KEY:'',CEREBRO_LAB_PUBLISHABLE_KEY:''};
const run=(args=[],env=cleaned)=>spawnSync(process.execPath,[path,...args],{env,encoding:'utf8',timeout:10000});
test('no-args mode reports only safe status, no network or Auth',()=>{
 const v=run();assert.equal(v.status,0);assert.match(v.stdout,/MODE=STATUS_ONLY_NO_NETWORK/);
 assert.match(v.stdout,/LIVE_AUTH_E2E=NOT_RUN/);assert.match(v.stdout,/ACTIONS_REQUIRED=false/);
 assert.doesNotMatch(v.stdout,/SUPABASE_SERVICE_ROLE_KEY=|Bearer |Access Token:/);
});
test('live execution stays blocked without both credentials and exact arm',()=>{
 for(const env of [cleaned,{...cleaned,CEREBRO_LAB_SERVICE_ROLE_KEY:'test-secret',CEREBRO_LAB_PUBLISHABLE_KEY:'test-pub'}]){
  const v=run(['--live'],env);assert.equal(v.status,2);assert.match(v.stdout,/BLOCKED_UNARMED_OR_LAB_KEYS_MISSING/);
 }
});
test('invalid arguments fail closed with no attempt',()=>{
 const a=run(['--unknown']);assert.equal(a.status,2);assert.match(a.stdout,/FAIL_CLOSED_INVALID_ARGUMENTS/);
 const b=run(['--live','--force']);assert.equal(b.status,2);
});
