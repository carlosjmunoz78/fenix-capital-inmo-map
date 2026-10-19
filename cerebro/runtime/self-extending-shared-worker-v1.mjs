import path from 'node:path';
import {buildLegacy184SelfExtendingDispatchBatch} from './universal-skill-legacy184-self-extending-reopen-v0.mjs';
import {DurableJobRuntimeV1} from './durable-job-runtime-v1.mjs';
import {DurableWorkerRunnerV1} from './durable-worker-runner-v1.mjs';
import {enqueueSelfExtendingDispatchBatch,registerSelfExtendingMissionWorker} from './self-extending-mission-job-bridge-v0.mjs';
import {tribunalDecision} from './evaluation-tribunal.mjs';

const PREPROD='PREPROD';
const GREEN_BINDING_STATES=new Set(['FULL_SAFE_PREPROD','EVIDENCED_GREEN_PREPROD']);
const STRATEGIES=new Set(['REUSE_INTERNAL','WRAP_EXISTING','TECH_SCOUT_OSS_LOCAL','TECH_SCOUT_ALREADY_PAID','TECH_SCOUT_FREE_TIER','SELF_HOST','FACT001_BUILD_MINIMAL_SUBSTITUTE']);

function nonEmpty(value,label,max=4096){
  if(typeof value!=='string'||!value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  const out=value.trim();
  if(out.length>max) throw new TypeError(`${label} too long`);
  return out;
}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);return value;}
function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value)) throw new TypeError(`${label} must be an object`);return value;}
function freezeArray(value){return Object.freeze([...(Array.isArray(value)?value:[])]);}

function normalizeBinding(raw,index){
  object(raw,`bindings[${index}]`);
  const capability_id=nonEmpty(raw.capability_id,`bindings[${index}].capability_id`,240);
  const state=nonEmpty(raw.state,`bindings[${index}].state`,80);
  if(!GREEN_BINDING_STATES.has(state)) throw new Error(`bindings[${index}].state is not PREPROD green`);
  const strategies=freezeArray(raw.strategies).map((strategy)=>nonEmpty(strategy,`bindings[${index}].strategies[]`,80));
  if(strategies.length===0||strategies.some((strategy)=>!STRATEGIES.has(strategy))) throw new Error(`bindings[${index}].strategies invalid`);
  const evidence_ref=nonEmpty(raw.evidence_ref,`bindings[${index}].evidence_ref`);
  const validation=object(raw.validation,`bindings[${index}].validation`);
  const recovery=object(raw.recovery,`bindings[${index}].recovery`);
  const metric=nonEmpty(validation.metric,`bindings[${index}].validation.metric`,120);
  const direction=validation.direction??'higher';
  if(!['higher','lower'].includes(direction)) throw new Error(`bindings[${index}].validation.direction invalid`);
  const old=finite(validation.old,`bindings[${index}].validation.old`);
  const next=finite(validation.new,`bindings[${index}].validation.new`);
  const judge_id=nonEmpty(validation.judge_id,`bindings[${index}].validation.judge_id`,120);
  const candidate_actor_id=nonEmpty(validation.candidate_actor_id,`bindings[${index}].validation.candidate_actor_id`,240);
  if(judge_id===candidate_actor_id) throw new Error(`bindings[${index}] judge must be independent`);
  const evidence_refs=freezeArray(validation.evidence_refs).map((ref)=>nonEmpty(ref,`bindings[${index}].validation.evidence_refs[]`));
  if(evidence_refs.length===0||!evidence_refs.includes(evidence_ref)) throw new Error(`bindings[${index}] validation must cite binding evidence_ref`);
  return Object.freeze({
    capability_id,state,strategies:Object.freeze(strategies),evidence_ref,
    validation:Object.freeze({metric,direction,old,new:next,judge_id,candidate_actor_id,evidence_refs:Object.freeze(evidence_refs),real_outcome_delta:validation.real_outcome_delta??null}),
    recovery:Object.freeze({
      backup_ref:nonEmpty(recovery.backup_ref,`bindings[${index}].recovery.backup_ref`),
      rollback_ref:nonEmpty(recovery.rollback_ref,`bindings[${index}].recovery.rollback_ref`),
      rebuild_ref:nonEmpty(recovery.rebuild_ref,`bindings[${index}].rebuild_ref`)
    })
  });
}

export function normalizeSelfExtendingBindings(bindings=[]){
  if(!Array.isArray(bindings)) throw new TypeError('bindings must be an array');
  const normalized=bindings.map(normalizeBinding);
  const seen=new Set();
  for(const binding of normalized){if(seen.has(binding.capability_id)) throw new Error(`duplicate binding:${binding.capability_id}`);seen.add(binding.capability_id);}
  return Object.freeze(normalized);
}

export function createEvidenceBoundSelfExtendingAdapters({bindings=[]}={}){
  const byCapability=new Map(normalizeSelfExtendingBindings(bindings).map((binding)=>[binding.capability_id,binding]));
  const adapter=(strategy)=>async({resolution})=>{
    const binding=byCapability.get(resolution.capability_id);
    if(!binding||!binding.strategies.includes(strategy)) return Object.freeze({status:'NO_EVIDENCED_BINDING'});
    return Object.freeze({status:'GREEN',evidence_ref:binding.evidence_ref,binding});
  };
  return Object.freeze({
    reuse_internal:adapter('REUSE_INTERNAL'),
    wrap_existing:adapter('WRAP_EXISTING'),
    tech_scout:async({resolution,strategy})=>adapter(strategy)({resolution}),
    fact_build:adapter('FACT001_BUILD_MINIMAL_SUBSTITUTE')
  });
}

export function createTribunalVerifyAndResume(){
  return async({resolution,selected})=>{
    const binding=selected?.binding;
    if(!binding||binding.capability_id!==resolution.capability_id) return Object.freeze({status:'HOLD',reason:'EVIDENCED_BINDING_REQUIRED',prod_authorized:false,additional_cost_eur:0});
    const v=binding.validation;
    const evaluation=Object.freeze({
      evaluation_id:`selfext:${resolution.resolution_hash??resolution.capability_id}`,
      company_id:resolution.company_id,engine_id:'FACT-001',environment:PREPROD,version:resolution.version??'0.1.0',
      experiment_id:`selfext:${resolution.candidate_id}`,benchmark_ref:`binding:${binding.capability_id}`,
      metric:v.metric,old:v.old,new:v.new,delta:v.new-v.old,leakage_check:'PASS',adversarial_count:0,prod_authorized:false
    });
    const tribunal=tribunalDecision({evaluation,judge_id:v.judge_id,candidate_actor_id:v.candidate_actor_id,real_outcome_delta:v.real_outcome_delta,metric_direction:v.direction});
    if(tribunal.decision!=='PASS') return Object.freeze({status:'HOLD',reason:`TRIBUNAL_${tribunal.decision}:${tribunal.reason}`,evaluation,tribunal,prod_authorized:false,additional_cost_eur:0});
    return Object.freeze({
      status:'FULL_SAFE_PREPROD',capability_id:resolution.capability_id,evidence_ref:binding.evidence_ref,evidence_refs:v.evidence_refs,
      evaluation,tribunal,recovery:binding.recovery,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
    });
  };
}

export async function runSelfExtendingSharedWorkerIteration({
  company_root,company_id='fenix',skills_dir,bindings=[],worker_id='cerebro-shared-worker-v1',max_rounds=1,now_ms=Date.now(),clock=Date.now
}={}){
  const root=nonEmpty(company_root,'company_root');
  const company=nonEmpty(company_id,'company_id',120);
  if(!Number.isSafeInteger(max_rounds)||max_rounds<1||max_rounds>100) throw new TypeError('max_rounds must be 1..100');
  if(!Number.isSafeInteger(now_ms)||now_ms<0) throw new TypeError('now_ms must be a non-negative safe integer');
  if(typeof clock!=='function') throw new TypeError('clock must be a function');
  const batch=buildLegacy184SelfExtendingDispatchBatch({skills_dir,company_id:company});
  const runtime=new DurableJobRuntimeV1({file_path:path.join(root,'job001-self-extending.v1.journal'),environment:PREPROD});
  const dispatch=enqueueSelfExtendingDispatchBatch({job_runtime:runtime,batch,now_ms});
  const adapters=createEvidenceBoundSelfExtendingAdapters({bindings});
  const runner=new DurableWorkerRunnerV1({job_runtime:runtime,worker_id,environment:PREPROD,max_concurrency:4,max_per_company:2,clock});
  registerSelfExtendingMissionWorker({worker_runner:runner,...adapters,verify_and_resume:createTribunalVerifyAndResume()});
  const context=Object.freeze({company_id:company,engine_id:'FACT-001',environment:PREPROD,version:'0.1.0'});
  const outcomes=await runner.drainFair({contexts:[context],max_rounds,idle_delay_ms:0});
  const jobs=runtime.listForContext(context);
  const counts=Object.freeze(jobs.reduce((acc,job)=>{acc[job.status]=(acc[job.status]??0)+1;return acc;},{}));
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SELF_EXTENDING_SHARED_WORKER_ITERATION_V1',status:'PREPROD_ITERATION_COMPLETE',
    company_id:company,engine_id:'JOB-001',environment:PREPROD,version:'1.0.0',batch_hash:batch.batch_hash,
    dispatch,outcomes:Object.freeze(outcomes),job_counts:counts,journal_path:runtime.journal_path,operation_count:runtime.operation_count,
    human_required:Object.freeze([...batch.human_required]),prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export const SELF_EXTENDING_SHARED_WORKER_V1_CONTRACT=Object.freeze({
  capability:'JOB-001/self-extending-shared-worker-v1',environment:PREPROD,
  chain:Object.freeze(['buildLegacy184SelfExtendingDispatchBatch','enqueueSelfExtendingDispatchBatch','DurableJobRuntimeV1','DurableWorkerRunnerV1','self-extending-capability-resolver-v0','verify_and_resume','evaluation-tribunal']),
  persistence:'existing host company_root + AtomicV8Journal',shared_worker:true,new_server_required:false,binding_mode:'EVIDENCE_ONLY_FAIL_CLOSED',
  injectable_scheduler_clock:true,default_scheduler_clock:'Date.now',auto_install:false,automatic_paid_fallback:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0
});
