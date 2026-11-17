// FACT-001 · Deterministic encrypted backup batch planner. NOT DEPLOYED / OFF.
// Takes the real AES-GCM Notion search-index snapshot and produces sealed work
// lots (max 25 objects). Does not read Notion contents or mutate any provider.
// A downstream worker MUST enforce durable CAS and signed permissions before use.
import {BACKUP_MANIFEST_FORMAT,verifyNotionIndexManifest} from './notion-encrypted-index-manifest.mjs';
const BATCH_FORMAT='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1';
const te=new TextEncoder(),td=new TextDecoder(),HEX=/^[0-9a-f]{64}$/;
const keyImport=async secret=>{
 if(typeof secret!=='string'||!HEX.test(secret))throw Error('BATCH_PLANNER_KEY_DENIED');
 return crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),x=>parseInt(x,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);
};
const toBase64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s)};
const fromBase64=s=>{
 if(typeof s!=='string'||s.length>8500000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('BATCH_PLANNER_CIPHER_INVALID');
 let x;try{x=atob(s)}catch{throw Error('BATCH_PLANNER_CIPHER_INVALID');}
 return Uint8Array.from(x,c=>c.charCodeAt(0));
};
const digest=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
async function open(key,artifact,fmt,max=8000000){
 if(artifact?.envelope?.format!==fmt)throw Error('BATCH_PLANNER_FORMAT_DENIED');
 const iv=fromBase64(artifact.envelope.nonce_b64),bytes=fromBase64(artifact.envelope.ciphertext_b64);
 if(iv.length!==12||bytes.length<17||bytes.length>max)throw Error('BATCH_PLANNER_ENVELOPE_DENIED');
 let clear;try{clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,
  additionalData:te.encode(fmt)},key,bytes));}
 catch{throw Error('BATCH_PLANNER_AUTHENTICITY_DENIED');}
 return clear;
}
export async function planNextNotionBackupBatch({encryptionKey,indexArtifact,offset=0,maxItems=10,random=crypto.getRandomValues.bind(crypto)}={}){
 if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(maxItems)||maxItems<1||maxItems>25)
  throw Error('BATCH_PLANNER_SCOPE_DENIED');
 const key=await keyImport(encryptionKey);
 const checked=await verifyNotionIndexManifest({encryptionKey,artifact:indexArtifact});
 if(checked.status!=='FACT001_NOTION_INDEX_MEMORY_REBUILD_VERIFIED'||!checked.search_index_complete)
  throw Error('BATCH_PLANNER_NEEDS_COMPLETE_INDEX');
 const clear=await open(key,indexArtifact,BACKUP_MANIFEST_FORMAT);
 const manifest=JSON.parse(td.decode(clear));
 if(manifest.objects.length!==indexArtifact.object_count||
   manifest.id_list_sha256!==indexArtifact.id_list_sha256)throw Error('BATCH_PLANNER_INDEX_DRIFT');
 if(offset>manifest.objects.length)throw Error('BATCH_PLANNER_CURSOR_INVALID');
 if(offset===manifest.objects.length)
  return {status:'NO_MORE_OBJECTS',scope:'fenix-capital/FACT-001/LAB/1.0.0',
   verified_index_sha256:indexArtifact.id_list_sha256,offset,next_offset:offset,items:0,
   provider_writes:0,content_downloaded:false};
 const objects=manifest.objects.slice(offset,offset+maxItems);
 const next=offset+objects.length;
 const batchRef=await digest(te.encode(indexArtifact.id_list_sha256+':'+offset+':'+next));
 const payload={format:BATCH_FORMAT,scope:{company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},
  index_sha256:indexArtifact.id_list_sha256,batch_ref:batchRef,offset,next_offset:next,
  objects,source_index_captured_at:manifest.captured_at,
  source_completed:true};
 const plaintext=te.encode(JSON.stringify(payload));
 const iv=new Uint8Array(12);random(iv);
 if(iv.every(x=>x===0))throw Error('BATCH_PLANNER_NONCE_INVALID');
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,
  additionalData:te.encode(BATCH_FORMAT)},key,plaintext));
 return {status:'FACT001_NOTION_CONTENT_BATCH_SEALED',scope:'fenix-capital/FACT-001/LAB/1.0.0',
  batch_ref:batchRef,index_sha256:indexArtifact.id_list_sha256,
  offset,next_offset:next,items:objects.length,pages:objects.filter(x=>x.object==='page').length,
  data_sources:objects.filter(x=>x.object==='data_source').length,has_more:next<manifest.objects.length,
  content_downloaded:false,provider_writes:0,queue_activated:false,full_workspace_backup:false,
  envelope:{format:BATCH_FORMAT,nonce_b64:toBase64(iv),ciphertext_b64:toBase64(ciphertext)}};
}
export async function verifyNotionBackupBatch({encryptionKey,artifact,expectedIndexSha256}={}){
 if(artifact?.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||!HEX.test(expectedIndexSha256||'')||
  artifact.index_sha256!==expectedIndexSha256||artifact.envelope?.format!==BATCH_FORMAT||
  !HEX.test(artifact.batch_ref||''))throw Error('BATCH_PLANNER_ARTIFACT_DENIED');
 const key=await keyImport(encryptionKey),clear=await open(key,artifact,BATCH_FORMAT);
 let data;try{data=JSON.parse(td.decode(clear))}catch{throw Error('BATCH_PLANNER_JSON_INVALID')}
 const ref=await digest(te.encode(data.index_sha256+':'+data.offset+':'+data.next_offset));
 if(ref!==artifact.batch_ref||data.index_sha256!==expectedIndexSha256||
  data.scope?.company_id!=='fenix-capital'||data.scope?.engine_id!=='FACT-001'||
  data.scope?.environment!=='LAB'||!Number.isSafeInteger(data.offset)||data.offset<0||
  data.next_offset!==data.offset+data.objects?.length||
  data.offset!==artifact.offset||data.next_offset!==artifact.next_offset||
  data.objects?.length!==artifact.items||data.objects.length<1||data.objects.length>25)
  throw Error('BATCH_PLANNER_INTEGRITY_DENIED');
 return {status:'FACT001_NOTION_BATCH_PLAN_REBUILT',batch_ref:ref,
  item_count:data.objects.length,offset:data.offset,next_offset:data.next_offset,
  content_downloaded:false,provider_writes:0,queue_activated:false,contents_exposed:false};
}
