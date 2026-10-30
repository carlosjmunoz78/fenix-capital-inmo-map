import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { AdaptiveHierarchicalAgentWorkPumpV3, ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT } from '../runtime/adaptive-hierarchical-agent-work-pump-v3.mjs';

const CTX = Object.freeze({ company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'work-pump-v3-test' });

function tempDir(t, prefix = 'cerebro-pump-v3-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function meta(job) { return job.payload?.__work_pump ?? null; }

function twelveIndependentTasks(prefix = 'm') {
  return Array.from({ length: 12 }, (_, index) => ({
    subtask_id: `${prefix}${String(index + 1).padStart(2, '0')}`,
    title: `Microtask ${index + 1}`,
    objective: `Produce bounded deliverable ${index + 1}`,
    depends_on: [],
    priority: 100 + index,
  }));
}

function completeNext(queue, result) {
  const job = queue.claim({ context: CTX, worker_id: 'test-worker', lease_ms: 10_000 });
  assert.ok(job, 'expected a claimable job');
  return queue.complete({ job_id: job.job_id, worker_id: 'test-worker', result });
}

test('V3 does not let fairness starve a single ready block below measured model capacity', t => {
  const dir = tempDir(t);
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const pump = new AdaptiveHierarchicalAgentWorkPumpV3({ job_runtime: queue, context: CTX, scope_version: 'test-v3-single' });

  const seed = pump.seed();
  assert.equal(seed.accepted, 25);

  for (const job of queue.listForContext(CTX)) {
    const m = meta(job);
    if (m?.kind === 'BLOCK_DECOMPOSE' && m.block_id !== 'W00') queue.cancel({ job_id: job.job_id, reason: 'TEST_SCOPE' });
  }

  const parent = completeNext(queue, { output_text: JSON.stringify({ independent_subtasks: twelveIndependentTasks() }) });
  assert.equal(meta(parent).block_id, 'W00');

  const snapshot = pump.reconcile();
  assert.equal(snapshot.measured_model_capacity, 8);
  assert.equal(snapshot.target_active_backlog, 48);
  assert.equal(snapshot.enqueued_children_this_reconcile, 12);
  assert.equal(snapshot.useful_queued, 12);
  assert.equal(snapshot.starvation, false);
  assert.equal(snapshot.scheduling_strategy, 'ADAPTIVE_USEFUL_THROUGHPUT');
  assert.equal(snapshot.fixed_task_target, false);
  assert.equal(snapshot.prod_authorized, false);
  assert.equal(snapshot.trading_access, false);
});

test('V3 fills the normal adaptive backlog to 48 useful leaf jobs when enough plans are ready', t => {
  const dir = tempDir(t, 'cerebro-pump-v3-pressure-');
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const pump = new AdaptiveHierarchicalAgentWorkPumpV3({ job_runtime: queue, context: CTX, scope_version: 'test-v3-pressure' });

  pump.seed();
  for (let index = 0; index < 25; index += 1) {
    completeNext(queue, { output_text: JSON.stringify({ independent_subtasks: twelveIndependentTasks() }) });
  }

  const snapshot = pump.reconcile();
  assert.equal(snapshot.target_active_backlog, 48);
  assert.equal(snapshot.adaptive_backlog.active_leaf_jobs, 48);
  assert.equal(snapshot.useful_queued, 48);
  assert.equal(snapshot.queue_pressure, 1);
  assert.equal(snapshot.adaptive_backlog.headroom, 0);
  assert.equal(snapshot.starvation, false);

  const duplicate = pump.reconcile();
  assert.equal(duplicate.adaptive_backlog.active_leaf_jobs, 48);
  assert.equal(duplicate.enqueued_children_this_reconcile, 0);
});

test('V3 reconciles additive durable sources through the same canonical call', t => {
  const dir = tempDir(t, 'cerebro-pump-v3-additive-');
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  let reconciles = 0;
  const source = {
    reconcile() {
      reconciles += 1;
      return Object.freeze({ state_type: 'TEST_ADDITIVE_SOURCE', accepted_this_reconcile: 1, prod_authorized: false });
    },
    snapshot() {
      return Object.freeze({ state_type: 'TEST_ADDITIVE_SOURCE', accepted_this_reconcile: 0, prod_authorized: false });
    },
  };
  const pump = new AdaptiveHierarchicalAgentWorkPumpV3({
    job_runtime: queue,
    context: CTX,
    scope_version: 'test-v3-additive',
    additional_sources: [source],
  });

  const snapshot = pump.reconcile();
  assert.equal(reconciles, 1);
  assert.equal(snapshot.additional_work_source_count, 1);
  assert.equal(snapshot.additional_work_sources[0].state_type, 'TEST_ADDITIVE_SOURCE');
  assert.equal(snapshot.additional_work_sources[0].accepted_this_reconcile, 1);
  assert.equal(snapshot.prod_authorized, false);
  assert.equal(snapshot.trading_access, false);
  assert.throws(() => new AdaptiveHierarchicalAgentWorkPumpV3({ job_runtime: queue, context: CTX, additional_sources: [{}] }), /reconcile\/snapshot/);
});

test('V3 remains PREPROD-only and contract keeps DeepSeek at measured ceiling without new authority', t => {
  const dir = tempDir(t, 'cerebro-pump-v3-guard-');
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  assert.throws(() => new AdaptiveHierarchicalAgentWorkPumpV3({
    job_runtime: queue,
    context: { ...CTX, environment: 'PROD' },
  }), /PREPROD-only/);

  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.model_capacity_default, 8);
  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.deepseek_concurrency_above_measured_ceiling, false);
  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.repo_write_concurrency, 1);
  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.additive_sources_supported, true);
  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.additive_sources_share_canonical_reconcile, true);
  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.second_scheduler, false);
  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.second_daemon, false);
  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.auto_recharge, false);
  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.prod_authorized, false);
  assert.equal(ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT.trading_access, false);
});
