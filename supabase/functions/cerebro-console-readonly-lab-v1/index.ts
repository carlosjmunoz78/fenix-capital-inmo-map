import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";

// CONSOLE-001 read-only public GitHub metadata task executed and HMAC-sealed in LAB SQL.
// This observer never invokes the legacy OIDC-backed dispatcher or changes its job queue.
const LAB="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const SLUG="cerebro-console-readonly-lab-v1";
const respond=(status:number,value:unknown)=>new Response(JSON.stringify(value),
 {status,headers:{"content-type":"application/json; charset=utf-8",
  "cache-control":"private,no-store,max-age=0","vary":"authorization",
  "x-frame-options":"DENY","x-content-type-options":"nosniff"}});
const reject=(status:number,reason:string)=>respond(status,{status:"UNAVAILABLE",reason,
 read_only:true,executed:false});
Deno.serve(async req=>{
 const u=new URL(req.url);
 if(req.method!=="GET")return reject(405,"READ_ONLY");
 if(!["/"+SLUG,"/functions/v1/"+SLUG].includes(u.pathname))return reject(404,"FIXED_ROUTE_ONLY");
 if(u.searchParams.getAll("company_id").length!==1||
    u.searchParams.getAll("environment").length!==1||
    u.searchParams.get("company_id")!=="fenix"||u.searchParams.get("environment")!=="LAB"||
    [...u.searchParams.keys()].some(k=>k!=="company_id"&&k!=="environment"))
   return reject(403,"LAB_SCOPE_DENIED");
 const jwt=req.headers.get("authorization")||"";
 const ownerKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(jwt)||ownerKey.length<12||ownerKey.length>256)
   return reject(401,"OWNER_SESSION_REQUIRED");
 try{
  const r=await fetch(OWNER,{method:"GET",cache:"no-store",redirect:"error",
   headers:{authorization:jwt,apikey:ownerKey,accept:"application/json"},
   signal:AbortSignal.timeout(6500)});
  if(r.status!==200)return reject(403,"OWNER_DENIED");
  const d=await r.json(),c=d?.context&&typeof d.context==="object"?d.context:d;
  if(d?.ok===false||c?.actor_code!=="CARLOS-ADMIN")return reject(403,"OWNER_DENIED");
 }catch{return reject(503,"OWNER_RESOLVER_UNAVAILABLE")}
 const url=Deno.env.get("SUPABASE_URL")||"";
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(url!==LAB||key.length<25)return reject(503,"LAB_BACKEND_INVALID");
 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.rpc("cerebro_lab_console_repo_observe_v1");
  if(error||!data)return reject(503,"LAB_JOB_RECEIPT_UNAVAILABLE");
  if(data.status==="INTEGRITY_FAILURE"||data.signed!==true)return reject(503,"JOB_SIGNATURE_FAILURE");
  if(data.status!=="OK"||data.source!=="CEREBRO_CONSOLE_READONLY_LAB_V1"||
    data.company_id!=="fenix"||data.environment!=="LAB"||
    data.engine_id!=="CONSOLE-001"||
    data.capability_id!=="repo.sandbox.public.readonly.v0"||
    data.repository!=="carlosjmunoz78/fenix-capital-inmo-map"||
    data.branch!=="main"||data.execution_state!=="SUCCEEDED"||
    data.http_status!==200||data.specific_capability_evidenced!==true||
    data.agent_role_identity_verified!==false||data.full_engine_certified!==false||
    data.legacy_worker_executed!==false||data.autonomy_certified!==false||
    data.external_actions_executed!==false||data.prod_execution_enabled!==false||
    data.marginal_cost_eur_measured!==false||
    !Number.isSafeInteger(data.completed_job_count)||data.completed_job_count<1||
    typeof data.job_id!=="string"||!/^[a-f0-9-]{36}$/.test(data.job_id)||
    typeof data.observed_commit_sha!=="string"||!/^[a-f0-9]{40}$/.test(data.observed_commit_sha)||
    !Number.isFinite(Date.parse(data.last_execution_at)))
     return reject(503,"LAB_JOB_CONTRACT_INVALID");
  return respond(200,{...data,read_only:true,
   executed_job:true,github_actions_used:false,
   original_dispatcher_unchanged:true,cron_enqueue_job_id:82,cron_collect_job_id:83});
 }catch{return reject(503,"LAB_JOB_READ_FAILED")}
});