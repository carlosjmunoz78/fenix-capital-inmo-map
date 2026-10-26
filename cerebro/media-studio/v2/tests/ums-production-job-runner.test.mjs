import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { UMS_OWNED_ASSETS_RENDERER_CONTRACT } from '../runtime/premium-owned-assets-renderer.mjs';
import { evaluatePremiumCreativePreflight } from '../runtime/premium-creative-preflight-gate.mjs';
import { UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT } from '../runtime/ums-production-job-runner-v1.mjs';

const orderPath=new URL('../orders/bm13-fenix-premium-trial-v1.json',import.meta.url);

test('UMS runner is PREPROD-only, zero-cost and fail-closed for premium',()=>{
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.engine_id,'UMS-001');
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.environment,'PREPROD');
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.legacy_programmatic_renderer_allowed,false);
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.additional_cost_eur,0);
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.publish_authorized,false);
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.premium_fail_closed,true);
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.premium_renderer_requirement,'PREMIUM_PHYSICAL_RENDERER_V2_BOUND_AND_TESTED');
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.publish_authorized,false);
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.additional_cost_eur,0);
});

test('rejected first owner trial is preserved as a governed negative regression',async()=>{
  const order=JSON.parse(await fs.readFile(orderPath,'utf8'));
  assert.equal(order.kind,'cerebro.ums.production_order.v1');
  assert.equal(order.company_id,'fenix');
  assert.equal(order.engine_id,'UMS-001');
  assert.equal(order.environment,'PREPROD');
  assert.equal(order.quality_profile,'PREMIUM_SOCIAL');
  assert.equal(order.expected_cost_eur,0);
  assert.equal(order.publish_requested,false);
  assert.equal(order.creative_payload.legacy_programmatic_renderer_allowed,false);
  const preflight=evaluatePremiumCreativePreflight(order);
  assert.equal(preflight.ok,false);
  assert.equal(preflight.status,'CREATIVE_REJECTED_PRE_FLIGHT');
  assert.ok(preflight.issues.includes('MUSIC_REQUIRED_FOR_PREMIUM'));
  assert.ok(preflight.issues.includes('SUBTITLES_REQUIRED'));
  assert.ok(preflight.issues.includes('CANARY_VOICE_FORBIDDEN_FOR_PREMIUM'));
  assert.ok(preflight.issues.includes('STILL_DERIVED_RUNTIME_EXCEEDS_40_PERCENT'));
});

test('canary owned-assets renderer is compatibility-only for future routing',()=>{
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.compatibility_renderer,'UMS_OWNED_ASSETS_CANARY_V1');
  assert.notEqual(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.compatibility_renderer,UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.premium_renderer_requirement);
});
