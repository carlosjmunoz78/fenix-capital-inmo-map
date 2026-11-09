import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

// LAB-only, direct GitHub READS. Existing Supabase user auth; never accept GitHub machine OIDC here.
// No queue, no worker, no service-role writes, no APP PROD origin and no user secrets in logs.
const PROJECT="hnqlnvakzaywtafeiybt";
const REPO="carlosjmunoz78/fenix-capital-inmo-map";
const BRANCH="cerebro/jarvis-work-codex-complete-20261102";
const SLUG="jarvis-git-direct-readonly-lab-v0";
const ORIGINS=new Set(["http://127.0.0.1:4173","http://localhost:4173"]);
const OPERATIONS=new Set(["STATUS","DIFF","CI_READ","COMPARE"]);
const cors=(o:string)=>({"access-control-allow-origin":o,"vary":"Origin","access-control-allow-credentials":"false"});
function respond(status:number,body:unknown,o:string|null){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...(o&&ORIGINS.has(o)?cors(o):{})}});
}
function deny(req:Request,status:number,reason:string){return respond(status,{status:"DENIED",reason},req.headers.get("origin"))}
async function repoGET(path:string){
  const response=await fetch("https://api.github.com/repos/"+REPO+path,{
    method:"GET",headers:{accept:"application/vnd.github+json","user-agent":"cerebro-jarvis-readonly-lab-v0"},
    redirect:"error",signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error("GITHUB_READ_HTTP_"+response.status);
  return response.json();
}
Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS"){
    if(!origin||!ORIGINS.has(origin))return new Response(null,{status:403});
    return new Response(null,{status:204,headers:{...cors(origin),"access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"authorization,apikey,content-type","access-control-max-age":"120"}});
  }
  if(req.method!=="POST"||!new URL(req.url).pathname.endsWith("/"+SLUG+"/inspect"))return deny(req,404,"ROUTE_CLOSED");
  if(origin&&!ORIGINS.has(origin))return deny(req,403,"ORIGIN_DENIED");
  if((Deno.env.get("SUPABASE_URL")??"")!=="https://"+PROJECT+".supabase.co")return deny(req,403,"PROJECT_DENIED");
  const auth=req.headers.get("authorization")??"";
  if(!auth.startsWith("Bearer ")||auth.length>8199)return deny(req,403,"USER_SESSION_REQUIRED");
  const anon=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!anon||!service)return respond(503,{status:"UNAVAILABLE",reason:"SERVER_CONFIG"},origin);
  try{
    const url="https://"+PROJECT+".supabase.co";
    const userClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:user,error:userError}=await userClient.auth.getUser(auth.slice(7));
    if(userError||!user.user?.id)return deny(req,403,"SESSION_INVALID");
    const svc=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:actor,error:actorError}=await svc.rpc("fenix_prod_actor_context_by_auth_server",{p_auth_user_id:user.user.id});
    if(actorError||actor?.ok!==true||actor?.actor_code!=="CARLOS-ADMIN")return deny(req,403,"OWNER_ONLY");
    let body:Record<string,unknown>={};
    try{body=await req.json()}catch{return respond(400,{status:"INVALID",reason:"JSON_REQUIRED"},origin)}
    if(!body||typeof body!=="object"||Array.isArray(body))return respond(400,{status:"INVALID"},origin);
    const operation=String(body.operation??"");
    const expected=String(body.expected_head_sha??"");
    if(!OPERATIONS.has(operation)||!/^[0-9a-f]{40}$/.test(expected))
      return respond(400,{status:"INVALID",reason:"OPERATION_OR_SHA_INVALID"},origin);
    if(Object.keys(body).some(k=>!["operation","expected_head_sha"].includes(k)))
      return respond(400,{status:"INVALID",reason:"UNSUPPORTED_ARGUMENT"},origin);
    const head=await repoGET("/branches/"+encodeURIComponent(BRANCH));
    if(head?.name!==BRANCH||typeof head?.commit?.sha!=="string"||head.commit.sha!==expected)
      return respond(409,{status:"BLOCKED",reason:"BRANCH_HEAD_CHANGED"},origin);
    const sha=expected;
    const common={status:"OK",proof:"JARVIS_GIT_DIRECT_READONLY_LAB",operation,
      company_id:"fenix",engine_id:"CONSOLE-001",environment:"LAB",version:"v0",
      repository:REPO,branch:BRANCH,head_sha:sha,
      user_actor:"CARLOS-ADMIN",mode:"IMMEDIATE_READONLY",job_enqueued:false,
      worker_required:false,git_writes:0,db_writes:0,prod_touched:false,trading_touched:false};
    if(operation==="STATUS")
      return respond(200,{...common,head_verified:true,working_tree:"NOT_APPLICABLE_REMOTE_API"},origin);
    if(operation==="CI_READ"){
      const [checks,commit]=await Promise.all([
        repoGET("/commits/"+sha+"/check-runs?per_page=20"),
        repoGET("/commits/"+sha+"/status")
      ]);
      if(!Number.isInteger(checks?.total_count)||!Array.isArray(checks?.check_runs)||!Array.isArray(commit?.statuses))
        return respond(503,{status:"UNAVAILABLE",reason:"CI_EVIDENCE_NOT_VERIFIABLE"},origin);
      return respond(200,{...common,ci_total:checks.total_count,ci_page_observed:checks.check_runs.length,
        ci_completed_observed:checks.check_runs.filter((v:{status?:string})=>v.status==="completed").length,
        commit_status:commit.state??"unknown",statuses_observed:commit.statuses.length,
        ci_all_checks_complete:checks.total_count<=checks.check_runs.length&&checks.check_runs.every((v:{status?:string})=>v.status==="completed")},origin);
    }
    const compare=await repoGET("/compare/main..."+encodeURIComponent(BRANCH));
    if(!["identical","ahead","behind","diverged"].includes(compare?.status))
      return respond(503,{status:"UNAVAILABLE",reason:"COMPARE_INVALID"},origin);
    return respond(200,{...common,compare_base:"main",compare_status:compare.status,
      ahead_by:compare.ahead_by,behind_by:compare.behind_by,
      changed_files_observed:Array.isArray(compare.files)?compare.files.length:null,
      changed_files_truncated:!Array.isArray(compare.files)||compare.files.length>=300,
      diff_content_exposed:false},origin);
  }catch{return respond(503,{status:"UNAVAILABLE",reason:"READ_FAILED"},origin);}
});
