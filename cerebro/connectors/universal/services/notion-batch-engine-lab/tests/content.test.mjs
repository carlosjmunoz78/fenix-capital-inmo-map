import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
import {openBatch,exportObject,verifyObject,INDEX_SHA} from '../content.mjs';
import {createHash} from 'node:crypto';
const BATCH_REF=createHash('sha256').update(INDEX_SHA+':50:75').digest('hex');
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const key='a1'.repeat(32),pids=Array.from({length:25},(_,i)=>(i+1).toString(16).padStart(8,'0')+'-1234-4123-8123-123456789abc');
const rowid='ff000001-1234-4123-8123-123456789abc',nested='ff000002-1234-4123-8123-123456789abc';
const token='test-token-notion-1234567890';
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
async function fixture(){
 const form='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1';const objects=pids.map((id,i)=>({id,object:i===2?'data_source':'page'}));
 const payload={format:form,scope,index_sha256:INDEX_SHA,batch_ref:BATCH_REF,offset:50,next_offset:75,objects,source_completed:true};const iv=crypto.getRandomValues(new Uint8Array(12)),k=await crypto.subtle.importKey('raw',Buffer.from(key,'hex'),'AES-GCM',false,['encrypt']),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(form)},k,new TextEncoder().encode(JSON.stringify(payload)));
 return {status:'FACT001_NOTION_CONTENT_BATCH_SEALED',index_sha256:INDEX_SHA,batch_ref:BATCH_REF,offset:50,next_offset:75,items:25,pages:24,data_sources:1,content_downloaded:false,envelope:{format:form,nonce_b64:Buffer.from(iv).toString('base64'),ciphertext_b64:Buffer.from(ct).toString('base64')}};
}
const block=(id,children=false)=>({object:'block',id,type:'paragraph',has_children:children,paragraph:{rich_text:[]}});
const json=b=>({status:200,json:async()=>b});
function mock(url,options){
 assert.ok(url.startsWith('https://api.notion.com/v1/'));assert.ok(['GET','POST'].includes(options.method));
 const id=pids[2];
 if(url.endsWith('/pages/'+pids[0]))return Promise.resolve(json({object:'page',id:pids[0],last_edited_time:'stable'}));
 if(url.endsWith('/blocks/'+pids[0]+'/children?page_size=100'))return Promise.resolve(json({results:[block(nested)],has_more:false}));
 if(url.endsWith('/data_sources/'+id))return Promise.resolve(json({object:'data_source',id,last_edited_time:'stable'}));
 if(url.endsWith('/data_sources/'+id+'/query')){assert.equal(options.method,'POST');return Promise.resolve(json({results:[{object:'page',id:rowid,properties:{Name:{type:'title',title:[]}}}],has_more:false}));}
 if(url.endsWith('/blocks/'+rowid+'/children?page_size=100'))return Promise.resolve(json({results:[block(nested)],has_more:false}));
 throw Error('UNEXPECTED_REQUEST');
}
test('sealed plan verifies generalized 24 pages + 1 source with no ID disclosure',async()=>{const x=await fixture();const p=await openBatch({planArtifact:x,encryptionKey:key});assert.equal(p.objects.length,25);assert.equal(p.offset,50);assert.equal(p.objects.filter(o=>o.object==='data_source').length,1);await assert.rejects(openBatch({planArtifact:{...x,offset:0},encryptionKey:key}),/BATCH_OFFSET_DENIED|BATCH_DENIED/);});
test('single page descendants encrypted, memory rebuild and zero writes',async()=>{const f=await fixture();const a=await exportObject({planArtifact:f,encryptionKey:key,notionToken:token,index:0,http:mock,paceMs:0});assert.equal(a.block_count,1);assert.equal(a.kind,'page');assert.equal(a.provider_writes,0);assert.ok(!JSON.stringify(a).includes(pids[0]));const v=await verifyObject({planArtifact:f,encryptionKey:key,artifact:a});assert.equal(v.status,'FACT001_CONTENT_MEMORY_REBUILT');});
test('source metadata, row properties and row blocks fully sealed',async()=>{const f=await fixture();const a=await exportObject({planArtifact:f,encryptionKey:key,notionToken:token,index:2,http:mock,paceMs:0});assert.equal(a.kind,'data_source');assert.equal(a.row_count,1);assert.equal(a.block_count,1);assert.equal((await verifyObject({artifact:a,planArtifact:f,encryptionKey:key})).rows,1);assert.ok(!JSON.stringify(a).includes(rowid));});
test('reject changed page, bad key, out-of-scope index without emitting an archive',async()=>{const f=await fixture();let pageReads=0;const changed=async(url,opt)=>url.endsWith('/pages/'+pids[0])?json({object:'page',id:pids[0],last_edited_time:++pageReads===1?'stable':'changed'}):mock(url,opt);await assert.rejects(exportObject({planArtifact:f,encryptionKey:key,notionToken:token,index:0,http:changed,paceMs:0}),/SOURCE_CHANGED|PAGE_DENIED/);await assert.rejects(openBatch({planArtifact:f,encryptionKey:'bb'.repeat(32)}),/BATCH_AUTH_DENIED/);await assert.rejects(exportObject({planArtifact:f,encryptionKey:key,notionToken:token,index:25,http:mock,paceMs:0}),/INPUT_DENIED/);});
test('tamper AES ciphertext rejected and no provider writes',async()=>{const f=await fixture(),a=await exportObject({planArtifact:f,encryptionKey:key,notionToken:token,index:2,http:mock,paceMs:0});const b=Buffer.from(a.envelope.ciphertext_b64,'base64');b[0]^=1;a.envelope.ciphertext_b64=b.toString('base64');await assert.rejects(verifyObject({artifact:a,planArtifact:f,encryptionKey:key}),/AUTH_DENIED/);});