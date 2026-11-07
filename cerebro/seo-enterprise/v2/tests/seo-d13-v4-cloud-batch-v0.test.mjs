import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateSeoV4Brief,buildSeoV4OwnerPrompt} from '../runtime/seo-d13-free-project-one-shot-canary-v0.mjs';
import {readSeoV4Briefs,executeSeoV4FreeBatch,persistSeoV4BatchReview} from '../runtime/seo-d13-v4-cloud-batch-v0.mjs';
const b2c=fs.readFileSync('cerebro/seo-enterprise/v2/drafts/2026-11-06-b2c-comparar-pisos-cordoba-v3-faq.draft.html','utf8');
const b2b=fs.readFileSync('cerebro/seo-enterprise/v2/drafts/2026-11-06-b2b-derivacion-comprador-cordoba-v3-faq.draft.html','utf8');
const fakeKey='a-synthetic-test-key-never-use-for-google';
const sample=(html,ids)=>({ok:true,status:200,json:async()=>({
 candidates:[{content:{parts:[{text:JSON.stringify({html,used_source_ids:ids})}]}}],
 usageMetadata:{promptTokenCount:210,candidatesTokenCount:820,totalTokenCount:1030}
})});

test('two company-scoped V4 briefs reuse publicly verifiable WP sources and buyer distinction',()=>{
 const a=readSeoV4Briefs();
 assert.equal(a.length,2);
 assert.equal(a[0].persona,'PARTICULARES');
 assert.equal(a[1].persona,'INMOBILIARIAS');
 for(const b of a){
  assert.equal(validateSeoV4Brief(b),b);
  const prompt=buildSeoV4OwnerPrompt(b);
  assert.match(prompt,/mínimo 1150 palabras/);
  assert.match(prompt,/mínimo 950 fuera de FAQ/);
  assert.match(prompt,/EXACTAMENTE SEIS H2 de contenido principal/);
  assert.match(prompt,/NO numerados/);
  assert.match(prompt,/NO numerados/);
  assert.match(prompt,/used_source_ids/);
  assert.equal(b.publish_authorized,false);
  assert.equal(b.wordpress_write_authorized,false);
  assert.equal(b.customer_data_present,false);
  assert.equal(b.paid_provider_requested,false);
 }
 assert.match(buildSeoV4OwnerPrompt(a[0]),/NO incluir la plusvalía municipal entre los gastos ordinarios/);
 assert.match(buildSeoV4OwnerPrompt(a[1]),/NO afirmar que todos los clientes deban firmar/);
 assert.throws(()=>validateSeoV4Brief({...a[0],company_id:'company_other'}));
 assert.throws(()=>validateSeoV4Brief({...a[0],sources:[]}));
 assert.throws(()=>validateSeoV4Brief({...a[1],persona:'PARTICULARES'}));
});

test('real D13 canary function reused for both mocked copies, D32 blocks short content and images',async()=>{
 const briefs=readSeoV4Briefs();
 let count=0;
 const fetch_impl=async(url,opts)=>{
  count++;
  assert.match(url,/gemini-3.5-flash-lite:generateContent$/);
  assert.equal(opts.method,'POST');
  assert.equal(opts.redirect,'error');
  assert.equal(opts.headers['x-goog-api-key'],fakeKey);
  const prompt=JSON.parse(opts.body).contents[0].parts[0].text;
  assert.match(prompt,/SEO-D13/);
  assert.match(prompt,/mínimo 1150 palabras/);
  const b=briefs[count-1];
  return sample(count===1?b2c:b2b,b.sources.map(s=>s.id));
 };
 const result=await executeSeoV4FreeBatch({api_key:fakeKey,fetch_impl,simulation:true});
 assert.equal(count,2);assert.equal(result.provider_call_count,2);
 assert.equal(result.items.length,2);assert.equal(result.auto_retry_count,0);
 for(const item of result.items){
  assert.equal(item.status,'REAL_CLOUD_DRAFT_STYLE_HOLD');
  assert.equal(item.candidate_handoff.d32.code,'EDITORIAL_REWRITE_REQUIRED');
  assert.equal(item.candidate_handoff.depth_passed,false);
  assert.equal(item.candidate_handoff.image_order,null);
  assert.equal(item.candidate_handoff.wordpress_dry_run_plan,null);
  assert.equal(item.candidate_handoff.publish_authorized,false);
 }
 assert.equal(result.paid_api_calls,0);
 assert.equal(result.wordpress_writes,0);
 assert.equal(result.authorized_for_prod,false);
});

test('Google outage 503 causes one request max and never triggers B2B or paid provider',async()=>{
 let count=0;
 const result=await executeSeoV4FreeBatch({api_key:fakeKey,
  fetch_impl:async()=>{count++;return{ok:false,status:503}},
  simulation:true
 });
 assert.equal(count,1);
 assert.equal(result.provider_call_count,1);
 assert.equal(result.items[0].reason,'PROVIDER_HTTP_REJECTED');
 assert.equal(result.items[0].http_status,503);
 assert.equal(result.items[1].status,'SKIPPED_PROVIDER_BLOCK');
 assert.equal(result.items[1].request_count,0);
 assert.equal(result.auto_retry_count,0);
 assert.equal(result.paid_api_calls,0);
 assert.equal(result.wordpress_writes,0);
});

test('unavailable secret fails closed without requests, no implied autonomous operation',async()=>{
 let count=0;
 const result=await executeSeoV4FreeBatch({api_key:null,
  fetch_impl:async()=>{count++},simulation:true});
 assert.equal(count,0);
 assert.equal(result.provider_call_count,0);
 assert.equal(result.items[0].reason,'FREE_SECRET_NOT_AVAILABLE');
 assert.equal(result.items[1].status,'SKIPPED_PROVIDER_BLOCK');
 assert.equal(result.automatic_scheduler_enabled,false);
});

test('physical evidence remains in temporary runner directory with no CMS/write authority',async()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v4-batch-test-'));
 try{
  const batch=await executeSeoV4FreeBatch({api_key:fakeKey,
   fetch_impl:async()=>({ok:false,status:503}),simulation:true});
  const target=path.join(parent,'evidence');
  const r=persistSeoV4BatchReview({batch,output_dir:target});
  assert.equal(r.files.length,3);
  assert.equal(r.wordpress_writes,0);
  assert.equal(r.model_calls,1);
  const manifest=JSON.parse(fs.readFileSync(path.join(target,'manifest.json'),'utf8'));
  assert.equal(manifest.items.length,2);
  assert.equal(manifest.paid_api_calls,0);
  assert.equal(manifest.publish_authorized,false);
  assert.throws(()=>persistSeoV4BatchReview({batch,output_dir:target}),/OUTPUT_ALREADY_EXISTS/);
  assert.throws(()=>persistSeoV4BatchReview({batch,output_dir:'/etc/seo-v4-unsafe'}),/OUTPUT_OUTSIDE_TEMP/);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
