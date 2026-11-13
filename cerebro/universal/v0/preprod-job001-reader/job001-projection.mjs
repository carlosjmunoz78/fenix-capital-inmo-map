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
