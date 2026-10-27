import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { HierarchicalAgentWorkPumpV1 } from '../runtime/hierarchical-agent-work-pump-v1.mjs';
import { DeepSeekBudgetLedgerV1 } from '../runtime/deepseek-budget-ledger-v1.mjs';
import { createDeepSeekAgentHandlerV1 } from '../runtime/deepseek-agent-handler-v1.mjs';

const CTX = Object.freeze({ company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'work-pump-v1' });

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

test('work pump seeds W00-W24 exactly once and releases only dependency-ready children', t => {
  const dir = tempDir(t, 'cerebro-l11-pump-');
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const pump = new HierarchicalAgentWorkPumpV1({ job_runtime: queue, context: CTX, scope_version: 'test-scope' });

  const first = pump.seed();
  const second = pump.seed();
  assert.equal(first.accepted, 25);
  assert.equal(second.accepted, 0);
  assert.equal(second.duplicates, 25);
  cancelOtherParents(queue, 'W00');

  const parent = completeNext(queue, {
    output_text: JSON.stringify({
      independent_subtasks: [
        { subtask_id: 'research', title: 'Research', objective: 'Produce evidence map', depends_on: [], priority: 10 },
        { subtask_id: 'integrate', title: 'Integrate', objective: 'Integrate evidence into bounded recommendation', depends_on: ['research'], priority: 20 },
      ],
    }),
  });
  assert.equal(meta(parent).block_id, 'W00');

  const afterParent = pump.reconcile();
  assert.equal(afterParent.enqueued_children_this_reconcile, 1);
  let children = queue.listForContext(CTX).filter(job => meta(job)?.kind === 'BLOCK_SUBTASK' && meta(job)?.block_id === 'W00');
  assert.deepEqual(children.map(job => meta(job).subtask_id), ['research']);

  const child = completeNext(queue, { output_text: 'research done', evidence_refs: ['test:evidence'] });
  assert.equal(meta(child).subtask_id, 'research');
  const afterResearch = pump.reconcile();
  assert.equal(afterResearch.enqueued_children_this_reconcile, 1);
  children = queue.listForContext(CTX).filter(job => meta(job)?.kind === 'BLOCK_SUBTASK' && meta(job)?.block_id === 'W00');
  assert.deepEqual(children.map(job => meta(job).subtask_id).sort(), ['integrate', 'research']);

  const duplicateReconcile = pump.reconcile();
  assert.equal(duplicateReconcile.enqueued_children_this_reconcile, 0);
});

test('invalid decomposition gets exactly one idempotent repair job and no child explosion', t => {
  const dir = tempDir(t, 'cerebro-l11-repair-');
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const pump = new HierarchicalAgentWorkPumpV1({ job_runtime: queue, context: CTX, scope_version: 'repair-scope' });
  pump.seed();
  cancelOtherParents(queue, 'W00');
  completeNext(queue, { output_text: 'not-json' });

  const one = pump.reconcile();
  const two = pump.reconcile();
  assert.equal(one.repairs_enqueued_this_reconcile, 1);
  assert.equal(two.repairs_enqueued_this_reconcile, 0);
  const repairs = queue.listForContext(CTX).filter(job => meta(job)?.kind === 'BLOCK_DECOMPOSE_REPAIR' && meta(job)?.block_id === 'W00');
  assert.equal(repairs.length, 1);
  assert.equal(queue.listForContext(CTX).filter(job => meta(job)?.kind === 'BLOCK_SUBTASK').length, 0);
});

test('plan validator rejects cycles and does not enqueue children', t => {
  const dir = tempDir(t, 'cerebro-l11-cycle-');
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const pump = new HierarchicalAgentWorkPumpV1({ job_runtime: queue, context: CTX, scope_version: 'cycle-scope' });
  pump.seed();
  cancelOtherParents(queue, 'W00');
  completeNext(queue, {
    output_text: JSON.stringify({
      independent_subtasks: [
        { subtask_id: 'a', title: 'A', objective: 'A', depends_on: ['b'], priority: 10 },
        { subtask_id: 'b', title: 'B', objective: 'B', depends_on: ['a'], priority: 10 },
      ],
    }),
  });
  const result = pump.reconcile();
  assert.equal(result.rejected_plans_this_reconcile, 1);
  assert.equal(queue.listForContext(CTX).filter(job => meta(job)?.kind === 'BLOCK_SUBTASK').length, 0);
});

test('durable DeepSeek budget survives restart and blocks projected overspend', t => {
  const dir = tempDir(t, 'cerebro-l11-budget-');
  const file = path.join(dir, 'budget.v8journal');
  const first = new DeepSeekBudgetLedgerV1({ file_path: file, hard_cap_eur: 0.10 });
  const a = first.reserve({ reservation_id: 'job:a', projected_cost_eur: 0.04 });
  assert.equal(a.allowed, true);
  assert.equal(first.snapshot().reserved_projected_eur, 0.04);

  const reopened = new DeepSeekBudgetLedgerV1({ file_path: file, hard_cap_eur: 0.10 });
  const duplicate = reopened.reserve({ reservation_id: 'job:a', projected_cost_eur: 0.04 });
  assert.equal(duplicate.allowed, true);
  assert.equal(duplicate.duplicate, true);
  const b = reopened.reserve({ reservation_id: 'job:b', projected_cost_eur: 0.07 });
  assert.equal(b.allowed, false);
  assert.equal(b.reason, 'MONEY_LIMIT');
  assert.equal(reopened.snapshot().reserved_projected_eur, 0.04);
});

test('DeepSeek handler uses durable ledger reservation once per durable job', async t => {
  const dir = tempDir(t, 'cerebro-l11-handler-');
  const ledger = new DeepSeekBudgetLedgerV1({ file_path: path.join(dir, 'budget.v8journal'), hard_cap_eur: 0.10 });
  let calls = 0;
  const provider = {
    respond: async () => ({ provider: 'deepseek', model: 'deepseek-flash', response_id: `r${++calls}`, output_text: '{}', usage: { input_tokens: 1, output_tokens: 1 } }),
  };
  const handler = createDeepSeekAgentHandlerV1({ provider, budget_ledger: ledger });
  const job = { job_id: 'stable-job', context: CTX };
  const payload = { input: 'x', projected_cost_eur: 0.04 };
  const checkpoint = () => {};
  const signal = new AbortController().signal;
  await handler({ job, payload, checkpoint, signal });
  await handler({ job, payload, checkpoint, signal });
  assert.equal(calls, 2);
  assert.equal(ledger.snapshot().reservation_count, 1);
  assert.equal(ledger.snapshot().reserved_projected_eur, 0.04);
});
