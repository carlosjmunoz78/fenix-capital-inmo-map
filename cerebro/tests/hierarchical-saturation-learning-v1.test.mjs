import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from '../runtime/durable-worker-runner-v1.mjs';
import { DynamicConcurrencyPolicyV1 } from '../runtime/dynamic-concurrency-policy-v1.mjs';
import { DynamicDagPlannerV1 } from '../runtime/dynamic-dag-planner-v1.mjs';
import { LearningCandidateSpoolV1, LEARNING_CANDIDATE_SPOOL_V1_CONTRACT } from '../runtime/learning-candidate-spool-v1.mjs';
import { CerebroContinuousSupervisorV0 } from '../runtime/cerebro-continuous-supervisor-v0.mjs';

const CTX = Object.freeze({ company_id: 'fenix', engine_id: 'L10-TEST', environment: 'PREPROD', version: 'v1' });

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function tempDir(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('saturated worker refills a freed lane before a slow sibling finishes', async t => {
  const dir = tempDir(t, 'cerebro-l10-saturation-');
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  for (const id of ['slow', 'fast-1', 'fast-2', 'fast-3']) {
    queue.enqueue({ name: 'work', context: CTX, payload: { id }, timeout_ms: 1000, idempotency_key: `work:${id}` });
  }

  let releaseSlow;
  const slowGate = new Promise(resolve => { releaseSlow = resolve; });
  const starts = [];
  const finishes = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const worker = new DurableWorkerRunnerV1({
    job_runtime: queue,
    worker_id: 'l10-worker',
    lease_ms: 1000,
    heartbeat_ms: 20,
    max_concurrency: 2,
    max_per_company: 2,
  }).register({
    name: 'work',
    handler: async ({ payload }) => {
      starts.push(payload.id);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      if (payload.id === 'slow') await slowGate;
      else await delay(8);
      inFlight -= 1;
      finishes.push(payload.id);
      return { id: payload.id };
    },
  });

  const pending = worker.runSaturatedRound({ contexts: [CTX, CTX], completion_budget: 4 });
  await delay(35);
  assert.equal(starts.includes('slow'), true);
  assert.ok(starts.length >= 3, `expected immediate refill while slow job runs; starts=${starts.join(',')}`);
  assert.equal(finishes.includes('slow'), false);
  assert.equal(maxInFlight, 2);
  releaseSlow();
  const outcomes = await pending;
  assert.equal(outcomes.filter(item => item.status === 'SUCCEEDED').length, 4);
  assert.equal(queue.listForContext(CTX).filter(job => job.status === 'SUCCEEDED').length, 4);
});

test('default DeepSeek provider ceiling remains the measured useful maximum of 8', () => {
  const policy = new DynamicConcurrencyPolicyV1({ initial_global_concurrency: 16, max_global_concurrency: 64 });
  assert.equal(policy.snapshot().max_provider_concurrency.deepseek, 8);
});

test('hierarchical blocks flatten to parallel READY subtasks and preserve real dependencies only', () => {
  const planner = DynamicDagPlannerV1.fromBlocks({
    dag_id: 'l10-hierarchy',
    blocks: [{
      block_id: 'W00',
      context: CTX,
      subtasks: [
        { subtask_id: 'research', name: 'agent.work' },
        { subtask_id: 'audit', name: 'agent.work' },
        { subtask_id: 'integrate', name: 'agent.integrate', depends_on: ['research', 'audit'] },
      ],
    }],
  });
  const initial = planner.plan();
  assert.deepEqual(initial.ready.map(task => task.task_id).sort(), ['W00/audit', 'W00/research']);
  assert.equal(initial.blocked.length, 1);
  assert.deepEqual(initial.blocked[0].waiting_for.sort(), ['W00/audit', 'W00/research']);

  const afterResearch = planner.plan({ completed_task_ids: ['W00/research'] });
  assert.deepEqual(afterResearch.ready.map(task => task.task_id), ['W00/audit']);
  assert.deepEqual(afterResearch.blocked[0].waiting_for, ['W00/audit']);

  const afterBoth = planner.plan({ completed_task_ids: ['W00/research', 'W00/audit'] });
  assert.deepEqual(afterBoth.ready.map(task => task.task_id), ['W00/integrate']);
});

test('learning candidate spool is durable, append-only and idempotent without PROD authority', t => {
  const dir = tempDir(t, 'cerebro-l10-learning-');
  const file = path.join(dir, 'learning.v8journal');
  const spool = new LearningCandidateSpoolV1({ file_path: file });
  const input = {
    context: CTX,
    task_id: 'W00/research',
    block_id: 'W00',
    subtask_id: 'research',
    outcome: { status: 'SUCCEEDED', insight: 'reuse deterministic parser' },
    evidence_refs: ['evidence:test'],
    confidence: 0.9,
    reusable_rule_candidate: { rule: 'prefer deterministic parser before model' },
    idempotency_key: 'learning:test:1',
  };
  const first = spool.append(input);
  const duplicate = spool.append(input);
  assert.equal(first.accepted, true);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(spool.size, 1);

  const reopened = new LearningCandidateSpoolV1({ file_path: file });
  assert.equal(reopened.size, 1);
  assert.equal(reopened.list()[0].governance_state, 'CANDIDATE_ONLY');
  assert.equal(reopened.list()[0].prod_mutation_authorized, false);
  assert.equal(LEARNING_CANDIDATE_SPOOL_V1_CONTRACT.direct_prod_learning, false);
});

test('continuous supervisor prefers saturated execution and emits learning receipts', async () => {
  let saturatedCalls = 0;
  let fairCalls = 0;
  let sinkCalls = 0;
  const fakeRuntime = { watchdog: () => [], listForContext: () => [] };
  const fakeWorker = {
    runFairRound: async () => { fairCalls += 1; return []; },
    runSaturatedRound: async () => {
      saturatedCalls += 1;
      return [{ status: 'SUCCEEDED', job: { job_id: 'job-1', context: CTX, status: 'SUCCEEDED', attempts: 1, payload: {}, result: { ok: true } } }];
    },
  };
  const supervisor = new CerebroContinuousSupervisorV0({
    job_runtime: fakeRuntime,
    worker: fakeWorker,
    contexts: [CTX],
    idle_delay_ms: 0,
    outcome_sink: async ({ outcome }) => { sinkCalls += 1; return { accepted: true, job_id: outcome.job.job_id }; },
  });
  const result = await supervisor.tick();
  assert.equal(result.status, 'WORKED');
  assert.equal(saturatedCalls, 1);
  assert.equal(fairCalls, 0);
  assert.equal(sinkCalls, 1);
  assert.equal(result.learning_receipts.length, 1);
  assert.equal(result.snapshot.execution_mode, 'SATURATED_CONTINUOUS');
});
