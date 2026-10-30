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
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.buffered_queue, true);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.queue_buffer_multiplier, 2);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.stops_when_backlog_exhausted, true);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.offset_aware, true);
  assert.ok(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.total_mission_work_units > 360);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.prod_authorized, false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.trading_access, false);
});

test('live Enterprise keeps a 360-unit logical buffer over the verified 180 physical cap', () => {
  const first = planEnterpriseGlobalFanoutV1({ policy, requested_units: 360, offset: 0 });
  const second = planEnterpriseGlobalFanoutV1({ policy, requested_units: 360, offset: first.next_offset });
  assert.equal(first.effective_physical_cap, 180);
  assert.equal(first.queue_buffer_cap, 360);
  assert.equal(first.planned_units, 360);
  assert.equal(first.matrix_a.length, 180);
  assert.equal(first.matrix_b.length, 180);
  assert.equal(first.next_offset, 360);
  assert.equal(second.offset, 360);
  assert.equal(second.planned_units, 360);
  assert.equal(second.next_offset, 720);
  const a = new Set([...first.matrix_a, ...first.matrix_b].map(x => x.work_unit_id));
  const b = new Set([...second.matrix_a, ...second.matrix_b].map(x => x.work_unit_id));
  assert.equal([...b].some(id => a.has(id)), false);
});

test('final buffered wave shrinks to remaining useful work and stops', () => {
  const total = ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.total_mission_work_units;
  const plan = planEnterpriseGlobalFanoutV1({ policy, requested_units: 360, offset: total - 17 });
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

test('live physical cap remains 180 while logical queue buffer fails closed above 360', () => {
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy, requested_units: 361 }), /1\.\.360/);
  const fallback = structuredClone(policy);
  fallback.entitlement_gate.enterprise_actions_concurrency_entitlement_verified = false;
  fallback.entitlement_gate.enterprise_account_state = 'TRIAL';
  fallback.entitlement_gate.global_fanout_enabled = false;
  const fallbackPlan = planEnterpriseGlobalFanoutV1({ policy: fallback, requested_units: 40 });
  assert.equal(fallbackPlan.effective_physical_cap, 20);
  assert.equal(fallbackPlan.queue_buffer_cap, 40);
  const unsafe = structuredClone(policy);
  unsafe.workflow_policy.production_deploy_from_acceleration_workflow = true;
  assert.throws(() => planEnterpriseGlobalFanoutV1({ policy: unsafe, requested_units: 20 }), /PROD_DEPLOY_DENIED/);
});
