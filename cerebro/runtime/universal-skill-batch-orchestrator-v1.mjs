#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
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
