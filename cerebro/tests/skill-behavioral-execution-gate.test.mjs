import test from 'node:test';
import assert from 'node:assert/strict';
import {behavioralExecutionGate} from '../skills/skill-behavioral-execution-gate.mjs';

const oldVsNew={packages:[{package_id:'p1'}]};
const route={status:'READY_ZERO_COST_ROUTE',selected_route:{provider_id:'google-gemini-api-free',additional_cost_eur:0},synthetic_only:true};
const quota={executable:true,paid_fallback:false,planned_calls:{total:6}};

test('gate remains closed without explicit enable even when route and quota are ready',()=>{
  const result=behavioralExecutionGate({oldVsNew,routeAudit:route,quotaPlan:quota,env:{}});
  assert.equal(result.allowed,false);
  assert.ok(result.blockers.includes('EXPLICIT_EXECUTION_ENABLE_MISSING'));
});

test('gate can open only for synthetic zero-cost evaluation with explicit enable',()=>{
  const result=behavioralExecutionGate({oldVsNew,routeAudit:route,quotaPlan:quota,env:{CEREBRO_BEHAVIORAL_EXECUTION_ENABLED:'true'}});
  assert.equal(result.allowed,true);
  assert.equal(result.synthetic_only,true);
  assert.equal(result.paid_fallback,false);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.promotion_authorized,false);
});

test('customer or PROD data flags block behavioral execution',()=>{
  let result=behavioralExecutionGate({oldVsNew,routeAudit:route,quotaPlan:quota,env:{CEREBRO_BEHAVIORAL_EXECUTION_ENABLED:'true',CEREBRO_ALLOW_PROD_DATA:'true'}});
  assert.equal(result.allowed,false);
  assert.ok(result.blockers.includes('PROD_DATA_FORBIDDEN'));
  result=behavioralExecutionGate({oldVsNew,routeAudit:route,quotaPlan:quota,env:{CEREBRO_BEHAVIORAL_EXECUTION_ENABLED:'true',CEREBRO_ALLOW_CUSTOMER_DATA:'true'}});
  assert.equal(result.allowed,false);
  assert.ok(result.blockers.includes('CUSTOMER_DATA_FORBIDDEN'));
});

test('route or quota failure keeps gate closed',()=>{
  const blockedRoute=behavioralExecutionGate({oldVsNew,routeAudit:{status:'BLOCKED_ZERO_COST_ROUTE_NOT_BOUND',selected_route:null,synthetic_only:true},quotaPlan:quota,env:{CEREBRO_BEHAVIORAL_EXECUTION_ENABLED:'true'}});
  assert.equal(blockedRoute.allowed,false);
  const blockedQuota=behavioralExecutionGate({oldVsNew,routeAudit:route,quotaPlan:{...quota,executable:false},env:{CEREBRO_BEHAVIORAL_EXECUTION_ENABLED:'true'}});
  assert.equal(blockedQuota.allowed,false);
});
