import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { AdaptiveHierarchicalAgentWorkPumpV3 } from '../runtime/adaptive-hierarchical-agent-work-pump-v3.mjs';
import {
  maintenanceDrainConfigV1,
  isMaintenanceDrainActiveV1,
  installMaintenanceDrainV1,
  uninstallMaintenanceDrainV1ForTests,
  JOB001_MAINTENANCE_DRAIN_V1_CONTRACT,
} from '../runtime/job001-maintenance-drain-v1.mjs';

const context = Object.freeze({ company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'drain-test-v1' });

function tempState() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-drain-v1-'));
  return {
    root,
    journal: path.join(root, 'jobs.v8journal'),
    drain: path.join(root, 'DRAIN_MODE'),
    env: { CEREBRO_ENVIRONMENT: 'PREPROD', CEREBRO_SUPERVISOR_ENV: 'PREPROD', CEREBRO_SUPERVISOR_STATE_DIR: root },
  };
}

test('drain config is PREPROD-only and uses the canonical state sentinel', () => {
  const state = tempState();
  try {
    const config = maintenanceDrainConfigV1(state.env);
    assert.equal(config.environment, 'PREPROD');
    assert.equal(config.drain_file, path.resolve(state.drain));
    assert.equal(isMaintenanceDrainActiveV1(config), false);
    assert.throws(() => maintenanceDrainConfigV1({ CEREBRO_ENVIRONMENT: 'PROD' }), /PREPROD_ONLY/);
  } finally {
    fs.rmSync(state.root, { recursive: true, force: true });
  }
});

test('DRAIN_MODE blocks new claims without cancelling or mutating queued jobs and removal resumes them', () => {
  const state = tempState();
  uninstallMaintenanceDrainV1ForTests();
  try {
    const runtime = new DurableJobRuntimeV1({ file_path: state.journal });
    const enqueued = runtime.enqueue({
      name: 'runtime.health.probe',
      context,
      payload: { safe: true },
      idempotency_key: 'drain-preserve-queue-v1',
      now_ms: 1,
    });
    assert.equal(enqueued.accepted, true);

    fs.writeFileSync(state.drain, 'maintenance\n');
    const receipt = installMaintenanceDrainV1({ env: state.env });
    assert.equal(receipt.mode, 'DRAIN');
    assert.equal(receipt.behavior.running_jobs_cancelled, false);
    assert.equal(runtime.claim({ context, worker_id: 'worker-test', now_ms: 2, lease_ms: 10_000 }), null);

    const during = runtime.listForContext(context);
    assert.equal(during.length, 1);
    assert.equal(during[0].status, 'QUEUED');
    assert.equal(during[0].attempts, 0);

    fs.rmSync(state.drain, { force: true });
    const claimed = runtime.claim({ context, worker_id: 'worker-test', now_ms: 3, lease_ms: 10_000 });
    assert.equal(claimed.status, 'RUNNING');
    assert.equal(claimed.attempts, 1);
  } finally {
    uninstallMaintenanceDrainV1ForTests();
    fs.rmSync(state.root, { recursive: true, force: true });
  }
});

test('drain suppresses adaptive work-pump refill and exposes reversible telemetry', () => {
  const state = tempState();
  uninstallMaintenanceDrainV1ForTests();
  try {
    const runtime = new DurableJobRuntimeV1({ file_path: state.journal });
    const pump = new AdaptiveHierarchicalAgentWorkPumpV3({
      job_runtime: runtime,
      context,
      model_capacity: 2,
      max_generated_tasks: 20,
      max_subtasks_per_block: 2,
      max_total_subtasks: 4,
      target_subtasks_per_block: 2,
    });

    fs.writeFileSync(state.drain, 'maintenance\n');
    installMaintenanceDrainV1({ env: state.env });
    const before = runtime.listForContext(context).length;
    const snapshot = pump.reconcile();
    const after = runtime.listForContext(context).length;
    assert.equal(after, before);
    assert.equal(snapshot.maintenance_drain, true);
    assert.equal(snapshot.admission_open, false);
    assert.equal(snapshot.refill_suppressed, true);
    assert.equal(snapshot.enqueued_children_this_reconcile, 0);

    fs.rmSync(state.drain, { force: true });
    const resumed = pump.snapshot();
    assert.equal(resumed.maintenance_drain, false);
    assert.equal(resumed.admission_open, true);
  } finally {
    uninstallMaintenanceDrainV1ForTests();
    fs.rmSync(state.root, { recursive: true, force: true });
  }
});

test('contract remains additive, reversible, zero-cost and without PROD or Trading authority', () => {
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.finish_running_jobs, true);
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.block_new_claims, true);
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.suppress_adaptive_refill, true);
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.preserve_queue, true);
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.second_queue, false);
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.second_scheduler, false);
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.second_daemon, false);
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.additional_cost_eur, 0);
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.prod_authorized, false);
  assert.equal(JOB001_MAINTENANCE_DRAIN_V1_CONTRACT.trading_access, false);
});
