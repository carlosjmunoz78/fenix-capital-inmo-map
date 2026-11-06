import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildOneShotPrompt,validateOneShotFreePermit,runOneShotFreeCanary,storeOneShotEvidence} from '../runtime/seo-d13-free-project-one-shot-canary-v0.mjs';

const fixture=fs.readFileSync('cerebro/seo-enterprise/v2/drafts/2026-11-06-b2c-comparar-pisos-cordoba-v3-faq.draft.html','utf8');
test('one shot binds owner-verified Free project, excludes paid key, no automatic billing change',()=>{
 const p=validateOneShotFreePermit();
 assert.equal(p.status,'FREE_PROJECT_MANUAL_ONE_SHOT_PERMIT');
 assert.equal(p.project,'CEREBRO-GEMINI-FREE');
 assert.equal(p.max_requests,1);assert.equal(p.max_retries,0);
 assert.equal(p.runtime_billing_automatically_proven,false);
 assert.match(buildOneShotPrompt(),/EXACTAMENTE seis/);
 assert.match(buildOneShotPrompt(),/sin las expresiones además ni en conclusión/i);
});
test('wrong key symbol, absent secret, or unverified project fail closed with zero network',async()=>{
 let calls=0;
 const fake=async()=>{calls++;throw Error('NETWORK REQUEST NOT EXPECTED')};
 const bad=await runOneShotFreeCanary({api_key:'fake-long-secret-for-testing',
  expected_secret_name:'CEREBRO_GEMINI_API_KEY',fetch_impl:fake});
 assert.equal(bad.reason,'PAID_OR_WRONG_SECRET_DENIED');
 const none=await runOneShotFreeCanary({api_key:null,fetch_impl:fake});
 assert.equal(none.reason,'FREE_SECRET_NOT_AVAILABLE');
 const notFree=await runOneShotFreeCanary({api_key:'fake-long-secret-for-testing',
  owner_verified_free_project:false,fetch_impl:fake});
 assert.equal(notFree.reason,'FREE_PROJECT_OWNER_UI_UNVERIFIED');
 const policy=await runOneShotFreeCanary({policy_only:true,fetch_impl:fake});
 assert.equal(policy.status,'ONE_SHOT_POLICY_CHECK_PASS');
 assert.equal(calls,0);
});
test('mocked response exercises identical security QA without pretending live inference',async()=>{
 let calls=0;
 const out=await runOneShotFreeCanary({
  api_key:'fake-free-project-key-for-tests-only',
  fetch_impl:async(url,args)=>{
   calls++;
   assert.match(url,/generativelanguage.googleapis.com\/v1beta\/models\/gemini-2.5-flash-lite:generateContent$/);
   assert.equal(args.method,'POST');assert.equal(args.redirect,'error');
   assert.ok(!url.includes('fake-free-project-key'));
   const body=JSON.parse(args.body);
   assert.equal(body.generationConfig.responseMimeType,'application/json');
   assert.equal(body.generationConfig.maxOutputTokens,3400);
   return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({
    html:fixture,used_source_ids:['fenix_gastos','fenix_contacto']
   })}]}}],usageMetadata:{promptTokenCount:150,candidatesTokenCount:600,totalTokenCount:750}})};
  }
 });
 assert.equal(calls,1);
 assert.equal(out.status,'REAL_CLOUD_DRAFT_REVIEW_ONLY');
 assert.equal(out.real_inference_attempted,true);
 assert.equal(out.request_count,1);assert.equal(out.retry_count,0);
 assert.equal(out.faq_count,6);assert.equal(out.wordpress_writes,0);
 assert.equal(out.can_publish,false);assert.equal(out.automatic_billing_monitor_installed,false);
 assert.equal(out.provider_usage.total_tokens,750);
 assert.equal(JSON.stringify(out).includes('fake-free-project-key'),false);
});
test('one invalid external response is HOLD and never retried',async()=>{
 let calls=0;
 const bad=await runOneShotFreeCanary({
  api_key:'fake-free-project-key-for-tests-only',
  fetch_impl:async()=>{calls++;return {ok:false,status:429}}
 });
 assert.equal(calls,1);assert.equal(bad.status,'HOLD');
 assert.equal(bad.http_status,429);assert.equal(bad.request_count,1);
 const down=await runOneShotFreeCanary({
  api_key:'fake-free-project-key-for-tests-only',
  fetch_impl:async()=>{throw Error('timeout')}
 });
 assert.equal(down.reason,'PROVIDER_NETWORK_FAILURE');
 assert.equal(down.can_publish,false);
});
test('physical receipt is review-only and constrained to temp, not repository or WordPress',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'seo-one-shot-test-'));
 try{
  const out=await runOneShotFreeCanary({
   api_key:'fake-free-project-key-for-tests-only',fetch_impl:async()=>({
    ok:false,status:429})
  });
  const dest=path.join(tmp,'lab');
  const saved=storeOneShotEvidence({out,output_dir:dest});
  assert.equal(saved.provider_calls,1);
  assert.equal(saved.wordpress_writes,0);
  const report=JSON.parse(fs.readFileSync(path.join(dest,'receipt.json'),'utf8'));
  assert.equal(report.published,false);
  assert.equal(report.status_name,'ONE_SHOT_LAB_ONLY_NO_AUTOMATIC_SCHEDULE');
  assert.throws(()=>storeOneShotEvidence({out,output_dir:dest}),/OUTPUT_ALREADY_EXISTS/);
  assert.throws(()=>storeOneShotEvidence({out,output_dir:'/etc/seo-one-shot-denied'}),/OUTPUT_OUTSIDE_TEMP_DENIED/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
