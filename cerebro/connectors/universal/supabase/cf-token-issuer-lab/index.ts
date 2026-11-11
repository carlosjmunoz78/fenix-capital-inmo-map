// FACT001 Cloudflare issuer v2: post-E2E LAB SAFE BASELINE.
// ONLY scoped metadata verification, NO token issuance, DELETE or mutation route.
// Signed GitHub OIDC scoped to exact owner/branch/workflow before any Vault access.
// Backup of v9 E2E exists in PR history, not exposed in active Edge function.
import postgres from 'npm:postgres@3.4.7';
import {ACCOUNT_ID,SCOPE,ISSUER_V2_NAME,ISSUER_V2_ID,ISSUER_V2_VAULT_NAME,
  verifyGitHubOidc,assertIssuerV2Order,existingTokenWritePermissionId,assertScopedIssuerMetadata} from './policy.mjs';
const API='https://api.cloudflare.com/client/v4';
const JSON_HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(code:number,data:Record<string,unknown>)=>new Response(JSON.stringify(data),{status:code,headers:JSON_HEADERS});
const bearer=(req:Request)=>{const x=req.headers.get('authorization')||'';return x.startsWith('Bearer ')?x.slice(7):'';};
async function v2Metadata(){
 const db=Deno.env.get('SUPABASE_DB_URL');if(!db)throw Error('VAULT_DATABASE_UNAVAILABLE');
 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let token='';
 try{
  const secret=await sql`select decrypted_secret from vault.decrypted_secrets where name=${ISSUER_V2_VAULT_NAME} limit 2`;
  if(secret.length!==1||typeof secret[0].decrypted_secret!=='string'||secret[0].decrypted_secret.length<24)
   throw Error('V2_TOKEN_NOT_IN_VAULT');
  token=secret[0].decrypted_secret;
  const read=async(path:string)=>{
   const r=await fetch(API+path,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
     redirect:'error',signal:AbortSignal.timeout(10000)});
   if(r.status!==200)throw Error('UPSTREAM_HTTP_'+r.status);
   const j=await r.json();if(j?.success!==true)throw Error('UPSTREAM_REJECTED');
   return j.result;
  };
  const [tokens,groups]=await Promise.all([read('/accounts/'+ACCOUNT_ID+'/tokens?per_page=100&page=1'),
    read('/accounts/'+ACCOUNT_ID+'/tokens/permission_groups')]);
  if(!Array.isArray(tokens)||!Array.isArray(groups))throw Error('UPSTREAM_INVALID');
  const perm=existingTokenWritePermissionId(groups);
  const hits=tokens.filter(x=>x?.id===ISSUER_V2_ID&&x?.name===ISSUER_V2_NAME);
  if(hits.length!==1)throw Error('V2_IDENTITY_NOT_VERIFIED');
  assertScopedIssuerMetadata(hits[0],perm);
  return {status:'SCOPED_ISSUER_V2_VERIFIED',account_id:ACCOUNT_ID,
   permission:'Account API Tokens Write',issuer_id:ISSUER_V2_ID,
   service:'cerebro-fact001-cf-issuer-lab',environment:'LAB',
   token_value_exposed:false,external_writes:0,legacy_issuer_read:false};
 }finally{
  token='';
  await sql.end({timeout:2}).catch(()=>{});
 }
}
Deno.serve(async req=>{
 const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)||'';
 if(!['health','verify-scoped-issuer-v2'].includes(route))return reply(404,{status:'NOT_FOUND'});
 try{await verifyGitHubOidc(bearer(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 if(route==='health'&&req.method==='GET')return reply(200,{status:'AUTHENTICATED',
    scope:SCOPE,cloudflare_writes_enabled:false,legacy_issuer_enabled:false});
 if(route==='verify-scoped-issuer-v2'&&req.method==='POST'){
  if(Number(req.headers.get('content-length')||0)>1500)return reply(413,{status:'PAYLOAD_TOO_LARGE'});
  try{assertIssuerV2Order(await req.json())}catch{return reply(400,{status:'ORDER_DENIED'});}
  try{return reply(200,await v2Metadata());}
  catch(e){
   const raw=e instanceof Error?e.message:'';
   const code=/^(VAULT_DATABASE_UNAVAILABLE|V2_TOKEN_NOT_IN_VAULT|UPSTREAM_REJECTED|UPSTREAM_INVALID|V2_IDENTITY_NOT_VERIFIED|ISSUER_NOT_MINIMAL|ISSUER_WRITE_PERMISSION_METADATA_UNVERIFIED|UPSTREAM_HTTP_(401|403|404|429|500|503))$/.test(raw)?raw:'V2_READ_ONLY_BROKER_ERROR';
   console.warn('FACT001_CF_V2_READ_ONLY='+code);
   return reply(503,{status:'BLOCKED',code,credential_exposed:false});
  }
 }
 return reply(405,{status:'METHOD_DENIED'});
});
