import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const target=new URL('./security-lab/owner-session-auth-e2e-private.mjs',import.meta.url);
const source=readFileSync(target,'utf8');
test('E2E harness stays DISARMED without explicit LAB-only unlock',()=>{
 const run=spawnSync(process.execPath,[fileURLToPath(target)],{
  encoding:'utf8',timeout:7000,env:{...process.env,
   CEREBRO_LAB_SESSION_E2E_ARM:'',
   CEREBRO_LAB_SERVICE_ROLE_KEY:'',
   CEREBRO_LAB_PUBLISHABLE_KEY:'',
   CEREBRO_LAB_PROJECT_REF:''}
 });
 assert.equal(run.status,0,run.stderr);
 assert.match(run.stdout,/DISARMED_NO_ACTION/);
 assert.doesNotMatch(run.stdout,/PASS_LAB_ISSUER_ONLY|CLEANUP_FAILED/);
 assert.equal(run.stderr,'');
});
test('E2E harness is pinned exclusively to LAB and imports SDK only after keys and arm',()=>{
 assert.match(source,/const REF='hnqlnvakzaywtafeiybt'/);
 assert.match(source,/CEREBRO-LAB-SESSION-E2E-ONE-SHOT-/);
 assert.match(source,/CEREBRO_LAB_PROJECT_REF/);
 assert.match(source,/if\(!ready\)/);
 assert.match(source,/await import\('@supabase\/supabase-js'\)/);
 assert.match(source,/runOfficialLabSessionCycle\(\{admin,userClient,email,password\}\)/);
 assert.doesNotMatch(source,/cluhljgonannaafpmblx|fenix-app-gateway/);
});
test('armed without LAB-only credentials denies before SDK import/network',()=>{
 const run=spawnSync(process.execPath,[fileURLToPath(target)],{
  encoding:'utf8',timeout:7000,env:{...process.env,
   CEREBRO_LAB_SESSION_E2E_ARM:'CEREBRO-LAB-SESSION-E2E-ONE-SHOT-hnqlnvakzaywtafeiybt',
   CEREBRO_LAB_PROJECT_REF:'hnqlnvakzaywtafeiybt',
   CEREBRO_LAB_SERVICE_ROLE_KEY:'',
   CEREBRO_LAB_PUBLISHABLE_KEY:''}
 });
 assert.equal(run.status,2,run.stderr);
 assert.match(run.stdout,/BLOCKED_MISSING_LAB_ONLY_CREDENTIALS/);
 assert.doesNotMatch(run.stdout,/PASS_LAB_ISSUER_ONLY|CLEANUP_FAILED/);
 assert.equal(run.stderr,'');
});
