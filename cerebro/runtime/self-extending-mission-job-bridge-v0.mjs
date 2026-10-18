import crypto from 'node:crypto';
import { runSelfExtendingCapabilityLoop } from './self-extending-capability-resolver-v0.mjs';

const PREPROD = 'PREPROD';
export const SELF_EXTENDING_JOB_NAME = 'RUN_SELF_EXTENDING_CAPABILITY_LOOP';

const HUMAN_REQUIRED_REASONS = new Set([
  'LEGAL_REQUIRED', 'SIGNATURE_REQUIRED', 'LOW_CONFIDENCE', 'HIGH_RISK',
  'POLICY_CONFLICT', 'SECURITY_INCIDENT', 'MONEY_LIMIT', 'CUSTOMER_HUMAN_REQUEST'
]);

function nonEmpty(value, label, max = 4096) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function runtimeContract(runtime) {
  object(runtime, 'job_runtime');
  if (typeof runtime.enqueue !== 'function') throw new TypeError('job_runtime.enqueue is required');
  return runtime;
}

function runnerContract(runner) {
  object(runner, 'worker_runner');
  if (typeof runner.register !== 'function') throw new TypeError('worker_runner.register is required');
  return runner;
}

function assertResolution(resolution) {
  object(resolution, 'resolution');
  if (resolution.state_type !== 'CEREBRO_SELF_EXTENDING_CAPABILITY_RESOLUTION_V0') {
    throw new Error('self-extending capability resolution required');
  }
  if (resolution.environment !== undefined && resolution.environment !== PREPROD) {
    throw new Error('self-extending mission bridge accepts exact PREPROD only');
  }
  return resolution;
}

function contextFor({ resolution, context, version = '0.1.0' }) {
  const safe = context ?? {
    company_id: resolution.company_id,
    engine_id: 'FACT-001',
    environment: PREPROD,
    version: resolution.version ?? version
  };
  const normalized = {
    company_id: nonEmpty(safe.company_id, 'context.company_id', 120),
    engine_id: nonEmpty(safe.engine_id, 'context.engine_id', 120),
    environment: nonEmpty(safe.environment, 'context.environment', 40),
    version: nonEmpty(safe.version, 'context.version', 120)
  };
  if (normalized.environment !== PREPROD) throw new Error('self-extending mission bridge accepts exact PREPROD only');
  if (normalized.company_id !== resolution.company_id) throw new Error('context.company_id must match resolution.company_id');
  return Object.freeze(normalized);
}

function humanResult(resolution) {
  const reason = resolution.human_required;
  if (!HUMAN_REQUIRED_REASONS.has(reason)) throw new Error(`INVALID_HUMAN_REQUIRED_REASON:${reason}`);
  return Object.freeze({
    status: 'HUMAN_REQUIRED',
    reason,
    human_action: resolution.human_action ?? null,
    resolution_hash: resolution.resolution_hash ?? null,
    resume_automatically: resolution.human_action?.resume_automatically === true,
    prod_authorized: false,
    additional_cost_eur: 0
  });
}

export function enqueueSelfExtendingResolution({
  job_runtime,
  resolution,
  context,
  priority = 50,
  max_attempts = 5,
  timeout_ms = 120_000,
  idempotency_key,
  correlation_id,
  now_ms = Date.now(),
  retry = { base_delay_ms: 5_000, max_delay_ms: 300_000, jitter_ratio: 0.2 },
  metadata = {}
} = {}) {
  const runtime = runtimeContract(job_runtime);
  const safeResolution = assertResolution(resolution);
  const ctx = contextFor({ resolution: safeResolution, context });
  const key = idempotency_key ?? `selfext:${safeResolution.resolution_hash ?? digest({
    company_id: safeResolution.company_id,
    candidate_id: safeResolution.candidate_id,
    capability_id: safeResolution.capability_id,
    dependency_kind: safeResolution.dependency_kind
  })}`;

  return runtime.enqueue({
    name: SELF_EXTENDING_JOB_NAME,
    context: ctx,
    payload: {
      resolution: safeResolution,
      metadata: stable(object(metadata, 'metadata')),
      policy: {
        recursive: true,
        resume_original_skill: true,
        automatic_paid_fallback: false,
        prod_mutation: false,
        customer_data: false,
        trading_access: false,
        additional_cost_target_eur: 0
      }
    },
    priority,
    max_attempts,
    timeout_ms,
    idempotency_key: key,
    correlation_id,
    now_ms,
    retry
  });
}

export function enqueueSelfExtendingDispatchBatch({ job_runtime, batch, version = '0.1.0', now_ms = Date.now() } = {}) {
  const runtime = runtimeContract(job_runtime);
  object(batch, 'batch');
  if (batch.environment !== PREPROD) throw new Error('dispatch batch must be PREPROD');
  if (!Array.isArray(batch.jobs)) throw new TypeError('batch.jobs must be an array');
  const accepted = [];
  const duplicates = [];

  for (const job of batch.jobs) {
    object(job, 'batch.jobs[]');
    const resolution = assertResolution(job.resolution);
    const result = enqueueSelfExtendingResolution({
      job_runtime: runtime,
      resolution,
      context: {
        company_id: job.company_id,
        engine_id: job.engine_id ?? 'FACT-001',
        environment: job.environment,
        version: resolution.version ?? version
      },
      priority: job.priority ?? 50,
      max_attempts: job.max_attempts ?? 5,
      idempotency_key: nonEmpty(job.idempotency_key, 'job.idempotency_key'),
      now_ms,
      metadata: {
        source_job_id: job.job_id ?? null,
        item_id: job.item_id ?? null,
        candidate_id: job.candidate_id ?? resolution.candidate_id ?? null,
        resume_original_skill: job.resume_original_skill === true
      }
    });
    (result.accepted ? accepted : duplicates).push(result.job.job_id);
  }

  return Object.freeze({
    status: 'JOB001_SELF_EXTENDING_DISPATCHED',
    environment: PREPROD,
    batch_hash: batch.batch_hash ?? null,
    requested: batch.jobs.length,
    accepted_count: accepted.length,
    duplicate_count: duplicates.length,
    accepted_job_ids: Object.freeze(accepted),
    duplicate_job_ids: Object.freeze(duplicates),
    human_required: Object.freeze([...(batch.human_required ?? [])]),
    prod_authorized: false,
    additional_cost_eur: 0
  });
}

export function createSelfExtendingMissionHandler({
  reuse_internal,
  wrap_existing,
  tech_scout,
  fact_build,
  verify_and_resume,
  max_steps = 16
} = {}) {
  return async function selfExtendingMissionHandler({ payload, resume_from, signal }) {
    if (signal?.aborted) throw new Error(`ABORTED:${signal.reason ?? 'UNKNOWN'}`);
    const resolution = assertResolution(object(payload, 'payload').resolution);

    if (resolution.status === 'HUMAN_REQUIRED') return humanResult(resolution);
    if (resolution.status === 'REJECTED') {
      return Object.freeze({
        status: 'REJECTED',
        reason: resolution.reason,
        terminal: true,
        resolution_hash: resolution.resolution_hash ?? null,
        prod_authorized: false,
        additional_cost_eur: 0
      });
    }

    const result = await runSelfExtendingCapabilityLoop({
      resolution,
      reuse_internal,
      wrap_existing,
      tech_scout,
      fact_build,
      verify_and_resume,
      max_steps
    });

    if (signal?.aborted) throw new Error(`ABORTED:${signal.reason ?? 'UNKNOWN'}`);
    if (result.status === 'HUMAN_REQUIRED') return humanResult(result);
    if (result.status === 'RESUMED_GREEN') {
      return Object.freeze({
        ...result,
        job001_resume: 'VERIFIED_AND_RESUMED',
        previous_checkpoint: resume_from ?? null,
        prod_authorized: false,
        additional_cost_eur: 0
      });
    }
    if (result.status === 'REJECTED') return result;

    const error = new Error(`SELF_EXTENDING_NOT_YET_GREEN:${result.status}`);
    error.code = 'SELF_EXTENDING_NOT_YET_GREEN';
    error.result = result;
    throw error;
  };
}

export function registerSelfExtendingMissionWorker({ worker_runner, ...adapters } = {}) {
  const runner = runnerContract(worker_runner);
  runner.register({
    name: SELF_EXTENDING_JOB_NAME,
    handler: createSelfExtendingMissionHandler(adapters)
  });
  return runner;
}

export const SELF_EXTENDING_MISSION_JOB_BRIDGE_V0_CONTRACT = Object.freeze({
  capability: 'JOB-001/self-extending-mission-job-bridge-v0',
  job_name: SELF_EXTENDING_JOB_NAME,
  environment: PREPROD,
  reuses_existing_job001_runtime: true,
  new_server_required: false,
  recursive_resolution: true,
  automatic_resume: true,
  human_by_exception: true,
  automatic_paid_fallback: false,
  prod_authorized: false,
  prod_writes: false,
  customer_data: false,
  trading_access: false,
  additional_cost_target_eur: 0,
  promotion: 'PREPROD->OLD_vs_NEW->tribunal->gradual_prod'
});
