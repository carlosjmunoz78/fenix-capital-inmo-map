#!/usr/bin/env node
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildLegacy184ScalePlan} from './universal-skill-legacy184-scale-v1.mjs';
import {resolveBlockedCapability} from './self-extending-capability-resolver-v0.mjs';

const PREPROD='PREPROD';
const VERSION='0.1.0';
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,customer_data_used:false,trading_access:false,paid_fallback:false,spend_authorized:false,additional_cost_eur:0});}
function dependencySeed(row){
  const detail=[row.remaining_gate,row.reconciliation_reason,row.source_state,row.source_disposition].filter(Boolean).join(' | ');
  return Object.freeze({kind:row.remaining_gate??row.reconciliation_reason??row.source_state??'BLOCKED_EXTERNAL',name:row.activation_input?.technical_name??row.activation_input?.candidate_id??`legacy184-${row.source_item_id}`,detail});
}

export function buildLegacy184SelfExtendingReopenPlan({skills_dir,company_id='fenix'}={}){
  const legacy=buildLegacy184ScalePlan(skills_dir?{skills_dir}:{});
  const missions=[];const preserved=[];
  for(const row of legacy.normalized){
    if(row.expected_outcome!=='BLOCKED_EXTERNAL'||row.excluded_from_activation_batch===true){
      preserved.push(Object.freeze({item_id:row.source_item_id,candidate_id:row.activation_input?.candidate_id??null,outcome:row.expected_outcome,excluded_terminal:row.excluded_from_activation_batch===true}));
      continue;
    }
    const candidateId=row.activation_input?.candidate_id??`legacy184:${row.source_item_id}`;
    const capabilityId=`${candidateId}:dependency:1`;
    const dependency=dependencySeed(row);
    const resolution=resolveBlockedCapability({company_id,candidate_id:candidateId,capability_id:capabilityId,reason:'BLOCKED_EXTERNAL',useful:true,dependency});
    if(resolution.status==='REJECTED'||resolution.terminal===true)throw new Error(`USEFUL_BLOCKED_EXTERNAL_BECAME_TERMINAL:${row.source_item_id}`);
    const dispatch=resolution.status==='HUMAN_REQUIRED'
      ?Object.freeze({queue:'HUMAN_EXCEPTION',action:'EXACT_MINIMUM_BINDING_THEN_AUTO_RESUME'})
      :Object.freeze({queue:'JOB-001',action:'RUN_SELF_EXTENDING_CAPABILITY_LOOP',owner_engine_id:'FACT-001'});
    missions.push(Object.freeze({item_id:row.source_item_id,candidate_id:candidateId,source_state:row.source_state,source_disposition:row.source_disposition,legacy_outcome:'BLOCKED_EXTERNAL',new_outcome:resolution.status,dependency,resolution,dispatch,resume_original_skill:true}));
  }
  const dependencyRequired=missions.filter(x=>x.new_outcome==='DEPENDENCY_RESOLUTION_REQUIRED');
  const humanRequired=missions.filter(x=>x.new_outcome==='HUMAN_REQUIRED');
  const report={schema_version:'1.0.0',state_type:'CEREBRO_LEGACY184_SELF_EXTENDING_REOPEN_PLAN_V0',status:'GREEN_REOPEN_PLAN',company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,catalog_size:legacy.catalog_size,legacy_expected_outcome_counts:legacy.expected_outcome_counts,reopened_count:missions.length,dependency_resolution_required:dependencyRequired.length,human_required:humanRequired.length,preserved_count:preserved.length,missions:Object.freeze(missions),preserved:Object.freeze(preserved),policy:Object.freeze({blocked_external_terminal:false,rejected_only_for_genuine_terminal_reasons:true,tech_scout_before_build:true,reuse_wrap_before_new_build:true,recursive_dependency_resolution:true,max_recursive_depth:8,paid_fallback_automatic:false}),full_claim:false,note:'Reopens only non-terminal legacy184 BLOCKED_EXTERNAL rows. Terminal HOLD/DESCARTAR/CATALOGAR semantics remain preserved. This plan creates governed dependency missions; it does not claim those capabilities are already physically active.',...authority()};
  return Object.freeze({...report,report_hash:hash(report)});
}

export function buildLegacy184SelfExtendingDispatchBatch(options={}){
  const plan=buildLegacy184SelfExtendingReopenPlan(options);
  const jobs=plan.missions.filter(x=>x.new_outcome==='DEPENDENCY_RESOLUTION_REQUIRED').map((x,index)=>Object.freeze({job_id:`legacy184-reopen-${x.item_id}-${String(index+1).padStart(3,'0')}`,company_id:plan.company_id,engine_id:'FACT-001',environment:PREPROD,priority:50,item_id:x.item_id,candidate_id:x.candidate_id,resolution:x.resolution,idempotency_key:hash({item_id:x.item_id,candidate_id:x.candidate_id,resolution_hash:x.resolution.resolution_hash}),max_attempts:3,resume_original_skill:true}));
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_LEGACY184_SELF_EXTENDING_DISPATCH_BATCH_V0',status:'DISPATCH_BATCH_READY',company_id:plan.company_id,engine_id:'JOB-001',environment:PREPROD,jobs:Object.freeze(jobs),human_required:Object.freeze(plan.missions.filter(x=>x.new_outcome==='HUMAN_REQUIRED')),source_plan_hash:plan.report_hash,...authority(),batch_hash:hash(jobs)});
}

export const LEGACY184_SELF_EXTENDING_REOPEN_V0_CONTRACT=Object.freeze({capability:'FACT-001/legacy184-self-extending-reopen-v0',catalog_size:184,blocked_external_terminal:false,useful_blocked_external_to_dependency_mission:true,terminal_rejections_preserved:true,job_runtime:'JOB-001',recursive_resolver:'FACT-001/self-extending-capability-resolver-v0',environment:PREPROD,prod:false,trading:false,customer_data:false,additional_cost_target_eur:0});

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){try{const out=buildLegacy184SelfExtendingReopenPlan();process.stdout.write(`${JSON.stringify({status:out.status,catalog_size:out.catalog_size,reopened_count:out.reopened_count,dependency_resolution_required:out.dependency_resolution_required,human_required:out.human_required,preserved_count:out.preserved_count,full_claim:out.full_claim,prod_authorized:out.prod_authorized,additional_cost_eur:out.additional_cost_eur},null,2)}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(error.message??error)})}\n`);process.exitCode=1;}}
