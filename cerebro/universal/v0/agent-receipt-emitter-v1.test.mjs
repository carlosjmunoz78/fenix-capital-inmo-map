import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgentReceiptEmitterV1} from './agent-receipt-emitter-v1.mjs';
import {verifyAgentReceiptHmacV1} from './agent-receipt-attestor-v1.mjs';
import {projectAgentEvidenceV1} from './agent-evidence-bridge-v1.mjs';
import {buildCerebroAgentDirectoryV0} from '../../../api/cerebro-agent-directory.ts';

const key=Uint8Array.from({length:32},(_,i)=>i+4);
const clock=()=> '2026-11-18T18:00:00.000Z';
const context={source:'GITHUB_ACTIONS',company_id:'fenix',environment:'LAB',engine_id:'QA-001',
 executor_id:'github-actions-test-executor',job_id:'github-job-example',agent_role_id:'ENG-QA',
 subagent_role_id:null,version:'1.0.0'};
const data=()=>({context,signingKey:key,clock,uuid:()=> 'receipt-test-id-001'});
test('portable emitter and independent Node HMAC verifier agree on canonical bytes',async()=>{
 const envelopes=[];
 const emitter=await createAgentReceiptEmitterV1({...data(),sink:async envelope=>{
  envelopes.push(envelope);return {status:'ACCEPTED',receipt_id:envelope.receipt.receipt_id};
 }});
 const send=await emitter.emit('HEARTBEAT');
 assert.equal(send.status,'SUBMITTED_UNVERIFIED');
 assert.equal(send.certified,false);
 assert.equal(envelopes.length,1);
 const {receipt,signature_hex}=envelopes[0];
 const valid=verifyAgentReceiptHmacV1({receipt,signature_hex,key,expected_source:'GITHUB_ACTIONS'});
 assert(valid);
 const proof=projectAgentEvidenceV1({roster:buildCerebroAgentDirectoryV0(),
  receipts:[valid],company_id:'fenix',observed_at:clock(),authorized_sources:['GITHUB_ACTIONS']});
 assert.equal(proof.runtime_verified_profiles,1);
 assert.equal(proof.active_recent_profiles,1);
 assert.equal(proof.unverified_profiles,2476);
 assert.equal(proof.profiles.find(x=>x.id==='ENG-QA').evidence_state,'ACTIVE_RECENT');
 assert.equal(verifyAgentReceiptHmacV1({receipt:{...receipt,agent_role_id:'ENG-ARCHITECT'},signature_hex,key,expected_source:'GITHUB_ACTIONS'}),null);
});
test('a receipt never becomes verified if sink cannot persist it or is missing',async()=>{
 const failed=await createAgentReceiptEmitterV1({...data(),sink:async()=>{throw Error('NO_CONNECTION')}});
 assert.equal((await failed.emit('SUCCEEDED')).status,'DELIVERY_FAILED');
 const offline=await createAgentReceiptEmitterV1(data());
 assert.equal((await offline.emit('HEARTBEAT')).status,'LOCAL_SIGNATURE_ONLY');
 assert.rejects(()=>offline.emit('PROMOTE'),/UNSUPPORTED_EXECUTION_EVENT/);
});
test('wrong company, PROD runtime and missing canonical agent role never sign',async()=>{
 await assert.rejects(createAgentReceiptEmitterV1({...data(),context:{...context,company_id:'other'}}),/INVALID/);
 await assert.rejects(createAgentReceiptEmitterV1({...data(),context:{...context,environment:'PROD'}}),/INVALID/);
 await assert.rejects(createAgentReceiptEmitterV1({...data(),context:{...context,agent_role_id:null}}),/INVALID/);
 await assert.rejects(createAgentReceiptEmitterV1({...data(),signingKey:Uint8Array.of(1,2,3)}),/INVALID/);
});
