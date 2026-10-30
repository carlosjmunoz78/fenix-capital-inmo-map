import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planEnterpriseGlobalFanoutV1, ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT } from '../runtime/enterprise-global-fanout-v1.mjs';

const policy = JSON.parse(fs.readFileSync(new URL('../config/github-enterprise-execution.v1.json', import.meta.url), 'utf8'));

test('contract is finite PREPROD and creates no second control plane', () => {
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.global_platform_ceiling, 500);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.matrix_ceiling, 256);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.matrices, 2);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.matrix_target_each, 250);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_queue, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_scheduler, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_daemon, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.self_refill, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.prod_authorized, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.trading_access, false);
});

test('500 useful mission units split into two legal 250-job matrices with no duplicates', () => {
  const plan = planEnterpriseGlobalFanoutV1({ policy, requested_units: 500 });
  assert.equal(plan.requested_units, 500);
  assert.equal(plan.planned_units, 500);
  assert.equal(plan.unique_work_units, 500);
  assert.equal(plan.matrix_a_count, 250);
  assert.equal(plan.matrix_b_count, 250);
  assert.equal(plan.matrix_a.length, 250);
  assert.equal(plan.matrix_b.length, 250);
  assert.equal(plan.global_platform_ceiling, 500);
  assert.equal(plan.matrix_ceiling, 256);
  const ids = [...plan.matrix_a, ...plan.matrix_b].map(item => item.work_unit_id);
  assert.equal(new Set(ids).size, 500);
  assert.ok([...plan.matrix_a, ...plan.matrix_b].every(item => item.environment === 'PREPROD'));
  assert.equal(plan.second_queue, false);
  assert.equal(plan.second_scheduler, false);
  assert.equal(plan.second_daemon, false);
  assert.equal(plan.self_refill, false);
  assert.equal(plan.additional_cost_eur, 0);
  assert.equal(plan.prod_authorized, false);
  assert.equal(plan.trading_access, false);
});

test('small canary exercises both matrices deterministically', () => {
  const a = planEnterpriseGlobalFanoutV1({ policy, requested_units: 32 });
  const b = planEnterpriseGlobalFanoutV1({ policy, requested_units: 32 });
  assert.equal(a.matrix_a_count, 16);
  assert.equal(a.matrix_b_count, 16);
  assert.deepEqual(a.matrix_a, b.matrix_a);
  assert.deepEqual(a.matrix_b, b.matrix_b);
  assert.equal(new Set([...a.matrix_a, ...a.matrix_b].map(item => item.work_unit_id)).size, 32);
});

test('planner is fail-closed when Enterprise entitlement is lost', () => {
  const unsafe = structuredClone(policy);
  unsafe.entitlement_gate.enterprise_organization_verified_for_canonical_repo = false;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: unsafe, requested_units: 32 }), /ENTERPRISE_ENTITLEMENT_REQUIRED/);
});

test('planner rejects requests above the verified platform ceiling', () => {
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy, requested_units: 501 }), /requested_units must be an integer 1\.\.500/);
});

test('planner rejects policy authority expansion', () => {
  const unsafeProd = structuredClone(policy);
  unsafeProd.workflow_policy.production_deploy_from_acceleration_workflow = true;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: unsafeProd, requested_units: 16 }), /PROD_DEPLOY_DENIED/);
  const unsafeExternal = structuredClone(policy);
  unsafeExternal.workflow_policy.write_external_systems = true;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: unsafeExternal, requested_units: 16 }), /EXTERNAL_WRITE_DENIED/);
});
