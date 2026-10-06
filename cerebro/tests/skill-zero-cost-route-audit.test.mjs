import test from 'node:test';
import assert from 'node:assert/strict';
import {auditZeroCostBehavioralRoute,bindProviderEvidence} from '../skills/skill-zero-cost-route-audit.mjs';

const providers={routes:[
  {provider_id:'github-models',kind:'MODEL_INFERENCE',route_type:'free_tier',online:true,own_server_required:false,additional_cost_eur:0,availability_state:'RETIRED',credential_state:'NOT_APPLICABLE',behavioral_inference:true,data_policy_state:'NOT_APPLICABLE',eligible_for_behavioral_inference:false},
  {provider_id:'cloudflare-workers-ai-free',kind:'MODEL_INFERENCE',route_type:'free_tier',online:true,own_server_required:false,additional_cost_eur:0,availability_state:'VERIFIED_FREE_TIER_EXISTS',credential_state:'UNBOUND',behavioral_inference:true,data_policy_state:'REVIEW_BEFORE_NON_SYNTHETIC_DATA',quota_guard:'STOP_BEFORE_FREE_ALLOCATION_EXCEEDED',eligible_for_behavioral_inference:false},
  {provider_id:'google-gemini-api-free',kind:'MODEL_INFERENCE',route_type:'free_tier',online:true,own_server_required:false,additional_cost_eur:0,availability_state:'VERIFIED_FREE_TIER_EXISTS',credential_state:'UNBOUND',behavioral_inference:true,data_policy_state:'SYNTHETIC_ONLY_BY_DEFAULT',quota_guard:'STOP_AT_FREE_TIER_LIMIT',eligible_for_behavioral_inference:false}
]};
const oldnew={packages:[{package_id:'oldnew:1'},{package_id:'oldnew:2'}]};

test('retired GitHub Models can never be selected',()=>{
  const report=auditZeroCostBehavioralRoute(providers,oldnew);
  assert.ok(report.retired_routes.includes('github-models'));
  assert.equal(report.selected_route,null);
  assert.equal(report.inference_executed,false);
});

test('unbound free inference blocks safely without spending money',()=>{
  const report=auditZeroCostBehavioralRoute(providers,oldnew);
  assert.equal(report.status,'BLOCKED_ZERO_COST_ROUTE_NOT_BOUND');
  assert.equal(report.human_required,null);
  assert.equal(report.additional_cost_target_eur,0);
  assert.deepEqual(report.unbound_zero_cost_candidates.map(x=>x.provider_id).sort(),['cloudflare-workers-ai-free','google-gemini-api-free']);
});

test('synthetic-only Gemini route becomes eligible only with credentials and quota guard',()=>{
  const bound=bindProviderEvidence(providers,{provider_id:'google-gemini-api-free',credential_ready:true,policy_green:false,free_quota_guarded:true});
  const report=auditZeroCostBehavioralRoute(bound,oldnew);
  assert.equal(report.status,'READY_ZERO_COST_ROUTE');
  assert.equal(report.selected_route.provider_id,'google-gemini-api-free');
  assert.equal(report.selected_route.additional_cost_eur,0);
  assert.equal(report.synthetic_only,true);
});

test('provider requiring policy review stays blocked until policy is green',()=>{
  const partially=bindProviderEvidence(providers,{provider_id:'cloudflare-workers-ai-free',credential_ready:true,policy_green:false,free_quota_guarded:true});
  assert.equal(auditZeroCostBehavioralRoute(partially,oldnew).selected_route,null);
  const bound=bindProviderEvidence(providers,{provider_id:'cloudflare-workers-ai-free',credential_ready:true,policy_green:true,free_quota_guarded:true});
  assert.equal(auditZeroCostBehavioralRoute(bound,oldnew).selected_route.provider_id,'cloudflare-workers-ai-free');
});

test('free credential without a hard quota guard is not eligible',()=>{
  const bound=bindProviderEvidence(providers,{provider_id:'google-gemini-api-free',credential_ready:true,policy_green:true,free_quota_guarded:false});
  assert.equal(auditZeroCostBehavioralRoute(bound,oldnew).selected_route,null);
});

test('paid-only route requires MONEY_LIMIT instead of silent spending',()=>{
  const paid={routes:[{provider_id:'paid',kind:'MODEL_INFERENCE',route_type:'paid_provider',online:true,own_server_required:false,additional_cost_eur:1,availability_state:'VERIFIED_AVAILABLE',credential_state:'READY',behavioral_inference:true,data_policy_state:'GREEN',eligible_for_behavioral_inference:true}]};
  const report=auditZeroCostBehavioralRoute(paid,oldnew);
  assert.equal(report.status,'BLOCKED_ZERO_COST_ROUTE_NOT_BOUND');
  assert.equal(report.human_required,'MONEY_LIMIT');
  assert.equal(report.reason,'ONLY_PAID_ROUTE_AVAILABLE');
});

test('no packages means no inference route is needed',()=>{
  const report=auditZeroCostBehavioralRoute(providers,{packages:[]});
  assert.equal(report.status,'NO_BEHAVIORAL_PACKAGES');
  assert.equal(report.selected_route,null);
});
