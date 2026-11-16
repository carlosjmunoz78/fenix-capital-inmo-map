import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLabReceiptCausality} from '../../../src/cerebroLabReceiptCausality.ts';
const now=Date.parse('2026-11-16T09:00:00Z'),iso=new Date(now).toISOString();
const snapshot=()=>({
 status:'OK',source:'PREPROD_LAB_WORKER_RPC_V0',transport:'PREPROD_OWNER_LAB_RUNTIME_V0',
 company_id:'fenix',environment:'LAB',engine_id:'LAB-DEMO-001',version:'0.1.0',
 desired_state:'PAUSED',priority:3,revision:10,work_units:2,
 last_receipt_id:null,updated_at:iso,observed_at:iso,
 runtime_kind:'DETERMINISTIC_MANUAL_LAB_WORKER',autonomous_scheduling:false,
 prod_execution_enabled:false,executed:false
});
const receipt=(s=snapshot(),action='RESUME',priority=null)=>{
 const newState=action==='PAUSE'?'PAUSED':action==='RESUME'?'RUNNING':s.desired_state;
 const newPriority=action==='PRIORITIZE'?priority:s.priority;
 const unit=action==='TICK'&&s.desired_state==='RUNNING'?1:0;
 return {status:'APPLIED',source:s.source,transport:s.transport,
 company_id:s.company_id,environment:s.environment,engine_id:s.engine_id,
 before:{desired_state:s.desired_state,priority:s.priority,revision:s.revision,work_units:s.work_units},
 after:{desired_state:newState,priority:newPriority,revision:s.revision+1,work_units:s.work_units+unit},
 receipt_id:'123e4567-e89b-42d3-a456-000000000011',executed:true,executed_work_units:unit,
 prod_execution_enabled:false,external_actions_executed:false,autonomous_scheduling:false,additional_cost_eur:0};
};
const post=(s,r)=>({...s,...r.after,last_receipt_id:r.receipt_id,updated_at:iso,observed_at:iso});
test('LAB-DEMO PAUSE/RESUME/PRIORITIZE/TICK require matching receipt and readback',()=>{
 for(const [act,priority] of [['RESUME',null],['PAUSE',null],['PRIORITIZE',5],['TICK',null]]){
  const s=snapshot(),r=receipt(s,act,priority);
  const verdict=verifyLabReceiptCausality(s,act,priority,r,post(s,r),now);
  assert.deepEqual(verdict,{verified:true,reason:'MANUAL_LAB_TRANSITION_VERIFIED'},act);
 }
 const s={...snapshot(),desired_state:'RUNNING'},r=receipt(s,'TICK',null);
 assert.equal(verifyLabReceiptCausality(s,'TICK',null,r,post(s,r),now).verified,true);
});
test('receipt from different before state, action, counter or scope is not accepted',()=>{
 const s=snapshot(),r=receipt(s);
 const altered=[
  {...r,before:{...r.before,priority:5}},
  {...r,before:{...r.before,revision:9}},
  {...r,after:{...r.after,work_units:5}},
  {...r,after:{...r.after,desired_state:'PAUSED'}},
  {...r,company_id:'other-company'},
  {...r,external_actions_executed:true}
 ];
 for(const bad of altered)assert.equal(verifyLabReceiptCausality(s,'RESUME',null,bad,post(s,r),now).verified,false);
});
test('readback must match receipt, be fresh, and carry the persisted receipt id',()=>{
 const s=snapshot(),r=receipt(s),p=post(s,r);
 assert.equal(verifyLabReceiptCausality(s,'RESUME',null,r,{...p,last_receipt_id:null},now).verified,false);
 assert.equal(verifyLabReceiptCausality(s,'RESUME',null,r,{...p,revision:p.revision+1},now).verified,false);
 assert.equal(verifyLabReceiptCausality(s,'RESUME',null,r,{...p,observed_at:'2026-11-15T09:00:00Z'},now).verified,false);
});
test('requested action must equal the observed transition, not merely a plausible receipt',()=>{
 const s=snapshot(),r=receipt(s,'RESUME'),p=post(s,r);
 assert.equal(verifyLabReceiptCausality(s,'PAUSE',null,r,p,now).verified,false);
 assert.equal(verifyLabReceiptCausality(s,'PRIORITIZE',5,r,p,now).verified,false);
});
