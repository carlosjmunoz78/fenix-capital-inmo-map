import test from 'node:test';
import assert from 'node:assert/strict';
import {JarvisUniversalCore,MemoryEventStore} from './jarvis-universal-core.mjs';
import {B2_EVIDENCE_KEYS,evaluateB2OperationalAcceptance} from './jarvis-b2-acceptance-gate.mjs';
test('B2 cannot close with missing physical tests',()=>{
 const gate=evaluateB2OperationalAcceptance({evidence:{},environment:'PROD'});
 assert.equal(gate.status,'NO_GO');assert.equal(gate.operational,false);
 assert.deepEqual(gate.missing,B2_EVIDENCE_KEYS);
});
test('B2 rejects mocked, stale-mode or incomplete attestations',()=>{
 const evidence=Object.fromEntries(B2_EVIDENCE_KEYS.map(k=>[k,{passed:true,reference:'LAB-test-only',observed_at:'2026-11-03T20:00:00Z',environment:'LAB'}]));
 const result=evaluateB2OperationalAcceptance({evidence,environment:'PROD'});
 assert.equal(result.status,'NO_GO');assert.equal(result.invalid.length,B2_EVIDENCE_KEYS.length);
});
test('even complete recorded evidence requires independent review',()=>{
 const evidence=Object.fromEntries(B2_EVIDENCE_KEYS.map(k=>[k,{passed:true,reference:'audit://verified/'+k,observed_at:'2026-11-03T21:00:00Z',environment:'PROD'}]));
 const result=evaluateB2OperationalAcceptance({evidence,environment:'PROD'});
 assert.equal(result.status,'EVIDENCE_COMPLETE_PENDING_INDEPENDENT_REVIEW');
 assert.equal(result.operational,false);
});
test('core does not manufacture production provenance in LAB',async()=>{
 const core=new JarvisUniversalCore({identityProvider:{verify:async()=>({ownerId:'zeus-test',sessionId:'test',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']})},store:new MemoryEventStore(),ids:()=> 'test-mission'});
 const {mission}=await core.submit({token:'test',companyId:'fenix',projectId:'p',intent:'STATUS',idempotencyKey:'key'});
 assert.equal(mission.environment,'LAB');
 assert.throws(()=>new JarvisUniversalCore({identityProvider:{verify:async()=>{}},store:new MemoryEventStore(),environment:'UNTRUSTED'}),/ENVIRONMENT_INVALID/);
});
