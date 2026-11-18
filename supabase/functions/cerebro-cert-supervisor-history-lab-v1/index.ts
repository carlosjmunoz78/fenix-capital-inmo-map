import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";

/** CEREBRO LAB: owner-only, read-only, HMAC-verified persisted certification watchdog.
 * The scheduled job is pg_cron job #77; HTTP reads do not trigger execution.
 */
const LAB="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const SLUG="cerebro-cert-supervisor-history-lab-v1";
const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{
 status,headers:{"content-type":"application/json; charset=utf-8",
  "cache-control":"private,no-store,max-age=0","vary":"authorization",
  "x-content-type-options":"nosniff","x-frame-options":"DENY"}});
const fail=(code:number,reason:string)=>reply(code,{status:"UNAVAILABLE",reason,read_only:true,executed:false});
Deno.serve(async req=>{
 const u=new URL(req.url);
 if(req.method!=="GET")return fail(405,"READ_ONLY");
 if(!["/"+SLUG,"/functions/v1/"+SLUG].includes(u.pathname))return fail(404,"FIXED_ROUTE");
 if(u.searchParams.getAll("company_id").length!==1||
    u.searchParams.getAll("environment").length!==1||
    u.searchParams.get("company_id")!=="fenix"||u.searchParams.get("environment")!=="LAB"||
    [...u.searchParams.keys()].some(k=>k!=="company_id"&&k!=="environment"))
   return fail(403,"FENIX_LAB_ONLY");
 const authorization=req.headers.get("authorization")||"";
 const apikey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(authorization)||apikey.length<12||apikey.length>256)
  return fail(401,"OWNER_SESSION_REQUIRED");
 try{
  const r=await fetch(OWNER,{method:"GET",redirect:"error",cache:"no-store",
   headers:{authorization,apikey,accept:"application/json"},
   signal:AbortSignal.timeout(6500)});
  if(r.status!==200)return fail(403,"OWNER_DENIED");
  const p=await r.json(),ctx=p?.context&&typeof p.context==="object"?p.context:p;
  if(p?.ok===false||ctx?.actor_code!=="CARLOS-ADMIN")return fail(403,"OWNER_DENIED");
 }catch{return fail(503,"OWNER_RESOLVER_UNAVAILABLE")}
 const url=Deno.env.get("SUPABASE_URL")||"";
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(url!==LAB||key.length<25)return fail(503,"LAB_CONFIG_INVALID");
 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.rpc("cerebro_lab_cert_supervisor_observe_v1");
  if(error||!data)return fail(503,"SUPERVISOR_HISTORY_UNAVAILABLE");
  if(data.status==="INTEGRITY_FAILURE"||data.signed===false)return fail(503,"SUPERVISOR_HMAC_INVALID");
  if(data.status!=="OK"||data.source!=="CEREBRO_CERT_SUPERVISOR_DURABLE_LAB_V1"||
    data.company_id!=="fenix"||data.environment!=="LAB"||
    data.signed!==true||data.global_autonomy_certified!==false||
    data.excellence_certified!==false||data.prod_execution_enabled!==false||
    data.cost_measured!==false||!Number.isSafeInteger(data.history_count)||
    data.history_count<1||data.gate_count!==5||
    !Number.isFinite(Date.parse(data.observed_at))||
    typeof data.receipt_id!=="string"||!/^[a-f0-9-]{36}$/.test(data.receipt_id)||
    !["EVIDENCE_OK_NOT_CERTIFIED","GATE_HOLD"].includes(data.health))
    return fail(503,"SUPERVISOR_HISTORY_CONTRACT_INVALID");
  return reply(200,{...data,read_only:true,executed:false,
    cron_job_id:77,schedule:"3,18,33,48 * * * *",mode:"LAB_ONLY",
    actual_engine_promotion:false});
 }catch{return fail(503,"SUPERVISOR_HISTORY_READ_FAILED")}
});