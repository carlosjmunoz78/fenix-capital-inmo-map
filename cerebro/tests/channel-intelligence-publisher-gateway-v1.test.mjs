import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPublisherTopology,
  resolvePublisherAdapter,
  planPublish,
  planPublisherMigration
} from '../marketing/channel-intelligence-publisher-gateway-v1.mjs';

test('Buffer is the current evidenced publisher and Make is read/metrics only', () => {
  const topology = getPublisherTopology();
  assert.equal(topology.current_provider, 'BUFFER');
  assert.equal(topology.make_role, 'READ_METRICS_BRIDGE_ONLY');
  assert.equal(topology.make_is_publisher, false);
  assert.equal(topology.adapters.BUFFER.state, 'CURRENT_EVIDENCED_PUBLISHER');
});

test('Make can never resolve as a publisher adapter', () => {
  const adapter = resolvePublisherAdapter({ provider: 'MAKE', channel_id: 'instagram' });
  assert.equal(adapter.publish_capable, false);
  assert.equal(adapter.state, 'READ_ONLY_BRIDGE_NOT_PUBLISHER');
  assert.equal(adapter.reason, 'MAKE_IS_RESERVED_AS_TRANSITIONAL_READ_METRICS_BRIDGE');
});

test('V1 only plans Buffer publishing and never executes an external write', () => {
  const plan = planPublish({
    company_id: 'fenix-capital',
    channel_id: 'instagram',
    provider: 'BUFFER',
    environment: 'PREPROD',
    publication_ref: 'test-publication-1'
  });
  assert.equal(plan.state, 'PLANNED');
  assert.equal(plan.publish_executed, false);
  assert.equal(plan.provider, 'BUFFER');
  assert.equal(plan.next_gate, 'SEPARATE_PUBLISHER_PREPROD_E2E');
});

test('even explicit publish authorization remains blocked in this capability', () => {
  const plan = planPublish({
    company_id: 'fenix-capital',
    channel_id: 'facebook',
    provider: 'BUFFER',
    environment: 'PREPROD',
    authorize_publish: true
  });
  assert.equal(plan.state, 'BLOCKED');
  assert.equal(plan.reason, 'V1_DOES_NOT_AUTHORIZE_EXTERNAL_PUBLISH_WRITES');
  assert.equal(plan.publish_executed, false);
});

test('non-PREPROD and paid execution fail closed', () => {
  const prod = planPublish({
    company_id: 'fenix-capital',
    channel_id: 'linkedin',
    provider: 'BUFFER',
    environment: 'PROD'
  });
  assert.equal(prod.state, 'BLOCKED');
  assert.equal(prod.reason, 'PREPROD_ONLY');

  const paid = planPublish({
    company_id: 'fenix-capital',
    channel_id: 'linkedin',
    provider: 'BUFFER',
    environment: 'PREPROD',
    spend_eur: 1
  });
  assert.equal(paid.state, 'HUMAN_REQUIRED');
  assert.equal(paid.human_required_reason, 'MONEY_LIMIT');
});

test('future direct adapters stay HOLD until governed migration gates pass', () => {
  const migration = planPublisherMigration({
    channel_id: 'instagram',
    target_provider: 'META_DIRECT'
  });
  assert.equal(migration.current.provider, 'BUFFER');
  assert.equal(migration.target.state, 'PLANNED_NOT_BOUND');
  assert.equal(migration.migration_state, 'HOLD');
  assert.equal(migration.disable_buffer_before_promotion, false);
  assert.ok(migration.required_gates.includes('OLD_VS_NEW_AGAINST_BUFFER'));
  assert.ok(migration.required_gates.includes('ROLLBACK_TEST'));
});
