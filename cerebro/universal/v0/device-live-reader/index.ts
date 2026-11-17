/** Owner-only LAB device runtime observation, parallel to existing JOB-001 reader.
 * No mutations, cron, PII projection, control commands or production database reads.
 * verify_jwt=false solely because owner JWT is validated against separate PROD issuer.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.78.0";
import {projectDeviceLiveSummary} from "./device-projection.mjs";
const PROJECT="https://hnqlnvakzaywtafeiybt.supabase.co";
const OWNER="https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context";
const FUNCTION="cerebro-operativa-device-observe-lab-v0";
function response(status:number,value:unknown){
 return new Response(JSON.stringify(value),{status,headers:{
  "content-type":"application/json; charset=utf-8","cache-control":"private, no-store, max-age=0",
  "vary":"Authorization","x-content-type-options":"nosniff","x-frame-options":"DENY"}});
}
const unavailable=(reason:string)=>response(503,{status:"UNAVAILABLE",reason,read_only:true,executed:false});
Deno.serve(async(req:Request)=>{
 if(req.method!=="GET")return response(405,{status:"CLOSED",reason:"READ_ONLY"});
 const url=new URL(req.url);
 if(!["/"+FUNCTION,"/functions/v1/"+FUNCTION].includes(url.pathname))
  return response(404,{status:"CLOSED",reason:"NOT_FOUND"});
 if(url.searchParams.getAll("company_id").length!==1||
  url.searchParams.getAll("environment").length!==1||
  url.searchParams.get("company_id")!=="fenix"||url.searchParams.get("environment")!=="LAB"||
  [...url.searchParams.keys()].some(k=>!["company_id","environment"].includes(k)))
  return response(403,{status:"CLOSED",reason:"FENIX_LAB_SCOPE_ONLY"});
 const bearer=req.headers.get("authorization")||"",prodKey=req.headers.get("x-cerebro-owner-prod-apikey")||"";
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||prodKey.length<12||prodKey.length>256)
  return response(401,{status:"CLOSED",reason:"OWNER_REQUIRED"});
 try{
  const auth=await fetch(OWNER,{method:"GET",headers:{authorization:bearer,apikey:prodKey,accept:"application/json"},
   redirect:"error",cache:"no-store",signal:AbortSignal.timeout(6500)});
  if(auth.status!==200)return response(403,{status:"CLOSED",reason:"OWNER_NOT_AUTHORIZED"});
  const body=await auth.json();
  const context=body?.context&&typeof body.context==="object"?body.context:body;
  if(context?.actor_code!=="CARLOS-ADMIN"||body?.ok===false)
   return response(403,{status:"CLOSED",reason:"OWNER_NOT_AUTHORIZED"});
 }catch{return unavailable("OWNER_RESOLVER_UNAVAILABLE")}
 const urlDb=Deno.env.get("SUPABASE_URL")||"",dbKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(urlDb!==PROJECT||dbKey.length<25)return unavailable("LAB_PROJECT_OR_SERVICE_AUTH_UNAVAILABLE");
 try{
  const db=createClient(urlDb,dbKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const [a,c]=await Promise.all([
   db.from("cerebro_device_agents_preprod")
    .select("company_id,environment,status,last_seen_at,revoked_at",{count:"exact"})
    .eq("company_id","fenix").in("environment",["LAB","PREPROD"]).limit(101),
   db.from("cerebro_device_commands_preprod")
    .select("company_id,environment,command_id,device_id,state,created_at,completed_at",{count:"exact"})
    .eq("company_id","fenix").in("environment",["LAB","PREPROD"]).limit(401)
  ]);
  if(a.error||c.error)return unavailable("DEVICE_SOURCE_READ_FAILED");
  if(a.count===null||c.count===null||a.count>100||c.count>400||
   a.data?.length!==a.count||c.data?.length!==c.count)return unavailable("SOURCE_READ_LIMIT_EXCEEDED");
  const commands=c.data||[],ids=[...new Set(commands.map(x=>x.command_id))];
  let results:{command_id:string;device_id:string;semantic_verified:boolean}[]=[];
  if(ids.length){
   const r=await db.from("cerebro_device_results_preprod")
    .select("command_id,device_id,semantic_verified",{count:"exact"})
    .in("command_id",ids).limit(501);
   if(r.error)return unavailable("DEVICE_RECEIPT_READ_FAILED");
   if(r.count===null||r.count>500||r.data?.length!==r.count)return unavailable("RECEIPT_READ_LIMIT_EXCEEDED");
   results=r.data||[];
  }
  const projected=projectDeviceLiveSummary({agents:a.data||[],commands,results,observedAt:new Date().toISOString()});
  if(!projected)return unavailable("DEVICE_PROJECTION_INVALID");
  const encoded=JSON.stringify(projected);
  if(encoded.length>14000)return unavailable("RESPONSE_SIZE_EXCEEDED");
  return response(200,projected);
 }catch{return unavailable("DEVICE_LAB_READ_EXCEPTION")}
});
