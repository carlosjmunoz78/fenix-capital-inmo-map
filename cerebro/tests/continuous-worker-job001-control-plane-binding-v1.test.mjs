import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT } from '../runtime/job001-ledger-control-plane-v1.mjs';
import { CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT } from '../runtime/cerebro-supervisor-entrypoint-v1.mjs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-cloud-useful-continuous-worker-v1.yml', import.meta.url), 'utf8');

function expectLine(fragment) {
  assert.ok(workflow.includes(fragment), `missing sustained-worker contract fragment: ${fragment}`);
}

test('canonical JOB-001 control and physical entrypoint agree on verified 360/360/360', () => {
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.target_useful_default, 360);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_global_default, 360);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_company_default, 360);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_deepseek_default, 8);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_repo_write_default, 1);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.second_queue, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.second_scheduler, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.second_daemon, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.prod_authorized, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.trading_access, false);

  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.target_useful, 360);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_global, 360);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_company, 360);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_deepseek, 8);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_repo_write, 1);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.second_daemon, false);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.second_scheduler, false);
});

test('sustained GitHub worker uses all 68 lanes under the canonical 360-cap contract', () => {
  expectLine("description: 'Sustained useful-work lane 0..67'");
  expectLine("CEREBRO_INITIAL_CONCURRENCY: '360'");
  expectLine("CEREBRO_MAX_CONCURRENCY: '360'");
  expectLine("CEREBRO_MAX_PER_COMPANY: '360'");
  expectLine("CEREBRO_MAX_DEEPSEEK_CONCURRENCY: '8'");
  expectLine("CEREBRO_MAX_REPO_WRITE_CONCURRENCY: '1'");
  expectLine('test "${{ inputs.lane }}" -ge 0 && test "${{ inputs.lane }}" -le 67');
  expectLine("CEREBRO_REARM_LANE_LIMIT: '68'");
  expectLine("CEREBRO_ENTERPRISE_ENTITLEMENT_VERIFIED: 'true'");
});

test('sustained worker executes canonical control plane then falls through to continuous useful work after Mission DAG exhaustion', () => {
  const contractGate = workflow.indexOf('Enforce canonical JOB-001 Control Plane capacity contract');
  const missionExecution = workflow.indexOf('Execute sustained mission lease with continuous useful fallback');
  assert.ok(contractGate >= 0, 'canonical JOB-001 contract gate missing');
  assert.ok(missionExecution > contractGate, 'mission execution must occur only after JOB-001 contract gate');
  expectLine('job001-ledger-control-plane-cli-v1.mjs contract');
  expectLine('target_useful_default:360');
  expectLine('max_global_default:360');
  expectLine('max_company_default:360');
  expectLine('max_deepseek_default:8');
  expectLine('max_repo_write_default:1');
  expectLine('continuous-useful-work-factory-v0.mjs');
  expectLine('Self-refill sustained lane while a useful source is available');
  expectLine('continuous_source_available=true');
  assert.ok(!workflow.includes('UNIQUE_MISSION_BACKLOG_EXHAUSTED'));
});

test('transition remains PREPROD zero-paid no-PROD no-Trading', () => {
  expectLine('CEREBRO_SUPERVISOR_ENV: PREPROD');
  expectLine("CEREBRO_ALLOW_PAID_FANOUT: 'NO'");
  expectLine("CEREBRO_PROD_WRITE: 'false'");
  expectLine("CEREBRO_TRADING_ACCESS: 'false'");
  assert.ok(workflow.includes('mission-derived-useful-work-v1.mjs'));
  assert.ok(workflow.includes('continuous-useful-work-factory-v0.mjs'));
});
