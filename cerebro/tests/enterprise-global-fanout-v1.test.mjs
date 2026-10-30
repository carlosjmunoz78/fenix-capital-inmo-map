import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planEnterpriseGlobalFanoutV1, buildPaidEnterpriseTopologyV1, ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT } from '../runtime/enterprise-global-fanout-v1.mjs';

const policy = JSON.parse(fs.readFileSync(new URL('../config/github-enterprise-execution.v1.json', import.meta.url), 'utf8'));

test('global fanout contract is PREPROD and self-refills finite waves without a second control plane', () => {
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_queue, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_scheduler, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_daemon, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.self_refill, true);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.finite_wave, true);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.stops_when_backlog_exhausted, true);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.offset_aware, true);
  assert.ok(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.total_mission_work_units > 180);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.prod_authorized, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.trading_access, false);
});

test('live Enterprise drains 180 unique units per wave and advances without overlap', () => {
  const first = planEnterpriseGlobalFanoutV1({ policy, requested_units: 180, offset: 0 });
  const second = planEnterpriseGlobalFanoutV1({ policy, requested_units: 180, offset: first.next_offset });
  assert.equal(first.effective_physical_cap, 180);
  assert.equal(first.planned_units, 180);
  assert.equal(first.next_offset, 180);
  assert.equal(second.offset, 180);
  assert.equal(second.planned_units, 180);
  assert.equal(second.next_offset, 360);
  const a = new Set([...first.matrix_a, ...first.matrix_b].map(x => x.work_unit_id));
  const b = new Set([...second.matrix_a, ...second.matrix_b].map(x => x.work_unit_id));
  assert.equal([...b].some(id => a.has(id)), false);
});

test('final wave shrinks to remaining useful work and stops', () => {
  const total = ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.total_mission_work_units;
  const plan = planEnterpriseGlobalFanoutV1({ policy, requested_units: 180, offset: total - 17 });
  assert.equal(plan.planned_units, 17);
  assert.equal(plan.next_offset, total);
  assert.equal(plan.has_more, false);
});

test('500 topology remains legal as two 250-job matrices', () => {
  const topology = buildPaidEnterpriseTopologyV1(500, 0);
  assert.equal(topology.all.length, 500);
  assert.equal(topology.ids.size, 500);
  assert.equal(topology.matrix_a.length, 250);
  assert.equal(topology.matrix_b.length, 250);
});

test('live cap and authority remain fail-closed', () => {
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy, requested_units: 181 }), /1\.\.180/);
  const fallback = structuredClone(policy);
  fallback.entitlement_gate.enterprise_actions_concurrency_entitlement_verified = false;
  fallback.entitlement_gate.enterprise_account_state = 'TRIAL';
  fallback.entitlement_gate.global_fanout_enabled = false;
  assert.equal(planEnterpriseGlobalFanoutV1({ policy: fallback, requested_units: 20 }).effective_physical_cap, 20);
  const unsafe = structuredClone(policy);
  unsafe.workflow_policy.production_deploy_from_acceleration_workflow = true;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: unsafe, requested_units: 20 }), /PROD_DEPLOY_DENIED/);
});
