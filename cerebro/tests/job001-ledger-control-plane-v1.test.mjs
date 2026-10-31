import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  Job001LedgerControlPlaneV1,
  readSupervisorHeartbeatV1,
  JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT,
} from '../runtime/job001-ledger-control-plane-v1.mjs';

const MODEL = Object.freeze({ company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'work-pump-v3-adaptive' });
const FACTORY = Object.freeze({ company_id: 'fenix', engine_id: 'FACT-001', environment: 'PREPROD', version: 'v0' });
const READ = Object.freeze({ id: 'watchdog', scopes: ['cerebro:ledger:read'] });
const REFILL = Object.freeze({ id: 'coordinator-a', scopes: ['cerebro:ledger:read', 'cerebro:refill:request'] });

function key(context) { return `${context.company_id}|${context.engine_id}|${context.environment}|${context.version}`; }

class FakeRuntime {
  constructor(seed = {}) { this.data = new Map(Object.entries(seed)); }
  listForContext(context) { return structuredClone(this.data.get(key(context)) || []); }
}

test('inspect reports useful totals and 360/360/360/8/1 limits without creating work', () => {
  const runtime = new FakeRuntime({
    [key(MODEL)]: [{ status: 'QUEUED' }, { status: 'RETRY_WAIT' }, { status: 'LEASED' }, { status: 'HEARTBEATING' }, { status: 'SUCCEEDED' }],
    [key(FACTORY)]: [{ status: 'RUNNING' }, { status: 'HUMAN_REQUIRED' }, { status: 'DEAD_LETTER' }, { status: 'DONE' }],
  });
  const control = new Job001LedgerControlPlaneV1({ job_runtime: runtime, contexts: [MODEL, FACTORY] });
  const status = control.inspect({ actor: READ });
  assert.equal(status.totals.runnable, 2);
  assert.equal(status.totals.running, 3);
  assert.equal(status.totals.useful, 5);
  assert.equal(status.totals.blocked, 2);
  assert.equal(status.totals.done, 2);
  assert.equal(status.saturation.headroom_to_target, 355);
  assert.equal(status.limits.target_useful, 360);
  assert.equal(status.limits.max_global, 360);
  assert.equal(status.limits.max_company, 360);
  assert.equal(status.limits.max_deepseek, 8);
  assert.equal(status.limits.max_repo_write, 1);
  assert.equal(status.second_queue, false);
  assert.equal(status.second_scheduler, false);
  assert.equal(status.prod_authorized, false);
  assert.equal(status.trading_access, false);
});

test('control plane rejects missing scope, unknown context, PROD and Trading', () => {
  const runtime = new FakeRuntime();
  const control = new Job001LedgerControlPlaneV1({ job_runtime: runtime, contexts: [MODEL] });
  assert.throws(() => control.inspect({ actor: { scopes: [] } }), /CONTROL_PLANE_SCOPE_REQUIRED/);
  assert.throws(() => control.inspect({ actor: READ, context: { ...MODEL, engine_id: 'OTHER' } }), /CONTEXT_NOT_REGISTERED/);
  assert.throws(() => new Job001LedgerControlPlaneV1({ job_runtime: runtime, contexts: [{ ...MODEL, environment: 'PROD' }] }), /PREPROD_ONLY/);
  assert.throws(() => new Job001LedgerControlPlaneV1({ job_runtime: runtime, contexts: [{ ...MODEL, engine_id: 'TRADING-LAB' }] }), /TRADING_DENIED/);
});

test('refill delegates only to existing work pump reconcile and creates no scheduler', () => {
  const runtime = new FakeRuntime({ [key(MODEL)]: [{ status: 'QUEUED' }] });
  let calls = 0;
  const pump = {
    reconcile() {
      calls += 1;
      return { scheduling_strategy: 'ADAPTIVE_USEFUL_THROUGHPUT', measured_model_capacity: 8, target_active_backlog: 360, useful_queued: 352, useful_running: 8, starvation: false };
    },
  };
  const control = new Job001LedgerControlPlaneV1({ job_runtime: runtime, work_pump: pump, contexts: [MODEL] });
  const result = control.requestRefill({ actor: REFILL });
  assert.equal(calls, 1);
  assert.equal(result.accepted, true);
  assert.equal(result.action, 'RECONCILE_EXISTING_WORK_PUMP');
  assert.equal(result.pump.measured_model_capacity, 8);
  assert.equal(result.pump.target_active_backlog, 360);
  assert.equal(result.new_queue_created, false);
  assert.equal(result.new_scheduler_created, false);
  assert.equal(result.prod_authorized, false);
  assert.equal(result.trading_access, false);
  assert.throws(() => control.requestRefill({ actor: READ }), /CONTROL_PLANE_SCOPE_REQUIRED/);
});

test('heartbeat view is sanitized, PREPROD-only, company-bound and freshness-gated', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-ledger-control-'));
  const file = path.join(dir, 'heartbeat.json');
  const now = Date.parse('2026-10-28T14:00:00.000Z');
  fs.writeFileSync(file, JSON.stringify({
    schema_version: '1.8', service: 'CEREBRO Continuous Supervisor', status: 'GREEN', company_id: 'fenix', engine_id: 'RUNTIME-001', environment: 'PREPROD', version: 'v0', updated_at: '2026-10-28T13:59:30.000Z',
    useful_work: { scheduling_strategy: 'ADAPTIVE_USEFUL_THROUGHPUT', model_capacity: 8, target_active_backlog: 360, useful_queued: 352, useful_running: 8, queue_pressure: 1, starvation: false, secret_nested: 'deny' },
    dynamic_concurrency: { target_global_concurrency: 360, max_global_concurrency: 360, max_company_concurrency: 360, max_provider_concurrency: { deepseek: 8, secret_provider: 999 }, max_repo_write_concurrency: 1, max_resource_concurrency: { CPU: 360, IO: 360 }, decision: 'HOLD', hard_cost_cap_eur: 100, secret_should_not_escape: 'deny' },
    work_pump_mode: 'AUTO_KEY_PRESENT', kill_switch_present: false, prod_authorized: false, prod_write_authorized: false, trading_access: false, secret_should_not_escape: 'redacted-by-projection',
  }));
  const view = readSupervisorHeartbeatV1({ heartbeat_file: file, actor: READ, expected_company_id: 'fenix', now_ms: now });
  assert.equal(view.status, 'GREEN');
  assert.equal(view.useful_work.model_capacity, 8);
  assert.equal(view.useful_work.useful_queued, 352);
  assert.equal(view.useful_work.useful_running, 8);
  assert.equal(view.dynamic_concurrency.target_global_concurrency, 360);
  assert.equal(view.dynamic_concurrency.max_global_concurrency, 360);
  assert.equal(view.dynamic_concurrency.max_company_concurrency, 360);
  assert.equal(view.dynamic_concurrency.max_deepseek_concurrency, 8);
  assert.equal(view.dynamic_concurrency.max_repo_write_concurrency, 1);
  assert.equal(view.dynamic_concurrency.decision, 'HOLD');
  assert.equal('max_resource_concurrency' in view.dynamic_concurrency, false);
  assert.equal('secret_provider' in view.dynamic_concurrency, false);
  assert.equal('secret_should_not_escape' in view.dynamic_concurrency, false);
  assert.equal(view.age_ms, 30_000);
  assert.equal('secret_should_not_escape' in view, false);
  assert.equal(view.trading_access, false);
  assert.throws(() => readSupervisorHeartbeatV1({ heartbeat_file: file, actor: READ, expected_company_id: 'other', now_ms: now }), /COMPANY_MISMATCH/);
  assert.throws(() => readSupervisorHeartbeatV1({ heartbeat_file: file, actor: READ, expected_company_id: 'fenix', now_ms: now + 200_000, max_age_ms: 120_000 }), /HEARTBEAT_STALE/);
  assert.throws(() => readSupervisorHeartbeatV1({ heartbeat_file: file, actor: READ, expected_company_id: 'fenix', now_ms: now, max_age_ms: 120_001 }), /max_age_ms/);
});

test('heartbeat view rejects PROD-write or Trading claims', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-ledger-control-policy-'));
  const file = path.join(dir, 'heartbeat.json');
  const base = { status: 'GREEN', company_id: 'fenix', engine_id: 'RUNTIME-001', environment: 'PREPROD', version: 'v0', updated_at: '2026-10-28T13:59:30.000Z' };
  const now = Date.parse('2026-10-28T14:00:00.000Z');
  fs.writeFileSync(file, JSON.stringify({ ...base, prod_write_authorized: true }));
  assert.throws(() => readSupervisorHeartbeatV1({ heartbeat_file: file, actor: READ, expected_company_id: 'fenix', now_ms: now }), /PROD_WRITE_DENIED/);
  fs.writeFileSync(file, JSON.stringify({ ...base, trading_access: true }));
  assert.throws(() => readSupervisorHeartbeatV1({ heartbeat_file: file, actor: READ, expected_company_id: 'fenix', now_ms: now }), /TRADING_DENIED/);
});

test('contract preserves JOB-001 and verified 360-cap zero-cost governance boundaries', () => {
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.reuses_existing_runtime, true);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.reuses_existing_work_pump, true);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.second_queue, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.second_scheduler, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.second_daemon, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.target_useful_default, 360);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_global_default, 360);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_company_default, 360);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_deepseek_default, 8);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.max_repo_write_default, 1);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.heartbeat_ttl_max_ms, 120_000);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.dynamic_concurrency_whitelist_only, true);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.prod_authorized, false);
  assert.equal(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.trading_access, false);
});
