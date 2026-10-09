import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOldNewEvaluationTribunalGate} from './rsi-old-new-evaluation-tribunal-gate.mjs';
import {loadDomainPolicyRegistry,runRegisteredDomainPreprodLoop} from './rsi-domain-policy-registry.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_EVIDENCE_REGISTRY=path.resolve(HERE,'../registry/rsi-domain-evidence-sources.v0.json');
const PREPROD='PREPROD';
const AUTO_ENGINE='AUTO-001';
const AUTO_DOMAIN='fenix.automation';
const AUTO_SOURCE='github:learning-control-plane:automation';
const REQUIRED_AUTO_WORKFLOWS=Object.freeze(['CEREBRO RSI Learning Control Plane V0','CEREBRO RSI Learning Outbox Publisher V0']);

function readJson(file,label){let value;try{value=JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){throw new Error(`${label} unreadable:${error.message}`);}return value;}
function frozen(value){return Object.freeze({...value,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0});}
function hold(reason,extra={}){return frozen({ok:false,decision:'HOLD',human_required:null,reasons:[reason],next_gate:'FIRST_REAL_LOW_RISK_ENGINE_DOMAIN_TEMPLATE_V0',...extra});}
function safeRunIds(values){return [...new Set((values??[]).map(Number).filter(Number.isInteger))];}
function safetyBoundary(value,label){
  if(!value||typeof value!=='object') return `${label}_REQUIRED`;
  if(value.contains_customer_data===true) return `${label}_CUSTOMER_DATA_FORBIDDEN`;
  if(value.contains_secrets===true) return `${label}_SECRETS_FORBIDDEN`;
  if(value.prod_authorized===true||value.prod_write_authorized===true||value.execution_authorized===true||value.trading_access===true||value.multicompany_continuation===true) return `${label}_AUTHORITY_FORBIDDEN`;
  if(Number(value.additional_cost_eur??0)!==0) return `${label}_COST_MUST_BE_ZERO`;
  return null;
}

export function validateFirstRealDomainEvidence({route_state,auto_workflow_evidence,evidence_registry_path=DEFAULT_EVIDENCE_REGISTRY}={}){
  const policies=loadDomainPolicyRegistry();
  const policy=policies.policies.find(x=>x.engine_id===AUTO_ENGINE&&x.domain_id===AUTO_DOMAIN);
  if(!policy) return hold('AUTO001_DOMAIN_POLICY_REQUIRED');
  if(policy.autonomy_mode!=='PREPROD_AUTONOMOUS') return hold('AUTO001_POLICY_NOT_PREPROD_AUTONOMOUS',{policy_mode:policy.autonomy_mode});
  if(policy.kill_switch_state!=='ARMED'||policy.kill_switch_enabled!==true) return hold('AUTO001_KILL_SWITCH_NOT_ARMED');
  if(policy.automatic_rollback_allowed!==true) return hold('AUTO001_AUTOMATIC_ROLLBACK_REQUIRED');

  const evidenceRegistry=readJson(evidence_registry_path,'real-domain evidence registry');
  const binding=(evidenceRegistry.bindings??[]).find(x=>x.source_id===AUTO_SOURCE&&x.engine_id===AUTO_ENGINE&&x.domain_id===AUTO_DOMAIN);
  if(!binding||binding.state!=='LIVE_CONNECTED') return hold('AUTO001_LIVE_EVIDENCE_BINDING_REQUIRED');
  if(binding.source_environment!==PREPROD) return hold('AUTO001_EVIDENCE_SOURCE_MUST_BE_PREPROD');
  if(Number(binding.confidence)<Number(policy.min_confidence)) return hold('AUTO001_EVIDENCE_CONFIDENCE_BELOW_POLICY',{evidence_confidence:Number(binding.confidence),policy_min_confidence:Number(policy.min_confidence)});
  if(!REQUIRED_AUTO_WORKFLOWS.every(name=>(binding.workflow_names??[]).includes(name))) return hold('AUTO001_REQUIRED_WORKFLOW_BINDINGS_INCOMPLETE');

  const routeBoundary=safetyBoundary(route_state,'ROUTE001');
  if(routeBoundary) return hold(routeBoundary);
  if(route_state.state_type!=='CEREBRO_ROUTE001_REAL_RESOURCE_STATE') return hold('ROUTE001_STATE_TYPE_INVALID');
  if(route_state.environment!=='PREPROD_CONTROL_PLANE') return hold('ROUTE001_PREPROD_STATE_REQUIRED');
  if(route_state.last_safe_loop?.status!=='SAFE_PREPROD_LOOP_GREEN') return hold('ROUTE001_LAST_SAFE_LOOP_NOT_GREEN');
  const repeat=route_state.repeatability??{};
  const distinct=safeRunIds(repeat.recent_live_green_run_ids);
  if(repeat.target_reached!==true||Number(repeat.consecutive_live_green_cycles)<3||distinct.length<3) return hold('ROUTE001_REPEATABILITY_TARGET_NOT_REACHED',{distinct_live_green_run_ids:distinct});
  if(repeat.fallback_rehearsal_green!==true||repeat.restoration_green!==true||repeat.full_loss_hold_green!==true||repeat.no_human_noise!==true) return hold('ROUTE001_RECOVERY_OR_NOISE_PROOF_INCOMPLETE');

  const wfBoundary=safetyBoundary(auto_workflow_evidence,'AUTO001_WORKFLOW_EVIDENCE');
  if(wfBoundary) return hold(wfBoundary);
  if(auto_workflow_evidence.environment!==PREPROD) return hold('AUTO001_WORKFLOW_EVIDENCE_PREPROD_REQUIRED');
  const successful=new Map((auto_workflow_evidence.successful_runs??[]).map(x=>[x.workflow_name,x]));
  for(const name of REQUIRED_AUTO_WORKFLOWS){
    const row=successful.get(name);
    if(!row||row.conclusion!=='success'||!Number.isInteger(Number(row.run_id))||typeof row.head_sha!=='string'||!/^[0-9a-f]{40}$/i.test(row.head_sha)) return hold('AUTO001_CURRENT_REAL_WORKFLOW_SUCCESS_REQUIRED',{missing_or_invalid_workflow:name});
    if(!row.observed_at||Number.isNaN(Date.parse(row.observed_at))) return hold('AUTO001_WORKFLOW_TIMESTAMP_REQUIRED',{missing_or_invalid_workflow:name});
  }
  return frozen({
    ok:true,decision:'EVIDENCE_GREEN',human_required:null,next_gate:'AUTO001_OLD_VS_NEW_TRIBUNAL',engine_id:AUTO_ENGINE,domain_id:AUTO_DOMAIN,
    evidence_confidence:Number(binding.confidence),policy_min_confidence:Number(policy.min_confidence),route_live_green_cycles:Number(repeat.consecutive_live_green_cycles),
    route_live_green_run_ids:distinct,workflow_run_ids:REQUIRED_AUTO_WORKFLOWS.map(name=>Number(successful.get(name).run_id)),
    evidence_refs:[`source:${binding.source_id}`,`route-state:${route_state.source_run_id}`,...REQUIRED_AUTO_WORKFLOWS.map(name=>`github-run:${successful.get(name).run_id}`)]
  });
}

function candidateForAuto001({confidence=0.90,risk_class='LOW',additional_cost_eur=0}={}){
  return Object.freeze({
    candidate_id:'auto001:first-real-preprod-autonomy:v2',company_id:'fenix',engine_id:AUTO_ENGINE,environment:PREPROD,
    baseline_version:'auto001-assisted-v1',candidate_version:'auto001-preprod-autonomous-v2',
    hypothesis:'AUTO-001 can safely execute bounded PREPROD control-plane fixtures autonomously when live evidence, zero-cost routing, recovery controls and relearning feedback are all simultaneously GREEN.',
    next_gate:'OLD_VS_NEW_EXPERIMENT',risk_class,confidence,target_metric:{name:'safe_autonomy_evidence_layers',direction:'HIGHER'},
    baseline_verification_required:false,preservation_contract:{policy_mutation_allowed:false,permission_elevation_allowed:false,budget_elevation_allowed:false},
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur
  });
}

export async function runFirstRealAuto001AutonomyGate({route_state,auto_workflow_evidence,confidence=0.90,risk_class='LOW',additional_cost_eur=0,observed_at='2026-10-09T07:30:00Z'}={}){
  const evidence=validateFirstRealDomainEvidence({route_state,auto_workflow_evidence});
  if(!evidence.ok) return evidence;
  const candidate=candidateForAuto001({confidence,risk_class,additional_cost_eur});
  if(additional_cost_eur!==0) return frozen({ok:false,decision:'HUMAN_REQUIRED',human_required:'MONEY_LIMIT',reasons:['AUTO001_INCREMENTAL_COST_NONZERO'],next_gate:'HUMAN_REQUIRED'});
  const fixture={fixture_ref:'cerebro:auto001:first-real-domain:safety-evidence-v0',dataset_kind:'HOLDOUT',case_ids:['live-domain-evidence','route-repeatability','kill-switch-rollback','relearning-feedback']};
  const execute_arm=async(input)=>{
    const score=input.arm==='OLD'?1:4;
    return {version:input.version,fixture_id:input.fixture_id,metrics:{safe_autonomy_evidence_layers:score},evidence_refs:input.arm==='OLD'?['policy:auto001:assisted-v1']:[...evidence.evidence_refs,'policy:auto001:preprod-autonomous-v2','recovery:auto001:rollback-rebuild'],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  };
  const b3=await runOldNewEvaluationTribunalGate({
    candidate,fixture,execute_arm,
    benchmark_contract:{benchmark_id:'auto001-safe-autonomy-evidence',benchmark_version:'v1',holdout_ref:'cerebro:auto001:first-real-domain:holdout-v0',adversarial_refs:['route-loss-hold','kill-switch-trip','cost-nonzero-deny']},
    judge:{judge_id:'cerebro-tribunal:auto001-v0',candidate_actor_id:candidate.candidate_id},backup_ref:'git:main-before-auto001-autonomy',rollback_ref:'policy:rsi-domain:fenix-automation:v1',rebuild_ref:'factory:FACT-001:AUTO-001',
    post_metric_rule:{min:4},canary_percent:5,candidate_visible_holdout:false,real_outcome_delta:1
  });
  if(!b3.ok) return frozen({...b3,first_real_domain:AUTO_DOMAIN});
  const b4=runRegisteredDomainPreprodLoop({
    company_id:'fenix',engine_id:AUTO_ENGINE,domain_id:AUTO_DOMAIN,candidate,promotion_plan:b3.promotion_plan,
    shadow_evidence:{pass:true,evidence_refs:[...evidence.evidence_refs,'auto001:shadow:bounded-control-plane-fixture'],additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false},
    canary_evidence:{pass:true,evidence_refs:[...evidence.evidence_refs,'auto001:canary:5-percent-policy-ceiling'],additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false},
    observed_metrics:{safe_autonomy_evidence_layers:4},observed_at,evidence_refs:[...evidence.evidence_refs,'auto001:first-real-domain-gate']
  });
  if(!b4.loop_started||b4.decision!=='KEEP_NONPROD_AND_RELEARN') return frozen({ok:false,decision:b4.decision??'HOLD',human_required:b4.human_required??null,reasons:b4.reasons??['AUTO001_B4_NOT_GREEN'],next_gate:b4.next_gate??'B4_PREPROD_SHADOW_CANARY',evidence,b3,b4});
  return frozen({
    ok:true,status:'FIRST_REAL_DOMAIN_PREPROD_AUTONOMY_GREEN',decision:'KEEP_NONPROD_AND_RELEARN',human_required:null,next_gate:'B1_UNIVERSAL_LEARNING_INGRESS',
    company_id:'fenix',engine_id:AUTO_ENGINE,domain_id:AUTO_DOMAIN,autonomy_mode:'PREPROD_AUTONOMOUS',business_execution:false,
    evidence,b3_decision:b3.decision,tribunal_decision:b3.tribunal?.decision??null,promotion_id:b3.promotion_plan.promotion_id,b4_decision:b4.decision,
    feedback_events_total:b4.feedback_report?.events_total??0,rollback_executed:b4.rollback_executed===true,current_domain_promotion_authority_required:true
  });
}

export const FIRST_REAL_DOMAIN_AUTO001_V0_CONTRACT=Object.freeze({
  company_id:'fenix',engine_id:AUTO_ENGINE,domain_id:AUTO_DOMAIN,environment:PREPROD,autonomy_mode:'PREPROD_AUTONOMOUS',
  evidence_source:AUTO_SOURCE,required_workflows:[...REQUIRED_AUTO_WORKFLOWS],route_repeatability_min_distinct_live_runs:3,
  flow:['REAL_EVIDENCE','ROUTE_REPEATABILITY','OLD_VS_NEW','INDEPENDENT_TRIBUNAL','SHADOW','CANARY_5_PERCENT','MONITOR','RELEARN'],
  business_execution:false,customer_data_allowed:false,secrets_allowed:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0,
  regression_behavior:'ROLLBACK_AND_RELEARN',next_domain_requires_independent_gate:true
});
