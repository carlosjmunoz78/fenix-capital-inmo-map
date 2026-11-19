/**
 * CEREBRO OPERATIVA · isolated owner-only provider inventory bridge.
 * This is an INVENTORY read, not proof of executing agents or subagents.
 * 30s logical refresh; never fetches secrets, logs, worker scripts or CRM rows.
 * NO PROD endpoint: only isolated Vercel Preview or exact private --skip-domain stage.
 */
import {attestGithubQaRunV1,GITHUB_QA_WORKFLOW_ID,GITHUB_QA_HEAD} from '../cerebro/universal/v0/agent-github-run-attestor-v1.mjs';
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

type GithubClaim={state:'VERIFIED'|'NOT_VERIFIED'|'UNAVAILABLE';profile_id:'ENG-QA'|null;
 proof_id:string|null;run_url:string|null;quality:'CI_TESTS_PASS_NO_TRIBUNAL'|'NOT_ATTESTED';observed_at:string|null};
let githubCache:{at:number;result:GithubClaim}|null=null;
async function githubJson(path:string){
 const url='https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/'+path;
 const resp=await fetch(url,{method:'GET',cache:'no-store',redirect:'error',
  headers:{accept:'application/vnd.github+json','x-github-api-version':'2022-11-28',
   'user-agent':'cerebro-operativa-agent-evidence-lab-v1'},signal:AbortSignal.timeout(6000)});
 if(!resp.ok)throw Error('GITHUB_READBACK_DENIED');
 const text=await resp.text();
 if(text.length>450000)throw Error('GITHUB_READBACK_OVERSIZE');
 return JSON.parse(text);
}
async function githubQaProof(stamp:string):Promise<GithubClaim>{
 const now=Date.parse(stamp);
 if(githubCache&&now-githubCache.at<180000)return githubCache.result;
 let out:GithubClaim={state:'UNAVAILABLE',profile_id:null,proof_id:null,run_url:null,
  quality:'NOT_ATTESTED',observed_at:null};
 try{
  const first=await githubJson('actions/workflows/'+GITHUB_QA_WORKFLOW_ID+
    '/runs?branch='+encodeURIComponent(GITHUB_QA_HEAD)+'&per_page=10');
  if(!Array.isArray(first.workflow_runs)||first.workflow_runs.length>10)throw Error('GITHUB_SCHEMA_INVALID');
  out={...out,state:'NOT_VERIFIED'};
  for(const run of first.workflow_runs){
   if(run?.conclusion!=='success'||run?.status!=='completed'||
      Date.parse(run.updated_at||'')<now-86400000)continue;
   const details=await githubJson('actions/runs/'+run.id+'/jobs?per_page=100');
   if(!Array.isArray(details.jobs)||details.jobs.length>100)continue;
   const verified=attestGithubQaRunV1({run,jobs:details.jobs,now:stamp});
   if(verified){
    out={state:'VERIFIED',profile_id:'ENG-QA',proof_id:verified.receipt_id,
      run_url:verified.run_url,quality:'CI_TESTS_PASS_NO_TRIBUNAL',
      observed_at:verified.emitted_at};
    break;
   }
  }
 }catch{/* no heuristic fallback, absence is not failure of any engine */}
 githubCache={at:now,result:out};
 return out;
}


const LAB_QA_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-agent-qa-health-lab-v1?company_id=fenix&environment=LAB';
type SqlQaProof={status:'OK';source:'SUPABASE_PGCRON_QA_LAB_V1';receipt_id:string;
 observed_at:string;execution_status:'SUCCEEDED'|'FAILED';tests_passed:number;tests_total:6;
 runs_count:number;recent:boolean;signature_verified:true;read_only:true;physical_execution_evidenced:true};
async function collectSqlQa(auth:string,apikey:string,labKey:string):Promise<SqlQaProof>{
 const response=await fetch(LAB_QA_URL,{method:'GET',redirect:'error',cache:'no-store',
  headers:{authorization:auth,apikey:labKey,'x-cerebro-owner-prod-apikey':apikey,
   accept:'application/json'},signal:AbortSignal.timeout(8500)});
 if(response.status!==200)throw Error('SQL_QA_READER_DENIED');
 const body=await response.text();
 if(body.length>16000)throw Error('SQL_QA_RESPONSE_OVERSIZE');
 const q=JSON.parse(body);
 if(q.status!=='OK'||q.source!=='SUPABASE_PGCRON_QA_LAB_V1'||
    q.company_id!=='fenix'||q.environment!=='LAB'||q.engine_id!=='QA-001'||
    q.agent_role_id!=='ENG-QA'||q.read_only!==true||q.request_executed_job!==false||
    q.signature_verified!==true||q.physical_execution_evidenced!==true||
    q.operational_autonomy_certified!==false||q.excellence_certified!==false||
    q.customer_data_touched!==false||q.prod_execution_enabled!==false||
    !['SUCCEEDED','FAILED'].includes(q.execution_status)||
    typeof q.receipt_id!=='string'||!/^[a-f0-9-]{36}$/.test(q.receipt_id)||
    !Number.isFinite(Date.parse(q.observed_at))||
    !Number.isSafeInteger(q.runs_count)||q.runs_count<1||
    !Number.isSafeInteger(q.tests_passed)||q.tests_passed<0||q.tests_passed>6||
    q.tests_total!==6||typeof q.recent!=='boolean')throw Error('SQL_QA_ATTESTATION_INVALID');
 return {status:'OK',source:'SUPABASE_PGCRON_QA_LAB_V1',receipt_id:q.receipt_id,
  observed_at:q.observed_at,execution_status:q.execution_status,
  tests_passed:q.tests_passed,tests_total:6,runs_count:q.runs_count,
  recent:q.recent,signature_verified:true,read_only:true,physical_execution_evidenced:true};
}

type HistoricalEngineTruth={
 source:'JARVIS'|'BROWSER'|'CREATIVE';engine_id:string;environment:string;
 historical_jobs:number;explicit_role_rows:number;recent_metadata_rows:number;
 last_job_metadata_at:string|null;diagnosis:'NO_RECENT_METADATA'|'RECENT_BUT_ROLE_ID_UNATTRIBUTED'|'RECENT_JOBS_REQUIRE_SIGNED_RECEIPTS';
 role_activation_verified:false;engine_certified_autonomous:false
};
type EngineTruthStatus={status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';
 historical_job_rows:number|null;sources:HistoricalEngineTruth[];
 all_engines_certified:false;autonomy_global_certified:false};
const ENGINE_TRUTH_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-engine-truth-lab-v1?company_id=fenix&environment=LAB';
async function readEngineTruth(auth:string,ownerKey:string,labKey:string):Promise<EngineTruthStatus>{
 const reply=await fetch(ENGINE_TRUTH_URL,{method:'GET',cache:'no-store',redirect:'error',
  headers:{authorization:auth,apikey:labKey,'x-cerebro-owner-prod-apikey':ownerKey,accept:'application/json'},
  signal:AbortSignal.timeout(7000)});
 if(reply.status!==200)throw Error('ENGINE_SOURCE_DENIED');
 const raw=await reply.text();
 if(raw.length>28000)throw Error('ENGINE_SOURCE_OVERSIZED');
 const o=JSON.parse(raw);
 if(o.status!=='OK'||o.read_only!==true||o.executed!==false||
  o.company_id!=='fenix'||o.environment!=='LAB'||
  o.source!=='CEREBRO_LAB_ENGINE_TRUTH_AUDIT_V1'||
  o.all_engines_certified!==false||o.autonomy_global_certified!==false||
  !Number.isSafeInteger(o.historical_job_rows)||o.historical_job_rows<0||
  !Array.isArray(o.sources)||o.sources.length>15||
  o.sources.some((x:HistoricalEngineTruth)=>!['JARVIS','BROWSER','CREATIVE'].includes(x.source)||
    !['NO_RECENT_METADATA','RECENT_BUT_ROLE_ID_UNATTRIBUTED','RECENT_JOBS_REQUIRE_SIGNED_RECEIPTS'].includes(x.diagnosis)||
    x.role_activation_verified!==false||x.engine_certified_autonomous!==false||
    !Number.isSafeInteger(x.historical_jobs)||x.historical_jobs<0||
    !Number.isSafeInteger(x.explicit_role_rows)||x.explicit_role_rows<0||
    !Number.isSafeInteger(x.recent_metadata_rows)||x.recent_metadata_rows<0))throw Error('ENGINE_AUDIT_CONTRACT');
 return {status:'LIVE',historical_job_rows:o.historical_job_rows,sources:o.sources,
  all_engines_certified:false,autonomy_global_certified:false};
}

type CertEntry={id:'QA-001'|'FACT-001'|'CONSOLE-001'|'UMS-001'|'SOCIAL_LAB_SCHEDULES';
 kind:string;full_engine_certified:false;business_quality_certified?:false;
 specific_capability_evidenced?:boolean;receipt_id?:string|null;
 signed_runs?:number;tests_passed?:number;tests_total?:number;
 historical_rows?:number;active_schedules?:number;scheduled_jobs_total?:number;
 active_schedules_succeeded_within_48h?:number;last_schedule_run_at?:string|null;
 last_schedule_status?:string|null;run_history_sampling?:string;
 business_outcome_verified?:false;agent_identity_verified?:false};
type CertSource={status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';evidence_categories:CertEntry[];
 global_autonomy_certified:false;global_excellence_certified:false;cost_measured:false};
const CERT_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-certification-gates-lab-v1?company_id=fenix&environment=LAB';
async function readCertification(auth:string,ownerKey:string,labKey:string):Promise<CertSource>{
 const result=await fetch(CERT_URL,{method:'GET',cache:'no-store',redirect:'error',
  headers:{authorization:auth,apikey:labKey,'x-cerebro-owner-prod-apikey':ownerKey,accept:'application/json'},
  signal:AbortSignal.timeout(8000)});
 if(result.status!==200)throw Error('CERT_SOURCE_DENIED');
 const raw=await result.text();
 if(raw.length>26000)throw Error('CERT_SOURCE_OVERSIZE');
 const d=JSON.parse(raw);
 const ids=['QA-001','FACT-001','CONSOLE-001','UMS-001','SOCIAL_LAB_SCHEDULES'];
 if(d.status!=='OK'||d.source!=='CEREBRO_LAB_CERTIFICATION_GATES_V1'||
  d.company_id!=='fenix'||d.environment!=='LAB'||d.read_only!==true||
  d.executed!==false||d.prod_execution_enabled!==false||
  d.global_autonomy_certified!==false||d.global_excellence_certified!==false||
  d.cost_measured!==false||!Array.isArray(d.evidence_categories)||
  d.evidence_categories.length!==5||
  new Set(d.evidence_categories.map((x:CertEntry)=>x.id)).size!==5||
  !ids.every(id=>d.evidence_categories.some((x:CertEntry)=>x.id===id))||
  d.evidence_categories.some((x:CertEntry)=>
   x.full_engine_certified!==false||
   (x.id!=='SOCIAL_LAB_SCHEDULES'&&x.business_quality_certified!==false)||
   (x.id==='SOCIAL_LAB_SCHEDULES'&&(x.agent_identity_verified!==false||x.business_outcome_verified!==false||
    !Number.isSafeInteger(x.active_schedules)||!Number.isSafeInteger(x.scheduled_jobs_total)||
    Number(x.scheduled_jobs_total)<Number(x.active_schedules)))))throw Error('CERT_SOURCE_CONTRACT');
 return{status:'LIVE',evidence_categories:d.evidence_categories,
  global_autonomy_certified:false,global_excellence_certified:false,cost_measured:false};
}

type DurableSupervisor={status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';
 receipt_id:string|null;health:'EVIDENCE_OK_NOT_CERTIFIED'|'GATE_HOLD'|null;
 signed:boolean;recent:boolean;observed_at:string|null;history_count:number|null;
 gate_count:number|null;cron_job_id:77|null;global_autonomy_certified:false};
const DURABLE_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-cert-supervisor-history-lab-v1?company_id=fenix&environment=LAB';
async function readDurableSupervisor(auth:string,ownerKey:string,labKey:string):Promise<DurableSupervisor>{
 const response=await fetch(DURABLE_URL,{method:'GET',cache:'no-store',redirect:'error',
  headers:{authorization:auth,apikey:labKey,'x-cerebro-owner-prod-apikey':ownerKey,accept:'application/json'},
  signal:AbortSignal.timeout(7500)});
 if(response.status!==200)throw Error('SUPERVISOR_HISTORY_DENIED');
 const raw=await response.text();if(raw.length>12000)throw Error('SUPERVISOR_HISTORY_TOO_LARGE');
 const d=JSON.parse(raw);
 if(d.status!=='OK'||d.source!=='CEREBRO_CERT_SUPERVISOR_DURABLE_LAB_V1'||
  d.company_id!=='fenix'||d.environment!=='LAB'||d.read_only!==true||
  d.executed!==false||d.signed!==true||
  d.global_autonomy_certified!==false||d.excellence_certified!==false||
  d.prod_execution_enabled!==false||d.cost_measured!==false||
  d.actual_engine_promotion!==false||d.cron_job_id!==77||
  d.gate_count!==5||!Number.isSafeInteger(d.history_count)||d.history_count<1||
  !['EVIDENCE_OK_NOT_CERTIFIED','GATE_HOLD'].includes(d.health)||
  typeof d.recent!=='boolean'||!Number.isFinite(Date.parse(d.observed_at))||
  typeof d.receipt_id!=='string'||!/^[a-f0-9-]{36}$/.test(d.receipt_id))
   throw Error('SUPERVISOR_HISTORY_INVALID');
 return {status:'LIVE',receipt_id:d.receipt_id,health:d.health,
  signed:true,recent:d.recent,observed_at:d.observed_at,history_count:d.history_count,
  gate_count:5,cron_job_id:77,global_autonomy_certified:false};
}

type DispatchSample={
 service:'jarvis-work-dispatch-v1-preprod'|'cerebro-browser-work-total-dispatch-v1-preprod'|
  'cerebro-creative-dispatch-v1'|'cerebro-ums-production-dispatch-v1';
 engine_id:'CONSOLE-001'|'FACT-001'|'UMS-001';
 last_checked_at:string;http_status:number|null;
 health_state:'HEALTH_ENDPOINT_OK'|'HEALTH_ENDPOINT_FAILED'|'NO_RESPONSE';
 signature_verified:true;recent:boolean;runtime_execution_verified:false;autonomy_certified:false
};
type DispatchHealth={
 status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';
 health_status:'HEALTH_ENDPOINTS_RESPOND'|'DEGRADED_OR_NOT_CHECKED'|null;
 signed_samples:number;healthy_endpoints:number;sources:DispatchSample[];
 full_engine_certified:false;legacy_jobs_executed:false;github_oidc_required:true
};
const DISPATCH_HEALTH_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-dispatch-health-lab-v1?company_id=fenix&environment=LAB';
const DISPATCH_HEALTH_NAMES=new Set([
 'jarvis-work-dispatch-v1-preprod',
 'cerebro-browser-work-total-dispatch-v1-preprod',
 'cerebro-creative-dispatch-v1',
 'cerebro-ums-production-dispatch-v1'
]);
async function readDispatchHealth(auth:string,ownerKey:string,labKey:string):Promise<DispatchHealth>{
 const r=await fetch(DISPATCH_HEALTH_URL,{method:'GET',cache:'no-store',redirect:'error',
  headers:{authorization:auth,apikey:labKey,'x-cerebro-owner-prod-apikey':ownerKey,accept:'application/json'},
  signal:AbortSignal.timeout(6500)});
 if(r.status!==200)throw Error('DISPATCH_HEALTH_DENIED');
 const txt=await r.text();
 if(txt.length>14000)throw Error('DISPATCH_HEALTH_TOO_LARGE');
 const d=JSON.parse(txt);
 if(d.source!=='CEREBRO_LAB_DISPATCH_HEALTH_SIGNED_V1'||
  !['HEALTH_ENDPOINTS_RESPOND','DEGRADED_OR_NOT_CHECKED'].includes(d.status)||
  d.company_id!=='fenix'||d.environment!=='LAB'||
  d.read_only!==true||d.executed!==false||
  d.legacy_jobs_executed!==false||d.full_engine_certified!==false||
  d.prod_execution_enabled!==false||d.certifies_original_executors!==false||
  d.github_actions_required_to_execute_original_workers!==true||
  d.signed_by_private_db_key!==true||
  d.runner_capability!=='HTTP_HEALTH_ONLY'||
  !Number.isSafeInteger(d.signed_samples)||d.signed_samples<0||d.signed_samples>4||
  !Number.isSafeInteger(d.healthy_endpoints)||d.healthy_endpoints<0||
  d.healthy_endpoints>d.signed_samples||
  !Array.isArray(d.sources)||d.sources.length!==d.signed_samples||
  new Set(d.sources.map((x:DispatchSample)=>x.service)).size!==d.sources.length||
  d.sources.some((x:DispatchSample)=>
   !DISPATCH_HEALTH_NAMES.has(x.service)||
   !['CONSOLE-001','FACT-001','UMS-001'].includes(x.engine_id)||
   !['HEALTH_ENDPOINT_OK','HEALTH_ENDPOINT_FAILED','NO_RESPONSE'].includes(x.health_state)||
   x.signature_verified!==true||x.runtime_execution_verified!==false||
   x.autonomy_certified!==false||typeof x.recent!=='boolean'||
   !Number.isFinite(Date.parse(x.last_checked_at)))||
  (d.status==='HEALTH_ENDPOINTS_RESPOND'&&
   (d.healthy_endpoints!==4||d.sources.length!==4||
    d.sources.some((x:DispatchSample)=>x.health_state!=='HEALTH_ENDPOINT_OK'||!x.recent))))
   throw Error('DISPATCH_HEALTH_CONTRACT');
 return {status:'LIVE',health_status:d.status,signed_samples:d.signed_samples,
  healthy_endpoints:d.healthy_endpoints,sources:d.sources,
  full_engine_certified:false,legacy_jobs_executed:false,github_oidc_required:true};
}

type ConsoleJobProof={status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';
 execution_state:'SUCCEEDED'|null;job_id:string|null;
 observed_commit_sha:string|null;last_execution_at:string|null;completed_job_count:number|null;
 signature_verified:boolean;specific_capability_evidenced:boolean;
 legacy_worker_executed:false;full_engine_certified:false;agent_role_identity_verified:false};
const CONSOLE_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-console-readonly-lab-v1?company_id=fenix&environment=LAB';
async function readConsoleProof(auth:string,ownerKey:string,labKey:string):Promise<ConsoleJobProof>{
 const r=await fetch(CONSOLE_URL,{method:'GET',cache:'no-store',redirect:'error',
  headers:{authorization:auth,apikey:labKey,'x-cerebro-owner-prod-apikey':ownerKey,accept:'application/json'},
  signal:AbortSignal.timeout(7000)});
 if(r.status!==200)throw Error('CONSOLE_READER_DENIED');
 const raw=await r.text();if(raw.length>12000)throw Error('CONSOLE_READER_TOO_LARGE');
 const d=JSON.parse(raw);
 if(d.status!=='OK'||d.source!=='CEREBRO_CONSOLE_READONLY_LAB_V1'||
  d.company_id!=='fenix'||d.environment!=='LAB'||d.engine_id!=='CONSOLE-001'||
  d.capability_id!=='repo.sandbox.public.readonly.v0'||
  d.repository!=='carlosjmunoz78/fenix-capital-inmo-map'||d.branch!=='main'||
  d.read_only!==true||d.executed_job!==true||d.github_actions_used!==false||
  d.original_dispatcher_unchanged!==true||d.legacy_worker_executed!==false||
  d.agent_role_identity_verified!==false||d.full_engine_certified!==false||
  d.autonomy_certified!==false||d.external_actions_executed!==false||
  d.prod_execution_enabled!==false||d.marginal_cost_eur_measured!==false||
  d.specific_capability_evidenced!==true||d.signed!==true||
  d.execution_state!=='SUCCEEDED'||d.http_status!==200||
  !Number.isSafeInteger(d.completed_job_count)||d.completed_job_count<1||
  typeof d.job_id!=='string'||!/^[a-f0-9-]{36}$/.test(d.job_id)||
  !/^[a-f0-9]{40}$/.test(d.observed_commit_sha||'')||
  !Number.isFinite(Date.parse(d.last_execution_at)))
   throw Error('CONSOLE_PROOF_CONTRACT');
 return {status:'LIVE',execution_state:'SUCCEEDED',job_id:d.job_id,
  observed_commit_sha:d.observed_commit_sha,last_execution_at:d.last_execution_at,
  completed_job_count:d.completed_job_count,signature_verified:true,
  specific_capability_evidenced:true,legacy_worker_executed:false,
  full_engine_certified:false,agent_role_identity_verified:false};
}

type CreativeHoldProof={status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';engines:Array<{
 engine_id:'FACT-001'|'UMS-001';historical_jobs:number;jobs_on_hold:number;historical_succeeded:number;
 safe_to_resume:false;autonomy_certified:false;blockers:Array<{state:'HOLD'|'SUCCEEDED';reason_code:string;count:number}>
 }>;owner_rejection_override:false;paid_generation_enabled:false;all_certified:false};
const HOLD_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-creative-hold-gates-lab-v1?company_id=fenix&environment=LAB';
async function readCreativeHolds(auth:string,key:string,labKey:string):Promise<CreativeHoldProof>{
 const r=await fetch(HOLD_URL,{method:'GET',redirect:'error',cache:'no-store',
  headers:{authorization:auth,apikey:labKey,'x-cerebro-owner-prod-apikey':key,accept:'application/json'},
  signal:AbortSignal.timeout(6500)});
 if(r.status!==200)throw Error('CREATIVE_HOLD_GATE_DENIED');
 const body=await r.text();if(body.length>16000)throw Error('CREATIVE_HOLD_OVERSIZE');
 const x=JSON.parse(body);
 if(x.status!=='OK'||x.source!=='CEREBRO_LAB_CREATIVE_HOLD_GATES_V1'||
  x.company_id!=='fenix'||x.environment!=='LAB'||x.read_only!==true||x.executed!==false||
  x.paid_generation_enabled!==false||x.owner_rejection_override!==false||
  x.external_actions_executed!==false||x.prod_execution_enabled!==false||
  x.all_certified!==false||!Array.isArray(x.engines)||x.engines.length!==2||
  !['FACT-001','UMS-001'].every(id=>x.engines.some((e:CreativeHoldProof['engines'][number])=>e.engine_id===id))||
  x.engines.some((e:CreativeHoldProof['engines'][number])=>e.safe_to_resume!==false||
    e.autonomy_certified!==false||!Number.isSafeInteger(e.historical_jobs)||
    !Number.isSafeInteger(e.jobs_on_hold)||!Number.isSafeInteger(e.historical_succeeded)||
    e.historical_jobs<e.jobs_on_hold+e.historical_succeeded||
    !Array.isArray(e.blockers)||e.blockers.some(b=>!['HOLD','SUCCEEDED'].includes(b.state)||
      typeof b.reason_code!=='string'||b.reason_code.length>100||
      !Number.isSafeInteger(b.count)||b.count<0)))throw Error('CREATIVE_HOLD_GATE_CONTRACT');
 return{status:'LIVE',engines:x.engines,owner_rejection_override:false,
  paid_generation_enabled:false,all_certified:false};
}

/**
 * FACT-001 P5 is a DIFFERENT existing runtime scope: company_id "fenix-capital".
 * Do not silently count its jobs as canonical company_id "fenix" or as agents.
 * This request is a fixed aggregate SELECT, with no identifiers or payload rows.
 */
type FactCloudRecovery={
 status:'LIVE'|'UNAVAILABLE'|'NOT_CONFIGURED';
 source:'CLOUDFLARE_D1_FACT_RECOVERY_LAB';
 d1_runtime_company_id:'fenix-capital';canonical_registry_company_id:'fenix';
 company_id_match:false;
 runner_ticks:number|null;runner_completed:number|null;latest_runner_tick_at:string|null;
 p5_completed:number|null;latest_p5_completed_at:string|null;
 last_24h_nonempty_ticks:number|null;
 results_are_signed_agent_receipts:false;full_engine_certified:false;
 legacy_jobs_reactivated:false;external_action_triggered:false;
};
async function readFactCloudRecovery(token:string):Promise<FactCloudRecovery>{
 const url='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+
  '/d1/database/1305f791-7c44-47f9-946b-f330a09c88aa/query';
 const sql="SELECT "+
  "(SELECT COUNT(*) FROM fact001_runner_ticks_v1) AS runner_ticks,"+
  "(SELECT COUNT(*) FROM fact001_runner_ticks_v1 WHERE outcome='COMPLETED') AS runner_completed,"+
  "(SELECT MAX(started_at) FROM fact001_runner_ticks_v1) AS latest_runner_tick_at,"+
  "(SELECT COUNT(*) FROM fact001_p5_jobs_v1 WHERE company_id='fenix-capital' "+
  "AND engine_id='FACT-001' AND environment='LAB' AND "+
  "operation='providers.five.inventory.read' AND state='COMPLETED') AS p5_completed,"+
  "(SELECT MAX(completed_at_ms) FROM fact001_p5_jobs_v1 WHERE company_id='fenix-capital' "+
  "AND engine_id='FACT-001' AND environment='LAB' AND "+
  "operation='providers.five.inventory.read' AND state='COMPLETED') AS latest_p5_completed_ms,"+
  "(SELECT COUNT(*) FROM fact001_runner_ticks_v1 WHERE outcome<>'EMPTY' "+
  "AND julianday(started_at)>=julianday('now')-1) AS last_24h_nonempty_ticks";
 const r=await fetch(url,{method:'POST',cache:'no-store',redirect:'error',
  headers:{authorization:'Bearer '+token,'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify({sql}),signal:AbortSignal.timeout(7500)});
 if(r.status!==200)throw Error('FACT_D1_READ_DENIED');
 const raw=await r.text();if(raw.length>18000)throw Error('FACT_D1_OVERSIZE');
 const out=JSON.parse(raw);
 if(out.success!==true||!Array.isArray(out.result)||out.result.length!==1||
    !Array.isArray(out.result[0]?.results)||out.result[0].results.length!==1)
    throw Error('FACT_D1_RESULT_INVALID');
 const o=out.result[0].results[0];
 for(const field of ['runner_ticks','runner_completed','p5_completed','last_24h_nonempty_ticks']){
  if(!Number.isSafeInteger(o[field])||o[field]<0||o[field]>10000000)
   throw Error('FACT_D1_AGGREGATE_INVALID');
 }
 if(o.runner_completed>o.runner_ticks||o.last_24h_nonempty_ticks>o.runner_ticks||
   typeof o.latest_runner_tick_at!=='string'||
   !Number.isFinite(Date.parse(o.latest_runner_tick_at))||
   !Number.isSafeInteger(o.latest_p5_completed_ms)||o.latest_p5_completed_ms<0)
   throw Error('FACT_D1_DATES_INVALID');
 return {status:'LIVE',source:'CLOUDFLARE_D1_FACT_RECOVERY_LAB',
  d1_runtime_company_id:'fenix-capital',canonical_registry_company_id:'fenix',
  company_id_match:false,
  runner_ticks:o.runner_ticks,runner_completed:o.runner_completed,
  latest_runner_tick_at:o.latest_runner_tick_at,p5_completed:o.p5_completed,
  latest_p5_completed_at:new Date(o.latest_p5_completed_ms).toISOString(),
  last_24h_nonempty_ticks:o.last_24h_nonempty_ticks,
  results_are_signed_agent_receipts:false,full_engine_certified:false,
  legacy_jobs_reactivated:false,external_action_triggered:false};
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
 const [cf,lab,github,qa,truth,cert,durable,dispatch,consoleProof,creativeHolds,factRecovery]=await Promise.all([
  (async()=>{
   if(cfKey.length<24)return{source:'CLOUDFLARE' as const,status:'NOT_CONFIGURED' as const,rows:[] as Entry[]};
   try{return{source:'CLOUDFLARE' as const,status:'LIVE' as const,rows:await collectCloudflare(cfKey,stamp)}}
   catch{return{source:'CLOUDFLARE' as const,status:'UNAVAILABLE' as const,rows:[] as Entry[]}}
  })(),
  (async()=>{
   if(labKey.length<12)return{source:'SUPABASE' as const,status:'NOT_CONFIGURED' as const,count:null as number|null};
   try{return{source:'SUPABASE' as const,status:'LIVE' as const,count:await collectLabJobs(auth,apikey,labKey)}}
   catch{return{source:'SUPABASE' as const,status:'UNAVAILABLE' as const,count:null as number|null}}
  })(),
  githubQaProof(stamp),
  (async()=>{
   if(labKey.length<12)return{status:'NOT_CONFIGURED' as const,proof:null as SqlQaProof|null};
   try{return{status:'LIVE' as const,proof:await collectSqlQa(auth,apikey,labKey)}}
   catch{return{status:'UNAVAILABLE' as const,proof:null as SqlQaProof|null}}
  })(),
  (async():Promise<EngineTruthStatus>=>{
   if(labKey.length<12)return{status:'NOT_CONFIGURED',historical_job_rows:null,sources:[],
    all_engines_certified:false,autonomy_global_certified:false};
   try{return await readEngineTruth(auth,apikey,labKey)}catch{
    return{status:'UNAVAILABLE',historical_job_rows:null,sources:[],
     all_engines_certified:false,autonomy_global_certified:false};
   }
  })(),
  (async():Promise<CertSource>=>{
   if(labKey.length<12)return{status:'NOT_CONFIGURED',evidence_categories:[],
    global_autonomy_certified:false,global_excellence_certified:false,cost_measured:false};
   try{return await readCertification(auth,apikey,labKey)}catch{
    return{status:'UNAVAILABLE',evidence_categories:[],
     global_autonomy_certified:false,global_excellence_certified:false,cost_measured:false};
   }
  })(),
  (async():Promise<DurableSupervisor>=>{
   if(labKey.length<12)return{status:'NOT_CONFIGURED',receipt_id:null,
    health:null,signed:false,recent:false,observed_at:null,history_count:null,gate_count:null,
    cron_job_id:null,global_autonomy_certified:false};
   try{return await readDurableSupervisor(auth,apikey,labKey)}catch{
    return{status:'UNAVAILABLE',receipt_id:null,
     health:null,signed:false,recent:false,observed_at:null,history_count:null,gate_count:null,
     cron_job_id:null,global_autonomy_certified:false};
   }
  })(),
  (async():Promise<DispatchHealth>=>{
   if(labKey.length<12)return{status:'NOT_CONFIGURED',health_status:null,
    signed_samples:0,healthy_endpoints:0,sources:[],full_engine_certified:false,
    legacy_jobs_executed:false,github_oidc_required:true};
   try{return await readDispatchHealth(auth,apikey,labKey)}
   catch{return{status:'UNAVAILABLE',health_status:null,signed_samples:0,
    healthy_endpoints:0,sources:[],full_engine_certified:false,
    legacy_jobs_executed:false,github_oidc_required:true}}
  })(),
  (async():Promise<ConsoleJobProof>=>{
   if(labKey.length<12)return{status:'NOT_CONFIGURED',execution_state:null,job_id:null,
    observed_commit_sha:null,last_execution_at:null,completed_job_count:null,
    signature_verified:false,specific_capability_evidenced:false,legacy_worker_executed:false,
    full_engine_certified:false,agent_role_identity_verified:false};
   try{return await readConsoleProof(auth,apikey,labKey)}
   catch{return{status:'UNAVAILABLE',execution_state:null,job_id:null,
    observed_commit_sha:null,last_execution_at:null,completed_job_count:null,
    signature_verified:false,specific_capability_evidenced:false,legacy_worker_executed:false,
    full_engine_certified:false,agent_role_identity_verified:false}}
  })(),
  (async():Promise<CreativeHoldProof>=>{
   if(labKey.length<12)return{status:'NOT_CONFIGURED',engines:[],
    owner_rejection_override:false,paid_generation_enabled:false,all_certified:false};
   try{return await readCreativeHolds(auth,apikey,labKey)}
   catch{return{status:'UNAVAILABLE',engines:[],
    owner_rejection_override:false,paid_generation_enabled:false,all_certified:false}}
  })(),
  (async():Promise<FactCloudRecovery>=>{
   const empty:FactCloudRecovery={status:'NOT_CONFIGURED',source:'CLOUDFLARE_D1_FACT_RECOVERY_LAB',
    d1_runtime_company_id:'fenix-capital',canonical_registry_company_id:'fenix',company_id_match:false,
    runner_ticks:null,runner_completed:null,latest_runner_tick_at:null,p5_completed:null,
    latest_p5_completed_at:null,last_24h_nonempty_ticks:null,results_are_signed_agent_receipts:false,
    full_engine_certified:false,legacy_jobs_reactivated:false,external_action_triggered:false};
   // Opt-in only. The existing CF Workers-read token may lack D1 Query scope;
   // never retry a denied query every 30 seconds or expand permissions here.
   if(cfKey.length<24||process.env.CEREBRO_CF_D1_READ_ENABLED!=='true')return empty;
   try{return await readFactCloudRecovery(cfKey)}
   catch{return{...empty,status:'UNAVAILABLE'}}
  })()
 ]);
 const statuses:Status[]=[
  {source:'CLOUDFLARE',status:cf.status,metric_label:'WORKERS_IN_ACCOUNT',
   visible_count:cf.status==='LIVE'?cf.rows.length:null,observed_at:cf.status==='LIVE'?stamp:null},
  {source:'SUPABASE',status:lab.status,metric_label:'HISTORICAL_LAB_JOB_ROWS',
   visible_count:lab.status==='LIVE'?lab.count:null,observed_at:lab.status==='LIVE'?stamp:null}
 ];
 const physicalQa=qa.status==='LIVE'&&qa.proof?.signature_verified===true;
 const credited=physicalQa||github.state==='VERIFIED';
 const qaSuccessful=physicalQa&&qa.proof?.execution_status==='SUCCEEDED'&&qa.proof.tests_passed===6;
 const verifiedProfiles=physicalQa?[{
  id:'ENG-QA',engine_id:'QA-001',state:'EXECUTION_EVIDENCED_NOT_AUTONOMOUS' as const,
  proof_id:qa.proof!.receipt_id,proof_url:null,observed_at:qa.proof!.observed_at,
  quality:qaSuccessful?'QA_METADATA_PROBES_PASSED_NO_TRIBUNAL':'QA_METADATA_PROBES_FAILED_NO_TRIBUNAL',
  tribunal_passed:false,proof_source:'SUPABASE_PGCRON' as const
 }]:github.state==='VERIFIED'?[{
  id:'ENG-QA',engine_id:'QA-001',state:'EXECUTION_EVIDENCED_NOT_AUTONOMOUS' as const,
  proof_id:github.proof_id,proof_url:github.run_url,observed_at:github.observed_at,
  quality:github.quality,tribunal_passed:false,proof_source:'GITHUB_ACTIONS' as const
 }]:[];
 // The separate canonical directory endpoint owns the 2506 count.
 // Only the explicitly attested ENG-QA first-party GitHub job can earn historical execution here.
 // Avoid importing Vercel's independent API route as a Node module (cold-start 500).
  return res.status(200).json({status:statuses.every(x=>x.status==='LIVE')?'OK':'PARTIAL',
  company_id:'fenix',observed_at:stamp,read_only:true,executed:false,
  inventory_sources:statuses,profile_total:2506,
  templates_not_instances:29,
  accreditable_profiles:2477,
  runtime_verified_profiles:credited?1:0,
  active_recent_profiles:0,
  unverified_profiles:credited?2476:2477,
  active_executor_count:null,
  receipt_source_status:physicalQa?'SUPABASE_SIGNED_SQL_QA':github.state==='VERIFIED'?'GITHUB_VERIFIED_QA_JOB':'NOT_CONNECTED',
  verified_profiles:verifiedProfiles,
  engine_truth:truth,
  certification_gates:cert,
  durable_supervisor:durable,
  dispatch_health:dispatch,
  console_job:consoleProof,
  creative_hold_gates:creativeHolds,
  fact_p5_recovery:factRecovery,
  lab_qa:{
   source:'SUPABASE_PGCRON_QA_LAB_V1',
   status:qa.status,
   signature_verified:physicalQa,
   execution_status:qa.proof?.execution_status??null,
   tests_passed:qa.proof?.tests_passed??null,
   tests_total:qa.proof?.tests_total??null,
   runs_count:qa.proof?.runs_count??null,
   observed_at:qa.proof?.observed_at??null,
   recent:qa.proof?.recent??false,
   first_party_scheduled:true,
   extra_subscriptions_required:false,
   operational_autonomy_certified:false,
   excellence_certified:false
  },
  supervisor:{
   provider_health:statuses.every(v=>v.status==='LIVE')?'LIVE':'PARTIAL',
   github_qa_attestation:github.state,
   agent_quality:'NOT_ATTESTED_GLOBAL',excellence_verified:0,
   qa_metadata_check:qaSuccessful?'PASS':'HOLD_OR_FAIL',
   qa_execution_attributed:physicalQa,
   qa_signature_verified:physicalQa,
   source_failure_observations:[
    ...statuses.filter(v=>v.status==='UNAVAILABLE').map(v=>v.source),
    ...(qa.status==='UNAVAILABLE'?['SUPABASE_SQL_QA']:[]),
    ...(truth.status==='UNAVAILABLE'?['SUPABASE_ENGINE_TRUTH']:[]),
    ...(cert.status==='UNAVAILABLE'?['SUPABASE_CERTIFICATION_GATES']:[]),
    ...(durable.status==='UNAVAILABLE'?['SUPABASE_CERT_SUPERVISOR_HISTORY']:[]),
    ...(dispatch.status==='UNAVAILABLE'?['SUPABASE_DISPATCH_HEALTH']:[]),
    ...(consoleProof.status==='UNAVAILABLE'?['SUPABASE_CONSOLE_PUBLIC_READONLY']:[]),
    ...(creativeHolds.status==='UNAVAILABLE'?['SUPABASE_CREATIVE_HOLD_GATES']:[]),
    ...(factRecovery.status==='UNAVAILABLE'?['CLOUDFLARE_FACT_D1_READ_SCOPE']:[])
   ],
   last_observed_at:stamp
  },
  warning:'QA-001_SQL_CRON_PROVES_ONLY_ONE_SIGNED_LAB_EXECUTION_CAPABILITY; OTHER_2476_PROFILES_REQUIRE_OWN_RUNTIME_RECEIPTS_AND_TRIBUNAL'});
}
