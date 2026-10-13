import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1, retryDelayMs, DURABLE_JOB_RUNTIME_V1_CONTRACT } from '../runtime/durable-job-runtime-v1.mjs';

const CTX = Object.freeze({ company_id: 'fenix', engine_id: 'TEST-001', environment: 'PREPROD', version: 'v1' });

function tempJournal(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-durable-jobs-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'jobs.v8journal');
}

function runtime(t) {
  return new DurableJobRuntimeV1({ file_path: tempJournal(t) });
}

test('durable V1 keeps context-scoped idempotency without duplicate execution', t => {
  const queue = runtime(t);
  const input = { name: 'sync.crm', context: CTX, payload: { lead_id: 7 }, idempotency_key: 'lead-7', now_ms: 1000 };
  const first = queue.enqueue(input);
  const second = queue.enqueue(input);
  assert.equal(first.accepted, true);
  assert.equal(second.accepted, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.job.job_id, first.job.job_id);
  assert.equal(queue.listForContext(CTX).length, 1);
});

test('retry uses deterministic exponential backoff with bounded pseudo-stochastic jitter', () => {
  const a = retryDelayMs({ job_id: 'job_x', attempt: 3, base_delay_ms: 1000, max_delay_ms: 60000, jitter_ratio: 0.2 });
  const b = retryDelayMs({ job_id: 'job_x', attempt: 3, base_delay_ms: 1000, max_delay_ms: 60000, jitter_ratio: 0.2 });
  assert.equal(a, b);
  assert.ok(a >= 3200 && a <= 4800);
});

test('lease heartbeat extends ownership and checkpoint survives restart for resume', t => {
  const file = tempJournal(t);
  const q1 = new DurableJobRuntimeV1({ file_path: file });
  const enqueued = q1.enqueue({ name: 'long.research', context: CTX, payload: { topic: 'x' }, now_ms: 1000 });
  const running = q1.claim({ context: CTX, worker_id: 'worker-a', now_ms: 1100, lease_ms: 1000 });
  assert.equal(running.job_id, enqueued.job.job_id);
  q1.checkpoint({ job_id: running.job_id, worker_id: 'worker-a', checkpoint: { cursor: 42 }, now_ms: 1200 });
  const heartbeated = q1.heartbeat({ job_id: running.job_id, worker_id: 'worker-a', now_ms: 1500, lease_ms: 2000 });
  assert.equal(heartbeated.lease_expires_at_ms, 3500);

  const q2 = new DurableJobRuntimeV1({ file_path: file });
  const recovered = q2.get(running.job_id);
  assert.equal(recovered.status, 'RUNNING');
  assert.deepEqual(recovered.checkpoint, { cursor: 42 });
  assert.equal(recovered.lease_expires_at_ms, 3500);
});

test('watchdog repairs expired work, preserves checkpoint and makes it claimable after backoff', t => {
  const queue = runtime(t);
  const enqueued = queue.enqueue({
    name: 'crawl.city', context: CTX, now_ms: 1000, max_attempts: 3,
    retry: { base_delay_ms: 100, max_delay_ms: 1000, jitter_ratio: 0 }
  });
  const running = queue.claim({ context: CTX, worker_id: 'worker-a', now_ms: 1100, lease_ms: 1000 });
  queue.checkpoint({ job_id: running.job_id, worker_id: 'worker-a', checkpoint: { page: 8 }, now_ms: 1200 });

  const repaired = queue.watchdog({ now_ms: 2100 });
  assert.equal(repaired.length, 1);
  assert.equal(repaired[0].status, 'RETRY_WAIT');
  assert.equal(repaired[0].next_attempt_at_ms, 2200);
  assert.deepEqual(repaired[0].checkpoint, { page: 8 });
  assert.equal(queue.claim({ context: CTX, worker_id: 'worker-b', now_ms: 2199, lease_ms: 1000 }), null);
  const resumed = queue.claim({ context: CTX, worker_id: 'worker-b', now_ms: 2200, lease_ms: 1000 });
  assert.equal(resumed.attempts, 2);
  assert.deepEqual(resumed.checkpoint, { page: 8 });
});

test('failed max attempt and expired max-attempt lease go to dead letter instead of looping', t => {
  const queue = runtime(t);
  queue.enqueue({ name: 'fragile', context: CTX, now_ms: 1000, max_attempts: 2, retry: { base_delay_ms: 10, max_delay_ms: 100, jitter_ratio: 0 } });
  const first = queue.claim({ context: CTX, worker_id: 'w1', now_ms: 1000, lease_ms: 1000 });
  const retry = queue.fail({ job_id: first.job_id, worker_id: 'w1', error: new Error('first'), now_ms: 1100 });
  assert.equal(retry.status, 'RETRY_WAIT');
  const second = queue.claim({ context: CTX, worker_id: 'w2', now_ms: retry.next_attempt_at_ms, lease_ms: 1000 });
  const dead = queue.fail({ job_id: second.job_id, worker_id: 'w2', error: 'second', now_ms: second.claimed_at_ms + 1 });
  assert.equal(dead.status, 'DEAD_LETTER');
  assert.equal(dead.error, 'second');
  assert.equal(queue.claim({ context: CTX, worker_id: 'w3', now_ms: 999999, lease_ms: 1000 }), null);
});

test('wrong worker cannot heartbeat, checkpoint, complete or fail another lease', t => {
  const queue = runtime(t);
  queue.enqueue({ name: 'secure-owner', context: CTX, now_ms: 1000 });
  const running = queue.claim({ context: CTX, worker_id: 'owner', now_ms: 1000, lease_ms: 1000 });
  assert.throws(() => queue.heartbeat({ job_id: running.job_id, worker_id: 'intruder', now_ms: 1100, lease_ms: 1000 }), /does not own/);
  assert.throws(() => queue.checkpoint({ job_id: running.job_id, worker_id: 'intruder', checkpoint: {}, now_ms: 1100 }), /does not own/);
  assert.throws(() => queue.complete({ job_id: running.job_id, worker_id: 'intruder', result: {}, now_ms: 1100 }), /does not own/);
  assert.throws(() => queue.fail({ job_id: running.job_id, worker_id: 'intruder', error: 'x', now_ms: 1100 }), /does not own/);
});

test('completion is durable and terminal while cancellation is idempotent', t => {
  const file = tempJournal(t);
  const q1 = new DurableJobRuntimeV1({ file_path: file });
  q1.enqueue({ name: 'finish', context: CTX, now_ms: 1000 });
  const running = q1.claim({ context: CTX, worker_id: 'w', now_ms: 1000, lease_ms: 1000 });
  const done = q1.complete({ job_id: running.job_id, worker_id: 'w', result: { ok: true }, now_ms: 1100 });
  assert.equal(done.status, 'SUCCEEDED');
  const unchanged = q1.cancel({ job_id: done.job_id, reason: 'too-late', now_ms: 1200 });
  assert.equal(unchanged.status, 'SUCCEEDED');
  const q2 = new DurableJobRuntimeV1({ file_path: file });
  assert.deepEqual(q2.get(done.job_id).result, { ok: true });
});

test('contract remains zero-additional-cost, PREPROD-only and Trading-isolated', () => {
  assert.equal(DURABLE_JOB_RUNTIME_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(DURABLE_JOB_RUNTIME_V1_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(DURABLE_JOB_RUNTIME_V1_CONTRACT.prod_writes, false);
  assert.equal(DURABLE_JOB_RUNTIME_V1_CONTRACT.trading_access, false);
  assert.equal(DURABLE_JOB_RUNTIME_V1_CONTRACT.watchdog, true);
  assert.equal(DURABLE_JOB_RUNTIME_V1_CONTRACT.checkpoint_resume, true);
});
