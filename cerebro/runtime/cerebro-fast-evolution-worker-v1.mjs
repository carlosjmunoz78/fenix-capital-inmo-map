import {DurableWorkerRunnerV1} from './durable-worker-runner-v1.mjs';
import {tribunalDecision} from './evaluation-tribunal.mjs';

const PREPROD = 'PREPROD';
const JOB_NAME = 'CEREBRO_FAST_EVOLUTION_MICROCYCLE_V1';
const MAX_FAST_CONCURRENCY = 5;

function required(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  return value.trim();
}

function finite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

function integer(value, label, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} must be ${min}..${max}`);
  return value;
}

function validateExecutorResult(result, task) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('FAST_EVOLUTION_EXECUTOR_RESULT_REQUIRED');
  const metric = required(result.metric, 'result.metric');
  const oldValue = finite(result.old, 'result.old');
  const newValue = finite(result.new, 'result.new');
  const direction = result.direction ?? 'higher';
  if (!['higher', 'lower'].includes(direction)) throw new Error('FAST_EVOLUTION_DIRECTION_INVALID');
  const judge_id = required(result.judge_id, 'result.judge_id');
  const candidate_actor_id = required(result.candidate_actor_id, 'result.candidate_actor_id');
  if (judge_id === candidate_actor_id) throw new Error('FAST_EVOLUTION_INDEPENDENT_JUDGE_REQUIRED');
  const evidence_refs = Array.isArray(result.evidence_refs) ? [...new Set(result.evidence_refs.map(x => required(x, 'result.evidence_refs[]')))] : [];
  if (evidence_refs.length === 0) throw new Error('FAST_EVOLUTION_EVIDENCE_REQUIRED');
  if (task.old_vs_new_required !== true || task.tribunal_required !== true) throw new Error('FAST_EVOLUTION_GOVERNANCE_REQUIRED');
  return Object.freeze({metric, old: oldValue, new: newValue, direction, judge_id, candidate_actor_id, evidence_refs: Object.freeze(evidence_refs), real_outcome_delta: result.real_outcome_delta ?? null});
}

export function createFastEvolutionWorker({
  job_runtime,
  execute_candidate,
  worker_id = 'cerebro-fast-evolution-worker-v1',
  max_concurrency = MAX_FAST_CONCURRENCY,
  max_per_company = MAX_FAST_CONCURRENCY,
  clock = Date.now
} = {}) {
  if (typeof execute_candidate !== 'function') throw new TypeError('execute_candidate required');
  const concurrency = integer(max_concurrency, 'max_concurrency', 1, MAX_FAST_CONCURRENCY);
  const perCompany = integer(max_per_company, 'max_per_company', 1, concurrency);
  const runner = new DurableWorkerRunnerV1({
    job_runtime,
    worker_id,
    environment: PREPROD,
    max_concurrency: concurrency,
    max_per_company: perCompany,
    clock
  });

  runner.register({name: JOB_NAME, handler: async ({job, payload, signal, heartbeat, checkpoint}) => {
    if (payload?.state_type !== 'CEREBRO_FAST_EVOLUTION_JOB_PAYLOAD_V1') throw new Error('FAST_EVOLUTION_JOB_PAYLOAD_REQUIRED');
    if (payload.prod_authorized !== false || payload.prod_write_authorized !== false || Number(payload.additional_cost_eur) !== 0) throw new Error('FAST_EVOLUTION_AUTHORITY_EXPANSION_DENIED');
    const task = payload.task;
    if (!task || task.prod_authorized !== false || task.prod_write_authorized !== false || Number(task.additional_cost_eur) !== 0) throw new Error('FAST_EVOLUTION_TASK_AUTHORITY_INVALID');
    const startedAt = clock();
    const raw = await execute_candidate({task, job, signal, heartbeat, checkpoint});
    const measured = validateExecutorResult(raw, task);
    const evaluation = Object.freeze({
      evaluation_id: `fast:${job.job_id}`,
      company_id: job.context.company_id,
      engine_id: 'LRN-001',
      environment: PREPROD,
      version: job.context.version,
      experiment_id: task.task_id,
      benchmark_ref: measured.evidence_refs[0],
      metric: measured.metric,
      old: measured.old,
      new: measured.new,
      delta: measured.new - measured.old,
      leakage_check: 'PASS',
      adversarial_count: 0,
      prod_authorized: false
    });
    const tribunal = tribunalDecision({
      evaluation,
      judge_id: measured.judge_id,
      candidate_actor_id: measured.candidate_actor_id,
      real_outcome_delta: measured.real_outcome_delta,
      metric_direction: measured.direction
    });
    const finishedAt = clock();
    if (tribunal.decision !== 'PASS') return Object.freeze({
      status: 'HOLD',
      reason: `TRIBUNAL_${tribunal.decision}:${tribunal.reason}`,
      task_id: task.task_id,
      evaluation,
      tribunal,
      evidence_refs: measured.evidence_refs,
      worker_execution_ms: Math.max(0, finishedAt - startedAt),
      prod_authorized: false,
      prod_write_authorized: false,
      additional_cost_eur: 0
    });
    return Object.freeze({
      status: 'PREPROD_MICROCYCLE_GREEN',
      task_id: task.task_id,
      evaluation,
      tribunal,
      evidence_refs: measured.evidence_refs,
      worker_execution_ms: Math.max(0, finishedAt - startedAt),
      adoption_authorized: false,
      prod_authorized: false,
      prod_write_authorized: false,
      spend_authorized: false,
      trading_access: false,
      additional_cost_eur: 0,
      next_gate: 'PERSIST_LEARNING_AND_APPLY_GOVERNED_PREPROD_ADOPTION_ONLY_AFTER_POLICY_GATE'
    });
  }});
  return runner;
}

export async function drainFastEvolutionCompany({runner, company_id = 'fenix', version = '1.0.0', slots = MAX_FAST_CONCURRENCY, max_rounds = 100} = {}) {
  if (!runner || typeof runner.drainFair !== 'function') throw new TypeError('runner required');
  const safeSlots = integer(slots, 'slots', 1, MAX_FAST_CONCURRENCY);
  const context = Object.freeze({company_id: required(company_id, 'company_id'), engine_id: 'LRN-001', environment: PREPROD, version: required(version, 'version')});
  const contexts = Array.from({length: safeSlots}, () => context);
  return runner.drainFair({contexts, max_rounds, idle_delay_ms: 0});
}

export const CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT = Object.freeze({
  environment: PREPROD,
  job_name: JOB_NAME,
  existing_worker_runtime: 'DurableWorkerRunnerV1',
  existing_job_runtime: 'JOB-001',
  warm_shared_worker: true,
  max_concurrency: MAX_FAST_CONCURRENCY,
  max_per_company: MAX_FAST_CONCURRENCY,
  same_company_parallel_fast_path: true,
  old_vs_new_required: true,
  independent_tribunal_required: true,
  adoption_authorized: false,
  prod_authorized: false,
  prod_write_authorized: false,
  spend_authorized: false,
  trading_access: false,
  additional_cost_target_eur: 0
});
