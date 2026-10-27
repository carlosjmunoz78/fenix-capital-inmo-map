import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { HierarchicalAgentWorkPumpV2 } from '../runtime/hierarchical-agent-work-pump-v2.mjs';

const CTX = Object.freeze({ company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'work-pump-v2' });

function tempDir(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function meta(job) { return job.payload?.__work_pump ?? null; }

function cancelOtherParents(queue, keepBlock) {
  for (const job of queue.listForContext(CTX)) {
    const m = meta(job);
    if (m?.kind === 'BLOCK_DECOMPOSE' && m.block_id !== keepBlock) queue.cancel({ job_id: job.job_id, reason: 'TEST_SCOPE' });
  }
}

function completeNext(queue, result) {
  const job = queue.claim({ context: CTX, worker_id: 'test-worker', lease_ms: 10_000 });
  assert.ok(job, 'expected a claimable job');
  return queue.complete({ job_id: job.job_id, worker_id: 'test-worker', result });
}

function twelveIndependentTasks() {
  return Array.from({ length: 12 }, (_, index) => ({
    subtask_id: `m${String(index + 1).padStart(2, '0')}`,
    title: `Microtask ${index + 1}`,
    objective: `Produce bounded deliverable ${index + 1}`,
    depends_on: [],
    priority: 100 + index,
  }));
}

test('V2 preserves 25-block seed and materializes a 12-way useful microtask wave', t => {
  const dir = tempDir(t, 'cerebro-pump-v2-');
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const pump = new HierarchicalAgentWorkPumpV2({ job_runtime: queue, context: CTX, scope_version: 'test-v2' });

  const first = pump.seed();
  const second = pump.seed();
  assert.equal(first.accepted, 25);
  assert.equal(second.accepted, 0);
  assert.equal(second.duplicates, 25);
  cancelOtherParents(queue, 'W00');

  const parent = completeNext(queue, { output_text: JSON.stringify({ independent_subtasks: twelveIndependentTasks() }) });
  assert.equal(meta(parent).block_id, 'W00');

  const snapshot = pump.reconcile();
  assert.equal(snapshot.enqueued_children_this_reconcile, 12);
  assert.equal(snapshot.theoretical_leaf_target, 300);
  assert.equal(snapshot.target_subtasks_per_block, 12);
  assert.equal(snapshot.max_total_subtasks, 400);
  assert.equal(snapshot.useful_queued, 12);
  assert.equal(snapshot.useful_running, 0);
  assert.equal(snapshot.starvation, false);
  assert.equal(snapshot.watchers_count_as_useful_work, false);

  const children = queue.listForContext(CTX).filter(job => meta(job)?.kind === 'BLOCK_SUBTASK' && meta(job)?.block_id === 'W00');
  assert.equal(children.length, 12);
  assert.deepEqual(children.map(job => meta(job).subtask_id).sort(), twelveIndependentTasks().map(item => item.subtask_id).sort());

  const duplicate = pump.reconcile();
  assert.equal(duplicate.enqueued_children_this_reconcile, 0);
  assert.equal(queue.listForContext(CTX).filter(job => meta(job)?.kind === 'BLOCK_SUBTASK' && meta(job)?.block_id === 'W00').length, 12);
});

test('V2 exposes starvation only when unfinished scope has no useful queued/running work', t => {
  const dir = tempDir(t, 'cerebro-pump-v2-starvation-');
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const disabled = new HierarchicalAgentWorkPumpV2({ job_runtime: queue, context: CTX, scope_version: 'disabled-v2', enabled: false });
  assert.equal(disabled.reconcile().status, 'DISABLED');

  const pump = new HierarchicalAgentWorkPumpV2({ job_runtime: queue, context: CTX, scope_version: 'active-v2' });
  const snapshot = pump.reconcile();
  assert.equal(snapshot.self_heal_seed_accepted, 25);
  assert.equal(snapshot.useful_queued, 25);
  assert.equal(snapshot.starvation, false);
  assert.equal(snapshot.low_backlog, false);
});
