import fs from 'node:fs';
import path from 'node:path';
import { sanitizeDynamicConcurrencyV1 } from './job001-remote-telemetry-v1.mjs';

const PREPROD = 'PREPROD';
const READ_SCOPE = 'cerebro:ledger:read';
const REFILL_SCOPE = 'cerebro:refill:request';
const ACTIVE_RUNNING = new Set(['LEASED', 'HEARTBEATING', 'RUNNING']);
const ACTIVE_RUNNABLE = new Set(['QUEUED', 'RETRY_WAIT']);
const BLOCKED = new Set(['DEAD_LETTER', 'HUMAN_REQUIRED', 'FAILED_MANUAL']);
const VERIFIED_GLOBAL_CAP = 360;
const DEEPSEEK_CAP = 8;
const REPO_WRITE_CAP = 1;

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  return value.trim();
}

function safeContext(value, label = 'context') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} required`);
  const context = Object.freeze({
    company_id: requiredString(value.company_id, `${label}.company_id`),
    engine_id: requiredString(value.engine_id, `${label}.engine_id`),
    environment: requiredString(value.environment, `${label}.environment`),
    version: requiredString(value.version, `${label}.version`),
  });
  if (context.environment !== PREPROD) throw new Error('JOB001_CONTROL_PLANE_PREPROD_ONLY');
  if (/trading/i.test(context.engine_id)) throw new Error('JOB001_CONTROL_PLANE_TRADING_DENIED');
  return context;
}

function scopeSet(actor) {
  if (!actor || typeof actor !== 'object' || Array.isArray(actor)) throw new Error('CONTROL_PLANE_ACTOR_REQUIRED');
  const scopes = Array.isArray(actor.scopes) ? actor.scopes : [];
  return new Set(scopes.map(value => String(value)));
}

function requireScope(actor, scope) {
  if (!scopeSet(actor).has(scope)) throw new Error(`CONTROL_PLANE_SCOPE_REQUIRED:${scope}`);
}

function contextKey(context) {
  return `${context.company_id}|${context.engine_id}|${context.environment}|${context.version}`;
}

function integerOrNull(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function sameContext(left, right) {
  return contextKey(left) === contextKey(right);
}

function summarizeJobs(jobs) {
  const status = {};
  let runnable = 0;
  let running = 0;
  let blocked = 0;
  let done = 0;
  for (const job of jobs) {
    const key = String(job?.status || 'UNKNOWN');
    status[key] = (status[key] || 0) + 1;
    if (ACTIVE_RUNNABLE.has(key)) runnable += 1;
    if (ACTIVE_RUNNING.has(key)) running += 1;
    if (BLOCKED.has(key)) blocked += 1;
    if (['SUCCEEDED', 'DONE', 'CANCELLED'].includes(key)) done += 1;
  }
  return Object.freeze({ total: jobs.length, runnable, running, blocked, done, status: Object.freeze(status) });
}

export class Job001LedgerControlPlaneV1 {
  #runtime;
  #workPump;
  #contexts;
  #limits;

  constructor({ job_runtime, work_pump = null, contexts, limits = {} }) {
    if (!job_runtime || typeof job_runtime.listForContext !== 'function') throw new TypeError('job_runtime.listForContext required');
    if (work_pump && typeof work_pump.reconcile !== 'function') throw new TypeError('work_pump.reconcile required when provided');
    if (!Array.isArray(contexts) || contexts.length === 0) throw new TypeError('contexts must be a non-empty array');
    this.#runtime = job_runtime;
    this.#workPump = work_pump;
    this.#contexts = Object.freeze(contexts.map((context, index) => safeContext(context, `contexts[${index}]`)));
    this.#limits = Object.freeze({
      target_useful: Math.min(integerOrNull(limits.target_useful) ?? VERIFIED_GLOBAL_CAP, VERIFIED_GLOBAL_CAP),
      max_global: Math.min(integerOrNull(limits.max_global) ?? VERIFIED_GLOBAL_CAP, VERIFIED_GLOBAL_CAP),
      max_company: Math.min(integerOrNull(limits.max_company) ?? VERIFIED_GLOBAL_CAP, VERIFIED_GLOBAL_CAP),
      max_deepseek: Math.min(integerOrNull(limits.max_deepseek) ?? DEEPSEEK_CAP, DEEPSEEK_CAP),
      max_repo_write: Math.min(integerOrNull(limits.max_repo_write) ?? REPO_WRITE_CAP, REPO_WRITE_CAP),
    });
  }

  inspect({ actor, context = null } = {}) {
    requireScope(actor, READ_SCOPE);
    const requested = context ? safeContext(context, 'requested_context') : null;
    if (requested && !this.#contexts.some(candidate => sameContext(candidate, requested))) {
      throw new Error('CONTROL_PLANE_CONTEXT_NOT_REGISTERED');
    }
    const selected = requested ? [requested] : this.#contexts;
    const byContext = {};
    let runnable = 0;
    let running = 0;
    let blocked = 0;
    let done = 0;
    let total = 0;
    for (const current of selected) {
      const jobs = this.#runtime.listForContext(current);
      const summary = summarizeJobs(jobs);
      byContext[contextKey(current)] = Object.freeze({ context: current, ...summary });
      runnable += summary.runnable;
      running += summary.running;
      blocked += summary.blocked;
      done += summary.done;
      total += summary.total;
    }
    const useful = runnable + running;
    const headroomToTarget = Math.max(0, this.#limits.target_useful - useful);
    const globalHeadroom = Math.max(0, this.#limits.max_global - running);
    return Object.freeze({
      schema_version: '1.1.0',
      state_type: 'CEREBRO_JOB001_LEDGER_CONTROL_PLANE_V1',
      environment: PREPROD,
      company_ids: Object.freeze([...new Set(selected.map(item => item.company_id))].sort()),
      limits: this.#limits,
      totals: Object.freeze({ total, runnable, running, useful, blocked, done }),
      saturation: Object.freeze({
        target_useful: this.#limits.target_useful,
        headroom_to_target: headroomToTarget,
        global_running_headroom: globalHeadroom,
        target_satisfied: useful >= this.#limits.target_useful,
      }),
      second_queue: false,
      second_scheduler: false,
      second_daemon: false,
      prod_authorized: false,
      trading_access: false,
    });
  }

  requestRefill({ actor } = {}) {
    requireScope(actor, REFILL_SCOPE);
    if (!this.#workPump) throw new Error('CONTROL_PLANE_REFILL_NOT_BOUND');
    const before = this.inspect({ actor: { ...actor, scopes: [...scopeSet(actor), READ_SCOPE] } });
    const pump = this.#workPump.reconcile();
    const after = this.inspect({ actor: { ...actor, scopes: [...scopeSet(actor), READ_SCOPE] } });
    return Object.freeze({
      accepted: true,
      action: 'RECONCILE_EXISTING_WORK_PUMP',
      before: before.totals,
      after: after.totals,
      pump: Object.freeze({
        scheduling_strategy: pump?.scheduling_strategy ?? null,
        measured_model_capacity: pump?.measured_model_capacity ?? null,
        target_active_backlog: pump?.target_active_backlog ?? null,
        useful_queued: pump?.useful_queued ?? null,
        useful_running: pump?.useful_running ?? null,
        starvation: Boolean(pump?.starvation),
      }),
      new_queue_created: false,
      new_scheduler_created: false,
      prod_authorized: false,
      trading_access: false,
    });
  }
}

export function readSupervisorHeartbeatV1({ heartbeat_file, actor, expected_company_id = null, max_age_ms = 120_000, now_ms = Date.now() }) {
  requireScope(actor, READ_SCOPE);
  const file = path.resolve(requiredString(heartbeat_file, 'heartbeat_file'));
  const heartbeat = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (heartbeat?.environment !== PREPROD) throw new Error('CONTROL_PLANE_HEARTBEAT_PREPROD_ONLY');
  if (heartbeat?.trading_access === true) throw new Error('CONTROL_PLANE_HEARTBEAT_TRADING_DENIED');
  if (heartbeat?.prod_authorized === true || heartbeat?.prod_write_authorized === true) throw new Error('CONTROL_PLANE_HEARTBEAT_PROD_WRITE_DENIED');
  if (expected_company_id && heartbeat?.company_id !== expected_company_id) throw new Error('CONTROL_PLANE_HEARTBEAT_COMPANY_MISMATCH');
  if (!Number.isSafeInteger(max_age_ms) || max_age_ms < 1_000 || max_age_ms > 120_000) throw new TypeError('max_age_ms must be integer 1000..120000');
  const updatedAtMs = Date.parse(heartbeat?.updated_at || '');
  if (!Number.isFinite(updatedAtMs)) throw new Error('CONTROL_PLANE_HEARTBEAT_TIMESTAMP_INVALID');
  const ageMs = Math.max(0, now_ms - updatedAtMs);
  if (ageMs > max_age_ms) throw new Error(`CONTROL_PLANE_HEARTBEAT_STALE:${ageMs}`);
  const useful = heartbeat.useful_work || {};
  const policy = sanitizeDynamicConcurrencyV1(heartbeat.dynamic_concurrency || {});
  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_JOB001_HEARTBEAT_VIEW_V1',
    status: heartbeat.status ?? 'UNKNOWN',
    company_id: heartbeat.company_id,
    engine_id: heartbeat.engine_id,
    environment: PREPROD,
    version: heartbeat.version,
    updated_at: heartbeat.updated_at,
    age_ms: ageMs,
    useful_work: Object.freeze({
      scheduling_strategy: useful.scheduling_strategy ?? null,
      model_capacity: integerOrNull(useful.model_capacity),
      target_active_backlog: integerOrNull(useful.target_active_backlog),
      useful_queued: integerOrNull(useful.useful_queued),
      useful_running: integerOrNull(useful.useful_running),
      queue_pressure: typeof useful.queue_pressure === 'number' ? useful.queue_pressure : null,
      starvation: Boolean(useful.starvation),
    }),
    dynamic_concurrency: policy,
    work_pump_mode: heartbeat.work_pump_mode ?? null,
    kill_switch_present: Boolean(heartbeat.kill_switch_present),
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
  });
}

export const JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT = Object.freeze({
  capability: 'JOB-001/CONTROL-PLANE-V1',
  environment: PREPROD,
  read_scope: READ_SCOPE,
  refill_scope: REFILL_SCOPE,
  target_useful_default: VERIFIED_GLOBAL_CAP,
  max_global_default: VERIFIED_GLOBAL_CAP,
  max_company_default: VERIFIED_GLOBAL_CAP,
  max_deepseek_default: DEEPSEEK_CAP,
  max_repo_write_default: REPO_WRITE_CAP,
  heartbeat_ttl_max_ms: 120_000,
  dynamic_concurrency_whitelist_only: true,
  reuses_existing_runtime: true,
  reuses_existing_work_pump: true,
  second_queue: false,
  second_scheduler: false,
  second_daemon: false,
  secrets_exposed: false,
  prod_authorized: false,
  trading_access: false,
});
