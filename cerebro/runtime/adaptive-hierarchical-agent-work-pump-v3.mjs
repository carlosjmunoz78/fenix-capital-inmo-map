import { HierarchicalAgentWorkPumpV2 } from './hierarchical-agent-work-pump-v2.mjs';

const PREPROD = 'PREPROD';
const TERMINAL = new Set(['SUCCEEDED', 'DEAD_LETTER', 'CANCELLED']);
const ACTIVE = new Set(['QUEUED', 'RETRY_WAIT', 'RUNNING']);

function integer(value, label, { min = 0, max = 1_000_000 } = {}) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new TypeError(`${label} must be an integer between ${min} and ${max}`);
  return n;
}

function finite(value, label, { min = 0, max = 1_000_000 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new TypeError(`${label} must be between ${min} and ${max}`);
  return n;
}

function meta(job) { return job?.payload?.__work_pump ?? null; }
function latency(job) {
  if (!Number.isSafeInteger(job?.created_at_ms) || !Number.isSafeInteger(job?.completed_at_ms)) return null;
  return Math.max(0, job.completed_at_ms - job.created_at_ms);
}

class AdaptiveBacklogRuntimeV1 {
  #runtime;
  #context;
  #scopeVersion;
  #modelCapacity;
  #minMultiplier;
  #baseMultiplier;
  #maxMultiplier;
  #fairnessSkew;
  #last = null;

  constructor({
    job_runtime,
    context,
    scope_version,
    model_capacity = 8,
    min_multiplier = 3,
    base_multiplier = 6,
    max_multiplier = 8,
    fairness_skew = 2,
  }) {
    if (!job_runtime || typeof job_runtime.enqueue !== 'function' || typeof job_runtime.listForContext !== 'function') {
      throw new TypeError('job_runtime enqueue/listForContext is required');
    }
    this.#runtime = job_runtime;
    this.#context = context;
    this.#scopeVersion = scope_version;
    this.#modelCapacity = integer(model_capacity, 'model_capacity', { min: 1, max: 64 });
    this.#minMultiplier = integer(min_multiplier, 'min_multiplier', { min: 1, max: 16 });
    this.#baseMultiplier = integer(base_multiplier, 'base_multiplier', { min: this.#minMultiplier, max: 16 });
    this.#maxMultiplier = integer(max_multiplier, 'max_multiplier', { min: this.#baseMultiplier, max: 32 });
    this.#fairnessSkew = integer(fairness_skew, 'fairness_skew', { min: 0, max: 32 });
  }

  listForContext(context) { return this.#runtime.listForContext(context); }

  #metrics() {
    const jobs = this.#runtime.listForContext(this.#context).filter(job => meta(job)?.scope_version === this.#scopeVersion);
    const leaves = jobs.filter(job => meta(job)?.kind === 'BLOCK_SUBTASK');
    const active = leaves.filter(job => ACTIVE.has(job.status));
    const terminal = leaves.filter(job => TERMINAL.has(job.status));
    const succeeded = terminal.filter(job => job.status === 'SUCCEEDED');
    const failed = terminal.filter(job => job.status !== 'SUCCEEDED');
    const latencies = succeeded.map(latency).filter(value => value !== null);
    const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null;
    const successRate = terminal.length ? succeeded.length / terminal.length : 1;

    let multiplier = this.#baseMultiplier;
    if (successRate < 0.85 || (avgLatencyMs !== null && avgLatencyMs > 15_000)) multiplier = this.#minMultiplier;
    else if (successRate >= 0.97 && avgLatencyMs !== null && avgLatencyMs < 4_000) multiplier = this.#maxMultiplier;
    else if (successRate < 0.93 || (avgLatencyMs !== null && avgLatencyMs > 8_000)) multiplier = Math.max(this.#minMultiplier, this.#baseMultiplier - 2);

    const target = this.#modelCapacity * multiplier;
    const pendingByBlock = new Map();
    for (const job of active) {
      const blockId = meta(job)?.block_id ?? 'UNKNOWN';
      pendingByBlock.set(blockId, (pendingByBlock.get(blockId) ?? 0) + 1);
    }
    const minBlockPending = pendingByBlock.size ? Math.min(...pendingByBlock.values(), 0) : 0;
    const snapshot = Object.freeze({
      model_capacity: this.#modelCapacity,
      adaptive_multiplier: multiplier,
      target_active_backlog: target,
      active_leaf_jobs: active.length,
      terminal_leaf_jobs: terminal.length,
      succeeded_leaf_jobs: succeeded.length,
      failed_leaf_jobs: failed.length,
      observed_success_rate: Number(successRate.toFixed(4)),
      avg_success_latency_ms: avgLatencyMs,
      headroom: Math.max(0, target - active.length),
      queue_pressure: target === 0 ? 0 : Number((active.length / target).toFixed(4)),
      fairness_skew: this.#fairnessSkew,
      pending_by_block: Object.freeze(Object.fromEntries([...pendingByBlock.entries()].sort())),
    });
    this.#last = snapshot;
    return { ...snapshot, pendingByBlock, minBlockPending };
  }

  enqueue(spec) {
    const work = spec?.payload?.__work_pump;
    if (work?.kind !== 'BLOCK_SUBTASK' || work.scope_version !== this.#scopeVersion) return this.#runtime.enqueue(spec);

    const m = this.#metrics();
    const blockPending = m.pendingByBlock.get(work.block_id) ?? 0;
    if (m.active_leaf_jobs >= m.target_active_backlog) {
      return Object.freeze({ accepted: false, duplicate: false, deferred: true, reason: 'ADAPTIVE_BACKLOG_FULL', target_active_backlog: m.target_active_backlog });
    }
    if (blockPending > m.minBlockPending + this.#fairnessSkew) {
      return Object.freeze({ accepted: false, duplicate: false, deferred: true, reason: 'FAIRNESS_WORK_STEAL_ELIGIBLE', block_id: work.block_id });
    }
    return this.#runtime.enqueue(spec);
  }

  snapshot() {
    return this.#last ?? this.#metrics();
  }
}

export class AdaptiveHierarchicalAgentWorkPumpV3 {
  #backlogRuntime;
  #pump;
  #scopeVersion;
  #maxGenerated;
  #lastSnapshot = null;

  constructor({
    job_runtime,
    context,
    scope_version = '2026-10-27-v3-adaptive',
    model_capacity = 8,
    max_generated_tasks = 30_000,
    max_subtasks_per_block = 12,
    max_total_subtasks = 400,
    target_subtasks_per_block = 12,
    parent_projected_cost_eur = 0.03,
    child_projected_cost_eur = 0.025,
    enabled = true,
  }) {
    if (context?.environment !== PREPROD) throw new Error('adaptive work pump V3 is PREPROD-only');
    this.#scopeVersion = String(scope_version);
    this.#maxGenerated = integer(max_generated_tasks, 'max_generated_tasks', { min: 1, max: 100_000 });
    this.#backlogRuntime = new AdaptiveBacklogRuntimeV1({
      job_runtime,
      context,
      scope_version: this.#scopeVersion,
      model_capacity,
    });
    this.#pump = new HierarchicalAgentWorkPumpV2({
      job_runtime: this.#backlogRuntime,
      context,
      scope_version: this.#scopeVersion,
      max_subtasks_per_block,
      max_total_subtasks,
      target_subtasks_per_block,
      ready_buffer_target: model_capacity * 6,
      parent_projected_cost_eur,
      child_projected_cost_eur,
      enabled,
    });
  }

  get context() { return this.#pump.context; }
  get enabled() { return this.#pump.enabled; }
  seed() { return this.#pump.seed(); }

  reconcile() {
    const base = this.#pump.reconcile();
    const pressure = this.#backlogRuntime.snapshot();
    const snapshot = Object.freeze({
      ...base,
      scope_version: this.#scopeVersion,
      scheduling_strategy: 'ADAPTIVE_USEFUL_THROUGHPUT',
      fixed_task_target: false,
      max_generated_tasks_safety_ceiling: this.#maxGenerated,
      adaptive_backlog: pressure,
      measured_model_capacity: pressure.model_capacity,
      target_active_backlog: pressure.target_active_backlog,
      queue_pressure: pressure.queue_pressure,
      rationale: 'Generate/materialize only enough useful work to keep measured workers saturated; more queued tasks do not increase throughput.',
      prod_authorized: false,
      prod_write_authorized: false,
      trading_access: false,
    });
    this.#lastSnapshot = snapshot;
    return snapshot;
  }

  snapshot() {
    return this.#lastSnapshot ?? Object.freeze({
      ...this.#pump.snapshot(),
      scope_version: this.#scopeVersion,
      scheduling_strategy: 'ADAPTIVE_USEFUL_THROUGHPUT',
      fixed_task_target: false,
      max_generated_tasks_safety_ceiling: this.#maxGenerated,
      adaptive_backlog: this.#backlogRuntime.snapshot(),
      prod_authorized: false,
      prod_write_authorized: false,
      trading_access: false,
    });
  }
}

export const ADAPTIVE_HIERARCHICAL_AGENT_WORK_PUMP_V3_CONTRACT = Object.freeze({
  capability: 'BOOST-001/JOB-001/adaptive-hierarchical-agent-work-pump-v3',
  environment: PREPROD,
  objective: 'maximum useful measured throughput, not maximum queue length',
  fixed_task_target: false,
  model_capacity_default: 8,
  adaptive_active_backlog_range_default: Object.freeze({ min: 24, normal: 48, max: 64 }),
  max_generated_tasks_safety_ceiling_default: 30_000,
  max_generated_tasks_is_target: false,
  preserves_v2_for_rollback: true,
  extends_existing_durable_runtime: true,
  second_scheduler: false,
  second_daemon: false,
  fairness_backpressure: true,
  work_steal_friendly: true,
  deepseek_concurrency_above_measured_ceiling: false,
  repo_write_concurrency: 1,
  arbitrary_shell_access: false,
  arbitrary_repo_write_access: false,
  auto_recharge: false,
  prod_authorized: false,
  trading_access: false,
});
