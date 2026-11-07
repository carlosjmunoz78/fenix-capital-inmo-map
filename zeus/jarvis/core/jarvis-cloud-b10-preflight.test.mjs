import test from 'node:test';
import assert from 'node:assert/strict';
import {JARVIS_CLOUD_B10_CHECKS,evaluateJarvisCloudB10} from './jarvis-cloud-b10-preflight.mjs';
const inventory={name:'cerebro-jarvis-lab-eu',plan:'FREE',
 databaseId:'12345678-1234-1234-1234-1234567890ab',
 jurisdiction:'eu',remoteStoreVerified:true,existingWorkersUntouched:true};
const evidence=Object.fromEntries(JARVIS_CLOUD_B10_CHECKS.map(key=>[key,{
 passed:true,environment:'LAB',reference:'independent-lab-evidence/'+key,
 observed_at:'2026-11-05T22:30:00Z'
}]));
test('CUT22 cloud B10 denies missing inventory and non-LAB',()=>{
 assert.equal(evaluateJarvisCloudB10().status,'HOLD_INVENTORY');
 assert.equal(evaluateJarvisCloudB10({environment:'PROD',inventory,evidence}).status,'DENY_NON_LAB');
});
test('CUT22 actual remote D1 with jurisdiction NONE cannot enrol live owner',()=>{
 const blocked=evaluateJarvisCloudB10({inventory:{
 ...inventory,name:'cerebro-jarvis-lab-cut21',
 databaseId:'a859fde1-126b-4c40-bc0d-aec2f8839f7b',
 jurisdiction:null,remoteStoreVerified:false
 },evidence});
 assert.equal(blocked.status,'HOLD_GATES');
 assert.ok(blocked.blockers.includes('EU_JURISDICTION_MISSING'));
 assert.ok(blocked.blockers.includes('REMOTE_PERSISTENCE_UNVERIFIED'));
 assert.equal(blocked.operational,false);
});
test('CUT22 no real identity, Vault, B3 or independent evidence denies',()=>{
 const r=evaluateJarvisCloudB10({inventory,evidence:{}});
 assert.equal(r.status,'HOLD_GATES');
 assert.ok(r.blockers.includes('EVIDENCE_REAL_OWNER_ROOT_ENROLLED_MISSING'));
 assert.ok(r.blockers.includes('EVIDENCE_VAULT_SERVER_SECRET_BOUND_MISSING'));
 assert.ok(r.blockers.includes('EVIDENCE_INDEPENDENT_B10_TRIBUNAL_MISSING'));
});
test('CUT22 cannot treat an unpriced plan, empty UUID or modified Worker as approved',()=>{
 const r=evaluateJarvisCloudB10({inventory:{...inventory,plan:'PAID',
 databaseId:'00000000-0000-0000-0000-000000000000',
 existingWorkersUntouched:false},evidence});
 assert.equal(r.status,'HOLD_GATES');
 for(const b of ['CLOUD_COST_PLAN_NOT_FREE','REMOTE_D1_UUID_UNVERIFIED','EXISTING_WORKERS_NOT_PROTECTED'])
  assert.ok(r.blockers.includes(b));
});
test('CUT22 malformed or out-of-environment evidence fails independently',()=>{
 const bad={...evidence,rollback_exercised:{
  passed:true,environment:'PROD',reference:'test',observed_at:'not-a-date'
 }};
 const r=evaluateJarvisCloudB10({inventory,evidence:bad});
 assert.ok(r.blockers.includes('EVIDENCE_ROLLBACK_EXERCISED_MISSING'));
});
test('CUT22 even apparently complete evidence cannot self-certify PROD autonomy',()=>{
 const r=evaluateJarvisCloudB10({inventory,evidence});
 assert.equal(r.status,'EVIDENCE_COMPLETE_PENDING_INDEPENDENT_REVIEW');
 assert.equal(r.operational,false);assert.equal(r.prod,'NO_GO');
 assert.ok(r.blockers.includes('B10_INDEPENDENT_REVIEW_REQUIRED'));
});
