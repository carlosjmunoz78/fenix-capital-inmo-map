import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT } from '../runtime/job001-ledger-control-plane-v1.mjs';
import { CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT } from '../runtime/cerebro-supervisor-entrypoint-v1.mjs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-cloud-useful-continuous-worker-v1.yml', import.meta.url), 'utf8');

function expectLine(fragment) {
  assert.ok(workflow.includes(fragment), `missing sustained-worker contract fragment: ${fragment}`);
}

test('canonical JOB-001 control and physical entrypoint agree on 48/64/48 logical capacity', () => {
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.target_useful_default, 48);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_global_default, 64);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_company_default, 48);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_deepseek_default, 8);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_repo_write_default, 1);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.second_queue, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.second_scheduler, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.second_daemon, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.prod_authorized, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.trading_access, false);

  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.target_useful, 48);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_global, 64);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_company, 48);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_deepseek, 8);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_repo_write, 1);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.second_daemon, false);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.second_scheduler, false);
});

test('sustained workflow keeps JOB-001 logical 48/64 while GitHub executor slots are separately reserved', () => {
  expectLine("description: 'Sustained useful-work logical lane 0..63; GitHub executor admission is separately bounded'");
  expectLine("CEREBRO_INITIAL_CONCURRENCY: '48'");
  expectLine("CEREBRO_MAX_CONCURRENCY: '64'");
  expectLine("CEREBRO_MAX_PER_COMPANY: '48'");
  expectLine("CEREBRO_MAX_DEEPSEEK_CONCURRENCY: '8'");
  expectLine("CEREBRO_MAX_REPO_WRITE_CONCURRENCY: '1'");
  expectLine("CEREBRO_GITHUB_SUSTAINED_ACTIVE_LANES: '12'");
  expectLine("CEREBRO_GITHUB_ACTIONS_OBSERVED_CAPACITY: '20'");
  expectLine("CEREBRO_GITHUB_ACTIONS_RESERVED_FOR_GATES: '8'");
  expectLine('test "$lane" -ge 0 && test "$lane" -le 63');
  assert.ok(!workflow.includes("CEREBRO_MAX_CONCURRENCY: '68'"));
  assert.ok(!workflow.includes("CEREBRO_MAX_PER_COMPANY: '68'"));
  assert.ok(!workflow.includes('-le 67'));
});

test('high sustained lanes retire green and cannot self-refill after executor admission denies them', () => {
  const admission = workflow.indexOf('Reserve GitHub Actions executor capacity for safety gates');
  const missionExecution = workflow.indexOf('Execute sustained mission-derived lease with V0 fallback');
  const selfRefill = workflow.indexOf('Self-refill sustained lane before releasing capacity');
  assert.ok(admission >= 0, 'executor admission gate missing');
  assert.ok(missionExecution > admission, 'mission execution must occur only after executor admission');
  assert.ok(selfRefill > missionExecution, 'self-refill must remain after mission execution');
  expectLine("if [ \"$lane\" -ge \"$CEREBRO_GITHUB_SUSTAINED_ACTIVE_LANES\" ]; then");
  expectLine("echo 'active=false' >> \"$GITHUB_OUTPUT\"");
  expectLine('executor_admission=RETIRED_FOR_GATE_CAPACITY');
  expectLine("if: success() && steps.executor_admission.outputs.active == 'true'");
  expectLine("if: steps.executor_admission.outputs.active == 'true'");
});

test('sustained worker executes the canonical control-plane contract before mission work', () => {
  const contractGate = workflow.indexOf('Enforce canonical JOB-001 Control Plane capacity contract');
  const missionExecution = workflow.indexOf('Execute sustained mission-derived lease with V0 fallback');
  assert.ok(contractGate >= 0, 'canonical JOB-001 contract gate missing');
  assert.ok(missionExecution > contractGate, 'mission execution must occur only after JOB-001 contract gate');
  expectLine('job001-ledger-control-plane-cli-v1.mjs contract');
  expectLine("target_useful_default:48");
  expectLine("max_global_default:64");
  expectLine("max_company_default:48");
  expectLine("max_deepseek_default:8");
  expectLine("max_repo_write_default:1");
});

test('capacity reservation remains PREPROD/zero-paid/no PROD/no Trading and adds no runtime', () => {
  expectLine("CEREBRO_SUPERVISOR_ENV: PREPROD");
  expectLine("CEREBRO_ALLOW_PAID_FANOUT: 'NO'");
  expectLine("CEREBRO_PROD_WRITE: 'false'");
  expectLine("CEREBRO_TRADING_ACCESS: 'false'");
  assert.ok(workflow.includes('mission-derived-useful-work-v1.mjs'));
  assert.ok(workflow.includes('Self-refill sustained lane before releasing capacity'));
  assert.ok(!workflow.includes('new_queue'));
  assert.ok(!workflow.includes('new_scheduler'));
  assert.ok(!workflow.includes('new_daemon'));
});
