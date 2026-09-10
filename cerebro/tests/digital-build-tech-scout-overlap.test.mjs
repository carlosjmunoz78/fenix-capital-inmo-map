import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const evidenceFile = path.join(root, 'evidence', 'digital-build-tech-scout-overlap-v0.json');
const registryFile = path.join(root, 'registry', 'engine-registry.seed.json');

const CANONICAL_ADDENDUM_AUDIT_IDS = [
  'WEB-001','APP-001','APPBOOT-001','FACT-001','ARCH-001','DEP-001','MIG-001','FF-001','CAN-001',
  'INN-001','OPP-001','VEN-001','VREP-001','INT-001','OBS-001'
];

function load() {
  return {
    evidence: JSON.parse(fs.readFileSync(evidenceFile, 'utf8')),
    registry: JSON.parse(fs.readFileSync(registryFile, 'utf8'))
  };
}

test('Digital Build + Technology Scout audit preserves the 177-engine canonical registry', () => {
  const { evidence, registry } = load();
  assert.equal(registry.count, 177);
  assert.equal(registry.engine_ids.length, 177);
  assert.equal(new Set(registry.engine_ids).size, 177);
  assert.equal(evidence.rules.canonical_engine_count_must_remain, 177);
  assert.equal(evidence.rules.new_engine_ids_allowed_in_this_scope, false);
  assert.deepEqual(evidence.audit_conclusion.new_engine_ids_required_now, []);
});

test('all IDs explicitly named by the addendum overlap audit exist in the canonical registry', () => {
  const { registry } = load();
  const canonical = new Set(registry.engine_ids);
  for (const engineId of CANONICAL_ADDENDUM_AUDIT_IDS) {
    assert.ok(canonical.has(engineId), `missing canonical addendum overlap engine ${engineId}`);
  }
});

test('every mapped capability resolves only to existing canonical engines and cannot silently create an ID', () => {
  const { evidence, registry } = load();
  const canonical = new Set(registry.engine_ids);
  assert.ok(evidence.overlap_map.length >= 10, 'overlap map is unexpectedly incomplete');

  for (const item of evidence.overlap_map) {
    assert.ok(item.capability, 'capability missing name');
    assert.ok(['FULL','PARTIAL','NONE'].includes(item.coverage), `${item.capability}: invalid coverage`);
    assert.equal(item.new_engine_id_required, false, `${item.capability}: unexpected new engine ID`);
    assert.ok(item.action, `${item.capability}: missing action`);
    assert.ok(item.gap, `${item.capability}: missing gap evidence`);
    for (const engineId of [...item.primary_engines, ...item.supporting_engines]) {
      assert.ok(canonical.has(engineId), `${item.capability}: non-canonical engine ${engineId}`);
    }
  }
});

test('audit retains zero-cost, preservation, no-PROD and Trading isolation boundaries', () => {
  const { evidence } = load();
  assert.equal(evidence.rules.zero_additional_cost_default, true);
  assert.equal(evidence.rules.preserve_existing_systems, true);
  assert.equal(evidence.rules.prod_changes, false);
  assert.equal(evidence.rules.trading_scope_added, false);
  assert.equal(evidence.rules.reuse_or_wrap_before_new_id, true);
});

test('implementation order follows audit-before-build and capability-before-new-engine policy', () => {
  const { evidence } = load();
  const order = evidence.audit_conclusion.next_implementation_order;
  assert.deepEqual(order.slice(0, 3), [
    'register_capability_contracts_without_new_engine_ids',
    'extend_FACT001_with_versioned_template_skill_catalog',
    'implement_deterministic_build_orchestrator_composition'
  ]);
  assert.equal(evidence.audit_conclusion.new_engine_ids_blocked_pending_future_gap_evidence, true);
});
