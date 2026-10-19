import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from '../runtime/durable-worker-runner-v1.mjs';
import { resolveBlockedCapability } from '../runtime/self-extending-capability-resolver-v0.mjs';
import {
  SELF_EXTENDING_JOB_NAME,
  SELF_EXTENDING_MISSION_JOB_BRIDGE_V0_CONTRACT,
  enqueueSelfExtendingResolution,
  enqueueSelfExtendingDispatchBatch,
  registerSelfExtendingMissionWorker
} from '../runtime/self-extending-mission-job-bridge-v0.mjs';

function runtime(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-selfext-job001-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
}

function dependencyResolution(overrides = {}) {
  return resolveBlockedCapability({
    company_id: 'fenix',
    candidate_id: 'skill-demo',
    capability_id: 'skill-demo:dep:1',
    reason: 'BLOCKED_EXTERNAL',
    useful: true,
    dependency: { kind: 'PACKAGE', name: 'demo-package' },
    ...overrides
  });
}

function worker(queue, adapters = {}) {
  const runner = new DurableWorkerRunnerV1({
    job_runtime: queue,
    worker_id: 'worker-selfext-test',
    lease_ms: 2_000,
    heartbeat_ms: 50,
    max_concurrency: 2,
    max_per_company: 2
  });
  return registerSelfExtendingMissionWorker({ worker_runner: runner, ...adapters });
}

test('bridge enqueues into existing JOB-001 with PREPROD tenant/version context and idempotency', t => {
  const queue = runtime(t);
  const resolution = dependencyResolution();
  const first = enqueueSelfExtendingResolution({ job_runtime: queue, resolution, now_ms: 1000 });
  const second = enqueueSelfExtendingResolution({ job_runtime: queue, resolution, now_ms: 1001 });

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, false);
  assert.equal(second.duplicate, true);
  assert.equal(first.job.name, SELF_EXTENDING_JOB_NAME);
  assert.deepEqual(first.job.context, {
    company_id: 'fenix',
    engine_id: 'FACT-001',
    environment: 'PREPROD',
    version: resolution.version
  });
  assert.equal(first.job.payload.policy.automatic_paid_fallback, false);
  assert.equal(first.job.payload.policy.trading_access, false);
  assert.equal(first.job.payload.policy.additional_cost_target_eur, 0);
});

test('worker resolves by reuse, verifies original skill and resumes automatically', async t => {
  const queue = runtime(t);
  const resolution = dependencyResolution();
  const enqueued = enqueueSelfExtendingResolution({ job_runtime: queue, resolution });
  const runner = worker(queue, {
    reuse_internal: async () => ({ status: 'GREEN', evidence_ref: 'internal:existing-capability' }),
    wrap_existing: async () => ({ status: 'NO_MATCH' }),
    tech_scout: async () => ({ status: 'NO_MATCH' }),
    fact_build: async () => ({ status: 'NO_MATCH' }),
    verify_and_resume: async ({ selected }) => ({ status: 'FULL_SAFE_PREPROD', selected_strategy: selected.strategy, tribunal: 'GREEN' })
  });

  const outcome = await runner.runOne({ context: enqueued.job.context });
  assert.equal(outcome.status, 'SUCCEEDED');
  const done = queue.get(enqueued.job.job_id);
  assert.equal(done.status, 'SUCCEEDED');
  assert.equal(done.result.status, 'RESUMED_GREEN');
  assert.equal(done.result.job001_resume, 'VERIFIED_AND_RESUMED');
  assert.equal(done.result.selected.strategy, 'REUSE_INTERNAL');
  assert.equal(done.result.prod_authorized, false);
});

test('unresolved useful dependency is retried durably instead of becoming terminal BLOCKED_EXTERNAL', async t => {
  const queue = runtime(t);
  const resolution = dependencyResolution();
  const enqueued = enqueueSelfExtendingResolution({
    job_runtime: queue,
    resolution,
    max_attempts: 2,
    retry: { base_delay_ms: 10, max_delay_ms: 10, jitter_ratio: 0 }
  });
  const runner = worker(queue, {
    reuse_internal: async () => ({ status: 'NO_MATCH' }),
    wrap_existing: async () => ({ status: 'NO_MATCH' }),
    tech_scout: async () => ({ status: 'NO_MATCH' }),
    fact_build: async () => ({ status: 'NO_MATCH' }),
    verify_and_resume: async () => { throw new Error('verify must not run without a selected capability'); }
  });

  const outcome = await runner.runOne({ context: enqueued.job.context });
  assert.equal(outcome.status, 'RETRY_SCHEDULED');
  const retry = queue.get(enqueued.job.job_id);
  assert.equal(retry.status, 'RETRY_WAIT');
  assert.match(retry.error, /SELF_EXTENDING_NOT_YET_GREEN:DEPENDENCY_RESOLUTION_REQUIRED/);
});

test('intrinsically human dependency becomes exact HUMAN_REQUIRED and remains auto-resumable', async t => {
  const queue = runtime(t);
  const resolution = dependencyResolution({ dependency: { kind: 'OAUTH_REQUIRED', name: 'provider-login' } });
  assert.equal(resolution.status, 'HUMAN_REQUIRED');
  assert.equal(resolution.human_required, 'POLICY_CONFLICT');
  const enqueued = enqueueSelfExtendingResolution({ job_runtime: queue, resolution });
  const runner = worker(queue);

  const outcome = await runner.runOne({ context: enqueued.job.context });
  assert.equal(outcome.status, 'HUMAN_REQUIRED');
  assert.equal(outcome.reason, 'POLICY_CONFLICT');
  assert.equal(queue.get(enqueued.job.job_id).result.resume_automatically, true);
});

test('dispatch batch connects reopened catalog missions to JOB-001 without duplicating them', t => {
  const queue = runtime(t);
  const resolution = dependencyResolution();
  const batch = {
    environment: 'PREPROD',
    batch_hash: 'batch-1',
    human_required: [],
    jobs: [{
      job_id: 'legacy184-reopen-1',
      company_id: 'fenix',
      engine_id: 'FACT-001',
      environment: 'PREPROD',
      priority: 50,
      item_id: 1,
      candidate_id: resolution.candidate_id,
      resolution,
      idempotency_key: 'legacy184-1',
      max_attempts: 3,
      resume_original_skill: true
    }]
  };

  const first = enqueueSelfExtendingDispatchBatch({ job_runtime: queue, batch, now_ms: 1000 });
  const second = enqueueSelfExtendingDispatchBatch({ job_runtime: queue, batch, now_ms: 1001 });
  assert.equal(first.accepted_count, 1);
  assert.equal(first.duplicate_count, 0);
  assert.equal(second.accepted_count, 0);
  assert.equal(second.duplicate_count, 1);
});

test('bridge fails closed outside PREPROD and contract forbids automatic paid/PROD/Trading paths', t => {
  const queue = runtime(t);
  const resolution = dependencyResolution();
  assert.throws(() => enqueueSelfExtendingResolution({
    job_runtime: queue,
    resolution,
    context: { company_id: 'fenix', engine_id: 'FACT-001', environment: 'PROD', version: 'v1' }
  }), /exact PREPROD/);

  assert.equal(SELF_EXTENDING_MISSION_JOB_BRIDGE_V0_CONTRACT.reuses_existing_job001_runtime, true);
  assert.equal(SELF_EXTENDING_MISSION_JOB_BRIDGE_V0_CONTRACT.new_server_required, false);
  assert.equal(SELF_EXTENDING_MISSION_JOB_BRIDGE_V0_CONTRACT.automatic_paid_fallback, false);
  assert.equal(SELF_EXTENDING_MISSION_JOB_BRIDGE_V0_CONTRACT.prod_authorized, false);
  assert.equal(SELF_EXTENDING_MISSION_JOB_BRIDGE_V0_CONTRACT.trading_access, false);
  assert.equal(SELF_EXTENDING_MISSION_JOB_BRIDGE_V0_CONTRACT.additional_cost_target_eur, 0);
});
