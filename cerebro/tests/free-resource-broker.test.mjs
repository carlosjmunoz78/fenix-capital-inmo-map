import test from 'node:test';
import assert from 'node:assert/strict';
import {selectZeroCostResource,FREE_RESOURCE_BROKER_CONTRACT} from '../runtime/free-resource-broker.mjs';

const ctx={company_id:'fenix-capital',engine_id:'JOB-001',environment:'PREPROD',version:'0.1.0'};

test('contract is deterministic zero-cost-first and blocks Trading reuse',()=>{
  assert.equal(FREE_RESOURCE_BROKER_CONTRACT.additional_cost_target_eur,0);
  assert.equal(FREE_RESOURCE_BROKER_CONTRACT.deterministic,true);
  assert.equal(FREE_RESOURCE_BROKER_CONTRACT.trading_reuse_forbidden,true);
});

test('selects LOCAL before other free resources',()=>{
  const r=selectZeroCostResource({context:ctx,job:{duration_min:5},resources:[
    {id:'gha',kind:'GITHUB_ACTIONS',estimated_additional_cost_eur:0,free_quota_remaining:10,available:true,max_duration_min:60},
    {id:'local',kind:'LOCAL',estimated_additional_cost_eur:0,available:true,max_duration_min:60}
  ]});
  assert.equal(r.status,'GREEN'); assert.equal(r.resource.id,'local');
});

test('ignores Trading-classified resources and escalates paid-only to MONEY_LIMIT',()=>{
  const r=selectZeroCostResource({context:ctx,job:{duration_min:5},resources:[
    {id:'trading-vm',kind:'EXISTING_VM',classification:'TRADING',estimated_additional_cost_eur:0,available:true,max_duration_min:60},
    {id:'paid',kind:'PAID_EXCEPTION',estimated_additional_cost_eur:2,available:true,max_duration_min:60}
  ]});
  assert.equal(r.status,'HUMAN_REQUIRED'); assert.equal(r.reason,'MONEY_LIMIT'); assert.equal(r.candidate.id,'paid');
});

test('sensitive job only uses explicitly sensitive-capable zero-cost resource',()=>{
  const r=selectZeroCostResource({context:ctx,job:{duration_min:5,sensitive:true},resources:[
    {id:'free-public',kind:'FREE_TIER',estimated_additional_cost_eur:0,available:true,max_duration_min:60,supports_sensitive:false},
    {id:'local-safe',kind:'LOCAL',estimated_additional_cost_eur:0,available:true,max_duration_min:60,supports_sensitive:true}
  ]});
  assert.equal(r.status,'GREEN'); assert.equal(r.resource.id,'local-safe');
});
