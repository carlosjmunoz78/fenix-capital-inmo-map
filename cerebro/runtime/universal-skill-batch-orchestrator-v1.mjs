#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {DurableJobRuntimeV1} from './durable-job-runtime-v1.mjs';
import {buildUniversalActivationPlan} from './universal-skill-activation-planner-v1.mjs';
import {createAutomaticAdapterResolver,adapterFactorySummary} from './universal-skill-adapter-factory-v1.mjs';
import {runUniversalSkillRealBinding} from './universal-skill-real-binding-v1.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const JOB_NAME='UNIVERSAL_SKILL_ACTIVATION_V1';
const LANE_ORDER=['FAST_LANE','ENGINEERING','DEVICES','GROWTH','MEDIA','BUSINESS','GENERAL'];

function req(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim();}
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function ctx(company_id){return {company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION};}
function percentile(values,p){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);const index=Math.min(sorted.length-1,Math.max(0,Math.ceil((p/100)*sorted.length)-1));return sorted[index];}
function contentFingerprint(candidate){
  const input={...(candidate?.activation_input??candidate??{})};
  const explicit=candidate?.content_hash??candidate?.source_hash??input.content_hash??input.source_hash;
  if(typeof explicit==='string'&&explicit.trim())return `explicit:${explicit.trim()}`;
  delete input.candidate_id;
  delete input.content_hash;
  delete input.source_hash;
  return `derived:${hash({activation_input:input,candidate_evidence:candidate?.candidate_evidence??{}})}`;
}
function dedupeByContent(candidates){
  const primaryByFingerprint=new Map(),primaries=[],absorbed=[];
  for(const candidate of candidates){
    const input=candidate?.activation_input??candidate;
    const candidate_id=req(input?.candidate_id,'candidate_id');
    const fingerprint=contentFingerprint(candidate);
    const prior=primaryByFingerprint.get(fingerprint);
    if(prior){absorbed.push(Object.freeze({candidate_id,status:'ABSORBED',content_fingerprint:fingerprint,absorbed_by:prior.candidate_id,human_required:Object.freeze([]),...authority()}));continue;}
    const row=Object.freeze({candidate,content_fingerprint:fingerprint,candidate_id});
    primaryByFingerprint.set(fingerprint,row);primaries.push(row);
  }
  return Object.freeze({primaries:Object.freeze(primaries),absorbed:Object.freeze(absorbed)});
}
function adaptersWorkerSafe(existing_adapters){
  if(!existing_adapters||Object.keys(existing_adapters).length===0)return true;
  try{structuredClone(existing_adapters);return true;}catch{return false;}
}
function candidateTelemetry({queue_wait_ms=0,activation_ms=null}={}){
  return Object.freeze({
    queue_wait_ms,
    manifest_ms:null,
    scan_ms:null,
    sandbox_ms:null,
    adapter_ms:null,
    tests_ms:null,
    ci_wait_ms:null,
    eval_ms:null,
    human_wait_ms:null,
    activation_ms,
    unmeasured_fields:Object.freeze(['manifest_ms','scan_ms','sandbox_ms','adapter_ms','tests_ms','ci_wait_ms','eval_ms','human_wait_ms'])
  });
}
function runWorkerThread(args){
  const code=`const {parentPort,workerData}=require('node:worker_threads');(async()=>{try{const mod=await import(workerData.module_url);const result=mod.processUniversalSkillCandidatePayload(workerData.args);parentPort.postMessage({ok:true,result});}catch(error){parentPort.postMessage({ok:false,error:String(error&&error.stack?error.stack:error&&error.message?error.message:error)});}})();`;
  return new Promise((resolve,reject)=>{
    const worker=new Worker(code,{eval:true,workerData:{module_url:import.meta.url,args}});
    let settled=false;
    worker.once('message',(message)=>{if(settled)return;settled=true;if(message?.ok===true)resolve(message.result);else reject(new Error(message?.error??'INDUSTRIAL_WORKER_FAILED'));});
    worker.once('error',(error)=>{if(settled)return;settled=true;reject(error);});
    worker.once('exit',(codeValue)=>{if(settled)return;settled=true;if(codeValue===0)reject(new Error('INDUSTRIAL_WORKER_EXITED_WITHOUT_RESULT'));else reject(new Error(`INDUSTRIAL_WORKER_EXIT_${codeValue}`));});
  });
}
async function mapConcurrent(items,limit,fn){
  if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('concurrency must be 1..50');
  const output=new Array(items.length);let cursor=0,active=0,maxActive=0;
  async function runner(){
    for(;;){
      const index=cursor++;
      if(index>=items.length)return;
      active+=1;maxActive=Math.max(maxActive,active);
      try{output[index]=await fn(items[index],index);}finally{active-=1;}
    }
  }
  const workers=Array.from({length:Math.min(limit,items.length)},()=>runner());
  await Promise.all(workers);
  return Object.freeze({output:Object.freeze(output),max_active:maxActive});
}

const LANE_DOMAINS=Object.freeze({
  ENGINEERING:new Set(['agent-ai-orchestration','integration-mcp-connectors','software-engineering-devops','security-identity-privacy','observability-quality-resilience']),
  DEVICES:new Set(['browser-automation-scraping','productivity-office-workspace']),
  GROWTH:new Set(['seo-search-content','marketing-growth-social','external-information-retrieval','knowledge-research-training']),
  MEDIA:new Set(['multimedia-voice-video-design','documents-office-pdf']),
  BUSINESS:new Set(['web-wordpress-frontend','data-database-supabase','sales-crm-customer','finance-accounting-payments','legal-compliance-contracts','hr-people-operations','multi-company-business-bootstrap'])
});

function classifyWork(plan,candidate){
  const domains=new Set(plan.domain_ids??[]);
  const physical=plan.capabilities?.some((cap)=>cap.domains?.some((d)=>d.domain_id==='multimedia-voice-video-design'||d.domain_id==='browser-automation-scraping'))===true;
  const explicit=String(candidate.work_class??'').toUpperCase();
  const work_class=['EXPRESS','STANDARD','DEEP'].includes(explicit)?explicit:(physical?'DEEP':plan.binding_count<=4?'EXPRESS':'STANDARD');
  let lane='GENERAL',score=-1;
  for(const [name,set] of Object.entries(LANE_DOMAINS)){const n=[...domains].filter((d)=>set.has(d)).length;if(n>score){lane=name;score=n;}}
  const lowRisk=candidate.low_risk===true&&Number(candidate.additional_cost_eur??0)===0&&candidate.external_side_effects!==true;
  if(work_class==='EXPRESS'&&lowRisk)lane='FAST_LANE';
  return Object.freeze({lane,work_class,priority:LANE_ORDER.indexOf(lane)*100+(work_class==='EXPRESS'?0:work_class==='STANDARD'?20:40)});
}

function terminalFromPlan(plan){
  if(plan.terminal_state)return plan.terminal_state;
  if(plan.status==='HUMAN_REQUIRED')return 'HUMAN_REQUIRED';
  if(plan.status==='HOLD')return 'BLOCKED_EXTERNAL';
  return null;
}

export function prepareBatchCandidate(candidate){
  const input=candidate?.activation_input??candidate;
  const plan=buildUniversalActivationPlan(input);
  const scheduling=plan.status==='ACTIVATION_PLAN_READY'?classifyWork(plan,candidate):Object.freeze({lane:'GENERAL',work_class:'STANDARD',priority:999});
  return Object.freeze({candidate_id:req(input.candidate_id,'candidate_id'),activation_input:input,candidate_evidence:candidate.candidate_evidence??{},existing_adapter_keys:Object.freeze(Object.keys(candidate.existing_adapters??{}).sort()),plan,scheduling});
}

export function enqueueUniversalSkillBatch({root_dir,candidates,now_ms=Date.now()}={}){
  if(!Array.isArray(candidates)||candidates.length===0)throw new Error('candidates required');
  const root=path.resolve(root_dir??fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-usaf-batch-')));fs.mkdirSync(root,{recursive:true});
  const runtime=new DurableJobRuntimeV1({file_path:path.join(root,'job001.v8'),environment:PREPROD});
  const accepted=[];
  for(const candidate of candidates){
    const prepared=prepareBatchCandidate(candidate);
    const company_id=prepared.plan.company_id??'fenix';
    const payload={candidate_id:prepared.candidate_id,activation_input:prepared.activation_input,candidate_evidence:prepared.candidate_evidence,scheduling:prepared.scheduling};
    const enqueued=runtime.enqueue({name:JOB_NAME,context:ctx(company_id),payload,priority:prepared.scheduling.priority,max_attempts:3,timeout_ms:120000,idempotency_key:`usaf:${prepared.candidate_id}:${hash(payload)}`,correlation_id:`usaf_batch:${hash({candidate_id:prepared.candidate_id,payload}).slice(0,24)}`,now_ms});
    accepted.push({candidate_id:prepared.candidate_id,accepted:enqueued.accepted,duplicate:enqueued.duplicate,job_id:enqueued.job.job_id,lane:prepared.scheduling.lane,work_class:prepared.scheduling.work_class});
  }
  return {root,runtime,accepted:Object.freeze(accepted)};
}

function processCandidatePayload({payload,root,source_run_id,source_head_sha,existing_adapters={}}){
  const plan=buildUniversalActivationPlan(payload.activation_input);
  const terminal=terminalFromPlan(plan);
  if(terminal)return Object.freeze({candidate_id:payload.candidate_id,status:terminal,activation_plan_status:plan.status,activation_plan_id:plan.plan_id??null,human_required:plan.human_required??[],blockers:plan.blockers??[],...authority()});
  if(plan.status!=='ACTIVATION_PLAN_READY')return Object.freeze({candidate_id:payload.candidate_id,status:'BLOCKED_EXTERNAL',activation_plan_status:plan.status,activation_plan_id:plan.plan_id??null,human_required:plan.human_required??[],blockers:plan.blockers??[],...authority()});

  const adapterFactory=createAutomaticAdapterResolver({activation_plan:plan,candidate_evidence:payload.candidate_evidence??{},existing_adapters});
  const binding=runUniversalSkillRealBinding({activation_plan:plan,adapter_resolver:adapterFactory.resolver,root_dir:path.join(root,'candidates',encodeURIComponent(payload.candidate_id)),source_run_id,source_head_sha});
  const adapterSummary=adapterFactorySummary(adapterFactory.getDecisions());
  let status=binding.status;
  if(status==='HOLD'&&adapterSummary.status==='ENGINEERING_TASK_REQUIRED')status='ENGINEERING_TASK_REQUIRED';
  if(status==='HOLD'&&adapterSummary.status==='BLOCKED_EXTERNAL')status='BLOCKED_EXTERNAL';
  return Object.freeze({candidate_id:payload.candidate_id,status,activation_plan_id:plan.plan_id,binding_id:binding.binding_id,lane:payload.scheduling?.lane??'GENERAL',work_class:payload.scheduling?.work_class??'STANDARD',adapter_summary:adapterSummary,binding_report:binding,human_required:Object.freeze([]),...authority()});
}
export function processUniversalSkillCandidatePayload(args){return processCandidatePayload(args);}

export function runUniversalSkillBatchOnce({root_dir,candidates,max_jobs=50,worker_prefix='usaf-worker',source_run_id=1,source_head_sha='0000000000000000000000000000000000000001',now_ms=Date.now(),existing_adapters={}}={}){
  if(!Number.isInteger(max_jobs)||max_jobs<1||max_jobs>500)throw new Error('max_jobs must be 1..500');
  const setup=enqueueUniversalSkillBatch({root_dir,candidates,now_ms});
  const runtime=setup.runtime;const results=[];
  const companies=[...new Set(candidates.map((c)=>(c.activation_input??c).company_id??'fenix'))].sort();
  let processed=0;
  while(processed<max_jobs){
    let claimed=null,company_id=null;
    for(const company of companies){const j=runtime.claim({context:ctx(company),worker_id:`${worker_prefix}-${processed+1}`,now_ms:now_ms+processed,lease_ms:120000});if(j){claimed=j;company_id=company;break;}}
    if(!claimed)break;
    const worker_id=claimed.worker_id;
    try{
      const result=processCandidatePayload({payload:claimed.payload,root:setup.root,source_run_id,source_head_sha,existing_adapters});
      runtime.complete({job_id:claimed.job_id,worker_id,result,now_ms:now_ms+processed+1});
      results.push(result);
    }catch(error){
      const failed=runtime.fail({job_id:claimed.job_id,worker_id,error:error?.message??String(error),now_ms:now_ms+processed+1});
      results.push(Object.freeze({candidate_id:claimed.payload.candidate_id,status:failed.status==='DEAD_LETTER'?'BLOCKED_EXTERNAL':'RETRY_WAIT',error:String(error?.message??error),...authority()}));
    }
    processed+=1;
  }
  const byStatus=Object.fromEntries([...new Set(results.map((r)=>r.status))].sort().map((s)=>[s,results.filter((r)=>r.status===s).length]));
  const byLane=Object.fromEntries([...new Set(results.map((r)=>r.lane??'GENERAL'))].sort().map((s)=>[s,results.filter((r)=>(r.lane??'GENERAL')===s).length]));
  const report={schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_BATCH_REPORT_V1',status:results.length?'BATCH_EXECUTED':'NO_WORK',company_id:'MULTI',engine_id:'FACT-001',environment:PREPROD,version:VERSION,accepted:setup.accepted.length,processed:results.length,results:Object.freeze(results),by_status:Object.freeze(byStatus),by_lane:Object.freeze(byLane),job_journal:runtime.journal_path,...authority()};
  return Object.freeze({...report,batch_hash:hash(report)});
}

export async function runUniversalSkillBatchIndustrial({root_dir,candidates,concurrency=5,max_jobs=50,worker_prefix='usaf-industrial',source_run_id=1,source_head_sha='0000000000000000000000000000000000000001',now_ms=Date.now(),existing_adapters={}}={}){
  if(!Array.isArray(candidates)||candidates.length===0)throw new Error('candidates required');
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>50)throw new Error('concurrency must be 1..50');
  if(!Number.isInteger(max_jobs)||max_jobs<1||max_jobs>500)throw new Error('max_jobs must be 1..500');
  const dedupe=dedupeByContent(candidates);
  const primaryCandidates=dedupe.primaries.map((row)=>row.candidate);
  const setup=enqueueUniversalSkillBatch({root_dir,candidates:primaryCandidates,now_ms});
  const runtime=setup.runtime;
  const companies=[...new Set(primaryCandidates.map((c)=>(c.activation_input??c).company_id??'fenix'))].sort();
  const claimed=[];
  while(claimed.length<max_jobs){
    let job=null;
    for(const company of companies){
      const claimAt=now_ms+claimed.length;
      const candidate=runtime.claim({context:ctx(company),worker_id:`${worker_prefix}-${claimed.length+1}`,now_ms:claimAt,lease_ms:120000});
      if(candidate){job={job:candidate,claim_at_ms:claimAt,queue_wait_ms:Math.max(0,claimAt-(candidate.created_at_ms??claimAt))};break;}
    }
    if(!job)break;
    claimed.push(job);
  }

  const threadSafe=adaptersWorkerSafe(existing_adapters);
  const pool=await mapConcurrent(claimed,concurrency,async({job,queue_wait_ms})=>{
    const started=Date.now();
    try{
      const args={payload:job.payload,root:setup.root,source_run_id,source_head_sha,existing_adapters};
      const result=threadSafe?await runWorkerThread(args):processCandidatePayload(args);
      return Object.freeze({ok:true,job,result,telemetry:candidateTelemetry({queue_wait_ms,activation_ms:Math.max(0,Date.now()-started)}),execution_mode:threadSafe?'WORKER_THREAD':'INLINE_ADAPTER_FALLBACK'});
    }catch(error){
      return Object.freeze({ok:false,job,error:String(error?.message??error),telemetry:candidateTelemetry({queue_wait_ms,activation_ms:Math.max(0,Date.now()-started)}),execution_mode:threadSafe?'WORKER_THREAD':'INLINE_ADAPTER_FALLBACK'});
    }
  });

  const executed=[];
  for(let index=0;index<pool.output.length;index+=1){
    const row=pool.output[index],completeAt=now_ms+claimed.length+index+1;
    if(row.ok){
      runtime.complete({job_id:row.job.job_id,worker_id:row.job.worker_id,result:row.result,now_ms:completeAt});
      executed.push(Object.freeze({...row.result,telemetry:row.telemetry,execution_mode:row.execution_mode}));
    }else{
      const failed=runtime.fail({job_id:row.job.job_id,worker_id:row.job.worker_id,error:row.error,now_ms:completeAt});
      executed.push(Object.freeze({candidate_id:row.job.payload.candidate_id,status:failed.status==='DEAD_LETTER'?'BLOCKED_EXTERNAL':'RETRY_WAIT',error:row.error,telemetry:row.telemetry,execution_mode:row.execution_mode,...authority()}));
    }
  }

  const results=Object.freeze([...executed,...dedupe.absorbed]);
  const byStatus=Object.fromEntries([...new Set(results.map((r)=>r.status))].sort().map((status)=>[status,results.filter((r)=>r.status===status).length]));
  const byLane=Object.fromEntries([...new Set(executed.map((r)=>r.lane??'GENERAL'))].sort().map((lane)=>[lane,executed.filter((r)=>(r.lane??'GENERAL')===lane).length]));
  const activationTimes=executed.map((r)=>r.telemetry?.activation_ms).filter(Number.isFinite);
  const idempotentHits=setup.accepted.filter((row)=>row.duplicate===true).length;
  const cacheHits=dedupe.absorbed.length;
  const parallelExecutionProven=threadSafe&&claimed.length>=5&&pool.max_active>=5;
  const metrics=Object.freeze({
    activation_wall_time_p50_ms:percentile(activationTimes,50),
    activation_wall_time_p95_ms:percentile(activationTimes,95),
    human_touches_per_skill:results.length?Number((results.filter((r)=>r.status==='HUMAN_REQUIRED').length/results.length).toFixed(6)):0,
    skill_specific_code_changes:0,
    content_cache_hits:cacheHits,
    content_cache_hit_ratio:candidates.length?Number((cacheHits/candidates.length).toFixed(6)):0,
    idempotent_job_hits:idempotentHits,
    idempotent_rerun_rate:primaryCandidates.length?Number((idempotentHits/primaryCandidates.length).toFixed(6)):0,
    regression_rate:results.length?Number((results.filter((r)=>['BLOCKED_EXTERNAL','RETRY_WAIT'].includes(r.status)).length/results.length).toFixed(6)):0,
    terminal_outcome_distribution:Object.freeze(byStatus)
  });
  const report={
    schema_version:'1.0.0',
    state_type:'CEREBRO_UNIVERSAL_SKILL_BATCH_INDUSTRIAL_REPORT_V1',
    status:claimed.length?(parallelExecutionProven?'INDUSTRIAL_BATCH_EXECUTED':'INDUSTRIAL_BATCH_EXECUTED_WITHOUT_PARALLEL_PROOF'):'NO_WORK',
    company_id:'MULTI',
    engine_id:'FACT-001',
    environment:PREPROD,
    version:VERSION,
    input_candidates:candidates.length,
    primary_candidates:primaryCandidates.length,
    absorbed_count:dedupe.absorbed.length,
    accepted_new_jobs:setup.accepted.filter((row)=>row.accepted===true).length,
    idempotent_job_hits:idempotentHits,
    executed_primary_count:executed.length,
    max_active_workers:pool.max_active,
    requested_concurrency:concurrency,
    worker_mode:threadSafe?'WORKER_THREAD':'INLINE_ADAPTER_FALLBACK',
    parallel_execution_proven:parallelExecutionProven,
    fail_fast:false,
    results,
    by_status:Object.freeze(byStatus),
    by_lane:Object.freeze(byLane),
    metrics,
    job_journal:runtime.journal_path,
    ...authority()
  };
  return Object.freeze({...report,batch_hash:hash(report)});
}
