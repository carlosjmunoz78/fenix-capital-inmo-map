// CEREBRO NIA P0: one-shot rotation via EXISTING Supabase Vault and issuer.
// Temporary HMAC-authenticated endpoint. Revert Edge function to inert v2 after use.
// Never return or log bearer tokens; do not change the live Console consumer.
import postgres from 'npm:postgres@3.4.7';
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const OLD_ID='633de454c0c59bdf6829d2d884abcb7d';
const OLD_NAME='cerebro-nia-console-queue-write-lab-20261117';
const NEW_NAME='cerebro-nia-console-queue-write-lab-20261117-r2';
const VAULT_NEW='cerebro_nia_cf_queues_write_lab_20261117_r2';
const ISSUER_NAME='cerebro_cf_account_token_issuer_v2';
const BOOTSTRAP_NAME='cerebro_nia_console_bootstrap_20261117';
const EXPIRES='2027-01-01T00:00:00Z';
const GROUP='366f57075ffc42689627bcf8242a1b6d';
const API='https://api.cloudflare.com/client/v4';
const PREFIX='/accounts/'+ACCOUNT;
const response=(code,status,extra={})=>new Response(JSON.stringify({status,...extra,secret_exposed:false}),{status:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function hmacOk(value,signature,keyText){
  if(!/^[a-f0-9]{64}$/.test(signature||''))return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(keyText),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));
  let mismatch=0;
  for(let i=0;i<digest.length;i++)mismatch|=digest[i]^parseInt(signature.slice(i*2,i*2+2),16);
  return mismatch===0;
}
function isQueueWriteOnly(t){
  if(!t||t.status!=='active'||t.policies?.length!==1)return false;
  const p=t.policies[0];
  return p.effect==='allow'&&p.permission_groups?.length===1&&p.permission_groups[0]?.id===GROUP&&
    Object.keys(p.resources||{}).length===1&&p.resources['com.cloudflare.api.account.'+ACCOUNT]==='*';
}
async function requestIssuer(path,method,issuer,body){
  const r=await fetch(API+path,{method,headers:{'Authorization':'Bearer '+issuer,'Accept':'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(12000)});
  const data=await r.json().catch(()=>null);
  if(r.status<200||r.status>=300||data?.success!==true)throw Error('CLOUDFLARE_REQUEST_DENIED_'+r.status);
  return data.result;
}
Deno.serve(async(req)=>{
  if(new URL(req.url).pathname.split('/').at(-1)!=='rotate'||req.method!=='POST')return response(404,'INERT_ROUTE');
  let db,issuer='',value='',newId='',created=false,locked=false;
  try{
    const raw=await req.text();
    if(raw.length>500)return response(413,'BODY_DENIED');
    let body;
    try{body=JSON.parse(raw)}catch{return response(400,'BODY_DENIED')}
    if(Object.keys(body).sort().join(',')!=='iat,nonce,op'||body.op!=='CEREBRO_NIA_CF_QUEUE_ROTATE_20261117'||
       !/^[0-9a-f-]{36}$/.test(body.nonce||'')||!Number.isSafeInteger(body.iat)||
       Math.abs(Date.now()/1000-body.iat)>120)return response(400,'ORDER_DENIED');
    const dbUrl=Deno.env.get('SUPABASE_DB_URL');
    if(!dbUrl)return response(503,'VAULT_DATABASE_UNAVAILABLE');
    db=postgres(dbUrl,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
    const boot=await db.unsafe('select decrypted_secret from vault.decrypted_secrets where name=$1 limit 2',[BOOTSTRAP_NAME]);
    if(boot.length!==1||typeof boot[0].decrypted_secret!=='string'||boot[0].decrypted_secret.length<48)return response(503,'BOOTSTRAP_SECRET_MISSING');
    if(!await hmacOk(raw,req.headers.get('x-cerebro-hmac'),boot[0].decrypted_secret))return response(401,'HMAC_DENIED');
    const lock=await db.unsafe('select pg_try_advisory_lock(91517202617) as acquired');
    locked=lock[0]?.acquired===true;
    if(!locked)return response(409,'ROTATION_BUSY');
    const staged=await db.unsafe('select id from vault.secrets where name=$1 limit 2',[VAULT_NEW]);
    if(staged.length)return response(409,'ROTATION_ALREADY_STAGED');
    const creds=await db.unsafe('select decrypted_secret from vault.decrypted_secrets where name=$1 limit 2',[ISSUER_NAME]);
    if(creds.length!==1||typeof creds[0].decrypted_secret!=='string'||creds[0].decrypted_secret.length<24)return response(503,'ISSUER_UNAVAILABLE');
    issuer=creds[0].decrypted_secret;
    const old=await requestIssuer(PREFIX+'/tokens/'+OLD_ID,'GET',issuer);
    if(old.name!==OLD_NAME||!isQueueWriteOnly(old)||old.expires_on!=='2026-12-01T00:00:00Z')return response(409,'OLD_IDENTITY_MISMATCH');
    const groups=await requestIssuer(PREFIX+'/tokens/permission_groups','GET',issuer);
    if(!Array.isArray(groups)||groups.filter(g=>g.id===GROUP&&g.name==='Queues Write'&&g.is_selectable===true).length!==1)return response(409,'PERMISSION_UNVERIFIED');
    const existing=await requestIssuer(PREFIX+'/tokens?per_page=100&page=1','GET',issuer);
    if(!Array.isArray(existing)||existing.some(t=>t.name===NEW_NAME))return response(409,'REPLACEMENT_ALREADY_EXISTS');
    const createdToken=await requestIssuer(PREFIX+'/tokens','POST',issuer,{name:NEW_NAME,expires_on:EXPIRES,policies:[{effect:'allow',resources:{['com.cloudflare.api.account.'+ACCOUNT]:'*'},permission_groups:[{id:GROUP}]}]});
    newId=createdToken?.id||'';value=createdToken?.value||'';created=true;
    if(!/^[0-9a-f]{32}$/.test(newId)||value.length<30||value.length>200)throw Error('TOKEN_RESPONSE_INVALID');
    const verified=await requestIssuer(PREFIX+'/tokens/'+newId,'GET',issuer);
    if(verified.name!==NEW_NAME||verified.expires_on!==EXPIRES||!isQueueWriteOnly(verified))throw Error('REPLACEMENT_POLICY_MISMATCH');
    await db.unsafe('select vault.create_secret($1,$2,$3)',[value,VAULT_NEW,'NIA Queues Write r2 STAGED; Cloudflare token id '+newId+'; expires '+EXPIRES]);
    value='';
    const confirmed=await db.unsafe('select id from vault.secrets where name=$1 limit 2',[VAULT_NEW]);
    if(confirmed.length!==1)throw Error('VAULT_READBACK_FAILED');
    created=false;
    return response(200,'ROTATION_STAGED',{new_token_id:newId,expires_on:EXPIRES,new_vault_name:VAULT_NEW,old_token_preserved:true,consumer_unchanged:true,additional_cost_eur:0});
  }catch(e){
    const kind=e instanceof Error?e.message:'UNKNOWN';
    if(created&&newId&&issuer){
      try{await requestIssuer(PREFIX+'/tokens/'+newId,'DELETE',issuer);created=false}catch{}
    }
    return response(503,created?'ORPHAN_TOKEN_REQUIRES_REVIEW':'ROTATION_BLOCKED',{reason:/^(CLOUDFLARE_REQUEST_DENIED_|TOKEN_RESPONSE_INVALID|REPLACEMENT_POLICY_MISMATCH|VAULT_READBACK_FAILED)/.test(kind)?kind.replace(/_[0-9]{3}$/, '_HTTP_ERROR'):'FAIL_CLOSED',new_token_id:newId||undefined});
  }finally{
    issuer='';value='';
    if(db){if(locked)await db.unsafe('select pg_advisory_unlock(91517202617)').catch(()=>{});await db.end({timeout:2}).catch(()=>{})}
  }
});
