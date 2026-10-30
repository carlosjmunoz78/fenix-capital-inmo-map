import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planJob001ActionsBurstV1 } from '../runtime/job001-actions-burst-router-v1.mjs';
import { JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT } from '../runtime/job001-ledger-control-plane-v1.mjs';

const policy = JSON.parse(fs.readFileSync(new URL('../config/github-actions-burst.v1.json', import.meta.url), 'utf8'));

function plan(request = {}) {
  return planJob001ActionsBurstV1({ contract: JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT, policy, request });
}

test('default burst is finite PREPROD at canonical JOB-001 live 180 Enterprise cap', () => {
  const out = plan();
  assert.equal(out.environment, 'PREPROD');
  assert.equal(out.mode, 'FINITE_BURST');
  assert.equal(out.enterprise_account_state, 'PAID');
  assert.equal(out.entitlement_state, 'PAID_ACTIONS_CONCURRENCY_VERIFIED');
  assert.equal(out.lanes, 180);
  assert.equal(out.hard_cap, 180);
  assert.equal(out.units_per_lane, 8);
  assert.equal(out.total_units, 1440);
  assert.equal(out.second_queue, false);
  assert.equal(out.second_scheduler, false);
  assert.equal(out.second_daemon, false);
  assert.equal(out.self_refill, false);
  assert.equal(out.reuses_existing_runtime, true);
  assert.equal(out.reuses_existing_work_pump, true);
  assert.equal(out.prod_authorized, false);
  assert.equal(out.trading_access, false);
  assert.equal(out.additional_cost_eur, 0);
});

test('paid Enterprise unlocks JOB001 to its verified live 180 cap, never the documented 500 platform ceiling', () => {
  const out = plan({ lanes: 500, units_per_lane: 1, cycle_base: 100 });
  assert.equal(policy.entitlement.enterprise_organization_verified_for_canonical_repo, true);
  assert.equal(policy.entitlement.enterprise_actions_concurrency_entitlement_verified, true);
  assert.equal(out.entitlement_state, 'PAID_ACTIONS_CONCURRENCY_VERIFIED');
  assert.equal(out.requested_lanes, 500);
  assert.equal(out.lanes, 180);
  assert.equal(out.hard_cap, 180);
  assert.equal(out.matrix.length, 180);
  assert.equal(out.total_units, 180);
});

test('documented 500 platform intent remains bounded by live 180 and matrix ceilings', () => {
  const out = plan({ lanes: 500, units_per_lane: 1 });
  assert.equal(policy.entitlement.paid_enterprise_standard_runner_concurrent_jobs_ceiling, 500);
  assert.equal(policy.entitlement.enterprise_actions_concurrency_entitlement_verified, true);
  assert.equal(policy.entitlement.matrix_jobs_per_workflow_run_ceiling, 256);
  assert.equal(out.requested_lanes, 500);
  assert.equal(out.lanes, 180);
  assert.equal(out.hard_cap, 180);
  assert.equal(out.platform_request_ceiling, 500);
  assert.equal(out.matrix_ceiling, 256);
});

test('loss of paid entitlement falls back to the standard 20-lane gate', () => {
  const fallback = structuredClone(policy);
  fallback.entitlement.enterprise_actions_concurrency_entitlement_verified = false;
  fallback.entitlement.enterprise_account_state = 'TRIAL';
  const out = planJob001ActionsBurstV1({
    contract: JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT,
    policy: fallback,
    request: { lanes: 180, units_per_lane: 1 },
  });
  assert.equal(out.entitlement_state, 'ORG_VERIFIED_ACTIONS_CONCURRENCY_UNVERIFIED');
  assert.equal(out.lanes, 20);
  assert.equal(out.hard_cap, 20);
});

test('loss of organization evidence also remains fail-closed', () => {
  const unverified = structuredClone(policy);
  unverified.entitlement.enterprise_organization_verified_for_canonical_repo = false;
  unverified.entitlement.enterprise_actions_concurrency_entitlement_verified = false;
  const out = planJob001ActionsBurstV1({
    contract: JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT,
    policy: unverified,
    request: { lanes: 180, units_per_lane: 1 },
  });
  assert.equal(out.entitlement_state, 'ENTITLEMENT_UNVERIFIED');
  assert.equal(out.lanes, 20);
  assert.equal(out.hard_cap, 20);
});

test('burst rejects authority expansion in policy', () => {
  const unsafe = structuredClone(policy);
  unsafe.authority.prod_write_authorized = true;
  assert.throws(() => planJob001ActionsBurstV1({ contract: JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT, policy: unsafe }), /AUTHORITY_OR_COST_DENIED/);
});

test('burst rejects a second scheduler or daemon in canonical contract', () => {
  assert.throws(() => planJob001ActionsBurstV1({ contract: { ...JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT, second_scheduler: true }, policy }), /CANONICAL_CONTROL_PLANE_REQUIRED/);
  assert.throws(() => planJob001ActionsBurstV1({ contract: { ...JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT, second_daemon: true }, policy }), /CANONICAL_CONTROL_PLANE_REQUIRED/);
});

test('cycle allocation is deterministic and bounded', () => {
  const a = plan({ lanes: 3, units_per_lane: 4, cycle_base: 999995 });
  const b = plan({ lanes: 3, units_per_lane: 4, cycle_base: 999995 });
  assert.deepEqual(a.matrix, b.matrix);
  assert.deepEqual(a.matrix.map(x => x.cycle_start), [999995, 999999, 3]);
});
