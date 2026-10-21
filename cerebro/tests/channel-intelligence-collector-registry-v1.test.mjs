import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCollectorRegistry,
  selectCollectorForWatch,
  collectorCoverageMatrix
} from '../marketing/channel-intelligence-collector-registry-v1.mjs';

const evidence_at = '2026-10-21T16:00:00.000Z';

function descriptor(extra = {}) {
  return {
    collector_id: 'collector:test:base',
    provider: 'TEST',
    connector_id: 'test',
    state: 'VERIFIED_READY',
    block_reason: 'NONE',
    purposes: ['SEARCH_DEMAND'],
    channels: [],
    account_scope_ref: 'account:test:scope',
    evidence_ref: 'evidence:test:1',
    evidence_at,
    read_only: true,
    write_authorized: false,
    additional_cost_eur: 0,
    priority: 10,
    ...extra
  };
}

function registry(collectors) {
  return buildCollectorRegistry({company_id: 'fenix-capital', collectors, evidence_at});
}

test('registry is PREPROD, deterministic authority and zero-cost only', () => {
  const out = registry([descriptor()]);
  assert.equal(out.environment, 'PREPROD');
  assert.equal(out.engine_id, 'MKT-001');
  assert.equal(out.capability_id, 'CHANNEL-INTELLIGENCE-V1');
  assert.equal(out.verified_ready_total, 1);
  assert.equal(out.prod_authorized, false);
  assert.equal(out.write_authorized, false);
  assert.equal(out.additional_cost_eur, 0);
  assert.match(out.registry_sha256, /^[a-f0-9]{64}$/);
});

test('selector prefers verified ready zero-cost read-only source', () => {
  const out = registry([
    descriptor({collector_id: 'collector:block', state: 'CONNECTED_READ_BLOCKED', block_reason: 'ZERO_COST_PLAN_LIMIT', priority: 1}),
    descriptor({collector_id: 'collector:ready', priority: 20})
  ]);
  const selected = selectCollectorForWatch({registry: out, watch_type: 'SEARCH_RADAR'});
  assert.equal(selected.status, 'COLLECTOR_SELECTED');
  assert.equal(selected.collector.collector_id, 'collector:ready');
  assert.equal(selected.collector.read_only, true);
  assert.equal(selected.prod_authorized, false);
});

test('connected but blocked provider is reported without retry storm or human escalation', () => {
  const out = registry([
    descriptor({
      collector_id: 'collector:windsor:gsc',
      provider: 'WINDSOR',
      connector_id: 'searchconsole',
      state: 'CONNECTED_READ_BLOCKED',
      block_reason: 'ZERO_COST_PLAN_LIMIT',
      purposes: ['SEARCH_DEMAND'],
      priority: 1
    })
  ]);
  const selected = selectCollectorForWatch({registry: out, watch_type: 'SEARCH_RADAR'});
  assert.equal(selected.status, 'NO_VERIFIED_COLLECTOR');
  assert.equal(selected.blocker.state, 'CONNECTED_READ_BLOCKED');
  assert.equal(selected.blocker.block_reason, 'ZERO_COST_PLAN_LIMIT');
  assert.equal(selected.retry_immediately, false);
  assert.equal(selected.human_required, false);
});

test('channel-scoped collector is selected only for matching channel', () => {
  const out = registry([
    descriptor({
      collector_id: 'collector:instagram:own',
      connector_id: 'instagram',
      purposes: ['SOCIAL_OWN_PERFORMANCE'],
      channels: ['instagram']
    }),
    descriptor({
      collector_id: 'collector:facebook:own',
      connector_id: 'facebook_organic',
      purposes: ['SOCIAL_OWN_PERFORMANCE'],
      channels: ['facebook'],
      priority: 20
    })
  ]);
  const selected = selectCollectorForWatch({registry: out, watch_type: 'CHANNEL_HEALTH', channel_id: 'Instagram'});
  assert.equal(selected.status, 'COLLECTOR_SELECTED');
  assert.equal(selected.collector.collector_id, 'collector:instagram:own');
});

test('no verified collector remains a safe no-op', () => {
  const out = registry([
    descriptor({
      collector_id: 'collector:linkedin:pending',
      connector_id: 'linkedin_organic',
      state: 'NOT_CONNECTED',
      block_reason: 'NO_AUTHORIZED_ACCOUNT',
      purposes: ['SOCIAL_OWN_PERFORMANCE'],
      channels: ['linkedin']
    })
  ]);
  const selected = selectCollectorForWatch({registry: out, watch_type: 'CHANNEL_HEALTH', channel_id: 'linkedin'});
  assert.equal(selected.status, 'NO_VERIFIED_COLLECTOR');
  assert.equal(selected.retry_immediately, false);
  assert.equal(selected.prod_authorized, false);
});

test('coverage matrix never treats blocked sources as ready coverage', () => {
  const out = registry([
    descriptor({collector_id: 'collector:gsc:blocked', state: 'CONNECTED_READ_BLOCKED', block_reason: 'ZERO_COST_PLAN_LIMIT'}),
    descriptor({collector_id: 'collector:web:ready', purposes: ['WEB_ANALYTICS']})
  ]);
  const matrix = collectorCoverageMatrix(out);
  assert.equal(matrix.find((row) => row.watch_type === 'SEARCH_RADAR').verified_ready, false);
  assert.equal(matrix.find((row) => row.watch_type === 'MARKET_RADAR').verified_ready, true);
});

test('duplicate collector ids are rejected', () => {
  assert.throws(() => registry([descriptor(), descriptor()]), /duplicate collector_id/);
});

test('write authority or paid collectors are rejected', () => {
  assert.throws(() => registry([descriptor({write_authorized: true})]), /forbids write authority/);
  assert.throws(() => registry([descriptor({additional_cost_eur: 1})]), /zero-additional-cost/);
});

test('VERIFIED_READY cannot carry a blocker', () => {
  assert.throws(() => registry([descriptor({block_reason: 'LOW_CONFIDENCE'})]), /cannot have block reason/);
});
