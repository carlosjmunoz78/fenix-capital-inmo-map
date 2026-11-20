import test from 'node:test';
import assert from 'node:assert/strict';
import {planReplicateJob,submitReplicateJob,REPLICATE_MODELS} from '../runtime/replicate-provider-lab-v0.mjs';
const base={company_id:'fenix',request_id:'test-0001',environment:'LAB',input:{prompt:'Cinematic architecture in Cordoba'}};
test('FLUX default and cost plan never execute',()=>{
  const p=planReplicateJob(base);
  assert.equal(p.model_id,'black-forest-labs/flux-1.1-pro');
  assert.equal(p.estimated_cost_usd,0.04);
  assert.equal(p.status,'PLANNED_NO_PAID_EXECUTION');
});
test('unknown model and prod execution blocked',()=>{
  assert.throws(()=>planReplicateJob({...base,model_key:'OPENAI_IMAGE'}),/NOT_ALLOWLISTED/);
  assert.throws(()=>planReplicateJob({...base,environment:'PROD'}),/ENVIRONMENT_DENIED/);
});
test('video cost is duration-based',()=>{
  const p=planReplicateJob({...base,model_key:'RUNWAY_GEN_4_5',input:{prompt:'Cinematic city',duration:5}});
  assert.equal(p.estimated_cost_usd,0.6);
});
test('zero API calls when feature flag is OFF',async()=>{
  let calls=0;
  await assert.rejects(submitReplicateJob(planReplicateJob(base),{
    token:'not-real',fetch_impl:async()=>{calls++;throw Error('network');}
  }),/PAID_EXECUTION_OFF/);
  assert.equal(calls,0);
});
test('ledger required before any paid call',async()=>{
  let calls=0;
  await assert.rejects(submitReplicateJob(planReplicateJob(base),{
    paid_execution_enabled:true,token:'fake',
    verified_webhook_url:'https://example.org/verified-handler',
    fetch_impl:async()=>{calls++;throw Error('network');}
  }),/ATOMIC_SPEND_GATE_REQUIRED/);
  assert.equal(calls,0);
});
test('mock atomic ledger gates and stores provider prediction without claiming asset',async()=>{
  const reservations=[];const records=[];let calls=0;
  const spend_gate={
    reserve:async data=>{reservations.push(data);return {approved:true,reservation_id:'test-r1'};},
    recordPrediction:async data=>{records.push(data);}
  };
  const result=await submitReplicateJob(planReplicateJob(base),{
    paid_execution_enabled:true,token:'fake',
    verified_webhook_url:'https://example.org/verified-handler',
    spend_gate,
    fetch_impl:async (url,req)=>{calls++;assert.ok(url.endsWith('/black-forest-labs/flux-1.1-pro/predictions'));
      assert.equal(req.method,'POST');return {ok:true,json:async()=>({id:'pred-123',status:'starting'})};}
  });
  assert.equal(calls,1);assert.equal(reservations.length,1);
  assert.equal(records[0].prediction_id,'pred-123');
  assert.match(result.status,/AWAITING_VERIFIED_OUTPUT/);
});
test('cost guard denial prevents submission',async()=>{
  let calls=0;
  await assert.rejects(submitReplicateJob(planReplicateJob(base),{
    paid_execution_enabled:true,token:'fake',
    verified_webhook_url:'https://example.org/verified-handler',
    spend_gate:{reserve:async()=>({approved:false}),recordPrediction:async()=>{}},
    fetch_impl:async()=>{calls++;return {};}
  }),/BUDGET_NOT_APPROVED/);
  assert.equal(calls,0);
});
