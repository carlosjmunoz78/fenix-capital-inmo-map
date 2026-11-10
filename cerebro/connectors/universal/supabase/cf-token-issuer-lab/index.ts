// CF-TOKEN-ISSUER-001 isolated LAB, exactly one D1 Read child. No generic resource API or frontend access.
import postgres from 'npm:postgres@3.4.7';
import {ACCOUNT_ID,SCOPE,ISSUER_NAME,NEW_VAULT_NAME,CHILD_NAME,CHILD_EXPIRY,TOKEN_OP,TOKEN_REQUEST_ID,verifyGitHubOidc,assertIssueOrder,d1ReadGroup,childPolicy} from './policy.mjs';
const API='https://api.cloudflare.com/client/v4';
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const bearer=(req:Request)=>(req.headers.get('authorization')||'').startsWith('Bearer ')?req.headers.get('authorization')!.slice(7):'';
async function cloudflare(method:'GET'|'POST'|'DELETE',path:string,token:string,body?:unknown){
 const response=await fetch(API+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('CF_HTTP_'+response.status);
 const data=await response.json();if(data?.success!==true)throw Error('CF_RESULT_REJECTED');
 return data;
}
async function withDb<T>(action:(sql:any)=>Promise<T>):Promise<T>{
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)throw Error('NO_BACKEND_DB');
 const sql=postgres(url,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{return await action(sql);}finally{await sql.end({timeout:2}).catch(()=>{});}
}
async function oneSecret(tx:any,name:string){
 const rows=await tx`select decrypted_secret from vault.decrypted_secrets where name=${name} limit 2`;
 if(rows.length!==1||typeof rows[0].decrypted_secret!=='string'||rows[0].decrypted_secret.length<20)throw Error('VAULT_SECRET_MISSING');
 return rows[0].decrypted_secret;
}
async function runOnce(){
 return await withDb(sql=>sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtext(${NEW_VAULT_NAME}))`;
  const previous=await tx`select id from vault.secrets where name=${NEW_VAULT_NAME} limit 2`;
  if(previous.length>1)throw Error('VAULT_DUPLICATE');
  if(previous.length===1)return {status:'ALREADY_PAIRED',new_token:false};
  const issuer=await oneSecret(tx,ISSUER_NAME);
  const existing=await cloudflare('GET','/accounts/'+ACCOUNT_ID+'/tokens?per_page=100&page=1',issuer);
  if(!Array.isArray(existing.result)||existing.result.some((t:any)=>t?.name===CHILD_NAME))throw Error('TOKEN_EXISTS_OR_UNTRUSTED');
  const groups=await cloudflare('GET','/accounts/'+ACCOUNT_ID+'/tokens/permission_groups',issuer);
  const body=childPolicy(d1ReadGroup(groups.result));
  let issuedId:string|undefined;
  try{
   const made=await cloudflare('POST','/accounts/'+ACCOUNT_ID+'/tokens',issuer,body);
   const child=made.result;
   if(typeof child?.id==='string'&&/^[a-f0-9]{32}$/.test(child.id))issuedId=child.id;
   if(!issuedId||typeof child?.value!=='string'||child.value.length<24)throw Error('TOKEN_ISSUE_INVALID');
   let readOk=false;
   for(let attempt=0;attempt<3;attempt++){
    try{const inventory=await cloudflare('GET','/accounts/'+ACCOUNT_ID+'/d1/database?page=1&per_page=1',child.value);readOk=Array.isArray(inventory.result);if(readOk)break;}catch{}
    if(attempt<2)await new Promise(r=>setTimeout(r,400*(attempt+1)));
   }
   if(!readOk)throw Error('CHILD_EFFECTIVE_READ_DENIED');
   const stored=await tx`select vault.create_secret(${child.value},${NEW_VAULT_NAME},${'FACT001 LAB D1 Read only; expires 2026-11-17; no other privileges'}) as id`;
   if(stored.length!==1||!stored[0].id)throw Error('VAULT_CREATE_FAILED');
   return {status:'ISSUED_AND_VAULT_STORED',new_token:true,read_verified:true,expires_on:CHILD_EXPIRY};
  }catch{
   // Only the newly created token ID may be revoked; errors must never log token values.
   if(issuedId){try{await cloudflare('DELETE','/accounts/'+ACCOUNT_ID+'/tokens/'+issuedId,issuer);}catch{}}
   throw Error('LAB_ISSUE_FAILED');
  }
 }));
}
Deno.serve(async(req:Request)=>{
 try{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
  if(!['health','issue-d1-read-lab'].includes(route||''))return reply(404,{status:'NOT_FOUND'});
  try{await verifyGitHubOidc(bearer(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
  if(route==='health'&&req.method==='GET')return reply(200,{status:'AUTHENTICATED',service:'cf-token-issuer-lab',scope:SCOPE,cloudflare_writes_enabled:false});
  if(route==='issue-d1-read-lab'&&req.method==='POST'){
   if(Number(req.headers.get('content-length')||0)>2000)return reply(413,{status:'TOO_LARGE'});
   let order;try{order=await req.json();assertIssueOrder(order);}catch{return reply(400,{status:'REQUEST_DENIED'});}
   const result=await runOnce();
   return reply(200,{...result,account_id:ACCOUNT_ID,request_id:TOKEN_REQUEST_ID,operation:TOKEN_OP,credential_exposed:false,prod_resources_modified:false});
  }
  return reply(405,{status:'METHOD_DENIED'});
 }catch{return reply(503,{status:'BLOCKED',code:'CF_ISSUER_LAB_DENIED'});}
});
