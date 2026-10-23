const STATES = Object.freeze({
  QUEUED:'QUEUED', LEASED:'LEASED', RETRY_WAIT:'RETRY_WAIT', SUCCEEDED:'SUCCEEDED',
  FAILED:'FAILED', DEAD_LETTER:'DEAD_LETTER', CANCELLED:'CANCELLED'
});

function required(value, name, max=160) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name.toUpperCase()}_REQUIRED`);
  const out=value.trim();
  if (out.length>max) throw new Error(`${name.toUpperCase()}_TOO_LONG`);
  return out;
}
function integer(value,name,{min=0,max=Number.MAX_SAFE_INTEGER}={}){
  if(!Number.isInteger(value)||value<min||value>max)throw new Error(`INVALID_${name.toUpperCase()}`);
  return value;
}
function number(value,name,{min=0,max=Number.MAX_VALUE}={}){
  if(!Number.isFinite(value)||value<min||value>max)throw new Error(`INVALID_${name.toUpperCase()}`);
  return Number(value);
}
function nowMs(clock){return Number(clock());}
function scopeKey(job){return `${job.company_id}::${job.environment}::${job.browser_profile_id}`;}
function deptKey(job){return `${job.company_id}::${job.environment}::${job.department_id}`;}
function companyKey(job){return `${job.company_id}::${job.environment}`;}
function cloneJob(job){return Object.freeze({...job});}

export function normalizeBrowserOrchestratorJob(input={}, seq=0, now=Date.now()){
  const mode=String(input.mode||'OBSERVE').toUpperCase();
  if(!['OBSERVE','MUTATE'].includes(mode))throw new Error('BROWSER_ORCHESTRATOR_MODE_INVALID');
  const risk=String(input.risk||'LOW').toUpperCase();
  if(!['LOW','MEDIUM','HIGH'].includes(risk))throw new Error('BROWSER_ORCHESTRATOR_RISK_INVALID');
  const expected_cost_eur=number(Number(input.expected_cost_eur||0),'expected_cost_eur',{min:0,max:0});
  return Object.freeze({
    job_id:required(input.job_id||`job-${seq}`,'job_id'),
    idempotency_key:required(input.idempotency_key||`idem-${seq}`,'idempotency_key'),
    company_id:required(input.company_id,'company_id'),
    department_id:required(input.department_id,'department_id'),
    engine_id:required(input.engine_id,'engine_id',80),
    identity_id:required(input.identity_id||'public','identity_id'),
    account_id:required(input.account_id||'public','account_id'),
    browser_profile_id:required(input.browser_profile_id,'browser_profile_id'),
    environment:required(input.environment,'environment',40),
    version:required(input.version||'v2','version',40),
    capability:required(input.capability||'browser1.observe','capability',120),
    mode,risk,expected_cost_eur,
    priority:integer(Number(input.priority??50),'priority',{min:0,max:100}),
    timeout_seconds:integer(Number(input.timeout_seconds??300),'timeout_seconds',{min:30,max:1800}),
    max_attempts:integer(Number(input.max_attempts??3),'max_attempts',{min:1,max:10}),
    state:STATES.QUEUED,
    attempt_count:0,
    cancel_requested:false,
    not_before_ms:now,
    lease_id:null,
    leased_by:null,
    lease_expires_ms:null,
    created_seq:seq,
    created_at_ms:now,
    last_error:null
  });
}

export function createBrowserOrchestratorV2({
  global_limit=4,
  default_company_limit=4,
  default_department_limit=2,
  lease_seconds=300,
  retry_base_ms=250,
  clock=()=>Date.now()
}={}){
  integer(global_limit,'global_limit',{min:1,max:128});
  integer(default_company_limit,'default_company_limit',{min:1,max:128});
  integer(default_department_limit,'default_department_limit',{min:1,max:128});
  integer(lease_seconds,'lease_seconds',{min:30,max:1800});
  integer(retry_base_ms,'retry_base_ms',{min:1,max:60_000});

  const jobs=new Map();
  const idem=new Map();
  const profileLeases=new Map();
  const departmentLastServed=new Map();
  const quotas={company:new Map(),department:new Map()};
  let seq=0;
  let serveSeq=0;

  function setCompanyQuota(company_id,environment,max_concurrent){
    quotas.company.set(`${required(company_id,'company_id')}::${required(environment,'environment',40)}`,integer(max_concurrent,'company_quota',{min:1,max:128}));
  }
  function setDepartmentQuota(company_id,environment,department_id,max_concurrent){
    quotas.department.set(`${required(company_id,'company_id')}::${required(environment,'environment',40)}::${required(department_id,'department_id')}`,integer(max_concurrent,'department_quota',{min:1,max:128}));
  }

  function activeJobs(){return [...jobs.values()].filter(j=>j.state===STATES.LEASED);}
  function activeCompanyCount(job){const key=companyKey(job);return activeJobs().filter(j=>companyKey(j)===key).length;}
  function activeDepartmentCount(job){const key=deptKey(job);return activeJobs().filter(j=>deptKey(j)===key).length;}
  function companyLimit(job){return quotas.company.get(companyKey(job))??default_company_limit;}
  function departmentLimit(job){return quotas.department.get(deptKey(job))??default_department_limit;}

  function releaseProfile(job){
    if(profileLeases.get(scopeKey(job))?.job_id===job.job_id)profileLeases.delete(scopeKey(job));
  }

  function reapExpired(){
    const now=nowMs(clock);
    for(const job of jobs.values()){
      if(job.state!==STATES.LEASED||job.lease_expires_ms===null||job.lease_expires_ms>now)continue;
      releaseProfile(job);
      const exhausted=job.attempt_count>=job.max_attempts;
      Object.assign(job,{
        state:exhausted?STATES.DEAD_LETTER:STATES.RETRY_WAIT,
        lease_id:null,leased_by:null,lease_expires_ms:null,
        not_before_ms:exhausted?Number.MAX_SAFE_INTEGER:now+retry_base_ms*Math.max(1,2**(job.attempt_count-1)),
        last_error:'LEASE_EXPIRED'
      });
    }
    for(const job of jobs.values()){
      if(job.state===STATES.RETRY_WAIT&&job.not_before_ms<=now)job.state=STATES.QUEUED;
    }
  }

  function eligible(job){
    const now=nowMs(clock);
    if(job.state!==STATES.QUEUED||job.cancel_requested||job.not_before_ms>now)return false;
    if(job.expected_cost_eur!==0)return false;
    if(job.risk==='HIGH')return false;
    if(profileLeases.has(scopeKey(job)))return false;
    if(activeJobs().length>=global_limit)return false;
    if(activeCompanyCount(job)>=companyLimit(job))return false;
    if(activeDepartmentCount(job)>=departmentLimit(job))return false;
    return true;
  }

  function fairnessTuple(job){
    return [
      -job.priority,
      activeDepartmentCount(job),
      departmentLastServed.get(deptKey(job))??-1,
      job.created_seq
    ];
  }
  function compareTuple(a,b){
    const ta=fairnessTuple(a), tb=fairnessTuple(b);
    for(let i=0;i<ta.length;i++){if(ta[i]!==tb[i])return ta[i]-tb[i];}
    return 0;
  }

  function enqueue(input={}){
    const idempotency_key=required(input.idempotency_key,'idempotency_key');
    if(idem.has(idempotency_key))return cloneJob(jobs.get(idem.get(idempotency_key)));
    const job=normalizeBrowserOrchestratorJob({...input,idempotency_key},++seq,nowMs(clock));
    const mutable={...job};
    jobs.set(mutable.job_id,mutable); idem.set(idempotency_key,mutable.job_id);
    return cloneJob(mutable);
  }

  function lease(worker_id){
    reapExpired();
    const worker=required(worker_id,'worker_id');
    const candidate=[...jobs.values()].filter(eligible).sort(compareTuple)[0];
    if(!candidate)return null;
    const lease_id=`lease-${candidate.job_id}-${candidate.attempt_count+1}-${nowMs(clock)}`;
    candidate.state=STATES.LEASED;
    candidate.attempt_count+=1;
    candidate.lease_id=lease_id;
    candidate.leased_by=worker;
    candidate.lease_expires_ms=nowMs(clock)+lease_seconds*1000;
    profileLeases.set(scopeKey(candidate),{job_id:candidate.job_id,lease_id,worker_id:worker,expires_ms:candidate.lease_expires_ms});
    departmentLastServed.set(deptKey(candidate),++serveSeq);
    return cloneJob(candidate);
  }

  function heartbeat(job_id,lease_id,worker_id,extend_seconds=lease_seconds){
    reapExpired();
    const job=jobs.get(required(job_id,'job_id'));
    if(!job||job.state!==STATES.LEASED)return {ok:false,error:'LEASE_NOT_ACTIVE'};
    if(job.lease_id!==lease_id||job.leased_by!==worker_id)return {ok:false,error:'LEASE_MISMATCH'};
    integer(extend_seconds,'extend_seconds',{min:30,max:1800});
    job.lease_expires_ms=nowMs(clock)+extend_seconds*1000;
    const lock=profileLeases.get(scopeKey(job)); if(lock)lock.expires_ms=job.lease_expires_ms;
    return {ok:true,lease_expires_ms:job.lease_expires_ms,cancel_requested:job.cancel_requested};
  }

  function cancel(job_id){
    const job=jobs.get(required(job_id,'job_id'));
    if(!job)return {ok:false,error:'JOB_NOT_FOUND'};
    job.cancel_requested=true;
    if([STATES.QUEUED,STATES.RETRY_WAIT].includes(job.state)){
      job.state=STATES.CANCELLED; job.not_before_ms=Number.MAX_SAFE_INTEGER;
    }
    return {ok:true,state:job.state,cancel_requested:true};
  }

  function complete(job_id,lease_id,worker_id,{ok,error_code=null,retryable=true}={}){
    const job=jobs.get(required(job_id,'job_id'));
    if(!job||job.state!==STATES.LEASED)return {ok:false,error:'LEASE_NOT_ACTIVE'};
    if(job.lease_id!==lease_id||job.leased_by!==worker_id)return {ok:false,error:'LEASE_MISMATCH'};
    releaseProfile(job);
    const now=nowMs(clock);
    if(job.cancel_requested){
      Object.assign(job,{state:STATES.CANCELLED,lease_id:null,leased_by:null,lease_expires_ms:null,last_error:'CANCELLED'});
    } else if(ok===true){
      Object.assign(job,{state:STATES.SUCCEEDED,lease_id:null,leased_by:null,lease_expires_ms:null,last_error:null});
    } else if(retryable!==false&&job.attempt_count<job.max_attempts){
      Object.assign(job,{state:STATES.RETRY_WAIT,lease_id:null,leased_by:null,lease_expires_ms:null,last_error:String(error_code||'FAILED'),not_before_ms:now+retry_base_ms*Math.max(1,2**(job.attempt_count-1))});
    } else {
      Object.assign(job,{state:STATES.DEAD_LETTER,lease_id:null,leased_by:null,lease_expires_ms:null,last_error:String(error_code||'FAILED'),not_before_ms:Number.MAX_SAFE_INTEGER});
    }
    return {ok:true,state:job.state,attempt_count:job.attempt_count};
  }

  function snapshot(){
    reapExpired();
    const byState={}; for(const state of Object.values(STATES))byState[state]=0;
    for(const job of jobs.values())byState[job.state]=(byState[job.state]||0)+1;
    return Object.freeze({
      schema_version:'2.0.0',capability_id:'BROWSER-ORCH-V2',execution_model:'POOL_OF_SERIAL_BROWSER1_WORKERS',
      limits:Object.freeze({global_limit,default_company_limit,default_department_limit,lease_seconds}),
      active_profiles:profileLeases.size,active_jobs:activeJobs().length,queued_jobs:byState.QUEUED||0,
      states:Object.freeze(byState),additional_cost_eur:0,serial_v1_rollback_preserved:true
    });
  }

  function get(job_id){const job=jobs.get(String(job_id));return job?cloneJob(job):null;}

  return Object.freeze({enqueue,lease,heartbeat,cancel,complete,snapshot,get,setCompanyQuota,setDepartmentQuota,reapExpired});
}

export const BROWSER_ORCHESTRATOR_V2_CONTRACT=Object.freeze({
  schema_version:'2.0.0',
  capability_id:'BROWSER-ORCH-V2',
  wraps_existing_browser1:true,
  replaces_browser1:false,
  worker_model:'SERIAL_WORKER_POOL',
  one_writer_per_browser_profile:true,
  fairness:'PRIORITY_PLUS_DEPARTMENT_ACTIVE_COUNT_AND_LAST_SERVED',
  supports_company_quota:true,
  supports_department_quota:true,
  supports_backpressure:true,
  supports_retry_budget:true,
  supports_dead_letter:true,
  supports_cancellation:true,
  supports_heartbeat:true,
  idempotent_enqueue:true,
  incremental_cost_eur:0,
  serial_v1_rollback_preserved:true
});

export { STATES as BROWSER_ORCHESTRATOR_V2_STATES };
