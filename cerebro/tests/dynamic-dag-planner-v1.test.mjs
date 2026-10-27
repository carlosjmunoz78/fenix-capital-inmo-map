import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DynamicDagPlannerV1, DYNAMIC_DAG_PLANNER_V1_CONTRACT } from '../runtime/dynamic-dag-planner-v1.mjs';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';

const FENIX = { company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'v1' };
const AION = { company_id: 'aion', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'v1' };

function task(task_id, depends_on = [], extra = {}) {
  return { task_id, name: `job.${task_id}`, context: FENIX, depends_on, priority: 100, payload: { task_id }, ...extra };
}

function runtime(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-dag-v1-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
}

test('planner exposes roots READY and dependent work BLOCKED', () => {
  const planner = new DynamicDagPlannerV1({ dag_id: 'mission-1', tasks: [task('A'), task('B', ['A']), task('C', ['B'])] });
  const first = planner.plan();
  assert.deepEqual(first.ready.map(x => x.task_id), ['A']);
  assert.equal(first.blocked.length, 2);
  const second = planner.plan({ completed_task_ids: ['A'] });
  assert.deepEqual(second.ready.map(x => x.task_id), ['B']);
});

test('critical path unblocking outranks shorter independent work at same priority', () => {
  const planner = new DynamicDagPlannerV1({
    dag_id: 'mission-critical',
    tasks: [task('A'), task('B', ['A']), task('C', ['B']), task('X')],
  });
  const plan = planner.plan();
  assert.deepEqual(plan.ready.map(x => x.task_id), ['A', 'X']);
});

test('cycle is rejected before execution', () => {
  assert.throws(() => new DynamicDagPlannerV1({
    dag_id: 'bad-cycle', tasks: [task('A', ['B']), task('B', ['A'])],
  }), /DAG_CYCLE/);
});

test('cross-company dependencies fail closed', () => {
  assert.throws(() => new DynamicDagPlannerV1({
    dag_id: 'bad-tenant',
    tasks: [task('A'), task('B', ['A'], { context: AION })],
  }), /DAG_CROSS_COMPANY_DEPENDENCY_DENIED/);
});

test('failed dependency blocks downstream work', () => {
  const planner = new DynamicDagPlannerV1({ dag_id: 'failure', tasks: [task('A'), task('B', ['A'])] });
  const plan = planner.plan({ failed_task_ids: ['A'] });
  assert.equal(plan.ready.length, 0);
  assert.equal(plan.blocked[0].reason, 'DEPENDENCY_FAILED');
});

test('enqueueReady feeds existing durable runtime idempotently, not a second queue', t => {
  const queue = runtime(t);
  const planner = new DynamicDagPlannerV1({ dag_id: 'durable', tasks: [task('A'), task('B', ['A'])] });
  const first = planner.enqueueReady({ job_runtime: queue, now_ms: 1 });
  assert.equal(first.receipts.length, 1);
  assert.equal(first.receipts[0].receipt.accepted, true);
  const duplicate = planner.enqueueReady({ job_runtime: queue, now_ms: 2 });
  assert.equal(duplicate.receipts[0].receipt.duplicate, true);
  assert.equal(queue.listForContext(FENIX).length, 1);
});

test('contract remains additive PREPROD-only and non-trading', () => {
  assert.equal(DYNAMIC_DAG_PLANNER_V1_CONTRACT.second_queue, false);
  assert.equal(DYNAMIC_DAG_PLANNER_V1_CONTRACT.prod_authorized, false);
  assert.equal(DYNAMIC_DAG_PLANNER_V1_CONTRACT.prod_writes, false);
  assert.equal(DYNAMIC_DAG_PLANNER_V1_CONTRACT.trading_access, false);
  assert.equal(DYNAMIC_DAG_PLANNER_V1_CONTRACT.additional_cost_target_eur, 0);
});
