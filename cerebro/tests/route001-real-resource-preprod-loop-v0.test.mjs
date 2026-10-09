import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverZeroCostResources,buildResourceState,ROUTE001_RESOURCE_DISCOVERY_V0_CONTRACT} from '../runtime/route001-resource-discovery.mjs';
import {buildSafeRouterTask,runSafePreprodLoop,ROUTE001_SAFE_PREPROD_LOOP_V0_CONTRACT} from '../runtime/route001-safe-preprod-loop.mjs';
import {normalizeUniversalLearningSignal} from '../runtime/universal-learning-ingress.mjs';

const observed_at='2026-10-09T07:30:00Z';
function input(overrides={}){
  return {
    company_id:'fenix',environment:'PREPROD',observed_at,repository_visibility:'public',source_run_id:9001,source_head_sha:'4ddc295b4a883d0e692fd5c348e180e076424238',source_run_ref:'github-run:9001',
    runtime:{node:{available:true,version:'v24.0.0'},python:{available:true,version:'Python 3.12.0'},github_actions:{available:true,version:'gh version 2.0.0'}},
    providers:{
      'github-actions-ephemeral-oss':{runtime_verified:false,integrity_verified:false,quota_guarded:false,remaining_calls:0},
      'google-gemini-api-free':{reference_present:true,policy_green:true,quota_guarded:true,current_zero_cost_probe_green:false,remaining_calls:10},
      'cloudflare-workers-ai-free':{reference_present:false,policy_green:false,quota_guarded:false,current_zero_cost_probe_green:false,remaining_calls:0},
      'mistral-api-free-mode':{reference_present:false,policy_green:false,quota_guarded:false,current_zero_cost_probe_green:false,remaining_calls:0}
    },
    browser:{binding_status:'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT',connector_registered:true,current_attestation_green:false},
    ...overrides
  };
}

const lifecycle={credential_health:{'credref:github-actions-token':{usable:true,status:'HEALTHY_PROVIDER_MANAGED'}},disabled_credential_refs:[]};

test('real discovery trusts current runner probes and public repo evidence for deterministic zero-cost resources',()=>{
  const d=discoverZeroCostResources(input());
  assert.equal(d.repository_visibility,'public');
  assert.equal(d.resources.find(x=>x.resource_id==='gha-node-runtime').available,true);
  assert.equal(d.resources.find(x=>x.resource_id==='gha-python-runtime').available,true);
  assert.equal(d.resources.find(x=>x.resource_id==='github-actions-control').available,true);
  assert.equal(d.additional_cost_eur,0);
  assert.equal(d.prod_authorized,false);
  assert.equal(d.trading_access,false);
});

test('historical provider evidence is never silently upgraded to current availability',()=>{
  const d=discoverZeroCostResources(input());
  const oss=d.resources.find(x=>x.resource_id==='github-actions-ephemeral-oss');
  const gem=d.resources.find(x=>x.resource_id==='google-gemini-api-free');
  assert.equal(oss.available,false);
  assert.equal(oss.availability_state,'HISTORICAL_ONLY_CURRENT_PROBE_REQUIRED');
  assert.equal(gem.available,false);
  assert.equal(gem.availability_state,'HISTORICAL_ONLY_CURRENT_PROBE_REQUIRED');
  assert.match(gem.reason,/REFERENCE_PRESENCE_ALONE/);
});

test('private repository cannot claim standard public GitHub Actions zero-additional-cost eligibility',()=>{
  const d=discoverZeroCostResources(input({repository_visibility:'private'}));
  const gha=d.resources.find(x=>x.resource_id==='github-actions-control');
  assert.equal(gha.available,false);
  assert.equal(gha.availability_state,'HOLD_ZERO_COST_NOT_PROVEN_FOR_PRIVATE_REPO');
});

test('external free AI needs a current zero-cost probe plus current quota/policy evidence',()=>{
  const d=discoverZeroCostResources(input({providers:{...input().providers,'google-gemini-api-free':{reference_present:true,policy_green:true,quota_guarded:true,current_zero_cost_probe_green:true,remaining_calls:4,current_probe_evidence_ref:'run:live-free-probe'}}}));
  const gem=d.resources.find(x=>x.resource_id==='google-gemini-api-free');
  assert.equal(gem.available,true);
  assert.equal(gem.availability_state,'CURRENT_ZERO_COST_PROBE_POLICY_QUOTA_GREEN');
  assert.equal(gem.incremental_cost_eur,0);
});

test('browser stays unavailable without a current real attestation even when connector is registered',()=>{
  const d=discoverZeroCostResources(input());
  const browser=d.resources.find(x=>x.resource_id==='agent-browser-real');
  assert.equal(browser.available,false);
  assert.equal(browser.availability_state,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
});

test('discovery rejects secret-like keys/material and non-LAB/PREPROD environments',()=>{
  assert.throws(()=>discoverZeroCostResources({...input(),api_key:'do-not-pass'}),/secret-like material forbidden/);
  assert.throws(()=>discoverZeroCostResources({...input(),environment:'PROD'}),/environment denied/);
});

test('safe loop selects the real observed Node runner and executes only the allowlisted synthetic fixture',()=>{
  const d=discoverZeroCostResources(input());
  const task=buildSafeRouterTask(d,{fixture_id:'canonical-json-hash-v0',lifecycle_state:lifecycle});
  assert.equal(task.task_type,'rule');
  assert.equal(task.contains_customer_data,false);
  const r=runSafePreprodLoop({discovery:d,lifecycle_state:lifecycle,fixture_id:'canonical-json-hash-v0'});
  assert.equal(r.status,'SAFE_PREPROD_LOOP_GREEN');
  assert.equal(r.route.selected_resource_id,'gha-node-runtime');
  assert.equal(r.route.selected_resource_class,'DETERMINISTIC_LOCAL');
  assert.equal(r.fixture_execution_performed,true);
  assert.equal(r.fixture_result.marker,'ROUTE001_SAFE_FIXTURE_GREEN');
  assert.equal(r.learning_signal_report.events_total,3);
  assert.equal(r.execution_authorized,false);
  assert.equal(r.additional_cost_eur,0);
});

test('every emitted learning signal conforms to the existing universal RSI ingress contract',()=>{
  const d=discoverZeroCostResources(input());
  const r=runSafePreprodLoop({discovery:d,lifecycle_state:lifecycle});
  for(const signal of r.learning_signals){
    const normalized=normalizeUniversalLearningSignal(signal);
    assert.equal(normalized.company_id,'fenix');
    assert.equal(normalized.engine_id,'ROUTE-001');
    assert.equal(normalized.environment,'PREPROD_CANDIDATE');
    assert.equal(normalized.contains_customer_data,false);
    assert.equal(normalized.contains_secrets,false);
    assert.equal(normalized.prod_authorized,false);
    assert.equal(normalized.prod_write_authorized,false);
    assert.equal(normalized.trading_access,false);
    assert.equal(normalized.additional_cost_eur,0);
  }
});

test('safe loop holds rather than executing when deterministic real runner evidence is absent',()=>{
  const d=discoverZeroCostResources(input({runtime:{node:{available:false},python:{available:false},github_actions:{available:false}}}));
  const r=runSafePreprodLoop({discovery:d,lifecycle_state:lifecycle});
  assert.equal(r.status,'HOLD_NO_SAFE_ROUTE');
  assert.equal(r.fixture_execution_performed,false);
  assert.equal(r.human_required,null);
});

test('non-allowlisted fixture cannot become an execution surface',()=>{
  const d=discoverZeroCostResources(input());
  assert.throws(()=>runSafePreprodLoop({discovery:d,lifecycle_state:lifecycle,fixture_id:'arbitrary-shell-command'}),/fixture_id not allowlisted/);
});

test('resource state stores evidence metadata only and never expands authority',()=>{
  const d=discoverZeroCostResources(input());
  const loop=runSafePreprodLoop({discovery:d,lifecycle_state:lifecycle});
  const state=buildResourceState(d,{previous_state:null,last_safe_loop:{status:loop.status,fixture_id:loop.fixture_id,selected_resource_id:loop.route.selected_resource_id,observed_at:loop.observed_at,duration_ms:loop.duration_ms}});
  assert.equal(state.state_type,'CEREBRO_ROUTE001_REAL_RESOURCE_STATE');
  assert.equal(state.last_safe_loop.status,'SAFE_PREPROD_LOOP_GREEN');
  assert.equal(state.contains_secrets,false);
  assert.equal(state.prod_authorized,false);
  assert.equal(state.prod_write_authorized,false);
  assert.equal(state.execution_authorized,false);
  assert.equal(state.trading_access,false);
  assert.equal(state.multicompany_continuation,false);
  assert.equal(state.additional_cost_eur,0);
});

test('contracts preserve no paid discovery, no business execution and next bounded gate',()=>{
  assert.equal(ROUTE001_RESOURCE_DISCOVERY_V0_CONTRACT.static_evidence_never_equals_current_availability,true);
  assert.equal(ROUTE001_RESOURCE_DISCOVERY_V0_CONTRACT.paid_resources_discovered,false);
  assert.equal(ROUTE001_RESOURCE_DISCOVERY_V0_CONTRACT.repo_public_required_for_zero_cost_gha_claim,true);
  assert.equal(ROUTE001_SAFE_PREPROD_LOOP_V0_CONTRACT.business_execution,false);
  assert.equal(ROUTE001_SAFE_PREPROD_LOOP_V0_CONTRACT.network_write,false);
  assert.equal(ROUTE001_SAFE_PREPROD_LOOP_V0_CONTRACT.repo_write,false);
  assert.equal(ROUTE001_SAFE_PREPROD_LOOP_V0_CONTRACT.multicompany_continuation,false);
  assert.equal(ROUTE001_SAFE_PREPROD_LOOP_V0_CONTRACT.next_gate,'ROUTE001_REPEATABLE_AUTONOMOUS_PREPROD_CYCLES_V0');
});
