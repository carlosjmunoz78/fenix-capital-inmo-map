import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";

// Read-only trusted observer. Never starts historical jobs or declares them live.
const SLUG="cerebro-engine-truth-lab-v1";
const LAB="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
function resp(status:number,body:unknown){
 return new Response(JSON.stringify(body),{status,headers:{
  "content-type":"application/json; charset=utf-8",
  "cache-control":"private,no-store,max-age=0","vary":"authorization",
  "x-content-type-options":"nosniff","x-frame-options":"DENY"
 }});
}
const closed=(code:number,reason:string)=>resp(code,{status:"UNAVAILABLE",reason,read_only:true,executed:false});
Deno.serve(async(req:Request)=>{
 const url=new URL(req.url);
 if(req.method!=="GET")return closed(405,"READ_ONLY");
 if(!["/"+SLUG,"/functions/v1/"+SLUG].includes(url.pathname))return closed(404,"FIXED_ROUTE");
 if(url.searchParams.getAll("company_id").length!==1||
    url.searchParams.getAll("environment").length!==1||
    url.searchParams.get("company_id")!=="fenix"||url.searchParams.get("environment")!=="LAB"||
    [...url.searchParams.keys()].some(k=>k!=="company_id"&&k!=="environment"))
    return closed(403,"FENIX_LAB_ONLY");
 const auth=req.headers.get("authorization")||"";
 const ownerKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(auth)||ownerKey.length<12||ownerKey.length>256)
    return closed(401,"OWNER_SESSION_REQUIRED");
 try{
  const r=await fetch(OWNER,{method:"GET",redirect:"error",cache:"no-store",
   headers:{authorization:auth,apikey:ownerKey,accept:"application/json"},
   signal:AbortSignal.timeout(6500)});
  if(r.status!==200)return closed(403,"OWNER_DENIED");
  const p=await r.json();
  const c=p?.context&&typeof p.context==="object"?p.context:p;
  if(p?.ok===false||c?.actor_code!=="CARLOS-ADMIN")return closed(403,"OWNER_DENIED");
 }catch{return closed(503,"OWNER_RESOLVER_UNAVAILABLE")}
 const endpoint=Deno.env.get("SUPABASE_URL")||"";
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(endpoint!==LAB||key.length<25)return closed(503,"LAB_SCOPE_INVALID");
 try{
  const db=createClient(endpoint,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.rpc("cerebro_lab_engine_truth_v1");
  if(error||!data||data.status!=="OK"||
     data.source!=="CEREBRO_LAB_ENGINE_TRUTH_AUDIT_V1"||
     data.company_id!=="fenix"||data.environment!=="LAB"||
     data.read_only!==true||data.all_engines_certified!==false||
     data.autonomy_global_certified!==false||!Array.isArray(data.sources)||data.sources.length>15||
     !Number.isSafeInteger(data.historical_job_rows)||data.historical_job_rows<0||
     data.sources.some((s:any)=>!["JARVIS","BROWSER","CREATIVE"].includes(s.source)||
      s.role_activation_verified!==false||s.engine_certified_autonomous!==false||
      !Number.isSafeInteger(s.historical_jobs)||s.historical_jobs<0||
      !Number.isSafeInteger(s.explicit_role_rows)||s.explicit_role_rows<0||
      !Number.isSafeInteger(s.recent_metadata_rows)||s.recent_metadata_rows<0))
    return closed(503,"AUDIT_INVALID_OR_UNAVAILABLE");
  return resp(200,{...data,executed:false,prod_execution_enabled:false});
 }catch{return closed(503,"AUDIT_UPSTREAM_UNAVAILABLE")}
});