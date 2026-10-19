import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const policy = JSON.parse(fs.readFileSync(new URL('../registry/cerebro-compounding-evolution-policy.v1.json', import.meta.url), 'utf8'));
const engines = JSON.parse(fs.readFileSync(new URL('../registry/engine-registry.v1.json', import.meta.url), 'utf8'));
const engineering = JSON.parse(fs.readFileSync(new URL('../registry/engineering-specializations-full-sweep.v1.json', import.meta.url), 'utf8'));

const engineSet = new Set(engines.engine_ids);

function assertDeniedAuthority(authority) {
  for (const [key, value] of Object.entries(authority)) {
    if (key === 'additional_cost_eur') {
      assert.equal(value, 0, 'additional cost must remain zero');
      continue;
    }
    assert.equal(value, false, `authority must remain denied: ${key}`);
  }
}

test('compounding evolution policy is PREPROD, measurable and does not overclaim exponential growth', () => {
  assert.equal(policy.environment, 'PREPROD');
  assert.equal(policy.engine_id, 'LRN-001');
  assert.equal(policy.status, 'STAGED_PREPROD_POLICY');
  assert.equal(policy.growth_model.target, 'COMPOUNDED_MEASURABLE_IMPROVEMENT');
  assert.equal(policy.growth_model.exponential_growth_guaranteed, false);
  assert.deepEqual(policy.growth_model.cycle, [
    'DISCOVER', 'COMPARE', 'TEST', 'MEASURE', 'LEARN', 'INTEGRATE', 'REUSE', 'PRODUCTIZE', 'MEASURE_AGAIN'
  ]);
});

test('permanent multifront work includes communication, security, performance, productization and reliability', () => {
  for (const required of [
    'CAPABILITY_ACQUISITION',
    'HUMAN_AI_COMMUNICATION',
    'CYBERSECURITY_BLUE_TEAM',
    'CYBERSECURITY_RED_TEAM_AUTHORIZED',
    'CYBERSECURITY_PURPLE_TEAM',
    'PERFORMANCE_AND_SPEED',
    'RELIABILITY_AND_QA',
    'PRODUCTIZATION',
    'COST_AND_FINOPS',
    'BACKUP_ROLLBACK_REBUILD'
  ]) assert.ok(policy.permanent_parallel_fronts.includes(required), `missing front: ${required}`);
  assert.equal(policy.parallelism_policy.bounded_parallelism_required, true);
  assert.equal(policy.parallelism_policy.blocked_front_does_not_block_other_safe_fronts, true);
});

test('speed improvement is evidence-backed and preserves quality and security', () => {
  for (const metric of [
    'expected_ms', 'actual_ms', 'wait_ms', 'rework_ms', 'p50_ms', 'p95_ms', 'throughput', 'success_rate', 'human_minutes', 'additional_cost_eur', 'old_vs_new_delta'
  ]) assert.ok(policy.speed_and_performance_contract.required_metrics.includes(metric), `missing metric: ${metric}`);
  assert.equal(policy.speed_and_performance_contract.baseline_required, true);
  assert.equal(policy.speed_and_performance_contract.trend_required, true);
  assert.equal(policy.promotion_gates.old_vs_new_required, true);
  assert.equal(policy.promotion_gates.rollback_required, true);
});

test('every material error must become reusable learning and a regression test', () => {
  assert.deepEqual(policy.error_learning_contract.every_material_error_requires, [
    'ROOT_CAUSE', 'FIX', 'REGRESSION_TEST', 'LEARNING_EVENT', 'REUSE_ASSET_OR_RULE_WHEN_APPLICABLE'
  ]);
  assert.equal(policy.error_learning_contract.repeat_same_error_is_learning_failure, true);
  assert.equal(policy.error_learning_contract.proactive_improvement_without_error_required, true);
});

test('cybersecurity reuses registered SEC, RED, IAM and resilience engines', () => {
  for (const engineId of policy.cybersecurity.engine_refs) assert.ok(engineSet.has(engineId), `unregistered security engine: ${engineId}`);
  assert.equal(engineering.specialists.SECURITY, 'FULL_SAFE_PREPROD');
  assert.ok(policy.cybersecurity.blue_team.includes('SAST'));
  assert.ok(policy.cybersecurity.blue_team.includes('DAST'));
  assert.ok(policy.cybersecurity.blue_team.includes('SUPPLY_CHAIN_SECURITY'));
  assert.ok(policy.cybersecurity.red_team.includes('AUTHORIZED_ADVERSARIAL_SIMULATION'));
  assert.ok(policy.cybersecurity.purple_team_loop.includes('ADD_REGRESSION_TEST'));
});

test('offensive cybersecurity is strictly authorized, bounded, non-destructive and auditable', () => {
  const g = policy.cybersecurity.offensive_guardrails;
  assert.equal(g.owned_or_explicitly_authorized_targets_only, true);
  assert.equal(g.lab_or_preprod_default, true);
  assert.equal(g.scope_must_be_explicit, true);
  assert.equal(g.non_destructive_default, true);
  assert.equal(g.third_party_unauthorized_access, false);
  assert.equal(g.credential_theft, false);
  assert.equal(g.malicious_persistence, false);
  assert.equal(g.data_exfiltration, false);
  assert.equal(g.malware_deployment, false);
  assert.equal(g.destructive_payloads, false);
  assert.equal(g.bypass_legal_or_policy_controls, false);
  assert.equal(g.cleanup_and_evidence_required, true);
  assert.equal(g.audit_log_required, true);
  assert.equal(g.uncertain_scope_human_required, 'POLICY_CONFLICT');
  assert.equal(g.high_risk_human_required, 'HIGH_RISK');
  assert.equal(g.security_incident_human_required, 'SECURITY_INCIDENT');
});

test('capability acquisition remains zero-cost, provenance-first and gated before external execution', () => {
  assert.equal(policy.capability_acquisition.continuous, true);
  assert.equal(policy.capability_acquisition.candidate_gate, 'TECH_SCOUT_PLUS_FREE_PARITY_GATE');
  assert.equal(policy.capability_acquisition.external_code_execution_before_gate, false);
  assert.equal(policy.capability_acquisition.external_dependency_install_before_gate, false);
  assert.equal(policy.capability_acquisition.paid_subscription_default, false);
  assert.ok(policy.capability_acquisition.required_checks.includes('LICENSE'));
  assert.ok(policy.capability_acquisition.required_checks.includes('SECURITY_POSTURE'));
  assert.ok(policy.capability_acquisition.required_checks.includes('INCREMENTAL_VALUE_VS_EXISTING'));
});

test('policy preserves canonical human exception vocabulary and denies authority expansion', () => {
  assert.deepEqual(policy.autonomy_measurement.canonical_human_required_reasons_only, [
    'LEGAL_REQUIRED',
    'SIGNATURE_REQUIRED',
    'LOW_CONFIDENCE',
    'HIGH_RISK',
    'POLICY_CONFLICT',
    'SECURITY_INCIDENT',
    'MONEY_LIMIT',
    'CUSTOMER_HUMAN_REQUEST'
  ]);
  assertDeniedAuthority(policy.authority);
  assert.equal(policy.implementation_state.prod_operational, false);
  assert.equal(policy.implementation_state.runtime_consumer_binding_for_this_policy, 'PENDING_EXACT_HEAD_TESTED_WIRING');
});
