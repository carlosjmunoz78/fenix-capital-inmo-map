#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {buildLegacy184ScalePlan} from './universal-skill-legacy184-scale-v1.mjs';
import {buildUniversalActivationPlan} from './universal-skill-activation-planner-v1.mjs';
import {runUniversalSkillAutoEngineering} from './universal-skill-auto-engineering-v1.mjs';

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function authority(){return {prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};}

export function runLegacy184AutoEngineeringScale({root_dir,skills_dir,source_run_id=184200001,source_head_sha='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'}={}){
  const plan=buildLegacy184ScalePlan(skills_dir?{skills_dir}:{});const root=path.resolve(root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-usaf-scale184-v2-')));fs.mkdirSync(root,{recursive:true});const matrix=[];
  for(const row of plan.normalized){
    if(row.excluded_from_activation_batch||row.expected_outcome!=='ENGINEERING_TASK_REQUIRED'){
      matrix.push(Object.freeze({item_id:row.source_item_id,candidate_id:row.activation_input?.candidate_id??null,source_state:row.source_state,source_disposition:row.source_disposition,previous_outcome:row.expected_outcome,observed_outcome:row.expected_outcome,auto_engineering_executed:false,domain_ids:Object.freeze([]),binding_count:0,evidence_status:'PRESERVED_CERTIFIED_OUTCOME'}));continue;
    }
    const activation=buildUniversalActivationPlan(row.activation_input);let observed=activation.status;let auto=null;
    if(activation.status==='ACTIVATION_PLAN_READY'){
      auto=runUniversalSkillAutoEngineering({activation_plan:activation,candidate_evidence:row.candidate_evidence??{},root_dir:path.join(root,`item-${row.source_item_id}`),source_run_id,source_head_sha});observed=auto.status;
    }
    matrix.push(Object.freeze({item_id:row.source_item_id,candidate_id:row.activation_input.candidate_id,source_state:row.source_state,source_disposition:row.source_disposition,previous_outcome:row.expected_outcome,observed_outcome:observed,auto_engineering_executed:true,domain_ids:Object.freeze([...(activation.domain_ids??[])]),binding_count:activation.binding_count??0,evidence_status:auto?.full_safe_preprod===true?'FULL_EVIDENCE_GREEN':auto?.status??activation.status,generated_semantic_evidence_count:auto?.fulfillment?.generated_semantic_evidence_count??0,unsupported_families:Object.freeze((auto?.fulfillment?.unsupported??[]).map((x)=>x.domain_id)),full_safe_preprod:auto?.full_safe_preprod===true}));
  }
  const observed_counts={};for(const row of matrix)observed_counts[row.observed_outcome]=(observed_counts[row.observed_outcome]??0)+1;
  const improvements=matrix.filter((x)=>x.previous_outcome==='ENGINEERING_TASK_REQUIRED'&&x.observed_outcome!==x.previous_outcome);
  const remaining=matrix.filter((x)=>x.observed_outcome==='ENGINEERING_TASK_REQUIRED');
  const full=matrix.filter((x)=>x.observed_outcome==='FULL_SAFE_PREPROD');
  const globalFull=matrix.length===184&&matrix.every((x)=>x.observed_outcome==='FULL_SAFE_PREPROD');
  const report={schema_version:'2.0.0',state_type:'CEREBRO_LEGACY184_AUTO_ENGINEERING_SCALE_REPORT_V2',status:'GREEN_TRUTHFUL_AUTO_ENGINEERING_SCALE',catalog_size:184,matrix:Object.freeze(matrix),observed_outcome_counts:Object.freeze(observed_counts),auto_engineering_improvements:Object.freeze(improvements),new_full_safe_preprod:Object.freeze(full),remaining_engineering_tasks:Object.freeze(remaining),full_claim:globalFull,note:'V2 preserves certified terminal outcomes and re-executes only prior ENGINEERING_TASK_REQUIRED candidates through current governed auto-engineering. Zero engineering debt means every item is truthfully reconciled; it is not a global FULL claim. Global FULL requires every one of the 184 items to be FULL_SAFE_PREPROD with candidate-local evidence.',...authority()};
  return Object.freeze({...report,report_hash:hash(report)});
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){const out=process.argv[2]??path.join(process.cwd(),'cerebro-usaf-scale184-v2-report.json');try{const report=runLegacy184AutoEngineeringScale({source_run_id:Number(process.env.GITHUB_RUN_ID??184200001),source_head_sha:process.env.GITHUB_SHA??'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'});fs.writeFileSync(out,`${JSON.stringify(report,null,2)}\n`);process.stdout.write(`${JSON.stringify({status:report.status,new_full_safe_preprod:report.new_full_safe_preprod.map((x)=>x.item_id),remaining_engineering_tasks:report.remaining_engineering_tasks.map((x)=>({item_id:x.item_id,domains:x.domain_ids})),observed_outcome_counts:report.observed_outcome_counts,full_claim:report.full_claim},null,2)}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(error.message??error)})}\n`);process.exitCode=1;}}
