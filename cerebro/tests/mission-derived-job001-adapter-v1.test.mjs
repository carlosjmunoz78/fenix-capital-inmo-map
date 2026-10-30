import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from '../runtime/durable-worker-runner-v1.mjs';
import {
  MissionDerivedJob001SourceV1,
  MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT,
  MISSION_DERIVED_JOB_NAME_V1,
  missionDerivedJob001ContextV1,
  registerMissionDerivedJob001HandlerV1,
} from '../runtime/mission-derived-job001-adapter-v1.mjs';

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-mission-job001-'));
  return { dir, journal: path.join(dir, 'jobs.v8journal') };
}

test('adapter contract reuses JOB-001 and stays PREPROD fail-closed', () => {
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.durable_runtime_reused, true);
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.durable_worker_reused, true);
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.target_active_default, 1);
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.target_active_max, 48);
  assert.deepEqual(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.lane_range, { min: 0, max: 63 });
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.second_queue, false);
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.second_scheduler, false);
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.second_daemon, false);
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.paid_ai, false);
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.prod_authorized, false);
  assert.equal(MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT.trading_access, false);
});

test('source fills only bounded headroom and preserves deterministic sequence across restart', () => {
  const { journal } = fixture();
  const context = missionDerivedJob001ContextV1();
  let runtime = new DurableJobRuntimeV1({ file_path: journal });
  let source = new MissionDerivedJob001SourceV1({ job_runtime: runtime, context, target_active: 2, max_enqueue_per_reconcile: 2 });

  const first = source.reconcile();
  assert.equal(first.accepted_this_reconcile, 2);
  assert.equal(first.active_jobs, 2);
  const firstJobs = runtime.listForContext(context).filter(job => job.name === MISSION_DERIVED_JOB_NAME_V1);
  assert.deepEqual(firstJobs.map(job => job.payload.__mission_derived.sequence).sort((a,b)=>a-b), [0, 1]);
  assert.deepEqual(firstJobs.map(job => job.payload.lane).sort((a,b)=>a-b), [0, 1]);

  runtime = new DurableJobRuntimeV1({ file_path: journal });
  source = new MissionDerivedJob001SourceV1({ job_runtime: runtime, context, target_active: 2, max_enqueue_per_reconcile: 2 });
  const replay = source.reconcile();
  assert.equal(replay.accepted_this_reconcile, 0);
  assert.equal(replay.active_jobs, 2);
  assert.equal(replay.next_sequence, 2);
  assert.equal(runtime.listForContext(context).length, 2);
});

test('registered handler executes through the existing DurableWorkerRunnerV1 with checkpoint and completion', async () => {
  const { journal } = fixture();
  const context = missionDerivedJob001ContextV1();
  const runtime = new DurableJobRuntimeV1({ file_path: journal });
  const source = new MissionDerivedJob001SourceV1({ job_runtime: runtime, context, target_active: 1 });
  const seeded = source.reconcile();
  assert.equal(seeded.accepted_this_reconcile, 1);

  const worker = new DurableWorkerRunnerV1({
    job_runtime: runtime,
    worker_id: 'mission-canary-test',
    lease_ms: 10_000,
    heartbeat_ms: 100,
    max_concurrency: 1,
    max_per_company: 1,
  });
  registerMissionDerivedJob001HandlerV1({
    worker_runner: worker,
    execute_work: async ({ lane, cycle, fallback }) => ({
      work_unit: { mission_id: 'M01', work_unit_id: 'M01.test.atomic' },
      execution_state: 'EVIDENCE_COLLECTED',
      idempotency_key: `stub:${lane}:${cycle}`,
      fallback: { used: fallback === true },
    }),
  });

  const outcome = await worker.runOne({ context });
  assert.equal(outcome.status, 'SUCCEEDED');
  const jobs = runtime.listForContext(context);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].status, 'SUCCEEDED');
  assert.equal(jobs[0].result.status, 'SUCCEEDED');
  assert.equal(jobs[0].result.mission_id, 'M01');
  assert.equal(jobs[0].result.prod_authorized, false);
  assert.equal(jobs[0].result.trading_access, false);
  assert.equal(jobs[0].checkpoint.stage, 'MISSION_DERIVED_DONE');

  const refill = source.reconcile();
  assert.equal(refill.accepted_this_reconcile, 1);
  assert.equal(refill.next_sequence, 2);
  const sequences = runtime.listForContext(context).map(job => job.payload.__mission_derived.sequence).sort((a,b)=>a-b);
  assert.deepEqual(sequences, [0, 1]);
});

test('adapter rejects capacity and context outside the canonical boundary', () => {
  const { journal } = fixture();
  const runtime = new DurableJobRuntimeV1({ file_path: journal });
  assert.throws(() => new MissionDerivedJob001SourceV1({
    job_runtime: runtime,
    context: { company_id: 'fenix', engine_id: 'JOB-001', environment: 'PROD', version: 'v1' },
  }), /PREPROD/);
  assert.throws(() => new MissionDerivedJob001SourceV1({ job_runtime: runtime, target_active: 49 }), /target_active/);
});
