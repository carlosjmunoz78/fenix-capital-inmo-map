import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const U = Deno.env.get("SUPABASE_URL") ?? "";
const A = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const svc = createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const auth = createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});
const GITHUB_ISSUER="https://token.actions.githubusercontent.com";
const GITHUB_AUDIENCE="cerebro-browser-worker-v1";
const GITHUB_REPOSITORIES=new Set([
  "carlosjmunoz78/fenix-capital-inmo-map",
  "fenix-cerebro/fenix-capital-inmo-map"
]);
const GITHUB_WORKFLOW=".github/workflows/cerebro-browser-job-runner-v1.yml";
const JWKS=createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
const ALLOWED_ORIGINS=new Set(["https://app.fenixcapital.es","https://www.app.fenixcapital.es"]);
const PREPROD=U.includes("hnqlnvakzaywtafeiybt");

function headers(origin:string|null=null){
  const h:Record<string,string>={"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"origin"};
  if(origin&&ALLOWED_ORIGINS.has(origin))h["access-control-allow-origin"]=origin;
  return h;
}
function out(req:Request,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:headers(req.headers.get("origin"))});}
function bearer(req:Request){const h=req.headers.get("authorization")??""; return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";}
function safeError(e:unknown){return e instanceof Error?e.message:String(e);}

async function githubWorker(req:Request){
  const token=bearer(req); if(!token)return {ok:false,error:"GITHUB_OIDC_REQUIRED"} as const;
  try{
    const {payload}=await jwtVerify(token,JWKS,{issuer:GITHUB_ISSUER,audience:GITHUB_AUDIENCE});
    const repository=String(payload.repository??"");
    if(!GITHUB_REPOSITORIES.has(repository))return {ok:false,error:"GITHUB_REPOSITORY_DENIED"} as const;
    const workflowRef=String(payload.workflow_ref??"");
    if(!workflowRef.includes(`${repository}/${GITHUB_WORKFLOW}@`))return {ok:false,error:"GITHUB_WORKFLOW_DENIED"} as const;
    const ref=String(payload.ref??"");
    if(PREPROD){
      const preprodRefs=new Set(["refs/heads/main","refs/heads/cerebro/browser1-live-dispatch-v1","refs/heads/cerebro/browser1-live-dispatch-v1-final"]);
      if(!preprodRefs.has(ref))return {ok:false,error:"GITHUB_REF_DENIED"} as const;
    } else if(ref!=="refs/heads/main") return {ok:false,error:"GITHUB_REF_DENIED"} as const;
    return {ok:true,worker_id:`github:${String(payload.run_id??"unknown")}:${String(payload.run_attempt??"1")}`,claims:{repository,ref,workflow_ref:workflowRef,run_id:payload.run_id,runner_environment:payload.runner_environment}} as const;
  }catch(e){return {ok:false,error:"GITHUB_OIDC_INVALID",detail:safeError(e)} as const;}
}

async function owner(req:Request){
  const token=bearer(req); if(!token)return {ok:false,error:"OWNER_TOKEN_REQUIRED"} as const;
  const {data,error}=await auth.auth.getUser(token); if(error||!data.user)return {ok:false,error:"OWNER_TOKEN_INVALID"} as const;
  const {data:ctx,error:ce}=await svc.rpc("fenix_prod_actor_context_by_auth_server",{p_auth_user_id:data.user.id});
  if(ce||ctx?.ok!==true||String(ctx?.actor_code??"")!=="CARLOS-ADMIN")return {ok:false,error:"OWNER_REQUIRED"} as const;
  return {ok:true,actor:"CARLOS-ADMIN"} as const;
}

function commandTarget(commands:any[]){const nav=commands.find(x=>x&&typeof x==="object"&&(x.command==="goto"||x.type==="NAVIGATE"));return String(nav?.url??"");}

async function enqueue(body:any,createdBy:string){
  const commands=Array.isArray(body.commands)?body.commands:[];
  const target=String(body.target_url||commandTarget(commands)||"");
  if(!target||!commands.length)throw new Error("INVALID_BROWSER_JOB");
  const args={
    p_idempotency_key:String(body.idempotency_key||crypto.randomUUID()),
    p_company_id:String(body.company_id||"fenix"),
    p_engine_id:String(body.engine_id||"CONSOLE-001"),
    p_department_id:String(body.department_id||"cerebro"),
    p_environment:String(body.environment||(PREPROD?"PREPROD":"PROD")),
    p_version:String(body.version||"v1"),
    p_mode:String(body.mode||"OBSERVE"),
    p_identity_id:String(body.identity_id||"public"),
    p_account_id:String(body.account_id||"public"),
    p_credential_ref_id:body.credential_ref_id?String(body.credential_ref_id):null,
    p_target_url:target,
    p_commands:commands,
    p_authority:body.authority&&typeof body.authority==="object"?body.authority:{},
    p_audit_id:String(body.audit_id||`browser-audit-${Date.now()}`),
    p_created_by:createdBy
  };
  const {data,error}=await svc.rpc("cerebro_browser_enqueue_v1",args); if(error)throw error; return data;
}

function canaryBody(runId:string, credential=false){return {
  idempotency_key:`browser1-preprod-${credential?'credential-':''}oidc-canary-${runId}`,
  company_id:"fenix",engine_id:"CONSOLE-001",department_id:"cerebro",environment:"PREPROD",version:"v1",mode:"OBSERVE",
  identity_id:credential?"iam:browser-phase1-synthetic":"public",account_id:credential?"acct:browser-phase1-synthetic":"public",
  credential_ref_id:credential?"credref:browser-phase1-synthetic-v1":null,
  target_url:"https://fenixcapital.es/",
  commands:[{command:"goto",url:"https://fenixcapital.es/"},{command:"extract_text",target:{selector:"h1"}},{command:"screenshot",label:credential?"phase1-credential-broker":"phase1-live-dispatch"}],
  authority:{canonical_engine_ids:["CONSOLE-001"],browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true,attestation_source:"GITHUB_OIDC_VERIFIED_WORKER"},engine_authority:{browser_use_authorized:true},kill_switch_enabled:true}
};}

Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS"){
    if(!origin||!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
    return new Response(null,{status:204,headers:{...headers(origin),"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type,apikey","access-control-max-age":"600"}});
  }
  const url=new URL(req.url); const route=url.pathname.split("/").filter(Boolean).slice(-1)[0]||"";
  if(req.method==="GET"&&route==="health")return out(req,200,{ok:true,service:"cerebro-browser-dispatch-v1",environment:PREPROD?"PREPROD":"PROD",queue:"cerebro_browser_job_v1",github_oidc:true,repository_allowlist:[...GITHUB_REPOSITORIES],vault_broker:true,raw_secrets_in_jobs:false,incremental_cost_eur:0});

  if(req.method==="POST"&&(route==="canary-seed"||route==="canary-credential-seed")){
    if(!PREPROD)return out(req,404,{ok:false,error:"CANARY_ROUTE_NOT_AVAILABLE"});
    const w=await githubWorker(req); if(!w.ok)return out(req,403,w);
    try{return out(req,200,await enqueue(canaryBody(String(w.claims.run_id??Date.now()),route==="canary-credential-seed"),w.worker_id));}
    catch(e){return out(req,400,{ok:false,error:"CANARY_ENQUEUE_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="enqueue"){
    const o=await owner(req); if(!o.ok)return out(req,403,o);
    try{const body=await req.json(); return out(req,200,await enqueue(body,o.actor));}catch(e){return out(req,400,{ok:false,error:"ENQUEUE_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="lease"){
    const w=await githubWorker(req); if(!w.ok)return out(req,403,w);
    const {data,error}=await svc.rpc("cerebro_browser_lease_v1",{p_worker_id:w.worker_id,p_lease_seconds:300});
    if(error)return out(req,500,{ok:false,error:"LEASE_FAILED",detail:error.message});
    return out(req,200,{...data,worker:{...w.claims,authenticated:true}});
  }

  if(req.method==="POST"&&route==="credential-materialize"){
    const w=await githubWorker(req); if(!w.ok)return out(req,403,w);
    let body:any; try{body=await req.json();}catch{return out(req,400,{ok:false,error:"INVALID_JSON"});}
    const {data,error}=await svc.rpc("cerebro_browser_credential_materialize_v1",{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:w.worker_id});
    if(error)return out(req,400,{ok:false,error:"CREDENTIAL_MATERIALIZE_FAILED",detail:error.message});
    if(data?.ok!==true)return out(req,403,data);
    return out(req,200,data);
  }

  if(req.method==="POST"&&route==="complete"){
    const w=await githubWorker(req); if(!w.ok)return out(req,403,w);
    let body:any; try{body=await req.json();}catch{return out(req,400,{ok:false,error:"INVALID_JSON"});}
    const {data,error}=await svc.rpc("cerebro_browser_complete_v1",{p_job_id:body.job_id,p_lease_id:body.lease_id,p_status:body.status,p_result_summary:body.result_summary??null,p_error_code:body.error_code??null});
    if(error)return out(req,400,{ok:false,error:"COMPLETE_FAILED",detail:error.message});
    return out(req,200,data);
  }

  return out(req,404,{ok:false,error:"ROUTE_NOT_AVAILABLE"});
});