import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type ExecutorCoverageSource={source:'CLOUDFLARE'|'SUPABASE';
 status:'LIVE'|'NOT_CONFIGURED'|'UNAVAILABLE';visible_count:number|null;observed_at:string|null;metric_label:'WORKERS_IN_ACCOUNT'|'HISTORICAL_LAB_JOB_ROWS'};
export type ExecutorCoverage={
 status:'OK'|'PARTIAL';company_id:'fenix';observed_at:string;read_only:true;executed:false;
 inventory_sources:ExecutorCoverageSource[];profile_total:number;templates_not_instances:number;accreditable_profiles:number;
 runtime_verified_profiles:number;active_recent_profiles:number;unverified_profiles:number;
 active_executor_count:null;receipt_source_status:'NOT_CONNECTED'|'GITHUB_VERIFIED_QA_JOB';warning:string;
 verified_profiles:Array<{id:string;engine_id:string;state:'EXECUTION_EVIDENCED_NOT_AUTONOMOUS';proof_id:string;proof_url:string;observed_at:string;quality:'CI_TESTS_PASS_NO_TRIBUNAL';tribunal_passed:false}>;
 supervisor:{provider_health:'LIVE'|'PARTIAL';github_qa_attestation:'VERIFIED'|'NOT_VERIFIED'|'UNAVAILABLE';agent_quality:'NOT_ATTESTED_GLOBAL';excellence_verified:0;source_failure_observations:string[];last_observed_at:string};
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
   data.active_executor_count!==null||!['NOT_CONNECTED','GITHUB_VERIFIED_QA_JOB'].includes(data.receipt_source_status)||
   !Number.isFinite(Date.parse(data.observed_at))||!Array.isArray(sources)||sources.length!==2||
   sources.some(s=>!['CLOUDFLARE','SUPABASE'].includes(s.source)||
    (s.source==='CLOUDFLARE'&&s.metric_label!=='WORKERS_IN_ACCOUNT')||
    (s.source==='SUPABASE'&&s.metric_label!=='HISTORICAL_LAB_JOB_ROWS')||
    !['LIVE','NOT_CONFIGURED','UNAVAILABLE'].includes(s.status)||
    (s.status==='LIVE'&&(!Number.isSafeInteger(s.visible_count)||Number(s.visible_count)<0))||
    (s.status!=='LIVE'&&s.visible_count!==null))||
   !Number.isSafeInteger(data.profile_total)||data.profile_total!==2506||
   data.templates_not_instances!==29||data.accreditable_profiles!==2477||
   data.active_recent_profiles!==0||
   !Number.isSafeInteger(data.runtime_verified_profiles)||data.runtime_verified_profiles>1||
   data.runtime_verified_profiles<0||
   data.unverified_profiles!==data.accreditable_profiles-data.runtime_verified_profiles||
   !Array.isArray(data.verified_profiles)||data.verified_profiles.length!==data.runtime_verified_profiles||
   data.verified_profiles.some(p=>p.id!=='ENG-QA'||p.engine_id!=='QA-001'||
    p.state!=='EXECUTION_EVIDENCED_NOT_AUTONOMOUS'||p.tribunal_passed!==false||
    !p.proof_url.startsWith('https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/'))||
   (data.runtime_verified_profiles===1&&data.receipt_source_status!=='GITHUB_VERIFIED_QA_JOB')||
   !data.supervisor||data.supervisor.excellence_verified!==0||
   data.supervisor.agent_quality!=='NOT_ATTESTED_GLOBAL'||
   !['LIVE','PARTIAL'].includes(data.supervisor.provider_health))return missing('unavailable');
  return {kind:'ready',data};
 }catch{return missing('unavailable')}
}
