// FACT-001 isolated Notion LAB live-index parity planner. No remote D1, provider writes, cron or queues.
// This is a parallel candidate, never replace the existing broker or the V1 planner.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc} from './policy.mjs';
import {assertOrder,INDEX_SHA} from './order.mjs';
import {sealNotionIndexManifest} from './notion-encrypted-index-manifest.mjs';
import {planNextNotionBackupBatch,verifyNotionBackupBatch} from './notion-content-batch-planner.mjs';
const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(status:number,data:Record<string,unknown>)=>new Response(JSON.stringify(data),{status,headers});
async function vault(){
 const db=Deno.env.get('SUPABASE_DB_URL');if(!db)throw Error('VAULT_UNAVAILABLE');
 const sql=postgres(db,{max:1,connect_timeout:5,idle_timeout:1,prepare:false});
 try{
  const keys=['cerebro_notion_service_token_v1','cerebro_fact001_notion_backup_aes256_lab_v1'];
  const r=await sql`select name,decrypted_secret from vault.decrypted_secrets where name in (${keys[0]},${keys[1]})`;
  if(r.length!==2)throw Error('VAULT_MISSING');const m=new Map(r.map(x=>[x.name,x.decrypted_secret]));
  if(keys.some(k=>typeof m.get(k)!=='string'))throw Error('VAULT_MISSING');
  return {notionToken:m.get(keys[0]) as string,encryptionKey:m.get(keys[1]) as string};
 }finally{await sql.end({timeout:2}).catch(()=>{});}
}
Deno.serve(async req=>{
 if(req.method!=='POST'||!new URL(req.url).pathname.endsWith('/cerebro-fact001-notion-batch-planner-v2-lab/plan'))return reply(404,{status:'NOT_FOUND'});
 const auth=req.headers.get('authorization')??'';
 try{if(!auth.startsWith('Bearer '))throw Error('AUTH');await verifyGitHubOidc(auth.slice(7));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 try{if(Number(req.headers.get('content-length')||'0')>1800)throw Error('LONG');const raw=await req.text();if(raw.length>1800)throw Error('LONG');assertOrder(JSON.parse(raw));}catch{return reply(403,{status:'ORDER_DENIED'});}
 try{
  let {notionToken,encryptionKey}=await vault();
  try{
   const index=await sealNotionIndexManifest({notionToken,encryptionKey,maxPages:85});
   if(index.search_index_complete!==true||index.object_count!==6632||index.page_count!==6446||index.data_source_count!==186||index.id_list_sha256!==INDEX_SHA)throw Error('INDEX_PARITY_DENIED');
   const b=await planNextNotionBackupBatch({encryptionKey,indexArtifact:index,offset:25,maxItems:25});
   const check=await verifyNotionBackupBatch({encryptionKey,artifact:b,expectedIndexSha256:INDEX_SHA});
   if(b.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||b.offset!==25||b.next_offset!==50||b.items!==25||b.pages+b.data_sources!==25||b.provider_writes!==0||b.content_downloaded!==false||check.status!=='FACT001_NOTION_BATCH_PLAN_REBUILT')throw Error('PLAN_PARITY_DENIED');
   return reply(200,{...b,verify_roundtrip:true,search_index_sha256_matches_previous:true,source_index_search_calls:index.search_api_requests,source_objects:index.object_count,content_backed_up:false,checkpoint_committed:false});
  }finally{notionToken='';encryptionKey='';}
 }catch(e){
  const code=e instanceof Error&&/^(VAULT_UNAVAILABLE|VAULT_MISSING|INDEX_PARITY_DENIED|PLAN_PARITY_DENIED|MANIFEST_[A-Z0-9_]+|BATCH_PLANNER_[A-Z0-9_]+)$/.test(e.message)?e.message:'PLAN_UNVERIFIED';
  // Fail closed, report only constant status codes; never identifiers or decrypted data.
  return reply(503,{status:'BLOCKED',code,credentials_exposed:false,content_exposed:false,provider_writes:0,checkpoint_committed:false});
 }
});