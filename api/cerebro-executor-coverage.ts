/**
 * CEREBRO OPERATIVA · isolated owner-only provider inventory bridge.
 * This is an INVENTORY read, not proof of executing agents or subagents.
 * 30s logical refresh; never fetches secrets, logs, worker scripts or CRM rows.
 * NO PROD endpoint: only isolated Vercel Preview or exact private --skip-domain stage.
 */
import {buildCerebroAgentDirectoryV0} from './cerebro-agent-directory';
import {projectAgentEvidenceV1} from '../cerebro/universal/v0/agent-evidence-bridge-v1.mjs';
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
type Entry={source:'CLOUDFLARE'|'SUPABASE';company_id:'fenix';environment:'LAB'|'PROD';
 executor_id:string;observed_at:string;server_collector_verified:true};
type Status={source:'CLOUDFLARE'|'SUPABASE';status:'LIVE'|'NOT_CONFIGURED'|'UNAVAILABLE';
 visible_count:number|null;observed_at:string|null};
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
 return names.map((id:string)=>({source:'CLOUDFLARE',company_id:'fenix',
  environment:'LAB',executor_id:id,observed_at:stamp,server_collector_verified:true}));
}
async function collectSupabase(token:string,stamp:string):Promise<Entry[]>{
 const rows=await fetchJson('https://api.supabase.com/v1/projects/'+PROJECT+'/functions',token,9000);
 if(!Array.isArray(rows)||rows.length>500)throw Error('SB_SCHEMA');
 const names=rows.filter((x:any)=>x?.status==='ACTIVE').map((x:any)=>x?.slug);
 if(names.some((x:unknown)=>typeof x!=='string'||! /^[a-z0-9][a-z0-9_-]{2,127}$/.test(x))||
   new Set(names).size!==names.length)throw Error('SB_FUNCTIONS_INVALID');
 return names.map((id:string)=>({source:'SUPABASE',company_id:'fenix',
  environment:'PROD',executor_id:id,observed_at:stamp,server_collector_verified:true}));
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
 const collectors=[
  {source:'CLOUDFLARE' as const,secret:process.env.CEREBRO_CF_READ_TOKEN_PREVIEW,
   run:collectCloudflare},
  {source:'SUPABASE' as const,secret:process.env.CEREBRO_SUPABASE_MGMT_READ_TOKEN_PREVIEW,
   run:collectSupabase}
 ];
 const settled=await Promise.all(collectors.map(async c=>{
  if(!c.secret||c.secret.length<24)return {source:c.source,status:'NOT_CONFIGURED' as const,rows:[] as Entry[]};
  try{return {source:c.source,status:'LIVE' as const,rows:await c.run(c.secret,stamp)}}
  catch{return {source:c.source,status:'UNAVAILABLE' as const,rows:[] as Entry[]}}
 }));
 const statuses:Status[]=settled.map(x=>({source:x.source,status:x.status,
  visible_count:x.status==='LIVE'?x.rows.length:null,observed_at:x.status==='LIVE'?stamp:null}));
 // Deliberately no agent identity is inferred from a Worker/Function name or deploy state.
 // Future server-side signed receipt adapters supply receipts to this same projector.
 const inventory=settled.flatMap(x=>x.rows);
 const projection=projectAgentEvidenceV1({
  roster:buildCerebroAgentDirectoryV0(),inventories:inventory,receipts:[],
  company_id:'fenix',observed_at:stamp,authorized_sources:settled.filter(x=>x.status==='LIVE').map(x=>x.source)
 });
 return res.status(200).json({status:statuses.every(x=>x.status==='LIVE')?'OK':'PARTIAL',
  company_id:'fenix',observed_at:stamp,read_only:true,executed:false,
  inventory_sources:statuses,profile_total:projection.profile_total,
  runtime_verified_profiles:projection.runtime_verified_profiles,
  active_recent_profiles:projection.active_recent_profiles,
  unverified_profiles:projection.unverified_profiles,
  active_executor_count:null,
  receipt_source_status:'NOT_CONNECTED',
  warning:'LIVE_DEPLOYMENT_INVENTORY_NOT_AGENT_ACTIVITY; PROFILES_REQUIRE_VERIFIED_SIGNED_JOB_RECEIPTS'});
}
