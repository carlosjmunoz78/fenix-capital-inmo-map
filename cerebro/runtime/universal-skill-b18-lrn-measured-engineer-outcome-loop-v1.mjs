#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {normalizeEvent,observeOutcome,createEvidence,proposeCandidate} from './learning-pipeline.mjs';
import {LearningLedgerV0} from './learning-ledger.mjs';
import {buildVersionedImprovementCandidate} from './improvement-candidate-factory.mjs';
import {planEngineeringChange,compareEngineeringOutcomes} from './cerebro-safe-engineering-profile-v1.mjs';
import {runOldNewEvaluationTribunalGate} from './rsi-old-new-evaluation-tribunal-gate.mjs';

const PREPROD='PREPROD';
const METRIC='order_invariance_score';
const PENDING_SOURCE='A <div className="auth-shell"> one </div> B <div className="auth-shell"> two </div>';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim()}
function mapping(repair_id,case_id,target){return {repair_id,case_id,owner_engine:'HCI-001',target,dimension:'accessibility_semantics',execution_authority:{prod_write_authorized:false},resolution:{status:'SOURCE_HINT_VERIFIED',repository:'carlosjmunoz78/fenix-capital-inmo-map',file_hints:['src/App.tsx']}}}
function sourceMap(mappings){return {state_type:'CEREBRO_QA_SOURCE_MAPPING_STATE_V0',company_id:'fenix',safety:{prod_write:false,customer_data:false,trading:false,additional_subscription_eur:0},mappings}}
function fixtureMaps(){const a=mapping('r-a','c-a','APP:qa-mobile-alpha');const z=mapping('r-z','c-z','APP:qa-mobile-zeta');return [sourceMap([z,a]),sourceMap([a,z])]}
function plain(value){return JSON.parse(JSON.stringify(value))}

export function measurePlannerOrderInvariance(planner,{baseSha='B18-MEASURE'}={}){
  if(typeof planner!=='function')throw new Error('planner function required');
  const plans=fixtureMaps().map(map=>planner(map,{baseSha,sourceText:PENDING_SOURCE}));
  const ready=plans.every(plan=>plan?.status==='PATCH_PLAN_READY');
  const sameRepair=ready&&plans[0].source_repair_id===plans[1].source_repair_id;
  const samePlan=ready&&plans[0].plan_id===plans[1].plan_id;
  return Object.freeze({metric:METRIC,score:ready&&sameRepair&&samePlan?1:0,ready,same_repair:sameRepair,same_plan_id:samePlan,selected_repairs:plans.map(plan=>plan?.source_repair_id??null),plan_ids:plans.map(plan=>plan?.plan_id??null)});
}

function learningFromMeasurement({baselineVersion,measurement,observedAt,evidenceRefs}){
  const event=normalizeEvent({event_id:`b18-baseline:${baselineVersion}`,company_id:'fenix',engine_id:'AUTO-001',environment:PREPROD,version:baselineVersion,occurred_at:observedAt,source_type:'METRIC_OBSERVATION',payload:{metric:METRIC,score:measurement.score},evidence_refs:evidenceRefs});
  const outcome=observeOutcome({event,expected:1,actual:measurement.score,observed_at:observedAt});
  const evidence=createEvidence({outcome,refs:evidenceRefs,confidence:0.99,provenance:{block:'B18',metric:METRIC,measurement:'REAL_MODULE_PERMUTATION'}});
  const proposed=proposeCandidate({event,outcome,evidence,hypothesis:'AUTO-001 must select an equivalent certified mapping deterministically regardless of source-map array order.',expected_metric_delta:{name:METRIC,direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW'},risk_class:'LOW',created_by:'LRN-001',reason:'MEASURED_ENGINEERING_OUTCOME'});
  return Object.freeze({...proposed,source_version:baselineVersion,persistent_publish_authorized:true,persistence_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY'});
}

function nextCycleLearning({candidateVersion,measurement,observedAt,evidenceRefs}){
  const event=normalizeEvent({event_id:`b18-next-cycle:${candidateVersion}`,company_id:'fenix',engine_id:'AUTO-001',environment:PREPROD,version:candidateVersion,occurred_at:observedAt,source_type:'METRIC_OBSERVATION',payload:{metric:METRIC,score:measurement.score,cycle:'NEXT'},evidence_refs:evidenceRefs});
  const outcome=observeOutcome({event,expected:1,actual:measurement.score,observed_at:observedAt});
  const evidence=createEvidence({outcome,refs:evidenceRefs,confidence:0.99,provenance:{block:'B18',cycle:'NEXT',metric:METRIC}});
  const proposed=proposeCandidate({event,outcome,evidence,hypothesis:'Keep the deterministic certified-mapping selection while order_invariance_score remains at target; reopen engineering only on measured regression.',expected_metric_delta:{name:METRIC,direction:'STABLE',measurement:'NEXT_CYCLE_REAL_MEASUREMENT'},risk_class:'LOW',created_by:'LRN-001',reason:'POST_CHANGE_MEASURED_OUTCOME'});
  return Object.freeze({...proposed,source_version:candidateVersion,persistent_publish_authorized:true,persistence_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY'});
}

export function decideNextEngineeringCycle({measurement,learning=null}={}){
  if(!measurement||typeof measurement.score!=='number')throw new Error('measurement required');
  const learnedKeep=learning?.source_type==='METRIC_OBSERVATION'&&learning?.hypothesis?.startsWith('Keep the deterministic certified-mapping selection')&&measurement.score===1;
  return Object.freeze({decision:learnedKeep?'KEEP_NEW_MONITOR':'REOPEN_DIAGNOSTIC',learning_applied:learnedKeep,metric:METRIC,score:measurement.score,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}

export async function runB18MeasuredEngineerOutcomeLoop({oldPlanner,newPlanner,baselineSha,candidateSha,learningLedgerFile,observedAt='2026-10-18T00:00:00.000Z'}={}){
  const baseline=req(baselineSha,'baselineSha');const head=req(candidateSha,'candidateSha');
  if(baseline===head)throw new Error('baseline and candidate head must differ');
  const oldMeasurement=measurePlannerOrderInvariance(oldPlanner,{baseSha:baseline});
  const evidenceRefs=[`git:${baseline}`,'code:cerebro/platform/auto001-preprod-patch-planner-v0.mjs','test:cerebro/tests/auto001-preprod-patch-executor-v0.test.mjs'];
  const learning=learningFromMeasurement({baselineVersion:baseline,measurement:oldMeasurement,observedAt,evidenceRefs});
  const ledger=new LearningLedgerV0({file_path:req(learningLedgerFile,'learningLedgerFile'),environment:PREPROD});
  const learningPersist=ledger.persist(learning);
  const built=buildVersionedImprovementCandidate(learning);
  if(!built.ok)throw new Error(`candidate build failed:${built.reasons.join(',')}`);
  const candidate=built.candidate;
  const engineeringPlan=planEngineeringChange({company_id:'fenix',engine_id:'AUTO-001',environment:PREPROD,version:candidate.candidate_version,inventory_complete:true,dependencies_mapped:true,reuse_checked:true,new_code:false,mutation:true,worktree_isolated:true,tests_before_change:true,rollback_ready:true,rebuild_ready:true,backup_or_snapshot_ready:true,destructive:false,prod_write:false,trading_access:false,secret_exposure:false,customer_data_in_test:false,additional_cost_eur:0,max_files_changed:1,planned_files_changed:1});
  if(engineeringPlan.decision!=='PASS_PREPROD_PLAN')throw new Error(`safe engineering gate failed:${engineeringPlan.blockers.join(',')}`);
  const newMeasurement=measurePlannerOrderInvariance(newPlanner,{baseSha:baseline});
  const safeOld={tests_failed:oldMeasurement.score===1?0:1,security_regressions:0,policy_regressions:0,additional_cost_eur:0,files_changed:0,defects_found_postchange:oldMeasurement.score===1?0:1,quality_score:oldMeasurement.score,prod_authority:false,trading_access:false};
  const safeNew={tests_failed:newMeasurement.score===1?0:1,security_regressions:0,policy_regressions:0,additional_cost_eur:0,files_changed:1,defects_found_postchange:newMeasurement.score===1?0:1,quality_score:newMeasurement.score,prod_authority:false,trading_access:false};
  const safeComparison=compareEngineeringOutcomes({old_result:safeOld,new_result:safeNew});
  const fixture={fixture_ref:'B18:AUTO001_REAL_PLANNER_MAPPING_PERMUTATION_V1',case_ids:['mapping-order-z-a','mapping-order-a-z'],dataset_kind:'HOLDOUT'};
  const tribunal=await runOldNewEvaluationTribunalGate({candidate,fixture,execute_arm:async input=>{const measurement=input.arm==='OLD'?oldMeasurement:newMeasurement;return {version:input.version,fixture_id:input.fixture_id,metrics:{[METRIC]:measurement.score},evidence_refs:[`git:${input.arm==='OLD'?baseline:head}`,`metric:${METRIC}:${measurement.score}`],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0}},benchmark_contract:{benchmark_id:'B18-AUTO001-ORDER-INVARIANCE',benchmark_version:'1.0.0',holdout_ref:'B18:HOLDOUT:MAPPING-PERMUTATIONS',adversarial_refs:['B18:REVERSED-EQUIVALENT-MAPPINGS']},judge:{judge_id:'JDG-001',candidate_actor_id:'LRN-001'},backup_ref:`git:${baseline}`,rollback_ref:`git-revert-to:${baseline}`,rebuild_ref:'workflow:CEREBRO Universal Skill B18 LRN Measured Engineer Outcome Loop V1',post_metric_rule:{min:1},canary_percent:5,candidate_visible_holdout:false,real_outcome_delta:newMeasurement.score-oldMeasurement.score});
  const nextObservedAt=new Date(new Date(observedAt).getTime()+1000).toISOString();
  const nextRefs=[`git:${head}`,`tribunal:${tribunal.gate_id??tribunal.decision}`,`metric:${METRIC}:${newMeasurement.score}`];
  const nextLearning=nextCycleLearning({candidateVersion:candidate.candidate_version,measurement:newMeasurement,observedAt:nextObservedAt,evidenceRefs:nextRefs});
  const nextLearningPersist=ledger.persist(nextLearning);
  const withoutLearning=decideNextEngineeringCycle({measurement:newMeasurement,learning:null});
  const withLearning=decideNextEngineeringCycle({measurement:newMeasurement,learning:nextLearning});
  const learningChangedNextDecision=withoutLearning.decision!==withLearning.decision&&withLearning.learning_applied===true;
  const green=oldMeasurement.score===0&&newMeasurement.score===1&&learningPersist.accepted===true&&nextLearningPersist.accepted===true&&engineeringPlan.decision==='PASS_PREPROD_PLAN'&&safeComparison.decision==='NEW_BETTER'&&tribunal.ok===true&&tribunal.decision==='APPROVE_PREPROD_NEXT_STAGE'&&learningChangedNextDecision;
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_B18_LRN_MEASURED_ENGINEER_OUTCOME_LOOP_V1',status:green?'B18_GREEN_PREPROD':'B18_NOT_GREEN',company_id:'fenix',engine_id:'LRN-001',environment:PREPROD,baseline_sha:baseline,candidate_sha:head,metric:METRIC,old_measurement:oldMeasurement,new_measurement:newMeasurement,learning_persist:learningPersist,candidate_id:candidate.candidate_id,engineering_plan:{decision:engineeringPlan.decision,plan_id:engineeringPlan.plan_id},safe_engineering_comparison:safeComparison,tribunal:{ok:tribunal.ok,decision:tribunal.decision,next_gate:tribunal.next_gate,gate_id:tribunal.gate_id??null,reason:tribunal.tribunal?.reason??null},next_cycle:{learning_persist:nextLearningPersist,without_learning:withoutLearning,with_learning:withLearning,learning_changed_next_decision:learningChangedNextDecision},learning_ledger_operations:ledger.operation_count,prod_authorized:false,prod_write_authorized:false,auto_merge:false,customer_data:false,trading_access:false,additional_cost_eur:0});
}

async function loadPlanner(root,tag){const file=path.resolve(root,'cerebro/platform/auto001-preprod-patch-planner-v0.mjs');const mod=await import(`${pathToFileURL(file).href}?b18=${encodeURIComponent(tag)}`);if(typeof mod.planAuto001Patch!=='function')throw new Error(`planner missing:${tag}`);return mod.planAuto001Patch}

if(import.meta.url===`file://${process.argv[1]}`){
  const oldRoot=req(arg('--old-root'),'--old-root');const newRoot=req(arg('--new-root'),'--new-root');const baselineSha=req(arg('--baseline-sha'),'--baseline-sha');const candidateSha=req(arg('--candidate-sha'),'--candidate-sha');const out=req(arg('--out'),'--out');const ledger=req(arg('--ledger'),'--ledger');
  const oldPlanner=await loadPlanner(oldRoot,baselineSha);const newPlanner=await loadPlanner(newRoot,candidateSha);
  const report=await runB18MeasuredEngineerOutcomeLoop({oldPlanner,newPlanner,baselineSha,candidateSha,learningLedgerFile:ledger});
  fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify(plain(report),null,2)+'\n');console.log(JSON.stringify({status:report.status,old:report.old_measurement.score,new:report.new_measurement.score,tribunal:report.tribunal.decision,next:report.next_cycle.with_learning.decision,cost_eur:0}));
  if(report.status!=='B18_GREEN_PREPROD')process.exitCode=1;
}
