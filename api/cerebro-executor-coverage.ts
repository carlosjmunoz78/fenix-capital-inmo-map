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
 const [cf,lab,github,qa,truth]=await Promise.all([
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
    ...(truth.status==='UNAVAILABLE'?['SUPABASE_ENGINE_TRUTH']:[])
   ],
   last_observed_at:stamp
  },
  warning:'QA-001_SQL_CRON_PROVES_ONLY_ONE_SIGNED_LAB_EXECUTION_CAPABILITY; OTHER_2476_PROFILES_REQUIRE_OWN_RUNTIME_RECEIPTS_AND_TRIBUNAL'});
}
