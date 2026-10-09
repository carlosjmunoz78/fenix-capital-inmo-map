import {buildResourceState} from './route001-resource-discovery.mjs';
import {runSafePreprodLoop} from './route001-safe-preprod-loop.mjs';
import {buildUniversalLearningEventReport} from './universal-learning-ingress.mjs';

function safe(v){return Object.freeze({...v,contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0});}
function clone(v){return JSON.parse(JSON.stringify(v));}
function assertDiscovery(d){if(!d||d.state_type!=='CEREBRO_ROUTE001_REAL_RESOURCE_DISCOVERY'||!['LAB','PREPROD'].includes(d.environment))throw new Error('canonical LAB/PREPROD discovery required');}
function withAvailability(discovery,changes){
  const d=clone(discovery);
  d.resources=d.resources.map(r=>Object.prototype.hasOwnProperty.call(changes,r.resource_id)?{...r,available:changes[r.resource_id]===true,availability_state:changes[r.resource_id]===true?'CONTROLLED_REHEARSAL_AVAILABLE':'CONTROLLED_REHEARSAL_RESOURCE_LOSS',current_observation:false,reason:changes[r.resource_id]===true?'CONTROLLED_REHEARSAL_RESTORE':'CONTROLLED_REHEARSAL_RESOURCE_LOSS'}:r);
  d.discovery_summary={...d.discovery_summary,available_zero_cost_total:d.resources.filter(r=>r.available&&Number(r.incremental_cost_eur)===0).length,hold_total:d.resources.filter(r=>!r.available).length};
  d.rehearsal_overlay=true;
  return d;
}

function rehearsalSignal({discovery,rehearsal}){
  const signal={
    signal_id:`route001:${discovery.source_run_id??'local'}:repeatability-rehearsal`,signal_type:'ENGINE_RESULT',company_id:'fenix',engine_id:'ROUTE-001',source_environment:'PREPROD',version:'0.3.0',observed_at:discovery.observed_at,severity:'INFO',confidence:1,risk_class:'LOW',
    reason:'ROUTE-001 completed a bounded repeatability and deterministic fallback rehearsal without business execution.',
    metric:{name:'repeatable_zero_cost_cycles',direction:'HIGHER',measurement:'BOUNDED_CONTROLLED_PREPROD_REHEARSAL'},
    evidence_refs:[`github-run:${discovery.source_run_id??'local'}`,discovery.source_head_sha?`git:${discovery.source_head_sha}`:'route001:no-head-sha'].filter(Boolean),
    payload:{status:rehearsal.status,green_execution_cycles:rehearsal.green_execution_cycles,hold_cycles:rehearsal.hold_cycles,fallback_rehearsal_green:rehearsal.fallback_rehearsal_green,restoration_green:rehearsal.restoration_green,no_human_noise:rehearsal.no_human_noise,executors:rehearsal.cycles.filter(x=>x.fixture_execution_performed).map(x=>({scenario:x.scenario,selected_resource_id:x.selected_resource_id,actual_runtime:x.actual_runtime,execution_provenance:x.execution_provenance}))},
    contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  return Object.freeze(signal);
}

export function runRepeatabilityRehearsal({discovery,lifecycle_state=null,fixture_id='canonical-json-hash-v0'}={}){
  assertDiscovery(discovery);
  const primary=runSafePreprodLoop({discovery,lifecycle_state,fixture_id});
  const nodeLossDiscovery=withAvailability(discovery,{'gha-node-runtime':false});
  const fallback=runSafePreprodLoop({discovery:nodeLossDiscovery,lifecycle_state,fixture_id});
  const restored=runSafePreprodLoop({discovery,lifecycle_state,fixture_id});
  const fullLossDiscovery=withAvailability(discovery,{'gha-node-runtime':false,'gha-python-runtime':false});
  const fullLoss=runSafePreprodLoop({discovery:fullLossDiscovery,lifecycle_state,fixture_id});
  const cycles=[
    {scenario:'PRIMARY_CURRENT_EVIDENCE',status:primary.status,selected_resource_id:primary.route?.selected_resource_id??null,actual_runtime:primary.actual_runtime??null,execution_provenance:primary.execution_provenance??null,fixture_execution_performed:primary.fixture_execution_performed,human_required:primary.human_required??null},
    {scenario:'CONTROLLED_PRIMARY_RESOURCE_LOSS',status:fallback.status,selected_resource_id:fallback.route?.selected_resource_id??null,actual_runtime:fallback.actual_runtime??null,execution_provenance:fallback.execution_provenance??null,fixture_execution_performed:fallback.fixture_execution_performed,human_required:fallback.human_required??null},
    {scenario:'CONTROLLED_PRIMARY_RESTORE',status:restored.status,selected_resource_id:restored.route?.selected_resource_id??null,actual_runtime:restored.actual_runtime??null,execution_provenance:restored.execution_provenance??null,fixture_execution_performed:restored.fixture_execution_performed,human_required:restored.human_required??null},
    {scenario:'CONTROLLED_ALL_DETERMINISTIC_RESOURCE_LOSS',status:fullLoss.status,selected_resource_id:fullLoss.route?.selected_resource_id??null,actual_runtime:fullLoss.actual_runtime??null,execution_provenance:fullLoss.execution_provenance??null,fixture_execution_performed:fullLoss.fixture_execution_performed,human_required:fullLoss.human_required??null}
  ];
  const fallbackGreen=fallback.status==='SAFE_PREPROD_LOOP_GREEN'&&fallback.route?.selected_resource_id==='gha-python-runtime'&&fallback.actual_runtime==='python'&&fallback.execution_provenance==='PYTHON_FIXED_SUBPROCESS_NO_SHELL';
  const primaryGreen=primary.status==='SAFE_PREPROD_LOOP_GREEN'&&primary.route?.selected_resource_id==='gha-node-runtime'&&primary.actual_runtime==='node';
  const restorationGreen=restored.status==='SAFE_PREPROD_LOOP_GREEN'&&restored.route?.selected_resource_id==='gha-node-runtime'&&restored.actual_runtime==='node';
  const lossHoldGreen=fullLoss.status==='HOLD_NO_SAFE_ROUTE'&&fullLoss.fixture_execution_performed===false&&fullLoss.human_required==null;
  const noHumanNoise=cycles.every(x=>x.human_required==null);
  const status=primaryGreen&&fallbackGreen&&restorationGreen&&lossHoldGreen&&noHumanNoise?'REPEATABILITY_REHEARSAL_GREEN':'REPEATABILITY_REHEARSAL_RED';
  const rehearsal=safe({schema_version:'1.0.0',state_type:'CEREBRO_ROUTE001_REPEATABILITY_REHEARSAL',company_id:'fenix',engine_id:'ROUTE-001',environment:discovery.environment,version:'0.3.0',status,fixture_id,cycles:Object.freeze(cycles),green_execution_cycles:cycles.filter(x=>x.status==='SAFE_PREPROD_LOOP_GREEN').length,hold_cycles:cycles.filter(x=>x.status==='HOLD_NO_SAFE_ROUTE').length,fallback_rehearsal_green:fallbackGreen,restoration_green:restorationGreen,full_loss_hold_green:lossHoldGreen,no_human_noise:noHumanNoise,human_required:null,observed_at:discovery.observed_at});
  const learning_signal=rehearsalSignal({discovery,rehearsal});
  const learning_signal_report=buildUniversalLearningEventReport({signals:[learning_signal]});
  return safe({...rehearsal,learning_signal,learning_signal_report});
}

export function advanceRepeatabilityResourceState({previous_state,discovery,live_loop,rehearsal}={}){
  assertDiscovery(discovery);
  if(!previous_state||previous_state.state_type!=='CEREBRO_ROUTE001_REAL_RESOURCE_STATE')throw new Error('previous ROUTE resource state required');
  if(live_loop?.status!=='SAFE_PREPROD_LOOP_GREEN')throw new Error('current live loop must be GREEN before repeatability state advance');
  if(rehearsal?.status!=='REPEATABILITY_REHEARSAL_GREEN')throw new Error('repeatability rehearsal must be GREEN before state advance');
  const currentRun=Number(discovery.source_run_id);if(!Number.isInteger(currentRun)||currentRun<=0)throw new Error('current source_run_id required');
  const priorIds=Array.isArray(previous_state.repeatability?.recent_live_green_run_ids)?previous_state.repeatability.recent_live_green_run_ids.filter(Number.isInteger):Number.isInteger(Number(previous_state.source_run_id))?[Number(previous_state.source_run_id)]:[];
  if(priorIds.includes(currentRun))throw new Error('repeatability state cannot double-count the same live run');
  const priorCount=Number.isInteger(Number(previous_state.repeatability?.consecutive_live_green_cycles))?Number(previous_state.repeatability.consecutive_live_green_cycles):(previous_state.last_safe_loop?.status==='SAFE_PREPROD_LOOP_GREEN'?1:0);
  const consecutive=priorCount+1;
  const ids=[...priorIds,currentRun].slice(-10);
  const last_safe_loop={status:live_loop.status,fixture_id:live_loop.fixture_id,selected_resource_id:live_loop.route.selected_resource_id,selected_resource_class:live_loop.route.selected_resource_class,actual_runtime:live_loop.actual_runtime,execution_provenance:live_loop.execution_provenance,observed_at:live_loop.observed_at,duration_ms:live_loop.duration_ms,learning_events:live_loop.learning_signal_report.events_total,business_execution:false};
  const base=buildResourceState(discovery,{previous_state,last_safe_loop});
  return safe({...base,schema_version:'1.1.0',version:'0.2.0',repeatability:{consecutive_live_green_cycles:consecutive,recent_live_green_run_ids:ids,last_rehearsal_status:rehearsal.status,last_rehearsal_observed_at:rehearsal.observed_at,fallback_rehearsal_green:rehearsal.fallback_rehearsal_green,restoration_green:rehearsal.restoration_green,full_loss_hold_green:rehearsal.full_loss_hold_green,no_human_noise:rehearsal.no_human_noise,certification_target_live_cycles:3,target_reached:consecutive>=3}});
}

export const ROUTE001_REPEATABLE_CYCLES_V0_CONTRACT=Object.freeze({engine_id:'ROUTE-001',company_id:'fenix',environments:['LAB','PREPROD'],bounded_rehearsal_cycles:4,green_execution_cycles_required:3,primary_executor:'gha-node-runtime',fallback_executor:'gha-python-runtime',fallback_executor_provenance:'PYTHON_FIXED_SUBPROCESS_NO_SHELL',all_deterministic_loss_decision:'HOLD_NO_SAFE_ROUTE',canonical_human_noise_on_recoverable_loss:false,live_distinct_run_target:3,learning_ingress:'cerebro_learning_signal',business_execution:false,customer_data:false,secrets:false,prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0,next_gate:'FIRST_REAL_LOW_RISK_ENGINE_DOMAIN_TEMPLATE_V0'});
