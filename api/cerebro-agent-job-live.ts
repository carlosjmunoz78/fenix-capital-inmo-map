/** Preview-only owner proxy: fresh LAB job summaries, never raw IDs or payloads. */
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>};
type Res={status:(code:number)=>Res;setHeader:(key:string,value:string)=>void;json:(v:unknown)=>void};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const LAB='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-job-telemetry-lab-v0?company_id=fenix&environment=LAB';
const S=new Set(['JARVIS_WORK','BROWSER_V2','CREATIVE_V1']);
const header=(x:H)=>Array.isArray(x)?x[0]||'':x||'';
const denied=(r:Res,s:number,reason:string)=>r.status(s).json({status:'UNAVAILABLE',reason,executed:false});
const integer=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
const nullableDate=(v:unknown)=>v===null||(typeof v==='string'&&Number.isFinite(Date.parse(v)));
const fresh=(v:unknown,now:number)=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&
 Date.parse(v)<=now+60000&&now-Date.parse(v)<180000;
const cost=(v:unknown)=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100000000);
const pct=(v:unknown)=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=604800);
export function validateJobFleetLive(raw:unknown,now=Date.now()){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const x=raw as Record<string,unknown>;
 if(x.status!=='OK'||x.source!=='FENIX_LAB_AGENT_JOB_AGGREGATE_V1'||
  x.company_id!=='fenix'||x.environment!=='LAB'||x.project_id!=='hnqlnvakzaywtafeiybt'||
  x.read_only!==true||x.executed!==false||x.no_identifiers_or_payloads!==true||
  x.source_semantics!=='HISTORICAL_JOB_RECORDS_IN_LAB_PROJECT'||
  x.agent_identity_verified!==false||x.active_agent_count!==null||x.active_subagent_count!==null||
  x.active_job_count!==null||x.independent_worker_heartbeat_verified!==false||
  !fresh(x.observed_at,now)||!Array.isArray(x.groups)||x.groups.length>60||
  !Array.isArray(x.source_totals)||x.source_totals.length!==3)return null;
 const groups=[] as Record<string,unknown>[],sum=new Map([...S].map(k=>[k,0]));
 const set=new Set<string>();
 for(const rawItem of x.groups){
  if(!rawItem||typeof rawItem!=='object'||Array.isArray(rawItem))return null;
  const r=rawItem as Record<string,unknown>,source=r.source,environment=r.environment,engine=r.engine_id,status=r.status;
  if(typeof source!=='string'||!S.has(source)||!['LAB','PREPROD'].includes(String(environment))||
   typeof engine!=='string'||!/^[A-Z][A-Z0-9]{1,19}-[0-9]{3}$/.test(engine)||
   typeof status!=='string'||!/^[A-Z][A-Z_]{1,35}$/.test(status))return null;
  const key=[source,environment,engine,status].join(':');
  if(set.has(key))return null;set.add(key);
  const nums=['records','created_24h_count','heartbeat_5m_count','heartbeat_24h_count',
   'unexpired_lease_count','stale_queued_24h_count'];
  if(!nums.every(k=>integer(r[k]))||!nullableDate(r.latest_updated_at)||
   Number(r.records)<1||Number(r.created_24h_count)>Number(r.records)||
   Number(r.heartbeat_5m_count)>Number(r.heartbeat_24h_count)||
   Number(r.heartbeat_24h_count)>Number(r.records)||
   Number(r.unexpired_lease_count)>Number(r.records)||
   Number(r.stale_queued_24h_count)>Number(r.records))return null;
  const v:Record<string,unknown>={source,environment,engine_id:engine,status,latest_updated_at:r.latest_updated_at};
  for(const k of nums)v[k]=r[k];
  groups.push(v);sum.set(source,(sum.get(source)||0)+Number(r.records));
 }
 for(const t of x.source_totals){
  if(!t||typeof t!=='object'||Array.isArray(t))return null;
  const r=t as Record<string,unknown>;
  if(typeof r.source!=='string'||!S.has(r.source)||!integer(r.total_rows)||
   !nullableDate(r.last_updated_at)||r.total_rows!==sum.get(r.source))return null;
 }
 const metric=x.cost_metrics;
 if(!metric||typeof metric!=='object'||Array.isArray(metric))return null;
 const m=metric as Record<string,unknown>;
 if(m.source!=='BROWSER_WORKER_METRIC_V2'||!integer(m.total_samples)||!integer(m.cost_samples)||
  !integer(m.duration_samples)||Number(m.total_samples)>300||
  Number(m.cost_samples)>Number(m.total_samples)||Number(m.duration_samples)>Number(m.total_samples)||
  !cost(m.recorded_incremental_cost_eur)||m.overall_infrastructure_cost_eur!==null||
  !pct(m.p50_duration_seconds)||!pct(m.p90_duration_seconds)||
  (Number(m.duration_samples)===0)!==(m.p50_duration_seconds===null&&m.p90_duration_seconds===null)||
  (Number(m.cost_samples)===0)!==(m.recorded_incremental_cost_eur===null)||
  (typeof m.p50_duration_seconds==='number'&&typeof m.p90_duration_seconds==='number'&&m.p50_duration_seconds>m.p90_duration_seconds)||
  !nullableDate(m.last_observation_at)||m.warning!=='ZERO_RECORDED_INCREMENTAL_COST_IS_NOT_ZERO_PROVIDER_BILL')return null;
 const sourceTotals=[...S].map(source=>({source,total_rows:sum.get(source)||0,
  last_updated_at:groups.filter(g=>g.source===source).map(g=>g.latest_updated_at as string|null).filter(Boolean).sort().at(-1)||null}));
 const important=groups.filter(g=>['DEAD_LETTER','HOLD','QUEUED'].includes(String(g.status)))
  .map(g=>({...g,priority_suggestion:g.status==='DEAD_LETTER'?'P1_REVIEW_HISTORICAL':'P2_REVIEW_HISTORICAL'}));
 return {status:'OK',source:x.source,company_id:'fenix',environment:'LAB',observed_at:x.observed_at,
  read_only:true,executed:false,agent_identity_verified:false,active_agent_count:null,
  active_subagent_count:null,active_job_count:null,independent_worker_heartbeat_verified:false,
  source_semantics:x.source_semantics,groups,source_totals:sourceTotals,attention_groups:important,
  cost_metrics:{source:'BROWSER_WORKER_METRIC_V2',total_samples:m.total_samples,cost_samples:m.cost_samples,
   recorded_incremental_cost_eur:m.recorded_incremental_cost_eur,overall_infrastructure_cost_eur:null,
   duration_samples:m.duration_samples,p50_duration_seconds:m.p50_duration_seconds,
   p90_duration_seconds:m.p90_duration_seconds,last_observation_at:m.last_observation_at,
   warning:m.warning}};
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
 const host=header(req.headers.host).toLowerCase();
 if(process.env.VERCEL_ENV!=='preview'||!HOST.test(host))return denied(res,403,'PREVIEW_ONLY');
 if(req.method!=='GET')return denied(res,405,'READ_ONLY');
 const origin=header(req.headers.origin);
 if(origin&&origin!=='https://'+host)return denied(res,403,'ORIGIN_DENIED');
 let params:URLSearchParams;try{params=new URL(req.url||'/','https://'+host).searchParams}catch{return denied(res,400,'INVALID_URL')}
 if(params.getAll('company_id').length!==1||params.get('company_id')!=='fenix'||
  [...params.keys()].some(k=>k!=='company_id'))return denied(res,403,'FENIX_LAB_SCOPE_ONLY');
 const bearer=header(req.headers.authorization),apikey=header(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||apikey.length<12||apikey.length>256)
  return denied(res,401,'OWNER_REQUIRED');
 const labKey=process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY||'';
 if(labKey.length<12||labKey.length>1024)return denied(res,503,'LAB_KEY_NOT_BOUND');
 try{
  const auth=await fetch(OWNER,{method:'GET',headers:{authorization:bearer,apikey,accept:'application/json'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
  if(auth.status!==200)return denied(res,403,'OWNER_DENIED');
  const body=await auth.json(),ctx=body?.context&&typeof body.context==='object'?body.context:body;
  if(ctx?.actor_code!=='CARLOS-ADMIN'||body?.ok===false)return denied(res,403,'OWNER_DENIED');
 }catch{return denied(res,503,'OWNER_RESOLVER_UNAVAILABLE')}
 try{
  const r=await fetch(LAB,{method:'GET',redirect:'error',cache:'no-store',
   headers:{authorization:bearer,apikey:labKey,'x-cerebro-owner-prod-apikey':apikey,accept:'application/json'},
   signal:AbortSignal.timeout(9000)});
  if(r.status!==200)return denied(res,503,'LAB_JOB_SOURCE_UNAVAILABLE');
  const text=await r.text();
  if(text.length>24000)return denied(res,503,'SOURCE_TOO_LARGE');
  const valid=validateJobFleetLive(JSON.parse(text));
  if(!valid)return denied(res,503,'SOURCE_CONTRACT_INVALID');
  return res.status(200).json(valid);
 }catch{return denied(res,503,'LAB_JOB_SOURCE_UNREACHABLE')}
}
