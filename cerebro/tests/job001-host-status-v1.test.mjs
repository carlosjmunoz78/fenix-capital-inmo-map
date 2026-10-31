import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { readJob001HostStatusV1, JOB001_HOST_STATUS_V1_CONTRACT } from '../runtime/job001-host-status-v1.mjs';

const READ = Object.freeze({ id: 'watchdog-e', scopes: ['cerebro:ledger:read'] });
const MODEL = Object.freeze({
  company_id: 'fenix',
  engine_id: 'BOOST-001',
  environment: 'PREPROD',
  version: 'work-pump-v3-adaptive',
});

function makeState({ updated_at = '2026-10-28T15:00:00.000Z', company_id = 'fenix', environment = 'PREPROD', trading_access = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-job001-host-'));
  const runtime = new DurableJobRuntimeV1({ file_path: path.join(root, 'jobs.v8journal') });
  const now = Date.parse('2026-10-28T15:00:30.000Z');

  for (let index = 0; index < 48; index += 1) {
    runtime.enqueue({
      name: 'deepseek-governed-work',
      context: MODEL,
      payload: { shard: index, secret_prompt: `must-not-escape-${index}` },
      idempotency_key: `model-${index}`,
      now_ms: now - 10_000 + index,
    });
  }
  for (let index = 0; index < 8; index += 1) {
    runtime.claim({ context: MODEL, worker_id: `deepseek-worker-${index}`, now_ms: now - 5_000, lease_ms: 60_000 });
  }

  fs.writeFileSync(path.join(root, 'heartbeat.json'), JSON.stringify({
    schema_version: '1.8',
    service: 'CEREBRO Continuous Supervisor',
    status: 'GREEN',
    company_id,
    engine_id: 'RUNTIME-001',
    environment,
    version: 'v0',
    updated_at,
    useful_work: {
      scheduling_strategy: 'ADAPTIVE_USEFUL_THROUGHPUT',
      model_capacity: 8,
      target_active_backlog: 48,
      useful_queued: 40,
      useful_running: 8,
      queue_pressure: 1,
      starvation: false,
    },
    dynamic_concurrency: {
      environment: 'PREPROD',
      target_global_concurrency: 360,
      max_global_concurrency: 360,
      max_company_concurrency: 360,
      max_provider_concurrency: { deepseek: 8, secret_provider_key: 'must-not-escape' },
      max_repo_write_concurrency: 1,
      decision: 'HOLD',
      raw_secret: 'must-not-escape',
    },
    work_pump_mode: 'AUTO_KEY_PRESENT',
    kill_switch_present: false,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access,
    top_level_secret: 'must-not-escape',
  }));

  return { root, now };
}

test('host status proves 48 useful against 360 global target while DeepSeek remains capped at 8 without exposing jobs, payloads or secrets', () => {
  const { root, now } = makeState();
  const status = readJob001HostStatusV1({
    state_dir: root,
    actor: READ,
    expected_company_id: 'fenix',
    model_context: MODEL,
    now_ms: now,
  });

  assert.equal(status.status, 'GREEN');
  assert.equal(status.environment, 'PREPROD');
  assert.equal(status.useful_work.useful_total, 48);
  assert.equal(status.useful_work.target_useful, 360);
  assert.equal(status.useful_work.headroom_to_target, 312);
  assert.equal(status.useful_work.target_satisfied, false);
  assert.equal(status.model_lane.total, 48);
  assert.equal(status.model_lane.running, 8);
  assert.equal(status.model_lane.runnable, 40);
  assert.equal(status.model_lane.useful, 48);
  assert.equal(status.model_lane.max_concurrency, 8);
  assert.equal(status.model_lane.at_capacity, true);
  assert.equal(status.dynamic_concurrency.target_global_concurrency, 360);
  assert.equal(status.dynamic_concurrency.max_global_concurrency, 360);
  assert.equal(status.dynamic_concurrency.max_company_concurrency, 360);
  assert.equal(status.dynamic_concurrency.max_provider_deepseek_concurrency, 8);
  assert.equal(status.repo_write_lane.running, null);
  assert.equal(status.repo_write_lane.max_concurrency, 1);
  assert.equal(status.repo_write_lane.physically_observable, false);
  assert.equal(status.raw_jobs_exposed, false);
  assert.equal(status.raw_payloads_exposed, false);
  assert.equal(status.raw_journal_exposed, false);
  assert.equal(status.secrets_exposed, false);
  assert.equal(status.second_queue, false);
  assert.equal(status.second_scheduler, false);
  assert.equal(status.second_daemon, false);
  assert.equal(status.prod_authorized, false);
  assert.equal(status.trading_access, false);

  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes('must-not-escape'), false);
  assert.equal(serialized.includes('secret_prompt'), false);
  assert.equal(serialized.includes('raw_secret'), false);
});

test('host status fails closed on stale heartbeat, company mismatch, PROD and Trading', () => {
  const stale = makeState({ updated_at: '2026-10-28T14:55:00.000Z' });
  assert.throws(() => readJob001HostStatusV1({
    state_dir: stale.root,
    actor: READ,
    expected_company_id: 'fenix',
    model_context: MODEL,
    now_ms: stale.now,
    max_age_ms: 120_000,
  }), /HEARTBEAT_STALE/);

  const wrongCompany = makeState({ company_id: 'other' });
  assert.throws(() => readJob001HostStatusV1({
    state_dir: wrongCompany.root,
    actor: READ,
    expected_company_id: 'fenix',
    model_context: MODEL,
    now_ms: wrongCompany.now,
  }), /COMPANY_MISMATCH/);

  const prod = makeState({ environment: 'PROD' });
  assert.throws(() => readJob001HostStatusV1({
    state_dir: prod.root,
    actor: READ,
    expected_company_id: 'fenix',
    model_context: MODEL,
    now_ms: prod.now,
  }), /HEARTBEAT_PREPROD_ONLY/);

  const trading = makeState({ trading_access: true });
  assert.throws(() => readJob001HostStatusV1({
    state_dir: trading.root,
    actor: READ,
    expected_company_id: 'fenix',
    model_context: MODEL,
    now_ms: trading.now,
  }), /HEARTBEAT_TRADING_DENIED/);
});

test('host status rejects non-BOOST or cross-company model contexts', () => {
  const { root, now } = makeState();
  assert.throws(() => readJob001HostStatusV1({
    state_dir: root,
    actor: READ,
    expected_company_id: 'fenix',
    model_context: { ...MODEL, engine_id: 'OTHER' },
    now_ms: now,
  }), /MODEL_CONTEXT_DENIED/);
  assert.throws(() => readJob001HostStatusV1({
    state_dir: root,
    actor: READ,
    expected_company_id: 'fenix',
    model_context: { ...MODEL, company_id: 'other' },
    now_ms: now,
  }), /MODEL_COMPANY_MISMATCH/);
});

test('host status contract preserves zero-cost PREPROD-only boundaries', () => {
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.model_context_engine_id, 'BOOST-001');
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.model_provider_id, 'deepseek');
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.reuses_existing_job_runtime, true);
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.second_queue, false);
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.second_scheduler, false);
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.second_daemon, false);
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.prod_authorized, false);
  assert.equal(JOB001_HOST_STATUS_V1_CONTRACT.trading_access, false);
});
