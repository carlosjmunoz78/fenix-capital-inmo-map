// FACT-001 one-shot deletion, explicitly authorized by owner; no generic SQL or API.
// Temporarily installed over the existing retired test function, then deletes itself.
// Requires signed GitHub OIDC (exact repo/ref/workflow/audience) and Vault-scoped PAT.
// NO App/CRM function, database, secret, project deletion, or billing operations.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc,assertCleanupOrder,SUPABASE_REF,TEST_FUNCTION,TEST_FUNCTION_ID,VAULT_NAME,SCOPE} from './policy.mjs';
const HEADERS={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(status:number,data:Record<string,unknown>)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const AUTH=(req:Request)=>{const v=req.headers.get('authorization')||'';return v.startsWith('Bearer ')?v.slice(7):'';};
const API='https://api.supabase.com/v1/projects/'+SUPABASE_REF+'/functions/'+TEST_FUNCTION;
async function getPat(){
 const dsn=Deno.env.get('SUPABASE_DB_URL');if(!dsn)throw Error('DATABASE_NOT_CONFIGURED');
 const sql=postgres(dsn,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{
  const rows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${VAULT_NAME} limit 2`;
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string'||rows[0].decrypted_secret.length<20)throw Error('SCOPED_PAT_MISSING');
  return rows[0].decrypted_secret;
 }finally{await sql.end({timeout:2}).catch(()=>{});}
}
async function api(token:string,method:'GET'|'DELETE'){
 const resp=await fetch(API,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(method==='GET'&&resp.status===404)return {notFound:true};
 if(!resp.ok)throw Error('SUPABASE_MANAGEMENT_HTTP_'+resp.status);
 if(method==='DELETE')return {acknowledged:true};
 let data;
 try{data=await resp.json()}catch{throw Error('SUPABASE_MANAGEMENT_JSON_INVALID');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('SUPABASE_MANAGEMENT_DATA_INVALID');
 return data;
}
async function deleteOnce(){
 let pat=await getPat();
 try{
  const existing=await api(pat,'GET');
  if((existing as any).notFound===true)return {status:'ALREADY_ABSENT_VERIFIED',deleted:false,expected_function:TEST_FUNCTION,secret_exposed:false};
  const f=existing as Record<string,unknown>;
  if(f.id!==TEST_FUNCTION_ID||f.slug!==TEST_FUNCTION||f.name!==TEST_FUNCTION||f.status!=='ACTIVE'||f.verify_jwt!==false||!Number.isSafeInteger(f.version)||Number(f.version)<5)throw Error('TARGET_IDENTITY_OR_VERSION_MISMATCH');
  await api(pat,'DELETE');
  // May fail to return because the deleting function is executing inside itself;
  // external MCP and GitHub runbook must verify absence afterwards.
  const confirmation=await api(pat,'GET');
  if(!(confirmation as any).notFound)throw Error('DELETE_RECONCILIATION_REQUIRED');
  return {status:'SUPABASE_TEST_FUNCTION_DELETED_AND_VERIFIED',deleted:true,project_ref:SUPABASE_REF,function_slug:TEST_FUNCTION,other_functions_deleted:0,secret_exposed:false};
 }finally{pat='';}
}
Deno.serve(async(req:Request)=>{
 try{
  const endpoint=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)||'';
  if(!['health','delete-once'].includes(endpoint))return reply(404,{status:'NOT_FOUND'});
  try{await verifyGitHubOidc(AUTH(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
  if(endpoint==='health'&&req.method==='GET')return reply(200,{status:'SIGNED_SERVICE_AUTHENTICATED',scope:SCOPE});
  if(endpoint==='delete-once'&&req.method==='POST'){
   if(Number(req.headers.get('content-length')||0)>1500)return reply(413,{status:'TOO_LARGE'});
   try{assertCleanupOrder(await req.json());}catch{return reply(400,{status:'ORDER_DENIED'});}
   const result=await deleteOnce();
   return reply(200,result);
  }
  return reply(405,{status:'METHOD_NOT_ALLOWED'});
 }catch(e){
  const m=e instanceof Error?e.message:'';
  const code=/^SUPABASE_MANAGEMENT_HTTP_(400|401|403|404|429|500|503)$/.test(m)?m:
  ['SCOPED_PAT_MISSING','DATABASE_NOT_CONFIGURED','TARGET_IDENTITY_OR_VERSION_MISMATCH','DELETE_RECONCILIATION_REQUIRED','SUPABASE_MANAGEMENT_JSON_INVALID','SUPABASE_MANAGEMENT_DATA_INVALID'].includes(m)?m:'SERVICE_PROBE_FAILED';
  console.warn('FACT001_SUPABASE_ADMIN_CLEANUP='+code);
  return reply(503,{status:'BLOCKED',code,secret_exposed:false});
 }
});
