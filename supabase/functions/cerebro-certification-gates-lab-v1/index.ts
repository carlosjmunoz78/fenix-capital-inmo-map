import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";

/** CEREBRO CERT-001: trusted read-only gate projection in isolated Supabase LAB.
 * Never start legacy jobs or assert an engine is autonomous from inventory/cron.
 */
const LAB="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const SLUG="cerebro-certification-gates-lab-v1";
const reply=(code:number,body:unknown)=>new Response(JSON.stringify(body),{
 status:code,headers:{"content-type":"application/json; charset=utf-8",
 "cache-control":"private,no-store,max-age=0","x-content-type-options":"nosniff",
 "x-frame-options":"DENY","vary":"authorization"}});
const fail=(code:number,reason:string)=>reply(code,{status:"UNAVAILABLE",reason,read_only:true,executed:false});
Deno.serve(async (req:Request)=>{
 const u=new URL(req.url);
 if(req.method!=="GET")return fail(405,"READ_ONLY");
 if(!["/"+SLUG,"/functions/v1/"+SLUG].includes(u.pathname))return fail(404,"FIXED_ROUTE");
 if(u.searchParams.getAll("company_id").length!==1||
    u.searchParams.getAll("environment").length!==1||
    u.searchParams.get("company_id")!=="fenix"||
    u.searchParams.get("environment")!=="LAB"||
    [...u.searchParams.keys()].some(k=>!["company_id","environment"].includes(k)))
   return fail(403,"FENIX_LAB_ONLY");
 const auth=req.headers.get("authorization")||"";
 const ownerKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(auth)||ownerKey.length<12||ownerKey.length>256)
   return fail(401,"OWNER_SESSION_REQUIRED");
 try{
  const r=await fetch(OWNER,{method:"GET",redirect:"error",cache:"no-store",
   headers:{authorization:auth,apikey:ownerKey,accept:"application/json"},
   signal:AbortSignal.timeout(6500)});
  if(r.status!==200)return fail(403,"OWNER_DENIED");
  const p=await r.json(),ctx=p?.context&&typeof p.context==="object"?p.context:p;
  if(p?.ok===false||ctx?.actor_code!=="CARLOS-ADMIN")return fail(403,"OWNER_DENIED");
 }catch{return fail(503,"OWNER_RESOLVER_UNAVAILABLE")}
 const base=Deno.env.get("SUPABASE_URL")||"";
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(base!==LAB||key.length<25)return fail(503,"LAB_CONFIG_REQUIRED");
 try{
  const db=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.rpc("cerebro_lab_certification_gates_v1");
  if(error||!data||data.status!=="OK"||
    data.source!=="CEREBRO_LAB_CERTIFICATION_GATES_V1"||
    data.read_only!==true||data.executed!==false||
    data.company_id!=="fenix"||data.environment!=="LAB"||
    data.global_autonomy_certified!==false||data.global_excellence_certified!==false||
    data.prod_execution_enabled!==false||data.cost_measured!==false||
    data.engine_runtime_attribution_required!==true||data.quality_tribunal_required!==true||
    !Array.isArray(data.evidence_categories)||data.evidence_categories.length!==5||
    new Set(data.evidence_categories.map((e:any)=>e.id)).size!==5||
    !["QA-001","FACT-001","CONSOLE-001","UMS-001","SOCIAL_LAB_SCHEDULES"]
      .every(id=>data.evidence_categories.some((e:any)=>e.id===id))||
    data.evidence_categories.some((e:any)=>
      e.full_engine_certified!==false||
      (e.id!=="SOCIAL_LAB_SCHEDULES"&&e.business_quality_certified!==false)||
      (e.id==="SOCIAL_LAB_SCHEDULES"&&(e.business_outcome_verified!==false||
       e.agent_identity_verified!==false||e.active_schedules<0||e.scheduled_jobs_total<e.active_schedules))))
     return fail(503,"CERTIFICATION_GATE_CONTRACT_INVALID");
  return reply(200,{...data,read_only:true,executed:false,prod_execution_enabled:false});
 }catch{return fail(503,"CERTIFICATION_GATE_READ_FAILED")}
});