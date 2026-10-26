import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { UMS_OWNED_ASSETS_RENDERER_CONTRACT } from '../runtime/premium-owned-assets-renderer.mjs';
import { UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT } from '../runtime/ums-production-job-runner-v1.mjs';

const orderPath=new URL('../orders/bm13-fenix-premium-trial-v1.json',import.meta.url);

test('premium UMS route is PREPROD-only and cannot fall back to legacy renderer',()=>{
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.engine_id,'UMS-001');
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.environment,'PREPROD');
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.legacy_programmatic_renderer_allowed,false);
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.additional_cost_eur,0);
  assert.equal(UMS_OWNED_ASSETS_RENDERER_CONTRACT.publish_authorized,false);
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.terminal_before_owner_review,'HOLD');
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.stage,'CREATIVE_REVIEW_REQUIRED');
});

test('first production order is a real governed UMS order with owned human assets',async()=>{
  const order=JSON.parse(await fs.readFile(orderPath,'utf8'));
  assert.equal(order.kind,'cerebro.ums.production_order.v1');
  assert.equal(order.company_id,'fenix');
  assert.equal(order.engine_id,'UMS-001');
  assert.equal(order.environment,'PREPROD');
  assert.equal(order.quality_profile,'PREMIUM_SOCIAL');
  assert.equal(order.expected_cost_eur,0);
  assert.equal(order.publish_requested,false);
  assert.equal(order.creative_payload.legacy_programmatic_renderer_allowed,false);
  assert.ok(order.creative_payload.assets.length>=4);
  for(const asset of order.creative_payload.assets){
    const url=new URL(asset.url);
    assert.equal(url.protocol,'https:');
    assert.ok(['fenixcapital.es','www.fenixcapital.es','staging.fenixcapital.es'].includes(url.hostname));
    assert.ok(['character_or_human','photoreal_or_live_scene'].includes(asset.asset_class));
  }
});

test('production runner preserves human-by-exception creative review',()=>{
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.stage,'CREATIVE_REVIEW_REQUIRED');
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.publish_authorized,false);
  assert.equal(UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT.additional_cost_eur,0);
});
