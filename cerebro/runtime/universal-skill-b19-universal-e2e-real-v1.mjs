#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildUniversalActivationPlan} from './universal-skill-activation-planner-v1.mjs';
import {runFactSkillNative} from './fact-skill-native-v1.mjs';
import {measurePlannerOrderInvariance,runB18MeasuredEngineerOutcomeLoop} from './universal-skill-b18-lrn-measured-engineer-outcome-loop-v1.mjs';
import {createPromotionPlan,advancePromotion,postMonitor} from './promotion-pipeline.mjs';
import {runUniversalSkillAutoEngineering} from './universal-skill-auto-engineering-v1.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(__dirname,'../..');
const DEFAULT_CONTRACT=path.resolve(REPO_ROOT,'cerebro/contracts/universal-skill-b19-e2e-real-v1.contract.json');

function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function sha(value){return crypto.createHash('sha256').update(value).digest('hex');}
function readContract(file){
  const raw=fs.readFileSync(file,'utf8');
  const contract=JSON.parse(raw);
  if(contract.state_type!=='CEREBRO_UNIVERSAL_SKILL_B19_E2E_REAL_CONTRACT_V1')throw new Error('B19 contract state_type mismatch');
  if(contract.company_id!=='fenix'||contract.engine_id!=='FACT-001'||contract.environment!==PREPROD)throw new Error('B19 contract canonical context mismatch');
  const authority=contract.authority??{};
  for(const key of ['prod_authorized','prod_write_authorized','prod_mutation_authorized','permission_expansion_authorized','external_skill_code_execution','dependency_install_authorized','customer_data_used','paid_fallback','spend_authorized','trading_access'])if(authority[key]!==false)throw new Error(`B19 unsafe authority:${key}`);
  if(Number(authority.additional_cost_eur)!==0)throw new Error('B19 additional cost must be zero');
  return {contract,manifest_sha256:sha(raw)};
}
function instant(base,seconds){const millis=Date.parse(base);if(!Number.isFinite(millis))throw new Error('observedAt invalid');return new Date(millis+seconds*1000).toISOString();}
function context(){return {company_id:'fenix',engine_id:'AUD-001',environment:PREPROD,version:VERSION};}
function lifecycleFromBinding({binding,b18,promotionRollback,contract}){
  const br=binding?.backup_rollback_rebuild??{};
  const learning=binding?.learning_sink??{};
  const green=binding?.full_safe_preprod===true&&br.backup_ready===true&&br.rollback_green===true&&br.rebuild_green===true&&binding.observability_green===true&&binding.audit_green===true&&binding.finops_green===true&&binding.idempotency_proven===true&&learning.decision==='LRN_FEEDBACK_PERSISTED'&&b18?.status==='B18_GREEN_PREPROD'&&promotionRollback?.decision==='ROLLBACK';
  return {
    green,
    internal_wrapper_ready:binding?.full_safe_preprod===true,
    external_code_execution_required:false,
    rollback_ready:br.rollback_green===true,
    rebuild_ready:br.rebuild_green===true,
    backup_ready:br.backup_ready===true,
    runbook_ready:typeof contract.lifecycle?.runbook_ref==='string'&&contract.lifecycle.runbook_ref.length>0,
    changelog_ready:typeof contract.lifecycle?.changelog_ref==='string'&&contract.lifecycle.changelog_ref.length>0,
    dependencies_mapped:contract.lifecycle?.dependencies_mapped===true,
    router_connected:true,
    integration_e2e_green:green,
    observability_connected:binding?.observability_green===true,
    idempotency_proven:binding?.idempotency_proven===true,
    fallback_ready:true,
    preprod_green_evidence:green,
    learning_hooks_connected:learning.decision==='LRN_FEEDBACK_PERSISTED'&&b18?.learning_persist?.accepted===true&&b18?.next_cycle?.learning_persist?.accepted===true
  };
}
function factInput({contract,manifest_sha256,plan,completed=false,lifecycle=null,b18=null,binding=null}){
  const oldNewPass=completed&&b18?.safe_engineering_comparison?.decision==='NEW_BETTER'&&binding?.per_binding_old_vs_new_pass===true;
  const evalPass=completed&&binding?.evaluation?.leakage_check==='PASS'&&Number(binding?.evaluation?.delta)>0;
  const tribunalPass=completed&&binding?.independent_tribunal?.decision==='PASS'&&b18?.tribunal?.decision==='APPROVE_PREPROD_NEXT_STAGE';
  const safeLifecycle=lifecycle??{
    internal_wrapper_ready:false,external_code_execution_required:false,rollback_ready:false,rebuild_ready:false,backup_ready:false,
    runbook_ready:true,changelog_ready:true,dependencies_mapped:true,router_connected:plan.binding_count>0,integration_e2e_green:false,
    observability_connected:false,idempotency_proven:false,fallback_ready:true,preprod_green_evidence:false,learning_hooks_connected:false
  };
  return {
    company_id:contract.company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,risk_class:'LOW',
    candidate:{skill_id:contract.candidate_id,skill_version:contract.skill_version,source_ref:contract.source_ref,manifest_sha256,license_spdx:contract.license_spdx},
    evidence:{complete:completed,confidence:1,old_vs_new:{decision:oldNewPass?'PASS':'MORE_EVIDENCE',reasons:[]},evaluation:{decision:evalPass?'PASS':'MORE_EVIDENCE'},tribunal:{decision:tribunalPass?'PASS':'MORE_EVIDENCE'}},
    security:{provenance_ok:true,supply_chain_ok:true,license_ok:true,incident:false,legal_required:false,policy_conflict:false},
    policy:{locked:true},permissions:{requested:[],allowed:[],locked:true},impact:{existing_engine_bindings:plan.target_engine_bindings},observed_registry:[],demand:{needed_now:true},
    cost:{additional_cost_eur:0,zero_cost_alternative:false,roi_positive:false,money_limit_exceeded:false},lifecycle:safeLifecycle
  };
}

export async function runB19UniversalE2EReal({
  oldPlanner,newPlanner,baselineSha,candidateSha,learningLedgerFile,rootDir=null,contractFile=DEFAULT_CONTRACT,
  observedAt='2026-10-18T00:00:00.000Z',sourceRunId=19
}={}){
  if(typeof oldPlanner!=='function'||typeof newPlanner!=='function')throw new Error('oldPlanner and newPlanner required');
  const baseline=req(baselineSha,'baselineSha');const candidateHead=req(candidateSha,'candidateSha');if(baseline===candidateHead)throw new Error('baseline and candidate head must differ');
  const ledgerFile=req(learningLedgerFile,'learningLedgerFile');
  const root=path.resolve(rootDir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b19-e2e-')));fs.mkdirSync(root,{recursive:true});
  const {contract,manifest_sha256}=readContract(path.resolve(contractFile));
  const auditRoot=path.join(root,'b19-operational-ledgers');fs.mkdirSync(auditRoot,{recursive:true});
  const ledgers=createOperationalLedgersV0({root_dir:auditRoot,environment:PREPROD});
  const correlation=`b19:${sha(`${baseline}:${candidateHead}:${manifest_sha256}`).slice(0,24)}`;let auditOffset=0;
  const audit=(action,after,reason,result='PASS')=>ledgers.audit.append({context:context(),correlation_id:correlation,occurred_at:instant(observedAt,auditOffset++),actor:'FACT-001:B19',action,target:{candidate_id:contract.candidate_id},before:null,after,reason,result});

  const plan=buildUniversalActivationPlan({
    company_id:contract.company_id,candidate_id:contract.candidate_id,technical_name:contract.technical_name,source_refs:contract.source_refs,
    inventory_complete:true,dependencies_mapped:true,reuse_checked:true,provenance_license_green:true,capabilities:[contract.capability],additional_cost_eur:0
  });
  if(plan.status!=='ACTIVATION_PLAN_READY'||plan.environment!==PREPROD||plan.binding_count<1)throw new Error(`B19 FACTORY plan not ready:${plan.status}`);
  audit('B19_FACTORY_PLAN_READY',{plan_id:plan.plan_id,binding_count:plan.binding_count,domain_ids:plan.domain_ids},'FACT-001 created governed PREPROD activation plan');

  const initialRegistry=runFactSkillNative(factInput({contract,manifest_sha256,plan}));
  if(initialRegistry.status!=='HOLD'||initialRegistry.decision?.human_required!=null||initialRegistry.registration?.versioned!==true)throw new Error(`B19 initial registry must be versioned HOLD without HUMAN_REQUIRED:${initialRegistry.status}`);
  audit('B19_REGISTRY_HOLD_CREATED',{registration_id:initialRegistry.registration.registration_id,status:initialRegistry.status,human_required:null},'Candidate registered before evaluation without claiming activation');

  const baselineMeasurement=measurePlannerOrderInvariance(oldPlanner,{baseSha:baseline});
  if(baselineMeasurement.score!==0)throw new Error('B19 controlled OLD baseline must measure 0');
  audit('B19_BASELINE_EVALUATED',{metric:baselineMeasurement.metric,score:baselineMeasurement.score,selected_repairs:baselineMeasurement.selected_repairs},'Physical OLD planner permutation measurement');

  const b18=await runB18MeasuredEngineerOutcomeLoop({oldPlanner,newPlanner,baselineSha:baseline,candidateSha:candidateHead,learningLedgerFile:ledgerFile,observedAt});
  if(b18.status!=='B18_GREEN_PREPROD'||b18.old_measurement.score!==baselineMeasurement.score||b18.new_measurement.score!==1)throw new Error(`B19 B18 measured loop not green:${b18.status}`);
  audit('B19_LRN_PERSISTED',{accepted:b18.learning_persist.accepted,ledger_operations:b18.learning_ledger_operations,candidate_id:b18.candidate_id},'LRN-001 persisted measured baseline evidence before accepting engineering outcome');
  audit('B19_ENGINEERING_PLAN_PASSED',{decision:b18.engineering_plan.decision,plan_id:b18.engineering_plan.plan_id},'Safe Engineering bounded PREPROD mutation plan');
  audit('B19_CANDIDATE_REEVALUATED',{metric:b18.metric,old_score:b18.old_measurement.score,new_score:b18.new_measurement.score,comparison:b18.safe_engineering_comparison.decision},'Physical candidate planner permutation measurement');
  audit('B19_TRIBUNAL_APPROVED',{decision:b18.tribunal.decision,gate_id:b18.tribunal.gate_id,next_gate:b18.tribunal.next_gate},'Independent OLD vs NEW evaluation tribunal');

  const promotion=createPromotionPlan({company_id:contract.company_id,engine_id:'AUTO-001',environment:PREPROD,version:VERSION,baseline_version:baseline,candidate_version:candidateHead,judge_decision:'PASS',tribunal_decision:'GREEN',rollback_ref:`git:${baseline}`,rebuild_ref:'workflow:CEREBRO Universal Skill B19 Universal E2E Real V1',post_metrics:{order_invariance_score:{min:1}},canary_percent:5});
  if(promotion.state!=='PREPROD'||promotion.next_gate!=='SHADOW_EVIDENCE'||promotion.prod_authorized!==false)throw new Error('B19 promotion must start held in PREPROD');
  audit('B19_PROMOTION_HELD_PREPROD',{state:promotion.state,next_gate:promotion.next_gate,prod_authorized:promotion.prod_authorized},'No automatic promotion beyond PREPROD evidence gate');
  const shadow=advancePromotion(promotion,{shadow_pass:true});const canary=advancePromotion(shadow,{canary_pass:true});
  const keep=postMonitor({plan:canary,observed_metrics:{order_invariance_score:1}});
  if(keep.decision!=='KEEP_NONPROD'||keep.prod_authorized!==false)throw new Error('B19 healthy post-monitor must remain non-PROD');
  audit('B19_PROMOTION_KEEP_NONPROD',{state:keep.state,decision:keep.decision,next_gate:keep.next_gate},'Healthy metric remains under current domain promotion authority');
  const rollbackDecision=postMonitor({plan:canary,observed_metrics:{order_invariance_score:0}});
  if(rollbackDecision.decision!=='ROLLBACK'||rollbackDecision.rollback_ref!==`git:${baseline}`)throw new Error('B19 controlled breach must decide rollback');
  audit('B19_ROLLBACK_DECISION_CONTROLLED',{decision:rollbackDecision.decision,state:rollbackDecision.state,rollback_ref:rollbackDecision.rollback_ref,breaches:rollbackDecision.breaches},'Controlled metric breach proves rollback branch without PROD mutation');

  const autoEngineering=runUniversalSkillAutoEngineering({activation_plan:plan,candidate_evidence:{},repo_root:REPO_ROOT,source_evidence_kind:'FIRST_PARTY_INTERNAL',root_dir:path.join(root,'physical-lifecycle'),source_run_id:Number(sourceRunId),source_head_sha:candidateHead});
  const binding=autoEngineering.binding_report;
  const lifecycle=lifecycleFromBinding({binding,b18,promotionRollback:rollbackDecision,contract});
  if(autoEngineering.full_safe_preprod!==true||lifecycle.green!==true)throw new Error(`B19 physical lifecycle not green:${autoEngineering.status}`);
  audit('B19_ROLLBACK_REBUILD_PHYSICAL_VERIFIED',{binding_id:binding.binding_id,backup_ready:binding.backup_rollback_rebuild.backup_ready,rollback_green:binding.backup_rollback_rebuild.rollback_green,rebuild_green:binding.backup_rollback_rebuild.rebuild_green,audit_green:binding.audit_green,idempotency_proven:binding.idempotency_proven},'First-party binding runtime physically exercised backup, rollback, rebuild, audit and idempotency');

  const finalRegistry=runFactSkillNative(factInput({contract,manifest_sha256,plan,completed:true,lifecycle,b18,binding}));
  if(finalRegistry.status!=='NATIVE_FULL_PREPROD'||finalRegistry.native_full!==true||finalRegistry.promotion?.prod_authorized!==false||finalRegistry.promotion?.auto_merge_authorized!==false)throw new Error(`B19 final native registration not full PREPROD:${finalRegistry.status}`);
  audit('B19_NATIVE_REGISTRATION_COMPLETED',{registration_id:finalRegistry.registration.registration_id,status:finalRegistry.status,native_full:finalRegistry.native_full,decision:finalRegistry.decision.decision},'FACT-001 closed all native PREPROD gates after evidence');

  const auditVerification=ledgers.audit.verify();
  const green=auditVerification.valid===true&&auditVerification.records===12&&finalRegistry.native_full===true&&b18.status==='B18_GREEN_PREPROD'&&keep.decision==='KEEP_NONPROD'&&rollbackDecision.decision==='ROLLBACK'&&lifecycle.green===true;
  const report={
    schema_version:'1.0.0',state_type:'CEREBRO_B19_UNIVERSAL_E2E_REAL_V1',status:green?'B19_GREEN_PREPROD':'B19_NOT_GREEN',
    company_id:contract.company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,candidate_id:contract.candidate_id,baseline_sha:baseline,candidate_sha:candidateHead,
    factory:{plan_id:plan.plan_id,status:plan.status,binding_count:plan.binding_count,domain_ids:plan.domain_ids},
    registration:{initial_status:initialRegistry.status,initial_human_required:initialRegistry.decision.human_required,registration_id:initialRegistry.registration.registration_id,final_status:finalRegistry.status,final_native_full:finalRegistry.native_full,final_decision:finalRegistry.decision.decision},
    measured_loop:{status:b18.status,old_score:b18.old_measurement.score,new_score:b18.new_measurement.score,learning_persisted:b18.learning_persist.accepted,next_learning_persisted:b18.next_cycle.learning_persist.accepted,engineering_decision:b18.engineering_plan.decision,comparison:b18.safe_engineering_comparison.decision,tribunal_decision:b18.tribunal.decision,next_cycle_decision:b18.next_cycle.with_learning.decision},
    promotion:{initial_state:promotion.state,initial_next_gate:promotion.next_gate,shadow_state:shadow.state,canary_state:canary.state,healthy_decision:keep.decision,controlled_breach_decision:rollbackDecision.decision,rollback_ref:rollbackDecision.rollback_ref,prod_authorized:false},
    physical_lifecycle:{status:autoEngineering.status,full_safe_preprod:autoEngineering.full_safe_preprod,binding_id:binding.binding_id,backup_ready:binding.backup_rollback_rebuild.backup_ready,rollback_green:binding.backup_rollback_rebuild.rollback_green,rebuild_green:binding.backup_rollback_rebuild.rebuild_green,observability_green:binding.observability_green,audit_green:binding.audit_green,finops_green:binding.finops_green,idempotency_proven:binding.idempotency_proven,learning_decision:binding.learning_sink.decision},
    audit:{valid:auditVerification.valid,records:auditVerification.records,last_hash:auditVerification.last_hash,correlation_id:correlation},
    prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,auto_merge:false,customer_data:false,trading_access:false,additional_cost_eur:0
  };
  return Object.freeze(report);
}
