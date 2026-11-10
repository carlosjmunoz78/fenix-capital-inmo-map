// FACT-001 Notion recursive content backup: READ ONLY, fixed Wiki root,
// bounded BFS over child blocks, cursor checkpoints, encrypted artifact only.
// Does not back up database rows, comments or attachment binaries.
export const WIKI_RECURSIVE_ROOT='1c481b1a-756d-8002-813d-f3efdd4ecd89';
export const WIKI_RECURSIVE_VAULT_KEY='cerebro_fact001_notion_backup_aes256_lab_v1';
const PREFIX='FACT001-NOTION-WIKI-RECURSIVE-AES256GCM-V1';
const LIMIT={requests:12,depth:4,page_size:50,plaintext_bytes:4500000};
const encode=new TextEncoder();
const decode=new TextDecoder();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const keyBytes=s=>{
 if(typeof s!=='string'||!/^[0-9a-f]{64}$/.test(s))throw Error('FACT001_RECURSIVE_AES_KEY_DENIED');
 return Uint8Array.from(s.match(/../g),x=>parseInt(x,16));
};
const keyImport=async s=>crypto.subtle.importKey('raw',keyBytes(s),'AES-GCM',false,['encrypt','decrypt']);
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
const b64=bytes=>{
 let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);
};
const un64=s=>{
 if(typeof s!=='string'||s.length>6500000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('FACT001_RECURSIVE_CIPHER_FORMAT_DENIED');
 let raw;try{raw=atob(s)}catch{throw Error('FACT001_RECURSIVE_CIPHER_FORMAT_DENIED');}
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
};
async function getJSON(url,token,http){
 let r;try{r=await http(url,{method:'GET',headers:{
  Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json'
 },redirect:'error',signal:AbortSignal.timeout(12000)});}
 catch{throw Error('FACT001_RECURSIVE_NOTION_NETWORK_UNVERIFIED');}
 if(r.status===401||r.status===403)throw Error('FACT001_RECURSIVE_NOTION_AUTH_DENIED');
 if(r.status!==200)throw Error('FACT001_RECURSIVE_NOTION_HTTP_'+r.status);
 try{return await r.json()}catch{throw Error('FACT001_RECURSIVE_NOTION_INVALID_JSON');}
}
const isMedia=b=>['image','video','audio','file','pdf'].includes(b.type);
export async function sealRecursiveWiki({notionToken,encryptionKey,http=fetch,random=crypto.getRandomValues.bind(crypto)}={}){
 if(typeof notionToken!=='string'||notionToken.length<24||notionToken.length>8192||/\s/.test(notionToken))
  throw Error('FACT001_RECURSIVE_NOTION_TOKEN_DENIED');
 const key=await keyImport(encryptionKey);
 const root=await getJSON('https://api.notion.com/v1/pages/'+WIKI_RECURSIVE_ROOT,notionToken,http);
 if(root?.object!=='page'||root.id!==WIKI_RECURSIVE_ROOT||root.archived===true||root.in_trash===true)
  throw Error('FACT001_RECURSIVE_ROOT_NOT_LIVE');
 const queue=[{id:WIKI_RECURSIVE_ROOT,depth:0,cursor:null}];
 const queued=new Set([WIKI_RECURSIVE_ROOT]),completed=new Set(),visitedCursors=new Set();
 const chunks=[];let blockCount=0,mediaCount=0,requests=0;
 while(queue.length&&requests<LIMIT.requests){
  const task=queue.shift();
  if(task.depth>LIMIT.depth){queue.push(task);break;}
  const pos=task.id+'|'+(task.cursor||'');
  if(visitedCursors.has(pos))throw Error('FACT001_RECURSIVE_PAGINATION_CYCLE');
  visitedCursors.add(pos);
  if(requests&&http===fetch)await new Promise(resolve=>setTimeout(resolve,380));
  const url='https://api.notion.com/v1/blocks/'+task.id+'/children?page_size='+LIMIT.page_size+
    (task.cursor?'&start_cursor='+encodeURIComponent(task.cursor):'');
  const data=await getJSON(url,notionToken,http);
  if(!data||!Array.isArray(data.results)||data.results.length>LIMIT.page_size||
    typeof data.has_more!=='boolean'||(data.has_more&&(typeof data.next_cursor!=='string'||!data.next_cursor)))
    throw Error('FACT001_RECURSIVE_RESPONSE_INVALID');
  const childIds=[];
  for(const block of data.results){
   if(!UUID.test(block?.id)||block.object!=='block'||typeof block.type!=='string'||
    typeof block.has_children!=='boolean')throw Error('FACT001_RECURSIVE_BLOCK_INVALID');
   if(block.has_children){
    if(queued.has(block.id))throw Error('FACT001_RECURSIVE_REPEAT_CHILD');
    queued.add(block.id);childIds.push(block.id);
   }
   if(isMedia(block))mediaCount++;
  }
  chunks.push({block_id:task.id,depth:task.depth,cursor:task.cursor,
   has_more:data.has_more,next_cursor:data.has_more?data.next_cursor:null,blocks:data.results});
  blockCount+=data.results.length;requests++;
  if(data.has_more)queue.unshift({id:task.id,depth:task.depth,cursor:data.next_cursor});
  else completed.add(task.id);
  for(const id of childIds)queue.push({id,depth:task.depth+1,cursor:null});
 }
 const snapshot={format:PREFIX,scope:{company_id:'fenix-capital',engine_id:'FACT-001',
  environment:'LAB',version:'1.0.0'},root_id:WIKI_RECURSIVE_ROOT,
  root,blocks:chunks,unvisited_queue:queue,completed_block_ids:[...completed],
  block_count:blockCount,media_references:mediaCount,api_requests:requests,
  missing_attachment_binaries:true,missing_data_source_rows:true,missing_comments:true};
 const plaintext=encode.encode(JSON.stringify(snapshot));
 if(plaintext.length>LIMIT.plaintext_bytes)throw Error('FACT001_RECURSIVE_CHUNK_TOO_LARGE');
 const nonce=new Uint8Array(12);random(nonce);
 if(nonce.every(x=>x===0))throw Error('FACT001_RECURSIVE_NONCE_INVALID');
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,
  additionalData:encode.encode(PREFIX)},key,plaintext));
 return {status:'FACT001_RECURSIVE_NOTION_ENCRYPTED_CHUNK',
  scope:'fenix-capital/FACT-001/LAB/1.0.0',root_id:WIKI_RECURSIVE_ROOT,
  algorithm:'AES-256-GCM',key_vault_name:WIKI_RECURSIVE_VAULT_KEY,
  page_objects:1,block_count:blockCount,api_requests:requests,
  encrypted_chunk_count:chunks.length,media_reference_count:mediaCount,
  deferred_tasks:queue.length,complete_root_block_tree:queue.length===0,
  full_workspace_backup:false,notion_restore_performed:false,
  external_provider_writes:0,plaintext_bytes:plaintext.length,
  plaintext_sha256:await sha(plaintext),
  envelope:{format:PREFIX,nonce_b64:b64(nonce),ciphertext_b64:b64(cipher)}};
}
export async function verifyRecursiveWiki({artifact,encryptionKey}={}){
 if(artifact?.status!=='FACT001_RECURSIVE_NOTION_ENCRYPTED_CHUNK'||
  artifact.root_id!==WIKI_RECURSIVE_ROOT||artifact.envelope?.format!==PREFIX||
  artifact.algorithm!=='AES-256-GCM'||!/^[0-9a-f]{64}$/.test(artifact.plaintext_sha256||''))
  throw Error('FACT001_RECURSIVE_ARTIFACT_DENIED');
 const key=await keyImport(encryptionKey),iv=un64(artifact.envelope.nonce_b64),
  cipher=un64(artifact.envelope.ciphertext_b64);
 if(iv.length!==12||cipher.length<17||cipher.length>5500000)throw Error('FACT001_RECURSIVE_ENVELOPE_DENIED');
 let plaintext;try{plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',
  iv,additionalData:encode.encode(PREFIX)},key,cipher));}
 catch{throw Error('FACT001_RECURSIVE_AUTHENTICITY_FAILURE');}
 if(await sha(plaintext)!==artifact.plaintext_sha256||plaintext.length!==artifact.plaintext_bytes)
  throw Error('FACT001_RECURSIVE_INTEGRITY_FAILURE');
 let saved;try{saved=JSON.parse(decode.decode(plaintext))}catch{throw Error('FACT001_RECURSIVE_SNAPSHOT_PARSE_DENIED');}
 if(saved.format!==PREFIX||saved.root_id!==WIKI_RECURSIVE_ROOT||
  saved.scope?.environment!=='LAB'||saved.scope?.company_id!=='fenix-capital'||
  !Array.isArray(saved.blocks)||!Array.isArray(saved.unvisited_queue)||
  saved.blocks.length!==artifact.encrypted_chunk_count||
  saved.unvisited_queue.length!==artifact.deferred_tasks||
  saved.blocks.reduce((n,c)=>n+c.blocks.length,0)!==artifact.block_count||
  saved.block_count!==artifact.block_count||saved.api_requests!==artifact.api_requests)
  throw Error('FACT001_RECURSIVE_SNAPSHOT_INTEGRITY_DENIED');
 return {status:'FACT001_RECURSIVE_MEMORY_RECONSTRUCTION_PASS',
  block_count:artifact.block_count,encrypted_chunk_count:artifact.encrypted_chunk_count,
  deferred_tasks:artifact.deferred_tasks,root_tree_complete:artifact.complete_root_block_tree,
  plaintext_sha256:artifact.plaintext_sha256,
  notion_physical_restore:false,full_workspace_backup:false,content_exposed:false,
  external_provider_writes:0};
}
