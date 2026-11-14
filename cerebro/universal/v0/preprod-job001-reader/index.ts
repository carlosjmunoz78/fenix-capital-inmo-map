import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
import {projectJob001ReadSnapshot,projectCronObservation,projectDispatchRpcObservation,projectSeoBacklogObservation,ownerIsVerified} from "./job001-projection.mjs";

const PROD_OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const MAX_BODY=45000;
function json(status:number,value:unknown){
 return new Response(JSON.stringify(value),{status,headers:{
  "content-type":"application/json; charset=utf-8",
  "cache-control":"private, no-store, max-age=0",
  "x-content-type-options":"nosniff",
  "x-frame-options":"DENY",
  "vary":"authorization"
 }});
}
function secretlessFailure(reason:string,status=503){
 return json(status,{status:"UNAVAILABLE",reason,source:"PREPROD_JOB001_CONTROL_METADATA",
  live_execution_verified:false,actual_dispatch_enabled:false,write_operations:0});
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json(405,{status:"CLOSED",reason:"READ_ONLY"});
 const url=new URL(req.url);
 if(url.pathname!=="/cerebro-operativa-job001-read-lab-v0"&&
    url.pathname!=="/functions/v1/cerebro-operativa-job001-read-lab-v0")
  return json(404,{status:"CLOSED",reason:"ROUTE_NOT_AVAILABLE"});
 if(url.searchParams.get("company_id")!=="fenix"||url.searchParams.get("environment")!=="LAB"||
    [...url.searchParams.keys()].some(k=>k!=="company_id"&&k!=="environment"))
  return json(403,{status:"CLOSED",reason:"FENIX_LAB_SCOPE_ONLY"});
 const authorization=req.headers.get("authorization")||"";
 const apikey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(authorization)||apikey.length<12||apikey.length>256)
  return json(401,{status:"CLOSED",reason:"OWNER_SESSION_REQUIRED"});
 let ownerResponse;
 try{
  ownerResponse=await fetch(PROD_OWNER,{
   method:"GET",headers:{authorization,apikey,accept:"application/json"},
   redirect:"error",cache:"no-store",signal:AbortSignal.timeout(8000)
  });
 }catch{return secretlessFailure("OWNER_RESOLVER_UNAVAILABLE",401)}
 if(!ownerResponse.ok)return secretlessFailure("OWNER_CONTEXT_NOT_AUTHORIZED",403);
 let principal;
 try{principal=await ownerResponse.json()}catch{return secretlessFailure("OWNER_CONTEXT_INVALID",403)}
 if(!ownerIsVerified(principal))
  return secretlessFailure("OWNER_ONLY",403);
 const dbUrl=Deno.env.get("SUPABASE_URL")||"";
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!dbUrl.endsWith(".supabase.co")||!serviceKey)return secretlessFailure("PREPROD_DB_AUTH_UNAVAILABLE");
 // This function lives only in the separate existing PREPROD project and
 // uses its built-in server-side service key; never forward it to any caller.
 if(!dbUrl.startsWith("https://hnqlnvakzaywtafeiybt.supabase.co"))
  return secretlessFailure("PREPROD_PROJECT_MISMATCH");
 try{
  const db=createClient(dbUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const [jobs,external,engines,telemetry,cron,rpcStats,seoBacklog]=await Promise.all([
   db.from("cerebro_job001_control_preprod")
    .select("job_id,company_id,engine_id,environment,version,enabled,updated_at")
    .eq("company_id","FENIX_CAPITAL").eq("environment","PREPROD").limit(64),
   db.from("cerebro_external_job_control_preprod")
    .select("job_id,company_id,engine_id,environment,version,enabled,updated_at")
    .eq("company_id","FENIX_CAPITAL").eq("environment","PREPROD").limit(64),
   db.from("cerebro_company_engine_state_preprod")
    .select("company_id,engine_id,environment,version,state,updated_at")
    .eq("company_id","fenix").eq("environment","PREPROD").limit(64),
   db.from("cerebro_job001_telemetry_preprod")
    .select("company_id",{head:true,count:"exact"}).eq("company_id","fenix"),
   db.rpc("cerebro_job001_pgcron_observation_lab_v0"),
   db.rpc("cerebro_operativa_job001_rpc_observation_lab_v0"),
   db.rpc("cerebro_operativa_seo_backlog_summary_lab_v0").abortSignal(AbortSignal.timeout(3500))
  ]);
  if(jobs.error||external.error||engines.error||telemetry.error)
   return secretlessFailure("PREPROD_READ_FAILED");
  const snapshot=projectJob001ReadSnapshot({
   jobs:jobs.data,external:external.data,engines:engines.data,
   telemetryCount:telemetry.count,observedAt:new Date().toISOString()
  });
  // The cron observation is optional: a failure never falsifies source control records.
  const cron_observation=projectCronObservation(cron.error?null:cron.data,{observedAt:new Date().toISOString()});
  const rpc_observation=projectDispatchRpcObservation(rpcStats.error?null:rpcStats.data);
  const seo_backlog=projectSeoBacklogObservation(seoBacklog.error?null:seoBacklog.data);
  if(seo_backlog.status!=='OK'){
   // Only fixed error codes. Never log request bodies, SQL, URLs or credentials.
   const known=new Set(['PGRST202','PGRST301','42501','42P01','PGRST116']);
   const code=String(seoBacklog.error?.code||'');
   console.info(JSON.stringify({event:'CEREBRO_LAB_SEO_BACKLOG_DIAGNOSTIC',
    reason:known.has(code)?code:(seoBacklog.error?'RPC_UNAVAILABLE':'PROJECTION_INVALID'),
    staging_probed:false,execution_triggered:false}));
  }
  const result={...snapshot,cron_observation,rpc_observation,seo_backlog};
  const encoded=JSON.stringify(result);
  if(encoded.length>MAX_BODY)return secretlessFailure("RESULT_TOO_LARGE");
  return json(200,result);
 }catch{return secretlessFailure("READ_EXCEPTION")}
});
