import { executeMissionDerivedWork, selectMissionUnit } from './mission-derived-useful-work-v1.mjs';

const PREPROD = 'PREPROD';
const ACTIVE = new Set(['QUEUED', 'RETRY_WAIT', 'RUNNING']);
const LANE_COUNT = 68;
const VERIFIED_GLOBAL_CAP = 180;
const MISSION_ATOMIC_COUNT = selectMissionUnit(0, 0).atomic_count;
export const MISSION_DERIVED_JOB_NAME_V1 = 'mission.derived.useful-work.v1';

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new TypeError(`${label} must be integer ${min}..${max}`);
  return n;
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  return value.trim();
}

function runtimeContract(runtime) {
  if (!runtime || typeof runtime.enqueue !== 'function' || typeof runtime.listForContext !== 'function') {
    throw new TypeError('job_runtime enqueue/listForContext required');
  }
  return runtime;
}

function runnerContract(runner) {
  if (!runner || typeof runner.register !== 'function') throw new TypeError('worker_runner.register required');
  return runner;
}

export function missionDerivedJob001ContextV1({ company_id = 'fenix', version = 'mission-derived-useful-work-v1' } = {}) {
  return Object.freeze({
    company_id: nonEmpty(company_id, 'company_id'),
    engine_id: 'JOB-001',
    environment: PREPROD,
    version: nonEmpty(version, 'version'),
  });
}

function missionJobs(runtime, context) {
  return runtime.listForContext(context).filter(job => job?.name === MISSION_DERIVED_JOB_NAME_V1);
}

function sequenceOf(job) {
  const value = job?.payload?.__mission_derived?.sequence;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export class MissionDerivedJob001SourceV1 {
  #runtime;
  #context;
  #targetActive;
  #maxEnqueue;

  constructor({ job_runtime, context = missionDerivedJob001ContextV1(), target_active = VERIFIED_GLOBAL_CAP, max_enqueue_per_reconcile = VERIFIED_GLOBAL_CAP } = {}) {
    this.#runtime = runtimeContract(job_runtime);
    if (!context || context.environment !== PREPROD || context.engine_id !== 'JOB-001') throw new Error('mission-derived JOB-001 context must be JOB-001 PREPROD');
    this.#context = Object.freeze({ ...context });
    this.#targetActive = integer(target_active, 'target_active', { min: 0, max: VERIFIED_GLOBAL_CAP });
    this.#maxEnqueue = integer(max_enqueue_per_reconcile, 'max_enqueue_per_reconcile', { min: 1, max: VERIFIED_GLOBAL_CAP });
  }

  snapshot() {
    const jobs = missionJobs(this.#runtime, this.#context);
    const active = jobs.filter(job => ACTIVE.has(job.status));
    const sequences = jobs.map(sequenceOf).filter(value => value !== null);
    const uniqueSequences = new Set(sequences.filter(value => value < MISSION_ATOMIC_COUNT));
    const nextSequence = uniqueSequences.size ? Math.max(...uniqueSequences) + 1 : 0;
    const remainingUnique = Math.max(0, MISSION_ATOMIC_COUNT - nextSequence);
    return Object.freeze({
      schema_version: '1.2.0',
      state_type: 'CEREBRO_MISSION_DERIVED_JOB001_SOURCE_V1',
      environment: PREPROD,
      context: this.#context,
      job_name: MISSION_DERIVED_JOB_NAME_V1,
      target_active: this.#targetActive,
      active_jobs: active.length,
      total_jobs: jobs.length,
      unique_atomic_work_units: MISSION_ATOMIC_COUNT,
      issued_unique_work_units: nextSequence,
      remaining_unique_work_units: remainingUnique,
      next_sequence: nextSequence,
      headroom: Math.max(0, this.#targetActive - active.length),
      auto_refill: true,
      refill_until_unique_backlog_exhausted: true,
      duplicate_replay_after_exhaustion: false,
      exhausted: remainingUnique === 0,
      lane_count: LANE_COUNT,
      verified_global_cap: VERIFIED_GLOBAL_CAP,
      second_queue: false,
      second_scheduler: false,
      second_daemon: false,
      paid_ai: false,
      additional_cost_eur: 0,
      prod_authorized: false,
      trading_access: false,
    });
  }

  reconcile() {
    const before = this.snapshot();
    const requested = Math.min(before.headroom, this.#maxEnqueue, before.remaining_unique_work_units);
    let accepted = 0;
    let duplicates = 0;
    for (let offset = 0; offset < requested; offset += 1) {
      const sequence = before.next_sequence + offset;
      if (sequence >= MISSION_ATOMIC_COUNT) break;
      const lane = sequence % LANE_COUNT;
      const cycle = Math.floor(sequence / LANE_COUNT);
      const result = this.#runtime.enqueue({
        name: MISSION_DERIVED_JOB_NAME_V1,
        context: this.#context,
        payload: {
          lane,
          cycle,
          fallback: true,
          __mission_derived: { sequence, source: 'MISSION_DAG_V1', unique_backlog_size: MISSION_ATOMIC_COUNT },
        },
        priority: 60,
        max_attempts: 3,
        timeout_ms: 180_000,
        idempotency_key: `mission-derived-v1:${sequence}`,
        retry: { base_delay_ms: 5_000, max_delay_ms: 120_000, jitter_ratio: 0.2 },
      });
      if (result.accepted) accepted += 1;
      else if (result.duplicate) duplicates += 1;
    }
    return Object.freeze({
      ...this.snapshot(),
      accepted_this_reconcile: accepted,
      duplicates_this_reconcile: duplicates,
      requested_this_reconcile: requested,
    });
  }
}

export function registerMissionDerivedJob001HandlerV1({ worker_runner, execute_work = executeMissionDerivedWork } = {}) {
  const runner = runnerContract(worker_runner);
  if (typeof execute_work !== 'function') throw new TypeError('execute_work required');
  runner.register({
    name: MISSION_DERIVED_JOB_NAME_V1,
    handler: async ({ payload, signal, heartbeat, checkpoint }) => {
      if (signal?.aborted) throw new Error(`ABORTED:${signal.reason ?? 'UNKNOWN'}`);
      const lane = integer(payload?.lane, 'payload.lane', { min: 0, max: LANE_COUNT - 1 });
      const cycle = integer(payload?.cycle, 'payload.cycle', { min: 0, max: Math.ceil(MISSION_ATOMIC_COUNT / LANE_COUNT) });
      const fallback = payload?.fallback !== false;
      heartbeat?.();
      checkpoint?.({ stage: 'MISSION_DERIVED_START', lane, cycle });
      const result = await execute_work({ lane, cycle, fallback });
      if (signal?.aborted) throw new Error(`ABORTED:${signal.reason ?? 'UNKNOWN'}`);
      checkpoint?.({ stage: 'MISSION_DERIVED_DONE', lane, cycle, execution_state: result?.execution_state ?? null });
      return Object.freeze({
        status: 'SUCCEEDED',
        mission_id: result?.work_unit?.mission_id ?? null,
        work_unit_id: result?.work_unit?.work_unit_id ?? null,
        execution_state: result?.execution_state ?? null,
        idempotency_key: result?.idempotency_key ?? null,
        fallback_used: Boolean(result?.fallback?.used),
        paid_ai_used: false,
        prod_authorized: false,
        prod_write_authorized: false,
        trading_access: false,
      });
    },
  });
  return runner;
}

export const MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT = Object.freeze({
  capability: 'JOB-001/MISSION-DERIVED-ADAPTER-V1',
  environment: PREPROD,
  job_name: MISSION_DERIVED_JOB_NAME_V1,
  durable_runtime_reused: true,
  durable_worker_reused: true,
  deterministic_sequence: true,
  idempotency_scope: 'company_id+engine_id+environment+version+sequence',
  target_active_default: VERIFIED_GLOBAL_CAP,
  target_active_max: VERIFIED_GLOBAL_CAP,
  unique_atomic_work_units: MISSION_ATOMIC_COUNT,
  lane_range: Object.freeze({ min: 0, max: LANE_COUNT - 1 }),
  auto_refill: true,
  refill_until_unique_backlog_exhausted: true,
  duplicate_replay_after_exhaustion: false,
  second_queue: false,
  second_scheduler: false,
  second_daemon: false,
  paid_ai: false,
  additional_cost_eur: 0,
  prod_authorized: false,
  trading_access: false,
});
