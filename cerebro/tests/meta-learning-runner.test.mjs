import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMetaLearningReview} from '../runtime/meta-learning-runner.mjs';

function summary(samples=3){return {schema_version:'1.0.0',company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.8.0',samples_total:samples,stage_metrics:{collect:{mean_ms:10,p95_ms:12},learn:{mean_ms:45,p95_ms:55},evaluate:{mean_ms:20,p95_ms:25}},raw_customer_data_included:false,additional_cost_eur:0,prod_authorized:false,trading_access:false};}

test('MetaLearn stays MORE_EVIDENCE below minimum sample threshold',()=>{
  const review=buildMetaLearningReview({summary:summary(2),company_id:'fenix',version:'0.8.0',reviewed_at:'2026-10-08T15:00:00Z'});
  assert.equal(review.status,'MORE_EVIDENCE');assert.equal(review.candidate,null);assert.equal(review.prod_authorized,false);
});

test('MetaLearn creates hypothesis for measured bottleneck but cannot self-approve',()=>{
  const review=buildMetaLearningReview({summary:summary(3),company_id:'fenix',version:'0.8.0',reviewed_at:'2026-10-08T15:00:00Z'});
  assert.equal(review.status,'META_CANDIDATE_CREATED_HELD');assert.equal(review.bottleneck.stage,'learn');assert.equal(review.candidate.target_stage,'learn');assert.equal(review.candidate.proposed_change.claim_status,'HYPOTHESIS_ONLY');
  assert.equal(review.gate.ok,false);assert.ok(review.gate.reasons.includes('independent_evaluation_required'));assert.ok(review.gate.reasons.includes('independent_judge_required'));assert.equal(review.automatic_promotion,false);assert.equal(review.prod_authorized,false);assert.equal(review.trading_access,false);
});

test('MetaLearn rejects cross-company or expanded-authority summaries',()=>{
  assert.throws(()=>buildMetaLearningReview({summary:{...summary(),company_id:'other'},company_id:'fenix',version:'0.8.0',reviewed_at:'2026-10-08T15:00:00Z'}),/CONTEXT_MISMATCH/);
  assert.throws(()=>buildMetaLearningReview({summary:{...summary(),prod_authorized:true},company_id:'fenix',version:'0.8.0',reviewed_at:'2026-10-08T15:00:00Z'}),/AUTHORITY_EXPANDED/);
});
