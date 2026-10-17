import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const load = (relativeUrl) => JSON.parse(fs.readFileSync(new URL(relativeUrl, import.meta.url), 'utf8'));

const v4 = load('../registry/cerebro-global-operational-convergence-v4.json');
const pointer = load('../registry/current-operational-convergence.v1.json');
const engines = load('../registry/engine-registry.v1.json');
const v3 = load('../skills/cerebro-184-live-convergence.v3.json');
const compet = load('../registry/compet-real-consumer-adoption-v1.json');
const cap = load('../registry/cap-real-consumer-adoption-v1.json');
const lead = load('../registry/lead-real-consumer-adoption-v1.json');
const sale = load('../registry/sale-real-consumer-adoption-v1.json');
const comNotifC360 = load('../registry/lote3-com-notif-c360-real-v1.json');
const journey = load('../registry/customer-journey-real-adoption-v1.json');
const mortgage = load('../registry/mortgage-operations-real-adoption-v1.json');
const skills = load('../registry/skill-full-adoption-v1.json');
const bindings = load('../registry/skill-real-engine-binding-v1.json');
const b3 = load('../registry/b3-server-write-e2e-closeout.v1.json');
const android = load('../registry/fact001-android-staging-48-183.v0.json');
const watch = load('../registry/watch-learn-remote-observation.v0.json');

const closedById = new Map(v4.closed_runtime_and_skill_gates.map((item) => [item.id, item]));
const physicalById = new Map(v4.remaining_real_physical_gates.map((item) => [item.id, item]));

function assertNoAuthorityExpansion(authority) {
  for (const [key, value] of Object.entries(authority)) {
    if (key === 'additional_cost_eur') {
      assert.equal(value, 0, 'additional cost must remain zero');
      continue;
    }
    assert.notEqual(value, true, `authority expansion forbidden: ${key}`);
  }
}

test('V4 is the additive current pointer and preserves canonical counts', () => {
  assert.equal(pointer.current, 'cerebro/registry/cerebro-global-operational-convergence-v4.json');
  assert.equal(pointer.authority_change, false);
  assert.equal(pointer.additional_cost_eur, 0);
  assert.equal(v4.version, 'v4');
  assert.equal(v4.environment, 'PREPROD');
  assert.equal(v4.truth_contract.canonical_logical_engine_count, 179);
  assert.equal(v4.truth_contract.normalized_capability_catalog_count, 184);
  assert.equal(v4.truth_contract.normalization_debt_count, 0);
  assert.equal(v4.truth_contract.all_184_physically_active, false);
  assert.equal(engines.count, 179);
  assert.equal(engines.engine_ids.length, 179);
  assert.equal(v3.normalized_item_count, 184);
  assert.equal(v3.remaining_item_normalization_count, 0);
  assert.equal(v3.all_184_physically_active, false);
});

test('all strict runtime blocks already closed on current main stay evidence-backed FULL PREPROD', () => {
  const registries = [compet, cap, lead, sale, comNotifC360, journey, mortgage];
  for (const registry of registries) {
    assert.equal(registry.status, 'FULL_E2E_REAL_PREPROD');
    assert.equal(registry.main_gate?.full_e2e_real_preprod, true);
    assert.equal(registry.main_gate?.merged_to_main, true);
    assert.equal(registry.main_gate?.automatic_main_execution_green, true);
    assertNoAuthorityExpansion(registry.authority);
  }

  for (const id of ['COMPET-NATIVE', 'CAP-NATIVE', 'LEAD-NATIVE', 'SALE-NATIVE', 'LOTE3-COM-NOTIF-C360', 'CUSTOMER-JOURNEY', 'MORTGAGE-OPERATIONS']) {
    assert.ok(closedById.has(id), `missing V4 closure ${id}`);
    assert.equal(closedById.get(id).state, 'FULL_E2E_REAL_PREPROD');
  }
});

test('all admitted skills are FULL SAFE PREPROD and the formerly high-risk pair has 10 pertinent governed bindings', () => {
  assert.equal(skills.inventory_audit.admitted_full_queue_count, 5);
  assert.equal(skills.inventory_audit.full_safe_preprod_count, 5);
  assert.equal(skills.queue.length, 5);
  assert.ok(skills.queue.every((item) => item.status === 'FULL_SAFE_PREPROD'));
  assert.ok(skills.queue.every((item) => item.human_required == null));
  assert.equal(bindings.status, 'FULL_SAFE_PREPROD');
  assert.equal(bindings.binding_count, 10);
  assert.deepEqual(bindings.skills['supabase-postgres-best-practices'].target_engine_bindings, ['DATA-001', 'DBOFF-001', 'STOROFF-001', 'API-001', 'CRM-001']);
  assert.deepEqual(bindings.skills['agent-browser'].target_engine_bindings, ['AUTO-001', 'AUTBOOT-001', 'QA-001', 'WEB-001', 'SCAN-001']);
  assert.equal(bindings.skills['agent-browser'].browser_is_tool_not_authority, true);
  assert.equal(bindings.authority.external_skill_code_execution, false);
  assert.equal(bindings.authority.browser_external_side_effect_authorized, false);
  assert.equal(bindings.authority.db_mutation_authorized, false);
  assert.equal(bindings.authority.additional_cost_eur, 0);
  assert.equal(closedById.get('ADMITTED-SKILLS')?.state, '5_OF_5_FULL_SAFE_PREPROD');
});

test('generic B3 server write closeout stays green without falsely closing the direct B3 journal policy gate', () => {
  assert.equal(b3.status, 'GREEN_PHYSICAL_PREPROD');
  assert.equal(b3.acceptance.status, 'GREEN');
  assert.equal(b3.acceptance.readback, true);
  assert.equal(b3.acceptance.replay_idempotency, true);
  assert.equal(b3.acceptance.rollback_or_compensation, true);
  assert.equal(b3.acceptance.gate_closed_after, true);
  assert.equal(b3.gate_after_test.operational_writes_allowed, false);
  assert.equal(b3.gate_after_test.production_approved, false);
  assert.equal(closedById.get('B3-GENERIC-SERVER-WRITE-PATH')?.state, 'GREEN_PHYSICAL_PREPROD');

  const human = new Map(v4.human_required_policy_conflicts.map((item) => [item.pr, item]));
  assert.equal(human.get(731)?.reason, 'POLICY_CONFLICT');
  assert.equal(human.get(731)?.state, 'HUMAN_REQUIRED');
  assert.equal(human.get(732)?.reason, 'POLICY_CONFLICT');
  assert.equal(human.get(732)?.state, 'HUMAN_REQUIRED');
  assert.match(human.get(732)?.gate ?? '', /DIRECT_B3_JOURNAL/);
});

test('only evidence-backed physical/source gaps are reported as open, never inferred green', () => {
  assert.equal(android.item_48.physical_device_bound, false);
  assert.equal(android.item_183.physical_device_installed, false);
  assert.equal(physicalById.get('ANDROID_48_183')?.state, 'PARCIAL');

  assert.equal(watch.scheduler.configured, true);
  assert.equal(watch.scheduler.soak_complete, false);
  assert.equal(watch.verification.scheduled_soak_runs_verified, 0);
  assert.equal(physicalById.get('WATCH_LEARN_47')?.state, 'PARCIAL');

  assert.equal(compet.producer.live_external_fetch_required_for_ci, false);
  assert.equal(cap.producer.provider_execution_authorized, false);
  assert.equal(physicalById.get('COMPET_REAL_SOURCE_CONFIGURATION')?.state, 'PARCIAL_PHYSICAL_SOURCE_GATE');
  assert.equal(physicalById.get('CAP_REAL_SOURCE_CONFIGURATION')?.state, 'PARCIAL_PHYSICAL_SOURCE_GATE');
});

test('V4 itself cannot expand PROD, provider, spend, customer-data or Trading authority', () => {
  assertNoAuthorityExpansion(v4.authority);
  assert.equal(v4.historical_open_pr_policy.mass_merge_forbidden, true);
  assert.equal(v4.historical_open_pr_policy.mass_close_forbidden, true);
  assert.equal(v4.documentation.engine_registry_change_required, false);
  assert.equal(v4.documentation.contracts_change_required, false);
  assert.equal(v4.documentation.dependency_map_change_required, false);
  assert.equal(v4.reporting_contract.PROD, 'NOT_AUTHORIZED');
});
