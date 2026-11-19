import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";
/** OPSCTRL-001. Existing LAB pg_cron only; human owner verified by PROD Gateway GET.
 * No production engine controls, no paid jobs, no HOLD override, no bulk execution.
 */
const SLUG="cerebro-operativa-controls-lab-v1";
const LAB="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const ENGINES=new Set(["QA-001","CERT-001"]);
const COMMANDS=new Set(["RUN_ONCE","PAUSE_SCHEDULE","RESUME_SCHEDULE"]);
const ok=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{
 "content-type":"application/json; charset=utf-8","cache-control":"private,no-store,max-age=0",
 "vary":"authorization","x-content-type-options":"nosniff","x-frame-options":"DENY"}});
const err=(http:number,reason:string)=>ok(http,{status:"UNAVAILABLE",reason,executed:false,
 company_id:"fenix",environment:"LAB",prod_execution_enabled:false});
Deno.serve(async(req)=>{
 const url=new URL(req.url);
 if(!["GET","POST"].includes(req.method))return err(405,"METHOD_DENIED");
 if(!["/"+SLUG,"/functions/v1/"+SLUG].includes(url.pathname))return err(404,"ROUTE_DENIED");
 if(url.searchParams.getAll("company_id").length!==1||
    url.searchParams.getAll("environment").length!==1||
    url.searchParams.get("company_id")!=="fenix"||url.searchParams.get("environment")!=="LAB"||
    [...url.searchParams.keys()].some(x=>!["company_id","environment"].includes(x)))
  return err(403,"SCOPE_DENIED");
 const authorization=req.headers.get("authorization")||"";
 const ownerKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(authorization)||ownerKey.length<12||ownerKey.length>256)
   return err(401,"OWNER_SESSION_REQUIRED");
 try{
  const r=await fetch(OWNER,{method:"GET",redirect:"error",cache:"no-store",
   headers:{authorization,apikey:ownerKey,accept:"application/json"},
   signal:AbortSignal.timeout(6500)});
  if(r.status!==200)return err(403,"OWNER_DENIED");
  const o=await r.json(),ctx=o?.context&&typeof o.context==="object"?o.context:o;
  if(o?.ok===false||ctx?.actor_code!=="CARLOS-ADMIN")return err(403,"OWNER_DENIED");
 }catch{return err(503,"OWNER_RESOLVER_UNAVAILABLE")}
 const supa=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(supa!==LAB||key.length<25)return err(503,"LAB_BINDING_UNAVAILABLE");
 const db=createClient(supa,key,{auth:{persistSession:false,autoRefreshToken:false}});
 if(req.method==="GET"){
  try{
   const {data,error}=await db.rpc("cerebro_lab_operator_state_v1");
   if(error||!data||data.status!=="OK"||data.source!=="CEREBRO_OPERATIVA_OPERATOR_LAB_V1"||
     data.company_id!=="fenix"||data.environment!=="LAB"||data.read_only!==true||
     data.prod_execution_enabled!==false||!Array.isArray(data.engines)||data.engines.length!==2||
     !["QA-001","CERT-001"].every(id=>data.engines.some((r:any)=>r.engine_id===id))||
     data.engines.some((r:any)=>r.schedule_active!==true&&r.schedule_active!==false||
       !Number.isSafeInteger(r.cron_job_id)||!ENGINES.has(r.engine_id))||
     !Array.isArray(data.commands)||data.commands.length>15)
    return err(503,"OPERATOR_STATE_INVALID");
   const {data:consoleState,error:consoleError}=await db.rpc("cerebro_lab_console_control_state_v1");
   if(consoleError||!consoleState||consoleState.status!=="OK"||
    consoleState.company_id!=="fenix"||consoleState.engine_id!=="CONSOLE-001"||
    consoleState.environment!=="LAB"||consoleState.read_only!==true||
    consoleState.prod_execution_enabled!==false||consoleState.executed!==false||
    consoleState.capability!=="PUBLIC_REPO_READ_ONCE_ONLY"||
    consoleState.collector_schedules_active!==true||
    !Array.isArray(consoleState.requests)||consoleState.requests.length>10)
     return err(503,"CONSOLE_CONTROL_STATE_INVALID");
   return ok(200,{...data,console_readonly:consoleState,executed:false,control_scope:"TWO_LAB_DIAGNOSTIC_ENGINES",
    other_engines:"DENIED_NOT_ACCREDITED"});
  }catch{return err(503,"OPERATOR_STATE_UNAVAILABLE")}
 }
 const length=Number(req.headers.get("content-length")||"0");
 if(length>4096)return err(413,"BODY_TOO_LARGE");
 if(!(req.headers.get("content-type")||"").toLowerCase().includes("application/json"))
  return err(415,"CONTENT_TYPE_DENIED");
 let body:any;try{body=await req.json()}catch{return err(400,"BAD_JSON")}
 if(!body||typeof body!=="object"||Array.isArray(body)||
    Object.keys(body).sort().join(",")!=="command,company_id,engine_id,environment,request_id"||
    body.company_id!=="fenix"||body.environment!=="LAB"||
    !(ENGINES.has(body.engine_id)||body.engine_id==='CONSOLE-001')||!COMMANDS.has(body.command)||
    (body.engine_id==='CONSOLE-001'&&body.command!=='RUN_ONCE')||
    typeof body.request_id!=="string"||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id))
  return err(400,"COMMAND_CONTRACT_DENIED");
 try{
  if(body.engine_id==='CONSOLE-001'){
   const {data:queued,error:queueError}=await db.rpc("cerebro_lab_console_run_once_v1",{
    p_request_id:body.request_id
   });
   if(queueError){
    const msg=String(queueError.message||"");
    return err(/OPSCTRL_CONSOLE_RATE_LIMIT/.test(msg)?429:409,
     /OPSCTRL_CONSOLE_RATE_LIMIT/.test(msg)?"RATE_LIMIT_60S":
     /OPSCTRL_CONSOLE_CRON_CONTRACT_DRIFT/.test(msg)?"CRON_CONTRACT_DRIFT":
     "CONSOLE_READ_ENQUEUE_DENIED");
   }
   if(!queued||!["QUEUED","ALREADY_QUEUED"].includes(queued.status)||
     queued.company_id!=="fenix"||queued.engine_id!=="CONSOLE-001"||
     queued.environment!=="LAB"||queued.command!=="RUN_ONCE"||
     queued.audit_persisted!==true||queued.executed!==false||
     queued.prod_execution_enabled!==false||
     !/^[0-9a-f-]{36}$/i.test(String(queued.job_id||"")))
      return err(503,"CONSOLE_QUEUE_RECEIPT_INVALID");
   return ok(200,queued);
  }
  const {data,error}=await db.rpc("cerebro_lab_operator_command_v1",{
   p_request_id:body.request_id,p_engine_id:body.engine_id,p_command:body.command});
  if(error){
   const message=String(error.message||"");
   if(/OPSCTRL_RATE_LIMIT/.test(message))return err(429,"RATE_LIMIT_60S");
   if(/OPSCTRL_LAST_MONITOR_PROTECTED/.test(message))return err(409,"ULTIMO_SUPERVISOR_PROTEGIDO");
   if(/OPSCTRL_CRON_CONTRACT_DRIFT/.test(message))return err(409,"CRON_CONTRACT_DRIFT");
   if(/OPSCTRL_IDEMPOTENCY_CONFLICT/.test(message))return err(409,"IDEMPOTENCY_CONFLICT");
   return err(503,"COMMAND_EXECUTION_FAILED");
  }
  if(!data||!["APPLIED","ALREADY_APPLIED"].includes(data.status)||
     data.prod_execution_enabled!==false||
     data.engine_id!==body.engine_id||data.command!==body.command||
     data.request_id!==body.request_id||
     data.final_active!==true&&data.final_active!==false)
   return err(503,"COMMAND_RECEIPT_INVALID");
  return ok(200,{...data,company_id:"fenix",environment:"LAB",
    executed:data.status==="APPLIED"&&data.outcome==="SUCCEEDED",
    control_scope:"TWO_LAB_DIAGNOSTIC_ENGINES",prod_execution_enabled:false});
 }catch{return err(503,"COMMAND_UPSTREAM_UNAVAILABLE")}
});