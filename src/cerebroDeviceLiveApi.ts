import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type DeviceLiveRow={
 environment:'LAB'|'PREPROD';meaning:string;stored_online_count:number;not_revoked_count:number;
 heartbeat_5m_count:number;heartbeat_24h_count:number;last_seen_at:string|null;
 commands_total:number;commands_completed:number;commands_failed:number;commands_other:number;
 commands_created_24h:number;latest_completed_at:string|null;receipt_count:number;
 semantically_verified_receipts:number;comparable_successful_duration_samples:number;
 p50_completed_seconds:number|null;p90_completed_seconds:number|null;
};
export type DeviceLiveSnapshot={
 status:'OK';source:'FENIX_DEVICE_LAB_OWNER_READ_V1';company_id:'fenix';environment:'LAB';
 observed_at:string;read_only:true;executed:false;data_freshness:'SOURCE_READ_AT_REQUEST_TIME';
 active_agents_verified:null;active_subagents_verified:null;active_jobs_verified:null;cost_eur_measured:null;
 environments:DeviceLiveRow[];
};
export type DeviceLiveRead={kind:'ready';data:DeviceLiveSnapshot;reason:''}|
 {kind:'unavailable'|'denied';data:null;reason:string};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const fail=(kind:'unavailable'|'denied',reason:string):DeviceLiveRead=>({kind,reason,data:null});
const safe=(r:unknown):r is DeviceLiveSnapshot=>{
 if(!r||typeof r!=='object')return false;
 const x=r as Record<string,unknown>;
 if(x.status!=='OK'||x.company_id!=='fenix'||x.environment!=='LAB'||
  x.source!=='FENIX_DEVICE_LAB_OWNER_READ_V1'||x.read_only!==true||x.executed!==false||
  x.data_freshness!=='SOURCE_READ_AT_REQUEST_TIME'||x.active_agents_verified!==null||
  x.active_subagents_verified!==null||x.active_jobs_verified!==null||x.cost_eur_measured!==null||
  typeof x.observed_at!=='string'||!Number.isFinite(Date.parse(x.observed_at))||
  Date.now()-Date.parse(x.observed_at)>180000||Date.parse(x.observed_at)>Date.now()+60000||
  !Array.isArray(x.environments)||x.environments.length!==2)return false;
 return x.environments.every((r:any,i:number)=>{
  if(!r||r.environment!==(i===0?'LAB':'PREPROD'))return false;
  const nums=['stored_online_count','not_revoked_count','heartbeat_5m_count','heartbeat_24h_count',
   'commands_total','commands_completed','commands_failed','commands_other','commands_created_24h',
   'receipt_count','semantically_verified_receipts','comparable_successful_duration_samples'];
  return nums.every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&
   r.heartbeat_5m_count<=r.heartbeat_24h_count&&r.heartbeat_24h_count<=r.not_revoked_count&&
   r.commands_completed+r.commands_failed+r.commands_other===r.commands_total&&
   r.semantically_verified_receipts<=r.receipt_count&&r.receipt_count<=r.commands_total&&
   (r.p50_completed_seconds===null||typeof r.p50_completed_seconds==='number')&&
   (r.p90_completed_seconds===null||typeof r.p90_completed_seconds==='number');
 });
};
export async function readDeviceLive(signal?:AbortSignal):Promise<DeviceLiveRead>{
 if(typeof window==='undefined'||!HOST.test(window.location.hostname)||
  new URLSearchParams(window.location.search).get('visual_lab')!=='cockpit-v3')
  return fail('denied','PREVIEW_ONLY');
 try{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return fail('denied','OWNER_SESSION_REQUIRED');
  const result=await fetch('/api/cerebro-device-live?company_id=fenix',{method:'GET',cache:'no-store',
   signal,headers:{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,accept:'application/json'}});
  const body:unknown=await result.json().catch(()=>null);
  if(result.status===401||result.status===403)return fail('denied','OWNER_DENIED');
  if(result.status!==200){
   const reason=body&&typeof body==='object'&&'reason'in body&&typeof body.reason==='string'?body.reason:'LAB_DEVICE_SOURCE_UNAVAILABLE';
   const allowed=['LAB_DEVICE_SOURCE_UNAVAILABLE','LAB_DEVICE_SOURCE_UNREACHABLE','LAB_DEVICE_SOURCE_CONTRACT_INVALID',
    'LAB_READ_KEY_NOT_BOUND','LAB_DEVICE_RESPONSE_TOO_LARGE','OWNER_RESOLVER_UNAVAILABLE'];
   return fail('unavailable',allowed.includes(reason)?reason:'LAB_DEVICE_SOURCE_UNAVAILABLE');
  }
  return safe(body)?{kind:'ready',reason:'',data:body}:fail('unavailable','LAB_DEVICE_SOURCE_CONTRACT_INVALID');
 }catch{return fail('unavailable',signal?.aborted?'ABORTED':'LAB_DEVICE_SOURCE_UNREACHABLE')}
}
