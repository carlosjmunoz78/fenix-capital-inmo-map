#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalizeLegacy184Item} from './universal-skill-legacy184-normalizer-v1.mjs';
import {runUniversalSkillBatchOnce} from './universal-skill-batch-orchestrator-v1.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR=path.resolve(__dirname,'../skills');
export const LEGACY184_FILES=Object.freeze([
  'cerebro-184-items-1-24-live-reconciliation.v2.json','cerebro-184-items-25-37-live-reconciliation.v2.json','cerebro-184-items-38-50-live-reconciliation.v2.json','cerebro-184-items-51-61-live-reconciliation.v2.json','cerebro-184-items-62-68-live-reconciliation.v2.json','cerebro-184-items-69-73-live-reconciliation.v2.json','cerebro-184-items-74-82-live-reconciliation.v2.json','cerebro-184-items-83-92-live-reconciliation.v2.json','cerebro-184-items-93-104-live-reconciliation.v2.json','cerebro-184-items-105-117-live-reconciliation.v2.json','cerebro-184-items-118-131-live-reconciliation.v2.json','cerebro-184-items-132-142-live-reconciliation.v2.json','cerebro-184-items-143-151-live-reconciliation.v2.json','cerebro-184-items-152-161-live-reconciliation.v2.json','cerebro-184-items-162-175-live-reconciliation.v2.json','cerebro-184-items-176-184-live-reconciliation.v2.json'
]);
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function authority(){return {prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};}

export function loadLegacy184Inventory({skills_dir=SKILLS_DIR}={}){
  const rows=[];const files=[];
  for(const name of LEGACY184_FILES){const file=path.join(skills_dir,name);if(!fs.existsSync(file))throw new Error(`MISSING_LEGACY184_FILE:${name}`);const doc=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(doc.items))throw new Error(`LEGACY184_ITEMS_REQUIRED:${name}`);files.push({name,catalog_range:doc.catalog_range,count:doc.items.length});for(const item of doc.items)rows.push({item,source_ref:`cerebro/skills/${name}`});}
  const ids=rows.map((x)=>x.item.id);if(ids.length!==184)throw new Error(`LEGACY184_COUNT_MISMATCH:${ids.length}`);if(new Set(ids).size!==184)throw new Error('LEGACY184_DUPLICATE_IDS');for(let id=1;id<=184;id+=1)if(!ids.includes(id))throw new Error(`LEGACY184_MISSING_ID:${id}`);
  rows.sort((a,b)=>a.item.id-b.item.id);
  return Object.freeze({files:Object.freeze(files),rows:Object.freeze(rows),catalog_size:184});
}

export function buildLegacy184ScalePlan(options={}){
  const inventory=loadLegacy184Inventory(options);const normalized=inventory.rows.map(({item,source_ref})=>normalizeLegacy184Item(item,{source_ref}));
  const activation=normalized.filter((x)=>!x.excluded_from_activation_batch);
  const excluded=normalized.filter((x)=>x.excluded_from_activation_batch);
  const counts={};for(const x of normalized)counts[x.expected_outcome]=(counts[x.expected_outcome]??0)+1;
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_LEGACY184_SCALE_PLAN_V1',catalog_size:184,source_files:inventory.files,normalized:Object.freeze(normalized),activation_candidates:Object.freeze(activation),excluded_terminal:Object.freeze(excluded),expected_outcome_counts:Object.freeze(counts),...authority(),plan_hash:hash(normalized.map((x)=>({id:x.source_item_id,outcome:x.expected_outcome,state:x.source_state,disposition:x.source_disposition})))});
}

export function runLegacy184ScaleBatch({root_dir,skills_dir=SKILLS_DIR,source_run_id=184000001,source_head_sha='4444444444444444444444444444444444444444',now_ms=6000000}={}){
  const plan=buildLegacy184ScalePlan({skills_dir});const candidates=plan.activation_candidates.map((x)=>({activation_input:x.activation_input,candidate_evidence:x.candidate_evidence,low_risk:true,external_side_effects:false}));
  const root=path.resolve(root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-usaf-scale184-')));
  const batch=candidates.length?runUniversalSkillBatchOnce({root_dir:root,candidates,max_jobs:500,source_run_id,source_head_sha,now_ms}):{results:[],processed:0};
  const runtimeById=new Map((batch.results??[]).map((x)=>[x.candidate_id,x]));const matrix=[];
  for(const row of plan.normalized){
    if(row.excluded_from_activation_batch)matrix.push({item_id:row.source_item_id,candidate_id:null,source_state:row.source_state,source_disposition:row.source_disposition,expected_outcome:row.expected_outcome,observed_outcome:row.expected_outcome,runtime_executed:false});
    else{const candidate_id=row.activation_input.candidate_id;const result=runtimeById.get(candidate_id);if(!result)throw new Error(`SCALE184_MISSING_RUNTIME_RESULT:${row.source_item_id}:${candidate_id}`);matrix.push({item_id:row.source_item_id,candidate_id,source_state:row.source_state,source_disposition:row.source_disposition,expected_outcome:row.expected_outcome,observed_outcome:result.status,runtime_executed:true});}
  }
  const mismatches=matrix.filter((x)=>x.expected_outcome!==x.observed_outcome);const observed_counts={};for(const x of matrix)observed_counts[x.observed_outcome]=(observed_counts[x.observed_outcome]??0)+1;
  const report={schema_version:'1.0.0',state_type:'CEREBRO_LEGACY184_SCALE_REPORT_V1',status:mismatches.length?'HOLD':'GREEN_TRUTHFUL_184_OUTCOME_MATRIX',catalog_size:184,processed_runtime:batch.processed??0,terminal_without_runtime:plan.excluded_terminal.length,matrix:Object.freeze(matrix),mismatches:Object.freeze(mismatches),observed_outcome_counts:Object.freeze(observed_counts),full_claim:false,note:'GREEN here means every legacy catalog item received the outcome justified by current evidence. It does NOT mean 184 items are physically active or FULL.',...authority()};
  return Object.freeze({...report,report_hash:hash(report)});
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){try{process.stdout.write(`${JSON.stringify(runLegacy184ScaleBatch(),null,2)}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:error.message,...authority()})}\n`);process.exitCode=1;}}
