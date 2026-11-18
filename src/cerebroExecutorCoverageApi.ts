import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type ExecutorCoverageSource={source:'CLOUDFLARE'|'SUPABASE';
 status:'LIVE'|'NOT_CONFIGURED'|'UNAVAILABLE';visible_count:number|null;observed_at:string|null;metric_label:'WORKERS_IN_ACCOUNT'|'HISTORICAL_LAB_JOB_ROWS'};
export type ExecutorCoverage={
 status:'OK'|'PARTIAL';company_id:'fenix';observed_at:string;read_only:true;executed:false;
 inventory_sources:ExecutorCoverageSource[];profile_total:number;templates_not_instances:number;accreditable_profiles:number;
 runtime_verified_profiles:number;active_recent_profiles:number;unverified_profiles:number;
 active_executor_count:null;receipt_source_status:'NOT_CONNECTED';warning:string;
};
export type ExecutorCoverageResult={kind:'ready'|'unavailable'|'denied';data:ExecutorCoverage|null};
export async function readExecutorCoverage(signal?:AbortSignal):Promise<ExecutorCoverageResult>{
 const missing=(kind:'unavailable'|'denied'):ExecutorCoverageResult=>({kind,data:null});
 if(typeof window==='undefined')return missing('denied');
 const host=window.location.hostname;
 if(!/^fenix-capital-preprod-[a-z0-9]+\.vercel\.app$/.test(host))return missing('denied');
 try{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return missing('denied');
  const r=await fetch('/api/cerebro-executor-coverage?company_id=fenix',{
   method:'GET',cache:'no-store',signal,headers:{
    authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,accept:'application/json'
   }});
  if(r.status===401||r.status===403)return missing('denied');
  if(r.status!==200)return missing('unavailable');
  const data=await r.json() as ExecutorCoverage;
  const sources=data.inventory_sources;
  if(!['OK','PARTIAL'].includes(data.status)||data.company_id!=='fenix'||
   data.read_only!==true||data.executed!==false||
   data.active_executor_count!==null||data.receipt_source_status!=='NOT_CONNECTED'||
   !Number.isFinite(Date.parse(data.observed_at))||!Array.isArray(sources)||sources.length!==2||
   sources.some(s=>!['CLOUDFLARE','SUPABASE'].includes(s.source)||
    (s.source==='CLOUDFLARE'&&s.metric_label!=='WORKERS_IN_ACCOUNT')||
    (s.source==='SUPABASE'&&s.metric_label!=='HISTORICAL_LAB_JOB_ROWS')||
    !['LIVE','NOT_CONFIGURED','UNAVAILABLE'].includes(s.status)||
    (s.status==='LIVE'&&(!Number.isSafeInteger(s.visible_count)||Number(s.visible_count)<0))||
    (s.status!=='LIVE'&&s.visible_count!==null))||
   !Number.isSafeInteger(data.profile_total)||data.profile_total!==2506||
   data.templates_not_instances!==29||data.accreditable_profiles!==2477||
   data.runtime_verified_profiles!==0||data.active_recent_profiles!==0||
   data.unverified_profiles!==data.accreditable_profiles)return missing('unavailable');
  return {kind:'ready',data};
 }catch{return missing('unavailable')}
}
