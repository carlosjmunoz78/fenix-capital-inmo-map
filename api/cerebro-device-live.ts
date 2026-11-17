/** Authenticated Preview-only proxy to a separate LAB Supabase aggregate reader.
 * Auth uses established PROD owner context; data comes solely from LAB project.
 */
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>};
type Res={status:(n:number)=>Res;setHeader:(name:string,value:string)=>void;json:(data:unknown)=>void};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const SOURCE='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-device-observe-lab-v0?company_id=fenix&environment=LAB';
const header=(v:H)=>Array.isArray(v)?v[0]||'':v||'';
const error=(res:Res,status:number,reason:string)=>res.status(status).json({status:'UNAVAILABLE',reason,read_only:true,executed:false});
const okTime=(t:unknown,now:number)=>typeof t==='string'&&Number.isFinite(Date.parse(t))&&Date.parse(t)<=now+60000&&now-Date.parse(t)<180000;
const natural=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
const safeDate=(v:unknown)=>v===null||(typeof v==='string'&&Number.isFinite(Date.parse(v)));
const safePercent=(x:unknown)=>x===null||(typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=604800);
export function validateDeviceLiveProjection(raw:unknown,now=Date.now()){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const p=raw as Record<string,unknown>,environments=p.environments;
 if(p.status!=='OK'||p.source!=='FENIX_DEVICE_LAB_OWNER_READ_V1'||p.company_id!=='fenix'||
  p.environment!=='LAB'||p.data_source_project!=='hnqlnvakzaywtafeiybt'||
  p.data_freshness!=='SOURCE_READ_AT_REQUEST_TIME'||p.read_only!==true||p.executed!==false||
  p.active_agents_verified!==null||p.active_subagents_verified!==null||p.active_jobs_verified!==null||
  p.cost_eur_measured!==null||p.contains_device_ids!==false||
  p.contains_command_payloads!==false||p.contains_result_bodies!==false||
  !okTime(p.observed_at,now)||!Array.isArray(environments)||environments.length!==2)return null;
 const results=[];
 for(const [i,r] of environments.entries()){
  if(!r||typeof r!=='object'||Array.isArray(r))return null;
  const x=r as Record<string,unknown>;
  const environment=i===0?'LAB':'PREPROD';
  const meaning=i===0?'LAB_DEVICE_RECORDS':'HISTORICAL_PREPROD_LABEL_IN_LAB_PROJECT';
  if(x.environment!==environment||x.meaning!==meaning)return null;
  const numKeys=['stored_online_count','not_revoked_count','heartbeat_5m_count','heartbeat_24h_count',
   'commands_total','commands_completed','commands_failed','commands_other','commands_created_24h',
   'receipt_count','semantically_verified_receipts','comparable_successful_duration_samples'];
  if(!numKeys.every(k=>natural(x[k]))||!safeDate(x.last_seen_at)||!safeDate(x.latest_completed_at)||
   !safePercent(x.p50_completed_seconds)||!safePercent(x.p90_completed_seconds)||
   x.heartbeat_5m_count>x.heartbeat_24h_count||x.heartbeat_24h_count>x.not_revoked_count||
   x.commands_completed+x.commands_failed+x.commands_other!==x.commands_total||
   x.commands_created_24h>x.commands_total||
   x.receipt_count>x.commands_total||x.semantically_verified_receipts>x.receipt_count||
   x.comparable_successful_duration_samples>x.commands_completed||
   (x.comparable_successful_duration_samples===0)!==(x.p50_completed_seconds===null&&x.p90_completed_seconds===null)||
   (typeof x.p50_completed_seconds==='number'&&typeof x.p90_completed_seconds==='number'&&
     x.p90_completed_seconds<x.p50_completed_seconds))return null;
  // explicit response allowlist strips all other fields from an unexpected upstream payload
  const out:Record<string,unknown>={environment,meaning};
  for(const k of numKeys)out[k]=x[k];
  out.last_seen_at=x.last_seen_at;out.latest_completed_at=x.latest_completed_at;
  out.p50_completed_seconds=x.p50_completed_seconds;out.p90_completed_seconds=x.p90_completed_seconds;
  results.push(out);
 }
 return {status:'OK',source:p.source,company_id:'fenix',environment:'LAB',observed_at:p.observed_at,
  read_only:true,executed:false,data_freshness:'SOURCE_READ_AT_REQUEST_TIME',active_agents_verified:null,
  active_subagents_verified:null,active_jobs_verified:null,cost_eur_measured:null,environments:results};
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
 const host=header(req.headers.host).toLowerCase(),origin=header(req.headers.origin);
 if(process.env.VERCEL_ENV!=='preview'||!HOST.test(host))return error(res,403,'PREVIEW_ONLY');
 if(req.method!=='GET')return error(res,405,'READ_ONLY');
 if(origin&&origin!=='https://'+host)return error(res,403,'ORIGIN_DENIED');
 const url=new URL(req.url||'/','https://'+host);
 if(url.searchParams.getAll('company_id').length!==1||
  url.searchParams.get('company_id')!=='fenix'||[...url.searchParams.keys()].some(k=>k!=='company_id'))
  return error(res,403,'FENIX_LAB_SCOPE_ONLY');
 const bearer=header(req.headers.authorization),apikey=header(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||apikey.length<12||apikey.length>256)
  return error(res,401,'OWNER_AUTH_REQUIRED');
 const labKey=process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY||'';
 if(labKey.length<12||labKey.length>1024)return error(res,503,'LAB_READ_KEY_NOT_BOUND');
 try{
  const response=await fetch(OWNER,{method:'GET',headers:{authorization:bearer,apikey,accept:'application/json'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
  if(response.status!==200)return error(res,403,'OWNER_DENIED');
  const payload=await response.json(),ctx=payload?.context&&typeof payload.context==='object'?payload.context:payload;
  if(ctx?.actor_code!=='CARLOS-ADMIN'||payload?.ok===false)return error(res,403,'OWNER_DENIED');
 }catch{return error(res,503,'OWNER_RESOLVER_UNAVAILABLE')}
 try{
  const response=await fetch(SOURCE,{method:'GET',cache:'no-store',redirect:'error',
   headers:{authorization:bearer,apikey:labKey,'x-cerebro-owner-prod-apikey':apikey,accept:'application/json'},
   signal:AbortSignal.timeout(9000)});
  if(response.status!==200)return error(res,503,'LAB_DEVICE_SOURCE_UNAVAILABLE');
  const body=await response.text();
  if(body.length>14000)return error(res,503,'LAB_DEVICE_RESPONSE_TOO_LARGE');
  const result=validateDeviceLiveProjection(JSON.parse(body));
  if(!result)return error(res,503,'LAB_DEVICE_SOURCE_CONTRACT_INVALID');
  return res.status(200).json(result);
 }catch{return error(res,503,'LAB_DEVICE_SOURCE_UNREACHABLE')}
}
