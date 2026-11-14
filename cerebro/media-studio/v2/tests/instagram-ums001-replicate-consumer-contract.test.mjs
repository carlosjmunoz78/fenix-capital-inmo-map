import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {planReplicateJob} from '../runtime/replicate-provider-lab-v0.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const policy=JSON.parse(readFileSync(path.join(here,'../registry/instagram-replicate-ums001-consumer-contract-20261108.v1.json'),'utf8'));
test('Instagram links only to existing UMS-001 Replicate runtime',()=>{
 assert.equal(policy.engine_id,'UMS-001');
 assert.equal(policy.consumer_engine_id,'SOC-IG-FINANCIAL-REAL-ESTATE-V1');
 assert.equal(policy.canonical_replicate_adapter,'cerebro/media-studio/v2/runtime/replicate-provider-lab-v0.mjs');
 assert.equal(policy.policy,'NO_SECOND_AUDIOVISUAL_PRODUCER_OR_PUBLISHER');
});
test('read-only Replicate credential probe authenticated with zero paid predictions',()=>{
 assert.equal(policy.verified_readonly_probe.account_get_http,200);
 assert.equal(policy.verified_readonly_probe.model_get_http,200);
 assert.equal(policy.verified_readonly_probe.prediction_calls,0);
});
test('40 euro TOTAL user cap is stricter than old split proposal',()=>{
 assert.equal(policy.budget.ongoing_monthly_limit_eur,40);
 assert.equal(policy.budget.combined_budget_images_eur+policy.budget.combined_budget_video_eur,40);
 assert.equal(policy.budget.existing_old_registry_envelopes_total_eur,60);
 assert.equal(policy.budget.atomic_finops_reservation_deployed,false);
 assert.equal(policy.budget.auto_reload_allowed,false);
});
test('cannot infer available balance or tenant binding from account authentication',()=>{
 assert.equal(policy.budget.current_live_balance_verified,false);
 assert.equal(policy.company_mapping_verified,false);
 assert.equal(policy.consumer_company_id,'fenix-capital');
 assert.equal(policy.company_id,'fenix');
});
test('Replicate image plan only and video plan only, no paid request',()=>{
 const img=planReplicateJob({company_id:'fenix',request_id:'ig-safe-0001',environment:'LAB',model_key:policy.models.IMAGE.model_key,
      input:{prompt:'Original Córdoba city atmosphere, no typography',aspect_ratio:'4:5'}});
 const video=planReplicateJob({company_id:'fenix',request_id:'ig-safe-0002',environment:'LAB',model_key:policy.models.REEL_VIDEO.model_key,
      input:{prompt:'Original Córdoba cinematic neutral housing video',duration:5,aspect_ratio:'9:16'}});
 assert.equal(img.kind,'IMAGE');assert.equal(video.kind,'VIDEO');
 assert.equal(img.status,'PLANNED_NO_PAID_EXECUTION');
 assert.equal(video.status,'PLANNED_NO_PAID_EXECUTION');
 assert.equal(video.input.duration,5);
});
test('release and publisher remain OFF until authenticated studio and verified output',()=>{
 assert.equal(policy.release.instagram_publish_enabled,false);
 assert.equal(policy.release.buffer_queue_changes_allowed,false);
 assert.equal(policy.release.credentials_shared_with_consumer,false);
 assert.equal(policy.trusted_pipeline.webhook_signature_verifier_deployed,false);
 assert.equal(policy.trusted_pipeline.private_media_storage_end_to_end_tested,false);
});
test('seven original editorial intentions and three Reels, not actual media',()=>{
 assert.equal(policy.known_production_job_request.planned_posts,7);
 assert.equal(policy.known_production_job_request.planned_reels,3);
 assert.equal(policy.known_production_job_request.planned_image_predictions,24);
 assert.equal(policy.known_production_job_request.planned_video_clip_predictions,6);
 assert.equal(policy.known_production_job_request.source_job_status,'PLAN_ONLY_NO_POST');
});
