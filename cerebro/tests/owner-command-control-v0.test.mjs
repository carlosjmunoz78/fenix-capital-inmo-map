import test from 'node:test';
import assert from 'node:assert/strict';
import {compileOwnerCommand,CEREBRO_OWNER_CONTROL_V0} from '../runtime/owner-command-control-v0.mjs';

const base={
 company_id:'fenix-capital',engine_id:'FACT-001',environment:'PREPROD',
 action:'REQUEST_IMAGE',idempotency_key:'first-image-cerebro-v0',
 payload:{image_count:1,publish_requested:false,brief_ref:'fact001/facebook/brief-v0'}
};
const actor={verified_owner:true,gate_state:{
 credential_rotated_and_verified:false,authorized_budget_active:false,
 paid_media_worker_certified:false,independent_qa_passed:false,rollback_and_backup_verified:false
}};
test('owner can control FACT-001 through ChatGPT, runtime autonomous, emergency access preserved',()=>{
 assert.equal(CEREBRO_OWNER_CONTROL_V0.preferred_human_interface,'CHATGPT');
 assert.equal(CEREBRO_OWNER_CONTROL_V0.chatgpt_is_mandatory_runtime,false);
 assert.equal(CEREBRO_OWNER_CONTROL_V0.break_glass_human_admin_must_remain,true);
 assert.equal(CEREBRO_OWNER_CONTROL_V0.gateway_required,true);
});
test('unauthenticated and cross company requests cannot enqueue',()=>{
 assert.equal(compileOwnerCommand(base).reason,'SECURITY_INCIDENT');
 assert.equal(compileOwnerCommand({...base,company_id:'other-company'},actor).reason,'UNREGISTERED_COMPANY');
 assert.equal(compileOwnerCommand({...base,environment:'PROD'},actor).reason,'PROD_NOT_CERTIFIED');
 assert.equal(compileOwnerCommand({...base,engine_id:'TRADING'},actor).reason,'UNREGISTERED_ENGINE');
});
test('images permitted but compromised credential always HOLD before any provider call',()=>{
 const r=compileOwnerCommand(base,actor);
 assert.equal(r.ok,true);assert.equal(r.record.company_id,'fenix');
 assert.equal(r.record.status,'HOLD');assert.equal(r.record.hold_reason,'SECURITY_INCIDENT');
 assert.equal(r.record.command_type,'REQUEST_IMAGE');
 assert.equal(r.record.publish_authorized,false);
 assert.equal(r.execution_performed,false);
});
test('image first runs only when secret, budget and worker independently verified',()=>{
 const gates={credential_rotated_and_verified:true,authorized_budget_active:true,paid_media_worker_certified:true};
 const r=compileOwnerCommand(base,{verified_owner:true,gate_state:gates});
 assert.equal(r.ok,true);assert.equal(r.record.status,'REQUESTED');
 assert.equal(r.record.publish_authorized,false);
 const b=compileOwnerCommand(base,{verified_owner:true,gate_state:{...gates,authorized_budget_active:false}});
 assert.equal(b.record.hold_reason,'MONEY_LIMIT');
 const c=compileOwnerCommand(base,{verified_owner:true,gate_state:{...gates,paid_media_worker_certified:false}});
 assert.equal(c.record.hold_reason,'WORKER_NOT_CERTIFIED');
});
test('commands never allow publishing, arbitrary code or raw secrets',()=>{
 assert.equal(compileOwnerCommand({...base,payload:{image_count:4}},actor).reason,'IMAGE_CANARY_ONE_NO_PUBLISH');
 assert.equal(compileOwnerCommand({...base,payload:{image_count:1,publish_requested:true}},actor).reason,'IMAGE_CANARY_ONE_NO_PUBLISH');
 assert.throws(()=>compileOwnerCommand({...base,payload:{api_key:'abc'}},actor),/PAYLOAD_SECRET_OR_PII_DENIED/);
 assert.throws(()=>compileOwnerCommand({...base,payload:{run_shell:'rm -rf /',password:'123'}},actor),/PAYLOAD_SECRET_OR_PII_DENIED/);
});
test('human can inspect, request revisions, pause, resume, reject or rollback without touching PROD',()=>{
 const status=compileOwnerCommand({...base,action:'STATUS',payload:{}},actor);
 assert.equal(status.record.status,'REQUESTED');
 const improve=compileOwnerCommand({...base,action:'REQUEST_IMPROVEMENT',payload:{change:'Improve visual hierarchy and readability'}},actor);
 assert.equal(improve.record.status,'REQUESTED');
 const pause=compileOwnerCommand({...base,action:'PAUSE_ENGINE',payload:{}},actor);
 assert.equal(pause.record.hold_reason,'HIGH_RISK');
 const reject=compileOwnerCommand({...base,action:'REJECT_IMAGE',payload:{artifact_ref:'media/candidate-1'}},actor);
 assert.equal(reject.record.status,'REQUESTED');
 const rollback=compileOwnerCommand({...base,action:'ROLLBACK',payload:{target_ref:'creative/release-v1'}},actor);
 assert.equal(rollback.record.hold_reason,'HIGH_RISK');
});
test('approval is not automatically publish authorization',()=>{
 const approval=compileOwnerCommand({...base,action:'APPROVE_IMAGE',payload:{artifact_ref:'media/candidate-1'}},
 {verified_owner:true,gate_state:{independent_qa_passed:true}});
 assert.equal(approval.record.status,'REQUESTED');
 assert.equal(approval.record.publish_authorized,false);
});
