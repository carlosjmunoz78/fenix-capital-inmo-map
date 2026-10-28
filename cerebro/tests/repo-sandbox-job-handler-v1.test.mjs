import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRepoSandboxJobHandlerV1, REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT } from '../runtime/repo-sandbox-job-handler-v1.mjs';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from '../runtime/durable-worker-runner-v1.mjs';

const CONTEXT = Object.freeze({ company_id: 'fenix', engine_id: 'FACT-001', environment: 'PREPROD', version: 'repo-sandbox-v1' });
const IMAGE = `node@sha256:${'a'.repeat(64)}`;
const SHA = '2e8a56bd8b2863be09d4fc85283c0e465131a6d3';

function plan(overrides = {}) {
  return {
    schema_version: '1.0.0',
    state_type: 'CEREBRO_UNIVERSAL_REPO_SANDBOX_PLAN_V0',
    status: 'SANDBOX_PLAN_READY',
    company_id: CONTEXT.company_id,
    engine_id: CONTEXT.engine_id,
    environment: CONTEXT.environment,
    version: CONTEXT.version,
    repository: 'sindresorhus/slash',
    pinned_sha: SHA,
    isolation: { mode: 'EPHEMERAL_SANDBOX', network: 'DENY', network_allowlist: [], customer_data: false, trading: false, prod: false },
    dependency_policy: { host_install: false, install_scope: 'EPHEMERAL_SANDBOX_ONLY' },
    required_secrets: [],
    resource_limits: { memory_mb: 256, processes: 32, wall_seconds: 45 },
    ...overrides,
  };
}

function payload(overrides = {}) {
  return {
    plan: plan(),
    repository_url: 'https://github.com/sindresorhus/slash.git',
    command: ['node', '-e', "console.log('ok')"],
    ...overrides,
  };
}

function physicalGreen() {
  return {
    status: 'PHYSICAL_PREPROD_GREEN',
    materialization: { status: 'MATERIALIZED_EXACT_SHA' },
    execution: {
      backend: 'DOCKER_CLI_OCI',
      exit_code: 0,
      timed_out: false,
      network: 'DENY',
      workspace_mount: 'READ_ONLY',
      sandbox_user: '65532:65532',
      secrets_bound: false,
      host_mutated: false,
      prod_touched: false,
      trading_touched: false,
    },
  };
}

function createHandler(overrides = {}) {
  return createRepoSandboxJobHandlerV1({
    workspace_root: os.tmpdir(),
    image_ref: IMAGE,
    inspect_backend: async () => ({ status: 'BACKEND_READY', backend: 'DOCKER_CLI_OCI' }),
    executor: async () => physicalGreen(),
    ...overrides,
  });
}

test('handler converts governed physical sandbox execution into durable auditable result', async () => {
  const checkpoints = [];
  const handler = createHandler();
  const result = await handler({
    context: CONTEXT,
    payload: payload(),
    heartbeat: () => true,
    checkpoint: value => checkpoints.push(value),
    signal: new AbortController().signal,
  });
  assert.equal(result.status, 'PHYSICAL_PREPROD_GREEN');
  assert.equal(result.company_id, 'fenix');
  assert.equal(result.engine_id, 'FACT-001');
  assert.equal(result.pinned_sha, SHA);
  assert.equal(result.evidence.network, 'DENY');
  assert.equal(result.evidence.workspace_mount, 'READ_ONLY');
  assert.equal(result.additional_cost_eur, 0);
  assert.equal(result.prod_authorized, false);
  assert.equal(result.trading_access, false);
  assert.deepEqual(checkpoints.map(item => item.stage), ['BACKEND_CHECK', 'PHYSICAL_EXECUTION', 'PHYSICAL_PREPROD_GREEN']);
  assert.equal(handler.snapshot().successes, 1);
});

test('handler rejects cross-company/context drift and runtime configuration override', async () => {
  const handler = createHandler();
  await assert.rejects(() => handler({ context: CONTEXT, payload: payload({ plan: plan({ company_id: 'aion' }) }) }), /company_id must match/);
  await assert.rejects(() => handler({ context: CONTEXT, payload: payload({ image_ref: IMAGE }) }), /cannot be overridden/);
  await assert.rejects(() => handler({ context: { ...CONTEXT, environment: 'PROD' }, payload: payload() }), /PREPROD-only/);
});

test('DurableJobRuntimeV1 + DurableWorkerRunnerV1 execute the repo sandbox job exactly through existing lease/checkpoint path', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-repo-sandbox-handler-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const runtime = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const worker = new DurableWorkerRunnerV1({ job_runtime: runtime, worker_id: 'repo-ci-test', lease_ms: 10_000, heartbeat_ms: 100, max_concurrency: 2, max_per_company: 2 });
  const handler = createHandler();
  worker.register({ name: REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.job_name, handler });
  const enqueued = runtime.enqueue({
    name: REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.job_name,
    context: CONTEXT,
    payload: payload(),
    timeout_ms: 5_000,
    max_attempts: 2,
    idempotency_key: 'repo-sandbox-e2e-1',
  });
  assert.equal(enqueued.accepted, true);
  const outcome = await worker.runOne({ context: CONTEXT });
  assert.equal(outcome.status, 'SUCCEEDED');
  const stored = runtime.get(enqueued.job.job_id);
  assert.equal(stored.status, 'SUCCEEDED');
  assert.equal(stored.attempts, 1);
  assert.equal(stored.result.status, 'PHYSICAL_PREPROD_GREEN');
  assert.equal(stored.checkpoint.stage, 'PHYSICAL_PREPROD_GREEN');
});

test('backend failure is handed back to DurableJobRuntimeV1 retry/backoff instead of bypassing the queue', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-repo-sandbox-retry-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const runtime = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const worker = new DurableWorkerRunnerV1({ job_runtime: runtime, worker_id: 'repo-ci-retry', lease_ms: 10_000, heartbeat_ms: 100, max_concurrency: 1, max_per_company: 1 });
  const handler = createHandler({ inspect_backend: async () => ({ status: 'BACKEND_UNAVAILABLE' }) });
  worker.register({ name: REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.job_name, handler });
  const enqueued = runtime.enqueue({
    name: REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.job_name,
    context: CONTEXT,
    payload: payload(),
    timeout_ms: 5_000,
    max_attempts: 2,
    retry: { base_delay_ms: 10, max_delay_ms: 10, jitter_ratio: 0 },
    idempotency_key: 'repo-sandbox-retry-1',
  });
  const outcome = await worker.runOne({ context: CONTEXT });
  assert.equal(outcome.status, 'RETRY_SCHEDULED');
  const stored = runtime.get(enqueued.job.job_id);
  assert.equal(stored.status, 'RETRY_WAIT');
  assert.match(stored.error, /REPO_SANDBOX_BACKEND_UNAVAILABLE/);
  assert.equal(stored.next_attempt_at_ms > stored.created_at_ms, true);
  assert.equal(handler.snapshot().failures, 1);
});

test('contract stays PREPROD/read-only/zero-cost and explicitly reuses the existing durable runtime', () => {
  assert.equal(REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.queue, 'JOB-001/DurableJobRuntimeV1');
  assert.equal(REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.worker, 'JOB-001/DurableWorkerRunnerV1');
  assert.equal(REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.prod_authorized, false);
  assert.equal(REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.prod_writes, false);
  assert.equal(REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.trading_access, false);
});

const physical = process.env.CEREBRO_PHYSICAL_REPO_DURABLE_E2E === '1';
test('physical JOB-001 -> durable worker -> repo handler -> exact-SHA OCI sandbox is GREEN in PREPROD', { skip: !physical, timeout: 180_000 }, async t => {
  const image = process.env.CEREBRO_SANDBOX_IMAGE;
  assert.match(image ?? '', /@sha256:[a-f0-9]{64}$/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-repo-durable-physical-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const runtime = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const worker = new DurableWorkerRunnerV1({ job_runtime: runtime, worker_id: 'repo-ci-physical', lease_ms: 60_000, heartbeat_ms: 2_000, max_concurrency: 1, max_per_company: 1 });
  const handler = createRepoSandboxJobHandlerV1({ workspace_root: dir, image_ref: image });
  worker.register({ name: REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.job_name, handler });
  const probe = "const fs=require('node:fs');if(!fs.existsSync('/workspace/package.json'))process.exit(31);try{fs.writeFileSync('/workspace/blocked','x');process.exit(32)}catch{};console.log('DURABLE_REPO_SANDBOX_OK')";
  const enqueued = runtime.enqueue({
    name: REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.job_name,
    context: CONTEXT,
    payload: payload({ command: ['node', '-e', probe] }),
    timeout_ms: 120_000,
    max_attempts: 2,
    idempotency_key: 'repo-sandbox-physical-durable-v1',
  });
  const outcome = await worker.runOne({ context: CONTEXT });
  assert.equal(outcome.status, 'SUCCEEDED', JSON.stringify(outcome));
  const stored = runtime.get(enqueued.job.job_id);
  assert.equal(stored.status, 'SUCCEEDED');
  assert.equal(stored.result.status, 'PHYSICAL_PREPROD_GREEN');
  assert.equal(stored.result.evidence.network, 'DENY');
  assert.equal(stored.result.evidence.workspace_mount, 'READ_ONLY');
  assert.equal(stored.result.evidence.secrets_bound, false);
  assert.equal(stored.result.evidence.host_mutated, false);
  assert.equal(stored.result.evidence.prod_touched, false);
  assert.equal(stored.result.evidence.trading_touched, false);
  assert.equal(stored.result.additional_cost_eur, 0);
});