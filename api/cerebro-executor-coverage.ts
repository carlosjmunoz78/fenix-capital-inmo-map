/**
 * CEREBRO OPERATIVA · isolated owner-only provider inventory bridge.
 * This is an INVENTORY read, not proof of executing agents or subagents.
 * 30s logical refresh; never fetches secrets, logs, worker scripts or CRM rows.
 * NO PROD endpoint: only isolated Vercel Preview or exact private --skip-domain stage.
 */
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>};
type Res={status:(n:number)=>Res;setHeader:(key:string,val:string)=>void;json:(x:unknown)=>void};
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const PROJECT='cluhljgonannaafpmblx';
const OWNER='https://'+PROJECT+'.supabase.co/functions/v1/fenix-app-gateway/session/context';
const HOST=/^fenix-capital-preprod-[a-z0-9]+\.vercel\.app$/;
const head=(h:H)=>Array.isArray(h)?h[0]||'':h||'';
const unavailable=(r:Res,n:number,reason:string)=>r.status(n).json({status:'UNAVAILABLE',reason,read_only:true,executed:false});
export function privateEvidenceHost(host:string,env:string|undefined,vercelUrl:string|undefined){
 return HOST.test(host)&&(
  env==='preview'||(env==='production'&&host===vercelUrl)
 );
}
const fetchJson=async(url:string,token:string,ms=7000)=>{
 const response=await fetch(url,{method:'GET',cache:'no-store',redirect:'error',
  headers:{authorization:'Bearer '+token,accept:'application/json'},signal:AbortSignal.timeout(ms)});
 if(!response.ok)throw Error('UPSTREAM_DENIED');
 const raw=await response.text();
 if(raw.length>500000)throw Error('UPSTREAM_OVERSIZE');
 return JSON.parse(raw);
};
type Entry={source:'CLOUDFLARE';company_id:'UNATTRIBUTED_ACCOUNT';
 environment:'UNKNOWN';executor_id:string;observed_at:string;server_collector_verified:true};
type Status={source:'CLOUDFLARE'|'SUPABASE';status:'LIVE'|'NOT_CONFIGURED'|'UNAVAILABLE';
 visible_count:number|null;observed_at:string|null;metric_label:'WORKERS_IN_ACCOUNT'|'HISTORICAL_LAB_JOB_ROWS'};
async function collectCloudflare(token:string,stamp:string):Promise<Entry[]>{
 const base='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts';
 const first=await fetchJson(base+'?per_page=100',token);
 if(first?.success!==true||!Array.isArray(first.result))throw Error('CF_SCHEMA');
 const pages=first.result_info?.total_pages??1;
 if(!Number.isInteger(pages)||pages<1||pages>3)throw Error('CF_PAGINATION');
 let all=first.result;
 for(let n=2;n<=pages;n++){
  const p=await fetchJson(base+'?per_page=100&page='+n,token);
  if(p?.success!==true||!Array.isArray(p.result))throw Error('CF_PAGE_SCHEMA');
  all=all.concat(p.result);
 }
 const names=all.map((x:any)=>x?.id);
 if(names.length>300||names.some((x:unknown)=>typeof x!=='string'||! /^(?:[a-z0-9][a-z0-9_-]{2,127})$/.test(x))||
    new Set(names).size!==names.length)throw Error('CF_WORKERS_INVALID');
 // Workers belong to this Cloudflare account, not necessarily the Fénix company.
 return names.map((id:string)=>({source:'CLOUDFLARE',company_id:'UNATTRIBUTED_ACCOUNT',
  environment:'UNKNOWN',executor_id:id,observed_at:stamp,server_collector_verified:true}));
}
const LAB_JOB_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-job-telemetry-lab-v0?company_id=fenix&environment=LAB';
async function collectLabJobs(ownerBearer:string,prodApikey:string,labPublishable:string):Promise<number>{
 const r=await fetch(LAB_JOB_URL,{method:'GET',redirect:'error',cache:'no-store',
  headers:{authorization:ownerBearer,apikey:labPublishable,
   'x-cerebro-owner-prod-apikey':prodApikey,accept:'application/json'},
  signal:AbortSignal.timeout(9000)});
 if(r.status!==200)throw Error('SUPABASE_LAB_TELEMETRY_DENIED');
 const raw=await r.text();
 if(raw.length>24000)throw Error('SUPABASE_LAB_TELEMETRY_OVERSIZE');
 const x=JSON.parse(raw);
 if(x?.status!=='OK'||x?.source!=='FENIX_LAB_AGENT_JOB_AGGREGATE_V1'||
    x.company_id!=='fenix'||x.environment!=='LAB'||x.read_only!==true||
    x.agent_identity_verified!==false||x.active_agent_count!==null||
    !Array.isArray(x.source_totals)||x.source_totals.length!==3)
  throw Error('SUPABASE_TELEMETRY_CONTRACT_INVALID');
 let count=0;
 for(const t of x.source_totals){
  if(!['JARVIS_WORK','BROWSER_V2','CREATIVE_V1'].includes(t.source)||
     !Number.isSafeInteger(t.total_rows)||t.total_rows<0||t.total_rows>300)throw Error('SUPABASE_TELEMETRY_COUNT_INVALID');
  count+=t.total_rows;
 }
 return count; // historical records, NOT active agents or live executing jobs
}
export const config={maxDuration:25};
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private,no-store,max-age=0');res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
 const host=head(req.headers.host).toLowerCase(),env=process.env.VERCEL_ENV;
 if(!privateEvidenceHost(host,env,process.env.VERCEL_URL))return unavailable(res,403,'PRIVATE_LAB_ONLY');
 if(req.method!=='GET')return unavailable(res,405,'READ_ONLY');
 const origin=head(req.headers.origin);
 if(origin&&origin!=='https://'+host)return unavailable(res,403,'ORIGIN_DENIED');
 let p:URLSearchParams;
 try{
  const u=new URL(req.url||'/','https://'+host);
  if(u.pathname!=='/api/cerebro-executor-coverage')return unavailable(res,404,'FIXED_ROUTE_ONLY');
  p=u.searchParams;
 }catch{return unavailable(res,400,'BAD_URL')}
 if(p.getAll('company_id').length!==1||p.get('company_id')!=='fenix'||
   [...p.keys()].some(x=>x!=='company_id'))return unavailable(res,403,'OWNER_COMPANY_ONLY');
 const auth=head(req.headers.authorization),apikey=head(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(auth)||apikey.length<12||apikey.length>256)
  return unavailable(res,401,'OWNER_SESSION_REQUIRED');
 try{
  const owner=await fetch(OWNER,{method:'GET',cache:'no-store',redirect:'error',
   headers:{authorization:auth,apikey,accept:'application/json'},signal:AbortSignal.timeout(6500)});
  if(owner.status!==200)return unavailable(res,403,'OWNER_DENIED');
  const raw=await owner.json(),context=raw?.context&&typeof raw.context==='object'?raw.context:raw;
  if(raw?.ok===false||context?.actor_code!=='CARLOS-ADMIN')
    return unavailable(res,403,'OWNER_DENIED');
 }catch{return unavailable(res,503,'OWNER_RESOLVER_UNAVAILABLE')}
 const stamp=new Date().toISOString();
 const cfKey=process.env.CEREBRO_CF_READ_TOKEN_PREVIEW||'';
 const labKey=process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY||'';
 const [cf,lab]=await Promise.all([
  (async()=>{
   if(cfKey.length<24)return{source:'CLOUDFLARE' as const,status:'NOT_CONFIGURED' as const,rows:[] as Entry[]};
   try{return{source:'CLOUDFLARE' as const,status:'LIVE' as const,rows:await collectCloudflare(cfKey,stamp)}}
   catch{return{source:'CLOUDFLARE' as const,status:'UNAVAILABLE' as const,rows:[] as Entry[]}}
  })(),
  (async()=>{
   if(labKey.length<12)return{source:'SUPABASE' as const,status:'NOT_CONFIGURED' as const,count:null as number|null};
   try{return{source:'SUPABASE' as const,status:'LIVE' as const,count:await collectLabJobs(auth,apikey,labKey)}}
   catch{return{source:'SUPABASE' as const,status:'UNAVAILABLE' as const,count:null as number|null}}
  })()
 ]);
 const statuses:Status[]=[
  {source:'CLOUDFLARE',status:cf.status,metric_label:'WORKERS_IN_ACCOUNT',
   visible_count:cf.status==='LIVE'?cf.rows.length:null,observed_at:cf.status==='LIVE'?stamp:null},
  {source:'SUPABASE',status:lab.status,metric_label:'HISTORICAL_LAB_JOB_ROWS',
   visible_count:lab.status==='LIVE'?lab.count:null,observed_at:lab.status==='LIVE'?stamp:null}
 ];
 // The separate canonical directory endpoint owns the 2506 count.
 // No receipts reach this coverage endpoint yet; DO NOT certify any profile.
 // Avoid importing Vercel's independent API route as a Node module (cold-start 500).
  return res.status(200).json({status:statuses.every(x=>x.status==='LIVE')?'OK':'PARTIAL',
  company_id:'fenix',observed_at:stamp,read_only:true,executed:false,
  inventory_sources:statuses,profile_total:2506,
  templates_not_instances:29,
  accreditable_profiles:2477,
  runtime_verified_profiles:0,
  active_recent_profiles:0,
  unverified_profiles:2477,
  active_executor_count:null,
  receipt_source_status:'NOT_CONNECTED',
  warning:'CLOUDFLARE_ACCOUNT_WORKERS_AND_SUPABASE_HISTORICAL_LAB_JOBS_ARE_NOT_ACTIVE_AGENTS; SIGNED_IDENTITY_RECEIPTS_PENDING'});
}
