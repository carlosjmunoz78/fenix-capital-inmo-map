import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const ID=/^lab-[a-z0-9-]{12,48}$/;
const expectedHost='https://hnqlnvakzaywtafeiybt.supabase.co';
function j(code:number,data:unknown){return new Response(JSON.stringify(data),{
 status:code,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0',
  'x-content-type-options':'nosniff','x-frame-options':'DENY','vary':'authorization'}
});}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return j(405,{status:'CLOSED',reason:'POST_ONLY'});
 const u=new URL(req.url);
 if(u.pathname!=='/cerebro-operativa-lab-audit-v0'&&u.pathname!=='/functions/v1/cerebro-operativa-lab-audit-v0')
  return j(404,{status:'CLOSED',reason:'ROUTE_NOT_AVAILABLE'});
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')
  return j(415,{status:'CLOSED',reason:'JSON_REQUIRED'});
 const token=req.headers.get('authorization')||'';
 const ownerApiKey=req.headers.get('x-cerebro-owner-prod-apikey')||'';
 if(!/^Bearer\s+\S{20,8192}$/i.test(token)||ownerApiKey.length<12||ownerApiKey.length>256)
  return j(401,{status:'CLOSED',reason:'OWNER_SESSION_REQUIRED'});
 let raw;
 try{const payload=await req.text();
  if(payload.length>1024)return j(413,{status:'CLOSED',reason:'PAYLOAD_TOO_LARGE'});
  raw=JSON.parse(payload);
 }catch{return j(400,{status:'CLOSED',reason:'BAD_JSON'})}
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
   Object.keys(raw).some(k=>!['action','company_id','environment','engine_id','capability_id','version','idempotency_key','dry_run','policy_decision'].includes(k))||
   raw.action!=='FACT001_DRY_RUN_AUDIT'||raw.company_id!=='fenix'||raw.environment!=='LAB'||
   raw.engine_id!=='FACT-001'||raw.capability_id!=='fact.registry.summary'||
   raw.version!=='0.1.0-lab'||raw.dry_run!==true||raw.policy_decision!=='DRY_RUN_VALIDATED'||
   typeof raw.idempotency_key!=='string'||!ID.test(raw.idempotency_key))
  return j(404,{status:'CLOSED',reason:'AUDIT_CONTRACT_REQUIRED'});
 let auth;
 try{auth=await fetch(OWNER,{method:'GET',headers:{authorization:token,apikey:ownerApiKey,accept:'application/json'},
  redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8500)});
 }catch{return j(503,{status:'UNAVAILABLE',reason:'OWNER_RESOLVER_UNAVAILABLE'})}
 if(!auth.ok)return j(403,{status:'CLOSED',reason:'OWNER_DENIED'});
 let context;try{context=await auth.json()}catch{return j(403,{status:'CLOSED',reason:'OWNER_INVALID'})}
 const principal=context?.context??context;
 if(context?.ok===false||principal?.actor_code!=='CARLOS-ADMIN')
  return j(403,{status:'CLOSED',reason:'OWNER_REQUIRED'});
 const endpoint=Deno.env.get('SUPABASE_URL')||'';
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(endpoint!==expectedHost||!key)return j(503,{status:'UNAVAILABLE',reason:'PREPROD_PROJECT_KEY_MISSING'});
 const db=createClient(endpoint,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const row={company_id:'fenix',environment:'LAB',actor_code:'CARLOS-ADMIN',engine_id:'FACT-001',
  capability_id:'fact.registry.summary',source_version:'0.1.0-lab',action:'FACT001_DRY_RUN_AUDIT',
  policy_decision:'DRY_RUN_VALIDATED',idempotency_key:raw.idempotency_key,executed:false,
  prod_execution_enabled:false,additional_cost_eur:0};
 try{
  const first=await db.from('cerebro_operativa_lab_audit_v0').insert(row)
   .select('audit_id,created_at,policy_decision,executed,prod_execution_enabled').single();
  if(!first.error&&first.data){
   return j(200,{status:'AUDIT_PERSISTED',source:'PREPROD_LAB_DURABLE_AUDIT',
    audit_id:first.data.audit_id,created_at:first.data.created_at,decision:'DRY_RUN_VALIDATED',
    replayed:false,executed:false,prod_execution_enabled:false});
  }
  if(first.error?.code!=='23505')return j(503,{status:'UNAVAILABLE',reason:'AUDIT_INSERT_FAILED'});
  const prev=await db.from('cerebro_operativa_lab_audit_v0')
   .select('audit_id,created_at,policy_decision,executed,prod_execution_enabled')
   .eq('idempotency_key',raw.idempotency_key).eq('company_id','fenix')
   .eq('environment','LAB').eq('engine_id','FACT-001')
   .eq('capability_id','fact.registry.summary').eq('actor_code','CARLOS-ADMIN')
   .maybeSingle();
  if(prev.error||!prev.data||prev.data.policy_decision!=='DRY_RUN_VALIDATED'||
     prev.data.executed!==false||prev.data.prod_execution_enabled!==false)
   return j(409,{status:'CLOSED',reason:'IDEMPOTENCY_CONFLICT'});
  return j(200,{status:'AUDIT_PERSISTED',source:'PREPROD_LAB_DURABLE_AUDIT',
   audit_id:prev.data.audit_id,created_at:prev.data.created_at,decision:'DRY_RUN_VALIDATED',
   replayed:true,executed:false,prod_execution_enabled:false});
 }catch{return j(503,{status:'UNAVAILABLE',reason:'AUDIT_EXCEPTION'})}
});
