// CEREBRO NIA / Cloudflare Queue credential bootstrap - ONE-TIME LAB.
import postgres from 'npm:postgres@3.4.7';
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const ISSUER_VAULT='cerebro_cf_account_token_issuer_v2';
const BOOT_VAULT='cerebro_nia_console_bootstrap_20261117';
const TARGET_VAULT='cerebro_nia_cf_queues_write_lab_20261117';
const CF_BASE='https://api.cloudflare.com/client/v4';
const NAME='cerebro-nia-console-queue-write-lab-20261117';
function reply(status:number,stage:string){return new Response(JSON.stringify({status:stage}),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function safeBytes(s:string){return new TextEncoder().encode(s)}
async function same(a:string,b:string){if(a.length!==b.length||a.length<48||a.length>256)return false;const d=await Promise.all([crypto.subtle.digest('SHA-256',safeBytes(a)),crypto.subtle.digest('SHA-256',safeBytes(b))]);const x=new Uint8Array(d[0]),y=new Uint8Array(d[1]);let v=0;for(let i=0;i<x.length;i++)v|=x[i]^y[i];return v===0}
async function withDb<T>(fn:(sql:any)=>Promise<T>):Promise<T>{const url=Deno.env.get('SUPABASE_DB_URL');if(!url)throw Error('DB_UNAVAILABLE');const sql=postgres(url,{prepare:false,max:1,connect_timeout:5,idle_timeout:1});try{return await fn(sql)}finally{await sql.end({timeout:2}).catch(()=>{})}}
async function secret(sql:any,name:string){const x=await sql`select decrypted_secret from vault.decrypted_secrets where name=${name} limit 2`;if(x.length!==1||typeof x[0].decrypted_secret!=='string')throw Error('SECRET_MISSING');return x[0].decrypted_secret as string}
async function cf(token:string,path:string,method='GET',body?:unknown){const r=await fetch(CF_BASE+path,{method,headers:{Authorization:'Bearer '+token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('CF_HTTP_'+r.status);const data=await r.json();if(data?.success!==true)throw Error('CF_RESPONSE_DENIED');return data.result}
function queueGroup(items:any[]){const matched=items.filter(x=>['Queues Write','Queues Edit'].includes(x?.name)&&x?.is_selectable===true&&Array.isArray(x?.scopes)&&x.scopes.includes('com.cloudflare.api.account')&&/^[0-9a-f]{32}$/.test(x?.id||''));if(matched.length!==1)throw Error('QUEUE_PERMISSION_NOT_EXACT');return matched[0].id as string}
Deno.serve(async req=>{
 if(req.method!=='POST')return reply(405,'METHOD_DENIED');
 const path=new URL(req.url).pathname.split('/').filter(Boolean).pop();
 if(path!=='probe'&&path!=='bootstrap')return reply(404,'ROUTE_DENIED');
 const authorization=req.headers.get('authorization')||'';
 const presented=authorization.startsWith('Bearer ')?authorization.slice(7):'';
 try{
  return await withDb(async sql=>{
   const boot=await secret(sql,BOOT_VAULT);
   if(!await same(presented,boot))return reply(403,'BOOTSTRAP_UNAUTHORIZED');
   const issuer=await secret(sql,ISSUER_VAULT);
   const groups=await cf(issuer,'/accounts/'+ACCOUNT+'/tokens/permission_groups');
   if(!Array.isArray(groups))throw Error('PERMISSION_GROUP_FORMAT');
   const queueId=queueGroup(groups);
   if(path==='probe')return reply(200,'EXACT_QUEUE_WRITE_PERMISSION_VERIFIED');
   const existing=await sql`select name from vault.secrets where name=${TARGET_VAULT} limit 2`;
   if(existing.length!==0)return reply(409,'QUEUE_TOKEN_ALREADY_IN_VAULT');
   const token=await cf(issuer,'/accounts/'+ACCOUNT+'/tokens','POST',{
    name:NAME,expires_on:'2026-12-01T00:00:00Z',
    policies:[{effect:'allow',resources:{['com.cloudflare.api.account.'+ACCOUNT]:'*'},permission_groups:[{id:queueId}]}]
   });
   const value=token?.value,id=token?.id;
   if(typeof value!=='string'||value.length<24||typeof id!=='string')throw Error('CF_TOKEN_RESPONSE_INCOMPLETE');
   try{
    await sql`select vault.create_secret(${value},${TARGET_VAULT},${'CEREBRO NIA exclusive Queue Write LAB; token id '+id+'; expires 2026-12-01'})`;
   }catch{
    await cf(issuer,'/accounts/'+ACCOUNT+'/tokens/'+id,'DELETE').catch(()=>{});
    throw Error('VAULT_SAVE_FAILED_AND_REVOKE_ATTEMPTED');
   }
   return reply(200,'QUEUE_WRITE_TOKEN_STORED_IN_VAULT');
  })
 }catch(e){
  const msg=String((e as Error)?.message||'');
  const allowed=new Set(['DB_UNAVAILABLE','SECRET_MISSING','QUEUE_PERMISSION_NOT_EXACT','PERMISSION_GROUP_FORMAT','CF_HTTP_401','CF_HTTP_403','CF_HTTP_404','CF_HTTP_429','CF_HTTP_500','CF_RESPONSE_DENIED','CF_TOKEN_RESPONSE_INCOMPLETE','VAULT_SAVE_FAILED_AND_REVOKE_ATTEMPTED']);
  return reply(503,allowed.has(msg)?msg:'BOOTSTRAP_BLOCKED');
 }
});