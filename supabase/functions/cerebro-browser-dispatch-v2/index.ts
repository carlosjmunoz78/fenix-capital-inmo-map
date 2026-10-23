import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const U=Deno.env.get('SUPABASE_URL')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ISSUER='https://token.actions.githubusercontent.com';
const AUD='cerebro-browser-worker-v1';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const WORKFLOWS=new Set([
  '.github/workflows/cerebro-browser-orchestrator-v2.yml',
  '.github/workflows/cerebro-browser-pool-benchmark-v2.yml',
  '.github/workflows/cerebro-browser-credential-broker-v2.yml'
]);
const BRANCH='refs/heads/cerebro/browser1-phase2-orchestrator-v1';
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

function out(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function bearer(req:Request){const h=req.headers.get('authorization')??'';return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():'';}
function slot(v:unknown){const n=Number(v);if(!Number.isInteger(n)||n<1||n>32)throw new Error('INVALID_WORKER_SLOT');return n;}
function stage(v:unknown){const n=Number(v);if(!Number.isInteger(n)||![2,4,8,16].includes(n))throw new Error('INVALID_STAGE_CONCURRENCY');return n;}
function profile(company:string,identity:string,account:string){const s=(x:string)=>x.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120);return `b1-${s(company)}-${s(identity)}-${s(account)}-PREPROD`;}

async function worker(req:Request){
  const token=bearer(req);if(!token)return {ok:false,error:'GITHUB_OIDC_REQUIRED'} as const;
  try{
    const {payload}=await jwtVerify(token,JWKS,{issuer:ISSUER,audience:AUD});
    if(payload.repository!==REPO)return {ok:false,error:'GITHUB_REPOSITORY_DENIED'} as const;
    const workflowRef=String(payload.workflow_ref??'');
    if(![...WORKFLOWS].some(path=>workflowRef.includes(`${REPO}/${path}@`)))return {ok:false,error:'GITHUB_WORKFLOW_DENIED'} as const;
    if(String(payload.ref??'')!==BRANCH)return {ok:false,error:'GITHUB_REF_DENIED'} as const;
    const runId=String(payload.run_id??'unknown');
    const runAttempt=String(payload.run_attempt??'1');
    return {ok:true,run_id:runId,run_attempt:runAttempt,benchmark_id:`${runId}-a${runAttempt}`,base_worker:`github:${runId}:${runAttempt}`} as const;
  }catch(e){return {ok:false,error:'GITHUB_OIDC_INVALID',detail:e instanceof Error?e.message:String(e)} as const;}
}

async function enqueue(body:Record<string,unknown>){
  const {data,error}=await svc.rpc('cerebro_browser_enqueue_v2',body);
  if(error)throw error;
  return data;
}

async function seed(benchmarkId:string,n:number,c:number,createdBy:string){
  const departments=['seo','marketing','crm','finance','social','support','training','operations','web','sales','legal','admin','reporting','content','local-seo','automation'];
  const company=n%2===0?'captacasa-lab':'fenix';
  const department=departments[(n-1)%departments.length];
  const identity=`phase2-${benchmarkId}-${n}`;
  const account=`acct-${benchmarkId}-${n}`;
  const html=encodeURIComponent(`<html><body><h1>CEREBRO Browser Phase 2</h1><p>${benchmarkId}/${n}/${c}</p></body></html>`);
  const target=`data:text/html;charset=utf-8,${html}`;
  return await enqueue({
    p_idempotency_key:`browser1-phase2-${benchmarkId}-stage-${c}-slot-${n}`,
    p_company_id:company,p_engine_id:'CONSOLE-001',p_department_id:department,p_environment:'PREPROD',p_version:'v2',p_mode:'OBSERVE',
    p_identity_id:identity,p_account_id:account,p_browser_profile_id:profile(company,identity,account),p_credential_ref_id:null,p_target_url:target,
    p_commands:[{command:'goto',url:target},{command:'wait',ms:2500},{command:'extract_text',target:{selector:'h1'}},{command:'screenshot',label:`phase2-${c}-${n}`}],
    p_authority:{canonical_engine_ids:['CONSOLE-001'],browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true,attestation_source:'GITHUB_OIDC_VERIFIED_WORKER_V2'},engine_authority:{browser_use_authorized:true},kill_switch_enabled:true},
    p_priority:50+(n%4),p_risk:'LOW',p_capability:'browser1.observe',p_expected_cost_eur:0,p_timeout_seconds:300,p_max_attempts:2,
    p_audit_id:`browser-v2-${benchmarkId}-${n}`,p_created_by:createdBy
  });
}

async function seedCredentialCanary(benchmarkId:string,n:number,c:number,createdBy:string){
  const company='fenix';
  const identity='iam:browser-phase1-synthetic';
  const account='acct:browser-phase1-synthetic';
  const target='https://fenixcapital.es';
  return await enqueue({
    p_idempotency_key:`browser1-phase2-${benchmarkId}-stage-${c}-credential-slot-${n}`,
    p_company_id:company,p_engine_id:'CONSOLE-001',p_department_id:'security',p_environment:'PREPROD',p_version:'v2',p_mode:'OBSERVE',
    p_identity_id:identity,p_account_id:account,p_browser_profile_id:profile(company,identity,account),
    p_credential_ref_id:'credref:browser-phase1-synthetic-v1',p_target_url:target,
    p_commands:[{command:'goto',url:target},{command:'extract_text',target:{selector:'h1'}},{command:'screenshot',label:`phase2-credential-${benchmarkId}`}],
    p_authority:{canonical_engine_ids:['CONSOLE-001'],browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true,attestation_source:'GITHUB_OIDC_VERIFIED_WORKER_V2'},engine_authority:{browser_use_authorized:true},kill_switch_enabled:true},
    p_priority:90,p_risk:'LOW',p_capability:'browser1.observe',p_expected_cost_eur:0,p_timeout_seconds:300,p_max_attempts:1,
    p_audit_id:`browser-v2-credential-${benchmarkId}-${n}`,p_created_by:createdBy
  });
}

Deno.serve(async req=>{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)??'';
  if(req.method==='GET'&&route==='health')return out(200,{ok:true,service:'cerebro-browser-dispatch-v2',environment:'PREPROD',orchestrator_v2:true,distributed_barrier_v2:true,benchmark_lease_isolated:true,benchmark_attempt_isolated:true,allowed_workflows:[...WORKFLOWS],credential_materialization_v2:true,credential_binding_source:'V1_ALIAS_VAULT',credential_secret_persistence:false,serial_v1_rollback_preserved:true,incremental_cost_eur:0});
  if(req.method!=='POST')return out(404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});
  const w=await worker(req);if(!w.ok)return out(403,w);
  let body:any={};try{body=await req.json();}catch{}
  try{
    if(route==='phase2-canary-seed'){
      const n=slot(body.worker_slot),c=stage(body.stage_concurrency);
      return out(200,await seed(w.benchmark_id,n,c,`${w.base_worker}:slot-${n}`));
    }
    if(route==='phase2-credential-canary-seed'){
      const n=slot(body.worker_slot),c=stage(body.stage_concurrency);
      return out(200,await seedCredentialCanary(w.benchmark_id,n,c,`${w.base_worker}:slot-${n}`));
    }
    if(route==='barrier-arrive-v2'){
      const n=slot(body.worker_slot),c=stage(body.stage_concurrency);
      const {data,error}=await svc.rpc('cerebro_browser_barrier_arrive_v2',{p_run_id:w.benchmark_id,p_stage_concurrency:c,p_worker_slot:n,p_worker_id:`${w.base_worker}:slot-${n}`});if(error)throw error;return out(200,data);
    }
    if(route==='barrier-status-v2'){
      const c=stage(body.stage_concurrency);
      const {data,error}=await svc.rpc('cerebro_browser_barrier_status_v2',{p_run_id:w.benchmark_id,p_stage_concurrency:c});if(error)throw error;return out(200,data);
    }
    if(route==='lease-v2'){
      const n=slot(body.worker_slot);const wid=`${w.base_worker}:slot-${n}`;const prefix=`browser1-phase2-${w.benchmark_id}-stage-`;
      const {data,error}=await svc.rpc('cerebro_browser_lease_benchmark_v2',{p_worker_id:wid,p_environment:'PREPROD',p_idempotency_prefix:prefix,p_lease_seconds:300});if(error)throw error;return out(200,{...data,worker_id:wid,benchmark_id:w.benchmark_id});
    }
    if(route==='heartbeat-v2'){
      const n=slot(body.worker_slot);const {data,error}=await svc.rpc('cerebro_browser_heartbeat_v2',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:`${w.base_worker}:slot-${n}`,p_extend_seconds:Number(body.extend_seconds||300)});if(error)throw error;return out(200,data);
    }
    if(route==='credential-materialize-v2'){
      const n=slot(body.worker_slot);const wid=`${w.base_worker}:slot-${n}`;
      const {data,error}=await svc.rpc('cerebro_browser_credential_materialize_v2',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:wid});
      if(error)return out(403,{ok:false,error:'CREDENTIAL_MATERIALIZE_V2_DENIED'});
      if(data?.ok!==true)return out(403,{ok:false,error:'CREDENTIAL_MATERIALIZE_V2_DENIED',reason:String(data?.error||'POLICY_DENIED')});
      return out(200,data);
    }
    if(route==='complete-v2'){
      const n=slot(body.worker_slot);const {data,error}=await svc.rpc('cerebro_browser_complete_v2',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:`${w.base_worker}:slot-${n}`,p_outcome:String(body.outcome||'FAILED'),p_result_summary:body.result_summary??null,p_error_code:body.error_code??null,p_retryable:body.retryable!==false});if(error)throw error;return out(200,data);
    }
    if(route==='metrics-v2'){
      const n=slot(body.worker_slot),c=stage(body.stage_concurrency);
      const {data,error}=await svc.rpc('cerebro_browser_metrics_insert_v2',{p_run_id:String(body.run_id||w.benchmark_id),p_worker_id:`${w.base_worker}:slot-${n}`,p_environment:'PREPROD',p_stage_concurrency:c,p_job_id:body.job_id,p_company_id:body.company_id,p_department_id:body.department_id,p_browser_profile_id:body.browser_profile_id,p_started_at:body.started_at,p_finished_at:body.finished_at,p_duration_ms:Number(body.duration_ms||0),p_rss_start_bytes:Number(body.rss_start_bytes||0),p_rss_end_bytes:Number(body.rss_end_bytes||0),p_heap_used_start_bytes:Number(body.heap_used_start_bytes||0),p_heap_used_end_bytes:Number(body.heap_used_end_bytes||0),p_cpu_user_micros:Number(body.cpu_user_micros||0),p_cpu_system_micros:Number(body.cpu_system_micros||0),p_outcome:String(body.outcome||'UNKNOWN')});if(error)throw error;return out(200,data);
    }
    if(route==='status-v2'){
      const {data,error}=await svc.rpc('cerebro_browser_status_v2',{p_environment:'PREPROD'});if(error)throw error;return out(200,{...data,benchmark_id:w.benchmark_id});
    }
    return out(404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});
  }catch(e){return out(400,{ok:false,error:'V2_OPERATION_FAILED',detail:e instanceof Error?e.message:String(e)});}
});
