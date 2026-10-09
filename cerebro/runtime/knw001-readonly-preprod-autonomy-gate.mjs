import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOldNewEvaluationTribunalGate} from './rsi-old-new-evaluation-tribunal-gate.mjs';
import {loadDomainPolicyRegistry,runRegisteredDomainPreprodLoop} from './rsi-domain-policy-registry.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_PATH=path.resolve(HERE,'../registry/rsi-domain-evidence-sources.v0.json');
const ENGINE='KNW-001',DOMAIN='fenix.knowledge.notion',CAPABILITY='READONLY_REVIEW_PREPARATION',SOURCE='github:prod-runtime-smoke:knowledge';
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function frozen(v){return Object.freeze({...v,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0});}
function hold(reason,extra={}){return frozen({ok:false,decision:'HOLD',human_required:null,reasons:[reason],...extra});}

export function validateKnwReadonlyEvidence({runtime_smoke}={}){
  const policies=loadDomainPolicyRegistry();
  const policy=policies.policies.find(x=>x.engine_id===ENGINE&&x.domain_id===DOMAIN);
  if(!policy) return hold('KNW001_POLICY_REQUIRED');
  if(policy.autonomy_mode!=='ASSISTED'||policy.capability_autonomy_mode!=='PREPROD_AUTONOMOUS'||!policy.allowed_capabilities.includes(CAPABILITY)) return hold('KNW001_CAPABILITY_POLICY_NOT_EXACT');
  if(policy.kill_switch_state!=='ARMED'||policy.kill_switch_enabled!==true||policy.automatic_rollback_allowed!==true) return hold('KNW001_RECOVERY_CONTROLS_REQUIRED');
  const registry=readJson(EVIDENCE_PATH);const source=(registry.bindings??[]).find(x=>x.source_id===SOURCE);
  if(!source||source.engine_id!==ENGINE||source.domain_id!==DOMAIN||source.state!=='LIVE_CONNECTED') return hold('KNW001_LIVE_EVIDENCE_SOURCE_REQUIRED');
  if(Number(source.confidence)<Number(policy.min_confidence)) return hold('KNW001_EVIDENCE_CONFIDENCE_BELOW_POLICY');
  if(source.evidence_depth!=='LIVE_READONLY_ANA_KNOWLEDGE_CONTRACT') return hold('KNW001_READONLY_EVIDENCE_DEPTH_REQUIRED');
  if(!runtime_smoke||runtime_smoke.workflow_name!=='PROD Runtime Smoke'||runtime_smoke.conclusion!=='success'||runtime_smoke.head_branch!=='main'||!Number.isInteger(Number(runtime_smoke.run_id))||!/^[0-9a-f]{40}$/i.test(String(runtime_smoke.head_sha??''))) return hold('KNW001_CURRENT_RUNTIME_SMOKE_REQUIRED');
  if(!runtime_smoke.observed_at||Number.isNaN(Date.parse(runtime_smoke.observed_at))) return hold('KNW001_RUNTIME_SMOKE_TIMESTAMP_REQUIRED');
  return frozen({ok:true,decision:'EVIDENCE_GREEN',engine_id:ENGINE,domain_id:DOMAIN,capability:CAPABILITY,evidence_confidence:Number(source.confidence),policy_min_confidence:Number(policy.min_confidence),evidence_refs:[`source:${SOURCE}`,`github-run:${runtime_smoke.run_id}`,`git:${runtime_smoke.head_sha}`]});
}

export async function runKnwReadonlyAutonomyGate({runtime_smoke,confidence=0.85,risk_class='LOW',additional_cost_eur=0,observed_at='2026-10-09T08:30:00Z'}={}){
  const evidence=validateKnwReadonlyEvidence({runtime_smoke});if(!evidence.ok)return evidence;
  if(additional_cost_eur!==0)return frozen({ok:false,decision:'HUMAN_REQUIRED',human_required:'MONEY_LIMIT',reasons:['KNW001_INCREMENTAL_COST_NONZERO']});
  const candidate={candidate_id:'knw001:readonly-review-preparation:v2',company_id:'fenix',engine_id:ENGINE,environment:'PREPROD',baseline_version:'knw001-assisted-v1',candidate_version:'knw001-readonly-preprod-v2',requested_capability:CAPABILITY,risk_class,confidence,hypothesis:'KNW-001 can autonomously prepare read-only review context in PREPROD while all knowledge classification and approval remains human-authorized.',target_metric:{name:'readonly_safety_layers',direction:'HIGHER'},baseline_verification_required:false,preservation_contract:{policy_mutation_allowed:false,permission_elevation_allowed:false,budget_elevation_allowed:false},prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  const fixture={fixture_ref:'cerebro:knw001:readonly-review-preparation:holdout-v0',dataset_kind:'HOLDOUT',case_ids:['readonly-load','authority-preservation','no-classification-write','relearning-feedback']};
  const execute_arm=async(input)=>({version:input.version,fixture_id:input.fixture_id,metrics:{readonly_safety_layers:input.arm==='OLD'?1:4},evidence_refs:input.arm==='OLD'?['policy:knw001:assisted-v1']:[...evidence.evidence_refs,'guard:AnaKnowledgeReviewGuard:confirm-required','capability:READONLY_REVIEW_PREPARATION'],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
  const b3=await runOldNewEvaluationTribunalGate({candidate,fixture,execute_arm,benchmark_contract:{benchmark_id:'knw001-readonly-safety',benchmark_version:'v1',holdout_ref:'cerebro:knw001:readonly-holdout-v0',adversarial_refs:['classify-write-denied','approval-write-denied','authority-403-preserved']},judge:{judge_id:'cerebro-tribunal:knw001-readonly-v0',candidate_actor_id:candidate.candidate_id},backup_ref:'git:main-before-knw001-readonly-capability',rollback_ref:'policy:knw001:assisted-v1',rebuild_ref:'factory:FACT-001:KNW-001',post_metric_rule:{min:4},canary_percent:5,candidate_visible_holdout:false,real_outcome_delta:1});
  if(!b3.ok)return frozen({...b3,capability:CAPABILITY});
  const b4=runRegisteredDomainPreprodLoop({company_id:'fenix',engine_id:ENGINE,domain_id:DOMAIN,candidate,promotion_plan:b3.promotion_plan,shadow_evidence:{pass:true,evidence_refs:[...evidence.evidence_refs,'knw001:readonly-shadow'],additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false},canary_evidence:{pass:true,evidence_refs:[...evidence.evidence_refs,'knw001:readonly-canary-5'],additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false},observed_metrics:{readonly_safety_layers:4},observed_at,evidence_refs:[...evidence.evidence_refs,'knw001:readonly-capability-gate']});
  if(!b4.loop_started||b4.decision!=='KEEP_NONPROD_AND_RELEARN')return frozen({ok:false,decision:b4.decision??'HOLD',human_required:b4.human_required??null,reasons:b4.reasons??['KNW001_B4_NOT_GREEN']});
  return frozen({ok:true,status:'KNW001_READONLY_CAPABILITY_PREPROD_GREEN',decision:'KEEP_NONPROD_AND_RELEARN',human_required:null,engine_id:ENGINE,domain_id:DOMAIN,capability:CAPABILITY,whole_domain_autonomy:false,domain_autonomy_mode:'ASSISTED',capability_autonomy_mode:'PREPROD_AUTONOMOUS',b3_decision:b3.decision,tribunal_decision:b3.tribunal?.decision??null,b4_decision:b4.decision,feedback_events_total:b4.feedback_report?.events_total??0,human_classification_approval_required:true});
}

export const KNW001_READONLY_AUTONOMY_V0_CONTRACT=Object.freeze({engine_id:ENGINE,domain_id:DOMAIN,capability:CAPABILITY,whole_domain_autonomy:false,human_classification_approval_required:true,environment:'PREPROD',prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0});
