import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {LearningLedgerV0} from './learning-ledger.mjs';
import {recordLearningHorizonResult} from './learning-orchestrator.mjs';
import {MetaObservabilityLedger} from './meta-observability-ledger.mjs';
import {buildMetaLearningReview} from './meta-learning-runner.mjs';

const PREPROD='PREPROD';
const ENGINE_ID='LRN-001';

function reqString(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim();}
function ensureDir(d){fs.mkdirSync(d,{recursive:true});return d;}
function readJson(f){return JSON.parse(fs.readFileSync(f,'utf8'));}
function atomicJson(f,v){ensureDir(path.dirname(f));const t=`${f}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(t,`${JSON.stringify(v,null,2)}\n`,{encoding:'utf8',mode:0o600});fs.renameSync(t,f);}
function iso(v){const d=new Date(v);if(Number.isNaN(d.getTime()))throw new Error('invalid time');return d.toISOString();}
function jsonFiles(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.json')).map(x=>path.join(dir,x.name)).sort();}
function average(values){const xs=values.filter(Number.isFinite);return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;}
function safeName(v){return v.replace(/[^A-Za-z0-9._-]/g,'_');}

export function collectDailyLearningEvidence({company_id,version,ledger_file,receipts_dir,heartbeat_file,observed_at}){
  const ledger=new LearningLedgerV0({file_path:path.resolve(reqString(ledger_file,'ledger_file')),environment:PREPROD});
  const records=ledger.list().filter(r=>r.company_id===company_id&&r.environment===PREPROD);
  const receiptFiles=jsonFiles(path.resolve(reqString(receipts_dir,'receipts_dir')));
  const receipts=[];
  for(const file of receiptFiles){try{const r=readJson(file);if(r.company_id===company_id&&r.engine_id===ENGINE_ID&&r.environment===PREPROD)receipts.push(r);}catch{}}
  const risks={LOW:0,MEDIUM:0,HIGH:0,CRITICAL:0};const sources={};
  for(const r of records){if(risks[r.risk_class]!==undefined)risks[r.risk_class]+=1;sources[r.source_type]=(sources[r.source_type]??0)+1;}
  const held=receipts.reduce((n,r)=>n+Number(r.result?.held_total??0),0);
  const persisted=receipts.reduce((n,r)=>n+Number(r.result?.persisted_total??0),0);
  const duplicates=receipts.reduce((n,r)=>n+Number(r.result?.duplicates_total??0),0);
  const human=[...new Set(receipts.flatMap(r=>r.result?.human_required??[]))].sort();
  let heartbeat=null;if(heartbeat_file&&fs.existsSync(heartbeat_file)){try{heartbeat=readJson(heartbeat_file);}catch{}}
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_LRN_DAILY_EVIDENCE',company_id,engine_id:ENGINE_ID,environment:PREPROD,version,observed_at:iso(observed_at),learning_records_total:records.length,receipts_total:receipts.length,persisted_total:persisted,duplicates_total:duplicates,held_total:held,human_required:human,risk_counts:risks,source_type_counts:sources,average_confidence:average(records.map(r=>r.confidence)),heartbeat_status:heartbeat?.status??'UNKNOWN',heartbeat_last_success_at:heartbeat?.last_success_at??null,raw_customer_data_included:false,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
}

function executeDaily({plan,context}){
  return {status:'GREEN',cadence:'DAILY',task:plan.task,evidence:collectDailyLearningEvidence({...context,observed_at:context.now}),meta_candidate_generated:false,factory_candidate_generated:false};
}
function executeWeekly({plan,context}){
  const daily=jsonFiles(context.results_dir).map(f=>{try{return readJson(f);}catch{return null;}}).filter(x=>x?.cadence==='DAILY'&&x?.status==='GREEN'&&x?.evidence?.company_id===context.company_id);
  const recent=daily.slice(-7);
  let meta_review={status:'MORE_EVIDENCE',candidate:null,gate:{ok:false,reasons:['meta_metrics_ledger_missing'],next_gate:'HOLD',prod_authorized:false}};
  if(context.meta_metrics_file&&fs.existsSync(context.meta_metrics_file)){
    const metrics=new MetaObservabilityLedger({file_path:context.meta_metrics_file});
    const summary=metrics.summarize({company_id:context.company_id,version:context.version,limit:168});
    meta_review=buildMetaLearningReview({summary,company_id:context.company_id,version:context.version,reviewed_at:context.now});
  }
  const evidence={reports_considered:recent.length,learning_records_latest:recent.at(-1)?.evidence?.learning_records_total??0,held_total:recent.reduce((n,x)=>n+Number(x.evidence?.held_total??0),0),human_required:[...new Set(recent.flatMap(x=>x.evidence?.human_required??[]))].sort(),meta_metrics_ready:meta_review.status==='META_CANDIDATE_CREATED_HELD',meta_review_status:meta_review.status};
  return {status:'GREEN',cadence:'WEEKLY',task:plan.task,evidence,meta_candidate_generated:Boolean(meta_review.candidate),meta_review,factory_candidate_generated:false,supervisor_reason:'NO_CROSS_ENGINE_REPEATED_FAILURE_EVIDENCE'};
}
function executeMonthly({plan,context}){
  const weekly=jsonFiles(context.results_dir).map(f=>{try{return readJson(f);}catch{return null;}}).filter(x=>x?.cadence==='WEEKLY'&&x?.status==='GREEN'&&x?.company_id===context.company_id);
  return {status:'GREEN',cadence:'MONTHLY',task:plan.task,evidence:{weekly_reports_total:weekly.length,knowledge_index_bound:false,policy_mutation_authorized:false},knowledge_mutations:0,reason:'KNOWLEDGE_INDEX_NOT_BOUND_NO_DESTRUCTIVE_ACTION'};
}

export function executeLearningHorizonPlan({plan,company_id,version,ledger_file,receipts_dir,heartbeat_file,meta_metrics_file=null,results_dir,now}){
  if(!plan||plan.company_id!==company_id||plan.engine_id!==ENGINE_ID||plan.environment!==PREPROD||plan.version!==version)throw new Error('HORIZON_PLAN_CONTEXT_MISMATCH');
  if(plan.prod_authorized!==false||plan.trading_access!==false)throw new Error('HORIZON_PLAN_AUTHORITY_EXPANDED');
  const context={company_id,version,ledger_file,receipts_dir,heartbeat_file,meta_metrics_file:meta_metrics_file?path.resolve(meta_metrics_file):null,results_dir:path.resolve(results_dir),now:iso(now)};
  if(plan.cadence==='DAILY')return Object.freeze(executeDaily({plan,context}));
  if(plan.cadence==='WEEKLY')return Object.freeze(executeWeekly({plan,context}));
  if(plan.cadence==='MONTHLY')return Object.freeze(executeMonthly({plan,context}));
  throw new Error('unsupported horizon cadence');
}

export function executePendingLearningHorizons({state_file,plans_dir,results_dir,company_id,version,ledger_file,receipts_dir,heartbeat_file,meta_metrics_file=null,now}){
  const plansRoot=path.resolve(reqString(plans_dir,'plans_dir'));const resultsRoot=ensureDir(path.resolve(reqString(results_dir,'results_dir')));const completed=[];const skipped=[];
  for(const planFile of jsonFiles(plansRoot)){
    const plan=readJson(planFile);const resultFile=path.join(resultsRoot,`${safeName(plan.lock_key)}.json`);
    if(fs.existsSync(resultFile)){skipped.push(plan.lock_key);continue;}
    const executed=executeLearningHorizonPlan({plan,company_id,version,ledger_file,receipts_dir,heartbeat_file,meta_metrics_file,results_dir:resultsRoot,now});
    const result={schema_version:'1.0.0',state_type:'CEREBRO_LRN_HORIZON_RESULT',company_id,engine_id:ENGINE_ID,environment:PREPROD,version,lock_key:plan.lock_key,horizon_bucket:plan.horizon_bucket,cadence:plan.cadence,task:plan.task,status:executed.status,completed_at:iso(now),...executed,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false};
    atomicJson(resultFile,result);
    recordLearningHorizonResult({state_file,company_id,version,cadence:plan.cadence,status:result.status,completed_at:result.completed_at});
    completed.push(result);
  }
  return Object.freeze({status:'HORIZON_EXECUTORS_GREEN',completed_total:completed.length,skipped_total:skipped.length,completed:Object.freeze(completed),prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}
