import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const target=new URL('./security-lab/owner-session-auth-e2e-private.mjs',import.meta.url);
const source=readFileSync(target,'utf8');
test('E2E harness stays DISARMED without explicit LAB-only unlock',()=>{
 const result=spawnSync(process.execPath,[fileURLToPath(target)],{
  encoding:'utf8',timeout:7000,env:{
   ...process.env,CEREBRO_LAB_SESSION_E2E_ARM:'',
   CEREBRO_LAB_SERVICE_ROLE_KEY:'',CEREBRO_LAB_PUBLISHABLE_KEY:'',
   CEREBRO_LAB_PROJECT_REF:''
  }
 });
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/DISARMED_NO_ACTION/);
 assert.doesNotMatch(result.stdout,/PASS_LAB_ISSUER_ONLY/);
});
test('E2E harness is pinned exclusively to LAB, uses official Auth and keeps secrets out of logs',()=>{
 assert.match(source,/const REF='hnqlnvakzaywtafeiybt'/);
 assert.match(source,/CEREBRO-LAB-SESSION-E2E-ONE-SHOT-/);
 assert.match(source,/CEREBRO_LAB_PROJECT_REF/);
 assert.doesNotMatch(source,/cluhljgonannaafpmblx/);
 assert.doesNotMatch(source,/fenix-app-gateway/);
 assert.match(source,/admin\.auth\.admin\.createUser/);
 assert.match(source,/userClient\.auth\.signInWithPassword/);
 assert.match(source,/userClient\.auth\.getClaims/);
 assert.match(source,/admin\.rpc\('cerebro_operativa_session_guard_lab_v0'/);
 assert.match(source,/userClient\.auth\.signOut\(\{scope:'local'\}\)/);
 assert.match(source,/admin\.auth\.admin\.deleteUser\(createdUserId\)/);
 assert.doesNotMatch(source,/console\.(log|error)\([^;]*(?:accessToken|adminKey|password|session_id|email)/);
});

test('armed without LAB-only credentials fails before any SDK import or network',()=>{
 const run=spawnSync(process.execPath,[fileURLToPath(target)],{
  encoding:'utf8',timeout:7000,env:{...process.env,
   CEREBRO_LAB_SESSION_E2E_ARM:'CEREBRO-LAB-SESSION-E2E-ONE-SHOT-hnqlnvakzaywtafeiybt',
   CEREBRO_LAB_PROJECT_REF:'hnqlnvakzaywtafeiybt',
   CEREBRO_LAB_SERVICE_ROLE_KEY:'',CEREBRO_LAB_PUBLISHABLE_KEY:''}
 });
 assert.equal(run.status,2);
 assert.match(run.stdout,/BLOCKED_MISSING_LAB_ONLY_CREDENTIALS/);
 assert.doesNotMatch(run.stdout,/PASS_LAB_ISSUER_ONLY|CREATE|SIGN_IN|CLEANUP_FAILED/);
 assert.equal(run.stderr,'');
});
test('cleanup semantics are fail-closed but do not falsely fail when no user exists',()=>{
 assert.match(source,/cleanupOk=true/);
 assert.match(source,/if\(uuid\(made\.data\?\.user\?\.id\)\)createdUserId=made\.data\.user\.id;/);
 assert.match(source,/if\(made\.error\|\|!createdUserId\)throw Error\('OFFICIAL_USER_CREATE_FAILED'\)/);
 assert.match(source,/if\(createdUserId\)\{[\s\S]*?admin\.auth\.admin\.deleteUser\(createdUserId\)/);
});
