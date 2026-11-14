import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {evaluateSeoCloudDraftReceipt,buildSeoTrainingFeedback,reviewOneShotArtifactFolder} from '../runtime/seo-d32-cloud-editorial-result-router-v0.mjs';
const h=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const head={company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
 wordpress_writes:0,can_publish:false,request_count:1};
const first=fs.readFileSync('cerebro/seo-enterprise/v2/training-pilots/SEO_D13_GEMINI_35_FREE_REAL_LAB_003_UNAPPROVED.html','utf8');
const clean=fs.readFileSync('cerebro/seo-enterprise/v2/drafts/2026-11-06-b2c-comparar-pisos-cordoba-v3-faq.draft.html','utf8');

test('provider outage 503 is not misclassified as copy failure and never retried',()=>{
 for(const [http,expected] of [[503,'PROVIDER_TRANSIENT_UNAVAILABLE'],[429,'PROVIDER_RATE_LIMIT'],
  [404,'PROVIDER_MODEL_NOT_FOUND'],[403,'PROVIDER_IAM_ACCESS_DENIED']]){
  const e=evaluateSeoCloudDraftReceipt({receipt:{...head,status:'HOLD',
   reason:'PROVIDER_HTTP_REJECTED',http_status:http}});
  assert.equal(e.code,expected);
  assert.equal(e.model_response_received,false);
  assert.equal(e.current_copy_quality,'NOT_EVALUABLE_NO_NEW_CANDIDATE');
  assert.equal(e.model_calls_next,0);
  assert.equal(e.automatic_retry,false);
  assert.equal(e.wordpress_writes,0);
  assert.equal(e.can_publish,false);
 }
});
test('actual preserved Gemini Free first output is rejected by D31 with grounded evidence',()=>{
 const receipt={...head,status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',work_id:'SEO001-FENIX-D13-REAL-FREE-LAB-003',
  source_sha256:'0306e2e5c126e6e34e8673dc7432188930f41406fce09ff4efb6d3c147e93a1c'};
 assert.equal(h(first),receipt.source_sha256);
 const e=evaluateSeoCloudDraftReceipt({receipt,candidate_html:first});
 assert.equal(e.code,'EDITORIAL_REWRITE_REQUIRED');
 assert.equal(e.faq_count,6);
 assert.equal(e.human_voice_precheck_passed,false);
 assert.ok(e.copy_issues.includes('VOICE_HEADING_UNNATURAL_KEYWORD_SEQUENCE'));
 assert.ok(e.copy_issues.includes('VOICE_CANNED_MARKETING_PHRASE'));
 assert.ok(e.copy_issues.includes('DEPTH_TOTAL_WORDS_BELOW_MINIMUM'));
 assert.ok(e.copy_issues.includes('DEPTH_MAIN_WORDS_BELOW_MINIMUM'));
 assert.equal(e.depth_precheck_passed,false);
 const training=buildSeoTrainingFeedback({evaluation:e});
 assert.equal(training.next_inference_call_authorized,false);
 assert.equal(training.training_handoff,'PROMPT_AND_TEST_REGRESSION_NO_OWN_MODEL_TRAINING_CLAIM');
 assert.equal(training.semantic_expert_approval_authorized,false);
});
test('old V3 owner copy preserved but now fails new depth release gate',()=>{
 const receipt={...head,status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',work_id:'SEO001-FENIX-B2C-EDITORIAL-001',source_sha256:h(clean)};
 const e=evaluateSeoCloudDraftReceipt({receipt,candidate_html:clean});
 assert.equal(e.code,'EDITORIAL_REWRITE_REQUIRED',JSON.stringify(e.copy_issues));
 assert.ok(e.copy_issues.includes('DEPTH_TOTAL_WORDS_BELOW_MINIMUM'));
 assert.equal(e.depth_precheck_passed,false);
 assert.equal(e.required_total_words,1000);
 assert.equal(e.faq_count,6);
 assert.equal(e.buyer_persona_expert_quality_verified,false);
 assert.equal(e.independent_expert_review_verified,false);
 assert.equal(e.owner_exact_content_approved,false);
 assert.equal(e.can_publish,false);
});
test('hash drift, active content, cross-company and excessive retries denied',()=>{
 const wrong=evaluateSeoCloudDraftReceipt({receipt:{...head,status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',source_sha256:'0'.repeat(64)},candidate_html:clean});
 assert.equal(wrong.code,'CONTENT_DIGEST_MISMATCH');
 const bad=evaluateSeoCloudDraftReceipt({receipt:{...head,status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',source_sha256:h(clean+'<script>bad</script>')},candidate_html:clean+'<script>bad</script>'});
 assert.equal(bad.code,'ACTIVE_CONTENT_REJECTED');
 assert.throws(()=>evaluateSeoCloudDraftReceipt({receipt:{...head,status:'HOLD',company_id:'other'}}));
 assert.throws(()=>evaluateSeoCloudDraftReceipt({receipt:{...head,status:'HOLD',request_count:2}}));
});
test('physical provider failure receipt can be processed without model calls or external writes',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'seo-d32-'));
 try{
  fs.writeFileSync(path.join(folder,'receipt.json'),JSON.stringify({
   ...head,status:'HOLD',reason:'PROVIDER_HTTP_REJECTED',http_status:503
  }));
  const out=reviewOneShotArtifactFolder({dir:folder});
  assert.equal(out.evaluation.code,'PROVIDER_TRANSIENT_UNAVAILABLE');
  assert.equal(out.additional_api_calls,0);
  assert.equal(out.artifact_directory_created,false);
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
});
