// New isolated CEREBRO FACT-001 Edge Function. No App/CRM changes, no generic API proxy.
// Authentication: strictly verified short-lived GitHub OIDC signed assertion, exact repo+branch+workflow.
// Only an exact LAB EU KV temporary key PUT/GET/DELETE. Temporary signed OIDC and existing encrypted Supabase Vault.
import postgres from 'npm:postgres@3.4.7';
import {ACCOUNT_ID,VAULT_NAME,SCOPE,verifyGitHubOidc,KV_NAMESPACE_ID,KV_OPERATION,assertKVOrder,assertKVNamespace,kvKeyFor} from './logic.mjs';
const SERVICE='cerebro-fact001-cloudflare-kv-write-lab';
const NAME='cerebro-fact001-cloudflare-kv-write-lab';
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

async function cf(method:'GET'|'PUT'|'DELETE',path:string,token:string,payload?:string){
 const prefix='/accounts/'+ACCOUNT_ID+'/storage/kv/namespaces/'+KV_NAMESPACE_ID;
 const validMeta=method==='GET'&&path===prefix;
 const suffix=prefix+'/values/fact001/cerebro-kv-write/';
 const validKey=['GET','PUT','DELETE'].includes(method)&&path.startsWith(suffix)&&/^CFW-[0-9]{8}-[0-9]{3}$/.test(path.slice(suffix.length));
 if(!validMeta&&!validKey)throw Error('KV_CLOUD_API_PATH_DENIED');
 return await fetch('https://api.cloudflare.com/client/v4'+path+(method==='PUT'?'?expiration_ttl=600':''),{
  method,headers:{Authorization:'Bearer '+token,Accept:'*/*',...(payload?{'Content-Type':'text/plain'}:{})},
  ...(payload?{body:payload}:{}),redirect:'error',signal:AbortSignal.timeout(12000)
 });
}
async function runKVTest(id:string){
 const token=await getToken();
 const base='/accounts/'+ACCOUNT_ID+'/storage/kv/namespaces/'+KV_NAMESPACE_ID;
 const meta=await cf('GET',base,token);
 if(!meta.ok||!assertKVNamespace(await meta.json()))throw Error('KV_NAMESPACE_GATE_DENIED');
 const key=kvKeyFor(id),path=base+'/values/'+key,value='FACT001-CEREBRO-KV-LAB:'+id;
 let written=false,readback=false,removed=false;
 try{
  const wr=await cf('PUT',path,token,value);
  if(!wr.ok||(await wr.json())?.success!==true)throw Error('KV_WRITE_FAILED');
  written=true;
  const got=await cf('GET',path,token);
  if(!got.ok||(await got.text())!==value)throw Error('KV_READBACK_FAILED');
  readback=true;
  const del=await cf('DELETE',path,token);
  if(!del.ok||(await del.json())?.success!==true)throw Error('KV_DELETE_ROLLBACK_FAILED');
  removed=true;
 }finally{
  if(written&&!removed){
   try{const res=await cf('DELETE',path,token);removed=res.ok&&(await res.json())?.success===true;}catch{}
  }
 }
 if(!written||!readback||!removed)throw Error('KV_E2E_NOT_ROLLED_BACK');
 return {status:'COMPLETED',...SCOPE,account_id:ACCOUNT_ID,request_id:id,namespace_id:KV_NAMESPACE_ID,
 write_verified:true,read_verified:true,rollback_verified:true,production_mutations:0,existing_resources_modified:0,secret_exposed:false};
}
Deno.serve(async(req:Request)=>{
 try{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
  if(!['health','write-test'].includes(route||''))return reply(404,{status:'NOT_FOUND'});
  try{await verifyGitHubOidc(credential(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
  if(route==='health'&&req.method==='GET')return reply(200,{status:'AUTHENTICATED',...SCOPE,operation:KV_OPERATION,namespace_id:KV_NAMESPACE_ID});
  if(route==='write-test'&&req.method==='POST'){
   const raw=await req.text();if(raw.length>2048)throw Error('KV_BODY_TOO_LARGE');
   let body;try{body=JSON.parse(raw);}catch{throw Error('KV_JSON_INVALID');}
   return reply(200,await runKVTest(assertKVOrder(body)));
  }
  return reply(405,{status:'METHOD_NOT_ALLOWED'});
 }catch(e){
  const err=e instanceof Error?e.message:'UNKNOWN';
  const allow=['KV_ORDER_MALFORMED','KV_ORDER_EXTRA_FIELDS','KV_ORDER_TENANT','KV_ORDER_WRONG_TARGET','KV_JSON_INVALID','KV_BODY_TOO_LARGE'];
  return reply(allow.includes(err)?400:503,{status:'BLOCKED',code:allow.includes(err)?err:'LAB_BACKEND_BLOCKED'});
 }
});
