import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverZeroCostResources} from '../runtime/route001-resource-discovery.mjs';
import {runSafePreprodLoop} from '../runtime/route001-safe-preprod-loop.mjs';
import {advanceRepeatabilityResourceState,ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT,runRepeatabilityRehearsal} from '../runtime/route001-repeatable-cycles.mjs';
import {normalizeUniversalLearningSignal} from '../runtime/universal-learning-ingress.mjs';

const lifecycle={credential_health:{'credref:github-actions-token':{usable:true,status:'HEALTHY_PROVIDER_MANAGED'}},disabled_credential_refs:[]};

function observation({run_id=9002,sha='7c34dfb5e1e2827053e4534861c2b569214e1961'}={}){
  return {company_id:'fenix',environment:'PREPROD',observed_at:'2026-10-09T07:45:00Z',repository_visibility:'public',source_run_id:run_id,source_head_sha:sha,source_run_ref:`github-run:${run_id}`,
    runtime:{node:{available:true,version:'v24.21.0'},python:{available:true,version:'Python 3.12.15'},github_actions:{available:true,version:'gh version 2.102.0'}},
    providers:{'github-actions-ephemeral-oss':{runtime_verified:false,integrity_verified:false,quota_guarded:false,remaining_calls:0},'google-gemini-api-free':{reference_present:true,policy_green:false,quota_guarded:false,current_zero_cost_probe_green:false,remaining_calls:0},'cloudflare-workers-ai-free':{reference_present:false,policy_green:false,quota_guarded:false,current_zero_cost_probe_green:false,remaining_calls:0},'mistral-api-free-mode':{reference_present:false,policy_green:false,quota_guarded:false,current_zero_cost_probe_green:false,remaining_calls:0}},
    browser:{binding_status:'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT',connector_registered:true,current_attestation_green:false}};
}

function previousState(){return {schema_version:'1.0.0',state_type:'CEREBRO_ROUTE001_REAL_RESOURCE_STATE',company_id:'fenix',engine_id:'ROUTE-001',environment:'PREPROD_CONTROL_PLANE',version:'0.1.0',updated_at:'2026-10-09T06:57:54Z',source_run_id:37896315736,source_head_sha:'7c34dfb5e1e2827053e4534861c2b569214e1961',repository_visibility:'public',resources:[],discovery_summary:{observed_total:8,available_zero_cost_total:3,historical_only_total:4,hold_total:5},last_safe_loop:{status:'SAFE_PREPROD_LOOP_GREEN',fixture_id:'canonical-json-hash-v0',selected_resource_id:'gha-node-runtime',observed_at:'2026-10-09T06:57:54Z',duration_ms:0.4,business_execution:false},contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0};}

test('bounded rehearsal proves primary Node, real Python fallback, restore, and quiet HOLD on full deterministic loss',()=>{
  const d=discoverZeroCostResources(observation());
  const r=runRepeatabilityRehearsal({discovery:d,lifecycle_state:lifecycle});
  assert.equal(r.status,'REPEATABILITY_REHEARSAL_GREEN');
  assert.equal(r.green_execution_cycles,3);
  assert.equal(r.hold_cycles,1);
  assert.equal(r.fallback_rehearsal_green,true);
  assert.equal(r.restoration_green,true);
  assert.equal(r.full_loss_hold_green,true);
  assert.equal(r.no_human_noise,true);
  assert.deepEqual(r.cycles.map(x=>[x.scenario,x.status,x.selected_resource_id,x.actual_runtime]),[
    ['PRIMARY_CURRENT_EVIDENCE','SAFE_PREPROD_LOOP_GREEN','gha-node-runtime','node'],
    ['CONTROLLED_PRIMARY_RESOURCE_LOSS','SAFE_PREPROD_LOOP_GREEN','gha-python-runtime','python'],
    ['CONTROLLED_PRIMARY_RESTORE','SAFE_PREPROD_LOOP_GREEN','gha-node-runtime','node'],
    ['CONTROLLED_ALL_DETERMINISTIC_RESOURCE_LOSS','HOLD_NO_SAFE_ROUTE',null,null]
  ]);
  assert.equal(r.cycles[1].execution_provenance,'PYTHON_FIXED_SUBPROCESS_NO_SHELL');
  assert.equal(r.cycles[3].human_required,null);
  assert.equal(r.additional_cost_eur,0);
});

test('Python fallback is an actual fixed subprocess executor, not a mislabeled Node execution',()=>{
  const d=discoverZeroCostResources(observation());
  d.resources=d.resources.map(x=>x.resource_id==='gha-node-runtime'?{...x,available:false}:x);
  const loop=runSafePreprodLoop({discovery:d,lifecycle_state:lifecycle});
  assert.equal(loop.status,'SAFE_PREPROD_LOOP_GREEN');
  assert.equal(loop.route.selected_resource_id,'gha-python-runtime');
  assert.equal(loop.actual_runtime,'python');
  assert.equal(loop.execution_provenance,'PYTHON_FIXED_SUBPROCESS_NO_SHELL');
  assert.equal(loop.fixture_result.marker,'ROUTE001_SAFE_FIXTURE_GREEN');
  assert.equal(loop.execution_authorized,false);
});

test('repeatability summary signal conforms to the existing universal learning ingress',()=>{
  const d=discoverZeroCostResources(observation());
  const r=runRepeatabilityRehearsal({discovery:d,lifecycle_state:lifecycle});
  assert.equal(r.learning_signal_report.events_total,1);
  const n=normalizeUniversalLearningSignal(r.learning_signal);
  assert.equal(n.engine_id,'ROUTE-001');
  assert.equal(n.environment,'PREPROD_CANDIDATE');
  assert.equal(n.contains_customer_data,false);
  assert.equal(n.contains_secrets,false);
  assert.equal(n.prod_authorized,false);
  assert.equal(n.prod_write_authorized,false);
  assert.equal(n.trading_access,false);
  assert.equal(n.additional_cost_eur,0);
});

test('persistent repeatability state counts only distinct live GREEN source run ids and reaches target at 3',()=>{
  const d2=discoverZeroCostResources(observation({run_id:9002}));
  const live2=runSafePreprodLoop({discovery:d2,lifecycle_state:lifecycle});
  const reh2=runRepeatabilityRehearsal({discovery:d2,lifecycle_state:lifecycle});
  const state2=advanceRepeatabilityResourceState({previous_state:previousState(),discovery:d2,live_loop:live2,rehearsal:reh2});
  assert.equal(state2.repeatability.consecutive_live_green_cycles,2);
  assert.equal(state2.repeatability.target_reached,false);
  assert.deepEqual(state2.repeatability.recent_live_green_run_ids,[37896315736,9002]);

  const d3=discoverZeroCostResources(observation({run_id:9003,sha:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}));
  const live3=runSafePreprodLoop({discovery:d3,lifecycle_state:lifecycle});
  const reh3=runRepeatabilityRehearsal({discovery:d3,lifecycle_state:lifecycle});
  const state3=advanceRepeatabilityResourceState({previous_state:state2,discovery:d3,live_loop:live3,rehearsal:reh3});
  assert.equal(state3.repeatability.consecutive_live_green_cycles,3);
  assert.equal(state3.repeatability.target_reached,true);
  assert.deepEqual(state3.repeatability.recent_live_green_run_ids,[37896315736,9002,9003]);
  assert.equal(state3.repeatability.fallback_rehearsal_green,true);
  assert.equal(state3.repeatability.no_human_noise,true);
});

test('same live run cannot be double-counted into autonomy evidence',()=>{
  const d=discoverZeroCostResources(observation({run_id:37896315736}));
  const live=runSafePreprodLoop({discovery:d,lifecycle_state:lifecycle});
  const reh=runRepeatabilityRehearsal({discovery:d,lifecycle_state:lifecycle});
  assert.throws(()=>advanceRepeatabilityResourceState({previous_state:previousState(),discovery:d,live_loop:live,rehearsal:reh}),/double-count/);
});

test('red rehearsal or red live loop cannot advance persistent repeatability state',()=>{
  const d=discoverZeroCostResources(observation());
  const live=runSafePreprodLoop({discovery:d,lifecycle_state:lifecycle});
  const reh=runRepeatabilityRehearsal({discovery:d,lifecycle_state:lifecycle});
  assert.throws(()=>advanceRepeatabilityResourceState({previous_state:previousState(),discovery:d,live_loop:{...live,status:'HOLD_NO_SAFE_ROUTE'},rehearsal:reh}),/live loop must be GREEN/);
  assert.throws(()=>advanceRepeatabilityResourceState({previous_state:previousState(),discovery:d,live_loop:live,rehearsal:{...reh,status:'REPEATABILITY_REHEARSAL_RED'}}),/rehearsal must be GREEN/);
});

test('contract keeps bounded fallback proof separate from business authority and next domain promotion',()=>{
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.bounded_rehearsal_cycles,4);
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.green_execution_cycles_required,3);
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.primary_executor,'gha-node-runtime');
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.fallback_executor,'gha-python-runtime');
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.all_deterministic_loss_decision,'HOLD_NO_SAFE_ROUTE');
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.live_distinct_run_target,3);
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.business_execution,false);
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.prod_authorized,false);
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.trading_access,false);
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.multicompany_continuation,false);
  assert.equal(ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT.next_gate,'FIRST_REAL_LOW_RISK_ENGINE_DOMAIN_TEMPLATE_V0');
});
