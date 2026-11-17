/** LAB-only, owner-verified, aggregation-only view of historical job/worker metadata.
 * No job IDs, private payloads, worker identities, writes, cron or provider secrets in response.
 * Verify the PROD-issued owner JWT against existing Fénix identity endpoint.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";
import {projectAgentJobSummary} from "./job-projection.mjs";
const PROJECT="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const NAME="cerebro-operativa-job-telemetry-lab-v0";
const json=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"private, no-store, max-age=0",
 "vary":"Authorization","x-content-type-options":"nosniff","x-frame-options":"DENY"}});
const unavailable=(reason:string)=>json(503,{status:"UNAVAILABLE",reason,read_only:true,executed:false});
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return json(405,{status:"CLOSED",reason:"READ_ONLY"});
 const url=new URL(req.url);
 if(!["/"+NAME,"/functions/v1/"+NAME].includes(url.pathname))return json(404,{status:"CLOSED",reason:"ROUTE_DENIED"});
 if(url.searchParams.getAll("company_id").length!==1||
  url.searchParams.getAll("environment").length!==1||
  url.searchParams.get("company_id")!=="fenix"||url.searchParams.get("environment")!=="LAB"||
  [...url.searchParams.keys()].some(k=>!["company_id","environment"].includes(k)))
  return json(403,{status:"CLOSED",reason:"FENIX_LAB_SCOPE_ONLY"});
 const authorization=req.headers.get("authorization")||"",
  ownerKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(authorization)||ownerKey.length<12||ownerKey.length>256)
  return json(401,{status:"CLOSED",reason:"OWNER_REQUIRED"});
 try{
  const auth=await fetch(OWNER,{method:"GET",headers:{authorization,apikey:ownerKey,accept:"application/json"},
   redirect:"error",cache:"no-store",signal:AbortSignal.timeout(6500)});
  if(auth.status!==200)return json(403,{status:"CLOSED",reason:"OWNER_DENIED"});
  const raw=await auth.json(),ctx=raw?.context&&typeof raw.context==="object"?raw.context:raw;
  if(ctx?.actor_code!=="CARLOS-ADMIN"||raw?.ok===false)
   return json(403,{status:"CLOSED",reason:"OWNER_DENIED"});
 }catch{return unavailable("OWNER_RESOLVER_UNAVAILABLE")}
 const dbUrl=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(dbUrl!==PROJECT||key.length<25)return unavailable("LAB_DB_AUTH_UNAVAILABLE");
 try{
  const db=createClient(dbUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const [jarvis,browser,creative,metrics]=await Promise.all([
   db.from("jarvis_work_job_v1").select("company_id,environment,engine_id,status,created_at,updated_at,heartbeat_at,lease_expires_at",{count:"exact"})
    .eq("company_id","fenix").in("environment",["LAB","PREPROD"]).limit(301),
   db.from("cerebro_browser_job_v2").select("company_id,environment,engine_id,status,created_at,updated_at,last_heartbeat_at,lease_expires_at",{count:"exact"})
    .eq("company_id","fenix").in("environment",["LAB","PREPROD"]).limit(301),
   db.from("cerebro_creative_job_v1").select("company_id,environment,engine_id,status,created_at,updated_at,lease_expires_at",{count:"exact"})
    .eq("company_id","fenix").in("environment",["LAB","PREPROD"]).limit(301),
   db.from("cerebro_browser_worker_metric_v2").select("company_id,environment,outcome,created_at,duration_ms,incremental_cost_eur,secret_material_logged",{count:"exact"})
    .eq("company_id","fenix").in("environment",["LAB","PREPROD"]).limit(301)
  ]);
  const sources=[jarvis,browser,creative,metrics];
  if(sources.some(x=>x.error))return unavailable("JOB_SOURCE_READ_FAILED");
  if(sources.some(x=>x.count===null||x.count>300||x.data?.length!==x.count))
   return unavailable("JOB_SOURCE_LIMIT_EXCEEDED");
  const projected=projectAgentJobSummary({jarvis:jarvis.data||[],browser:browser.data||[],
   creative:creative.data||[],metrics:metrics.data||[],observedAt:new Date().toISOString()});
  if(!projected)return unavailable("JOB_PROJECTION_CONTRACT_INVALID");
  if(JSON.stringify(projected).length>24000)return unavailable("JOB_RESPONSE_SIZE_LIMIT");
  return json(200,projected);
 }catch{return unavailable("JOB_OBSERVATION_UNAVAILABLE")}
});
