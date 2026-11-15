import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

// New isolated deterministic LAB actuator. Never invokes any other engine or provider.
const BASE="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const SLUG="/cerebro-operativa-lab-runtime-v0";
const PATH="/functions/v1"+SLUG;
const ACTIONS=new Set(["PAUSE","RESUME","PRIORITIZE","TICK"]);
const KEY=/^labctrl-[a-z0-9-]{20,60}$/;
const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"private, no-store, max-age=0",
 "vary":"authorization","x-content-type-options":"nosniff","x-frame-options":"DENY"}});
const denied=(reason:string,status=403)=>reply(status,{status:"DENIED",reason,executed:false,prod_execution_enabled:false});
const unavailable=(reason:string)=>reply(503,{status:"UNAVAILABLE",reason,executed:false,prod_execution_enabled:false});
function obj(x:unknown):x is Record<string,unknown>{return !!x&&typeof x==="object"&&!Array.isArray(x)}
function validScope(x:Record<string,unknown>){return x.company_id==="fenix"&&x.environment==="LAB"&&x.engine_id==="LAB-DEMO-001"&&x.version==="0.1.0";}
function validAction(x:Record<string,unknown>){
 if(!validScope(x)||!ACTIONS.has(x.action as string))return false;
 if(typeof x.expected_revision!=="number"||!Number.isSafeInteger(x.expected_revision)||x.expected_revision<1)return false;
 if(typeof x.idempotency_key!=="string"||!KEY.test(x.idempotency_key))return false;
 if(x.action==="PRIORITIZE")return Number.isSafeInteger(x.priority)&&Number(x.priority)>=1&&Number(x.priority)<=5;
 return x.priority===null;
}
Deno.serve(async req=>{
 const u=new URL(req.url);
 if(![SLUG,PATH,SLUG+"/state",PATH+"/state",SLUG+"/control",PATH+"/control"].includes(u.pathname))
  return denied("ROUTE_NOT_ALLOWED",404);
 if(req.method!=="GET"&&req.method!=="POST")return denied("METHOD_NOT_ALLOWED",405);
 const isState=[SLUG+"/state",PATH+"/state"].includes(u.pathname);
 const isControl=[SLUG+"/control",PATH+"/control"].includes(u.pathname);
 if(req.method==="GET"&&!isState||req.method==="POST"&&!isControl)return denied("METHOD_NOT_ALLOWED",405);
 const auth=req.headers.get("authorization")||"";
 const ownerKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(auth)||ownerKey.length<12||ownerKey.length>256)
  return denied("OWNER_REQUIRED",401);
 let payload:Record<string,unknown>={};
 if(req.method==="GET"){
  if([...u.searchParams.keys()].some(k=>!["company_id","environment","engine_id","version"].includes(k))
   ||u.searchParams.size!==4)return denied("INVALID_READ_SCOPE",400);
  payload=Object.fromEntries(u.searchParams.entries());
  if(!validScope(payload))return denied("READ_SCOPE_DENIED",403);
 }else{
  if(u.search)return denied("QUERY_NOT_ALLOWED",400);
  if(req.headers.get("content-type")?.split(";")[0].trim()!=="application/json")
   return denied("JSON_REQUIRED",415);
  try{
   const text=await req.text();if(text.length>600)return denied("TOO_LARGE",413);
   const raw=JSON.parse(text);if(!obj(raw))return denied("BAD_BODY",400);
   if(Object.keys(raw).sort().join(",")!==["action","company_id","engine_id","environment","expected_revision","idempotency_key","priority","version"].sort().join(","))
    return denied("UNKNOWN_FIELDS",400);
   payload=raw;
   if(!validAction(payload))return denied("CONTROL_CONTRACT_DENIED",403);
  }catch{return denied("INVALID_JSON",400)}
 }
 // Owner authority from the real PROD Session Context, not caller-supplied claims.
 try{
  const res=await fetch(OWNER,{method:"GET",redirect:"error",cache:"no-store",
   headers:{authorization:auth,apikey:ownerKey,accept:"application/json"},signal:AbortSignal.timeout(8500)});
  if(res.status!==200)return denied("OWNER_DENIED",403);
  const data=await res.json();
  if(data?.ok===false||(data?.context??data)?.actor_code!=="CARLOS-ADMIN")return denied("OWNER_DENIED",403);
 }catch{return unavailable("OWNER_RESOLVER_UNAVAILABLE")}
 if(Deno.env.get("SUPABASE_URL")!==BASE||!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))
  return unavailable("BACKEND_NOT_BOUND");
 const db=createClient(BASE,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{
  auth:{persistSession:false,autoRefreshToken:false}});
 try{
  if(req.method==="GET"){
   const q=await db.rpc("cerebro_operativa_lab_observe_rpc_v0",{
    p_company_id:"fenix",p_environment:"LAB",p_engine_id:"LAB-DEMO-001"});
   if(q.error||!obj(q.data)||q.data.status!=="OK")
    return unavailable("STATE_NOT_VERIFIED");
   if(q.data.engine_id!=="LAB-DEMO-001"||q.data.environment!=="LAB"||q.data.autonomous_scheduling!==false)
    return unavailable("STATE_CONTRACT_MISMATCH");
   return reply(200,{...q.data,transport:"PREPROD_OWNER_LAB_RUNTIME_V0",executed:false});
  }
  const r=await db.rpc("cerebro_operativa_lab_control_rpc_v0",{
   p_company_id:"fenix",p_environment:"LAB",p_engine_id:"LAB-DEMO-001",
   p_action:payload.action,p_priority:payload.priority,p_expected_revision:payload.expected_revision,
   p_idempotency_key:payload.idempotency_key});
  if(r.error||!obj(r.data))return unavailable("CONTROL_BACKEND_UNAVAILABLE");
  const data=r.data;
  if(data.status==="DENIED")return denied(String(data.reason||"DENIED"),403);
  if(data.status==="CONFLICT")return reply(409,{...data,transport:"PREPROD_OWNER_LAB_RUNTIME_V0",prod_execution_enabled:false});
  if(!["APPLIED","REPLAY"].includes(String(data.status))||data.source!=="PREPROD_LAB_WORKER_RPC_V0"||
    data.engine_id!=="LAB-DEMO-001"||data.environment!=="LAB"||
    typeof data.receipt_id!=="string"||!obj(data.before)||!obj(data.after))
   return unavailable("CONTROL_RECEIPT_INVALID");
  return reply(200,{...data,transport:"PREPROD_OWNER_LAB_RUNTIME_V0",prod_execution_enabled:false,
   external_actions_executed:false,autonomous_scheduling:false,additional_cost_eur:0});
 }catch{return unavailable("CONTROL_RUNTIME_UNAVAILABLE")}
});
