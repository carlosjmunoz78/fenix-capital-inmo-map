/** CEREBRO JOB-001 existing PREPROD metadata: safe, bounded, no execution in this module. */
export function ownerIsVerified(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.ok===false)return false;
 const principal=raw.context??raw;
 return !!principal&&typeof principal==='object'&&!Array.isArray(principal)&&principal.actor_code==='CARLOS-ADMIN';
}

const RE_ID=/^[A-Z][A-Z0-9-]{2,60}$/;
const STALE_MS=24*60*60*1000;
const str=(v,n=90)=>typeof v==='string'?v.slice(0,n):'';
const moment=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
export function projectJob001ReadSnapshot({jobs,external,engines,telemetryCount,observedAt=new Date().toISOString()}={}){
 if(!Array.isArray(jobs)||!Array.isArray(external)||!Array.isArray(engines)||jobs.length>64||external.length>64||engines.length>64)throw Error('SOURCE_SIZE_INVALID');
 const instant=Date.parse(observedAt);
 if(!Number.isFinite(instant))throw Error('OBSERVED_AT_INVALID');
 const fresh=(v)=>{const ms=Date.parse(v||'');return Number.isFinite(ms)&&ms<=instant+120000&&instant-ms<=STALE_MS};
 const validControl=(r)=>r&&r.company_id==='FENIX_CAPITAL'&&r.environment==='PREPROD'&&RE_ID.test(String(r.engine_id||''))&&Number.isSafeInteger(r.job_id)&&r.job_id>0&&typeof r.enabled==='boolean';
 const jobRows=jobs.filter(validControl).map(r=>({
  job_id:r.job_id,engine_id:r.engine_id,company_id:'fenix',source_company_id:'FENIX_CAPITAL',
  environment:'PREPROD',version:str(r.version,30),enabled:r.enabled,
  configured:true,dispatch_verified:false,runtime_verified:false,
  last_changed_at:moment(r.updated_at),freshness:fresh(r.updated_at)?'RECENT_CONFIG':'STALE_CONFIG'
 }));
 const externalRows=external.filter(validControl).map(r=>({
  job_id:r.job_id,engine_id:r.engine_id,company_id:'fenix',source_company_id:'FENIX_CAPITAL',
  environment:'PREPROD',version:str(r.version,30),enabled:r.enabled,
  configured:true,dispatch_verified:false,runtime_verified:false,
  last_changed_at:moment(r.updated_at),freshness:fresh(r.updated_at)?'RECENT_CONFIG':'STALE_CONFIG'
 }));
 const engineRows=engines.filter(r=>r&&r.company_id==='fenix'&&r.environment==='PREPROD'&&RE_ID.test(String(r.engine_id||''))).map(r=>({
  engine_id:r.engine_id,company_id:'fenix',environment:'PREPROD',version:str(r.version,30),
  declared_state:str(r.state,30),runtime_verified:false,
  last_changed_at:moment(r.updated_at),freshness:fresh(r.updated_at)?'RECENT_CONFIG':'STALE_CONFIG'
 }));
 if(jobRows.length!==jobs.length||externalRows.length!==external.length||engineRows.length!==engines.length)throw Error('CROSS_COMPANY_OR_INVALID_ROW');
 if(!Number.isSafeInteger(telemetryCount)||telemetryCount<0)throw Error('TELEMETRY_COUNT_INVALID');
 return {
  status:'OK',source:'PREPROD_JOB001_CONTROL_METADATA',
  company_id:'fenix',source_company_id:'FENIX_CAPITAL',environment:'PREPROD',
  observed_at:new Date(instant).toISOString(),
  job_controls:jobRows,external_controls:externalRows,engine_state_records:engineRows,
  totals:{job_controls:jobRows.length,external_controls:externalRows.length,engine_state_records:engineRows.length,telemetry_records:telemetryCount},
  telemetry_status:telemetryCount===0?'NO_TELEMETRY_ROWS':'RECORDS_PRESENT_NOT_VALIDATED',
  live_execution_verified:false,actual_dispatch_enabled:false,prod_execution_enabled:false,job001_queue_connected:false,
  source_provenance:'EXISTING_PREPROD_SQL_READ_ONLY',
  no_new_queue:true,write_operations:0
 };
}

/** Fixed four existing PREPROD pg_cron jobs; observational proof of scheduler SQL completion only. */
export function projectCronObservation(raw,{observedAt=new Date().toISOString()}={}){
 const unavailable=reason=>({status:'UNAVAILABLE',source:'PREPROD_PG_CRON_OBSERVATION',reason,
  active:0,run_records:0,recent_successful_cron_commands:0,jobs:[],
  is_job001_hostinger_master:false,is_job001_runtime_proof:false});
 const now=Date.parse(observedAt);
 if(!Number.isFinite(now))throw Error('CRON_OBSERVED_TIME_INVALID');
 if(!raw||raw.source!=='PREPROD_PG_CRON_OBSERVATION'||raw.is_job001_hostinger_master!==false||
    raw.is_job001_runtime_proof!==false||!Array.isArray(raw.jobs)||raw.jobs.length>4)
  return unavailable('CRON_CONTRACT_INVALID');
 const allowed=new Set([6,22,23,25]),statuses=new Set(['succeeded','failed','running','starting','sending','UNKNOWN']);
 const ids=new Set(),jobs=[];
 for(const j of raw.jobs){
  const id=j?.legacy_pg_cron_job_id;
  if(!allowed.has(id)||ids.has(id)||typeof j.active!=='boolean'||
    !statuses.has(j.last_status)||typeof j.run_record_present!=='boolean'||
    j.downstream_effect_verified!==false)
   return unavailable('CRON_JOB_CONTRACT_INVALID');
  ids.add(id);
  const started=j.last_run_at===null?null:moment(j.last_run_at);
  const ended=j.last_finished_at===null?null:moment(j.last_finished_at);
  if(j.run_record_present!==Boolean(started)||j.last_run_at!==null&&!started||
    j.last_finished_at!==null&&!ended)
   return unavailable('CRON_TIME_INVALID');
  const recent=started!==null&&now-Date.parse(started)>=-120000&&now-Date.parse(started)<=86400000;
  jobs.push({job_id:id,active:j.active,last_status:j.last_status,last_run_at:started,
   last_finished_at:ended,run_record_present:j.run_record_present,run_recent:recent,
   downstream_effect_verified:false,job001_execution_verified:false});
 }
 jobs.sort((a,b)=>a.job_id-b.job_id);
 return {status:'OK',source:'PREPROD_PG_CRON_OBSERVATION',observed_at:new Date(now).toISOString(),
  active:jobs.filter(j=>j.active).length,run_records:jobs.filter(j=>j.run_record_present).length,
  recent_successful_cron_commands:jobs.filter(j=>j.active&&j.last_status==='succeeded'&&j.run_recent).length,
  jobs,is_job001_hostinger_master:false,is_job001_runtime_proof:false};
}

/** Read-only cumulative PostgREST invocation observations; never job results. */
export function projectDispatchRpcObservation(raw){
 const none={status:'UNAVAILABLE',source:'PREPROD_JOB001_DISPATCH_RPC_STATS',
  rpc_calls_since_reset:null,stats_reset_at:null,observed_at:null,
  hostinger_origin_verified:false,runtime_execution_verified:false,downstream_effect_verified:false};
 if(!raw||raw.source!==none.source||raw.source_semantics!=='POSTGREST_SQL_RPC_INVOCATION_COUNTER_NOT_JOB_COMPLETION'||
   raw.hostinger_origin_verified!==false||raw.runtime_execution_verified!==false||
   raw.downstream_effect_verified!==false||!Number.isSafeInteger(raw.rpc_calls_since_reset)||
   raw.rpc_calls_since_reset<0||!Number.isSafeInteger(raw.matching_normalized_statements)||
   raw.matching_normalized_statements<1||raw.matching_normalized_statements>4||
   typeof raw.stats_reset_at!=='string'||typeof raw.observed_at!=='string'||
   !Number.isFinite(Date.parse(raw.stats_reset_at))||!Number.isFinite(Date.parse(raw.observed_at))||
   Date.parse(raw.stats_reset_at)>Date.parse(raw.observed_at))
  return none;
 return {status:'OK',source:none.source,rpc_calls_since_reset:raw.rpc_calls_since_reset,
  stats_reset_at:new Date(raw.stats_reset_at).toISOString(),observed_at:new Date(raw.observed_at).toISOString(),
  hostinger_origin_verified:false,runtime_execution_verified:false,downstream_effect_verified:false};
}

/** Existing SEO-001 PREPROD backlog status only. No staging calls or execution. */
export function projectSeoBacklogObservation(raw){
 const unavailable={status:'UNAVAILABLE',source:'PREPROD_SEO_BACKLOG_READ_ONLY',
  company_id:'fenix',source_environment:'PREPROD',queued:null,done:null,
  waiting_prerequisites:null,cancelled:null,total:null,supervisor_state:'UNVERIFIED',
  latest_done_at:null,supervisor_last_measured_at:null,staging_probe_performed:false,
  seo_dispatch_authorized:false,downstream_publication_verified:false};
 if(!raw||raw.source!==unavailable.source||raw.company_id!=='fenix'||
  raw.source_company_id!=='FENIX_CAPITAL'||raw.source_environment!=='PREPROD'||
  raw.engine_id!=='SEO-001'||raw.staging_status!=='SUSPENDED_BY_OWNER_NO_PROBE'||
  raw.staging_probe_performed!==false||raw.seo_dispatch_authorized!==false||
  raw.downstream_publication_verified!==false)
  return unavailable;
 const keys=['queued','done','waiting_prerequisites','cancelled','total'];
 if(!keys.every(k=>Number.isSafeInteger(raw[k])&&raw[k]>=0))return unavailable;
 if(raw.total!==raw.queued+raw.done+raw.waiting_prerequisites+raw.cancelled)return unavailable;
 const last=(v)=>v===null?null:(typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():undefined);
 const doneAt=last(raw.latest_done_at),supervisorAt=last(raw.supervisor_last_measured_at);
 if(doneAt===undefined||supervisorAt===undefined||!['DEGRADED','GREEN','PLANNED','UNVERIFIED','BLOCKED'].includes(raw.supervisor_state))
  return unavailable;
 return {status:'OK',source:unavailable.source,company_id:'fenix',source_environment:'PREPROD',
  queued:raw.queued,done:raw.done,waiting_prerequisites:raw.waiting,cancelled:raw.cancelled,total:raw.total,
  latest_done_at:doneAt,supervisor_last_measured_at:supervisorAt,supervisor_state:raw.supervisor_state,
  staging_probe_performed:false,seo_dispatch_authorized:false,downstream_publication_verified:false};
}
