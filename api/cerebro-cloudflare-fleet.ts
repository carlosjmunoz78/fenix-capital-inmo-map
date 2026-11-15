/**
 * Owner-only Cloudflare account fleet telemetry. GET exclusively; no deployment mutations.
 * Source is Cloudflare REST at request time, not a GitHub/JSON snapshot.
 * The account-scoped read-only token lives only in Vercel Preview environment.
 */
type Header=string|string[]|undefined;
type Request={method?:string;url?:string;headers:Record<string,Header>};
type Response={status:(s:number)=>Response;setHeader:(k:string,v:string)=>void;json:(x:unknown)=>void};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts';
const VALID=/^[a-z0-9][a-z0-9_-]{2,127}$/;
const h=(v:Header)=>Array.isArray(v)?v[0]||'':v||'';
type Script={id:string;modified_on:string|null;cron:string[]|null;cron_observed_at:string|null;scheduled:boolean|null;active_execution_verified:false;worker_agent_id:null};
type Snapshot={status:'OK'|'PARTIAL';source:'CLOUDFLARE_REST_ACCOUNT_WORKERS_LIVE_V1';account_id:string;company_id:'fenix';environment:'LAB_OBSERVATION';observed_at:string;worker_count:number;cron_verified_count:number;with_cron:number;without_cron:number;cron_unknown_count:number;active_agent_count:null;active_execution_verified:false;read_only:true;controls_enabled:false;workers:Script[]};
let cache:{at:number;data:Snapshot}|null=null;
const reject=(res:Response,code:number,reason:string)=>res.status(code).json({status:'UNAVAILABLE',reason,read_only:true,controls_enabled:false,workers:[]});
async function cf(path:string,token:string){
 const r=await fetch(path,{method:'GET',redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+token,accept:'application/json'},signal:AbortSignal.timeout(6000)});
 if(r.status!==200)throw Error('CF_HTTP_'+r.status);
 const len=Number(r.headers.get('content-length')||0);
 if(len>250000)throw Error('CF_OVERSIZED');
 const data:unknown=await r.json();
 if(!data||typeof data!=='object'||(data as {success?:unknown}).success!==true)throw Error('CF_API_DENIED');
 return data as {result:unknown;result_info?:{total_pages?:number;total_count?:number}};
}
export const config={maxDuration:30};
export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','private,no-store,max-age=0');res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 const host=h(req.headers.host).toLowerCase();
 if(process.env.VERCEL_ENV!=='preview'||!HOST.test(host))return reject(res,403,'PREVIEW_ONLY');
 if(req.method!=='GET')return reject(res,405,'READ_ONLY');
 const origin=h(req.headers.origin);
 if(origin&&origin!=='https://'+host)return reject(res,403,'ORIGIN_DENIED');
 const u=new URL(req.url||'/','https://'+host);
 if(u.pathname!=='/api/cerebro-cloudflare-fleet')return reject(res,404,'FIXED_ROUTE_ONLY');
 if([...u.searchParams.keys()].some(k=>!['company_id','refresh'].includes(k))||
  u.searchParams.get('company_id')!=='fenix'||
  (u.searchParams.has('refresh')&&u.searchParams.get('refresh')!=='1'))
  return reject(res,403,'COMPANY_SCOPE_ONLY');
 const bearer=h(req.headers.authorization),ownerKey=h(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||ownerKey.length<12||ownerKey.length>256)
  return reject(res,401,'OWNER_SESSION_REQUIRED');
 try{
  const owner=await fetch(OWNER,{method:'GET',cache:'no-store',redirect:'error',
   headers:{authorization:bearer,apikey:ownerKey,accept:'application/json'},signal:AbortSignal.timeout(7000)});
  if(owner.status!==200)return reject(res,403,'OWNER_DENIED');
  const raw=await owner.json();
  const actor=raw&&typeof raw==='object'&&typeof raw.context==='object'?raw.context:raw;
  if(!actor||actor.actor_code!=='CARLOS-ADMIN'||raw?.ok===false)return reject(res,403,'OWNER_DENIED');
 }catch{return reject(res,503,'OWNER_RESOLVER_UNAVAILABLE')}
 const token=process.env.CEREBRO_CF_READ_TOKEN_PREVIEW;
 if(!token||token.length<30||/\s/.test(token))return reject(res,503,'CLOUDFLARE_READ_TOKEN_NOT_BOUND');
 if(!u.searchParams.has('refresh')&&cache&&Date.now()-cache.at<60000)
  return res.status(200).json({...cache.data,cache_status:'HOT_60S'});
 let list;
 try{list=await cf(API+'?per_page=100',token)}catch{return reject(res,503,'CLOUDFLARE_SCRIPTS_UNAVAILABLE')}
 const initial=Array.isArray(list.result)?list.result:[];
 if(initial.length>100||!initial.every(x=>x&&typeof x.id==='string'&&VALID.test(x.id)))
  return reject(res,503,'CLOUDFLARE_SCRIPT_CONTRACT_INVALID');
 let scripts=initial;
 const pages=list.result_info?.total_pages||1;
 if(pages>3)return reject(res,503,'CLOUDFLARE_PAGINATION_OUT_OF_BOUNDS');
 try{
  for(let p=2;p<=pages;p++){
   const page=await cf(API+'?per_page=100&page='+p,token);
   if(!Array.isArray(page.result))throw Error('INVALID_PAGE');
   scripts=scripts.concat(page.result);
  }
 }catch{return reject(res,503,'CLOUDFLARE_PAGE_UNAVAILABLE')}
 if(scripts.length>300||new Set(scripts.map(x=>x.id)).size!==scripts.length||
  !scripts.every(x=>x&&typeof x.id==='string'&&VALID.test(x.id)))
  return reject(res,503,'CLOUDFLARE_SCRIPT_CONTRACT_INVALID');
 const rows:Script[]=scripts.map(x=>({id:x.id,
  modified_on:typeof x.modified_on==='string'&&Number.isFinite(Date.parse(x.modified_on))?x.modified_on:null,
  cron:null,cron_observed_at:null,scheduled:null,active_execution_verified:false,worker_agent_id:null}));
 // Bounded fan-out only for metadata; do not fetch scripts, secrets, bindings or logs.
 for(let p=0;p<rows.length;p+=8){
  await Promise.all(rows.slice(p,p+8).map(async item=>{
   try{
    const result=await cf(API+'/'+encodeURIComponent(item.id)+'/schedules',token);
    const schedule=Array.isArray(result.result)?result.result:
      result.result&&typeof result.result==='object'&&Array.isArray((result.result as {schedules?:unknown}).schedules)?
       (result.result as {schedules:unknown[]}).schedules:null;
    if(!schedule||schedule.length>12||!schedule.every(x=>x&&typeof x.cron==='string'&&x.cron.length<=80))
     return;
    item.cron=schedule.map(x=>String(x.cron));
    item.scheduled=schedule.length>0;
    item.cron_observed_at=new Date().toISOString();
   }catch{/* Unknown is null, never zero on API failure. */}
  }));
 }
 const known=rows.filter(x=>x.scheduled!==null);
 const data:Snapshot={status:known.length===rows.length?'OK':'PARTIAL',
  source:'CLOUDFLARE_REST_ACCOUNT_WORKERS_LIVE_V1',account_id:ACCOUNT,
  company_id:'fenix',environment:'LAB_OBSERVATION',observed_at:new Date().toISOString(),
  worker_count:rows.length,cron_verified_count:known.length,
  with_cron:known.filter(x=>x.scheduled).length,without_cron:known.filter(x=>!x.scheduled).length,
  cron_unknown_count:rows.length-known.length,active_agent_count:null,
  active_execution_verified:false,read_only:true,controls_enabled:false,
  workers:rows.sort((a,b)=>a.id.localeCompare(b.id))};
 cache={at:Date.now(),data};
 return res.status(200).json({...data,cache_status:'FRESH'});
}
