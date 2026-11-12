// FACT-001 unified future-batch read-only LAB engine: plan AND export, no cron, queue, D1 or provider writes.
// No App/CRM/Notion mutations. Pinned owner GitHub OIDC; original headless broker and v1/v2 services untouched.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc} from './policy.mjs';
import {sealNotionIndexManifest,verifyNotionIndexManifest} from './notion-encrypted-index-manifest.mjs';
import {planNextNotionBackupBatch,verifyNotionBackupBatch} from './notion-content-batch-planner.mjs';
import {exportObject,verifyObject,INDEX_SHA,TOTAL_OBJECTS,MAX_BATCH_ITEMS,openBatch} from './content.mjs';
import {exportSourceChunk} from './source-chunk.mjs';
const H={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(status:number,x:Record<string,unknown>)=>new Response(JSON.stringify(x),{status,headers:H});
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const FIXED={...SCOPE,client_id:'cerebro',source:'owner_order',request_id:'FACT001-NOTION-BATCH-ENGINE-75-100-20261111',index_sha256:INDEX_SHA};
const LAST_PROVEN='5ad72bef9789927e0caab76ad1f907d7cdef4583d3d2c556c6c5c7ef04bc187f';
const PREV_DRIVE='1l68TceZpyar7jOoTZI5Nr5OUy4D8-XOg';
const NEXT_PREVIOUS='8501eb64a02b3bdaa9351fe2c460e81181781e399da7f839f86f0070b1a0c49b';
const NEXT_DRIVE='1jqCgm1qY2euqCy9uO_KGHrV4hMqSI0BC';
const NEXT_FIXED={...SCOPE,client_id:'cerebro',source:'owner_order',request_id:'FACT001-NOTION-BATCH-ENGINE-100-125-20261112',index_sha256:INDEX_SHA};
const NEXT_OPERATIONS={'plan-next':'notion.lab.batcher.plan_next','export-next':'notion.lab.batcher.export_next'} as const;
const VALID_OPERATIONS={plan:'notion.lab.batcher.plan',export:'notion.lab.batcher.export','source-chunk':'notion.lab.batcher.source.chunk'} as const;
function assertOrder(body:unknown,kind:'plan'|'export'|'source-chunk'){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('ORDER_DENIED');
 const b=body as Record<string,unknown>;
 const expected={...FIXED,operation:VALID_OPERATIONS[kind],offset:75,max_items:25,previous_zip_sha256:LAST_PROVEN,previous_drive_file_id:PREV_DRIVE};
 const keys=Object.keys(expected).concat(kind==='export'?['item_index','plan_artifact']:kind==='source-chunk'?['item_index','plan_artifact','continuation']:[]).sort();
 if(JSON.stringify(Object.keys(b).sort())!==JSON.stringify(keys)||Object.entries(expected).some(([k,v])=>b[k]!==v))throw Error('ORDER_DENIED');
 if(kind==='export'&&(!Number.isSafeInteger(b.item_index)||Number(b.item_index)<0||Number(b.item_index)>=25||!b.plan_artifact||typeof b.plan_artifact!=='object'||Array.isArray(b.plan_artifact)))throw Error('ORDER_DENIED');
 if(kind==='source-chunk'&&(b.item_index!==23||!b.plan_artifact||typeof b.plan_artifact!=='object'||Array.isArray(b.plan_artifact)||(b.continuation!==null&&(!b.continuation||typeof b.continuation!=='object'||Array.isArray(b.continuation)))))throw Error('ORDER_DENIED');
 return b;
}
function assertNextOrder(body:unknown,kind:'plan-next'|'export-next'){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('NEXT_ORDER_DENIED');
 const b=body as Record<string,unknown>;
 const expected={...NEXT_FIXED,operation:NEXT_OPERATIONS[kind],offset:100,max_items:25,previous_zip_sha256:NEXT_PREVIOUS,previous_drive_file_id:NEXT_DRIVE};
 const keys=Object.keys(expected).concat(kind==='export-next'?['item_index','plan_artifact']:[]).sort();
 if(JSON.stringify(Object.keys(b).sort())!==JSON.stringify(keys)||Object.entries(expected).some(([k,v])=>b[k]!==v))
  throw Error('NEXT_ORDER_DENIED');
 if(kind==='export-next'&&(!Number.isSafeInteger(b.item_index)||Number(b.item_index)<0||Number(b.item_index)>=25||!b.plan_artifact||typeof b.plan_artifact!=='object'||Array.isArray(b.plan_artifact)))throw Error('NEXT_ORDER_DENIED');
 return b;
}
function assertFrozenOrder(body:unknown){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('FROZEN_ORDER_DENIED');
 const b=body as Record<string,unknown>;
 const expected={...NEXT_FIXED,operation:'notion.lab.batcher.plan_frozen',offset:100,max_items:25,previous_zip_sha256:NEXT_PREVIOUS,previous_drive_file_id:NEXT_DRIVE};
 const expectedKeys=[...Object.keys(expected),'index_artifact'].sort();
 if(JSON.stringify(Object.keys(b).sort())!==JSON.stringify(expectedKeys)||Object.entries(expected).some(([k,v])=>b[k]!==v))throw Error('FROZEN_ORDER_DENIED');
 const a=b.index_artifact as Record<string,unknown>;
 if(!a||typeof a!=='object'||Array.isArray(a)||a.status!=='FACT001_NOTION_INDEX_ENCRYPTED'||a.object_count!==6632||a.page_count!==6446||a.data_source_count!==186||a.id_list_sha256!==INDEX_SHA||a.search_index_complete!==true||a.envelope?.['format']!=='FACT001-NOTION-INDEX-MANIFEST-AES256GCM-V1')throw Error('FROZEN_ARCHIVE_SCOPE_DENIED');
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
 const path=new URL(req.url).pathname;const kind=path.endsWith('/cerebro-fact001-notion-batch-engine-lab/plan')?'plan':path.endsWith('/cerebro-fact001-notion-batch-engine-lab/export')?'export':path.endsWith('/cerebro-fact001-notion-batch-engine-lab/source-chunk')?'source-chunk':null;
 const nextKind=path.endsWith('/cerebro-fact001-notion-batch-engine-lab/plan-next')?'plan-next':path.endsWith('/cerebro-fact001-notion-batch-engine-lab/export-next')?'export-next':null;
 const frozen=path.endsWith('/cerebro-fact001-notion-batch-engine-lab/plan-frozen');
 if((!kind&&!nextKind&&!frozen)||req.method!=='POST')return reply(404,{status:'NOT_FOUND'});
 const auth=req.headers.get('authorization')??'';
 try{if(!auth.startsWith('Bearer '))throw Error('AUTH');await verifyGitHubOidc(auth.slice(7));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 let body:Record<string,unknown>;
 try{const maxBody=frozen?2500000:kind==='source-chunk'?28500:18500;if(Number(req.headers.get('content-length')||'0')>maxBody)throw Error('LONG');const raw=await req.text();if(raw.length>maxBody)throw Error('LONG');body=frozen?assertFrozenOrder(JSON.parse(raw)):nextKind?assertNextOrder(JSON.parse(raw),nextKind):assertOrder(JSON.parse(raw),kind!);}catch{return reply(403,{status:'ORDER_DENIED'});}
 try{let {notionToken,encryptionKey}=await getVault();try{
  if(kind==='plan'||nextKind==='plan-next'||frozen){
   const offset=nextKind==='plan-next'||frozen?100:75;
   const idx=frozen?body.index_artifact:await sealNotionIndexManifest({notionToken,encryptionKey,maxPages:85});
   if(frozen){const verified=await verifyNotionIndexManifest({encryptionKey,artifact:idx});if(verified.status!=='FACT001_NOTION_INDEX_MEMORY_REBUILD_VERIFIED')throw Error('FROZEN_INDEX_AUTH_DENIED');}
   if(idx.search_index_complete!==true||idx.object_count!==TOTAL_OBJECTS||idx.page_count!==6446||idx.data_source_count!==186||idx.id_list_sha256!==INDEX_SHA)throw Error('INDEX_PARITY_DENIED');
   const plan=await planNextNotionBackupBatch({encryptionKey,indexArtifact:idx,offset,maxItems:MAX_BATCH_ITEMS});
   const verify=await verifyNotionBackupBatch({encryptionKey,artifact:plan,expectedIndexSha256:INDEX_SHA});
   if(plan.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||plan.items!==25||plan.offset!==offset||plan.next_offset!==offset+25||plan.provider_writes!==0||verify.item_count!==25)throw Error('PLAN_PARITY_DENIED');
   return reply(200,{...plan,verify_roundtrip:true,source_index_search_calls:frozen?0:idx.search_api_requests,source_archived_index:frozen,content_backed_up:false,checkpoint_committed:false});
  }
  const plan=body.plan_artifact as Record<string,unknown>;
  if(kind==='source-chunk'){const part=await exportSourceChunk({planArtifact:plan,encryptionKey,notionToken,index:23,continuation:body.continuation});return reply(200,part);}
  if(nextKind==='export-next'&&(plan?.offset!==100||plan?.next_offset!==125||plan?.index_sha256!==INDEX_SHA))throw Error('NEXT_PLAN_SCOPE_DENIED');
  await openBatch({planArtifact:plan,encryptionKey});
  const item=await exportObject({planArtifact:plan,encryptionKey,notionToken,index:Number(body.item_index)});
  const check=await verifyObject({artifact:item,planArtifact:plan,encryptionKey});
  if(check.status!=='FACT001_CONTENT_MEMORY_REBUILT')throw Error('MEMORY_ROUNDTRIP_DENIED');
  return reply(200,{...item,verify_roundtrip:true});
 }finally{notionToken='';encryptionKey='';}}
 catch(e){const raw=e instanceof Error?e.message:'';const code=/^(VAULT_UNAVAILABLE|VAULT_MISSING|INDEX_PARITY_DENIED|PLAN_PARITY_DENIED|MEMORY_ROUNDTRIP_DENIED|MANIFEST_[A-Z0-9_]+|BATCH_[A-Z0-9_]+|NOTION_[A-Z0-9_]+|SOURCE_[A-Z0-9_]+|SOURCECHUNK_[A-Z0-9_]+|PAGE_DENIED|INCOMPLETE_[A-Z0-9_]+|CURSOR_LOOP|CHILD_LOOP|INPUT_DENIED|ARTIFACT_DENIED)$/.test(raw)?raw:'BATCH_ENGINE_BLOCKED';
  return reply(503,{status:'BLOCKED',code,credentials_exposed:false,content_exposed:false,provider_writes:0,checkpoint_committed:false});}
});