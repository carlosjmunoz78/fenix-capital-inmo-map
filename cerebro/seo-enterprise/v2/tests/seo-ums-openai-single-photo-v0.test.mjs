import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildOriginalSeoPhotoPrompt,attemptOneOpenAIPhoto} from '../runtime/seo-ums-openai-single-photo-v0.mjs';
const api_key='fake-token-used-in-synthetic-offline-test-only';
const bytes=Buffer.alloc(800,0);bytes.write('RIFF',0);bytes.write('WEBP',8);
test('original buyer photo prompt comes from registered Fénix persona and V4.2 source hash',()=>{
 const b=buildOriginalSeoPhotoPrompt();
 assert.equal(b.model,'gpt-image-2');
 assert.equal(b.size,'1536x1024');
 assert.equal(b.quality,'medium');
 assert.equal(b.photo_count,1);
 assert.equal(b.max_estimated_usd,0.1);
 assert.equal(b.photo_count,1);
 assert.equal(b.paid_fallback_authorized,false);
 assert.ok(b.published_image_output_estimate_usd<b.max_estimated_usd);
 assert.equal(b.source_content_sha256,'96b340eba8d97d56fd9e2ce9644df9d2b8855759301180fbf0351630e351d88d');
 assert.match(b.prompt,/NO text, letters, words/);
 assert.equal(b.publish_authorized,false);
});
test('absence of explicit owner gate makes zero provider requests, even when key exists',async()=>{
 let calls=0;
 const x=await attemptOneOpenAIPhoto({api_key,owner_one_paid_test_authorized:false,
  fetch_impl:()=>{calls++;throw Error('unexpected')}});
 assert.equal(x.status,'HOLD_EXPLICIT_ONE_IMAGE_OWNER_GATE_NOT_SET');
 assert.equal(x.request_count,0);
 assert.equal(calls,0);
});
test('absence of API key makes zero requests even when owner has authorized one image',async()=>{
 let calls=0;
 const x=await attemptOneOpenAIPhoto({api_key:null,owner_one_paid_test_authorized:true,
  fetch_impl:()=>{calls++;throw Error('unexpected')}});
 assert.equal(x.status,'HOLD_IMAGE_API_SECRET_NOT_AVAILABLE');
 assert.equal(calls,0);
});
test('mocked response gives one physical image and auditable content SHA; no production rights',async()=>{
 let calls=0;
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'seo-photo-canary-mock-'));
 try{
  const out=path.join(parent,'out');
  const result=await attemptOneOpenAIPhoto({
   api_key,owner_one_paid_test_authorized:true,output_dir:out,
   fetch_impl:async(url,args)=>{
    calls++;
    assert.equal(url,'https://api.openai.com/v1/images/generations');
    const body=JSON.parse(args.body);
    assert.equal(body.n,1);assert.equal(body.model,'gpt-image-2');
    assert.equal(body.quality,'medium');assert.equal(body.size,'1536x1024');
    assert.equal(body.output_format,'webp');
    assert.equal(args.redirect,'error');
    return {ok:true,status:200,headers:{get:()=>null},
     json:async()=>({data:[{b64_json:bytes.toString('base64')}]})};
   }
  });
  assert.equal(calls,1);
  assert.equal(result.request_count,1);
  assert.equal(result.file_bytes,bytes.length);
  const receipt=JSON.parse(fs.readFileSync(path.join(out,'api-image-receipt.json'),'utf8'));
  assert.equal(receipt.status,'ONE_REAL_PROVIDER_IMAGE_RECEIVED_VISUAL_RIGHTS_QA_HOLD');
  assert.equal(receipt.wordpress_media_uploaded,false);
  assert.equal(receipt.publish_authorized,false);
  assert.equal(receipt.actual_billed_cost_verified,false);
  assert.equal(receipt.auto_retries,0);
  assert.equal(receipt.max_request_count,1);
  assert.equal(receipt.wordpress_writes,0);
  assert.ok(fs.readFileSync(path.join(out,'single-original-provider.webp')).equals(bytes));
  assert.throws(()=>fs.mkdirSync(out,{recursive:false}),/EEXIST/);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
test('all provider failures stop after one attempt with no fallback or retry',async()=>{
 for(const code of [400,401,429,500,503]){
  let calls=0;
  const out=path.join(os.tmpdir(),'seo-openai-failure-never-created-'+code);
  const result=await attemptOneOpenAIPhoto({
   api_key,owner_one_paid_test_authorized:true,output_dir:out,
   fetch_impl:async()=>{calls++;return{ok:false,status:code}}
  });
  assert.equal(calls,1);
  assert.equal(result.provider_http,code);
  assert.equal(result.status,'PROVIDER_HTTP_FAIL_NO_RETRY');
  assert.equal(result.wordpress_writes,0);
 }
});
test('request path cannot leave ephemeral filesystem and no paid request is made when output invalid',async()=>{
 let calls=0;
 await assert.rejects(attemptOneOpenAIPhoto({
  api_key,owner_one_paid_test_authorized:true,output_dir:'/etc/openai-photo-untrusted',
  fetch_impl:async()=>{calls++}
 }),/OUTPUT_NOT_ISOLATED/);
 assert.equal(calls,0);
});
