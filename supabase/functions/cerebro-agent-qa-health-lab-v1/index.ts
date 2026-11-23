import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";

/** Read-only owner-secured SQL QA receipt observer in existing isolated Supabase LAB.
 * The signed receipt is created by pg_cron, NOT by this HTTP request.
 * No App/CRM/PROD writes, no customer data or server-side keys in response.
 */
const PROJECT="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const NAME="cerebro-agent-qa-health-lab-v1";
const closed=(code:number,reason:string)=>new Response(JSON.stringify({
 status:"DENIED",reason,read_only:true,executed:false
}),{status:code,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"private,no-store",
 "vary":"authorization","x-frame-options":"DENY","x-content-type-options":"nosniff"
}});
const reply=(status:number,x:unknown)=>new Response(JSON.stringify(x),{status,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"private,no-store",
 "vary":"authorization","x-content-type-options":"nosniff"
}});
Deno.serve(async(req:Request)=>{
 const url=new URL(req.url);
 if(!["/"+NAME,"/functions/v1/"+NAME].includes(url.pathname))return closed(404,"FIXED_ROUTE_ONLY");
 if(req.method!=="GET")return closed(405,"READ_ONLY");
 if(url.searchParams.getAll("company_id").length!==1||
    url.searchParams.getAll("environment").length!==1||
    url.searchParams.get("company_id")!=="fenix"||
    url.searchParams.get("environment")!=="LAB"||
    [...url.searchParams.keys()].some(k=>k!=="company_id"&&k!=="environment"))
  return closed(403,"FENIX_LAB_ONLY");
 const auth=req.headers.get("authorization")||"";
 const ownerKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(auth)||ownerKey.length<12||ownerKey.length>256)
   return closed(401,"OWNER_SESSION_REQUIRED");
 try{
  const verified=await fetch(OWNER,{method:"GET",redirect:"error",cache:"no-store",
    headers:{authorization:auth,apikey:ownerKey,accept:"application/json"},signal:AbortSignal.timeout(6500)});
  if(verified.status!==200)return closed(403,"OWNER_DENIED");
  const raw=await verified.json();
  const owner=raw?.context&&typeof raw.context==="object"?raw.context:raw;
  if(raw?.ok===false||owner?.actor_code!=="CARLOS-ADMIN")return closed(403,"OWNER_DENIED");
 }catch{return closed(503,"OWNER_RESOLVER_UNAVAILABLE")}
 const endpoint=Deno.env.get("SUPABASE_URL")||"";
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(endpoint!==PROJECT||serviceKey.length<25)return closed(503,"LAB_BACKEND_UNAVAILABLE");
 try{
  const db=createClient(endpoint,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await db.rpc("cerebro_lab_qa_observe_v1");
  if(error||!data||typeof data!=="object")return closed(503,"LAB_QA_PROOF_UNAVAILABLE");
  if(data.source!=="SUPABASE_PGCRON_QA_LAB_V1"||
   data.company_id!=="fenix"||data.environment!=="LAB"||data.engine_id!=="QA-001"||
   data.agent_role_id!=="ENG-QA"||data.operational_autonomy_certified!==false||
   data.excellence_certified!==false||data.prod_execution_enabled!==false)
    return closed(503,"QA_ATTESTATION_CONTRACT_MISMATCH");
  if(data.status==="INTEGRITY_FAILURE"||data.signature_verified!==true)
    return closed(503,"QA_SIGNATURE_FAILURE");
  if(data.status!=="OK"||!Number.isSafeInteger(data.tests_passed)||
     !Number.isSafeInteger(data.tests_total)||data.tests_total!==6||
     data.tests_passed<0||data.tests_passed>6||
     typeof data.observed_at!=="string"||!Number.isFinite(Date.parse(data.observed_at)))
    return closed(503,"QA_ATTESTATION_INVALID");
  return reply(200,{
   status:"OK",source:"SUPABASE_PGCRON_QA_LAB_V1",
   company_id:"fenix",environment:"LAB",engine_id:"QA-001",agent_role_id:"ENG-QA",
   read_only:true,request_executed_job:false,
   physical_execution_evidenced:true,signature_verified:true,
   execution_status:data.execution_status,observed_at:data.observed_at,
   receipt_id:data.receipt_id,runs_count:data.runs_count,
   tests_total:data.tests_total,tests_passed:data.tests_passed,
   tests:data.tests,recent:data.recent===true,
   excellence_certified:false,operational_autonomy_certified:false,
   additional_subscriptions_eur:0,customer_data_touched:false,prod_execution_enabled:false
  });
 }catch{return closed(503,"LAB_QA_READ_FAILED")}
});
