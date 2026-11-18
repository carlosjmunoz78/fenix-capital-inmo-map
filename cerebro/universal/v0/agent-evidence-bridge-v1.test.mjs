import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {canonicalAgentReceiptV1,verifyAgentReceiptHmacV1} from './agent-receipt-attestor-v1.mjs';
import {buildCerebroAgentDirectoryV0} from '../../../api/cerebro-agent-directory.ts';
import {projectAgentEvidenceV1} from './agent-evidence-bridge-v1.mjs';
const stamp='2026-11-18T18:00:00.000Z';
const roster=buildCerebroAgentDirectoryV0();
const pair=roster.map(agent=>({agent,sub:roster.find(sub=>sub.kind==='SUBAGENT_ROLE'&&sub.parent_id===agent.id)}))
 .find(x=>x.agent.kind==='AGENT_ROLE'&&x.sub&&!x.agent.engine_ids?.length);
if(!pair)throw Error('FIXTURE_AGENT_SUBAGENT_PAIR_MISSING');
const rawReceipt=(overrides={})=>({
 source:'CLOUDFLARE',company_id:'fenix',environment:'LAB',engine_id:'UMS-001',
 event:'HEARTBEAT',executor_id:'worker-example-lab',agent_role_id:pair.agent.id,
 subagent_role_id:pair.sub.id,job_id:'job-123',receipt_id:'cloudflare-receipt-123',
 emitted_at:stamp,version:'test',integrity:'VERIFIED_BY_SOURCE_ADAPTER',server_collector_verified:true,...overrides
});
const key=Uint8Array.from({length:32},(_,i)=>i+1);
const receipt=(overrides={})=>{
 const raw=rawReceipt(overrides);
 const sig=createHmac('sha256',key).update('CEREBRO_AGENT_RECEIPT_V1\n'+canonicalAgentReceiptV1(raw)).digest('hex');
 return verifyAgentReceiptHmacV1({receipt:raw,signature_hex:sig,key,expected_source:raw.source});
};
const project=(opts={})=>projectAgentEvidenceV1({roster,company_id:'fenix',observed_at:stamp,
 authorized_sources:['CLOUDFLARE','SUPABASE'],...opts});
test('2506 registry profiles: live deployed provider inventory does not certify a single active role',()=>{
 assert.equal(roster.length,2506);
 const result=project({inventories:[
 {source:'CLOUDFLARE',company_id:'fenix',environment:'LAB',
  executor_id:'cerebro-jarvis-lab-eu',observed_at:stamp,server_collector_verified:true},
 {source:'SUPABASE',company_id:'fenix',environment:'PROD',
  executor_id:'fenix-app-gateway',observed_at:stamp,server_collector_verified:true}]});
 assert.equal(result.profile_total,2506);
 assert.equal(result.runtime_verified_profiles,0);
 assert.equal(result.active_recent_profiles,0);
 assert.equal(result.unverified_profiles,2506);
 assert.deepEqual(result.provider_inventory.map(x=>x.visible_executors),[1,1]);
 assert.equal(result.provider_inventory[0].active_agents_from_inventory,null);
});
test('one source-verified receipt auto-links exact agent and subagent, no manual profile configuration',()=>{
 const result=project({receipts:[receipt()]});
 assert.equal(result.runtime_verified_profiles,2);
 assert.equal(result.active_recent_profiles,2);
 for(const id of [pair.agent.id,pair.sub.id]){
  const profile=result.profiles.find(p=>p.id===id);
  assert.equal(profile.evidence_state,'ACTIVE_RECENT');
  assert.equal(profile.last_receipt_id,'cloudflare-receipt-123');
  assert.equal(profile.verified_events,1);
 }
 assert.equal(result.unverified_profiles,2504);
});
test('provider inventory, spoofed receipt, unknown source and missing identity never accredit roles',()=>{
 const result=project({receipts:[
  rawReceipt({receipt_id:'untrusted',server_collector_verified:false}),
  receipt({receipt_id:'unregistered',agent_role_id:'NOT-IN-REGISTRY'}),
  rawReceipt({receipt_id:'unknown-source',source:'EXTERNAL'}),
  receipt({receipt_id:'bad-parent',subagent_role_id:'SEO-D000-INVALID'})]});
 assert.equal(result.runtime_verified_profiles,0);
 assert.equal(result.rejected_receipts.unmatched,2);
 assert.equal(result.rejected_receipts.untrusted,2);
});
test('duplicate, expired and future receipts fail closed, completed historical jobs are not active',()=>{
 const old='2026-11-18T16:00:00.000Z';
 const result=project({receipts:[
  receipt({receipt_id:'historical',event:'SUCCEEDED',emitted_at:old}),
  receipt({receipt_id:'historical',event:'SUCCEEDED',emitted_at:old}),
  receipt({receipt_id:'future',emitted_at:'2026-11-18T18:03:00.000Z'})
 ]});
 assert.equal(result.runtime_verified_profiles,2);
 assert.equal(result.active_recent_profiles,0);
 assert.equal(result.profiles.find(x=>x.id===pair.agent.id).evidence_state,'EXECUTION_EVIDENCED');
 assert.equal(result.rejected_receipts.duplicate,1);
 assert.equal(result.rejected_receipts.invalid,1);
});
test('cross-company receipts, engine mismatch and template IDs cannot claim execution',()=>{
 const agent=roster.find(x=>x.kind==='AGENT_ROLE'&&x.engine_ids?.length>0);
 assert(agent);
 const result=project({receipts:[
 receipt({receipt_id:'other-company',company_id:'aion'}),
 receipt({receipt_id:'engine-mismatch',agent_role_id:agent.id,subagent_role_id:null,engine_id:'OTHER-999'}),
 receipt({receipt_id:'template',agent_role_id:roster.find(x=>x.kind==='SUBAGENT_TEMPLATE').id,subagent_role_id:null})
 ]});
 assert.equal(result.runtime_verified_profiles,0);
});
