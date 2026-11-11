// New isolated CEREBRO FACT-001 Edge Function. No App/CRM changes, no generic API proxy.
// Authentication: strictly verified short-lived GitHub OIDC signed assertion, exact repo+branch+workflow.
// Only two READ GET requests to Cloudflare account API. Token encrypted at rest in Supabase Vault.
import postgres from 'npm:postgres@3.4.7';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {ACCOUNT_ID,VAULT_NAME,SCOPE,verifyGitHubOidc,assertScope,validateInventory} from './logic.mjs';
import {GATEWAY_D1_ACCOUNT,GATEWAY_D1_DATABASE,GATEWAY_D1_VAULT,
  assertGatewayQueueOrder,INSERT_HEARTBEAT,GET_HEARTBEAT,CONFIG_QUERY} from './gateway-queue-policy.mjs';
const SERVICE='cerebro-fact001-console-owner-canary-lab';
const NAME='cerebro-fact001-console-owner-canary-lab';
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function reply(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:HEADERS});}
function credential(req:Request){const value=req.headers.get('authorization')||'';return value.startsWith('Bearer ')?value.slice(7):'';}
function safeBody(req:Request){const len=Number(req.headers.get('content-length')||0);if(len>3000)throw Error('REQUEST_TOO_LARGE');return req.json();}
async function withDb<T>(fn:(sql:any)=>Promise<T>):Promise<T>{
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)throw Error('VAULT_CONNECTION_MISSING');
 const sql=postgres(url,{prepare:false,max:1,connect_timeout:5,idle_timeout:1});
 try{return await fn(sql);}finally{await sql.end({timeout:2}).catch(()=>{});}
}
async function getToken():Promise<string>{
 return await withDb(async sql=>{
  const rows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${VAULT_NAME} limit 2`;
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string')throw Error('VAULT_SECRET_ABSENT');
  return rows[0].decrypted_secret;
 });
}
async function cfRead(path:string,token:string){
 const url='https://api.cloudflare.com/client/v4'+path;
 const r=await fetch(url,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('CLOUDFLARE_READ_HTTP_'+r.status);
 return await r.json();
}
async function inventory(){
 const token=await getToken();
 const [d1,workers]=await Promise.all([
   cfRead('/accounts/'+ACCOUNT_ID+'/d1/database?page=1&per_page=100',token),
   cfRead('/accounts/'+ACCOUNT_ID+'/workers/scripts',token)
 ]);
 return validateInventory(d1,workers);
}
async function authorizedOwner(req:Request){
 const U=Deno.env.get('SUPABASE_URL')||'',A=Deno.env.get('SUPABASE_ANON_KEY')||'',S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const token=credential(req);if(!U||!A||!S||!token)return false;
 const u=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});
 const s=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await u.auth.getUser(token);if(error||!data?.user?.id)return false;
 const {data:ctx,error:ce}=await s.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:data.user.id});
 return !ce&&ctx?.ok===true&&ctx.actor_code==='CARLOS-ADMIN';
}
const ALLOWED_ORIGINS=new Set(['https://app.fenixcapital.es','https://www.app.fenixcapital.es']);
function ownerReply(req:Request,status:number,body:Record<string,unknown>){const origin=req.headers.get('origin')||'';return new Response(JSON.stringify(body),{status,headers:{...HEADERS,...(ALLOWED_ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});}

async function gatewayD1Request(sqlText:string,params:string[]){
 if(GATEWAY_D1_ACCOUNT!==ACCOUNT_ID)throw Error('GATEWAY_ACCOUNT_DENIED');
 const token=await withDb(async sql=>{
   const r=await sql`select decrypted_secret from vault.decrypted_secrets where name=${GATEWAY_D1_VAULT} limit 2`;
   if(r.length!==1||typeof r[0].decrypted_secret!=='string'||r[0].decrypted_secret.length<24)
     throw Error('GATEWAY_WRITER_VAULT_MISSING');
   return r[0].decrypted_secret;
 });
 const url='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT_ID+'/d1/database/'+GATEWAY_D1_DATABASE+'/query';
 const response=await fetch(url,{method:'POST',
  headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},
  body:JSON.stringify({sql:sqlText,params}),redirect:'error',signal:AbortSignal.timeout(12000)});
 if(response.status===429)throw Error('GATEWAY_D1_RATE_LIMITED');
 if(response.status!==200)throw Error('GATEWAY_D1_HTTP_'+response.status);
 const data=await response.json();if(data?.success!==true||data.result?.length!==1||
   data.result[0]?.success!==true||!Array.isArray(data.result[0]?.results))throw Error('GATEWAY_D1_UNTRUSTED');
 return data.result[0].results;
}
async function jobHash(id:string){
 const bytes=new TextEncoder().encode(id),digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
async function gatewayQueueJob(id:string,write:boolean){
 const hash=await jobHash(id);
 if(write){
   const cfg=await gatewayD1Request(CONFIG_QUERY,[]);
   if(cfg.length!==1||Number(cfg[0].enabled)!==1||Number(cfg[0].max_jobs_per_tick)!==1)
      throw Error('GATEWAY_QUEUE_CONFIG_NOT_SAFE');
   const inserted=await gatewayD1Request(INSERT_HEARTBEAT,[id,hash]);
   if(inserted.length>1)throw Error('GATEWAY_QUEUE_MULTI_RESULT');
 }
 const result=await gatewayD1Request(GET_HEARTBEAT,[id]);
 if(result.length!==1||result[0].id!==id||result[0].payload_hash!==hash||
   result[0].company_id!=='fenix-capital'||result[0].engine_id!=='FACT-001'||
   result[0].environment!=='LAB'||result[0].version!=='1.0.0'||
   result[0].client_id!=='cerebro'||result[0].operation!=='fact001.lab.heartbeat'||
   !['QUEUED','RUNNING','COMPLETED','RECONCILE','BLOCKED'].includes(result[0].state))
      throw Error('GATEWAY_QUEUE_READBACK_UNVERIFIED');
 return {status:write?'QUEUED_OR_ALREADY_PRESENT':'READBACK',job_id:id,job_state:result[0].state,
   attempts:Number(result[0].attempts),provider_writes:0,additional_cost_eur:0,
   cloudflare_db:GATEWAY_D1_DATABASE,credential_exposed:false};
}

Deno.serve(async(req:Request)=>{
 try{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
  if(req.method==='OPTIONS'){
   const origin=req.headers.get('origin')||'';
   if(!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
   return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Max-Age':'600','Vary':'Origin'}});
  }
  if(!['health','inventory','owner-health','owner-inventory','gateway-queue-submit','gateway-queue-status','owner-queue-submit','owner-queue-status'].includes(route||''))return ownerReply(req,404,{status:'NOT_FOUND'});
  if(route==='owner-queue-submit'||route==='owner-queue-status'){
    if(!await authorizedOwner(req))return ownerReply(req,401,{status:'UNAUTHORIZED'});
    if(req.method!=='POST')return ownerReply(req,405,{status:'METHOD_DENIED'});
    const body=await safeBody(req),job=assertGatewayQueueOrder(body,'owner');
    const result=await gatewayQueueJob(job,route==='owner-queue-submit');
    return ownerReply(req,200,result);
  }
  if(route==='owner-health'||route==='owner-inventory'){
   const owner=await authorizedOwner(req);if(!owner)return ownerReply(req,401,{status:'UNAUTHORIZED'});
   if(route==='owner-health'&&req.method==='GET')return ownerReply(req,200,{status:'AUTHENTICATED',...SCOPE,actor:'CARLOS-ADMIN',writes_enabled:false});
   if(route==='owner-inventory'&&req.method==='POST'){
     const body=await safeBody(req);assertScope(body);
     const data=await inventory();
     return ownerReply(req,200,{status:'COMPLETED',...SCOPE,...data});
   }
   return ownerReply(req,405,{status:'METHOD_DENIED'});
  }
  const bearer=credential(req);
  try{await verifyGitHubOidc(bearer);}catch{return reply(401,{status:'UNAUTHORIZED'});}
  if(route==='gateway-queue-submit'||route==='gateway-queue-status'){
   if(req.method!=='POST')return reply(405,{status:'METHOD_DENIED'});
   const body=await safeBody(req),job=assertGatewayQueueOrder(body,'signed');
   const result=await gatewayQueueJob(job,route==='gateway-queue-submit');
   return reply(200,result);
  }
  if(route==='health'&&req.method==='GET')return reply(200,{status:'AUTHENTICATED',service:SERVICE,...SCOPE,scope:'OIDC_EXACT_WORKFLOW',writes_enabled:false,app_crm_unchanged:true});
  if(route==='inventory'&&req.method==='POST'){
   const body=await safeBody(req);assertScope(body);
   const data=await inventory();
   return reply(200,{status:'COMPLETED',company_id:SCOPE.company_id,engine_id:SCOPE.engine_id,environment:SCOPE.environment,version:SCOPE.version,...data});
  }
  return reply(405,{status:'METHOD_DENIED'});
 }catch(e){
  const v=String(e instanceof Error?e.message:'UNKNOWN');
  const allowed=new Set(['SCOPE_INVALID','SCOPE_FIELDS_DENIED','SCOPE_DENIED','PAIR_CREDENTIAL_DENIED','VAULT_CONNECTION_MISSING','VAULT_SECRET_ABSENT','REQUEST_TOO_LARGE','CLOUDFLARE_TOKEN_INVALID','CLOUDFLARE_TOKEN_INACTIVE','VAULT_STORAGE_UNVERIFIED','CF_UNTRUSTED_INVENTORY','CF_PAGINATION_UNTRUSTED','GATEWAY_QUEUE_ORDER_DENIED','GATEWAY_WRITER_VAULT_MISSING',
  'GATEWAY_QUEUE_CONFIG_NOT_SAFE','GATEWAY_QUEUE_MULTI_RESULT','GATEWAY_QUEUE_READBACK_UNVERIFIED','GATEWAY_D1_UNTRUSTED',
  'GATEWAY_D1_RATE_LIMITED','GATEWAY_ACCOUNT_DENIED']);
  const code=allowed.has(v)?v:v.startsWith('CLOUDFLARE_READ_HTTP_')?v:'BACKEND_ERROR';
  if(code==='CLOUDFLARE_READ_HTTP_429')return reply(429,{status:'RATE_LIMITED',code:'CF_API_QUOTA',retry_automatically:false});
  return reply(code.startsWith('SCOPE_')||code==='PAIR_CREDENTIAL_DENIED'?400:503,{status:'BLOCKED',code});
 }
});