// New isolated CEREBRO FACT-001 Edge Function. No App/CRM changes, no generic API proxy.
// Authentication: strictly verified short-lived GitHub OIDC signed assertion, exact repo+branch+workflow.
// Only two READ GET requests to Cloudflare account API. Token encrypted at rest in Supabase Vault.
import postgres from 'npm:postgres@3.4.7';
import {ACCOUNT_ID,VAULT_NAME,SCOPE,verifyGitHubOidc,assertScope,validateInventory} from './logic.mjs';
const SERVICE='cerebro-fact001-cloudflare-lab';
const NAME='cerebro-fact001-cloudflare-lab';
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function reply(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:HEADERS});}
function credential(req:Request){const value=req.headers.get('authorization')||'';return value.startsWith('Bearer ')?value.slice(7):'';}
function safeBody(req:Request){const len=Number(req.headers.get('content-length')||0);if(len>3000)throw Error('REQUEST_TOO_LARGE');return req.json();}
async function withDb<T>(fn:(sql:any)=>Promise<T>):Promise<T>{
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)throw Error('VAULT_CONNECTION_MISSING');
 const sql=postgres(url,{prepare:false,max:1,connect_timeout:5,idle_timeout:1});
 try{return await fn(sql);}finally{await sql.end({timeout:2}).catch(()=>{});}
}
async function pair(token:string){
 return await withDb(async sql=>{
  return await sql.begin(async tx=>{
   await tx`select pg_advisory_xact_lock(hashtext(${VAULT_NAME}))`;
   const previous=await tx`select id from vault.secrets where name=${VAULT_NAME} limit 2`;
   if(previous.length!==0)return 'ALREADY_PAIRED';
   const check=await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify',{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!check.ok)throw Error('CLOUDFLARE_TOKEN_INVALID');
   const valid=await check.json();if(valid?.success!==true||valid.result?.status!=='active')throw Error('CLOUDFLARE_TOKEN_INACTIVE');
   const rows=await tx`select vault.create_secret(${token},${VAULT_NAME},${'FACT001 isolated Cloudflare LAB GET-only; never exposed to frontend'}) as id`;
   if(rows.length!==1||!rows[0].id)throw Error('VAULT_STORAGE_UNVERIFIED');
   return 'PAIRED';
  });
 });
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
Deno.serve(async(req:Request)=>{
 try{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
  if(!['health','provision','inventory'].includes(route||''))return reply(404,{status:'NOT_FOUND'});
  const bearer=credential(req);
  try{await verifyGitHubOidc(bearer);}catch{return reply(401,{status:'UNAUTHORIZED'});}
  if(route==='health'&&req.method==='GET')return reply(200,{status:'AUTHENTICATED',service:SERVICE,...SCOPE,scope:'OIDC_EXACT_WORKFLOW',writes_enabled:false,app_crm_unchanged:true});
  if(route==='provision'&&req.method==='POST'){
   const body=await safeBody(req);assertScope(body,{pair:true});
   const result=await pair(body.api_token);
   return reply(200,{status:result,secret_store:'SUPABASE_VAULT',credential_exposed:false});
  }
  if(route==='inventory'&&req.method==='POST'){
   const body=await safeBody(req);assertScope(body);
   const data=await inventory();
   return reply(200,{status:'COMPLETED',company_id:SCOPE.company_id,engine_id:SCOPE.engine_id,environment:SCOPE.environment,version:SCOPE.version,...data});
  }
  return reply(405,{status:'METHOD_DENIED'});
 }catch(e){
  const v=String(e instanceof Error?e.message:'UNKNOWN');
  const allowed=new Set(['SCOPE_INVALID','SCOPE_FIELDS_DENIED','SCOPE_DENIED','PAIR_CREDENTIAL_DENIED','VAULT_CONNECTION_MISSING','VAULT_SECRET_ABSENT','REQUEST_TOO_LARGE','CLOUDFLARE_TOKEN_INVALID','CLOUDFLARE_TOKEN_INACTIVE','VAULT_STORAGE_UNVERIFIED','CF_UNTRUSTED_INVENTORY','CF_PAGINATION_UNTRUSTED']);
  const code=allowed.has(v)?v:v.startsWith('CLOUDFLARE_READ_HTTP_')?v:'BACKEND_ERROR';
  return reply(code.startsWith('SCOPE_')||code==='PAIR_CREDENTIAL_DENIED'?400:503,{status:'BLOCKED',code});
 }
});