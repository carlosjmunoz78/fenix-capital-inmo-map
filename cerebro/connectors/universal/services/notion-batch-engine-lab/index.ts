// FACT-001 unified future-batch read-only LAB engine: plan AND export, no cron, queue, D1 or provider writes.
// No App/CRM/Notion mutations. Pinned owner GitHub OIDC; original headless broker and v1/v2 services untouched.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc} from './policy.mjs';
import {sealNotionIndexManifest} from './notion-encrypted-index-manifest.mjs';
import {planNextNotionBackupBatch,verifyNotionBackupBatch} from './notion-content-batch-planner.mjs';
import {exportObject,verifyObject,INDEX_SHA,TOTAL_OBJECTS,MAX_BATCH_ITEMS,openBatch} from './content.mjs';
const H={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(status:number,x:Record<string,unknown>)=>new Response(JSON.stringify(x),{status,headers:H});
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const FIXED={...SCOPE,client_id:'cerebro',source:'owner_order',request_id:'FACT001-NOTION-BATCH-ENGINE-20261111',index_sha256:INDEX_SHA};
const LAST_PROVEN='d8e93417190470f1d9ed34ffdd40962ff33a869869378b5ee580b1fca1641026';
const PREV_DRIVE='12UJyaeYukgOlFIHrLlebxLOgLTsdalcq';
const VALID_OPERATIONS={plan:'notion.lab.batcher.plan',export:'notion.lab.batcher.export'} as const;
function assertOrder(body:unknown,kind:'plan'|'export'){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('ORDER_DENIED');
 const b=body as Record<string,unknown>;
 const expected={...FIXED,operation:VALID_OPERATIONS[kind],offset:50,max_items:25,previous_zip_sha256:LAST_PROVEN,previous_drive_file_id:PREV_DRIVE};
 const keys=Object.keys(expected).concat(kind==='export'?['item_index','plan_artifact']:[]).sort();
 if(JSON.stringify(Object.keys(b).sort())!==JSON.stringify(keys)||Object.entries(expected).some(([k,v])=>b[k]!==v))throw Error('ORDER_DENIED');
 if(kind==='export'&&(!Number.isSafeInteger(b.item_index)||Number(b.item_index)<0||Number(b.item_index)>=25||!b.plan_artifact||typeof b.plan_artifact!=='object'||Array.isArray(b.plan_artifact)))throw Error('ORDER_DENIED');
 return b;
}
async function getVault(){
 const url=Deno.env.get('SUPABASE_DB_URL');if(!url)throw Error('VAULT_UNAVAILABLE');
 const db=postgres(url,{max:1,connect_timeout:5,idle_timeout:1,prepare:false});
 try{const names=['cerebro_notion_service_token_v1','cerebro_fact001_notion_backup_aes256_lab_v1'];
  const rs=await db`select name,decrypted_secret from vault.decrypted_secrets where name in (${names[0]},${names[1]})`;
  if(rs.length!==2)throw Error('VAULT_MISSING');const v=new Map(rs.map(r=>[r.name,r.decrypted_secret]));
  if(names.some(n=>typeof v.get(n)!=='string'))throw Error('VAULT_MISSING');
  return {notionToken:v.get(names[0]) as string,encryptionKey:v.get(names[1]) as string};
 }finally{await db.end({timeout:2}).catch(()=>{})}
}
Deno.serve(async req=>{
 const path=new URL(req.url).pathname;const kind=path.endsWith('/cerebro-fact001-notion-batch-engine-lab/plan')?'plan':path.endsWith('/cerebro-fact001-notion-batch-engine-lab/export')?'export':null;
 if(!kind||req.method!=='POST')return reply(404,{status:'NOT_FOUND'});
 const auth=req.headers.get('authorization')??'';
 try{if(!auth.startsWith('Bearer '))throw Error('AUTH');await verifyGitHubOidc(auth.slice(7));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 let body:Record<string,unknown>;
 try{if(Number(req.headers.get('content-length')||'0')>18500)throw Error('LONG');const raw=await req.text();if(raw.length>18500)throw Error('LONG');body=assertOrder(JSON.parse(raw),kind);}catch{return reply(403,{status:'ORDER_DENIED'});}
 try{let {notionToken,encryptionKey}=await getVault();try{
  if(kind==='plan'){
   const idx=await sealNotionIndexManifest({notionToken,encryptionKey,maxPages:85});
   if(idx.search_index_complete!==true||idx.object_count!==TOTAL_OBJECTS||idx.page_count!==6446||idx.data_source_count!==186||idx.id_list_sha256!==INDEX_SHA)throw Error('INDEX_PARITY_DENIED');
   const plan=await planNextNotionBackupBatch({encryptionKey,indexArtifact:idx,offset:50,maxItems:MAX_BATCH_ITEMS});
   const verify=await verifyNotionBackupBatch({encryptionKey,artifact:plan,expectedIndexSha256:INDEX_SHA});
   if(plan.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||plan.items!==25||plan.offset!==50||plan.next_offset!==75||plan.provider_writes!==0||verify.item_count!==25)throw Error('PLAN_PARITY_DENIED');
   return reply(200,{...plan,verify_roundtrip:true,source_index_search_calls:idx.search_api_requests,content_backed_up:false,checkpoint_committed:false});
  }
  const plan=body.plan_artifact as Record<string,unknown>;
  await openBatch({planArtifact:plan,encryptionKey});
  const item=await exportObject({planArtifact:plan,encryptionKey,notionToken,index:Number(body.item_index)});
  const check=await verifyObject({artifact:item,planArtifact:plan,encryptionKey});
  if(check.status!=='FACT001_CONTENT_MEMORY_REBUILT')throw Error('MEMORY_ROUNDTRIP_DENIED');
  return reply(200,{...item,verify_roundtrip:true});
 }finally{notionToken='';encryptionKey='';}}
 catch(e){const raw=e instanceof Error?e.message:'';const code=/^(VAULT_UNAVAILABLE|VAULT_MISSING|INDEX_PARITY_DENIED|PLAN_PARITY_DENIED|MEMORY_ROUNDTRIP_DENIED|MANIFEST_[A-Z0-9_]+|BATCH_[A-Z0-9_]+|NOTION_[A-Z0-9_]+|SOURCE_[A-Z0-9_]+|PAGE_DENIED|INCOMPLETE_[A-Z0-9_]+|CURSOR_LOOP|CHILD_LOOP|INPUT_DENIED|ARTIFACT_DENIED)$/.test(raw)?raw:'BATCH_ENGINE_BLOCKED';
  return reply(503,{status:'BLOCKED',code,credentials_exposed:false,content_exposed:false,provider_writes:0,checkpoint_committed:false});}
});