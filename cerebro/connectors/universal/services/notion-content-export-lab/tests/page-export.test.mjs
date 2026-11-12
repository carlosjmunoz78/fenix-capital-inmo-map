import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {BATCH_REF,INDEX_SHA,exportFixedPage,verifyFixedPage,openFixedBatch} from '../page-export.mjs';
const key='a'.repeat(64),notionToken='CEREBRO_VALID_TEST_NOTION_TOKEN_123456789012345';
const pages=Array.from({length:25},(_,i)=>(i+100).toString(16).padStart(8,'0')+'-1111-4111-8111-111111111111');
const child='a0000123-1111-4111-8111-111111111111';
const FORM='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1';
const b64=x=>Buffer.from(x).toString('base64');
async function plan(){
 const clear={format:FORM,scope:{company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},index_sha256:INDEX_SHA,batch_ref:BATCH_REF,offset:0,next_offset:25,source_completed:true,objects:pages.map(id=>({object:'page',id}))};
 const k=await crypto.subtle.importKey('raw',Buffer.from(key,'hex'),'AES-GCM',false,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(FORM)},k,new TextEncoder().encode(JSON.stringify(clear)));
 return {status:'FACT001_NOTION_CONTENT_BATCH_SEALED',batch_ref:BATCH_REF,index_sha256:INDEX_SHA,offset:0,next_offset:25,items:25,pages:25,data_sources:0,envelope:{format:FORM,nonce_b64:b64(iv),ciphertext_b64:b64(ciphertext)}};
}
function mock({changed=false,bad=false,oversized=false}={}){
 let calls=0;
 const fetch=async(url,init)=>{
  calls++;assert.equal(init.method,'GET');assert.ok(!init.body);assert.ok(url.startsWith('https://api.notion.com/v1/'));
  let json;
  if(url===`https://api.notion.com/v1/pages/${pages[0]}`){json={object:'page',id:pages[0],last_edited_time:changed&&calls>1?'2026-11-12T00:00:00Z':'2026-11-10T00:00:00Z'};}
  else if(url===`https://api.notion.com/v1/blocks/${pages[0]}/children?page_size=100`) json={results:[{object:'block',id:child,type:'paragraph',has_children:true,paragraph:{rich_text:oversized?[{plain_text:'x'.repeat(14000)}]:[]}}],has_more:false};
  else if(url===`https://api.notion.com/v1/blocks/${child}/children?page_size=100`) json={results:[],has_more:false};
  else throw Error('Unexpected URL');
  return {status:bad?403:200,json:async()=>json};
 };
 return {http:fetch,count:()=>calls};
}
test('fixed batch authenticates exact scope, count and 25 pages',async()=>{const a=await plan();const x=await openFixedBatch({encryptionKey:key,planArtifact:a});assert.equal(x.objects.length,25);});
test('seals complete nested page and verifies AEAD roundtrip with no page ID disclosure',async()=>{const a=await plan(),m=mock();const b=await exportFixedPage({encryptionKey:key,notionToken,planArtifact:a,index:0,http:m.http,paceMs:0});assert.equal(b.block_count,1);assert.equal(b.api_requests,4);assert.equal(m.count(),4);assert.equal(b.provider_writes,0);assert.equal(b.checkpoint_committed,false);assert.ok(!JSON.stringify(b).includes(pages[0]));assert.equal((await verifyFixedPage({artifact:b,planArtifact:a,encryptionKey:key})).status,'PAGE_MEMORY_REBUILD_PASS')});
test('wrong key and wrong index fail before provider access',async()=>{const a=await plan(),m=mock();await assert.rejects(()=>exportFixedPage({planArtifact:a,encryptionKey:'c'.repeat(64),notionToken,index:0,http:m.http,paceMs:0}),/BATCH_AUTH_DENIED/);await assert.rejects(()=>exportFixedPage({planArtifact:a,encryptionKey:key,notionToken,index:25,http:m.http,paceMs:0}),/INPUT_DENIED/);assert.equal(m.count(),0);});
test('tampering with encrypted batch fails before provider access',async()=>{const a=await plan(),m=mock();const b=Buffer.from(a.envelope.ciphertext_b64,'base64');b[0]^=3;a.envelope.ciphertext_b64=b64(b);await assert.rejects(()=>exportFixedPage({planArtifact:a,encryptionKey:key,notionToken,index:0,http:m.http,paceMs:0}),/BATCH_AUTH_DENIED/);assert.equal(m.count(),0);});
test('change during traversal invalidates snapshot',async()=>{const a=await plan();await assert.rejects(()=>exportFixedPage({planArtifact:a,encryptionKey:key,notionToken,index:0,http:mock({changed:true}).http,paceMs:0}),/SOURCE_CHANGED_DURING_EXPORT/)});
test('upstream failure 403 does not expose secrets',async()=>{const a=await plan();await assert.rejects(()=>exportFixedPage({planArtifact:a,encryptionKey:key,notionToken,index:0,http:mock({bad:true}).http,paceMs:0}),/NOTION_AUTH/)});
test('size capped: do not seal partial page',async()=>{const a=await plan();await assert.rejects(()=>exportFixedPage({planArtifact:a,encryptionKey:key,notionToken,index:0,http:mock({oversized:true}).http,paceMs:0,maxBytes:10000}),/INCOMPLETE_SIZE_CAP/)});
test('request count capped: do not seal partial page',async()=>{const a=await plan();await assert.rejects(()=>exportFixedPage({planArtifact:a,encryptionKey:key,notionToken,index:0,http:mock().http,paceMs:0,maxRequests:2}),/INCOMPLETE_REQUEST_CAP/)});
test('wrong ciphertext cannot be memory restored',async()=>{const a=await plan(),b=await exportFixedPage({planArtifact:a,encryptionKey:key,notionToken,index:0,http:mock().http,paceMs:0});const ct=Buffer.from(b.envelope.ciphertext_b64,'base64');ct[0]^=3;b.envelope.ciphertext_b64=b64(ct);await assert.rejects(()=>verifyFixedPage({artifact:b,planArtifact:a,encryptionKey:key}),/PAGE_AUTH_DENIED/)});