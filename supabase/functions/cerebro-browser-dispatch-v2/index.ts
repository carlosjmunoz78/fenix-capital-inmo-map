import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const U=Deno.env.get("SUPABASE_URL")??"";
const A=Deno.env.get("SUPABASE_ANON_KEY")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const auth=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});
const PREPROD=U.includes("hnqlnvakzaywtafeiybt");
const GITHUB_ISSUER="https://token.actions.githubusercontent.com";
const GITHUB_AUDIENCE="cerebro-browser-worker-v1";
const GITHUB_REPOSITORY="carlosjmunoz78/fenix-capital-inmo-map";
const GITHUB_WORKFLOW=".github/workflows/cerebro-browser-orchestrator-v2.yml";
const PREPROD_REFS=new Set(["refs/heads/cerebro/browser1-phase2-orchestrator-v1"]);
const JWKS=createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
const ALLOWED_ORIGINS=new Set(["https://app.fenixcapital.es","https://www.app.fenixcapital.es"]);

function headers(origin:string|null=null){const h:Record<string,string>={"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"origin"};if(origin&&ALLOWED_ORIGINS.has(origin))h["access-control-allow-origin"]=origin;return h;}
function out(req:Request,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:headers(req.headers.get("origin"))});}
function bearer(req:Request){const h=req.headers.get("authorization")??"";return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";}
function safeError(e:unknown){return e instanceof Error?e.message:String(e);}
function safeSegment(value:unknown){return String(value??"").trim().replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120);}
function slotOf(value:unknown){const n=Number(value);if(!Number.isInteger(n)||n<1||n>128)throw new Error("INVALID_WORKER_SLOT");return n;}
function stageOf(value:unknown){const n=Number(value);if(!Number.isInteger(n)||n<1||n>128)throw new Error("INVALID_STAGE_CONCURRENCY");return n;}
function workerIdFor(w:{worker_id:string},slot:number){return `${w.worker_id}:slot-${slot}`;}
function browserProfileId(company:string,identity:string,account:string,environment:string){return `b1-${safeSegment(company)}-${safeSegment(identity)}-${safeSegment(account)}-${safeSegment(environment)}`;}
function commandTarget(commands:any[]){const nav=commands.find(x=>x&&typeof x==="object"&&(x.command==="goto"||x.type==="NAVIGATE"));return String(nav?.url??"");}

async function githubWorker(req:Request){
  const token=bearer(req);if(!token)return {ok:false,error:"GITHUB_OIDC_REQUIRED"} as const;
  try{
    const {payload}=await jwtVerify(token,JWKS,{issuer:GITHUB_ISSUER,audience:GITHUB_AUDIENCE});
    if(payload.repository!==GITHUB_REPOSITORY)return {ok:false,error:"GITHUB_REPOSITORY_DENIED"} as const;
    const workflowRef=String(payload.workflow_ref??"");
    if(!workflowRef.includes(`${GITHUB_REPOSITORY}/${GITHUB_WORKFLOW}@`))return {ok:false,error:"GITHUB_WORKFLOW_DENIED"} as const;
    const ref=String(payload.ref??"");
    if(PREPROD){if(!PREPROD_REFS.has(ref))return {ok:false,error:"GITHUB_REF_DENIED"} as const;}
    else if(ref!=="refs/heads/main")return {ok:false,error:"GITHUB_REF_DENIED"} as const;
    return {ok:true,worker_id:`github:${String(payload.run_id??"unknown")}:${String(payload.run_attempt??"1")}`,claims:{repository:payload.repository,ref,workflow_ref:workflowRef,run_id:payload.run_id,run_attempt:payload.run_attempt,runner_environment:payload.runner_environment}} as const;
  }catch(e){return {ok:false,error:"GITHUB_OIDC_INVALID",detail:safeError(e)} as const;}
}

async function owner(req:Request){
  const token=bearer(req);if(!token)return {ok:false,error:"OWNER_TOKEN_REQUIRED"} as const;
  const {data,error}=await auth.auth.getUser(token);if(error||!data.user)return {ok:false,error:"OWNER_TOKEN_INVALID"} as const;
  const {data:ctx,error:ce}=await svc.rpc("fenix_prod_actor_context_by_auth_server",{p_auth_user_id:data.user.id});
  if(ce||ctx?.ok!==true||String(ctx?.actor_code??"")!=="CARLOS-ADMIN")return {ok:false,error:"OWNER_REQUIRED"} as const;
  return {ok:true,actor:"CARLOS-ADMIN"} as const;
}

async function enqueueV2(body:any,createdBy:string){
  const commands=Array.isArray(body.commands)?body.commands:[];
  const target=String(body.target_url||commandTarget(commands)||"");
  if(!target||!commands.length)throw new Error("INVALID_BROWSER_JOB");
  const company=String(body.company_id||"fenix");const environment=String(body.environment||(PREPROD?"PREPROD":"PROD"));
  const identity=String(body.identity_id||"public");const account=String(body.account_id||"public");
  const args={
    p_idempotency_key:String(body.idempotency_key||crypto.randomUUID()),p_company_id:company,p_engine_id:String(body.engine_id||"CONSOLE-001"),
    p_department_id:String(body.department_id||"cerebro"),p_environment:environment,p_version:String(body.version||"v2"),p_mode:String(body.mode||"OBSERVE"),
    p_identity_id:identity,p_account_id:account,p_browser_profile_id:String(body.browser_profile_id||browserProfileId(company,identity,account,environment)),
    p_credential_ref_id:body.credential_ref_id?String(body.credential_ref_id):null,p_target_url:target,p_commands:commands,
    p_authority:body.authority&&typeof body.authority==="object"?body.authority:{},p_priority:Number(body.priority??50),p_risk:String(body.risk||"LOW").toUpperCase(),
    p_capability:String(body.capability||(String(body.mode||"OBSERVE").toUpperCase()==="MUTATE"?"browser1.act":"browser1.observe")),
    p_expected_cost_eur:Number(body.expected_cost_eur||0),p_timeout_seconds:Number(body.timeout_seconds||300),p_max_attempts:Number(body.max_attempts||3),
    p_audit_id:String(body.audit_id||`browser-v2-audit-${Date.now()}`),p_created_by:createdBy
  };
  const {data,error}=await svc.rpc("cerebro_browser_enqueue_v2",args);if(error)throw error;return data;
}

function phase2CanaryBody(runId:string,slot:number,stage:number){
  const departments=["seo","marketing","crm","finance","social","support","training","operations"];
  const company=slot%2===0?"captacasa-lab":"fenix";
  const department=departments[(slot-1)%departments.length];
  const identity=`phase2-${runId}-${slot}`;const account=`acct-${runId}-${slot}`;const environment="PREPROD";
  const html=encodeURIComponent(`<html><body><h1>CEREBRO Browser Phase 2</h1><p>run=${runId} slot=${slot} stage=${stage}</p></body></html>`);
  const target=`data:text/html;charset=utf-8,${html}`;
  return {
    idempotency_key:`browser1-phase2-${runId}-stage-${stage}-slot-${slot}`,company_id:company,engine_id:"CONSOLE-001",department_id:department,
    environment,version:"v2",mode:"OBSERVE",identity_id:identity,account_id:account,browser_profile_id:browserProfileId(company,identity,account,environment),
    target_url:target,priority:50+(slot%4),risk:"LOW",capability:"browser1.observe",expected_cost_eur:0,timeout_seconds:300,max_attempts:2,
    commands:[{command:"goto",url:target},{command:"wait",ms:2500},{command:"extract_text",target:{selector:"h1"}},{command:"screenshot",label:`phase2-${stage}-${slot}`}],
    authority:{canonical_engine_ids:["CONSOLE-001"],browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true,attestation_source:"GITHUB_OIDC_VERIFIED_WORKER_V2"},engine_authority:{browser_use_authorized:true},kill_switch_enabled:true}
  };
}

Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS"){
    if(!origin||!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
    return new Response(null,{status:204,headers:{...headers(origin),"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type,apikey","access-control-max-age":"600"}});
  }
  const url=new URL(req.url);const route=url.pathname.split("/").filter(Boolean).slice(-1)[0]||"";
  if(req.method==="GET"&&route==="health")return out(req,200,{ok:true,service:"cerebro-browser-dispatch-v2",environment:PREPROD?"PREPROD":"PROD",queue:"cerebro_browser_job_v2",orchestrator_v2:true,github_oidc:true,credential_materialization_v2:false,serial_v1_rollback_preserved:true,raw_secrets_in_jobs:false,incremental_cost_eur:0});

  if(req.method==="POST"&&route==="phase2-canary-seed"){
    if(!PREPROD)return out(req,404,{ok:false,error:"PHASE2_CANARY_NOT_AVAILABLE"});
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    let body:any;try{body=await req.json();}catch{return out(req,400,{ok:false,error:"INVALID_JSON"});}
    try{const slot=slotOf(body.worker_slot);const stage=stageOf(body.stage_concurrency);return out(req,200,await enqueueV2(phase2CanaryBody(String(w.claims.run_id??Date.now()),slot,stage),workerIdFor(w,slot)));}
    catch(e){return out(req,400,{ok:false,error:"PHASE2_CANARY_ENQUEUE_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="enqueue-v2"){
    const o=await owner(req);if(!o.ok)return out(req,403,o);
    try{const body=await req.json();return out(req,200,await enqueueV2(body,o.actor));}catch(e){return out(req,400,{ok:false,error:"ENQUEUE_V2_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="lease-v2"){
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    let body:any;try{body=await req.json();}catch{return out(req,400,{ok:false,error:"INVALID_JSON"});}
    try{
      const slot=slotOf(body.worker_slot);const wid=workerIdFor(w,slot);
      const {data,error}=await svc.rpc("cerebro_browser_lease_v2",{p_worker_id:wid,p_environment:PREPROD?"PREPROD":"PROD",p_lease_seconds:300});
      if(error)return out(req,500,{ok:false,error:"LEASE_V2_FAILED",detail:error.message});
      return out(req,200,{...data,worker_id:wid,worker:{...w.claims,slot,authenticated:true}});
    }catch(e){return out(req,400,{ok:false,error:"LEASE_V2_INVALID",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="heartbeat-v2"){
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    let body:any;try{body=await req.json();}catch{return out(req,400,{ok:false,error:"INVALID_JSON"});}
    try{
      const slot=slotOf(body.worker_slot);
      const {data,error}=await svc.rpc("cerebro_browser_heartbeat_v2",{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:workerIdFor(w,slot),p_extend_seconds:Number(body.extend_seconds||300)});
      if(error)return out(req,400,{ok:false,error:"HEARTBEAT_V2_FAILED",detail:error.message});return out(req,200,data);
    }catch(e){return out(req,400,{ok:false,error:"HEARTBEAT_V2_INVALID",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="credential-materialize-v2"){
    return out(req,501,{ok:false,error:"HOLD_V2_CREDENTIAL_BROKER_NOT_PROMOTED",human_required:null,serial_v1_credential_path_preserved:true});
  }

  if(req.method==="POST"&&route==="complete-v2"){
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    let body:any;try{body=await req.json();}catch{return out(req,400,{ok:false,error:"INVALID_JSON"});}
    try{
      const slot=slotOf(body.worker_slot);
      const {data,error}=await svc.rpc("cerebro_browser_complete_v2",{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:workerIdFor(w,slot),p_outcome:String(body.outcome||"FAILED"),p_result_summary:body.result_summary??null,p_error_code:body.error_code??null,p_retryable:body.retryable!==false});
      if(error)return out(req,400,{ok:false,error:"COMPLETE_V2_FAILED",detail:error.message});return out(req,200,data);
    }catch(e){return out(req,400,{ok:false,error:"COMPLETE_V2_INVALID",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="metrics-v2"){
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    let body:any;try{body=await req.json();}catch{return out(req,400,{ok:false,error:"INVALID_JSON"});}
    try{
      const slot=slotOf(body.worker_slot);
      const {data,error}=await svc.rpc("cerebro_browser_metrics_insert_v2",{p_run_id:String(body.run_id||w.claims.run_id||"unknown"),p_worker_id:workerIdFor(w,slot),p_environment:PREPROD?"PREPROD":"PROD",p_stage_concurrency:stageOf(body.stage_concurrency),p_job_id:body.job_id,p_company_id:body.company_id,p_department_id:body.department_id,p_browser_profile_id:body.browser_profile_id,p_started_at:body.started_at,p_finished_at:body.finished_at,p_duration_ms:Number(body.duration_ms||0),p_rss_start_bytes:Number(body.rss_start_bytes||0),p_rss_end_bytes:Number(body.rss_end_bytes||0),p_heap_used_start_bytes:Number(body.heap_used_start_bytes||0),p_heap_used_end_bytes:Number(body.heap_used_end_bytes||0),p_cpu_user_micros:Number(body.cpu_user_micros||0),p_cpu_system_micros:Number(body.cpu_system_micros||0),p_outcome:String(body.outcome||"UNKNOWN")});
      if(error)return out(req,400,{ok:false,error:"METRICS_V2_FAILED",detail:error.message});return out(req,200,data);
    }catch(e){return out(req,400,{ok:false,error:"METRICS_V2_INVALID",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="status-v2"){
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    const {data,error}=await svc.rpc("cerebro_browser_status_v2",{p_environment:PREPROD?"PREPROD":"PROD"});
    if(error)return out(req,500,{ok:false,error:"STATUS_V2_FAILED",detail:error.message});return out(req,200,data);
  }

  if(req.method==="POST"&&route==="cancel-v2"){
    const o=await owner(req);if(!o.ok)return out(req,403,o);
    let body:any;try{body=await req.json();}catch{return out(req,400,{ok:false,error:"INVALID_JSON"});}
    const {data,error}=await svc.rpc("cerebro_browser_cancel_v2",{p_job_id:body.job_id,p_reason:String(body.reason||"OWNER_CANCELLED")});
    if(error)return out(req,400,{ok:false,error:"CANCEL_V2_FAILED",detail:error.message});return out(req,200,data);
  }

  return out(req,404,{ok:false,error:"ROUTE_NOT_AVAILABLE"});
});
