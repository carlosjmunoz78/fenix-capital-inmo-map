// FACT-001 independently deployed LAB-only Edge. Exact owner GitHub OIDC verified before Vault access.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc} from './auth.mjs';
import {assertOrder} from './order.mjs';
import {sealD1Backup,openD1Backup,D1_BACKUP_SCOPE} from './d1-backup-envelope.mjs';
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e',DB='1305f791-7c44-47f9-946b-f330a09c88aa';
const SECRET_D1='cerebro_cf_d1_read_lab_20261110',SECRET_AES='cerebro_fact001_d1_backup_aes256_lab_v1',CAP=8_000_000;
const H={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:H});
const bearer=(req:Request)=>{const s=req.headers.get('authorization')||'';return s.startsWith('Bearer ')?s.slice(7):'';};
async function vault(){
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)throw Error('VAULT_DB_UNAVAILABLE');
 const sql=postgres(url,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{
  const rows=await sql.unsafe("select name,decrypted_secret from vault.decrypted_secrets where name in ('cerebro_cf_d1_read_lab_20261110','cerebro_fact001_d1_backup_aes256_lab_v1')");
  const m=new Map(rows.map(x=>[x.name,x.decrypted_secret]));
  const token=m.get(SECRET_D1),hex=m.get(SECRET_AES);
  if(rows.length!==2||typeof token!=='string'||typeof hex!=='string'||!/^[a-fA-F0-9]{64}$/.test(hex))throw Error('VAULT_KEY_OR_TOKEN_MISSING');
  return {token,key:Uint8Array.from(hex.match(/../g)!,x=>parseInt(x,16))};
 }finally{await sql.end({timeout:2}).catch(()=>{});}
}
async function callExport(token:string,body:Record<string,unknown>){
 const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/d1/database/'+DB+'/export',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(25000)});
 if(r.status!==200)throw Error('D1_EXPORT_HTTP_'+r.status);
 const j=await r.json();if(j?.success!==true||!j.result)throw Error('D1_EXPORT_FAILED');
 return j.result;
}
async function exportSql(token:string){
 const base={output_format:'polling',dump_options:{compatibility:'d1',no_data:false}};
 let state=await callExport(token,base);
 for(let i=0;i<9&&state.status!=='complete';i++){
  if(typeof state.at_bookmark!=='string')throw Error('D1_EXPORT_BOOKMARK_INVALID');
  await new Promise(resolve=>setTimeout(resolve,1200));
  state=await callExport(token,{...base,current_bookmark:state.at_bookmark});
 }
 const url=state?.result?.signed_url;
 if(state?.status!=='complete'||typeof url!=='string')throw Error('D1_EXPORT_INCOMPLETE');
 const u=new URL(url);
 if(u.protocol!=='https:'||!u.hostname.endsWith('.eu.r2.cloudflarestorage.com')||u.username||u.password)throw Error('D1_EXPORT_URL_DENIED');
 const res=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(25000)});
 if(res.status!==200)throw Error('D1_DOWNLOAD_HTTP_'+res.status);
 const declared=Number(res.headers.get('content-length')||0);
 if(!Number.isSafeInteger(declared)||declared>CAP)throw Error('D1_EXPORT_SIZE_DENIED');
 const bytes=new Uint8Array(await res.arrayBuffer());
 if(bytes.length<1||bytes.length>CAP)throw Error('D1_EXPORT_SIZE_DENIED');
 return bytes;
}
async function boundedJson(req:Request,cap:number){
 const length=Number(req.headers.get('content-length')||0);
 if(!Number.isSafeInteger(length)||length>cap)throw Error('REQUEST_TOO_LARGE');
 const t=await req.text();if(t.length>cap)throw Error('REQUEST_TOO_LARGE');
 return JSON.parse(t);
}
Deno.serve(async req=>{
 const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)||'';
 if(!['health','seal-once','verify-once'].includes(route))return reply(404,{status:'NOT_FOUND'});
 if(route==='health'&&req.method!=='GET'||route!=='health'&&req.method!=='POST')return reply(405,{status:'METHOD_DENIED'});
 // Signed OIDC required on every route, no alternative API key, no anonymous access.
 try{await verifyGitHubOidc(bearer(req));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 if(route==='health')return reply(200,{status:'SIGNED_D1_BACKUP_LAB_READY',provider_writes:0});
 let body:Record<string,unknown>;
 try{body=await boundedJson(req,route==='seal-once'?1400:11_000_000);}catch{return reply(413,{status:'BODY_DENIED'});}
 try{assertOrder(route==='seal-once'?body:body.order,route==='seal-once'?'seal':'verify');}catch{return reply(403,{status:'ORDER_DENIED'});}
 try{
  const secrets=await vault();
  if(route==='seal-once'){
   const sql=await exportSql(secrets.token);const envelope=await sealD1Backup({scope:D1_BACKUP_SCOPE,plaintext:sql,keyBytes:secrets.key});
   sql.fill(0);secrets.key.fill(0);
   return reply(200,{status:'D1_BACKUP_CIPHERTEXT_SEALED_LAB',envelope,provider_writes:0,plaintext_returned:false});
  }
  const envelope=body.envelope;
  const plaintext=await openD1Backup({scope:D1_BACKUP_SCOPE,envelope,keyBytes:secrets.key});
  const bytes=plaintext.byteLength;plaintext.fill(0);secrets.key.fill(0);
  return reply(200,{status:'D1_BACKUP_DECRYPT_ROUNDTRIP_LAB',plaintext_bytes:bytes,plaintext_sha256:(envelope as {plaintext_sha256:string}).plaintext_sha256,plaintext_returned:false,provider_writes:0});
 }catch(e){
  const raw=e instanceof Error?e.message:'';
  const code=/^(D1_EXPORT_HTTP_(401|403|404|429|503)|D1_DOWNLOAD_HTTP_(401|403|404|429|503)|D1_EXPORT_(FAILED|INCOMPLETE|BOOKMARK_INVALID|URL_DENIED|SIZE_DENIED)|VAULT_(DB_UNAVAILABLE|KEY_OR_TOKEN_MISSING)|ENVELOPE_[A-Z0-9_]+)$/.test(raw)?raw:'BACKUP_BLOCKED';
  console.warn('FACT001_D1_BACKUP='+code);return reply(503,{status:'BLOCKED',code,plaintext_returned:false,credentials_exposed:false});
 }
});
