import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type ExecutorCoverageSource={source:'CLOUDFLARE'|'SUPABASE';
 status:'LIVE'|'NOT_CONFIGURED'|'UNAVAILABLE';visible_count:number|null;observed_at:string|null;metric_label:'WORKERS_IN_ACCOUNT'|'HISTORICAL_LAB_JOB_ROWS'};
export type ExecutorCoverage={
 status:'OK'|'PARTIAL';company_id:'fenix';observed_at:string;read_only:true;executed:false;
 inventory_sources:ExecutorCoverageSource[];profile_total:number;templates_not_instances:number;accreditable_profiles:number;
 runtime_verified_profiles:number;active_recent_profiles:number;unverified_profiles:number;
 active_executor_count:null;receipt_source_status:'NOT_CONNECTED'|'GITHUB_VERIFIED_QA_JOB'|'SUPABASE_SIGNED_SQL_QA';warning:string;
 verified_profiles:Array<{id:string;engine_id:string;state:'EXECUTION_EVIDENCED_NOT_AUTONOMOUS';proof_id:string;proof_url:string|null;observed_at:string|null;quality:'CI_TESTS_PASS_NO_TRIBUNAL'|'QA_METADATA_PROBES_PASSED_NO_TRIBUNAL'|'QA_METADATA_PROBES_FAILED_NO_TRIBUNAL';tribunal_passed:false;proof_source:'GITHUB_ACTIONS'|'SUPABASE_PGCRON'}>;
 engine_truth:{status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';historical_job_rows:number|null;
  all_engines_certified:false;autonomy_global_certified:false;
  sources:Array<{source:'JARVIS'|'BROWSER'|'CREATIVE';engine_id:string;environment:string;
   historical_jobs:number;explicit_role_rows:number;recent_metadata_rows:number;
   last_job_metadata_at:string|null;diagnosis:'NO_RECENT_METADATA'|'RECENT_BUT_ROLE_ID_UNATTRIBUTED'|'RECENT_JOBS_REQUIRE_SIGNED_RECEIPTS';
   role_activation_verified:false;engine_certified_autonomous:false}>};
 certification_gates:{status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';
  global_autonomy_certified:false;global_excellence_certified:false;cost_measured:false;
  evidence_categories:Array<{id:'QA-001'|'FACT-001'|'CONSOLE-001'|'UMS-001'|'SOCIAL_LAB_SCHEDULES';
   kind:string;full_engine_certified:false;business_quality_certified?:false;
   specific_capability_evidenced?:boolean;receipt_id?:string|null;last_execution_at?:string|null;
   signed_runs?:number;tests_passed?:number;tests_total?:number;
   historical_rows?:number;active_schedules?:number;scheduled_jobs_total?:number;
   active_schedules_succeeded_within_48h?:number;last_schedule_run_at?:string|null;
   last_schedule_status?:string|null;run_history_sampling?:string;
   business_outcome_verified?:false;agent_identity_verified?:false}>};
 lab_qa:{source:'SUPABASE_PGCRON_QA_LAB_V1';status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';signature_verified:boolean;execution_status:'SUCCEEDED'|'FAILED'|null;tests_passed:number|null;tests_total:number|null;runs_count:number|null;observed_at:string|null;recent:boolean;first_party_scheduled:true;extra_subscriptions_required:false;operational_autonomy_certified:false;excellence_certified:false};
 supervisor:{provider_health:'LIVE'|'PARTIAL';github_qa_attestation:'VERIFIED'|'NOT_VERIFIED'|'UNAVAILABLE';agent_quality:'NOT_ATTESTED_GLOBAL';excellence_verified:0;qa_metadata_check:'PASS'|'HOLD_OR_FAIL';qa_execution_attributed:boolean;qa_signature_verified:boolean;source_failure_observations:string[];last_observed_at:string};
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
   data.active_executor_count!==null||!['NOT_CONNECTED','GITHUB_VERIFIED_QA_JOB','SUPABASE_SIGNED_SQL_QA'].includes(data.receipt_source_status)||
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
    !(p.proof_source==='GITHUB_ACTIONS'&&typeof p.proof_url==='string'&&p.proof_url.startsWith('https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/')||
      p.proof_source==='SUPABASE_PGCRON'&&p.proof_url===null&&/^[a-f0-9-]{36}$/.test(p.proof_id)))||
   (data.runtime_verified_profiles===1&&!['GITHUB_VERIFIED_QA_JOB','SUPABASE_SIGNED_SQL_QA'].includes(data.receipt_source_status))||
   !data.engine_truth||!['LIVE','UNAVAILABLE','NOT_CONFIGURED'].includes(data.engine_truth.status)||
   data.engine_truth.all_engines_certified!==false||data.engine_truth.autonomy_global_certified!==false||
   !Array.isArray(data.engine_truth.sources)||data.engine_truth.sources.length>15||
   (data.engine_truth.status==='LIVE'&&(!Number.isSafeInteger(data.engine_truth.historical_job_rows)||Number(data.engine_truth.historical_job_rows)<0))||
   data.engine_truth.sources.some(x=>!['JARVIS','BROWSER','CREATIVE'].includes(x.source)||
    !['NO_RECENT_METADATA','RECENT_BUT_ROLE_ID_UNATTRIBUTED','RECENT_JOBS_REQUIRE_SIGNED_RECEIPTS'].includes(x.diagnosis)||
    x.engine_certified_autonomous!==false||x.role_activation_verified!==false||
    !Number.isSafeInteger(x.historical_jobs)||!Number.isSafeInteger(x.explicit_role_rows)||!Number.isSafeInteger(x.recent_metadata_rows))||
   !data.certification_gates||!['LIVE','UNAVAILABLE','NOT_CONFIGURED'].includes(data.certification_gates.status)||
   data.certification_gates.global_autonomy_certified!==false||
   data.certification_gates.global_excellence_certified!==false||
   data.certification_gates.cost_measured!==false||
   !Array.isArray(data.certification_gates.evidence_categories)||data.certification_gates.evidence_categories.length>5||
   (data.certification_gates.status==='LIVE'&&(
      data.certification_gates.evidence_categories.length!==5||
      new Set(data.certification_gates.evidence_categories.map(x=>x.id)).size!==5||
      !['QA-001','FACT-001','CONSOLE-001','UMS-001','SOCIAL_LAB_SCHEDULES'].every(
       id=>data.certification_gates.evidence_categories.some(x=>x.id===id))
   ))||
   data.certification_gates.evidence_categories.some(x=>x.full_engine_certified!==false||
      x.id!=='SOCIAL_LAB_SCHEDULES'&&x.business_quality_certified!==false||
      x.id==='SOCIAL_LAB_SCHEDULES'&&(
       x.agent_identity_verified!==false||x.business_outcome_verified!==false||
       !Number.isSafeInteger(x.active_schedules)||Number(x.active_schedules)<0||
       !Number.isSafeInteger(x.scheduled_jobs_total)||Number(x.scheduled_jobs_total)<Number(x.active_schedules)))||
   !data.lab_qa||data.lab_qa.source!=='SUPABASE_PGCRON_QA_LAB_V1'||
   !['LIVE','UNAVAILABLE','NOT_CONFIGURED'].includes(data.lab_qa.status)||
   data.lab_qa.operational_autonomy_certified!==false||data.lab_qa.excellence_certified!==false||
   data.lab_qa.first_party_scheduled!==true||data.lab_qa.extra_subscriptions_required!==false||
   (data.lab_qa.status==='LIVE'&&(
    data.lab_qa.signature_verified!==true||data.lab_qa.tests_total!==6||
    !Number.isSafeInteger(data.lab_qa.tests_passed)||Number(data.lab_qa.tests_passed)>6||
    !Number.isSafeInteger(data.lab_qa.runs_count)||Number(data.lab_qa.runs_count)<1))||
   (data.receipt_source_status==='SUPABASE_SIGNED_SQL_QA'&&
    (data.lab_qa.status!=='LIVE'||data.lab_qa.signature_verified!==true))||
   !data.supervisor||data.supervisor.excellence_verified!==0||
   data.supervisor.agent_quality!=='NOT_ATTESTED_GLOBAL'||
   !['LIVE','PARTIAL'].includes(data.supervisor.provider_health))return missing('unavailable');
  return {kind:'ready',data};
 }catch{return missing('unavailable')}
}
