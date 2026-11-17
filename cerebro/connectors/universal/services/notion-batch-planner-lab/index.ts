// FACT-001: isolated encrypted Notion batch planner LAB. No public unauthenticated data, writes or cron.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc} from './policy.mjs';
import {assertBatch2Order,SOURCE_SHA} from './batch2-order.mjs';
import {planNextNotionBackupBatch,verifyNotionBackupBatch} from './notion-content-batch-planner.mjs';
const header={'content-type':'application/json','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
const reply=(status:number,data:Record<string,unknown>)=>new Response(JSON.stringify(data),{status,headers:header});
async function readKey(){
 const db=Deno.env.get('SUPABASE_DB_URL');if(!db)throw Error('VAULT_UNAVAILABLE');
 const sql=postgres(db,{max:1,connect_timeout:5,idle_timeout:1,prepare:false});
 try{
  const a=await sql`select decrypted_secret from vault.decrypted_secrets where name = 'cerebro_fact001_notion_backup_aes256_lab_v1' limit 2`;
  if(a.length!==1||typeof a[0].decrypted_secret!=='string')throw Error('VAULT_MISSING');
  return a[0].decrypted_secret;
 }finally{await sql.end({timeout:2}).catch(()=>{});}
}
Deno.serve(async req=>{
 if(req.method!=='POST'||!new URL(req.url).pathname.endsWith('/cerebro-fact001-notion-batch-planner-lab/plan'))return reply(404,{status:'NOT_FOUND'});
 const auth=req.headers.get('authorization')??'';
 try{if(!auth.startsWith('Bearer '))throw Error('NO_AUTH');await verifyGitHubOidc(auth.slice(7));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 let artifact;
 try{
  if(Number(req.headers.get('content-length')||0)>5_000_000)throw Error('LIMIT');
  const raw=await req.text();if(raw.length>5_000_000)throw Error('LIMIT');
  artifact=assertBatch2Order(JSON.parse(raw));
 }catch{return reply(403,{status:'ORDER_DENIED'});}
 try{
  let key=await readKey();
  try{
   const a=await planNextNotionBackupBatch({encryptionKey:key,indexArtifact:artifact,offset:25,maxItems:25});
   const verified=await verifyNotionBackupBatch({encryptionKey:key,artifact:a,expectedIndexSha256:SOURCE_SHA});
   if(a.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||a.offset!==25||a.next_offset!==50||a.items!==25||verified.status!=='FACT001_NOTION_BATCH_PLAN_REBUILT'||verified.item_count!==25||a.provider_writes!==0||a.content_downloaded!==false)throw Error('PLAN_INTEGRITY_DENIED');
   return reply(200,{...a,verify_roundtrip:true,source_page_content_exported:false});
  }finally{key='';}
 }catch(e){
  const c=e instanceof Error&&/^(VAULT_UNAVAILABLE|VAULT_MISSING|BATCH_PLANNER_[A-Z_]+|PLAN_INTEGRITY_DENIED)$/.test(e.message)?e.message:'PLANNER_BLOCKED';
  return reply(503,{status:'BLOCKED',code:c,credentials_exposed:false,content_exposed:false,provider_writes:0,checkpoint_committed:false});
 }
});