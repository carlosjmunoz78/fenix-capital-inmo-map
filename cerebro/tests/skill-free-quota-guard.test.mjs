import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFreeQuotaPlan,quotaDecision} from '../skills/skill-free-quota-guard.mjs';

const oldnew={packages:[{package_id:'p1',fixtures:[1,2,3]},{package_id:'p2',fixtures:[1,2,3]}]};
const ready={selected_route:{provider_id:'google-gemini-api-free',additional_cost_eur:0}};

test('two packages with three fixtures fit exactly in 12-call hard cap',()=>{
  const plan=buildFreeQuotaPlan(oldnew,ready);
  assert.equal(plan.executable,true);
  assert.equal(plan.planned_calls.total,12);
  assert.equal(plan.paid_fallback,false);
  assert.equal(plan.model_calls_executed,0);
});

test('missing bound zero-cost route fails closed',()=>{
  const plan=buildFreeQuotaPlan(oldnew,{selected_route:null});
  assert.equal(plan.executable,false);
  assert.ok(plan.blockers.includes('NO_BOUND_ZERO_COST_ROUTE'));
});

test('non-zero-cost route is forbidden even if otherwise selected',()=>{
  const plan=buildFreeQuotaPlan(oldnew,{selected_route:{provider_id:'paid',additional_cost_eur:0.01}});
  assert.equal(plan.executable,false);
  assert.ok(plan.blockers.includes('NONZERO_COST_ROUTE_FORBIDDEN'));
});

test('package growth beyond cap blocks instead of silently expanding usage',()=>{
  const tooMany={packages:[...oldnew.packages,{package_id:'p3',fixtures:[1,2,3]}]};
  const plan=buildFreeQuotaPlan(tooMany,ready);
  assert.equal(plan.executable,false);
  assert.ok(plan.blockers.includes('PACKAGE_CAP_EXCEEDED'));
  assert.ok(plan.blockers.includes('MODEL_CALL_CAP_EXCEEDED'));
});

test('rate limit stops immediately with no paid fallback',()=>{
  const plan=buildFreeQuotaPlan(oldnew,ready);
  const decision=quotaDecision(plan,{calls_used:3,rate_limited:true});
  assert.equal(decision.status,'STOP');
  assert.equal(decision.reason,'HTTP_429');
  assert.equal(decision.paid_fallback,false);
});

test('any provider cost signal becomes MONEY_LIMIT',()=>{
  const plan=buildFreeQuotaPlan(oldnew,ready);
  const decision=quotaDecision(plan,{calls_used:3,cost_signal_eur:0.001});
  assert.equal(decision.status,'STOP');
  assert.equal(decision.reason,'MONEY_LIMIT');
});

test('hard call cap cannot be exceeded',()=>{
  const plan=buildFreeQuotaPlan(oldnew,ready);
  assert.equal(quotaDecision(plan,{calls_used:11}).status,'ALLOW_NEXT_SYNTHETIC_CALL');
  const stopped=quotaDecision(plan,{calls_used:12});
  assert.equal(stopped.status,'STOP');
  assert.equal(stopped.reason,'FREE_QUOTA_CALL_CAP');
});
