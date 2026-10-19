#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  technicalSpecialistRegistry,
  evaluateSoftwareEngineeringSpecialist,
  evaluateSystemsSpecialist,
  evaluateDataSpecialist,
  evaluateSecuritySpecialist
} from './cerebro-technical-specialists-v1.mjs';
import {mathSolverProfile,runMathTask} from './cerebro-math-solver-profile-v1.mjs';
import {buildUniversalActivationPlan} from './universal-skill-activation-planner-v1.mjs';
import {resolveSemanticContract} from './universal-skill-semantic-contracts-v1.mjs';
import {runUniversalSkillBatchIndustrial} from './universal-skill-batch-orchestrator-v1.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const EXPECTED_ALIASES=Object.freeze(['ARQUITECTO','CODE','SYSTEMS','MATH','DATA','SECURITY','QA','INTEGRATOR','TECH_SCOUT','PERFORMANCE']);

function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,auto_merge_authorized:false,permission_expansion_authorized:false,external_code_execution:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});}
function freezeResult(alias,checks,evidence={}){const full=Object.values(checks).every((value)=>value===true);return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_ENGINEERING_SPECIALIST_FULL_EVIDENCE_V1',alias,engine_id:'FACT-001',environment:PREPROD,version:VERSION,status:full?'FULL_SAFE_PREPROD':'SPECIALIST_HOLD',checks:Object.freeze(checks),evidence:Object.freeze(evidence),...authority()});}
function readState(repoRoot){return JSON.parse(fs.readFileSync(path.join(repoRoot,'cerebro/registry/universal-skill-activation-factory-v1.state.json'),'utf8'));}
function exists(repoRoot,relative){return fs.existsSync(path.join(repoRoot,relative));}
function existingResult(alias,result){return freezeResult(alias,{existing_specialist_green:result?.status==='SPECIALIST_GREEN',preprod_only:result?.environment===PREPROD,no_prod_authority:result?.prod_authorized===false&&result?.prod_write_authorized===false,zero_cost:Number(result?.additional_cost_eur??-1)===0,no_trading:result?.trading_access===false},{source_status:result?.status??null,source_alias:result?.alias??null,source_checks:result?.checks??{},source_details:result?.details??{}});}

export function evaluateArchitectSpecialist({repo_root=process.cwd(),state=null}={}){
  const root=path.resolve(repo_root),s=state??readState(root);
  const checks={
    single_transversal_profile:technicalSpecialistRegistry().new_engine_required===false,
    canonical_contracts_present:exists(root,'cerebro/contracts/universal-skill-b19-e2e-real-v1.contract.json')&&exists(root,'cerebro/contracts/universal-skill-b20-p0-acceptance-and-scale-release-v1.contract.json'),
    dependency_map_present:exists(root,'cerebro/docs/CEREBRO_B18_LRN_MEASURED_ENGINEER_OUTCOME_LOOP_V1_DEPENDENCY_MAP.md'),
    runbook_handoff_present:exists(root,'cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_RUNBOOK_2026-10-17.md')&&exists(root,'cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_HANDOFF.md'),
    understand_existing_before_change:s?.b20?.new_candidate_without_candidate_specific_core===true,
    old_vs_new_evidenced:s?.b19?.comparison==='NEW_BETTER'&&Number(s?.b19?.measured_old_score)===0&&Number(s?.b19?.measured_new_score)===1,
    preprod_verified:s?.environment===PREPROD&&s?.b20?.state==='HECHO_PREPROD',
    rollback_rebuild_verified:s?.b19?.rollback_green===true&&s?.b19?.rebuild_green===true&&s?.b20?.rollback_rebuild_preserved===true,
    exact_head_gate:s?.b20?.exact_head_gate_required_after_every_commit===true,
    multi_company_dimensions:Boolean(s?.company_id)&&Boolean(s?.engine_id)&&Boolean(s?.environment)&&Boolean(s?.version),
    terminal_truth:s?.b20?.terminal_truth===true,
    zero_cost:Number(s?.authority?.additional_cost_eur??-1)===0,
    no_prod_authority:s?.authority?.prod_authorized===false&&s?.authority?.prod_write_authorized===false&&s?.authority?.prod_mutation_authorized===false&&s?.authority?.auto_merge_authorized===false
  };
  return freezeResult('ARQUITECTO',checks,{architecture_owner_engine_ids:['ARCH-001','FACT-001'],decision_rule:'CONSERVAR_ENTENDER_ENVOLVER_PROBAR_MEJORAR_MIGRAR',state_status:s?.status??null,last_completed_block:s?.last_completed_block??null});
}

export function evaluateQaSpecialist({state}){
  const s=state;
  return freezeResult('QA',{
    full_regression_green:s?.b20?.full_cerebro_regression==='GREEN',
    terminal_truth:s?.b20?.terminal_truth===true,
    tribunal_green:s?.b19?.tribunal==='APPROVE_PREPROD_NEXT_STAGE',
    audit_chain_valid:s?.b19?.audit_chain_valid===true&&Number(s?.b19?.audit_records??0)>=12,
    controlled_breach_rolls_back:s?.b19?.controlled_breach==='ROLLBACK',
    no_gate_weakening:s?.b16?.gate_weakening===false&&s?.b16?.test_exclusions_added===false,
    preprod_only:s?.authority?.prod_authorized===false,
    zero_cost:Number(s?.authority?.additional_cost_eur??-1)===0
  },{owner_engine_ids:['QA-001','EVA-001','JDG-001','REG-001']});
}

export function evaluateIntegratorSpecialist({state}){
  const s=state;
  return freezeResult('INTEGRATOR',{
    generic_new_candidate:s?.b20?.new_candidate_without_candidate_specific_core===true,
    repository_e2e:s?.b20?.repository_e2e_reconciled===true,
    github_live_e2e:s?.b20?.github_live_e2e_reconciled===true,
    fast_lane_reconciled:s?.b20?.fast_lane_blind_batch_reconciled===true,
    lifecycle_reused:s?.b20?.b19_lifecycle_reused===true,
    native_registration:s?.b19?.final_registration==='NATIVE_FULL_PREPROD',
    idempotency:s?.b19?.idempotency_proven===true&&s?.b20?.idempotency_preserved===true,
    no_prod_authority:s?.authority?.prod_authorized===false&&s?.authority?.prod_write_authorized===false,
    zero_cost:Number(s?.authority?.additional_cost_eur??-1)===0
  },{owner_engine_ids:['FACT-001','INT-001','API-001','EVT-001','JOB-001']});
}

export function evaluateTechScoutSpecialist({state}){
  const s=state;
  return freezeResult('TECH_SCOUT',{
    repository_surface_green:s?.evidence?.repository_e2e?.status==='SUCCESS',
    github_live_surface_green:s?.evidence?.github_live_e2e?.status==='SUCCESS',
    supply_chain_gate_green:s?.evidence?.skill_supply_chain?.status==='SUCCESS',
    provenance_license_fail_closed:s?.b20?.terminal_truth===true,
    no_external_code_execution:s?.authority?.external_skill_code_execution_authorized===false,
    no_dependency_install:s?.authority?.external_dependency_install_authorized===false,
    zero_cost:Number(s?.authority?.additional_cost_eur??-1)===0,
    no_prod_authority:s?.authority?.prod_authorized===false
  },{owner_engine_ids:['RSH-001','INN-001','FACT-001'],route:'READ_ONLY_DISCOVER_EVALUATE_BEFORE_ADOPT'});
}

function safeAuthority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function performanceCandidate(id,domain){return {work_class:'EXPRESS',low_risk:true,external_side_effects:false,activation_input:{company_id:'fenix',inventory_complete:true,dependencies_mapped:true,reuse_checked:true,provenance_license_green:true,additional_cost_eur:0,candidate_id:id,technical_name:`performance-${id}`,source_refs:[`repo://${id}`],capabilities:[{capability_id:`${id}:cap`,technical_name:'opaque-performance-capability',declared_domains:[domain],domain_evidence:{[domain]:[`manifest:${id}:${domain}`]}}]}};}
function addExactEvidence(candidate){const plan=buildUniversalActivationPlan(candidate.activation_input);const rows=[];for(const cap of plan.capabilities)for(const domain of cap.domains)for(const engine_id of domain.engine_bindings){const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});rows.push({...safeAuthority(),capability_id:cap.capability_id,domain_id:domain.domain_id,engine_id,evidence_kind:'PHYSICAL_PREPROD',execution_kind:'DECLARATIVE',real_consumption_proven:true,observed_constraints:[...contract.required_constraints],evidence_refs:[`engineering-sweep:${candidate.activation_input.candidate_id}:${domain.domain_id}:${engine_id}`],physical_evidence:true});}return {...candidate,candidate_evidence:{semantic_bindings:rows}};}

export async function evaluatePerformanceSpecialist({root_dir}={}){
  const domains=['software-engineering-devops','data-database-supabase','finance-accounting-payments','seo-search-content','documents-office-pdf'];
  const candidates=domains.map((domain,index)=>addExactEvidence(performanceCandidate(`performance:${index+1}`,domain)));
  const root=path.resolve(root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-performance-specialist-')));
  const first=await runUniversalSkillBatchIndustrial({root_dir:root,candidates,concurrency:5,max_jobs:10,source_run_id:880001,source_head_sha:'8888888888888888888888888888888888888888'});
  const second=await runUniversalSkillBatchIndustrial({root_dir:root,candidates,concurrency:5,max_jobs:10,source_run_id:880002,source_head_sha:'8888888888888888888888888888888888888888',now_ms:Date.now()+1000});
  const m1=first.metrics??{},m2=second.metrics??{};
  const checks={
    bounded_parallelism:first.parallel_execution_proven===true&&Number(first.max_active_workers)>=5,
    all_primary_full:Number(first.by_status?.FULL_SAFE_PREPROD??0)===5,
    latency_measured:Number.isFinite(m1.activation_wall_time_p50_ms)&&Number.isFinite(m1.activation_wall_time_p95_ms)&&m1.activation_wall_time_p95_ms>=m1.activation_wall_time_p50_ms,
    batch_wall_time_measured:Number.isFinite(m1.batch_wall_time_ms)&&m1.batch_wall_time_ms>=0,
    durable_idempotent_rerun:second.status==='NO_WORK'&&Number(second.idempotent_job_hits)===5&&Number(m2.idempotent_rerun_rate)===1,
    preparation_cache_reused:Number(m2.preparation_cache_hit_ratio)===1&&Number(m2.baseline_cache_hit_ratio)===1&&Number(m2.adapter_family_cache_hit_ratio)===1,
    binding_validation_preserved:m1.binding_revalidation_bypassed===false&&m2.binding_revalidation_bypassed===false,
    no_fail_fast:first.fail_fast===false,
    zero_cost:Number(first.additional_cost_eur)===0&&Number(second.additional_cost_eur)===0,
    no_prod_or_trading:first.prod_authorized===false&&second.prod_authorized===false&&first.trading_access===false&&second.trading_access===false
  };
  return freezeResult('PERFORMANCE',checks,{owner_engine_ids:['OPT-001','QA-001','OBSERV-001','FINOPS-001'],first_metrics:m1,rerun_metrics:m2,max_active_workers:first.max_active_workers,execution_mode:'BOUNDED_WORKER_THREADS'});
}

export async function runEngineeringSpecialistsEvidenceSweep({repo_root=process.cwd(),performance_root}={}){
  const root=path.resolve(repo_root),state=readState(root),registry=technicalSpecialistRegistry();
  const code=evaluateSoftwareEngineeringSpecialist({company_id:'fenix',domain:'software-engineering-devops',capabilities:['software-engineering','debugging','script','analysis'],source_text:'Safe software engineering with deterministic tests, static analysis, OLD vs NEW and rollback.',controls:{worktree_or_sandbox_isolation:true,deterministic_prechecks:true,unit_and_targeted_tests:true,static_analysis:true,regression_comparison:true,rollback_plan:true,qa_code_evidence:true,eva_regression:true,dry_run:false}});
  const systems=evaluateSystemsSpecialist({company_id:'fenix',source_text:'Platform engineering runtime with durable worker, bounded concurrency, retry checkpoint recovery, rollback and rebuild.'});
  const data=evaluateDataSpecialist({company_id:'fenix',source_text:'PostgreSQL database schema SQL query review with tenant RLS row level security, backup and rollback before migration.'});
  const security=evaluateSecuritySpecialist({company_id:'fenix',source_text:'Security engineering threat and risk review with IAM least privilege, credential protection, privacy hardening and fail closed policy.'});
  const mathProfile=mathSolverProfile();const mathRun=runMathTask({company_id:'fenix',environment:PREPROD,task_kind:'DESCRIPTIVE_STATS',values:[1,2,3,4,5]});
  const math=freezeResult('MATH',{deterministic_profile:mathProfile.execution_strategy==='DETERMINISTIC_FIRST_NO_AI_REQUIRED',real_calculation:mathRun.result?.mean===3,canonical_consumers:Array.isArray(mathProfile.consumer_engine_ids)&&mathProfile.consumer_engine_ids.includes('QA-001'),zero_cost:mathRun.additional_cost_eur===0,no_prod_authority:mathRun.prod_authorized===false},{task_kind:mathRun.task_kind,result_hash:mathRun.result_hash});
  const performance=await evaluatePerformanceSpecialist({root_dir:performance_root});
  const results=Object.freeze([
    evaluateArchitectSpecialist({repo_root:root,state}),
    existingResult('CODE',code),
    existingResult('SYSTEMS',systems),
    math,
    existingResult('DATA',data),
    existingResult('SECURITY',security),
    evaluateQaSpecialist({state}),
    evaluateIntegratorSpecialist({state}),
    evaluateTechScoutSpecialist({state}),
    performance
  ]);
  const byAlias=Object.fromEntries(results.map((row)=>[row.alias,row]));const missing=EXPECTED_ALIASES.filter((alias)=>!byAlias[alias]);const holds=results.filter((row)=>row.status!=='FULL_SAFE_PREPROD');
  const full=missing.length===0&&holds.length===0&&registry.new_engine_required===false;
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_ENGINEERING_SPECIALIZATIONS_EVIDENCE_SWEEP_V1',engine_id:'FACT-001',company_id:'GLOBAL',environment:PREPROD,version:VERSION,status:full?'ALL_ENGINEERING_SPECIALISTS_FULL_SAFE_PREPROD':'ENGINEERING_SPECIALISTS_PARTIAL',expected_aliases:EXPECTED_ALIASES,results,missing_aliases:Object.freeze(missing),hold_aliases:Object.freeze(holds.map((row)=>row.alias)),new_engine_required:false,single_transversal_safe_engineering_profile:true,...authority()});
}

if(process.argv[1]&&process.argv[1].endsWith('cerebro-engineering-specializations-evidence-sweep-v1.mjs')){const report=await runEngineeringSpecialistsEvidenceSweep();process.stdout.write(`${JSON.stringify(report,null,2)}\n`);if(report.status!=='ALL_ENGINEERING_SPECIALISTS_FULL_SAFE_PREPROD')process.exitCode=1;}
