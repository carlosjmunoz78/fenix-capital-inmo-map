// FACT-001 · Isolated one-shot Notion content READ export lab.
// Independent endpoint. No database writes, no App/CRM, no queue, no cron.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc} from './policy.mjs';
import {BATCH_REF,INDEX_SHA,exportFixedPage,verifyFixedPage} from './page-export.mjs';
const KEYS=['cerebro_notion_service_token_v1','cerebro_fact001_notion_backup_aes256_lab_v1'];
const header={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(n:number,p:Record<string,unknown>)=>new Response(JSON.stringify(p),{status:n,headers:header});
const fixed={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',operation:'notion.lab.content_export.page',request_id:'FACT001-NOTION-FIRST-25-CONTENT-20261110',batch_ref:BATCH_REF};
async function readVault(){
 const conn=Deno.env.get('SUPABASE_DB_URL');if(!conn)throw Error('VAULT_UNAVAILABLE');
 const sql=postgres(conn,{max:1,connect_timeout:5,idle_timeout:1,prepare:false});
 try{
  const values=await sql`select name,decrypted_secret from vault.decrypted_secrets where name in (${KEYS[0]},${KEYS[1]})`;
  const items=new Map(values.map(x=>[x.name,x.decrypted_secret]));
  if(values.length!==2||KEYS.some(k=>typeof items.get(k)!=='string'))throw Error('VAULT_MISSING');
  return {notionToken:items.get(KEYS[0]) as string,encryptionKey:items.get(KEYS[1]) as string};
 }finally{await sql.end({timeout:2}).catch(()=>{});}
}
Deno.serve(async request=>{
 const path=new URL(request.url).pathname;
 // No other routes exposed, but still do not reveal private contract details.
 if(request.method!=='POST'||!path.endsWith('/cerebro-fact001-notion-content-export-lab/export'))return reply(404,{status:'NOT_FOUND'});
 const bearer=request.headers.get('authorization')??'';
 try{if(!bearer.startsWith('Bearer '))throw Error('AUTH');await verifyGitHubOidc(bearer.slice(7));}
 catch{return reply(401,{status:'UNAUTHORIZED'});}
 let x:Record<string,unknown>;
 try{
  if(Number(request.headers.get('content-length')||'0')>16000)throw Error('BODY_TOO_LONG');
  const raw=await request.text();if(raw.length>16000)throw Error('BODY_TOO_LONG');
  x=JSON.parse(raw);
  if(!x||typeof x!=='object'||Array.isArray(x))throw Error('BODY_INVALID');
  const required=[...Object.keys(fixed),'plan_artifact','item_index'];
  if(JSON.stringify(Object.keys(x).sort())!==JSON.stringify(required.sort())||Object.entries(fixed).some(([k,v])=>x[k]!==v)||!Number.isInteger(x.item_index)||Number(x.item_index)<0||Number(x.item_index)>24||!x.plan_artifact||typeof x.plan_artifact!=='object'||Array.isArray(x.plan_artifact))throw Error('ORDER_DENIED');
  const a=x.plan_artifact as Record<string,unknown>;
  if(a.batch_ref!==BATCH_REF||a.index_sha256!==INDEX_SHA||a.items!==25||a.pages!==25||a.data_sources!==0||a.offset!==0||a.next_offset!==25)throw Error('PLAN_DENIED');
 }catch{return reply(403,{status:'ORDER_DENIED'});}
 try{
  const secrets=await readVault();
  const result=await exportFixedPage({planArtifact:x.plan_artifact,encryptionKey:secrets.encryptionKey,notionToken:secrets.notionToken,index:Number(x.item_index)});
  const verification=await verifyFixedPage({artifact:result,planArtifact:x.plan_artifact,encryptionKey:secrets.encryptionKey});
  if(verification.status!=='PAGE_MEMORY_REBUILD_PASS')throw Error('PARITY_DENIED');
  return reply(200,{...result,verify_roundtrip:true});
 }catch(e){
  const allowed=new Set(['VAULT_UNAVAILABLE','VAULT_MISSING','BATCH_DENIED','BATCH_AUTH_DENIED','BATCH_SCOPE_DENIED','NOTION_AUTH','NOTION_RATE_LIMIT','NOTION_HTTP','NOTION_NETWORK','NOTION_JSON','INCOMPLETE_REQUEST_CAP','INCOMPLETE_SIZE_CAP','SOURCE_CHANGED_DURING_EXPORT']);
  const code=e instanceof Error&&allowed.has(e.message)?e.message:'EXPORT_BLOCKED';
  // Never log token/JWT, decrypted bodies, page IDs or provider responses.
  return reply(503,{status:'BLOCKED',code,credentials_exposed:false,content_exposed:false,provider_writes:0,checkpoint_committed:false});
 }
});