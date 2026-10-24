import test from 'node:test';
import assert from 'node:assert/strict';
import { listSharedCreativeCapabilities, routeCreativeTask } from './shared-creative-router-v1.mjs';

const base = {
  company_id: 'fenix',
  target_company_id: 'fenix',
  environment: 'PREPROD',
  asset_ref: 'asset:test',
  confidence: 1
};

test('catalog is shared across authorised registered engines', () => {
  const out = listSharedCreativeCapabilities({ company_id: 'fenix', environment: 'PREPROD' });
  assert.equal(out.allowed, true);
  assert.equal(out.consumer_policy, 'ANY_REGISTERED_ENGINE_WITH_COMPANY_ENVIRONMENT_PERMISSION');
  assert.ok(out.capabilities.CANVA_DESIGN.includes('SEO_INFOGRAPHIC'));
  assert.ok(out.capabilities.MULTIMEDIA_FACTORY.includes('VIDEO_EDITING'));
  assert.equal(out.external_publication_authorized, false);
});

test('SEO can request Canva infographic without gaining publish authority', () => {
  const out = routeCreativeTask({
    ...base,
    request_id: 'req:seo:1',
    requester_engine_id: 'SEO-001',
    creative_task_type: 'SEO_INFOGRAPHIC'
  });
  assert.equal(out.allowed, true);
  assert.equal(out.selected_route, 'CANVA_REMOTE_MCP');
  assert.equal(out.requester_engine_id, 'SEO-001');
  assert.equal(out.external_publication_authorized, false);
  assert.equal(out.provider_state, 'PENDING_INITIAL_CANVA_OAUTH');
});

test('social can request video generation through shared multimedia factory', () => {
  const out = routeCreativeTask({
    ...base,
    request_id: 'req:social:1',
    requester_engine_id: 'SOC-001',
    creative_task_type: 'VIDEO_GENERATION'
  });
  assert.equal(out.allowed, true);
  assert.equal(out.selected_route, 'DIGITAL-BUILD-MULTIMEDIA');
  assert.equal(out.requester_engine_id, 'SOC-001');
  assert.equal(out.adapter, 'HYPERFRAMES');
  assert.equal(out.external_publication_authorized, false);
});

test('web/app consumer can request deterministic media composition', () => {
  const out = routeCreativeTask({
    ...base,
    request_id: 'req:web:1',
    requester_engine_id: 'WEB-001',
    creative_task_type: 'MEDIA_COMPOSITION'
  });
  assert.equal(out.allowed, true);
  assert.equal(out.adapter, 'FFMPEG');
  assert.equal(out.additional_cost_eur, 0);
});

test('cross-company creative request is denied', () => {
  const out = routeCreativeTask({
    ...base,
    target_company_id: 'other-company',
    request_id: 'req:cross:1',
    requester_engine_id: 'SEO-001',
    creative_task_type: 'SEO_INFOGRAPHIC'
  });
  assert.equal(out.allowed, false);
  assert.equal(out.code, 'COMPANY_SCOPE_MISMATCH');
  assert.equal(out.human_required_reason, 'SECURITY_INCIDENT');
});

test('creative generation never grants publication authority', () => {
  const out = routeCreativeTask({
    ...base,
    request_id: 'req:publish:1',
    requester_engine_id: 'SOC-001',
    creative_task_type: 'SOCIAL_POST_DESIGN',
    publish_requested: true
  });
  assert.equal(out.allowed, false);
  assert.equal(out.code, 'PUBLICATION_AUTHORITY_SEPARATE');
  assert.equal(out.external_publication_authorized, false);
});

test('new spend is blocked by MONEY_LIMIT', () => {
  const out = routeCreativeTask({
    ...base,
    request_id: 'req:spend:1',
    requester_engine_id: 'MKT-001',
    creative_task_type: 'VIDEO_EDITING',
    spend_requested: true
  });
  assert.equal(out.allowed, false);
  assert.equal(out.human_required_reason, 'MONEY_LIMIT');
});
