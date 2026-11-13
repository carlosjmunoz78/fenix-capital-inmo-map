/** Existing server-verified Owner Universe / FACT GitOps readers, LAB only.
 * Exposes only bounded source metadata; never exports customer data or grants.
 */
const URL='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v36-followups-lab/owner-universe?company_id=fenix';
const MAX_ROWS=256;
const ALLOWED_SOURCE=new Set(['LIVE_SERVER_READ','PUBLIC_GITHUB_LIVE','PUBLIC_GITHUB_CACHED','UNVERIFIED','SERVER_REGISTRY_METADATA_ONLY']);
const allowed=(x)=>ALLOWED_SOURCE.has(x)?x:'UNVERIFIED';
const noData=(reason)=>({status:'UNAVAILABLE',source:'EXISTING_OWNER_UNIVERSE_LAB',reason,company_id:'fenix',
 owner_verified_upstream:false,registry:{status:'UNAVAILABLE',source_status:'UNVERIFIED',companies:0,projects:0,engine_records:0},
 factory:{status:'UNAVAILABLE',source_status:'UNVERIFIED',catalog_definitions:0,scaffold_directories:0},
 runtime_engines_verified:0,execution_enabled:false,prod_execution_enabled:false,job001_connected:false});
export function createOwnerUniverseReaderLabV0({apiKey,fetchImpl=globalThis.fetch}={}){
 if(typeof apiKey!=='string'||apiKey.length<12||apiKey.length>256)throw Error('PUBLISHABLE_KEY_REQUIRED');
 if(typeof fetchImpl!=='function')throw Error('FETCH_REQUIRED');
 return Object.freeze({
  source:'EXISTING_OWNER_UNIVERSE_LAB',
  async listForContext({company_id,environment,session_token}={}){
   if(company_id!=='fenix'||environment!=='LAB')throw Error('OWNER_UNIVERSE_FENIX_LAB_ONLY');
   if(typeof session_token!=='string'||session_token.length<20||session_token.length>8192||/\s/.test(session_token))throw Error('OWNER_UNIVERSE_SESSION_REQUIRED');
   let response;
   try{response=await fetchImpl(URL,{method:'GET',headers:{authorization:'Bearer '+session_token,apikey:apiKey,accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)})}
   catch{return noData('UPSTREAM_UNAVAILABLE')}
   if(response?.status!==200&&response?.status!==207)return noData('UPSTREAM_STATUS_UNAVAILABLE');
   let raw;
   try{raw=await response.json()}catch{return noData('UPSTREAM_JSON_INVALID')}
   if(!raw||!['OK','PARTIAL'].includes(raw.status)||raw.owner_scope!=='SERVER_VERIFIED_FENIX_ONLY'||
      raw.executed!==false||raw.live_writes!==false||raw.prod_execution_enabled!==false)return noData('OWNER_UNIVERSE_CONTRACT_INVALID');
   const reg=raw.registry,fac=raw.factory;
   const safeCount=(value)=>Array.isArray(value)&&value.length<=MAX_ROWS?value.length:null;
   const rc=safeCount(reg?.companies),rp=safeCount(reg?.projects),re=safeCount(reg?.engines),fc=safeCount(fac?.catalog),fs=safeCount(fac?.scaffolded);
   if([rc,rp,re,fc,fs].some(x=>x===null))return noData('OWNER_UNIVERSE_SIZE_INVALID');
   // Only metadata counts and source provenance are permitted. No records, IDs,
   // payloads, secrets, account associations, or human-readable instructions.
   const registryOK=reg?.status==='OK'&&reg?.source_status==='LIVE_SERVER_READ';
   const factoryOK=fac?.status==='OK'&&['PUBLIC_GITHUB_LIVE','PUBLIC_GITHUB_CACHED'].includes(fac?.source_status);
   return {
    status:registryOK&&factoryOK?'OK':'PARTIAL',source:'EXISTING_OWNER_UNIVERSE_LAB',company_id:'fenix',
    owner_verified_upstream:true,
    registry:{status:registryOK?'OK':'UNAVAILABLE',source_status:allowed(reg?.source_status),
     companies:rc,projects:rp,engine_records:re},
    factory:{status:factoryOK?'OK':'UNAVAILABLE',source_status:allowed(fac?.source_status),
     catalog_definitions:fc,scaffold_directories:fs},
    runtime_engines_verified:0,execution_enabled:false,prod_execution_enabled:false,job001_connected:false,
    note:'READ_ONLY_METADATA_NOT_OPERATIONAL_PROOF'
   };
  }
 });
}
