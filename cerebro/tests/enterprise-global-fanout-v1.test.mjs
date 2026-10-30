import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  planEnterpriseGlobalFanoutV1,
  buildPaidEnterpriseTopologyV1,
  ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT,
} from '../runtime/enterprise-global-fanout-v1.mjs';

const policy = JSON.parse(fs.readFileSync(new URL('../config/github-enterprise-execution.v1.json', import.meta.url), 'utf8'));

test('contract is finite PREPROD, trial fail-closed and creates no second control plane', () => {
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.paid_enterprise_global_platform_ceiling, 500);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.trial_safe_physical_cap, 20);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.matrix_ceiling, 256);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.matrices, 2);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.matrix_target_each, 250);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.paid_500_topology_prepared, true);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.paid_500_physical_execution_requires_verified_entitlement, true);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_queue, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_scheduler, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_daemon, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.self_refill, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.prod_authorized, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.trading_access, false);
});

test('paid 500 topology is prepared as two legal 250-job matrices with 500 unique useful units', () => {
  const topology = buildPaidEnterpriseTopologyV1(500);
  assert.equal(topology.requested_units, 500);
  assert.equal(topology.all.length, 500);
  assert.equal(topology.ids.size, 500);
  assert.equal(topology.matrix_a.length, 250);
  assert.equal(topology.matrix_b.length, 250);
  assert.equal(new Set(topology.all.map(item => item.work_unit_id)).size, 500);
  assert.ok(topology.all.every(item => item.environment === 'PREPROD'));
});

test('live Enterprise trial uses the full standard 20-job physical cap', () => {
  const plan = planEnterpriseGlobalFanoutV1({ policy, requested_units: 20 });
  assert.equal(plan.enterprise_account_state, 'TRIAL');
  assert.equal(plan.enterprise_actions_concurrency_entitlement_verified, false);
  assert.equal(plan.effective_physical_cap, 20);
  assert.equal(plan.planned_units, 20);
  assert.equal(plan.unique_work_units, 20);
  assert.equal(plan.matrix_a_count, 10);
  assert.equal(plan.matrix_b_count, 10);
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy, requested_units: 21 }), /requested_units must be an integer 1\.\.20/);
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy, requested_units: 500 }), /requested_units must be an integer 1\.\.20/);
});

test('paid Enterprise physical plan unlocks 500 only when concurrency entitlement is separately verified', () => {
  const paid = structuredClone(policy);
  paid.entitlement_gate.enterprise_account_state = 'PAID';
  paid.entitlement_gate.enterprise_actions_concurrency_entitlement_verified = true;
  paid.entitlement_gate.global_500_fanout_enabled = true;
  paid.verified_platform_limits.live_standard_runner_concurrent_jobs_max = 500;
  const plan = planEnterpriseGlobalFanoutV1({ policy: paid, requested_units: 500 });
  assert.equal(plan.enterprise_actions_concurrency_entitlement_verified, true);
  assert.equal(plan.effective_physical_cap, 500);
  assert.equal(plan.planned_units, 500);
  assert.equal(plan.unique_work_units, 500);
  assert.equal(plan.matrix_a_count, 250);
  assert.equal(plan.matrix_b_count, 250);
  assert.equal(plan.paid_enterprise_platform_ceiling, 500);
  assert.equal(plan.matrix_ceiling, 256);
});

test('paid physical plan is capped at the live runner maximum rather than the published ceiling', () => {
  const paid = structuredClone(policy);
  paid.entitlement_gate.enterprise_account_state = 'PAID';
  paid.entitlement_gate.enterprise_actions_concurrency_entitlement_verified = true;
  paid.entitlement_gate.global_500_fanout_enabled = true;
  paid.verified_platform_limits.live_standard_runner_concurrent_jobs_max = 180;

  const plan = planEnterpriseGlobalFanoutV1({ policy: paid, requested_units: 180 });
  assert.equal(plan.paid_enterprise_platform_ceiling, 500);
  assert.equal(plan.effective_physical_cap, 180);
  assert.equal(plan.planned_units, 180);
  assert.equal(plan.unique_work_units, 180);
  assert.equal(plan.matrix_a_count, 90);
  assert.equal(plan.matrix_b_count, 90);
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: paid, requested_units: 181 }), /requested_units must be an integer 1\.\.180/);
});

test('missing or invalid live runner maximum fails closed instead of assuming 500', () => {
  const missing = structuredClone(policy);
  delete missing.verified_platform_limits.live_standard_runner_concurrent_jobs_max;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: missing, requested_units: 20 }), /live_standard_runner_concurrent_jobs_max must be an integer 1\.\.500/);

  const invalid = structuredClone(policy);
  invalid.verified_platform_limits.live_standard_runner_concurrent_jobs_max = 501;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: invalid, requested_units: 20 }), /live_standard_runner_concurrent_jobs_max must be an integer 1\.\.500/);
});

test('planner is fail-closed when organization ownership evidence is lost', () => {
  const unsafe = structuredClone(policy);
  unsafe.entitlement_gate.enterprise_organization_verified_for_canonical_repo = false;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: unsafe, requested_units: 20 }), /ENTERPRISE_ORGANIZATION_REQUIRED/);
});

test('planner rejects topology requests above the paid Enterprise platform ceiling', () => {
  assert.throws(() => buildPaidEnterpriseTopologyV1(501), /requested_units must be an integer 1\.\.500/);
});

test('planner rejects policy authority expansion', () => {
  const unsafeProd = structuredClone(policy);
  unsafeProd.workflow_policy.production_deploy_from_acceleration_workflow = true;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: unsafeProd, requested_units: 20 }), /PROD_DEPLOY_DENIED/);
  const unsafeExternal = structuredClone(policy);
  unsafeExternal.workflow_policy.write_external_systems = true;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: unsafeExternal, requested_units: 20 }), /EXTERNAL_WRITE_DENIED/);
});
