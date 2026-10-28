import path from 'node:path';
import { DurableJobRuntimeV1 } from './durable-job-runtime-v1.mjs';
import { readSupervisorHeartbeatV1, JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT } from './job001-ledger-control-plane-v1.mjs';

const PREPROD = 'PREPROD';
const RUNNABLE = new Set(['QUEUED', 'RETRY_WAIT']);
const RUNNING = new Set(['RUNNING', 'LEASED', 'HEARTBEATING']);
const BLOCKED = new Set(['DEAD_LETTER', 'HUMAN_REQUIRED', 'FAILED_MANUAL']);
const DONE = new Set(['SUCCEEDED', 'DONE', 'CANCELLED']);

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  return value.trim();
}

function integerOrNull(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function summarizeJobs(jobs) {
  let runnable = 0;
  let running = 0;
  let blocked = 0;
  let done = 0;
  for (const job of jobs) {
    const status = String(job?.status || 'UNKNOWN');
    if (RUNNABLE.has(status)) runnable += 1;
    if (RUNNING.has(status)) running += 1;
    if (BLOCKED.has(status)) blocked += 1;
    if (DONE.has(status)) done += 1;
  }
  return Object.freeze({
    total: jobs.length,
    runnable,
    running,
    useful: runnable + running,
    blocked,
    done,
  });
}

function projectDynamicConcurrency(value = {}) {
  const provider = value?.max_provider_concurrency;
  return Object.freeze({
    environment: value?.environment === PREPROD ? PREPROD : null,
    target_global_concurrency: integerOrNull(value?.target_global_concurrency),
    max_global_concurrency: integerOrNull(value?.max_global_concurrency),
    max_company_concurrency: integerOrNull(value?.max_company_concurrency),
    max_provider_deepseek_concurrency: integerOrNull(value?.max_deepseek_concurrency ?? provider?.deepseek),
    max_repo_write_concurrency: integerOrNull(value?.max_repo_write_concurrency),
    decision: typeof value?.decision === 'string' ? value.decision : null,
  });
}

function canonicalModelContext({ company_id, version = 'work-pump-v3-adaptive' }) {
  return Object.freeze({
    company_id: requiredString(company_id, 'company_id'),
    engine_id: 'BOOST-001',
    environment: PREPROD,
    version: requiredString(version, 'model_context.version'),
  });
}

export function readJob001HostStatusV1({
  state_dir,
  actor,
  expected_company_id = 'fenix',
  model_context = null,
  max_age_ms = 120_000,
  now_ms = Date.now(),
} = {}) {
  const root = path.resolve(requiredString(state_dir, 'state_dir'));
  const companyId = requiredString(expected_company_id, 'expected_company_id');
  const heartbeat = readSupervisorHeartbeatV1({
    heartbeat_file: path.join(root, 'heartbeat.json'),
    actor,
    expected_company_id: companyId,
    max_age_ms,
    now_ms,
  });

  const context = model_context
    ? Object.freeze({
        company_id: requiredString(model_context.company_id, 'model_context.company_id'),
        engine_id: requiredString(model_context.engine_id, 'model_context.engine_id'),
        environment: requiredString(model_context.environment, 'model_context.environment'),
        version: requiredString(model_context.version, 'model_context.version'),
      })
    : canonicalModelContext({ company_id: companyId });

  if (context.company_id !== companyId) throw new Error('JOB001_HOST_STATUS_MODEL_COMPANY_MISMATCH');
  if (context.environment !== PREPROD) throw new Error('JOB001_HOST_STATUS_PREPROD_ONLY');
  if (context.engine_id !== 'BOOST-001') throw new Error('JOB001_HOST_STATUS_MODEL_CONTEXT_DENIED');

  const runtime = new DurableJobRuntimeV1({ file_path: path.join(root, 'jobs.v8journal'), environment: PREPROD });
  const modelLane = summarizeJobs(runtime.listForContext(context));
  const dynamic = projectDynamicConcurrency(heartbeat.dynamic_concurrency);
  const useful = heartbeat.useful_work || {};
  const usefulQueued = integerOrNull(useful.useful_queued);
  const usefulRunning = integerOrNull(useful.useful_running);
  const targetUseful = JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT.target_useful_default;
  const usefulTotal = usefulQueued === null || usefulRunning === null ? null : usefulQueued + usefulRunning;

  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_JOB001_HOST_STATUS_V1',
    status: heartbeat.status,
    company_id: heartbeat.company_id,
    engine_id: heartbeat.engine_id,
    environment: PREPROD,
    version: heartbeat.version,
    updated_at: heartbeat.updated_at,
    age_ms: heartbeat.age_ms,
    useful_work: Object.freeze({
      scheduling_strategy: useful.scheduling_strategy ?? null,
      model_capacity: integerOrNull(useful.model_capacity),
      target_active_backlog: integerOrNull(useful.target_active_backlog),
      useful_queued: usefulQueued,
      useful_running: usefulRunning,
      useful_total: usefulTotal,
      target_useful: targetUseful,
      headroom_to_target: usefulTotal === null ? null : Math.max(0, targetUseful - usefulTotal),
      target_satisfied: usefulTotal === null ? null : usefulTotal >= targetUseful,
      queue_pressure: numberOrNull(useful.queue_pressure),
      starvation: Boolean(useful.starvation),
    }),
    model_lane: Object.freeze({
      context,
      provider_id: 'deepseek',
      ...modelLane,
      max_concurrency: dynamic.max_provider_deepseek_concurrency,
      at_capacity: dynamic.max_provider_deepseek_concurrency === null
        ? null
        : modelLane.running >= dynamic.max_provider_deepseek_concurrency,
    }),
    repo_write_lane: Object.freeze({
      running: null,
      max_concurrency: dynamic.max_repo_write_concurrency,
      physically_observable: false,
    }),
    dynamic_concurrency: dynamic,
    work_pump_mode: heartbeat.work_pump_mode ?? null,
    kill_switch_present: Boolean(heartbeat.kill_switch_present),
    raw_jobs_exposed: false,
    raw_payloads_exposed: false,
    raw_journal_exposed: false,
    secrets_exposed: false,
    second_queue: false,
    second_scheduler: false,
    second_daemon: false,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
  });
}

export const JOB001_HOST_STATUS_V1_CONTRACT = Object.freeze({
  capability: 'JOB-001/HOST-STATUS-V1',
  environment: PREPROD,
  company_bound: true,
  model_context_engine_id: 'BOOST-001',
  model_provider_id: 'deepseek',
  max_heartbeat_age_ms_default: 120_000,
  reuses_existing_job_runtime: true,
  reads_existing_supervisor_heartbeat: true,
  raw_jobs_exposed: false,
  raw_payloads_exposed: false,
  raw_journal_exposed: false,
  secrets_exposed: false,
  second_queue: false,
  second_scheduler: false,
  second_daemon: false,
  additional_cost_target_eur: 0,
  prod_authorized: false,
  trading_access: false,
});