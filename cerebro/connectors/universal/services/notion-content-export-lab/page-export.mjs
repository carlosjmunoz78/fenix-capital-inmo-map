// FACT-001 / Read-only, isolated LAB snapshot of ONE page from a fixed sealed batch.
// Portable WebCrypto (Deno / Node). Never returns plaintext, page IDs or credentials.
const te=new TextEncoder(),td=new TextDecoder();
const PLAN='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1';
const BODY='FACT001-NOTION-PAGE-CONTENT-AES256GCM-V2';
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
export const INDEX_SHA='205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca';
export const BATCH_REF='50fc9fc1d7d6fd985dc58e238604fe534d3b536af9b86ccc77ad52fe2a1ea1c7';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^[a-f0-9]{64}$/;
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const b64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);};
const un64=s=>{
 if(typeof s!=='string'||s.length>8500000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('BASE64_DENIED');
 let x;try{x=atob(s)}catch{throw Error('BASE64_DENIED')};return Uint8Array.from(x,c=>c.charCodeAt(0));
};
async function sha(data){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');}
async function aesKey(hex){if(typeof hex!=='string'||!HEX.test(hex))throw Error('KEY_DENIED');return crypto.subtle.importKey('raw',Uint8Array.from(hex.match(/../g),h=>parseInt(h,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
const scopes=(x)=>Object.entries(SCOPE).every(([k,v])=>x?.[k]===v);
export async function openFixedBatch({planArtifact,encryptionKey}){
 const a=planArtifact;
 if(a?.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||a?.batch_ref!==BATCH_REF||a.index_sha256!==INDEX_SHA||a.offset!==0||a.next_offset!==25||a.items!==25||a.pages!==25||a.data_sources!==0||a.envelope?.format!==PLAN)throw Error('BATCH_DENIED');
 const key=await aesKey(encryptionKey),iv=un64(a.envelope.nonce_b64),ct=un64(a.envelope.ciphertext_b64);
 if(iv.length!==12||ct.length<17||ct.length>120000)throw Error('CIPHER_DENIED');
 let clear;try{clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:te.encode(PLAN)},key,ct));}catch{throw Error('BATCH_AUTH_DENIED')}
 let data;try{data=JSON.parse(td.decode(clear));}catch{throw Error('BATCH_JSON_DENIED')}
 if(data.format!==PLAN||!scopes(data.scope)||data.batch_ref!==BATCH_REF||data.index_sha256!==INDEX_SHA||data.offset!==0||data.next_offset!==25||!Array.isArray(data.objects)||data.objects.length!==25||!data.source_completed||data.objects.some(o=>o?.object!=='page'||!UUID.test(o.id))||new Set(data.objects.map(o=>o.id)).size!==25||await sha(te.encode(INDEX_SHA+':0:25'))!==BATCH_REF)throw Error('BATCH_SCOPE_DENIED');
 return {objects:data.objects,key};
}
async function get(url,token,http){
 let r;try{r=await http(url,{method:'GET',headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});}catch{throw Error('NOTION_NETWORK')}
 if(r?.status!==200)throw Error(r?.status===401||r?.status===403?'NOTION_AUTH':r?.status===429?'NOTION_RATE_LIMIT':'NOTION_HTTP');
 try{return await r.json();}catch{throw Error('NOTION_JSON')}
}
export async function exportFixedPage({planArtifact,encryptionKey,notionToken,index,http=fetch,paceMs=360,maxRequests=40,maxBytes=2100000}={}){
 if(typeof notionToken!=='string'||notionToken.length<24||notionToken.length>8192||/\s/.test(notionToken)||!Number.isInteger(index)||index<0||index>24||!Number.isInteger(maxRequests)||maxRequests<2||maxRequests>40||!Number.isInteger(maxBytes)||maxBytes<10000||maxBytes>2100000||!Number.isInteger(paceMs)||paceMs<0||paceMs>1000)throw Error('INPUT_DENIED');
 const {objects,key}=await openFixedBatch({planArtifact,encryptionKey});const obj=objects[index];
 const initial=await get('https://api.notion.com/v1/pages/'+obj.id,notionToken,http);
 if(initial?.object!=='page'||initial.id!==obj.id||initial.archived===true||initial.in_trash===true)throw Error('PAGE_DENIED');
 let requestCount=1,media=0;const tasks=[{id:obj.id,cursor:null,depth:0}],queued=new Set([obj.id]),seen=new Set(),chunks=[];
 while(tasks.length){
  if(requestCount>=maxRequests)throw Error('INCOMPLETE_REQUEST_CAP');
  const task=tasks.shift(),pos=task.id+'|'+(task.cursor??'');if(seen.has(pos))throw Error('CURSOR_CYCLE');seen.add(pos);
  if(paceMs)await sleep(paceMs);
  const u='https://api.notion.com/v1/blocks/'+task.id+'/children?page_size=100'+(task.cursor?'&start_cursor='+encodeURIComponent(task.cursor):'');
  const res=await get(u,notionToken,http);requestCount++;
  if(!Array.isArray(res?.results)||res.results.length>100||typeof res.has_more!=='boolean'||(res.has_more&&(typeof res.next_cursor!=='string'||!res.next_cursor||res.next_cursor.length>1000)))throw Error('BLOCK_SHAPE');
  for(const item of res.results){
   if(item?.object!=='block'||!UUID.test(item.id)||typeof item.type!=='string'||typeof item.has_children!=='boolean')throw Error('BLOCK_DENIED');
   if(['file','pdf','image','video','audio','external'].includes(item.type))media++;
   if(item.has_children){if(queued.has(item.id))throw Error('CHILD_CYCLE');queued.add(item.id);tasks.push({id:item.id,depth:task.depth+1,cursor:null});}
  }
  chunks.push({parent_id:task.id,cursor:task.cursor,depth:task.depth,blocks:res.results,has_more:res.has_more});
  if(res.has_more)tasks.unshift({id:task.id,cursor:res.next_cursor,depth:task.depth});
  if(te.encode(JSON.stringify({page:initial,blocks:chunks})).length>maxBytes-1000)throw Error('INCOMPLETE_SIZE_CAP');
 }
 // Reject in-flight edits rather than claiming an inconsistent snapshot.
 if(requestCount>=maxRequests)throw Error('INCOMPLETE_REQUEST_CAP');if(paceMs)await sleep(paceMs);
 const final=await get('https://api.notion.com/v1/pages/'+obj.id,notionToken,http);requestCount++;
 if(final?.id!==obj.id||final.last_edited_time!==initial.last_edited_time||final.archived===true||final.in_trash===true)throw Error('SOURCE_CHANGED_DURING_EXPORT');
 const body={format:BODY,scope:SCOPE,index_sha256:INDEX_SHA,batch_ref:BATCH_REF,object_offset:index,source_last_edited_time:initial.last_edited_time,page:initial,blocks:chunks,requests:requestCount,block_count:chunks.reduce((n,x)=>n+x.blocks.length,0),complete_block_tree:true,media_references:media,media_binaries_backed_up:false,comments_backed_up:false};
 const clear=te.encode(JSON.stringify(body));if(clear.length>maxBytes)throw Error('INCOMPLETE_SIZE_CAP');
 const iv=crypto.getRandomValues(new Uint8Array(12));const sealed=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode(BODY)},key,clear));
 return {status:'FACT001_NOTION_PAGE_CONTENT_SEALED',scope:'fenix-capital/FACT-001/LAB/1.0.0',batch_ref:BATCH_REF,source_index_sha256:INDEX_SHA,item_index:index,block_count:body.block_count,api_requests:requestCount,media_references:media,complete_block_tree:true,media_binaries_backed_up:false,comments_backed_up:false,provider_writes:0,checkpoint_committed:false,plaintext_sha256:await sha(clear),plaintext_bytes:clear.length,envelope:{format:BODY,nonce_b64:b64(iv),ciphertext_b64:b64(sealed)}};
}
export async function verifyFixedPage({artifact,planArtifact,encryptionKey}){
 const {objects,key}=await openFixedBatch({planArtifact,encryptionKey}),a=artifact;
 if(a?.status!=='FACT001_NOTION_PAGE_CONTENT_SEALED'||a?.batch_ref!==BATCH_REF||a.source_index_sha256!==INDEX_SHA||!Number.isInteger(a.item_index)||a.item_index<0||a.item_index>24||a?.envelope?.format!==BODY||!HEX.test(a.plaintext_sha256||'')||a.checkpoint_committed!==false)throw Error('PAGE_SEAL_DENIED');
 const iv=un64(a.envelope.nonce_b64),ct=un64(a.envelope.ciphertext_b64);if(iv.length!==12||ct.length<17||ct.length>2800000)throw Error('PAGE_CIPHER_DENIED');
 let clear;try{clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:te.encode(BODY)},key,ct));}catch{throw Error('PAGE_AUTH_DENIED')}
 if(await sha(clear)!==a.plaintext_sha256||clear.length!==a.plaintext_bytes)throw Error('PAGE_INTEGRITY_DENIED');
 let b;try{b=JSON.parse(td.decode(clear));}catch{throw Error('PAGE_JSON_DENIED')}
 if(b.format!==BODY||!scopes(b.scope)||b.batch_ref!==BATCH_REF||b.index_sha256!==INDEX_SHA||b.page?.id!==objects[a.item_index].id||b.object_offset!==a.item_index||!b.complete_block_tree||!Array.isArray(b.blocks)||b.blocks.reduce((n,x)=>n+x.blocks?.length,0)!==a.block_count)throw Error('PAGE_SCOPE_DENIED');
 return {status:'PAGE_MEMORY_REBUILD_PASS',item_index:a.item_index,block_count:a.block_count,provider_writes:0,physical_restore:false};
}