// FACT-001 · Read-only Notion searchable-object inventory, durable AES-GCM V0.
// Metadata only: sealed IDs/type/parents/last-edited for future offsite chunk jobs.
// This does NOT capture page bodies, child blocks, binary assets, deleted data or rows.
export const BACKUP_MANIFEST_KEY='cerebro_fact001_notion_backup_aes256_lab_v1';
export const BACKUP_MANIFEST_FORMAT='FACT001-NOTION-INDEX-MANIFEST-AES256GCM-V1';
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const API='https://api.notion.com/v1/search';
const enc=new TextEncoder(),dec=new TextDecoder(),HEX=/^[0-9a-f]{64}$/,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const importKey=async secret=>{
 if(typeof secret!=='string'||!HEX.test(secret))throw Error('MANIFEST_KEY_INVALID');
 return crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),x=>parseInt(x,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);
};
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const b64=bytes=>{let s='';for(let p=0;p<bytes.length;p+=8192)s+=String.fromCharCode(...bytes.subarray(p,p+8192));return btoa(s)};
const un64=s=>{
 if(typeof s!=='string'||s.length>8500000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('MANIFEST_BASE64_INVALID');
 let raw;try{raw=atob(s)}catch{throw Error('MANIFEST_BASE64_INVALID')}
 return Uint8Array.from(raw,x=>x.charCodeAt(0));
};
export async function sealNotionIndexManifest({notionToken,encryptionKey,http=fetch,maxPages=85,random=crypto.getRandomValues.bind(crypto)}={}){
 if(typeof notionToken!=='string'||notionToken.length<24||notionToken.length>8192||/\s/.test(notionToken)||
   !Number.isSafeInteger(maxPages)||maxPages<1||maxPages>85)throw Error('MANIFEST_INPUT_INVALID');
 const key=await importKey(encryptionKey),items=[],seen=new Set(),cursorSeen=new Set();
 let cursor=null,hasMore=true,requests=0,sourcePages=0,sourceData=0;
 while(hasMore&&requests<maxPages){
  if(requests&&http===fetch)await new Promise(r=>setTimeout(r,390));
  let response;
  try{response=await http(API,{method:'POST',headers:{Authorization:'Bearer '+notionToken,
    'Notion-Version':'2026-03-11',Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({page_size:100,...(cursor?{start_cursor:cursor}:{})}),
    redirect:'error',signal:AbortSignal.timeout(16000)});}
  catch{throw Error('MANIFEST_PROVIDER_NETWORK_UNVERIFIED')}
  if(response.status===401||response.status===403)throw Error('MANIFEST_PROVIDER_AUTH_DENIED');
  if(response.status!==200)throw Error('MANIFEST_PROVIDER_HTTP_'+response.status);
  let body;try{body=await response.json()}catch{throw Error('MANIFEST_PROVIDER_BAD_JSON')}
  if(!body||!Array.isArray(body.results)||body.results.length>100||typeof body.has_more!=='boolean'||
    (body.has_more&&(!body.next_cursor||typeof body.next_cursor!=='string'||body.next_cursor.length>1000)))
   throw Error('MANIFEST_PAGINATION_SHAPE_DENIED');
  for(const item of body.results){
   if(!UUID.test(item?.id)||!['page','data_source'].includes(item.object)||seen.has(item.id))
    throw Error('MANIFEST_DUPLICATE_OR_UNKNOWN_OBJECT');
   seen.add(item.id);
   // Metadata only, encrypted before leaving the broker; no title, properties or body.
   items.push({id:item.id,object:item.object,parent:item.parent??null,
    last_edited_time:typeof item.last_edited_time==='string'?item.last_edited_time:null});
   if(item.object==='page')sourcePages++;else sourceData++;
  }
  requests++;hasMore=body.has_more;cursor=hasMore?body.next_cursor:null;
  if(hasMore){if(cursorSeen.has(cursor))throw Error('MANIFEST_CURSOR_LOOP');cursorSeen.add(cursor)}
 }
 items.sort((a,b)=>a.id.localeCompare(b.id,'en'));
 const sortedIds=[...seen].sort();
 const idListSha=await sha(enc.encode(sortedIds.join('\n')));
 const plaintext=enc.encode(JSON.stringify({format:BACKUP_MANIFEST_FORMAT,scope:SCOPE,
  captured_at:new Date().toISOString(),objects:items,cursor,
  search_index_complete:!hasMore,requests,source_pages:sourcePages,source_data_sources:sourceData,
  id_list_sha256:idListSha,version:1}));
 if(plaintext.length>5900000)throw Error('MANIFEST_OVERSIZE_FAIL_CLOSED');
 const nonce=new Uint8Array(12);random(nonce);
 if(nonce.length!==12||nonce.every(b=>b===0))throw Error('MANIFEST_NONCE_INVALID');
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,
  additionalData:enc.encode(BACKUP_MANIFEST_FORMAT)},key,plaintext));
 return {status:'FACT001_NOTION_INDEX_ENCRYPTED',scope:'fenix-capital/FACT-001/LAB/1.0.0',
  algorithm:'AES-256-GCM',key_vault_name:BACKUP_MANIFEST_KEY,
  object_count:items.length,page_count:sourcePages,data_source_count:sourceData,
  search_api_requests:requests,search_index_complete:!hasMore,
  id_list_sha256:idListSha,plaintext_sha256:await sha(plaintext),plaintext_bytes:plaintext.length,
  contains_all_notions_contents:false,physical_restore:false,write_operations:0,
  requires_next_scan:hasMore,raw_content_returned:false,
  envelope:{format:BACKUP_MANIFEST_FORMAT,nonce_b64:b64(nonce),ciphertext_b64:b64(cipher)}};
}
export async function verifyNotionIndexManifest({encryptionKey,artifact}={}){
 if(artifact?.status!=='FACT001_NOTION_INDEX_ENCRYPTED'||
  artifact.envelope?.format!==BACKUP_MANIFEST_FORMAT||artifact.algorithm!=='AES-256-GCM'||
  !HEX.test(artifact.plaintext_sha256||'')||!HEX.test(artifact.id_list_sha256||'')||
  !Number.isSafeInteger(artifact.object_count)||artifact.object_count<1)throw Error('MANIFEST_ARTIFACT_DENIED');
 const key=await importKey(encryptionKey),iv=un64(artifact.envelope.nonce_b64),bytes=un64(artifact.envelope.ciphertext_b64);
 if(iv.length!==12||bytes.length<17||bytes.length>8000000)throw Error('MANIFEST_ENVELOPE_DENIED');
 let clear;try{clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,
  additionalData:enc.encode(BACKUP_MANIFEST_FORMAT)},key,bytes))}
 catch{throw Error('MANIFEST_AUTHENTICITY_FAILED')}
 if(await sha(clear)!==artifact.plaintext_sha256||clear.length!==artifact.plaintext_bytes)
  throw Error('MANIFEST_PLAINTEXT_INTEGRITY_FAILED');
 let data;try{data=JSON.parse(dec.decode(clear))}catch{throw Error('MANIFEST_JSON_DENIED')}
 if(data.format!==BACKUP_MANIFEST_FORMAT||data.scope?.environment!=='LAB'||
   data.scope?.engine_id!=='FACT-001'||data.scope?.company_id!=='fenix-capital'||
   !Array.isArray(data.objects)||data.objects.length!==artifact.object_count||
   data.source_pages!==artifact.page_count||data.source_data_sources!==artifact.data_source_count||
   data.search_index_complete!==artifact.search_index_complete||
   data.objects.some(x=>!UUID.test(x.id)||!['page','data_source'].includes(x.object))||
   new Set(data.objects.map(x=>x.id)).size!==data.objects.length)
  throw Error('MANIFEST_SCOPE_OR_PARITY_DENIED');
 const ids=data.objects.map(x=>x.id).sort();
 if(await sha(enc.encode(ids.join('\n')))!==artifact.id_list_sha256)
   throw Error('MANIFEST_OBJECT_ID_INTEGRITY_DENIED');
 return {status:'FACT001_NOTION_INDEX_MEMORY_REBUILD_VERIFIED',object_count:data.objects.length,
  page_count:data.source_pages,data_source_count:data.source_data_sources,
  search_index_complete:data.search_index_complete,id_list_sha256:artifact.id_list_sha256,
  content_exposed:false,physical_restore:false,complete_workspace_backup:false,write_operations:0};
}
