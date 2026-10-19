import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {withSupabase} from "jsr:@supabase/server@^1";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const REPOSITORY="carlosjmunoz78/fenix-capital-inmo-map";
const RUNS_URL=`https://api.github.com/repos/${REPOSITORY}/actions/runs?per_page=100`;
const CACHE_TTL_MS=45_000;
const PREPROD_PROJECT_REF="hnqlnvakzaywtafeiybt";
const ALLOWED_ORIGINS=new Set([
  "https://app.fenixcapital.es",
  "https://www.app.fenixcapital.es"
]);

type GithubRun={
  id:number;
  name?:string;
  path?:string;
  status?:string;
  conclusion?:string|null;
  event?:string;
  html_url?:string;
  created_at?:string;
  run_started_at?:string|null;
  updated_at?:string;
  head_sha?:string;
};

type GithubStep={name?:string;status?:string;conclusion?:string|null;number?:number};
type GithubJob={name?:string;status?:string;conclusion?:string|null;steps?:GithubStep[]};

type ProgressProjection={
  progress_percent:number|null;
  progress_completed_steps:number|null;
  progress_total_steps:number|null;
  current_step:string|null;
  next_step:string|null;
  progress_provenance:"REAL_GITHUB_JOBS"|"TERMINAL_STATUS"|"UNAVAILABLE";
};

type ActivityPayload={
  status:"OK"|"ERROR";
  observed_at:string;
  source:"GITHUB_ACTIONS";
  source_status:"LIVE"|"CACHED"|"UNAVAILABLE";
  repository:string;
  runs:Array<Record<string,unknown>>;
  reason?:string;
};

let cache:{at:number;payload:ActivityPayload}|null=null;

function cors(origin:string|null){
  const headers:Record<string,string>={
    "content-type":"application/json; charset=utf-8",
    "cache-control":"no-store",
    "vary":"origin"
  };
  if(origin&&ALLOWED_ORIGINS.has(origin))headers["access-control-allow-origin"]=origin;
  return headers;
}

function json(req:Request,status:number,body:unknown){
  return new Response(JSON.stringify(body),{status,headers:cors(req.headers.get("origin"))});
}

function actorContextRpc(supabaseUrl:string){
  return supabaseUrl.includes(PREPROD_PROJECT_REF)
    ?"preprod_test_actor_context_by_auth_server"
    :"fenix_prod_actor_context_by_auth_server";
}

async function authorizedOwner(req:Request){
  const U=Deno.env.get("SUPABASE_URL")??"";
  const A=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  const bearer=req.headers.get("authorization")??"";
  if(!U||!A||!S||!bearer.toLowerCase().startsWith("bearer "))return false;
  const auth=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser(bearer.slice(7));
  if(ue||!ud.user)return false;
  const {data:ctx,error:ce}=await svc.rpc(actorContextRpc(U),{p_auth_user_id:ud.user.id});
  return Boolean(!ce&&ctx?.ok&&String(ctx.actor_code)==="CARLOS-ADMIN");
}

function githubHeaders(){
  const headers:Record<string,string>={
    "accept":"application/vnd.github+json",
    "x-github-api-version":"2022-11-28",
    "user-agent":"cerebro-console-activity-v0"
  };
  const token=(Deno.env.get("GITHUB_TOKEN")??"").trim();
  if(token)headers.authorization=`Bearer ${token}`;
  return headers;
}

function engineId(name:string){
  return name.match(/\b([A-Z][A-Z0-9]{1,15}-\d{3})\b/)?.[1]??null;
}

function workflowAlias(name:string){
  const declared=engineId(name);
  if(declared)return{alias:declared,provenance:"ENGINE_ID" as const};
  const upper=name.toUpperCase();
  if(upper.includes("OPERATIVA"))return{alias:"OPERATIVA",provenance:"DERIVED_WORKFLOW_NAME" as const};
  if(upper.includes("PROD LIVE DEPLOY"))return{alias:"DEPLOY",provenance:"DERIVED_WORKFLOW_NAME" as const};
  if(upper.includes("RUNTIME")&&upper.includes("SMOKE"))return{alias:"SMOKE",provenance:"DERIVED_WORKFLOW_NAME" as const};
  if(upper.includes("VOICE"))return{alias:"VOICE",provenance:"DERIVED_WORKFLOW_NAME" as const};
  if(upper.includes("FACTORY")||upper.includes("FABRICA"))return{alias:"FACTORY",provenance:"DERIVED_WORKFLOW_NAME" as const};
  const compact=upper
    .replace(/\bCEREBRO\b/g,"")
    .replace(/\bPREPROD\b|\bPROD\b|\bLIVE\b/g,"")
    .replace(/[^A-Z0-9]+/g," ")
    .trim();
  return{alias:(compact||"WORKFLOW").slice(0,18),provenance:"DERIVED_WORKFLOW_NAME" as const};
}

function environment(name:string,path:string){
  const text=`${name} ${path}`.toUpperCase();
  if(text.includes("PREPROD")||text.includes("STAGING"))return "PREPROD";
  if(text.includes("PROD")||text.includes("LIVE"))return "PROD";
  if(text.includes("LAB"))return "LAB";
  return "UNKNOWN";
}

function isCerebroWorkflow(run:GithubRun){
  const text=`${run.name??""} ${run.path??""}`.toUpperCase();
  return text.includes("CEREBRO")||text.includes("PROD LIVE DEPLOY")||text.includes("ENGINE FACTORY");
}

function terminalProgress(run:GithubRun):ProgressProjection{
  if(String(run.status)==="completed")return{
    progress_percent:100,
    progress_completed_steps:null,
    progress_total_steps:null,
    current_step:"Finalizado",
    next_step:null,
    progress_provenance:"TERMINAL_STATUS"
  };
  return{
    progress_percent:null,
    progress_completed_steps:null,
    progress_total_steps:null,
    current_step:null,
    next_step:null,
    progress_provenance:"UNAVAILABLE"
  };
}

async function liveProgress(run:GithubRun):Promise<ProgressProjection>{
  if(String(run.status)!=="in_progress")return terminalProgress(run);
  // Step-level progress is only queried when an authenticated GitHub token is available.
  // This avoids exhausting the public API quota while preserving a zero-additional-cost design.
  if(!(Deno.env.get("GITHUB_TOKEN")??"").trim())return terminalProgress(run);
  try{
    const response=await fetch(`https://api.github.com/repos/${REPOSITORY}/actions/runs/${run.id}/jobs?per_page=100`,{headers:githubHeaders()});
    if(!response.ok)return terminalProgress(run);
    const data=await response.json() as {jobs?:GithubJob[]};
    const jobs=data.jobs??[];
    const steps=jobs.flatMap(job=>(job.steps??[]).map(step=>({...step,job_name:job.name??"Job"})));
    if(!steps.length){
      const currentJob=jobs.find(job=>job.status==="in_progress")?.name??null;
      return{...terminalProgress(run),current_step:currentJob};
    }
    const completed=steps.filter(step=>step.status==="completed").length;
    const total=steps.length;
    const current=steps.find(step=>step.status==="in_progress");
    const currentIndex=current?steps.indexOf(current):-1;
    const next=steps.slice(Math.max(0,currentIndex+1)).find(step=>step.status!=="completed");
    return{
      progress_percent:Math.max(0,Math.min(99,Math.round((completed/total)*100))),
      progress_completed_steps:completed,
      progress_total_steps:total,
      current_step:current?`${current.job_name} · ${current.name??"Paso"}`:(jobs.find(job=>job.status==="in_progress")?.name??null),
      next_step:next?`${next.job_name} · ${next.name??"Paso"}`:null,
      progress_provenance:"REAL_GITHUB_JOBS"
    };
  }catch{return terminalProgress(run)}
}

async function projectRun(run:GithubRun){
  const workflowName=String(run.name??"CEREBRO workflow");
  const workflowPath=String(run.path??"");
  const alias=workflowAlias(workflowName);
  const progress=await liveProgress(run);
  return{
    run_id:run.id,
    workflow_name:workflowName,
    workflow_alias:alias.alias,
    workflow_path:workflowPath,
    status:String(run.status??"unknown"),
    conclusion:run.conclusion??null,
    event:String(run.event??"unknown"),
    html_url:String(run.html_url??""),
    created_at:String(run.created_at??""),
    run_started_at:run.run_started_at?String(run.run_started_at):null,
    updated_at:String(run.updated_at??""),
    engine_id:engineId(workflowName),
    company_id:"fenix",
    environment:environment(workflowName,workflowPath),
    version:String(run.head_sha??"").slice(0,12)||"UNKNOWN",
    source:"GITHUB_ACTIONS",
    provenance:"REAL",
    company_provenance:"DERIVED_REPOSITORY_SCOPE",
    alias_provenance:alias.provenance,
    ...progress
  };
}

async function loadActivity():Promise<ActivityPayload>{
  const now=Date.now();
  if(cache&&now-cache.at<CACHE_TTL_MS){
    return{...cache.payload,source_status:"CACHED",observed_at:new Date().toISOString()};
  }
  try{
    const response=await fetch(RUNS_URL,{headers:githubHeaders()});
    if(!response.ok)throw new Error(`GITHUB_${response.status}`);
    const data=await response.json() as {workflow_runs?:GithubRun[]};
    const selected=(data.workflow_runs??[]).filter(isCerebroWorkflow).slice(0,24);
    const runs=await Promise.all(selected.map(projectRun));
    const payload:ActivityPayload={
      status:"OK",
      observed_at:new Date().toISOString(),
      source:"GITHUB_ACTIONS",
      source_status:"LIVE",
      repository:REPOSITORY,
      runs
    };
    cache={at:now,payload};
    return payload;
  }catch(error){
    if(cache){
      return{...cache.payload,source_status:"CACHED",observed_at:new Date().toISOString(),reason:String(error)};
    }
    return{
      status:"ERROR",
      observed_at:new Date().toISOString(),
      source:"GITHUB_ACTIONS",
      source_status:"UNAVAILABLE",
      repository:REPOSITORY,
      runs:[],
      reason:String(error)
    };
  }
}

export default{
  fetch:withSupabase({auth:"user"},async(req)=>{
    const origin=req.headers.get("origin");
    if(req.method==="OPTIONS"){
      if(!origin||!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
      return new Response(null,{status:204,headers:{
        "access-control-allow-origin":origin,
        "access-control-allow-methods":"GET,OPTIONS",
        "access-control-allow-headers":"authorization,apikey,content-type",
        "access-control-max-age":"600",
        "vary":"origin"
      }});
    }
    if(req.method!=="GET")return json(req,405,{status:"CLOSED",reason:"READ_ONLY"});
    if(!await authorizedOwner(req))return json(req,403,{status:"FORBIDDEN",reason:"OWNER_ONLY"});
    const payload=await loadActivity();
    return json(req,payload.status==="OK"?200:503,payload);
  })
};
