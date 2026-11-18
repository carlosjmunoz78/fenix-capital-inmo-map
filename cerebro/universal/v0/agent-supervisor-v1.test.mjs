import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {buildCerebroAgentDirectoryV0} from '../../../api/cerebro-agent-directory.ts';
import {canonicalAgentReceiptV1,verifyAgentReceiptHmacV1} from './agent-receipt-attestor-v1.mjs';
import {projectAgentEvidenceV1} from './agent-evidence-bridge-v1.mjs';
import {superviseAgentsV1} from './agent-supervisor-v1.mjs';
const clock='2026-11-18T19:00:00.000Z',key=Uint8Array.from({length:32},(_,i)=>i+9);
const roster=buildCerebroAgentDirectoryV0();
const role=roster.find(p=>p.kind==='AGENT_ROLE'&&p.id==='ENG-QA');
assert(role);
function signed(event,receipt_id,emitted_at='2026-11-18T18:59:00.000Z',job_id='qa-live-one'){
 const source={source:'GITHUB_ACTIONS',company_id:'fenix',environment:'LAB',engine_id:'QA-001',
  executor_id:'github-actions-real-qa-lab',job_id,receipt_id,agent_role_id:role.id,
  subagent_role_id:null,event,emitted_at,version:'1.0.0'};
 const sig=createHmac('sha256',key).update('CEREBRO_AGENT_RECEIPT_V1\n'+canonicalAgentReceiptV1(source)).digest('hex');
 return verifyAgentReceiptHmacV1({receipt:source,signature_hex:sig,key,expected_source:'GITHUB_ACTIONS'});
}
function supervise(receipts){
 const p=projectAgentEvidenceV1({roster,receipts,company_id:'fenix',observed_at:clock,
  authorized_sources:['GITHUB_ACTIONS']});
 return superviseAgentsV1({projection:p,observed_at:clock});
}
test('unverified 2477 and 29 templates are not marked as failed or excellent',()=>{
 const r=supervise([]);
 assert.equal(r.summary.registered_profiles,2506);
 assert.equal(r.summary.accreditable_profiles,2477);
 assert.equal(r.summary.templates_not_installed,29);
 assert.equal(r.summary.not_verified,2477);
 assert.equal(r.summary.failed_verified,0);
 assert.equal(r.summary.excellence_verified,0);
});
test('signed heartbeat is running verified, never excellence just from activity',()=>{
 const r=supervise([signed('HEARTBEAT','heartbeat-id')]);
 assert.equal(r.summary.running_verified,1);
 assert.equal(r.summary.excellence_verified,0);
 assert.equal(r.profiles.find(p=>p.id===role.id).quality,'NOT_ATTESTED');
});
test('signed terminal failure is FAILED_VERIFIED, not false healthy',()=>{
 const r=supervise([signed('HEARTBEAT','beat-1'),signed('FAILED','failed-1','2026-11-18T18:59:45.000Z')]);
 assert.equal(r.summary.running_verified,0);
 assert.equal(r.summary.failed_verified,1);
});
test('signed success is completed historical evidence, not running',()=>{
 const r=supervise([signed('STARTED','start-1'),signed('SUCCEEDED','done-1','2026-11-18T18:59:45.000Z')]);
 assert.equal(r.summary.running_verified,0);
 assert.equal(r.summary.executed_not_running,1);
 assert.equal(r.summary.excellence_verified,0);
});
test('external forged projection cannot supply false positive statuses',()=>{
 const projection=projectAgentEvidenceV1({roster,company_id:'fenix',observed_at:clock,receipts:[],authorized_sources:[]});
 const forged=JSON.parse(JSON.stringify(projection));
 forged.profiles[0].runtime_verified=true;
 forged.profiles[0].active_execution_verified=true;
 assert.throws(()=>superviseAgentsV1({projection:forged,observed_at:clock}),/UNTRUSTED_PROJECTION/);
});
