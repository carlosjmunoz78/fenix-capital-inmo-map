import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {exportSealedNotionPage,verifySealedNotionPage} from './notion-content-page-export.mjs';
const c=globalThis.crypto??webcrypto;
const key='a'.repeat(64),PAGE='12345678-1234-4123-8123-123456789abc',CHILD='22345678-1234-4123-8123-123456789abc';
const FORM='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1';
const sh=s=>createHash('sha256').update(s).digest('hex');
async function fixture(){const i='b'.repeat(64),ref=sh(i+':0:1'),payload={format:FORM,scope:{company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},index_sha256:i,batch_ref:ref,offset:0,next_offset:1,objects:[{object:'page',id:PAGE}]},iv=c.getRandomValues(new Uint8Array(12)),k=await c.subtle.importKey('raw',Buffer.from(key,'hex'),'AES-GCM',false,['encrypt']),ct=await c.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(FORM)},k,new TextEncoder().encode(JSON.stringify(payload)));return {status:'FACT001_NOTION_CONTENT_BATCH_SEALED',index_sha256:i,batch_ref:ref,offset:0,next_offset:1,items:1,envelope:{format:FORM,nonce_b64:Buffer.from(iv).toString('base64'),ciphertext_b64:Buffer.from(ct).toString('base64')}}}
const block=(id,has_children=false)=>({object:'block',id,type:'paragraph',has_children,paragraph:{rich_text:[]}});
function fakeHttp(url,init){assert.equal(init.method,'GET');assert.ok(!('body' in init));const suffix=url.split('https://api.notion.com/v1/')[1];let reply;if(suffix==='pages/'+PAGE)reply={object:'page',id:PAGE,archived:false};else if(suffix===`blocks/${PAGE}/children?page_size=100`)reply={results:[block(CHILD,true)],has_more:false};else if(suffix===`blocks/${CHILD}/children?page_size=100`)reply={results:[],has_more:false};else throw Error('unexpected URL');return Promise.resolve({status:200,json:async()=>reply});}
const token='secret-notion-token-not-real-long-enough';
test('seal nested page and verify without content/IDs exposed',async()=>{const planArtifact=await fixture(),sealed=await exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:fakeHttp});assert.equal(sealed.block_count,1);assert.equal(sealed.requests,3);assert.equal(sealed.complete_block_tree,true);assert.equal(sealed.checkpoint_committed,false);assert.equal(sealed.provider_writes,0);assert.ok(!JSON.stringify(sealed).includes(PAGE));const result=await verifySealedNotionPage({planArtifact,artifact:sealed,encryptionKey:key});assert.equal(result.status,'FACT001_NOTION_PAGE_CONTENT_MEMORY_REBUILT');});
test('fail closed when bounded requests insufficient, never checkpoint',async()=>{const planArtifact=await fixture();await assert.rejects(exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:fakeHttp,maxRequests:2}),/INCOMPLETE_REQUEST_LIMIT/);});
test('fail closed on mismatched key and invalid item index',async()=>{const planArtifact=await fixture();await assert.rejects(exportSealedNotionPage({planArtifact,encryptionKey:'c'.repeat(64),notionToken:token,http:fakeHttp}),/PLAN_AUTH_DENIED/);await assert.rejects(exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:fakeHttp,itemIndex:1}),/NOT_PAGE/);});
test('mutated ciphertext rejected by authenticated encryption',async()=>{const planArtifact=await fixture(),sealed=await exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:fakeHttp});const bytes=Buffer.from(sealed.envelope.ciphertext_b64,'base64');bytes[0]^=1;sealed.envelope.ciphertext_b64=bytes.toString('base64');await assert.rejects(verifySealedNotionPage({planArtifact,artifact:sealed,encryptionKey:key}),/PAGE_AUTH_DENIED/);});
test('reject upstream errors and foreign page identifiers',async()=>{const planArtifact=await fixture();await assert.rejects(exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:async()=>({status:403})}),/NOTION_HTTP_403/);await assert.rejects(exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:async()=>({status:200,json:async()=>({object:'page',id:CHILD})})}),/PAGE_MISMATCH/);});

test('cursor pagination and nested child are fully traversed before sealing',async()=>{
 const planArtifact=await fixture();const calls=[];
 const paged=async(url,init)=>{
  assert.equal(init.method,'GET');calls.push(url);
  if(url.endsWith('/pages/'+PAGE))return {status:200,json:async()=>({object:'page',id:PAGE,archived:false})};
  if(url.endsWith('/blocks/'+PAGE+'/children?page_size=100'))return {status:200,json:async()=>({results:[block(CHILD,true)],has_more:true,next_cursor:'next-1'})};
  if(url.endsWith('/blocks/'+PAGE+'/children?page_size=100&start_cursor=next-1'))return {status:200,json:async()=>({results:[block('32345678-1234-4123-8123-123456789abc')],has_more:false})};
  if(url.endsWith('/blocks/'+CHILD+'/children?page_size=100'))return {status:200,json:async()=>({results:[block('42345678-1234-4123-8123-123456789abc')],has_more:false})};
  throw Error('unexpected fetch');
 };
 const a=await exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:paged});
 assert.equal(a.requests,4);assert.equal(a.block_count,3);assert.equal(a.complete_block_tree,true);
 assert.equal(calls.length,4);assert.equal((await verifySealedNotionPage({planArtifact,artifact:a,encryptionKey:key})).block_count,3);
});

test('reject malformed pagination and size limit rather than outputting a partial archive',async()=>{
 const planArtifact=await fixture();
 const bad=async url=>url.endsWith('/pages/'+PAGE)?{status:200,json:async()=>({object:'page',id:PAGE})}:{status:200,json:async()=>({results:[],has_more:true})};
 await assert.rejects(exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:bad}),/BLOCK_RESPONSE_DENIED/);
 const huge=async url=>url.endsWith('/pages/'+PAGE)?{status:200,json:async()=>({object:'page',id:PAGE})}:{status:200,json:async()=>({results:[{...block(CHILD),paragraph:{rich_text:[{text:{content:'a'.repeat(2500)}}]}}],has_more:false})};
 await assert.rejects(exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:huge,maxBytes:1000}),/INCOMPLETE_SIZE_LIMIT/);
});

test('reject repeated cursor to prevent an infinite loop',async()=>{
 const planArtifact=await fixture();
 const loop=async url=>url.endsWith('/pages/'+PAGE)?{status:200,json:async()=>({object:'page',id:PAGE})}:{status:200,json:async()=>({results:[],has_more:true,next_cursor:'repeated'})};
 await assert.rejects(exportSealedNotionPage({planArtifact,encryptionKey:key,notionToken:token,http:loop}),/CURSOR_CYCLE/);
});