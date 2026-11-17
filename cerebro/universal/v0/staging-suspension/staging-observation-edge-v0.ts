import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const PREPROD="https://hnqlnvakzaywtafeiybt.supabase.co";
const PATH="/functions/v1/cerebro-universal-staging-observe-lab-v0";
const ID=/^lab-observe-[a-z0-9-]{12,48}$/;
function reply(status:number,body:unknown){
 return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store, max-age=0","vary":"authorization","x-content-type-options":"nosniff","x-frame-options":"DENY"}});
}
function closed(reason:string,code=403){return reply(code,{status:"CLOSED",reason,external_actions_executed:false});}
function validatedObservation(raw:unknown):raw is Record<string,unknown>{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return false;
 const x=raw as Record<string,unknown>;
 const j=x.staging_job001 as Record<string,unknown>|undefined;
 const c=x.staging_cron as Record<string,unknown>|undefined;
 const g=x.sql_guard as Record<string,unknown>|undefined;
 return x.status==="OK"&&x.state==="SUSPENDED_BY_OWNER"&&
  x.host==="staging.fenixcapital.es"&&x.company_id==="fenix"&&x.environment==="LAB"&&
  x.source_environment==="PREPROD"&&x.staging_probed===false&&
  x.executed_external_actions===false&&x.prod_execution_enabled===false&&
  x.global_isolation_verified===false&&
  x.source==="PREPROD_SQL_LIVE_AGGREGATE_NO_EXTERNAL_IO"&&
  typeof x.known_controls_closed==="boolean"&&
  j?.expected===15&&Number.isSafeInteger(j?.paused)&&
  c?.expected===14&&Number.isSafeInteger(c?.paused)&&
  g?.expected===4&&Number.isSafeInteger(g?.protected);
}
Deno.serve(async req=>{
 const u=new URL(req.url);
 if(u.pathname!==PATH&&u.pathname!=="/cerebro-universal-staging-observe-lab-v0")return closed("ROUTE_DENIED",404);
 if(req.method!=="GET"&&req.method!=="POST")return closed("METHOD_DENIED",405);
 const authorization=req.headers.get("authorization")||"";
 const ownerApiKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(authorization)||ownerApiKey.length<12||ownerApiKey.length>256)
  return closed("OWNER_SESSION_REQUIRED",401);
 if(u.search)return closed("QUERY_NOT_ALLOWED",403);
 let idempotency_key:string|null=null;
 if(req.method==="POST"){
  if(req.headers.get("content-type")?.split(";")[0].trim()!=="application/json")
   return closed("JSON_REQUIRED",415);
  let raw:any;
  try{const rawBody=await req.text();if(rawBody.length>800)return closed("BODY_TOO_LARGE",413);raw=JSON.parse(rawBody)}
  catch{return closed("BAD_JSON",400)}
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||
   Object.keys(raw).sort().join(",")!=="action,company_id,environment,idempotency_key"||
   raw.action!=="CAPTURE_SUSPENSION_EVIDENCE"||raw.company_id!=="fenix"||raw.environment!=="LAB"||
   typeof raw.idempotency_key!=="string"||!ID.test(raw.idempotency_key))
   return closed("CAPTURE_CONTRACT_REQUIRED",403);
  idempotency_key=raw.idempotency_key;
 }
 // Owner identity is verified against the EXISTING PROD session context, not via browser claims.
 let principal:any;
 try{
  const owner=await fetch(OWNER,{method:"GET",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(8500),
   headers:{authorization,apikey:ownerApiKey,accept:"application/json"}});
  if(!owner.ok)return closed("OWNER_DENIED",403);
  const raw=await owner.json();
  principal=raw?.context??raw;
  if(raw?.ok===false||principal?.actor_code!=="CARLOS-ADMIN")return closed("OWNER_DENIED",403);
 }catch{return closed("OWNER_CONTEXT_UNAVAILABLE",503)}
 const base=Deno.env.get("SUPABASE_URL")||"";
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(base!==PREPROD||!key)return closed("PREPROD_KEY_UNAVAILABLE",503);
 const db=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  // Fixed, read-only SQL aggregate: no HTTP call to staging, no cron changes.
  const live=await db.rpc("cerebro_universal_staging_status_lab_v0");
  if(live.error||!validatedObservation(live.data))return closed("LIVE_OBSERVATION_UNAVAILABLE",503);
  if(req.method==="GET")return reply(200,{status:"OBSERVED",source:"LIVE_STAGING_SUSPENSION_PREPROD",
   observation:live.data,executed_external_actions:false,prod_execution_enabled:false});
  // The only supported mutation is an isolated, durable evidence INSERT.
  const payload={company_id:"fenix",environment:"LAB",actor_code:"CARLOS-ADMIN",
   action:"STAGING_SUSPENSION_OBSERVATION",idempotency_key,snapshot:live.data,
   executed_external_actions:false,prod_execution_enabled:false,additional_cost_eur:0};
  const result=await db.from("cerebro_universal_staging_observation_lab_v0")
   .insert(payload).select("evidence_id,created_at").single();
  if(!result.error&&result.data)
   return reply(200,{status:"EVIDENCE_PERSISTED",source:"PREPROD_LAB_DURABLE_EVIDENCE",
    evidence_id:result.data.evidence_id,recorded_at:result.data.created_at,replayed:false,
    observation:live.data,observation_executed:true,executed_external_actions:false,
    prod_execution_enabled:false,additional_cost_eur:0});
  if(result.error?.code!=="23505")return closed("EVIDENCE_WRITE_UNAVAILABLE",503);
  const previous=await db.from("cerebro_universal_staging_observation_lab_v0")
   .select("evidence_id,created_at,snapshot,executed_external_actions,prod_execution_enabled")
   .eq("idempotency_key",idempotency_key!).eq("actor_code","CARLOS-ADMIN")
   .eq("company_id","fenix").eq("environment","LAB").maybeSingle();
  if(previous.error||!previous.data||previous.data.executed_external_actions!==false||
   previous.data.prod_execution_enabled!==false)
   return closed("IDEMPOTENCY_CONFLICT",409);
  return reply(200,{status:"EVIDENCE_PERSISTED",source:"PREPROD_LAB_DURABLE_EVIDENCE",
   evidence_id:previous.data.evidence_id,recorded_at:previous.data.created_at,replayed:true,
   observation:previous.data.snapshot,observation_executed:false,executed_external_actions:false,
   prod_execution_enabled:false,additional_cost_eur:0});
 }catch{return closed("PREPROD_OBSERVATION_EXCEPTION",503)}
});
