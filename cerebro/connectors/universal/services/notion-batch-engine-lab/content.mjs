// FACT-001 · Bounded full text-and-schema snapshot of ONE page or data-source from a sealed 25-item plan.
// No provider mutations. NO attachments/comments; those have distinct backup gates.
const te=new TextEncoder(),td=new TextDecoder();
const PLAN='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1',OUTPUT='FACT001-NOTION-MIXED-OBJECT-CONTENT-AES256GCM-V1';
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
export const INDEX_SHA='205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca';
export const MAX_BATCH_ITEMS=25;
export const TOTAL_OBJECTS=6632;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,HEX=/^[0-9a-f]{64}$/;
const b64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s)};
const un64=s=>{if(typeof s!=='string'||s.length>10000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('BASE64_DENIED');let x;try{x=atob(s)}catch{throw Error('BASE64_DENIED')}return Uint8Array.from(x,c=>c.charCodeAt(0));};
const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');
async function aesKey(s){if(typeof s!=='string'||!HEX.test(s))throw Error('KEY_DENIED');return crypto.subtle.importKey('raw',Uint8Array.from(s.match(/../g),x=>parseInt(x,16)),'AES-GCM',false,['encrypt','decrypt']);}
export async function openBatch({planArtifact,encryptionKey}){
 const offset=planArtifact?.offset;const n=TOTAL_OBJECTS-offset>=MAX_BATCH_ITEMS?MAX_BATCH_ITEMS:TOTAL_OBJECTS-offset;
 if(!Number.isSafeInteger(offset)||offset<75||offset%25!==0||n<1||n>MAX_BATCH_ITEMS)throw Error('BATCH_OFFSET_DENIED');
 const expectedRef=await digest(te.encode(INDEX_SHA+':'+offset+':'+(offset+n)));
 const a=planArtifact;
 if(a?.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||a?.envelope?.format!==PLAN||a.batch_ref!==expectedRef||a.index_sha256!==INDEX_SHA||a.next_offset!==offset+n||a.items!==n||a.pages+a.data_sources!==n||a.content_downloaded!==false)throw Error('BATCH_DENIED');
 const key=await aesKey(encryptionKey),iv=un64(a.envelope.nonce_b64),ct=un64(a.envelope.ciphertext_b64);
 if(iv.length!==12||ct.length<17||ct.length>180000)throw Error('BATCH_CIPHER_DENIED');
 let clear;try{clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:te.encode(PLAN)},key,ct))}catch{throw Error('BATCH_AUTH_DENIED')}
 let b;try{b=JSON.parse(td.decode(clear))}catch{throw Error('BATCH_JSON_DENIED')}
 if(b.format!==PLAN||Object.entries(SCOPE).some(([k,v])=>b.scope?.[k]!==v)||b.index_sha256!==INDEX_SHA||b.batch_ref!==expectedRef||b.offset!==offset||b.next_offset!==offset+n||b.source_completed!==true||!Array.isArray(b.objects)||b.objects.length!==n||b.objects.filter(x=>x.object==='page').length!==a.pages||b.objects.filter(x=>x.object==='data_source').length!==a.data_sources||b.objects.some(x=>!UUID.test(x.id))||new Set(b.objects.map(x=>x.id)).size!==n||await digest(te.encode(INDEX_SHA+':'+offset+':'+(offset+n)))!==expectedRef)throw Error('BATCH_SCOPE_DENIED');
 return {objects:b.objects,key,batchRef:expectedRef,offset};
}
const sleep=n=>new Promise(r=>setTimeout(r,n));
async function api(url,method,token,http,body){
 let r;try{r=await http(url,{method,headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)})}catch{throw Error('NOTION_NETWORK')}
 if(r?.status!==200)throw Error(r?.status===401||r?.status===403?'NOTION_AUTH':r?.status===429?'NOTION_RATE_LIMIT':'NOTION_HTTP');
 try{return await r.json()}catch{throw Error('NOTION_JSON')}
}
export async function exportObject({planArtifact,encryptionKey,notionToken,index,http=fetch,maxRequests=125,maxBytes=3200000,paceMs=360}={}){
 if(typeof notionToken!=='string'||notionToken.length<24||notionToken.length>8192||/\s/.test(notionToken)||!Number.isSafeInteger(index)||index<0||index>=25||!Number.isSafeInteger(maxRequests)||maxRequests<3||maxRequests>125||!Number.isSafeInteger(maxBytes)||maxBytes<10000||maxBytes>3200000||!Number.isSafeInteger(paceMs)||paceMs<0||paceMs>1000)throw Error('INPUT_DENIED');
 const {objects,key,batchRef,offset}=await openBatch({planArtifact,encryptionKey});if(index>=objects.length)throw Error('ITEM_INDEX_DENIED');const selected=objects[index];let reqs=0,media=0,blockCount=0;const chunks=[],rows=[],seenRows=new Set();
 const read=async(url,method='GET',body)=>{if(reqs>=maxRequests)throw Error('INCOMPLETE_REQUEST_CAP');if(reqs&&paceMs)await sleep(paceMs);const ret=await api(url,method,notionToken,http,body);reqs++;return ret;};
 const limit=ob=>{if(te.encode(JSON.stringify(ob)).length>maxBytes-1200)throw Error('INCOMPLETE_SIZE_CAP');};
 async function walk(root){
  const tasks=[{id:root,depth:0,cursor:null}],used=new Set(),seen=new Set([root]);
  while(tasks.length){
   const t=tasks.shift(),cursorKey=t.id+'|'+(t.cursor??'');if(used.has(cursorKey))throw Error('CURSOR_LOOP');used.add(cursorKey);
   const b=await read('https://api.notion.com/v1/blocks/'+t.id+'/children?page_size=100'+(t.cursor?'&start_cursor='+encodeURIComponent(t.cursor):''));
   if(!Array.isArray(b?.results)||b.results.length>100||typeof b.has_more!=='boolean'||(b.has_more&&(!b.next_cursor||typeof b.next_cursor!=='string'||b.next_cursor.length>1000)))throw Error('BLOCK_SHAPE_DENIED');
   for(const x of b.results){if(x?.object!=='block'||!UUID.test(x.id)||typeof x.has_children!=='boolean')throw Error('BLOCK_DENIED');if(['file','pdf','image','video','audio'].includes(x.type))media++;if(x.has_children){if(seen.has(x.id))throw Error('CHILD_LOOP');seen.add(x.id);tasks.push({id:x.id,depth:t.depth+1,cursor:null});}blockCount++}
   chunks.push({parent_id:t.id,depth:t.depth,cursor:t.cursor,results:b.results});
   if(b.has_more)tasks.unshift({id:t.id,depth:t.depth,cursor:b.next_cursor});
   limit({chunks,rows});
  }
 }
 let initial,final;
 if(selected.object==='page'){
  initial=await read('https://api.notion.com/v1/pages/'+selected.id);
  if(initial?.object!=='page'||initial.id!==selected.id||initial.archived===true||initial.in_trash===true||typeof initial.last_edited_time!=='string')throw Error('PAGE_DENIED');
  await walk(selected.id);final=await read('https://api.notion.com/v1/pages/'+selected.id);
 }else if(selected.object==='data_source'){
  const source='https://api.notion.com/v1/data_sources/'+selected.id;
  initial=await read(source);if(initial?.object!=='data_source'||initial.id!==selected.id||initial.archived===true||initial.in_trash===true||typeof initial.last_edited_time!=='string')throw Error('SOURCE_DENIED');
  let more=true,cursor=null;const seenCursor=new Set();
  while(more){const b=await read(source+'/query','POST',{page_size:100,...(cursor?{start_cursor:cursor}:{})});
   if(!Array.isArray(b?.results)||b.results.length>100||typeof b.has_more!=='boolean'||(b.has_more&&(!b.next_cursor||typeof b.next_cursor!=='string'||b.next_cursor.length>1000)))throw Error('SOURCE_PAGINATION_DENIED');
   for(const p of b.results){
    if(p?.object!=='page'||!UUID.test(p.id)||seenRows.has(p.id))throw Error('SOURCE_ROW_DENIED');
    if(p.properties&&Object.values(p.properties).some(v=>v?.type==='relation'&&v.has_more===true))throw Error('SOURCE_PROPERTIES_INCOMPLETE');
    seenRows.add(p.id);rows.push(p);limit({rows,chunks});
   }
   more=b.has_more;cursor=more?b.next_cursor:null;if(more){if(seenCursor.has(cursor))throw Error('SOURCE_CURSOR_LOOP');seenCursor.add(cursor);}
  }
  for(const p of rows)await walk(p.id);
  final=await read(source);
 }else throw Error('OBJECT_KIND_DENIED');
 if(final?.id!==initial.id||final.last_edited_time!==initial.last_edited_time||final.archived===true||final.in_trash===true)throw Error('SOURCE_CHANGED_DURING_EXPORT');
 const payload={format:OUTPUT,scope:SCOPE,index_sha256:INDEX_SHA,batch_ref:batchRef,kind:selected.object,item_index:index,global_offset:offset+index,source_last_edited_time:initial.last_edited_time,source_schema_or_page:initial,rows,blocks:chunks,row_count:rows.length,block_count:blockCount,api_requests:reqs,complete_block_tree:true,rows_complete:selected.object==='data_source'?true:null,media_references:media,media_binaries_backed_up:false,comments_backed_up:false,provider_writes:0};
 const clear=te.encode(JSON.stringify(payload));if(clear.length>maxBytes)throw Error('INCOMPLETE_SIZE_CAP');
 const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode(OUTPUT)},key,clear));
 return {status:'FACT001_NOTION_MIXED_OBJECT_CONTENT_SEALED',batch_ref:batchRef,index_sha256:INDEX_SHA,kind:selected.object,item_index:index,global_offset:offset+index,row_count:rows.length,block_count:blockCount,api_requests:reqs,media_references:media,media_binaries_backed_up:false,comments_backed_up:false,complete_block_tree:true,provider_writes:0,checkpoint_committed:false,plaintext_sha256:await digest(clear),plaintext_bytes:clear.length,envelope:{format:OUTPUT,nonce_b64:b64(iv),ciphertext_b64:b64(cipher)}};
}
export async function verifyObject({artifact,planArtifact,encryptionKey}={}){
 const {objects,key,batchRef,offset}=await openBatch({planArtifact,encryptionKey}),a=artifact;
 if(a?.status!=='FACT001_NOTION_MIXED_OBJECT_CONTENT_SEALED'||a.batch_ref!==batchRef||a.index_sha256!==INDEX_SHA||!Number.isSafeInteger(a.item_index)||a.item_index<0||a.item_index>=objects.length||a.global_offset!==offset+a.item_index||a.kind!==objects[a.item_index].object||a.envelope?.format!==OUTPUT||!HEX.test(a.plaintext_sha256||'')||a.checkpoint_committed!==false)throw Error('ARTIFACT_DENIED');
 const iv=un64(a.envelope.nonce_b64),ct=un64(a.envelope.ciphertext_b64);if(iv.length!==12||ct.length<17||ct.length>4500000)throw Error('CIPHER_DENIED');
 let bytes;try{bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:te.encode(OUTPUT)},key,ct))}catch{throw Error('AUTH_DENIED')}
 if(await digest(bytes)!==a.plaintext_sha256||bytes.length!==a.plaintext_bytes)throw Error('INTEGRITY_DENIED');
 let data;try{data=JSON.parse(td.decode(bytes))}catch{throw Error('JSON_DENIED')}
 if(data.format!==OUTPUT||Object.entries(SCOPE).some(([k,v])=>data.scope?.[k]!==v)||data.source_schema_or_page?.id!==objects[a.item_index].id||data.kind!==a.kind||data.item_index!==a.item_index||data.global_offset!==a.global_offset||data.rows?.length!==a.row_count||data.block_count!==a.block_count||data.complete_block_tree!==true||data.provider_writes!==0)throw Error('PARITY_DENIED');
 return {status:'FACT001_CONTENT_MEMORY_REBUILT',kind:a.kind,rows:a.row_count,blocks:a.block_count,provider_writes:0,physical_restore:false};
}