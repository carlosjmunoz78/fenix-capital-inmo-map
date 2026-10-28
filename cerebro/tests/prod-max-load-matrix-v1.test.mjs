import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from '../runtime/durable-worker-runner-v1.mjs';

const CONTEXT = Object.freeze({
  company_id: 'fenix',
  engine_id: 'PROD-MAX-GATE',
  environment: 'PREPROD',
  version: 'load-matrix-v1',
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runMatrixCase(t, count) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `cerebro-prod-max-${count}-`));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const journal = path.join(root, 'jobs.v8journal');
  const queue = new DurableJobRuntimeV1({ file_path: journal });

  for (let index = 0; index < count; index += 1) {
    const receipt = queue.enqueue({
      name: 'prod.max.safe-work',
      context: CONTEXT,
      payload: { index },
      idempotency_key: `prod-max-${count}-${index}`,
      timeout_ms: 2_000,
      max_attempts: 3,
      retry: { base_delay_ms: 1, max_delay_ms: 10, jitter_ratio: 0 },
    });
    assert.equal(receipt.accepted, true);
  }

  let active = 0;
  let peak = 0;
  const effects = new Set();
  const worker = new DurableWorkerRunnerV1({
    job_runtime: queue,
    worker_id: `prod-max-gate-${count}`,
    lease_ms: 1_000,
    heartbeat_ms: 20,
    max_concurrency: 48,
    max_per_company: 48,
  }).register({
    name: 'prod.max.safe-work',
    handler: async ({ payload }) => {
      active += 1;
      peak = Math.max(peak, active);
      try {
        const effectKey = `${count}:${payload.index}`;
        assert.equal(effects.has(effectKey), false, `duplicate side effect ${effectKey}`);
        effects.add(effectKey);
        await delay(2);
        return { ok: true, index: payload.index, effect_key: effectKey };
      } finally {
        active -= 1;
      }
    },
  });

  const outcomes = await worker.runSaturatedRound({ contexts: [CONTEXT], completion_budget: count });
  assert.equal(outcomes.length, count);
  assert.equal(outcomes.filter(item => item.status === 'SUCCEEDED').length, count);
  assert.equal(effects.size, count);
  assert.ok(peak >= Math.min(count, 2), `expected concurrent work, got peak=${peak}`);
  assert.ok(peak <= Math.min(count, 48), `capacity exceeded: peak=${peak}`);

  const jobs = queue.listForContext(CONTEXT);
  assert.equal(jobs.length, count);
  assert.equal(jobs.filter(job => job.status === 'SUCCEEDED').length, count);

  // Durable restore from the exact same journal must preserve all terminal state.
  const restored = new DurableJobRuntimeV1({ file_path: journal });
  const restoredJobs = restored.listForContext(CONTEXT);
  assert.equal(restoredJobs.length, count);
  assert.equal(restoredJobs.filter(job => job.status === 'SUCCEEDED').length, count);

  // Replaying an already-used idempotency key must not enqueue or execute again.
  const duplicate = restored.enqueue({
    name: 'prod.max.safe-work',
    context: CONTEXT,
    payload: { index: 0 },
    idempotency_key: `prod-max-${count}-0`,
    timeout_ms: 2_000,
  });
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(restored.listForContext(CONTEXT).length, count);

  return { count, peak, effects: effects.size };
}

for (const count of [10, 25, 50]) {
  test(`PROD_MAX deterministic durable ${count}-job gate is GREEN`, async t => {
    const result = await runMatrixCase(t, count);
    assert.equal(result.count, count);
    assert.equal(result.effects, count);
  });
}

test('PROD_MAX load matrix remains PREPROD-only and cost-free by construction', () => {
  assert.equal(CONTEXT.environment, 'PREPROD');
  assert.equal(CONTEXT.company_id, 'fenix');
  assert.equal(/trading/i.test(CONTEXT.engine_id), false);
});
