import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {buildCerebroAgentDirectoryV0} from '../../../api/cerebro-agent-directory.ts';
import {canonicalAgentReceiptV1,verifyAgentReceiptHmacV1} from './agent-receipt-attestor-v1.mjs';
import {projectAgentEvidenceV1} from './agent-evidence-bridge-v1.mjs';
const secret=Uint8Array.from({length:32},(_,i)=>i+7),stamp='2026-11-18T18:00:00.000Z';
const roster=buildCerebroAgentDirectoryV0();
const agent=roster.find(x=>x.kind==='AGENT_ROLE'&&x.family==='MEDIA_STUDIO');
assert(agent);
const raw={source:'CLOUDFLARE',company_id:'fenix',environment:'LAB',engine_id:'UMS-001',
 executor_id:'synthetic-test-worker',job_id:'test-job-123',receipt_id:'test-receipt-123',
 agent_role_id:agent.id,subagent_role_id:null,event:'HEARTBEAT',emitted_at:stamp,version:'test'};
const sign=r=>createHmac('sha256',secret).update('CEREBRO_AGENT_RECEIPT_V1\n'+canonicalAgentReceiptV1(r)).digest('hex');
test('authentic server verified receipt credits just the declared agent role',()=>{
 const verified=verifyAgentReceiptHmacV1({receipt:raw,signature_hex:sign(raw),key:secret,expected_source:'CLOUDFLARE'});
 assert.equal(verified?.integrity,'VERIFIED_BY_SOURCE_ADAPTER');
 const out=projectAgentEvidenceV1({roster,receipts:[verified],observed_at:stamp,company_id:'fenix',
  authorized_sources:['CLOUDFLARE']});
 assert.equal(out.runtime_verified_profiles,1);
 assert.equal(out.active_recent_profiles,1);
 assert.equal(out.unverified_profiles,2476);
});
test('forged signature, changed role or source, and wrong key earn zero identity',()=>{
 for(const attempt of [
  {receipt:{...raw,agent_role_id:'ENG-CODE'},signature_hex:sign(raw),key:secret,expected_source:'CLOUDFLARE'},
  {receipt:raw,signature_hex:'0'.repeat(64),key:secret,expected_source:'CLOUDFLARE'},
  {receipt:raw,signature_hex:sign(raw),key:Uint8Array.from({length:32},()=>55),expected_source:'CLOUDFLARE'},
  {receipt:raw,signature_hex:sign(raw),key:secret,expected_source:'SUPABASE'}
 ])assert.equal(verifyAgentReceiptHmacV1(attempt),null);
});
test('untrusted client flag is worthless and cannot upgrade an unsigned receipt',()=>{
 assert.equal(verifyAgentReceiptHmacV1({receipt:{...raw,server_collector_verified:true,integrity:'VERIFIED_BY_SOURCE_ADAPTER'},
  signature_hex:'f'.repeat(64),key:secret,expected_source:'CLOUDFLARE'}),null);
});
