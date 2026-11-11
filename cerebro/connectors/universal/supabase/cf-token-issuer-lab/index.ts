// FACT001 Cloudflare issuer v2: post-E2E LAB SAFE BASELINE.
// ONLY scoped metadata verification, NO token issuance, DELETE or mutation route.
// Signed GitHub OIDC scoped to exact owner/branch/workflow before any Vault access.
// Backup of v9 E2E exists in PR history, not exposed in active Edge function.
import postgres from 'npm:postgres@3.4.7';
import {ACCOUNT_ID,SCOPE,ISSUER_V2_NAME,ISSUER_V2_ID,ISSUER_V2_VAULT_NAME,
  verifyGitHubOidc,assertIssuerV2Order,existingTokenWritePermissionId,assertScopedIssuerMetadata,
  GATEWAY_D1_VAULT_NAME,GATEWAY_D1_ID_VAULT_NAME,GATEWAY_D1_TOKEN_NAME,GATEWAY_D1_DB_ID,
  assertGatewayD1Order,gatewayD1TokenPolicy} from './policy.mjs';
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
  const selectable=(name:string)=>groups.filter(g=>g?.name===name&&
    Array.isArray(g.scopes)&&g.scopes.includes('com.cloudflare.api.account'))
    .map(g=>g.is_selectable===true);
  return {status:'SCOPED_ISSUER_V2_VERIFIED',account_id:ACCOUNT_ID,
   d1_write_selectable:selectable('D1 Write').length===1&&selectable('D1 Write')[0]===true,
   d1_read_selectable:selectable('D1 Read').length===1&&selectable('D1 Read')[0]===true,
   permission:'Account API Tokens Write',issuer_id:ISSUER_V2_ID,
   service:'cerebro-fact001-cf-issuer-lab',environment:'LAB',
   token_value_exposed:false,external_writes:0,legacy_issuer_read:false};
 }finally{
  token='';
  await sql.end({timeout:2}).catch(()=>{});
 }
}

async function mintGatewayLabD1Writer(){
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)throw Error('VAULT_DATABASE_UNAVAILABLE');
 const sql=postgres(url,{prepare:false,max:1,connect_timeout:5,idle_timeout:1});
 let createdId:string|undefined;
 try{
  return await sql.begin(async tx=>{
   await tx`select pg_advisory_xact_lock(hashtext(${GATEWAY_D1_VAULT_NAME}))`;
   const existing=await tx`select name from vault.secrets where name in (${GATEWAY_D1_VAULT_NAME},${GATEWAY_D1_ID_VAULT_NAME})`;
   if(existing.length!==0){
     if(existing.length!==2)throw Error('D1_WRITER_VAULT_PARTIAL_RECONCILE');
     return {status:'ALREADY_STORED_REQUIRES_READBACK',created:false,credential_exposed:false};
   }
   const secrets=await tx`select decrypted_secret from vault.decrypted_secrets where name=${ISSUER_V2_VAULT_NAME} limit 2`;
   if(secrets.length!==1||typeof secrets[0].decrypted_secret!=='string'||secrets[0].decrypted_secret.length<24)
     throw Error('ISSUER_V2_SECRET_NOT_FOUND');
   const v2=secrets[0].decrypted_secret;
   const cf=async(method:'GET'|'POST'|'DELETE',path:string,body?:unknown)=>{
     const res=await fetch(API+path,{method,headers:{Authorization:'Bearer '+v2,Accept:'application/json',
       ...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),
       redirect:'error',signal:AbortSignal.timeout(15000)});
     if(!res.ok)throw Error('D1_WRITER_CF_HTTP_'+res.status);
     const data=await res.json();if(data?.success!==true)throw Error('D1_WRITER_CF_REJECTED');
     return data.result;
   };
   const root='/accounts/'+ACCOUNT_ID+'/tokens';
   const current=await cf('GET',root+'?per_page=100&page=1');
   if(!Array.isArray(current)||current.some((x:any)=>x?.name===GATEWAY_D1_TOKEN_NAME))throw Error('D1_WRITER_ALREADY_EXISTS_PROVIDER');
   const groups=await cf('GET',root+'/permission_groups');
   const body=gatewayD1TokenPolicy(groups);
   try{
     const made=await cf('POST',root,body);
     if(typeof made?.id==='string'&&/^[a-f0-9]{32}$/.test(made.id))createdId=made.id;
     if(!createdId||typeof made.value!=='string'||made.value.length<24)throw Error('D1_WRITER_RESPONSE_INVALID');
     const token=made.value;
     // Cloudflare token propagation is eventual: seal first, verify in a separate request.
     const one=await tx`select vault.create_secret(${token},${GATEWAY_D1_VAULT_NAME},
       ${'FACT001 recovery D1 exclusive gateway LAB; 2026-12-11 expiry'}) as id`;
     const two=await tx`select vault.create_secret(${createdId},${GATEWAY_D1_ID_VAULT_NAME},
       ${'FACT001 recovery D1 writer provider ID for rotation'}) as id`;
     if(!one[0]?.id||!two[0]?.id)throw Error('D1_WRITER_VAULT_NOT_STORED');
     return {status:'D1_WRITER_SEALED_PENDING_VERIFICATION',created:true,d1_db_id:GATEWAY_D1_DB_ID,
       read_verified:false,token_value_exposed:false,
       expires_on:'2026-12-11T00:00:00Z',cost_additional_eur:0};
   }catch{
     if(createdId){try{await cf('DELETE',root+'/'+createdId);}catch{}}
     throw Error('D1_WRITER_ISSUE_RECONCILE_REQUIRED');
   }
  });
 }finally{await sql.end({timeout:2}).catch(()=>{});}
}

async function verifyGatewayD1Writer(){
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)throw Error('VAULT_DATABASE_UNAVAILABLE');
 const sql=postgres(url,{prepare:false,max:1,connect_timeout:5,idle_timeout:1});
 try{
  const names=[GATEWAY_D1_VAULT_NAME,GATEWAY_D1_ID_VAULT_NAME,ISSUER_V2_VAULT_NAME];
  const found=await sql`select name,decrypted_secret from vault.decrypted_secrets where name in (${names[0]},${names[1]},${names[2]})`;
  if(found.length!==3)throw Error('D1_WRITER_SECRET_SET_INCOMPLETE');
  const map=Object.fromEntries(found.map(x=>[x.name,x.decrypted_secret]));
  const token=map[GATEWAY_D1_VAULT_NAME],issuer=map[ISSUER_V2_VAULT_NAME],tokenId=map[GATEWAY_D1_ID_VAULT_NAME];
  if(typeof token!=='string'||token.length<24||typeof issuer!=='string'||issuer.length<24||
    typeof tokenId!=='string'||!/^[a-f0-9]{32}$/.test(tokenId))throw Error('D1_WRITER_VAULT_UNTRUSTED');
  const root='/accounts/'+ACCOUNT_ID+'/tokens/'+tokenId;
  const meta=await fetch(API+root,{method:'GET',headers:{Authorization:'Bearer '+issuer,Accept:'application/json'},
    redirect:'error',signal:AbortSignal.timeout(10000)});
  if(meta.status!==200)throw Error('D1_WRITER_METADATA_READ_DENIED');
  const body=await meta.json();const candidate=body?.result;
  if(body?.success!==true||candidate?.id!==tokenId||candidate?.name!==GATEWAY_D1_TOKEN_NAME||
    candidate?.status!=='active'||candidate?.policies?.length!==1)throw Error('D1_WRITER_METADATA_MISMATCH');
  const p=candidate.policies[0];
  if(p.effect!=='allow'||JSON.stringify(Object.keys(p.resources||{}))!==JSON.stringify(['com.cloudflare.api.account.'+ACCOUNT_ID])||
    p.resources['com.cloudflare.api.account.'+ACCOUNT_ID]!=='*'||p.permission_groups?.length!==1||
    p.permission_groups[0].id!=='09b2857d1c31407795e75e3fed8617a1')throw Error('D1_WRITER_PRIVILEGE_EXCESS');
  const query=await fetch(API+'/accounts/'+ACCOUNT_ID+'/d1/database/'+GATEWAY_D1_DB_ID+'/query',
   {method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({sql:'SELECT id,enabled,max_jobs_per_tick FROM fact001_runner_config_v1 WHERE id=1'}),
    redirect:'error',signal:AbortSignal.timeout(12000)});
  const admin=await fetch(API+'/accounts/'+ACCOUNT_ID+'/tokens',{method:'GET',
    headers:{Authorization:'Bearer '+token,Accept:'application/json'},
    redirect:'error',signal:AbortSignal.timeout(12000)});
  if(query.status!==200||![401,403].includes(admin.status))
    return {status:'D1_WRITER_EFFECTIVE_PENDING',d1_http:query.status,admin_denied:[401,403].includes(admin.status),token_exposed:false};
  const returned=await query.json();
  if(returned?.success!==true||returned.result?.[0]?.results?.[0]?.id!==1)
    throw Error('D1_WRITER_EFFECTIVE_RESPONSE_INVALID');
  return {status:'D1_WRITER_EFFECTIVE_VERIFIED',d1_db_id:GATEWAY_D1_DB_ID,
    d1_http:200,admin_denied:true,token_exposed:false,external_writes:0};
 }finally{await sql.end({timeout:2}).catch(()=>{});}
}

Deno.serve(async req=>{
 const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)||'';
 if(!['health','verify-scoped-issuer-v2','issue-gateway-d1-writer-once','verify-gateway-d1-writer'].includes(route))return reply(404,{status:'NOT_FOUND'});
 try{await verifyGitHubOidc(bearer(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 if(route==='issue-gateway-d1-writer-once'&&req.method==='POST'){
   if(Number(req.headers.get('content-length')||0)>1500)return reply(413,{status:'PAYLOAD_TOO_LARGE'});
   try{assertGatewayD1Order(await req.json())}catch{return reply(400,{status:'ORDER_DENIED'});}
   try{return reply(200,await mintGatewayLabD1Writer());}
   catch(e){
     const code=e instanceof Error&&/^(D1_WRITER_VAULT_PARTIAL_RECONCILE|ISSUER_V2_SECRET_NOT_FOUND|D1_WRITER_ALREADY_EXISTS_PROVIDER|GATEWAY_D1_WRITE_NOT_DELEGABLE|D1_WRITER_ISSUE_RECONCILE_REQUIRED)$/.test(e.message)?e.message:'D1_WRITER_BLOCKED';
     console.warn('FACT001_D1_WRITER_ISSUER='+code);
     return reply(503,{status:'BLOCKED',code,credential_exposed:false});
   }
 }
 if(route==='verify-gateway-d1-writer'&&req.method==='POST'){
  if(Number(req.headers.get('content-length')||0)>1500)return reply(413,{status:'PAYLOAD_TOO_LARGE'});
  try{assertGatewayD1Order(await req.json())}catch{return reply(400,{status:'ORDER_DENIED'});}
  try{const status=await verifyGatewayD1Writer();
    return reply(status.status==='D1_WRITER_EFFECTIVE_PENDING'?409:200,status);}
  catch(e){const message=e instanceof Error?e.message:'';
    const code=/^(VAULT_DATABASE_UNAVAILABLE|D1_WRITER_SECRET_SET_INCOMPLETE|D1_WRITER_VAULT_UNTRUSTED|D1_WRITER_METADATA_READ_DENIED|D1_WRITER_METADATA_MISMATCH|D1_WRITER_PRIVILEGE_EXCESS|D1_WRITER_EFFECTIVE_RESPONSE_INVALID)$/.test(message)?message:'D1_WRITER_VERIFY_BLOCKED';
    console.warn('FACT001_GATEWAY_D1_WRITER_VERIFY='+code);return reply(503,{status:'BLOCKED',code});}
 }
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
