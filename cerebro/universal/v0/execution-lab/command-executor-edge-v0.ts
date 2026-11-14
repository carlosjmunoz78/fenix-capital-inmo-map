import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

// Single allowlisted shared LAB runtime, not a server/worker per motor.
// V0 intentionally executes ONLY the deterministic FACT-001 registry attestation.
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const LAB_DB="https://hnqlnvakzaywtafeiybt.supabase.co";
const PATH="/functions/v1/cerebro-operativa-command-executor-lab-v0";
const KEY=/^lab-fact-attest-[a-z0-9-]{12,48}$/;
const SHA=/^[a-f0-9]{64}$/;
const TABLE="cerebro_universal_fact_attestation_lab_v0";
const FIELDS="receipt_id,created_at,registry_digest,registry_count,base_count,preserved_base,executed,external_actions_executed,prod_execution_enabled,additional_cost_eur,idempotency_key";
const ALLOWED_KEYS=new Set(["action","company_id","environment","engine_id","capability_id","version","idempotency_key","registry_count","base_count","preserved_base","registry_digest"]);
function json(status:number,result:unknown){
 return new Response(JSON.stringify(result),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store, max-age=0","vary":"authorization","x-content-type-options":"nosniff","x-frame-options":"DENY"}});
}
const closed=(reason:string,status=403)=>json(status,{status:"CLOSED",reason,executed:false,prod_execution_enabled:false});
const unavailable=()=>json(503,{status:"UNAVAILABLE",reason:"ATTESTATION_BACKEND_UNAVAILABLE",executed:false,prod_execution_enabled:false});
function validEnvelope(b:any){
 return b&&typeof b==="object"&&!Array.isArray(b)&&
 Object.keys(b).every(k=>ALLOWED_KEYS.has(k))&&Object.keys(b).length===ALLOWED_KEYS.size&&
 b.action==="FACT001_REGISTRY_ATTEST"&&b.company_id==="fenix"&&b.environment==="LAB"&&
 b.engine_id==="FACT-001"&&b.capability_id==="fact.registry.attest"&&b.version==="0.1.0-lab"&&
 typeof b.idempotency_key==="string"&&KEY.test(b.idempotency_key)&&
 b.registry_count===179&&b.base_count===177&&b.preserved_base===true&&
 typeof b.registry_digest==="string"&&SHA.test(b.registry_digest);
}
function safeResult(row:any,replayed:boolean){
 return {status:"FACT_ATTESTATION_EXECUTED",source:"PREPROD_LAB_DETERMINISTIC_RECEIPT",
  company_id:"fenix",environment:"LAB",engine_id:"FACT-001",capability_id:"fact.registry.attest",
  version:"0.1.0-lab",receipt_id:row.receipt_id,created_at:row.created_at,
  registry_digest:row.registry_digest,registry_count:row.registry_count,base_count:row.base_count,
  replayed,executed:true,external_actions_executed:false,
  prod_execution_enabled:false,additional_cost_eur:0,
  operational_engines_verified:false};
}
Deno.serve(async req=>{
 const url=new URL(req.url);
 if(url.pathname!==PATH&&url.pathname!=="/cerebro-operativa-command-executor-lab-v0"||url.search)
  return closed("ROUTE_CLOSED",404);
 if(req.method!=="GET"&&req.method!=="POST")return closed("METHOD_CLOSED",405);
 const authorization=req.headers.get("authorization")||"";
 const apikey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(authorization)||apikey.length<12||apikey.length>256)
  return closed("OWNER_SESSION_REQUIRED",401);
 let data:any=null;
 if(req.method==="POST"){
  if(req.headers.get("content-type")?.split(";")[0].trim()!=="application/json")
   return closed("JSON_REQUIRED",415);
  try{
   const raw=await req.text();
   if(raw.length>1150)return closed("PAYLOAD_TOO_LARGE",413);
   data=JSON.parse(raw);
  }catch{return closed("BAD_JSON",400)}
  if(!validEnvelope(data))return closed("CAPABILITY_CONTRACT_DENIED",404);
 }
 // Authenticate through the existing PROD owner context; there are no PROD mutations.
 try{
  const response=await fetch(OWNER,{method:"GET",redirect:"error",cache:"no-store",
   signal:AbortSignal.timeout(8500),
   headers:{authorization,apikey,accept:"application/json"}});
  if(!response.ok)return closed("OWNER_DENIED",403);
  const owner=await response.json();
  if(owner?.ok===false||(owner?.context??owner)?.actor_code!=="CARLOS-ADMIN")
   return closed("OWNER_DENIED",403);
 }catch{return unavailable()}
 const urlDB=Deno.env.get("SUPABASE_URL")||"";
 const keyDB=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(urlDB!==LAB_DB||!keyDB)return unavailable();
 const db=createClient(urlDB,keyDB,{auth:{autoRefreshToken:false,persistSession:false}});
 try{
  if(req.method==="GET"){
   const r=await db.from(TABLE).select(FIELDS).eq("company_id","fenix").eq("environment","LAB")
    .order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(r.error)return unavailable();
   return json(200,{status:"OK",source:"PREPROD_LAB_DETERMINISTIC_RECEIPT",
    latest:r.data?safeResult(r.data,false):null,executed_external_actions:false,
    prod_execution_enabled:false});
  }
  const receipt={
   company_id:"fenix",environment:"LAB",actor_code:"CARLOS-ADMIN",engine_id:"FACT-001",
   capability_id:"fact.registry.attest",version:"0.1.0-lab",idempotency_key:data.idempotency_key,
   registry_count:179,base_count:177,preserved_base:true,registry_digest:data.registry_digest,
   policy_decision:"LAB_EXECUTION_ALLOWLIST",executed:true,external_actions_executed:false,
   prod_execution_enabled:false,additional_cost_eur:0,source:"FACT001_CANONICAL_REPOSITORY_LAB"
  };
  const inserted=await db.from(TABLE).insert(receipt).select(FIELDS).single();
  if(!inserted.error&&inserted.data)return json(200,safeResult(inserted.data,false));
  if(inserted.error?.code!=="23505")return unavailable();
  const previous=await db.from(TABLE).select(FIELDS).eq("idempotency_key",data.idempotency_key)
   .eq("company_id","fenix").eq("environment","LAB").eq("engine_id","FACT-001").maybeSingle();
  if(previous.error||!previous.data||previous.data.registry_digest!==data.registry_digest||
   previous.data.registry_count!==179||previous.data.base_count!==177||
   previous.data.executed!==true||previous.data.external_actions_executed!==false||
   previous.data.prod_execution_enabled!==false)
   return closed("IDEMPOTENCY_CONFLICT",409);
  return json(200,safeResult(previous.data,true));
 }catch{return unavailable()}
});
