import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planJob001ActionsBurstV1 } from '../runtime/job001-actions-burst-router-v1.mjs';
import { JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT } from '../runtime/job001-ledger-control-plane-v1.mjs';

const policy = JSON.parse(fs.readFileSync(new URL('../config/github-actions-burst.v1.json', import.meta.url), 'utf8'));

function plan(request = {}) {
  return planJob001ActionsBurstV1({ contract: JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT, policy, request });
}

test('default burst is finite PREPROD and reuses canonical JOB001 control plane', () => {
  const out = plan();
  assert.equal(out.environment, 'PREPROD');
  assert.equal(out.mode, 'FINITE_BURST');
  assert.equal(out.entitlement_state, 'ENTERPRISE_VERIFIED');
  assert.equal(out.lanes, 8);
  assert.equal(out.units_per_lane, 8);
  assert.equal(out.total_units, 64);
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

test('verified Enterprise entitlement allows JOB001 above the former 16-lane gate but respects company cap', () => {
  const out = plan({ lanes: 64, units_per_lane: 2, cycle_base: 100 });
  assert.equal(out.entitlement_state, 'ENTERPRISE_VERIFIED');
  assert.equal(out.requested_lanes, 64);
  assert.equal(out.lanes, 48);
  assert.equal(out.hard_cap, 48);
  assert.equal(out.matrix.length, 48);
  assert.equal(out.total_units, 96);
});

test('a 500-lane request is accepted at platform intent level but JOB001 cannot bypass its canonical company cap', () => {
  const out = plan({ lanes: 500, units_per_lane: 1 });
  assert.equal(policy.entitlement.enterprise_standard_runner_concurrent_jobs_ceiling, 500);
  assert.equal(policy.entitlement.enterprise_organization_verified_for_canonical_repo, true);
  assert.equal(policy.entitlement.matrix_jobs_per_workflow_run_ceiling, 256);
  assert.equal(out.entitlement_state, 'ENTERPRISE_VERIFIED');
  assert.equal(out.requested_lanes, 500);
  assert.equal(out.lanes, 48);
  assert.equal(out.hard_cap, 48);
  assert.equal(out.platform_request_ceiling, 500);
  assert.equal(out.matrix_ceiling, 256);
});

test('fail-closed rollback still caps an explicitly unverified policy at 16 lanes', () => {
  const unverified = structuredClone(policy);
  unverified.entitlement.enterprise_organization_verified_for_canonical_repo = false;
  const out = planJob001ActionsBurstV1({
    contract: JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT,
    policy: unverified,
    request: { lanes: 64, units_per_lane: 1 },
  });
  assert.equal(out.entitlement_state, 'ENTITLEMENT_UNVERIFIED');
  assert.equal(out.lanes, 16);
  assert.equal(out.hard_cap, 16);
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
