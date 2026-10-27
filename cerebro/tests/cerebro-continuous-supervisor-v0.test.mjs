import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from '../runtime/durable-worker-runner-v1.mjs';
import { CerebroContinuousSupervisorV0, CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT } from '../runtime/cerebro-continuous-supervisor-v0.mjs';

const CTX = Object.freeze({ company_id: 'fenix', engine_id: 'TEST-001', environment: 'PREPROD', version: 'v1' });

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-continuous-supervisor-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const worker = new DurableWorkerRunnerV1({
    job_runtime: queue,
    worker_id: 'continuous-worker-test',
    lease_ms: 1000,
    heartbeat_ms: 20,
    max_concurrency: 2,
    max_per_company: 1,
  });
  return { queue, worker };
}

function supervisor(queue, worker, overrides = {}) {
  return new CerebroContinuousSupervisorV0({ job_runtime: queue, worker, contexts: [CTX], idle_delay_ms: 0, ...overrides });
}

test('continuous supervisor drains work then keeps polling instead of exiting on idle', async t => {
  const { queue, worker } = fixture(t);
  queue.enqueue({ name: 'objective.run', context: CTX, payload: { objective: 'A03' }, timeout_ms: 500 });
  worker.register({ name: 'objective.run', handler: async ({ payload }) => ({ covered: payload.objective }) });
  const loop = supervisor(queue, worker);
  const stopped = await loop.start({ max_cycles: 2 });
  const jobs = queue.listForContext(CTX);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].status, 'SUCCEEDED');
  assert.deepEqual(jobs[0].result, { covered: 'A03' });
  assert.equal(stopped.cycles, 2);
  assert.equal(stopped.last_outcome.idle, true);
});

test('watchdog reclaims an expired lease and worker resumes it without duplicate enqueue', async t => {
  const { queue, worker } = fixture(t);
  queue.enqueue({
    name: 'resume.me', context: CTX, timeout_ms: 500, max_attempts: 3,
    retry: { base_delay_ms: 1, max_delay_ms: 1, jitter_ratio: 0 }, now_ms: 1000,
  });
  const first = queue.claim({ context: CTX, worker_id: 'crashed-worker', now_ms: 1000, lease_ms: 1000 });
  assert.equal(first.status, 'RUNNING');
  worker.register({ name: 'resume.me', handler: async () => ({ resumed: true }) });
  const loop = supervisor(queue, worker);
  const result = await loop.tick({ now_ms: 2000 });
  assert.equal(result.repaired.length, 1);
  assert.equal(queue.listForContext(CTX).length, 1);
  assert.equal(queue.listForContext(CTX)[0].status, 'SUCCEEDED');
  assert.deepEqual(queue.listForContext(CTX)[0].result, { resumed: true });
});

test('kill switch stops polling before queued work is executed', async t => {
  const { queue, worker } = fixture(t);
  queue.enqueue({ name: 'must.wait', context: CTX, timeout_ms: 500 });
  worker.register({ name: 'must.wait', handler: async () => ({ should_not_run: true }) });
  const loop = supervisor(queue, worker);
  loop.stop('POLICY_KILL_SWITCH');
  const result = await loop.start({ max_cycles: 1 });
  assert.equal(result.enabled, false);
  assert.equal(result.stop_reason, 'POLICY_KILL_SWITCH');
  assert.equal(queue.listForContext(CTX)[0].status, 'QUEUED');
});

test('continuous supervisor rejects PROD context and does not invent PROD authority', t => {
  const { queue, worker } = fixture(t);
  assert.throws(() => new CerebroContinuousSupervisorV0({
    job_runtime: queue,
    worker,
    contexts: [{ ...CTX, environment: 'PROD' }],
    environment: 'PROD',
  }), /PREPROD/);
});

test('contract is zero-additional-cost, multiempresa, kill-switchable and Trading-isolated', () => {
  assert.equal(CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT.environment, 'PREPROD');
  assert.equal(CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT.kill_switch, true);
  assert.equal(CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT.prod_authorized, false);
  assert.equal(CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT.prod_writes, false);
  assert.equal(CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT.trading_access, false);
  assert.deepEqual(CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT.multiempresa_context, ['company_id', 'engine_id', 'environment', 'version']);
  assert.equal(CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT.physical_always_on_claim, false);
});
