import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
// STATE-001: isolated read-only JOB activity observation. No RLS, App or CRM changes.
const ORIGINS=new Set(["https://app.fenixcapital.es","https://www.app.fenixcapital.es"]);
const COMPANY="fenix",MAX_AGE_MS=20*60*1000,ACTIVE_HEARTBEAT_MS=120000;
const SOURCES=[
 {name:"jarvis_work_job_v1",column:"updated_at",fields:"engine_id,status,updated_at,started_at,completed_at"},
 {name:"cerebro_browser_job_v2",column:"updated_at",fields:"engine_id,status,updated_at,last_heartbeat_at,completed_at"},
 {name:"cerebro_creative_job_v1",column:"updated_at",fields:"engine_id,status,updated_at,completed_at"}
] as const;
const U=Deno.env.get("SUPABASE_URL")??"",A=Deno.env.get("SUPABASE_ANON_KEY")??"",S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const headers=(origin:string|null)=>({"content-type":"application/json; charset=utf-8","cache-control":"private, no-store, max-age=0",
 "vary":"origin, authorization","x-content-type-options":"nosniff",
 ...(origin&&ORIGINS.has(origin)?{"access-control-allow-origin":origin}:{} )});
const response=(req:Request,status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:headers(req.headers.get("origin"))});
let lastCache:{at:number,payload:unknown}|null=null;
async function owner(req:Request){
 const bearer=req.headers.get("authorization")??"";
 if(!U||!A||!S||!/^Bearer\s+\S{20,8192}$/i.test(bearer))return false;
 const auth=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});
 const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await auth.auth.getUser(bearer.replace(/^Bearer\s+/i,""));
 if(error||!data.user||!data.user.email_confirmed_at)return false;
 const {data:ctx,error:ce}=await svc.rpc("fenix_prod_actor_context_by_auth_server",{p_auth_user_id:data.user.id});
 return Boolean(!ce&&ctx?.ok&&String(ctx.actor_code)==="CARLOS-ADMIN");
}
async function observe(){
 const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
 const now=Date.now(),sources=[],events=[];
 let failed=0;
 for(const table of SOURCES){
  const {data,error}=await svc.from(table.name).select(table.fields).eq("company_id",COMPANY).order(table.column,{ascending:false}).limit(100);
  if(error){failed++;sources.push({source:table.name,status:"UNAVAILABLE",reason:"SOURCE_QUERY_ERROR"});continue;}
  let recent=0,last_observed_at:string|null=null;
  for(const raw of data??[]){
   const r=raw as Record<string,unknown>;
   const when=Date.parse(String(r.updated_at??""));
   if(!last_observed_at&&Number.isFinite(when))last_observed_at=new Date(when).toISOString();
   if(!Number.isFinite(when)||now-when< -120000||now-when>MAX_AGE_MS)continue;
   recent++;
   const original=String(r.status??"").toUpperCase();
   const heartbeat=Date.parse(String(r.last_heartbeat_at??r.started_at??r.updated_at??""));
   const hasHeartbeat=Number.isFinite(heartbeat)&&now-heartbeat>=-120000&&now-heartbeat<=ACTIVE_HEARTBEAT_MS;
   let state="POR_VERIFICAR",reason="RECENT_JOB_NOT_ENOUGH_FOR_RUNTIME_STATUS";
   if(["RUNNING","IN_PROGRESS"].includes(original)&&hasHeartbeat){state="ACTIVO";reason="RECENT_JOB_HEARTBEAT";}
   else if(["DEAD_LETTER","FAILED","ERROR","TIMED_OUT"].includes(original)){state="FALLANDO";reason="RECENT_JOB_FAILED";}
   else if(["COMPLETED","SUCCEEDED","SUCCESS"].includes(original)){state="PARCIAL";reason="JOB_COMPLETED_UNVERIFIED_QUALITY";}
   const engineId=String(r.engine_id??"");
   if(!/^[A-Z0-9][A-Z0-9-]{2,25}$/.test(engineId))continue;
   events.push({engine_id:engineId,company_id:COMPANY,source:table.name,status:state,reason,observed_at:new Date(when).toISOString(),
    execution_evidence_type:"SUPABASE_AUTHORIZED_JOB_RECORD",profile_identity_attested:false});
  }
  sources.push({source:table.name,status:"READ_OK",rows_in_page:(data??[]).length,recent,latest_activity_at:last_observed_at});
 }
 return {schema:"CEREBRO_STATE001_DB_JOB_OBSERVATION_V1",company_id:COMPANY,
  observed_at:new Date(now).toISOString(),source_health:failed===0?"OK":failed===SOURCES.length?"UNAVAILABLE":"DEGRADED",
  read_only:true,privilege:"CARLOS_ADMIN_ONLY",max_recent_window_minutes:20,
  sources,activity_events:events.slice(0,100),observed_recent_events:events.length,profile_events_attributed:0,
  limitation:"Job status and engine IDs are real; no profile_key available, no individual specialist runtime assertion."};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(req.method==="OPTIONS")return origin&&ORIGINS.has(origin)?
  new Response(null,{status:204,headers:{...headers(origin),"access-control-allow-methods":"GET,OPTIONS",
   "access-control-allow-headers":"authorization,apikey","access-control-max-age":"600"}}):response(req,403,{status:"DENIED"});
 if(req.method!=="GET")return response(req,405,{status:"READ_ONLY"});
 if(origin&&!ORIGINS.has(origin))return response(req,403,{status:"ORIGIN_DENIED"});
 if(new URL(req.url).search) return response(req,400,{status:"NO_PARAMS_ALLOWED"});
 try{
  if(!await owner(req))return response(req,403,{status:"OWNER_NOT_VERIFIED"});
 }catch{return response(req,503,{status:"OWNER_AUTH_UNAVAILABLE"});}
 try{
  let p;
  if(lastCache&&Date.now()-lastCache.at<60000)p=lastCache.payload;
  else {p=await observe();lastCache={at:Date.now(),payload:p};}
  return response(req,200,p);
 }catch{return response(req,503,{status:"JOB_SOURCES_UNAVAILABLE"});}
});
