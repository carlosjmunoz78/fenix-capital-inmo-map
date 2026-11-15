// Factory-first sharing a pre-existing scheduler: SHADOW / NO SIDE EFFECTS.
// Never runs on Cloudflare until a separate verified integration and rollback gate.
const REQUIRED=['fenix','LAB'];
const CRON_OWNER='cerebro-fact001-headless-operator-lab-20261111';
const MAX_PER_TICK=2, MAX_JOBS=50, MAX_CONCURRENCY=1;
const VALID=/^[A-Z][A-Z0-9-]{2,80}$/;
const VALID_ID=/^[a-z0-9][a-z0-9_-]{3,90}$/;
function invalid(x,reason){return {status:'DENIED',reason,selected:[],deferred:[],runtime_execution:false,external_actions:0,cron_changes:0,additional_cost_eur:0}};
export function planSharedSchedulerShadow({company_id,environment,scheduler_id,cron_quota,crons_used,
 engines=[],jobs=[],now_ms,guard={}}={}){
 if(company_id!==REQUIRED[0]||environment!==REQUIRED[1])return invalid(null,'SCOPE_DENIED');
 if(scheduler_id!==CRON_OWNER)return invalid(null,'SCHEDULER_NOT_ALLOWLISTED');
 if(cron_quota!==5||crons_used!==5)return invalid(null,'CRON_SNAPSHOT_DRIFT');
 if(!Number.isSafeInteger(now_ms)||now_ms<0)return invalid(null,'TIME_INVALID');
 if(!Array.isArray(jobs)||jobs.length>MAX_JOBS||!Array.isArray(engines)||engines.length>MAX_JOBS)return invalid(null,'UNBOUNDED_INPUT');
 if(!guard?.old_contract_snapshotted||!guard?.dependency_map_snapshotted||
 !guard?.rollback_dry_run_green||!guard?.existing_scheduler_tests_green)
  return invalid(null,'PROMOTION_GATE_NOT_GREEN');
 const allow=new Set(engines);
 if(allow.size!==engines.length||engines.some(e=>typeof e!=='string'||!VALID.test(e)))
  return invalid(null,'ENGINE_REGISTRY_DENIED');
 const seen=new Set(),candidates=[],deferred=[];
 for(const job of jobs){
  if(!job||job.company_id!=='fenix'||job.environment!=='LAB'||!allow.has(job.engine_id)||
   typeof job.job_id!=='string'||!VALID_ID.test(job.job_id)||
   typeof job.idempotency_key!=='string'||!VALID_ID.test(job.idempotency_key)||
   !Number.isInteger(job.priority)||job.priority<1||job.priority>5||
   !Number.isSafeInteger(job.due_at_ms)||job.due_at_ms<0||
   typeof job.paused!=='boolean'||job.cost_eur!==0||job.external_actions_allowed!==false)
   return invalid(null,'JOB_CONTRACT_DENIED');
  if(seen.has(job.idempotency_key))return invalid(null,'DUPLICATE_JOB_KEY');
  seen.add(job.idempotency_key);
  if(job.paused){deferred.push({job_id:job.job_id,reason:'PAUSED'});continue}
  if(job.due_at_ms>now_ms){deferred.push({job_id:job.job_id,reason:'NOT_DUE'});continue}
  candidates.push(job);
 }
 candidates.sort((a,b)=>a.priority-b.priority||a.due_at_ms-b.due_at_ms||a.job_id.localeCompare(b.job_id));
 const selected=candidates.slice(0,MAX_PER_TICK).map(x=>({job_id:x.job_id,engine_id:x.engine_id,priority:x.priority,idempotency_key:x.idempotency_key}));
 deferred.push(...candidates.slice(MAX_PER_TICK).map(x=>({job_id:x.job_id,reason:'FAIRNESS_LIMIT'})));
 return{status:'SHADOW_PLAN_ONLY',scheduler_id:CRON_OWNER,company_id:'fenix',environment:'LAB',
  selected,deferred,limit_per_tick:MAX_PER_TICK,concurrency_limit:MAX_CONCURRENCY,
  existing_crons_untouched:true,cron_changes:0,runtime_execution:false,external_actions:0,
  additional_cost_eur:0,needs_provider_integration:true};
}
