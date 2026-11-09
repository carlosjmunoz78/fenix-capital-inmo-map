import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
import {createRemoteJWKSet,jwtVerify} from "npm:jose@5.10.0";

// An isolated signed-OIDC worker for ONE pinned PREPROD job. No PROD, no rearm.
const PROJECT="hnqlnvakzaywtafeiybt";
const REPO="carlosjmunoz78/fenix-capital-inmo-map";
const REF="refs/heads/cerebro/jarvis-oidc-execute-once-lab-v0-20261109";
const WORKFLOW=".github/workflows/cerebro-jarvis-oidc-execute-once-lab-v0.yml";
const AUD="jarvis-oidc-execute-once-lab-v0";
const SLUG="jarvis-oidc-execute-once-lab-v0";
const JOB_ID="006df2c9-282f-48d0-8ce8-6af8d3d6b5ae";
const JOB_NAME="jarvis.oidc.repohead.oneshot.lab.v0";
const IDEM="jarvis-oidc-one-readonly-20261109-v0";
const TARGET="cerebro/jarvis-work-codex-complete-20261102";
const PIN="39bc098f322c6981d0d703c5813a7234a5742e8f";
const JWKS=createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST"||!new URL(req.url).pathname.endsWith("/"+SLUG+"/execute"))
    return reply(404,{status:"NOT_AVAILABLE"});
  if((Deno.env.get("SUPABASE_URL")??"")!=="https://"+PROJECT+".supabase.co")
    return reply(403,{status:"DENIED",reason:"PROJECT_SCOPE_DENIED"});
  const bearer=req.headers.get("authorization")??"";
  if(!bearer.startsWith("Bearer ")||bearer.length>8199)
    return reply(403,{status:"DENIED",reason:"GITHUB_OIDC_REQUIRED"});
  let run="";
  try{
    const {payload}=await jwtVerify(bearer.slice(7),JWKS,{
      issuer:"https://token.actions.githubusercontent.com",audience:AUD,algorithms:["RS256"],clockTolerance:5
    });
    const now=Math.floor(Date.now()/1000);
    if(payload.repository!==REPO||payload.ref!==REF||
       payload.workflow_ref!==REPO+"/"+WORKFLOW+"@"+REF||
       payload.event_name!=="push"||typeof payload.sub!=="string"||!payload.sub||
       typeof payload.sha!=="string"||!/^[a-f0-9]{40}$/.test(payload.sha)||
       typeof payload.run_id!=="string"||!/^[0-9]+$/.test(payload.run_id)||
       String(payload.run_attempt??"1")!=="1"||
       typeof payload.iat!=="number"||typeof payload.exp!=="number"||
       payload.iat>now+5||payload.iat<now-300||payload.exp>now+600)
      return reply(403,{status:"DENIED",reason:"OIDC_SCOPE_DENIED"});
    run=payload.run_id;
  }catch{return reply(403,{status:"DENIED",reason:"OIDC_INVALID"});}
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!secret)return reply(503,{status:"UNAVAILABLE",reason:"SERVER_CONFIG_MISSING"});
  const db=createClient("https://"+PROJECT+".supabase.co",secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const worker="jarvis-oidc-once:"+run;
  const {data:rows,error:e}=await db.from("jarvis_work_job_v1")
    .select("job_id,company_id,engine_id,environment,version,name,status,attempts,max_attempts,idempotency_key,payload")
    .eq("company_id","fenix").eq("environment","PREPROD").eq("name",JOB_NAME).limit(2);
  if(e||!rows||rows.length!==1)return reply(409,{status:"BLOCKED",reason:"ONE_JOB_REQUIRED"});
  const job=rows[0];
  if(job.job_id!==JOB_ID||job.engine_id!=="CONSOLE-001"||job.environment!=="PREPROD"||
     job.version!=="v0"||job.idempotency_key!==IDEM||job.status!=="QUEUED"||
     job.attempts!==0||job.max_attempts!==1||
     job.payload?.operation!=="READ_GITHUB_BRANCH_HEAD"||
     job.payload?.repo!==REPO||job.payload?.branch!==TARGET||
     job.payload?.expected_sha!==PIN||job.payload?.read_only!==true||job.payload?.once!==true)
    return reply(409,{status:"BLOCKED",reason:"JOB_NOT_ELIGIBLE"});
  const {data:lease,error:leaseError}=await db.rpc("jarvis_work_lease_named_v1",{
    p_worker_id:worker,p_job_name:JOB_NAME,p_company_id:"fenix",
    p_environment:"PREPROD",p_lease_seconds:90
  });
  const active=lease?.job;
  if(leaseError||!active||active.job_id!==JOB_ID||!active.lease_id||
     active.worker_id!==worker||active.status!=="RUNNING"||active.attempts!==1)
    return reply(409,{status:"BLOCKED",reason:"LEASE_NOT_CONFIRMED"});
  try{
    const u="https://api.github.com/repos/"+REPO+"/branches/"+encodeURIComponent(TARGET);
    const r=await fetch(u,{method:"GET",headers:{accept:"application/vnd.github+json","user-agent":"cerebro-jarvis-oidc-lab"},redirect:"error",signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw Error("GITHUB_READ_FAILED_"+r.status);
    const data=await r.json();
    const head=String(data?.commit?.sha??"");
    if(head!==PIN||data?.name!==TARGET)throw Error("PINNED_SHA_MISMATCH");
    const summary={status:"JARVIS_OIDC_ONESHOT_GIT_READ_LAB_GREEN",
      operation:"READ_GITHUB_BRANCH_HEAD",repository:REPO,branch:TARGET,
      head_sha:head,company_id:"fenix",engine_id:"CONSOLE-001",
      environment:"PREPROD",version:"v0",github_http:200,
      oidc_verified:true,read_only:true,prod_touched:false,
      trading_touched:false,app_touched:false,crm_touched:false,dns_touched:false,git_writes:0
    };
    const {data:done,error:doneError}=await db.rpc("jarvis_work_complete_v1",{
      p_job_id:JOB_ID,p_lease_id:active.lease_id,p_worker_id:worker,p_result_summary:summary
    });
    if(doneError||done?.job_id!==JOB_ID||done?.status!=="SUCCEEDED"||done?.attempts!==1)
      return reply(503,{status:"UNAVAILABLE",reason:"COMPLETION_NOT_VERIFIED"});
    return reply(200,{status:"SUCCEEDED",proof:summary.status,job_id:JOB_ID,
      attempts:1,source_sha:head,company_id:"fenix",engine_id:"CONSOLE-001",
      environment:"LAB",observed_environment:"PREPROD",version:"v0",
      verified_signed_oidc:true,auto_rearm:false,prod_touched:false,
      git_writes:0,one_job_state_updates_only:true});
  }catch(error){
    const detail=error instanceof Error?error.message:"READ_FAILED";
    await db.rpc("jarvis_work_fail_v1",{
      p_job_id:JOB_ID,p_lease_id:active.lease_id,p_worker_id:worker,
      p_error_code:"JARVIS_OIDC_ONESHOT_READ_FAILED",
      p_error_detail:detail.slice(0,200),p_retryable:false
    }).catch(()=>null);
    return reply(503,{status:"FAILED",reason:"ONE_SHOT_READ_FAILED"});
  }
});
