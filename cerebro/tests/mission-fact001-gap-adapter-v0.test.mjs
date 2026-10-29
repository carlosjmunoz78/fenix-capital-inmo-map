import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFactSkillNativePayloadFromMissionGap,
  consumeMissionCapabilityGapWithFact001
} from '../runtime/mission-fact001-gap-adapter-v0.mjs';

function handoff(overrides = {}) {
  return {
    schema_version: '1.0.0',
    state_type: 'CEREBRO_FACT001_CAPABILITY_GAP_HANDOFF',
    handoff_id: 'fact001-mission-gap:test-001',
    company_id: 'fenix',
    engine_id: 'FACT-001',
    environment: 'PREPROD',
    version: 'mission-capability-learning-loop-v0',
    source_engine_id: 'JOB-001',
    source_work_unit_id: 'M07.capabilities.capability_ensure',
    source_fingerprint: 'source-fingerprint-001',
    requested_capability: 'browser-control',
    factory_first: true,
    reuse_existing_first: true,
    factory_candidate_authorized: true,
    factory_create_authorized: false,
    registry_change_authorized: false,
    preservation_required: true,
    dependency_map_required: true,
    backup_required: true,
    contracts_required: true,
    tests_required: true,
    evaluation_required: true,
    tribunal_required: true,
    preprod_required: true,
    old_vs_new_required: true,
    rollback_required: true,
    rebuild_required: true,
    next_gate: 'FACT001_REGISTRY_CAPABILITY_GAP_REVIEW',
    additional_cost_eur: 0,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    ...overrides
  };
}

test('mission capability gap is physically consumed by existing FACT-SKILL-NATIVE route without creation authority', () => {
  const source = handoff();
  const payload = buildFactSkillNativePayloadFromMissionGap(source);
  assert.equal(payload.company_id, 'fenix');
  assert.equal(payload.engine_id, 'FACT-001');
  assert.equal(payload.environment, 'PREPROD');
  assert.equal(payload.cost.additional_cost_eur, 0);
  assert.equal(payload.lifecycle.router_connected, true);

  const receipt = consumeMissionCapabilityGapWithFact001(source);
  assert.equal(receipt.state_type, 'CEREBRO_MISSION_FACT001_GAP_CONSUMPTION_RECEIPT');
  assert.equal(receipt.handoff_id, source.handoff_id);
  assert.equal(receipt.physically_consumed, true);
  assert.equal(receipt.engine_id, 'FACT-001');
  assert.equal(receipt.route, 'capability://FACT-SKILL-NATIVE/v1/admit');
  assert.equal(receipt.create_new_engine_authorized, false);
  assert.equal(receipt.additional_cost_eur, 0);
  assert.equal(receipt.prod_authorized, false);
  assert.equal(receipt.prod_write_authorized, false);
  assert.equal(receipt.trading_access, false);
  assert.ok(receipt.registration_id);
  assert.ok(receipt.idempotency_key);
  assert.ok(receipt.event_count >= 3);
  assert.ok(Array.isArray(receipt.failed_gates));
});

test('adapter rejects unsafe PROD, Trading, mutation or cost authority before FACT-001 routing', () => {
  assert.throws(() => consumeMissionCapabilityGapWithFact001(handoff({ environment: 'PROD' })), /PREPROD/);
  assert.throws(() => consumeMissionCapabilityGapWithFact001(handoff({ prod_write_authorized: true })), /unsafe/);
  assert.throws(() => consumeMissionCapabilityGapWithFact001(handoff({ trading_access: true })), /unsafe/);
  assert.throws(() => consumeMissionCapabilityGapWithFact001(handoff({ factory_create_authorized: true })), /unsafe/);
  assert.throws(() => consumeMissionCapabilityGapWithFact001(handoff({ additional_cost_eur: 1 })), /non-zero/);
});
