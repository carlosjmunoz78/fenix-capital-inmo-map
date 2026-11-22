// FACT-001 · Candidate only. Read-only Notion page-content backup from a sealed batch.
// One page per invocation. The caller must persist encrypted output before moving
// the durable checkpoint; this module neither moves checkpoints nor writes providers.
import {createHash, webcrypto} from 'node:crypto';
const cr=globalThis.crypto??webcrypto;
const te=new TextEncoder(),td=new TextDecoder();
const PLAN='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1';
const OUTPUT='FACT001-NOTION-PAGE-CONTENT-AES256GCM-V1';
const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asB64=b=>Buffer.from(b).toString('base64');
const fromB64=s=>{if(typeof s!=='string'||s.length>10000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('FACT001_BAD_BASE64');return Buffer.from(s,'base64');};
const keyFor=async s=>{if(typeof s!=='string'||!HEX.test(s))throw Error('FACT001_KEY_DENIED');return cr.subtle.importKey('raw',Buffer.from(s,'hex'),'AES-GCM',false,['encrypt','decrypt']);};
const sha=b=>createHash('sha256').update(b).digest('hex');
async function openPlan(artifact,key){
 if(artifact?.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||artifact?.envelope?.format!==PLAN||!HEX.test(artifact.batch_ref||'')||!HEX.test(artifact.index_sha256||''))throw Error('FACT001_PLAN_DENIED');
 const iv=fromB64(artifact.envelope.nonce_b64),ct=fromB64(artifact.envelope.ciphertext_b64);
 if(iv.length!==12||ct.length<17||ct.length>8000000)throw Error('FACT001_PLAN_CIPHER_DENIED');
 let bytes;try{bytes=await cr.subtle.decrypt({name:'AES-GCM',iv,additionalData:te.encode(PLAN)},key,ct)}catch{throw Error('FACT001_PLAN_AUTH_DENIED')}
 let data;try{data=JSON.parse(td.decode(bytes))}catch{throw Error('FACT001_PLAN_JSON_DENIED')}
 if(data?.format!==PLAN||data.scope?.company_id!=='fenix-capital'||data.scope?.engine_id!=='FACT-001'||data.scope?.environment!=='LAB'||data.scope?.version!=='1.0.0'||data.index_sha256!==artifact.index_sha256||data.batch_ref!==artifact.batch_ref||!Number.isSafeInteger(data.offset)||!Number.isSafeInteger(data.next_offset)||data.offset!==artifact.offset||data.next_offset!==artifact.next_offset||!Array.isArray(data.objects)||data.objects.length!==artifact.items||data.objects.length<1||data.objects.length>25||sha(data.index_sha256+':'+data.offset+':'+data.next_offset)!==data.batch_ref||data.next_offset!==data.offset+data.objects.length)throw Error('FACT001_PLAN_SCOPE_DENIED');
 return data;
}
async function getJSON(url,token,http){
 let response;try{response=await http(url,{method:'GET',headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)})}catch{throw Error('FACT001_NOTION_NETWORK_ERROR')}
 if(response?.status!==200)throw Error('FACT001_NOTION_HTTP_'+response?.status);
 let body;try{body=await response.json()}catch{throw Error('FACT001_NOTION_JSON_ERROR')}
 return body;
}
/** Export a single complete page from a signed 25-item batch, with no provider writes. */
export async function exportSealedNotionPage({planArtifact,encryptionKey,notionToken,itemIndex=0,http=fetch,maxRequests=60,maxBytes=5000000}={}){
 if(typeof notionToken!=='string'||notionToken.length<24||notionToken.length>8192||/\s/.test(notionToken))throw Error('FACT001_TOKEN_DENIED');
 if(!Number.isSafeInteger(itemIndex)||itemIndex<0||!Number.isSafeInteger(maxRequests)||maxRequests<2||maxRequests>120||!Number.isSafeInteger(maxBytes)||maxBytes<1000||maxBytes>6000000)throw Error('FACT001_LIMITS_DENIED');
 const key=await keyFor(encryptionKey),plan=await openPlan(planArtifact,key);
 const object=plan.objects[itemIndex];if(!object||object.object!=='page'||!UUID.test(object.id))throw Error('FACT001_NOT_PAGE');
 const root=object.id;let requests=0,media=0;
 const page=await getJSON('https://api.notion.com/v1/pages/'+root,notionToken,http);requests++;
 if(page?.object!=='page'||page.id!==root||page.archived===true||page.in_trash===true)throw Error('FACT001_PAGE_MISMATCH');
 // BFS, including every cursor and every nested child. Never mark partial trees complete.
 const tasks=[{id:root,depth:0,cursor:null}],seen=new Set(),queued=new Set([root]),chunks=[];
 while(tasks.length){
  if(requests>=maxRequests)throw Error('FACT001_INCOMPLETE_REQUEST_LIMIT');
  const t=tasks.shift(),cursorKey=t.id+'|'+(t.cursor??'');
  if(seen.has(cursorKey))throw Error('FACT001_CURSOR_CYCLE');seen.add(cursorKey);
  const u='https://api.notion.com/v1/blocks/'+t.id+'/children?page_size=100'+(t.cursor?'&start_cursor='+encodeURIComponent(t.cursor):'');
  const body=await getJSON(u,notionToken,http);requests++;
  if(!Array.isArray(body?.results)||body.results.length>100||typeof body.has_more!=='boolean'||body.has_more&&(!body.next_cursor||typeof body.next_cursor!=='string'))throw Error('FACT001_BLOCK_RESPONSE_DENIED');
  for(const b of body.results){
   if(b?.object!=='block'||!UUID.test(b.id)||typeof b.type!=='string'||typeof b.has_children!=='boolean')throw Error('FACT001_BAD_BLOCK');
   if(['file','pdf','image','video','audio'].includes(b.type))media++;
   if(b.has_children){if(queued.has(b.id))throw Error('FACT001_CHILD_CYCLE');queued.add(b.id);tasks.push({id:b.id,depth:t.depth+1,cursor:null});}
  }
  chunks.push({parent_id:t.id,cursor:t.cursor,depth:t.depth,results:body.results});
  if(body.has_more)tasks.unshift({id:t.id,cursor:body.next_cursor,depth:t.depth});
  const tentative=Buffer.byteLength(JSON.stringify({page,chunks}),'utf8');if(tentative>maxBytes)throw Error('FACT001_INCOMPLETE_SIZE_LIMIT');
 }
 const data={format:OUTPUT,scope:plan.scope,index_sha256:plan.index_sha256,batch_ref:plan.batch_ref,item_index:itemIndex,global_offset:plan.offset+itemIndex,page,blocks:chunks,api_requests:requests,media_references:media,media_binaries_backed_up:false,comments_backed_up:false,complete_block_tree:true};
 const plaintext=te.encode(JSON.stringify(data));if(plaintext.byteLength>maxBytes)throw Error('FACT001_INCOMPLETE_SIZE_LIMIT');
 const iv=cr.getRandomValues(new Uint8Array(12));const ciphertext=await cr.subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode(OUTPUT)},key,plaintext);
 return {status:'FACT001_NOTION_PAGE_CONTENT_SEALED',batch_ref:plan.batch_ref,index_sha256:plan.index_sha256,item_index:itemIndex,global_offset:plan.offset+itemIndex,page_count:1,block_count:chunks.reduce((n,c)=>n+c.results.length,0),requests,media_references:media,media_binaries_backed_up:false,comments_backed_up:false,complete_block_tree:true,provider_writes:0,checkpoint_committed:false,plaintext_sha256:sha(plaintext),plaintext_bytes:plaintext.byteLength,envelope:{format:OUTPUT,nonce_b64:asB64(iv),ciphertext_b64:asB64(new Uint8Array(ciphertext))}};
}
export async function verifySealedNotionPage({artifact,encryptionKey,planArtifact}={}){
 const key=await keyFor(encryptionKey),plan=await openPlan(planArtifact,key);
 if(artifact?.status!=='FACT001_NOTION_PAGE_CONTENT_SEALED'||artifact.envelope?.format!==OUTPUT||artifact.batch_ref!==plan.batch_ref||artifact.index_sha256!==plan.index_sha256||!Number.isSafeInteger(artifact.item_index)||artifact.item_index<0||artifact.item_index>=plan.objects.length||!HEX.test(artifact.plaintext_sha256||''))throw Error('FACT001_PAGE_ARTIFACT_DENIED');
 const iv=fromB64(artifact.envelope.nonce_b64),cipher=fromB64(artifact.envelope.ciphertext_b64);
 if(iv.length!==12||cipher.length<17||cipher.length>6500000)throw Error('FACT001_PAGE_CIPHER_DENIED');
 let clear;try{clear=new Uint8Array(await cr.subtle.decrypt({name:'AES-GCM',iv,additionalData:te.encode(OUTPUT)},key,cipher))}catch{throw Error('FACT001_PAGE_AUTH_DENIED')}
 if(sha(clear)!==artifact.plaintext_sha256||clear.length!==artifact.plaintext_bytes)throw Error('FACT001_PAGE_INTEGRITY_DENIED');
 let data;try{data=JSON.parse(td.decode(clear))}catch{throw Error('FACT001_PAGE_JSON_DENIED')}
 if(data.format!==OUTPUT||data.scope?.environment!=='LAB'||data.scope?.company_id!=='fenix-capital'||data.scope?.engine_id!=='FACT-001'||data.batch_ref!==plan.batch_ref||data.index_sha256!==plan.index_sha256||data.item_index!==artifact.item_index||data.global_offset!==plan.offset+artifact.item_index||data.page?.id!==plan.objects[artifact.item_index]?.id||data.complete_block_tree!==true||!Array.isArray(data.blocks)||data.blocks.reduce((n,c)=>n+c.results.length,0)!==artifact.block_count)throw Error('FACT001_PAGE_CONTENT_SCOPE_DENIED');
 return {status:'FACT001_NOTION_PAGE_CONTENT_MEMORY_REBUILT',batch_ref:plan.batch_ref,item_index:artifact.item_index,block_count:artifact.block_count,plaintext_sha256:artifact.plaintext_sha256,provider_writes:0,checkpoint_committed:false,physical_restore:false};
}