import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1, DURABLE_WORKER_RUNNER_V1_CONTRACT } from '../runtime/durable-worker-runner-v1.mjs';

const FENIX_A = Object.freeze({ company_id: 'fenix', engine_id: 'TEST-A', environment: 'PREPROD', version: 'v1' });
const FENIX_B = Object.freeze({ company_id: 'fenix', engine_id: 'TEST-B', environment: 'PREPROD', version: 'v1' });
const ACME = Object.freeze({ company_id: 'acme', engine_id: 'TEST-A', environment: 'PREPROD', version: 'v1' });

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-worker-v1-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  return { queue, dir };
}

function runner(queue, overrides = {}) {
  return new DurableWorkerRunnerV1({
    job_runtime: queue,
    worker_id: 'worker-test',
    lease_ms: 1000,
    heartbeat_ms: 20,
    max_concurrency: 4,
    max_per_company: 2,
    ...overrides
  });
}

test('runner claims, executes and durably completes a registered handler', async t => {
  const { queue } = fixture(t);
  queue.enqueue({ name: 'lead.score', context: FENIX_A, payload: { lead_id: 7 }, timeout_ms: 500 });
  const worker = runner(queue).register({ name: 'lead.score', handler: async ({ payload }) => ({ score: payload.lead_id * 10 }) });
  const outcome = await worker.runOne({ context: FENIX_A });
  assert.equal(outcome.status, 'SUCCEEDED');
  assert.equal(outcome.job.status, 'SUCCEEDED');
  assert.deepEqual(outcome.job.result, { score: 70 });
  assert.equal(worker.active_count, 0);
});

test('handler failure schedules retry and next attempt resumes from durable checkpoint', async t => {
  const { queue } = fixture(t);
  queue.enqueue({
    name: 'crawl.resume', context: FENIX_A, timeout_ms: 500, max_attempts: 3,
    retry: { base_delay_ms: 1, max_delay_ms: 10, jitter_ratio: 0 }
  });
  let resumedFrom = null;
  const worker = runner(queue).register({
    name: 'crawl.resume',
    handler: async ({ resume_from, checkpoint }) => {
      if (!resume_from) {
        checkpoint({ page: 12 });
        throw new Error('temporary upstream error');
      }
      resumedFrom = resume_from;
      return { resumed: true };
    }
  });

  const first = await worker.runOne({ context: FENIX_A });
  assert.equal(first.status, 'RETRY_SCHEDULED');
  assert.deepEqual(first.job.checkpoint, { page: 12 });
  await delay(5);
  const second = await worker.runOne({ context: FENIX_A });
  assert.equal(second.status, 'SUCCEEDED');
  assert.deepEqual(resumedFrom, { page: 12 });
  assert.deepEqual(second.job.result, { resumed: true });
});

test('timeout aborts orchestration, schedules retry and rejects late completion', async t => {
  const { queue } = fixture(t);
  queue.enqueue({
    name: 'slow.job', context: FENIX_A, timeout_ms: 30, max_attempts: 2,
    retry: { base_delay_ms: 1000, max_delay_ms: 1000, jitter_ratio: 0 }
  });
  let handlerFinished = false;
  const worker = runner(queue).register({
    name: 'slow.job',
    handler: async () => { await delay(100); handlerFinished = true; return { late: true }; }
  });

  const outcome = await worker.runOne({ context: FENIX_A });
  assert.equal(outcome.status, 'RETRY_SCHEDULED');
  assert.equal(outcome.error, 'JOB_TIMEOUT');
  assert.equal(outcome.job.status, 'RETRY_WAIT');
  await delay(110);
  assert.equal(handlerFinished, true);
  assert.equal(queue.get(outcome.job.job_id).status, 'RETRY_WAIT');
  assert.equal(queue.get(outcome.job.job_id).result, null);
});

test('background heartbeat extends lease during a long running handler', async t => {
  const { queue } = fixture(t);
  queue.enqueue({ name: 'heartbeat.job', context: FENIX_A, timeout_ms: 500 });
  const worker = runner(queue).register({ name: 'heartbeat.job', handler: async () => { await delay(90); return { ok: true }; } });
  const pending = worker.runOne({ context: FENIX_A });
  await delay(55);
  const running = queue.listForContext(FENIX_A)[0];
  assert.equal(running.status, 'RUNNING');
  assert.ok(running.heartbeat_at_ms > running.claimed_at_ms);
  assert.ok(running.lease_expires_at_ms > running.claimed_at_ms + 1000);
  const outcome = await pending;
  assert.equal(outcome.status, 'SUCCEEDED');
});

test('unknown handler fails closed into normal retry policy instead of disappearing', async t => {
  const { queue } = fixture(t);
  queue.enqueue({ name: 'missing.handler', context: FENIX_A, timeout_ms: 500, retry: { base_delay_ms: 10, max_delay_ms: 10, jitter_ratio: 0 } });
  const outcome = await runner(queue).runOne({ context: FENIX_A });
  assert.equal(outcome.status, 'DISPATCH_FAILED');
  assert.equal(outcome.reason, 'HANDLER_NOT_REGISTERED');
  assert.equal(outcome.job.status, 'RETRY_WAIT');
  assert.match(outcome.job.error, /HANDLER_NOT_REGISTERED/);
});

test('cancellation aborts active work and leaves durable terminal CANCELLED state', async t => {
  const { queue } = fixture(t);
  queue.enqueue({ name: 'cancel.me', context: FENIX_A, timeout_ms: 1000 });
  let observedAbort = false;
  const worker = runner(queue).register({
    name: 'cancel.me',
    handler: ({ signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => { observedAbort = true; reject(new Error('handler aborted')); }, { once: true });
    })
  });
  const pending = worker.runOne({ context: FENIX_A });
  await delay(10);
  const active = queue.listForContext(FENIX_A)[0];
  assert.equal(active.status, 'RUNNING');
  const cancelled = worker.cancel(active.job_id, 'POLICY_STOP');
  assert.equal(cancelled.status, 'CANCELLED');
  const outcome = await pending;
  assert.equal(observedAbort, true);
  assert.equal(outcome.status, 'CANCELLED');
  assert.equal(queue.get(active.job_id).status, 'CANCELLED');
});

test('HUMAN_REQUIRED is terminal only for the eight governed reasons', async t => {
  const { queue } = fixture(t);
  queue.enqueue({ name: 'legal.review', context: FENIX_A, timeout_ms: 500 });
  const worker = runner(queue).register({ name: 'legal.review', handler: async () => ({ status: 'HUMAN_REQUIRED', reason: 'LEGAL_REQUIRED' }) });
  const outcome = await worker.runOne({ context: FENIX_A });
  assert.equal(outcome.status, 'HUMAN_REQUIRED');
  assert.equal(outcome.reason, 'LEGAL_REQUIRED');
  assert.equal(outcome.job.status, 'SUCCEEDED');

  queue.enqueue({ name: 'bad.reason', context: FENIX_B, timeout_ms: 500, retry: { base_delay_ms: 10, max_delay_ms: 10, jitter_ratio: 0 } });
  worker.register({ name: 'bad.reason', handler: async () => ({ status: 'HUMAN_REQUIRED', reason: 'ASK_CARLOS_ANYWAY' }) });
  const invalid = await worker.runOne({ context: FENIX_B });
  assert.equal(invalid.status, 'RETRY_SCHEDULED');
  assert.match(invalid.error, /INVALID_HUMAN_REQUIRED_REASON/);
});

test('fair round enforces global and per-company concurrency while serving another company', async t => {
  const { queue } = fixture(t);
  queue.enqueue({ name: 'work', context: FENIX_A, payload: { id: 'fa' }, timeout_ms: 500 });
  queue.enqueue({ name: 'work', context: FENIX_B, payload: { id: 'fb' }, timeout_ms: 500 });
  queue.enqueue({ name: 'work', context: ACME, payload: { id: 'acme' }, timeout_ms: 500 });
  const seen = [];
  const worker = runner(queue, { max_concurrency: 2, max_per_company: 1 }).register({
    name: 'work', handler: async ({ context, payload }) => { seen.push(`${context.company_id}:${payload.id}`); await delay(20); return payload; }
  });

  const first = await worker.runFairRound({ contexts: [FENIX_A, FENIX_B, ACME] });
  assert.equal(first.length, 2);
  assert.equal(first.filter(x => x.status === 'SUCCEEDED').length, 2);
  assert.equal(seen.some(x => x.startsWith('fenix:')), true);
  assert.equal(seen.some(x => x.startsWith('acme:')), true);
  assert.equal(queue.listForContext(FENIX_A).filter(j => j.status === 'SUCCEEDED').length + queue.listForContext(FENIX_B).filter(j => j.status === 'SUCCEEDED').length, 1);

  const second = await worker.runFairRound({ contexts: [FENIX_A, FENIX_B, ACME] });
  assert.equal(second.some(x => x.status === 'SUCCEEDED'), true);
  const fenixDone = [...queue.listForContext(FENIX_A), ...queue.listForContext(FENIX_B)].filter(j => j.status === 'SUCCEEDED');
  assert.equal(fenixDone.length, 2);
});

test('runner contract remains additive, PREPROD-only, zero-cost and does not claim distributed semantics', () => {
  assert.equal(DURABLE_WORKER_RUNNER_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(DURABLE_WORKER_RUNNER_V1_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(DURABLE_WORKER_RUNNER_V1_CONTRACT.prod_writes, false);
  assert.equal(DURABLE_WORKER_RUNNER_V1_CONTRACT.trading_access, false);
  assert.equal(DURABLE_WORKER_RUNNER_V1_CONTRACT.distributed_execution_claim, false);
  assert.equal(DURABLE_WORKER_RUNNER_V1_CONTRACT.heartbeat_lease_extension, true);
  assert.equal(DURABLE_WORKER_RUNNER_V1_CONTRACT.checkpoint_resume, true);
  assert.equal(DURABLE_WORKER_RUNNER_V1_CONTRACT.human_required_reasons.length, 8);
});
