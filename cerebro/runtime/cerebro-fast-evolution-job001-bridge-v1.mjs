import path from 'node:path';
import {DurableJobRuntimeV1} from './durable-job-runtime-v1.mjs';
import {buildFastEvolutionPlan} from './cerebro-fast-evolution-planner-v1.mjs';

const PREPROD = 'PREPROD';
const JOB_NAME = 'CEREBRO_FAST_EVOLUTION_MICROCYCLE_V1';
const PRIORITY = Object.freeze({P0: 0, P1: 10, P2: 20, P3: 30});
const TIMEOUT = Object.freeze({MICRO_EXPERIMENT: 180000, CANDIDATE_SCORE: 30000});

function required(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  return value.trim();
}

function assertPlan(plan) {
  if (!plan || plan.state_type !== 'CEREBRO_FAST_EVOLUTION_PLAN_V1') throw new Error('FAST_EVOLUTION_PLAN_REQUIRED');
  if (plan.environment !== PREPROD || plan.status !== 'FAST_PATH_READY_PREPROD') throw new Error('FAST_EVOLUTION_PREPROD_PLAN_REQUIRED');
  if (!Array.isArray(plan.active_wave) || plan.active_wave.length > 5) throw new Error('FAST_EVOLUTION_WAVE_LIMIT_EXCEEDED');
  if (plan.authority?.prod_authorized !== false || plan.authority?.prod_write_authorized !== false || plan.authority?.spend_authorized !== false || Number(plan.authority?.additional_cost_eur) !== 0) throw new Error('FAST_EVOLUTION_AUTHORITY_EXPANSION_DENIED');
  return plan;
}

export function enqueueFastEvolutionPlan({job_runtime, plan, company_id = 'fenix', version = '1.0.0', now_ms = Date.now()} = {}) {
  if (!job_runtime || typeof job_runtime.enqueue !== 'function') throw new TypeError('job_runtime with enqueue required');
  const safePlan = assertPlan(plan);
  const context = Object.freeze({company_id: required(company_id, 'company_id'), engine_id: 'LRN-001', environment: PREPROD, version: required(version, 'version')});
  const receipts = safePlan.active_wave.map((task, index) => job_runtime.enqueue({
    name: JOB_NAME,
    context,
    payload: {
      schema_version: '1.0.0',
      state_type: 'CEREBRO_FAST_EVOLUTION_JOB_PAYLOAD_V1',
      task,
      source_plan_generated_at: safePlan.generated_at,
      execution_path: task.execution_path,
      engine_chain: task.engine_chain,
      old_vs_new_required: true,
      tribunal_required: true,
      prod_authorized: false,
      prod_write_authorized: false,
      additional_cost_eur: 0
    },
    priority: PRIORITY[task.priority] ?? 30,
    max_attempts: 3,
    timeout_ms: TIMEOUT[task.latency_class] ?? 30000,
    idempotency_key: `fast-evolution:${task.task_id}`,
    correlation_id: `fast-evolution:${task.signal_id}`,
    now_ms: now_ms + index,
    retry: {base_delay_ms: 250, max_delay_ms: 5000, jitter_ratio: 0.1}
  }));
  const accepted = receipts.filter(x => x.accepted).length;
  const duplicates = receipts.filter(x => x.duplicate).length;
  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_FAST_EVOLUTION_JOB001_DISPATCH_V1',
    status: 'FAST_EVOLUTION_DISPATCHED_PREPROD',
    context,
    plan_generated_at: safePlan.generated_at,
    active_wave_total: safePlan.active_wave.length,
    accepted_total: accepted,
    duplicate_total: duplicates,
    receipts: Object.freeze(receipts),
    prod_authorized: false,
    prod_write_authorized: false,
    spend_authorized: false,
    trading_access: false,
    additional_cost_eur: 0,
    next_gate: 'REGISTER_MICROCYCLE_WORKER_HANDLER_AND_MEASURE_REAL_SIGNAL_TO_TRIBUNAL_P50_P95'
  });
}

export function runFastEvolutionIngress({company_root, company_id = 'fenix', version = '1.0.0', signals = [], now_ms = Date.now()} = {}) {
  const root = required(company_root, 'company_root');
  const plan = buildFastEvolutionPlan({signals, now: new Date(now_ms).toISOString()});
  const runtime = new DurableJobRuntimeV1({file_path: path.join(root, 'job001-fast-evolution.v1.journal'), environment: PREPROD});
  const dispatch = enqueueFastEvolutionPlan({job_runtime: runtime, plan, company_id, version, now_ms});
  return Object.freeze({plan, dispatch, journal_path: runtime.journal_path, operation_count: runtime.operation_count});
}

export const CEREBRO_FAST_EVOLUTION_JOB001_BRIDGE_V1_CONTRACT = Object.freeze({
  environment: PREPROD,
  job_name: JOB_NAME,
  existing_job_runtime: 'JOB-001',
  shared_persistent_journal: true,
  event_driven_ingress: true,
  max_active_fronts: 5,
  retry_base_delay_ms: 250,
  retry_max_delay_ms: 5000,
  prod_authorized: false,
  prod_write_authorized: false,
  spend_authorized: false,
  trading_access: false,
  additional_cost_eur: 0
});
