// CF-TOKEN-ISSUER-001 isolated LAB, exactly one D1 Read child. No generic resource API or frontend access.
import postgres from 'npm:postgres@3.4.7';
import {ACCOUNT_ID,SCOPE,ISSUER_NAME,NEW_VAULT_NAME,CHILD_NAME,CHILD_EXPIRY,TOKEN_OP,TOKEN_REQUEST_ID,verifyGitHubOidc,assertIssueOrder,d1ReadGroup,childPolicy,ISSUER_V2_NAME,ISSUER_V2_VAULT_NAME,ISSUER_V2_EXPIRY,ISSUER_V2_OP,ISSUER_V2_REQUEST_ID,assertIssuerV2Order,accountTokenWriteGroup,scopedIssuerPolicy,assertScopedIssuerMetadata} from './policy.mjs';
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
   // Store once, atomically, before delayed validation: Cloudflare can propagate new credentials asynchronously.
   // The returned status is deliberately NOT marked verified.
   const stored=await tx`select vault.create_secret(${child.value},${NEW_VAULT_NAME},${'FACT001 LAB D1 Read pending physical verification; expires 2026-11-17'}) as id`;
   if(stored.length!==1||!stored[0].id)throw Error('VAULT_CREATE_FAILED');
   return {status:'ISSUED_PENDING_VERIFICATION',new_token:true,read_verified:false,expires_on:CHILD_EXPIRY};
  }catch(error){
   // Only the newly created token ID may be revoked; errors must never log token values.
   if(issuedId){try{await cloudflare('DELETE','/accounts/'+ACCOUNT_ID+'/tokens/'+issuedId,issuer);}catch{}}
   const msg=error instanceof Error?error.message:'';
   if(['TOKEN_ISSUE_INVALID','CHILD_EFFECTIVE_READ_DENIED','VAULT_CREATE_FAILED'].includes(msg)||/^CF_HTTP_(400|401|403|404|409|429|500|503)$/.test(msg))throw Error(msg);
   throw Error('LAB_ISSUE_FAILED');
  }
 }));
}
async function verifyChild(){
 return await withDb(async sql=>{
  const child=await oneSecret(sql,NEW_VAULT_NAME);
  try{
   const result=await cloudflare('GET','/accounts/'+ACCOUNT_ID+'/d1/database?page=1&per_page=1',child);
   if(!Array.isArray(result.result))throw Error('CF_D1_UNTRUSTED');
   return {status:'D1_READ_VERIFIED',read_verified:true,cloudflare_writes:0};
  }catch(e){
   const message=e instanceof Error?e.message:'';
   const code=/^CF_HTTP_(401|403|429)$/.test(message)?message:'D1_READ_NOT_VERIFIED';
   return {status:'PENDING_VERIFICATION',read_verified:false,reason:code};
  }
 });
}


async function issueScopedIssuerV2(){
 return await withDb(sql=>sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtext(${ISSUER_V2_VAULT_NAME}))`;
  const oldVault=await tx`select id from vault.secrets where name=${ISSUER_V2_VAULT_NAME} limit 2`;
  if(oldVault.length>1)throw Error('ISSUER_VAULT_DUPLICATE');
  if(oldVault.length===1)return {status:'ALREADY_STORED_PENDING_SCOPE_VERIFICATION',created:false};
  const v1=await oneSecret(tx,ISSUER_NAME);
  const listed=await cloudflare('GET','/accounts/'+ACCOUNT_ID+'/tokens?per_page=100&page=1',v1);
  if(!Array.isArray(listed.result)||listed.result.some((t:any)=>t?.name===ISSUER_V2_NAME))
   throw Error('ISSUER_V2_ALREADY_EXISTS_RECONCILE');
  const groups=await cloudflare('GET','/accounts/'+ACCOUNT_ID+'/tokens/permission_groups',v1);
  const groupId=accountTokenWriteGroup(groups.result);
  let newId:string|undefined;
  try{
   const created=await cloudflare('POST','/accounts/'+ACCOUNT_ID+'/tokens',v1,scopedIssuerPolicy(groupId));
   const tok=created.result;
   if(typeof tok?.id==='string'&&/^[a-f0-9]{32}$/.test(tok.id))newId=tok.id;
   if(!newId||typeof tok?.value!=='string'||tok.value.length<24)throw Error('ISSUER_V2_RESPONSE_INVALID');
   // The plaintext remains in the server runtime and travels only via the encrypted Vault RPC.
   // Do not print it, put it in pg_net results, GitHub Actions, task output, or caller HTTP.
   const stored=await tx`select vault.create_secret(${tok.value},${ISSUER_V2_VAULT_NAME},
      ${'FACT001 scoped Cloudflare issuer v2; Account API Tokens Write only; expiry 2026-12-11'}) as id`;
   if(stored.length!==1||!stored[0].id)throw Error('ISSUER_V2_VAULT_FAILED');
   return {status:'SCOPED_ISSUER_STORED_PENDING_VERIFICATION',created:true,expires_on:ISSUER_V2_EXPIRY};
  }catch{
   // Preserve issuer v1. Revoke ONLY a known newly created v2 token if Vault write failed.
   if(newId){try{await cloudflare('DELETE','/accounts/'+ACCOUNT_ID+'/tokens/'+newId,v1);}catch{}}
   throw Error('ISSUER_V2_ISSUANCE_BLOCKED');
  }
 }));
}
async function verifyScopedIssuerV2(){
 return await withDb(async sql=>{
  const v2=await oneSecret(sql,ISSUER_V2_VAULT_NAME);
  const [listed,groups]=await Promise.all([
   cloudflare('GET','/accounts/'+ACCOUNT_ID+'/tokens?per_page=100&page=1',v2),
   cloudflare('GET','/accounts/'+ACCOUNT_ID+'/tokens/permission_groups',v2)
  ]);
  const groupId=accountTokenWriteGroup(groups.result);
  const matches=(listed.result||[]).filter((t:any)=>t?.name===ISSUER_V2_NAME);
  if(matches.length!==1)throw Error('ISSUER_V2_IDENTITY_UNVERIFIED');
  assertScopedIssuerMetadata(matches[0],groupId);
  return {status:'SCOPED_ISSUER_V2_VERIFIED',scope:'ACCOUNT_API_TOKENS_WRITE_ONLY',
   credential_exposed:false,parent_revoked:false,billing_permission:false,integration_permission:false,
   cloudflare_writes:0};
 });
}

Deno.serve(async(req:Request)=>{
 try{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
  if(!['health','issue-d1-read-lab','verify-d1-read-lab','issue-scoped-issuer-v2','verify-scoped-issuer-v2'].includes(route||''))return reply(404,{status:'NOT_FOUND'});
  try{await verifyGitHubOidc(bearer(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
  if(route==='health'&&req.method==='GET')return reply(200,{status:'AUTHENTICATED',service:'cf-token-issuer-lab',scope:SCOPE,cloudflare_writes_enabled:false});
  if(route==='issue-d1-read-lab'&&req.method==='POST'){
   if(Number(req.headers.get('content-length')||0)>2000)return reply(413,{status:'TOO_LARGE'});
   let order;try{order=await req.json();assertIssueOrder(order);}catch{return reply(400,{status:'REQUEST_DENIED'});}
   const result=await runOnce();
   return reply(200,{...result,account_id:ACCOUNT_ID,request_id:TOKEN_REQUEST_ID,operation:TOKEN_OP,credential_exposed:false,prod_resources_modified:false});
  }
  if(route==='verify-d1-read-lab'&&req.method==='POST'){
   let body;try{body=await req.json();assertIssueOrder(body);}catch{return reply(400,{status:'REQUEST_DENIED'});}
   const result=await verifyChild();
   return reply(result.read_verified?200:409,{...result,credential_exposed:false,account_id:ACCOUNT_ID});
  }

  if(route==='issue-scoped-issuer-v2'&&req.method==='POST'){
   if(Number(req.headers.get('content-length')||0)>1500)return reply(413,{status:'TOO_LARGE'});
   try{assertIssuerV2Order(await req.json())}catch{return reply(400,{status:'REQUEST_DENIED'});}
   const result=await issueScopedIssuerV2();
   return reply(200,{...result,account_id:ACCOUNT_ID,credential_exposed:false,parent_revoked:false,prod_resources_modified:false});
  }
  if(route==='verify-scoped-issuer-v2'&&req.method==='POST'){
   try{assertIssuerV2Order(await req.json())}catch{return reply(400,{status:'REQUEST_DENIED'});}
   const result=await verifyScopedIssuerV2();
   return reply(200,result);
  }
  return reply(405,{status:'METHOD_DENIED'});
 }catch(error){
  const msg=error instanceof Error?error.message:'';
  const allowed=new Set(['NO_BACKEND_DB','VAULT_SECRET_MISSING','VAULT_DUPLICATE','TOKEN_EXISTS_OR_UNTRUSTED','GROUPS_DENIED','D1_READ_GROUP_UNAVAILABLE','D1_GROUP_UNSELECTABLE','LAB_ISSUE_FAILED','TOKEN_ISSUE_INVALID','CHILD_EFFECTIVE_READ_DENIED','VAULT_CREATE_FAILED','ISSUER_VAULT_DUPLICATE','ISSUER_V2_ALREADY_EXISTS_RECONCILE','ISSUER_V2_RESPONSE_INVALID','ISSUER_V2_VAULT_FAILED','ISSUER_V2_ISSUANCE_BLOCKED','ISSUER_V2_IDENTITY_UNVERIFIED','ISSUER_NOT_MINIMAL','ISSUER_GROUP_UNVERIFIED','ISSUER_GROUP_ABSENT','ISSUER_GROUP_AMBIGUOUS','ISSUER_GROUP_NOT_SELECTABLE','ISSUER_GROUP_WRONG_SCOPE','ISSUER_GROUP_INVALID_ID']);
  const code=allowed.has(msg)?msg:/^CF_HTTP_(400|401|403|404|409|429|500|503)$/.test(msg)?msg:'BACKEND_ERROR';
  console.warn('FACT001_LAB_ISSUER_DENIAL='+code);
  return reply(503,{status:'BLOCKED',code});
 }
});
