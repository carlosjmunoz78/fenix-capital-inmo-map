import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
import {createRemoteJWKSet,jwtVerify} from "npm:jose@5.10.0";

/**
 * CEREBRO OS CONSOLE-001 · OIDC Job Observer · LAB v0
 * Identity: one pinned GitHub Actions workflow, one branch, one JWT audience.
 * Authorization: status summary ONLY; never lease, enqueue, mutate, access payloads or secrets.
 */
const PROJECT="hnqlnvakzaywtafeiybt";
const REPO="carlosjmunoz78/fenix-capital-inmo-map";
const BRANCH="refs/heads/cerebro/jarvis-oidc-job-observer-lab-v0-20261109";
const WORKFLOW=".github/workflows/cerebro-jarvis-oidc-job-observer-lab-once.yml";
const AUDIENCE="jarvis-oidc-job-observer-lab-v0";
const SLUG="jarvis-oidc-job-observer-lab-v0";
const ISSUER="https://token.actions.githubusercontent.com";
const JWKS=createRemoteJWKSet(new URL(ISSUER+"/.well-known/jwks"));
const ALLOWED_NAMES=["git.safe.v1","repo.sandbox.public.readonly.v0"] as const;
const ALLOWED_STATES=new Set(["QUEUED","RETRY_WAIT","LEASED","RUNNING","SUCCEEDED","FAILED","DEAD_LETTER","CANCELLED","CANCELED"]);
function reply(status:number,body:unknown){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
}
Deno.serve(async(req:Request)=>{
  const url=new URL(req.url);
  if(req.method!=="POST"||!url.pathname.endsWith("/"+SLUG+"/status"))return reply(404,{status:"NOT_AVAILABLE"});
  if((Deno.env.get("SUPABASE_URL")??"")!=="https://"+PROJECT+".supabase.co")
    return reply(403,{status:"DENIED",reason:"PROJECT_SCOPE_DENIED"});
  const header=req.headers.get("authorization")??"";
  if(!header.startsWith("Bearer ")||header.length>8199)return reply(403,{status:"DENIED",reason:"OIDC_REQUIRED"});
  let runId="";
  let sha="";
  try{
    const {payload}=await jwtVerify(header.slice(7),JWKS,{issuer:ISSUER,audience:AUDIENCE,algorithms:["RS256"],clockTolerance:5});
    const now=Math.floor(Date.now()/1000);
    if(payload.repository!==REPO||payload.ref!==BRANCH||
       payload.workflow_ref!==REPO+"/"+WORKFLOW+"@"+BRANCH||
       payload.event_name!=="push"||
       typeof payload.sub!=="string"||!payload.sub||
       typeof payload.sha!=="string"||!/^[0-9a-f]{40}$/.test(payload.sha)||
       typeof payload.run_id!=="string"||!/^[0-9]+$/.test(payload.run_id)||
       typeof payload.iat!=="number"||typeof payload.exp!=="number"||
       payload.iat>now+5||payload.iat<now-300||payload.exp>now+600)
      return reply(403,{status:"DENIED",reason:"OIDC_SCOPE_DENIED"});
    runId=payload.run_id;
    sha=payload.sha;
  }catch{return reply(403,{status:"DENIED",reason:"OIDC_INVALID"});}
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!key)return reply(503,{status:"UNAVAILABLE",reason:"SERVER_CONFIG_MISSING"});
  const svc=createClient("https://"+PROJECT+".supabase.co",key,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    // Constant predicates and projection. No payload, actor, job IDs or customer data leave this function.
    const {data,error,count}=await svc.from("jarvis_work_job_v1")
      .select("name,status",{count:"exact"})
      .eq("company_id","fenix")
      .eq("engine_id","CONSOLE-001")
      .eq("environment","PREPROD")
      .in("name",[...ALLOWED_NAMES])
      .range(0,199);
    if(error)return reply(503,{status:"UNAVAILABLE",reason:"READ_FAILED"});
    const totals:Record<string,Record<string,number>>={};
    for(const name of ALLOWED_NAMES)totals[name]={};
    for(const row of data??[]){
      const name=String(row.name??""),state=String(row.status??"");
      if(!ALLOWED_NAMES.includes(name as typeof ALLOWED_NAMES[number])||!ALLOWED_STATES.has(state))
        return reply(503,{status:"UNAVAILABLE",reason:"UNEXPECTED_QUEUE_SCHEMA"});
      totals[name][state]=(totals[name][state]??0)+1;
    }
    const sampled=(data??[]).length;
    const total=count??sampled;
    if(total>200)return reply(503,{status:"UNAVAILABLE",reason:"ROW_LIMIT_REACHED"});
    const pending=ALLOWED_NAMES.reduce((n,name)=>n+(totals[name].QUEUED??0)+(totals[name].RETRY_WAIT??0),0);
    return reply(200,{
      status:"OK",proof:"SIGNED_GITHUB_OIDC_JARVIS_JOB_READONLY",
      company_id:"fenix",engine_id:"CONSOLE-001",environment:"LAB",
      observed_environment:"PREPROD",version:"v0",
      repository:REPO,branch:BRANCH,run_id:runId,source_sha:sha,
      job_names:[...ALLOWED_NAMES],counts:totals,total_jobs:total,pending,
      scope:"AGGREGATE_STATUS_ONLY",no_user_jwt:true,no_db_mutation:true,
      no_prod_access:true,no_trading_access:true,no_job_lease:true,no_auto_rearm:true,
      additional_subscription_created:false
    });
  }catch{return reply(503,{status:"UNAVAILABLE",reason:"QUERY_FAILED"});}
});
