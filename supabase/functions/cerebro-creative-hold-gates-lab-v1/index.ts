import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";
const LAB="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const SLUG="cerebro-creative-hold-gates-lab-v1";
const response=(code:number,value:unknown)=>new Response(JSON.stringify(value),{status:code,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"private,no-store",
 "vary":"authorization","x-frame-options":"DENY","x-content-type-options":"nosniff"}});
const fail=(code:number,reason:string)=>response(code,{status:"UNAVAILABLE",reason,read_only:true,executed:false});
Deno.serve(async(req:Request)=>{
 const u=new URL(req.url);
 if(req.method!=="GET")return fail(405,"READ_ONLY");
 if(!["/"+SLUG,"/functions/v1/"+SLUG].includes(u.pathname))return fail(404,"FIXED_ROUTE");
 if(u.searchParams.getAll("company_id").length!==1||u.searchParams.getAll("environment").length!==1||
  u.searchParams.get("company_id")!=="fenix"||u.searchParams.get("environment")!=="LAB"||
  [...u.searchParams.keys()].some(k=>!["company_id","environment"].includes(k)))
   return fail(403,"LAB_SCOPE_DENIED");
 const jwt=req.headers.get("authorization")||"";
 const ownerKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(jwt)||ownerKey.length<12||ownerKey.length>256)
  return fail(401,"OWNER_SESSION_REQUIRED");
 try{
  const auth=await fetch(OWNER,{method:"GET",redirect:"error",cache:"no-store",
   headers:{authorization:jwt,apikey:ownerKey,accept:"application/json"},signal:AbortSignal.timeout(6500)});
  if(auth.status!==200)return fail(403,"OWNER_DENIED");
  const o=await auth.json(),ctx=o?.context&&typeof o.context==="object"?o.context:o;
  if(o?.ok===false||ctx?.actor_code!=="CARLOS-ADMIN")return fail(403,"OWNER_DENIED");
 }catch{return fail(503,"OWNER_RESOLVER_UNAVAILABLE")}
 const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(url!==LAB||key.length<25)return fail(503,"LAB_ENV_UNAVAILABLE");
 try{
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await db.rpc("cerebro_lab_creative_hold_gates_v1");
  if(error||!data||data.status!=="OK"||data.source!=="CEREBRO_LAB_CREATIVE_HOLD_GATES_V1"||
   data.company_id!=="fenix"||data.environment!=="LAB"||data.read_only!==true||
   data.all_certified!==false||data.prod_execution_enabled!==false||
   data.paid_generation_enabled!==false||data.owner_rejection_override!==false||
   data.external_actions_executed!==false||!Array.isArray(data.engines)||data.engines.length!==2||
   !["FACT-001","UMS-001"].every(id=>data.engines.some((v:any)=>v.engine_id===id))||
   data.engines.some((v:any)=>v.safe_to_resume!==false||v.autonomy_certified!==false||
    !Number.isSafeInteger(v.historical_jobs)||!Number.isSafeInteger(v.jobs_on_hold)||
    !Number.isSafeInteger(v.historical_succeeded)||!Array.isArray(v.blockers)||
    v.blockers.some((b:any)=>!["HOLD","SUCCEEDED"].includes(b.state)||
      typeof b.reason_code!=="string"||b.reason_code.length>100||
      !Number.isSafeInteger(b.count)||b.count<0)))
   return fail(503,"HOLD_GATE_CONTRACT_INVALID");
  return response(200,{...data,executed:false,read_only:true});
 }catch{return fail(503,"CREATIVE_HOLD_GATE_READ_ERROR")}
});
