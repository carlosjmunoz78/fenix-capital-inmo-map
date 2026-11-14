/** CEREBRO Universal LAB: fixed owner-authenticated staging suspension observation.
 * Never requests staging, never dispatches a job. Durable capture writes evidence ONLY.
 */
const URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-universal-staging-observe-lab-v0';
const unavailable=reason=>({status:'UNAVAILABLE',source:'LIVE_STAGING_SUSPENSION_PREPROD',reason,
  prod_execution_enabled:false,executed_external_actions:false});
const valid=(data,method)=>{
 if(!data||typeof data!=='object'||Array.isArray(data)||data.prod_execution_enabled!==false||
   data.executed_external_actions!==false)return false;
 if(data.source!==(method==='GET'?'LIVE_STAGING_SUSPENSION_PREPROD':'PREPROD_LAB_DURABLE_EVIDENCE')||
   data.status!==(method==='GET'?'OBSERVED':'EVIDENCE_PERSISTED'))return false;
 const r=data.observation;
 if(!r||typeof r!=='object'||Array.isArray(r)||r.state!=='SUSPENDED_BY_OWNER'||
    r.status!=='OK'||r.company_id!=='fenix'||r.environment!=='LAB'||r.source_environment!=='PREPROD'||
    r.host!=='staging.fenixcapital.es'||r.global_isolation_verified!==false||
    r.staging_probed!==false||r.executed_external_actions!==false||
    r.prod_execution_enabled!==false||typeof r.known_controls_closed!=='boolean')return false;
 for(const [k,count,number] of [['staging_job001','expected',15],['staging_cron','expected',14],['sql_guard','expected',4]]){
  const obj=r[k];if(!obj||typeof obj!=='object'||obj[count]!==number)return false;
 }
 if(method==='POST'&&(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(data.evidence_id||'')||
   data.observation_executed!==true&&data.replayed!==true||typeof data.replayed!=='boolean'))return false;
 return true;
};
export function createStagingObservationReaderLabV0({preprodApiKey,ownerApiKey,fetchImpl=globalThis.fetch}={}){
 if(typeof preprodApiKey!=='string'||!preprodApiKey.startsWith('sb_publishable_')||
    preprodApiKey.length>256)throw Error('PREPROD_PUBLISHABLE_KEY_REQUIRED');
 if(typeof ownerApiKey!=='string'||ownerApiKey.length<12||ownerApiKey.length>256)throw Error('OWNER_APIKEY_REQUIRED');
 if(typeof fetchImpl!=='function')throw Error('FETCH_REQUIRED');
 async function requestForContext({company_id,environment,session_token,idempotency_key},method){
  if(company_id!=='fenix'||environment!=='LAB'||typeof session_token!=='string'||
     session_token.length<20||session_token.length>8192||/\s/.test(session_token))
    throw Error('OWNER_CONTEXT_REQUIRED');
  if(method==='POST'&&(typeof idempotency_key!=='string'||!/^lab-observe-[a-z0-9-]{12,48}$/.test(idempotency_key)))
    throw Error('IDEMPOTENCY_KEY_INVALID');
  const headers={authorization:'Bearer '+session_token,apikey:preprodApiKey,
   'x-cerebro-owner-prod-apikey':ownerApiKey,accept:'application/json'};
  let response;
  try{
   response=await fetchImpl(URL,{method,redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(9000),
    headers:method==='POST'?{...headers,'content-type':'application/json'}:headers,
    ...(method==='POST'?{body:JSON.stringify({action:'CAPTURE_SUSPENSION_EVIDENCE',
     company_id:'fenix',environment:'LAB',idempotency_key})}:{})
   });
  }catch{return unavailable('SOURCE_UNREACHABLE')}
  if(response?.status===401||response?.status===403)return unavailable('OWNER_DENIED');
  if(response?.status!==200)return unavailable('SOURCE_UNAVAILABLE');
  try{const data=await response.json();return valid(data,method)?data:unavailable('SOURCE_CONTRACT_INVALID')}
  catch{return unavailable('SOURCE_JSON_INVALID')}
 }
 return Object.freeze({
  source:'LIVE_STAGING_SUSPENSION_PREPROD',
  readForContext:ctx=>requestForContext(ctx,'GET'),
  captureForContext:ctx=>requestForContext(ctx,'POST')
 });
}
