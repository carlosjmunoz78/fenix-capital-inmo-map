import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";

// LAB-only owner readout; pg_cron performs all GET health probes.
// No legacy dispatcher is executed or granted an alternative OIDC token.
const LAB="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const SLUG="cerebro-dispatch-health-lab-v1";
const EXPECTED=new Set([
 "jarvis-work-dispatch-v1-preprod",
 "cerebro-browser-work-total-dispatch-v1-preprod",
 "cerebro-creative-dispatch-v1",
 "cerebro-ums-production-dispatch-v1"
]);
const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private,no-store,max-age=0",
 "vary":"authorization","x-frame-options":"DENY","x-content-type-options":"nosniff"}});
const fail=(status:number,reason:string)=>respond(status,{
 status:"UNAVAILABLE",reason,read_only:true,executed:false});
Deno.serve(async req=>{
 const u=new URL(req.url);
 if(req.method!=="GET")return fail(405,"READ_ONLY");
 if(!["/"+SLUG,"/functions/v1/"+SLUG].includes(u.pathname))return fail(404,"ROUTE_NOT_SUPPORTED");
 if(u.searchParams.getAll("company_id").length!==1||
    u.searchParams.getAll("environment").length!==1||
    u.searchParams.get("company_id")!=="fenix"||
    u.searchParams.get("environment")!=="LAB"||
    [...u.searchParams.keys()].some(x=>x!=="company_id"&&x!=="environment"))
    return fail(403,"FENIX_LAB_ONLY");
 const auth=req.headers.get("authorization")||"";
 const ownerKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(auth)||ownerKey.length<12||ownerKey.length>256)
   return fail(401,"OWNER_SESSION_REQUIRED");
 try{
  const r=await fetch(OWNER,{method:"GET",cache:"no-store",redirect:"error",
   headers:{authorization:auth,apikey:ownerKey,accept:"application/json"},
   signal:AbortSignal.timeout(6500)});
  if(r.status!==200)return fail(403,"OWNER_DENIED");
  const body=await r.json(),ctx=body?.context&&typeof body.context==="object"?body.context:body;
  if(body?.ok===false||ctx?.actor_code!=="CARLOS-ADMIN")return fail(403,"OWNER_DENIED");
 }catch{return fail(503,"OWNER_AUTHENTICATION_UNAVAILABLE")}
 const backend=Deno.env.get("SUPABASE_URL")||"";
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(backend!==LAB||serviceKey.length<25)return fail(503,"LAB_BACKEND_UNAVAILABLE");
 try{
  const db=createClient(backend,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.rpc("cerebro_lab_dispatch_health_observe_v1");
  if(error||!data)return fail(503,"PROBE_RECEIPTS_UNAVAILABLE");
  if(data.source!=="CEREBRO_LAB_DISPATCH_HEALTH_SIGNED_V1"||
     data.company_id!=="fenix"||data.environment!=="LAB"||
     data.prod_execution_enabled!==false||data.legacy_jobs_executed!==false||
     data.full_engine_certified!==false||
     data.github_actions_required_to_execute_original_workers!==true||
     data.runner_capability!=="HTTP_HEALTH_ONLY"||
     !["HEALTH_ENDPOINTS_RESPOND","DEGRADED_OR_NOT_CHECKED"].includes(data.status)||
     !Array.isArray(data.sources)||data.sources.length>4||
     !Number.isSafeInteger(data.signed_samples)||data.signed_samples!==data.sources.length||
     !Number.isSafeInteger(data.healthy_endpoints)||data.healthy_endpoints>data.signed_samples||
     new Set(data.sources.map((x:any)=>x.service)).size!==data.sources.length||
     data.sources.some((x:any)=>!EXPECTED.has(x.service)||
       !["CONSOLE-001","FACT-001","UMS-001"].includes(x.engine_id)||
       x.runtime_execution_verified!==false||x.autonomy_certified!==false||
       x.signature_verified!==true||typeof x.recent!=="boolean"||
       !Number.isFinite(Date.parse(x.last_checked_at||""))||
       !["HEALTH_ENDPOINT_OK","HEALTH_ENDPOINT_FAILED","NO_RESPONSE"].includes(x.health_state)))
    return fail(503,"PROBE_INTEGRITY_OR_CONTRACT_FAILURE");
  return respond(200,{...data,read_only:true,executed:false,
   additional_subscriptions_eur:0,scheduled_probe: "8,38 * * * *",
   scheduled_collect:"10,40 * * * *",signed_by_private_db_key:true,
   certifies_original_executors:false});
 }catch{return fail(503,"PROBE_OBSERVATION_FAILED")}
});