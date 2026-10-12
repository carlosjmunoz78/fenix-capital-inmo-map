import test from 'node:test';
import assert from 'node:assert/strict';
import { createHumanGatewayV1 } from '../human-intelligence/integration/human-gateway-v1.mjs';

function actor(label,{fail=false}={}){
  const calls=[];
  const fn=async input=>{
    calls.push(structuredClone(input));
    if(fail)throw new Error(`${label}_FAIL`);
    return {text:`${label}:${input.human_message}`,actor_status:'OK',actor_intent:'test',actor_evidence:{real_cerebro_actor:true,environment:'PREPROD',project_ref:'hnqlnvakzaywtafeiybt',prod_write_authorized:false,prod_execution_enabled:false,customer_data:false,trading_access:false,additional_cost_eur:0,source_mode:label==='NEW'?'HUMAN_INTELLIGENCE_NEW_V1_PREPROD':'FROZEN_PROD_V33_SANDBOX'}};
  };
  fn.calls=calls;return fn;
}

test('SHADOW serves OLD and observes NEW without changing user response',async()=>{
  const old=actor('OLD'),neu=actor('NEW');
  const gw=createHumanGatewayV1({actorOld:old,actorNew:neu,routeState:{mode:'SHADOW'}});
  gw.createSession({session_id:'s-shadow',company_id:'fenix'});
  const out=await gw.chat({session_id:'s-shadow',message:'hola'});
  assert.match(out.message,/^OLD:/);
  assert.equal(out.routing_evidence.served,'OLD');
  assert.equal(out.routing_evidence.shadow.ok,true);
  assert.equal(old.calls.length,1);assert.equal(neu.calls.length,1);
  assert.equal(out.routing_evidence.prod_write_authorized,false);
});

test('CANARY assignment is stable for every turn of a session',async()=>{
  const old=actor('OLD'),neu=actor('NEW');
  const gw=createHumanGatewayV1({actorOld:old,actorNew:neu,routeState:{mode:'CANARY',canary_percent:50}});
  const created=gw.createSession({session_id:'stable-session-01',company_id:'fenix'});
  const a=await gw.chat({session_id:'stable-session-01',message:'uno'});
  const b=await gw.chat({session_id:'stable-session-01',message:'dos'});
  assert.equal(a.routing_evidence.assigned,created.assignment.selected);
  assert.equal(b.routing_evidence.assigned,created.assignment.selected);
  assert.equal(a.routing_evidence.bucket,b.routing_evidence.bucket);
  assert.equal(a.routing_evidence.served,b.routing_evidence.served);
  assert.equal(old.calls.length+neu.calls.length,2);
});

test('NEW actor failure falls back to OLD fail-safe inside PREPROD',async()=>{
  const old=actor('OLD'),neu=actor('NEW',{fail:true});
  const gw=createHumanGatewayV1({actorOld:old,actorNew:neu,routeState:{mode:'NEW'}});
  gw.createSession({session_id:'s-fallback',company_id:'fenix'});
  const out=await gw.chat({session_id:'s-fallback',message:'prueba'});
  assert.equal(out.routing_evidence.assigned,'NEW');
  assert.equal(out.routing_evidence.served,'OLD');
  assert.equal(out.routing_evidence.fallback_triggered,true);
  assert.match(out.message,/^OLD:/);
  assert.equal(neu.calls.length,1);assert.equal(old.calls.length,1);
});

test('ROLLBACK always serves OLD and contract remains PREPROD-only',async()=>{
  const old=actor('OLD'),neu=actor('NEW');
  const gw=createHumanGatewayV1({actorOld:old,actorNew:neu,routeState:{mode:'ROLLBACK',canary_percent:100}});
  const created=gw.createSession({session_id:'s-rollback',company_id:'fenix'});
  assert.equal(created.assignment.selected,'OLD');
  const out=await gw.chat({session_id:'s-rollback',message:'vuelve'});
  assert.equal(out.routing_evidence.served,'OLD');
  assert.equal(neu.calls.length,0);assert.equal(old.calls.length,1);
  const contract=gw.contract();
  assert.equal(contract.environment,'PREPROD');
  assert.equal(contract.direct_model_access,false);
  assert.equal(contract.prod_authorized,false);
  assert.equal(contract.prod_write_authorized,false);
  assert.equal(contract.trading_access,false);
  assert.equal(contract.additional_cost_eur,0);
});
