/** Owner-authenticated PREPROD JOB-001 control observations. Never a job runner.
 * Calls the existing separate PREPROD Supabase project via isolated read-only Edge Function.
 */
const URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-job001-read-lab-v0?company_id=fenix&environment=LAB';
const empty=reason=>({status:'UNAVAILABLE',source:'PREPROD_JOB001_CONTROL_METADATA',reason,
 observed_at:null,control_rows:null,enabled_control_rows:null,external_control_rows:null,
 engine_state_records:null,telemetry_records:null,stale_control_rows:null,
 source_environment:'PREPROD',job001_queue_connected:false,live_execution_verified:false,prod_execution_enabled:false});
export function createJob001ControlReaderLabV0({preprodApiKey,ownerApiKey,fetchImpl=globalThis.fetch}={}){
 if(typeof preprodApiKey!=='string'||!preprodApiKey.startsWith('sb_publishable_')||preprodApiKey.length>256)throw Error('PREPROD_PUBLISHABLE_KEY_REQUIRED');
 if(typeof ownerApiKey!=='string'||ownerApiKey.length<12||ownerApiKey.length>256)throw Error('OWNER_PUBLIC_KEY_REQUIRED');
 if(typeof fetchImpl!=='function')throw Error('FETCH_REQUIRED');
 return Object.freeze({
  source:'PREPROD_JOB001_CONTROL_METADATA',
  async listForContext({company_id,environment,session_token}={}){
   if(company_id!=='fenix'||environment!=='LAB')throw Error('LAB_FENIX_SCOPE_REQUIRED');
   if(typeof session_token!=='string'||session_token.length<20||session_token.length>8192||/\s/.test(session_token))throw Error('OWNER_SESSION_REQUIRED');
   let response;
   try{response=await fetchImpl(URL,{method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8500),
    headers:{authorization:'Bearer '+session_token,apikey:preprodApiKey,'x-cerebro-owner-prod-apikey':ownerApiKey,accept:'application/json'}})}
   catch{return empty('PREPROD_GATEWAY_UNREACHABLE')}
   if(response.status!==200)return empty(response.status===401||response.status===403?'PREPROD_OWNER_DENIED':'PREPROD_SOURCE_UNAVAILABLE');
   let raw;try{raw=await response.json()}catch{return empty('PREPROD_JSON_INVALID')}
   if(raw?.status!=='OK'||raw?.source!=='PREPROD_JOB001_CONTROL_METADATA'||
       raw?.company_id!=='fenix'||raw?.source_company_id!=='FENIX_CAPITAL'||raw?.environment!=='PREPROD'||
       raw?.live_execution_verified!==false||raw?.actual_dispatch_enabled!==false||raw?.prod_execution_enabled!==false||
       raw?.job001_queue_connected!==false||raw?.write_operations!==0||
       !Array.isArray(raw.job_controls)||!Array.isArray(raw.external_controls)||!Array.isArray(raw.engine_state_records)||
       raw.job_controls.length>64||raw.external_controls.length>64||raw.engine_state_records.length>64)
    return empty('PREPROD_SOURCE_CONTRACT_INVALID');
   const t=raw.totals||{};
   if(![t.job_controls,t.external_controls,t.engine_state_records,t.telemetry_records].every(x=>Number.isSafeInteger(x)&&x>=0))
    return empty('PREPROD_COUNTS_INVALID');
   if(t.job_controls!==raw.job_controls.length||t.external_controls!==raw.external_controls.length||t.engine_state_records!==raw.engine_state_records.length)
    return empty('PREPROD_COUNT_MISMATCH');
   const observed_at=typeof raw.observed_at==='string'&&Number.isFinite(Date.parse(raw.observed_at))?raw.observed_at:null;
   if(!observed_at)return empty('PREPROD_OBSERVED_AT_INVALID');
   const all=[...raw.job_controls,...raw.external_controls];
   if(all.some(x=>x?.company_id!=='fenix'||x?.environment!=='PREPROD'||x?.runtime_verified!==false||x?.dispatch_verified!==false||typeof x?.enabled!=='boolean')||
      raw.engine_state_records.some(x=>x?.company_id!=='fenix'||x?.environment!=='PREPROD'||x?.runtime_verified!==false))
    return empty('PREPROD_TENANT_OR_RUNTIME_INVALID');
   // Bounded per-engine bindings: source declarations only. Never executable.
   const id=/^[A-Z][A-Z0-9-]{2,60}$/;
   const safeDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
   const engine_bindings=[];
   for(const rec of raw.engine_state_records){
    if(!id.test(rec.engine_id||'')||typeof rec.version!=='string'||rec.version.length>40||
       typeof rec.declared_state!=='string'||rec.declared_state.length>32||
       !['STALE_CONFIG','RECENT_CONFIG'].includes(rec.freshness)||!safeDate(rec.last_changed_at))
     return empty('ENGINE_BINDING_CONTRACT_INVALID');
    engine_bindings.push({engine_id:rec.engine_id,version:rec.version,environment:'PREPROD',
     declared_state:rec.declared_state,observed_config_at:safeDate(rec.last_changed_at),
     freshness:rec.freshness,runtime_verified:false});
   }
   const byEngine=new Map();
   for(const rec of all){
    if(!id.test(rec.engine_id||'')||!['STALE_CONFIG','RECENT_CONFIG'].includes(rec.freshness))
     return empty('JOB_ENGINE_CONTRACT_INVALID');
    const prev=byEngine.get(rec.engine_id)||{engine_id:rec.engine_id,environment:'PREPROD',
     configured_controls:0,enabled_controls:0,stale_controls:0,runtime_verified:false};
    prev.configured_controls+=1;
    if(rec.enabled)prev.enabled_controls+=1;
    if(rec.freshness==='STALE_CONFIG')prev.stale_controls+=1;
    byEngine.set(rec.engine_id,prev);
   }
   const control_engine_bindings=[...byEngine.values()].sort((a,b)=>a.engine_id.localeCompare(b.engine_id));
   engine_bindings.sort((a,b)=>a.engine_id.localeCompare(b.engine_id));
   return {
    status:'OK',source:'PREPROD_JOB001_CONTROL_METADATA',observed_at,
    control_rows:t.job_controls,enabled_control_rows:raw.job_controls.filter(x=>x.enabled).length,
    external_control_rows:t.external_controls,enabled_external_rows:raw.external_controls.filter(x=>x.enabled).length,
    engine_state_records:t.engine_state_records,telemetry_records:t.telemetry_records,
    stale_control_rows:all.filter(x=>x.freshness==='STALE_CONFIG').length,
    stale_engine_state_records:raw.engine_state_records.filter(x=>x.freshness==='STALE_CONFIG').length,
    engine_bindings,control_engine_bindings,
    source_environment:'PREPROD',source_provenance:'EXISTING_PREPROD_SQL_READ_ONLY',
    job001_queue_connected:false,live_execution_verified:false,prod_execution_enabled:false,
    note:'CONTROL_CONFIG_AND_DECLARED_ENGINE_STATE_NOT_RUNTIME_PROOF'
   };
  }
 });
}
