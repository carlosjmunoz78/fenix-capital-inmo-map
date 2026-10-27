import { FANOUT_BLOCKS, buildDeepSeekBlockInput } from './max-fanout-block-worker-v1.mjs';
import { DynamicDagPlannerV1 } from './dynamic-dag-planner-v1.mjs';

const PREPROD = 'PREPROD';
const MODEL_JOB = 'model.deepseek.agent';

function nonEmpty(value, label, max = 10_000) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  const text = value.trim();
  if (text.length > max) throw new TypeError(`${label} exceeds ${max} characters`);
  return text;
}

function integer(value, label, { min = 0, max = 1_000_000 } = {}) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new TypeError(`${label} must be an integer between ${min} and ${max}`);
  return n;
}

function finite(value, label, { min = 0, max = 10_000 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new TypeError(`${label} must be between ${min} and ${max}`);
  return n;
}

function safeContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context must be an object');
  const out = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id', 128),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id', 128),
    environment: nonEmpty(value.environment, 'context.environment', 32),
    version: nonEmpty(value.version, 'context.version', 128),
  });
  if (out.environment !== PREPROD) throw new Error('hierarchical work pump V2 is PREPROD-only');
  return out;
}

function stripJsonFence(value) {
  const text = nonEmpty(value, 'DeepSeek output', 160_000);
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : text).trim();
}

function safeId(value, label) {
  const id = nonEmpty(value, label, 64);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(id)) throw new Error(`${label} contains unsupported characters`);
  return id;
}

function parsePlan(outputText, { blockId, maxSubtasks }) {
  let raw;
  try { raw = JSON.parse(stripJsonFence(outputText)); }
  catch (error) { throw new Error(`PLAN_JSON_INVALID:${String(error?.message || error).slice(0, 200)}`); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('PLAN_ROOT_INVALID');
  if (!Array.isArray(raw.independent_subtasks)) throw new Error('PLAN_SUBTASKS_MISSING');
  if (raw.independent_subtasks.length < 1 || raw.independent_subtasks.length > maxSubtasks) {
    throw new Error(`PLAN_SUBTASK_COUNT_INVALID:${raw.independent_subtasks.length}`);
  }
  const seen = new Set();
  const subtasks = raw.independent_subtasks.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`PLAN_SUBTASK_INVALID:${index}`);
    const subtask_id = safeId(item.subtask_id, `independent_subtasks[${index}].subtask_id`);
    if (seen.has(subtask_id)) throw new Error(`PLAN_DUPLICATE_SUBTASK:${subtask_id}`);
    seen.add(subtask_id);
    const dependsRaw = item.depends_on ?? [];
    if (!Array.isArray(dependsRaw)) throw new Error(`PLAN_DEPENDENCIES_INVALID:${subtask_id}`);
    const depends_on = [...new Set(dependsRaw.map((dep, depIndex) => safeId(dep, `${subtask_id}.depends_on[${depIndex}]`)))];
    if (depends_on.includes(subtask_id)) throw new Error(`PLAN_SELF_DEPENDENCY:${subtask_id}`);
    return Object.freeze({
      subtask_id,
      title: nonEmpty(item.title, `${subtask_id}.title`, 240),
      objective: nonEmpty(item.objective, `${subtask_id}.objective`, 5000),
      depends_on: Object.freeze(depends_on),
      priority: integer(item.priority ?? 100, `${subtask_id}.priority`, { min: 0, max: 1000 }),
    });
  });
  for (const task of subtasks) {
    for (const dependency of task.depends_on) if (!seen.has(dependency)) throw new Error(`PLAN_UNKNOWN_DEPENDENCY:${task.subtask_id}:${dependency}`);
  }

  DynamicDagPlannerV1.fromBlocks({
    dag_id: `validate:${blockId}`,
    blocks: [{
      block_id: blockId,
      context: { company_id: 'validator', engine_id: 'BOOST-001', environment: PREPROD, version: 'v2' },
      subtasks: subtasks.map(task => ({
        subtask_id: task.subtask_id,
        name: MODEL_JOB,
        depends_on: task.depends_on,
        priority: task.priority,
      })),
    }],
  });
  return Object.freeze({ subtasks: Object.freeze(subtasks) });
}

function resultText(job) {
  return typeof job?.result?.output_text === 'string' ? job.result.output_text : null;
}

function workMeta(job) { return job?.payload?.__work_pump ?? null; }

function dependencyDigest(jobs) {
  return jobs.map(job => ({
    subtask_id: workMeta(job)?.subtask_id ?? null,
    status: job.status,
    output_text: typeof job.result?.output_text === 'string' ? job.result.output_text.slice(0, 5000) : null,
  }));
}

function usefulStatus(job) {
  const meta = workMeta(job);
  return meta?.kind === 'BLOCK_DECOMPOSE' || meta?.kind === 'BLOCK_DECOMPOSE_REPAIR' || meta?.kind === 'BLOCK_SUBTASK';
}

function latencyMs(job) {
  if (!Number.isSafeInteger(job?.created_at_ms) || !Number.isSafeInteger(job?.completed_at_ms)) return null;
  return Math.max(0, job.completed_at_ms - job.created_at_ms);
}

export class HierarchicalAgentWorkPumpV2 {
  #runtime;
  #context;
  #scopeVersion;
  #maxSubtasksPerBlock;
  #maxTotalSubtasks;
  #targetSubtasksPerBlock;
  #readyBufferTarget;
  #parentCost;
  #childCost;
  #enabled;
  #lastSnapshot = null;

  constructor({
    job_runtime,
    context,
    scope_version = '2026-10-27-v2',
    max_subtasks_per_block = 12,
    max_total_subtasks = 400,
    target_subtasks_per_block = 12,
    ready_buffer_target = 24,
    parent_projected_cost_eur = 0.03,
    child_projected_cost_eur = 0.025,
    enabled = true,
  }) {
    if (!job_runtime || typeof job_runtime.enqueue !== 'function' || typeof job_runtime.listForContext !== 'function') {
      throw new TypeError('job_runtime enqueue/listForContext is required');
    }
    this.#runtime = job_runtime;
    this.#context = safeContext(context);
    this.#scopeVersion = nonEmpty(scope_version, 'scope_version', 128);
    this.#maxSubtasksPerBlock = integer(max_subtasks_per_block, 'max_subtasks_per_block', { min: 1, max: 32 });
    this.#maxTotalSubtasks = integer(max_total_subtasks, 'max_total_subtasks', { min: 1, max: 1000 });
    this.#targetSubtasksPerBlock = integer(target_subtasks_per_block, 'target_subtasks_per_block', { min: 1, max: this.#maxSubtasksPerBlock });
    this.#readyBufferTarget = integer(ready_buffer_target, 'ready_buffer_target', { min: 1, max: 256 });
    this.#parentCost = finite(parent_projected_cost_eur, 'parent_projected_cost_eur');
    this.#childCost = finite(child_projected_cost_eur, 'child_projected_cost_eur');
    this.#enabled = Boolean(enabled);
  }

  get context() { return this.#context; }
  get enabled() { return this.#enabled; }

  #parentPayload(block) {
    const built = buildDeepSeekBlockInput(block.id);
    return {
      input: `${built.input}\n\nSTRICT_DECOMPOSITION_SCHEMA:\nReturn ONLY JSON (no markdown) with independent_subtasks as an array of 1-${this.#maxSubtasksPerBlock} objects. Aim for about ${this.#targetSubtasksPerBlock} useful, independently executable microtasks when the scope supports it; return fewer only when further splitting would create filler or false independence. Each object MUST be {"subtask_id":"short-id","title":"...","objective":"one concrete bounded deliverable","depends_on":["other-short-id"],"priority":0-1000}. Prefer small deliverables that can finish independently and expose real dependencies only. Do not request shell access, credentials, PROD writes or Trading. Depth is exactly one: children execute work and produce governed handoff/evidence; they do not spawn agents.`,
      instructions: 'You are the decomposition agent for CEREBRO PREPROD. Return strict JSON only. Split work aggressively into useful bounded microtasks so the durable queue stays populated. Never invent filler, dependencies or authority.',
      model: 'deepseek-flash',
      max_output_tokens: 2600,
      projected_cost_eur: this.#parentCost,
      __learning: { provider_id: 'deepseek', model_id: 'deepseek-flash', task_class: 'decomposition-v2' },
      __work_pump: {
        kind: 'BLOCK_DECOMPOSE',
        scope_version: this.#scopeVersion,
        block_id: block.id,
        depth: 0,
      },
    };
  }

  #repairPayload(block, invalidOutput, errorText) {
    return {
      input: `BLOCK ${block.id}: ${block.title}\n\nThe prior decomposition was rejected: ${String(errorText).slice(0, 800)}\n\nPRIOR_OUTPUT:\n${String(invalidOutput).slice(0, 12000)}\n\nReturn ONLY corrected JSON with independent_subtasks array, 1-${this.#maxSubtasksPerBlock} items; aim for about ${this.#targetSubtasksPerBlock} useful microtasks when legitimate. Every item: {"subtask_id":"short-id","title":"...","objective":"concrete bounded deliverable","depends_on":[],"priority":100}. Dependencies may reference only sibling subtask_id values. No markdown. No recursive agents.`,
      instructions: 'Repair one malformed CEREBRO decomposition. Strict JSON only. This is the only repair attempt.',
      model: 'deepseek-flash',
      max_output_tokens: 2600,
      projected_cost_eur: this.#parentCost,
      __learning: { provider_id: 'deepseek', model_id: 'deepseek-flash', task_class: 'decomposition-repair-v2' },
      __work_pump: {
        kind: 'BLOCK_DECOMPOSE_REPAIR',
        scope_version: this.#scopeVersion,
        block_id: block.id,
        depth: 0,
      },
    };
  }

  seed() {
    if (!this.#enabled) return Object.freeze({ enabled: false, accepted: 0, duplicates: 0 });
    let accepted = 0;
    let duplicates = 0;
    for (const block of FANOUT_BLOCKS) {
      const receipt = this.#runtime.enqueue({
        name: MODEL_JOB,
        context: this.#context,
        payload: this.#parentPayload(block),
        priority: 10 + block.index,
        max_attempts: 3,
        timeout_ms: 180_000,
        idempotency_key: `pump:${this.#scopeVersion}:${block.id}:decompose`,
        correlation_id: `pump:${this.#scopeVersion}:${block.id}`,
      });
      if (receipt.accepted) accepted += 1;
      else if (receipt.duplicate) duplicates += 1;
    }
    return Object.freeze({ enabled: true, accepted, duplicates, total_blocks: FANOUT_BLOCKS.length });
  }

  #planJobForBlock(jobs, block) {
    const related = jobs.filter(job => {
      const meta = workMeta(job);
      return meta?.scope_version === this.#scopeVersion && meta?.block_id === block.id &&
        (meta?.kind === 'BLOCK_DECOMPOSE' || meta?.kind === 'BLOCK_DECOMPOSE_REPAIR');
    });
    const repair = related.find(job => workMeta(job)?.kind === 'BLOCK_DECOMPOSE_REPAIR');
    const original = related.find(job => workMeta(job)?.kind === 'BLOCK_DECOMPOSE');
    if (repair?.status === 'SUCCEEDED') return repair;
    return original ?? repair ?? null;
  }

  #enqueueRepair(block, parentJob, planError) {
    if (workMeta(parentJob)?.kind === 'BLOCK_DECOMPOSE_REPAIR') return { accepted: false, duplicate: false, skipped: true };
    return this.#runtime.enqueue({
      name: MODEL_JOB,
      context: this.#context,
      payload: this.#repairPayload(block, resultText(parentJob) ?? '', planError),
      priority: 5,
      max_attempts: 2,
      timeout_ms: 180_000,
      idempotency_key: `pump:${this.#scopeVersion}:${block.id}:decompose-repair`,
      correlation_id: `pump:${this.#scopeVersion}:${block.id}`,
    });
  }

  #buildPlanner(block, parsed) {
    return DynamicDagPlannerV1.fromBlocks({
      dag_id: `pump:${this.#scopeVersion}:${block.id}`,
      blocks: [{
        block_id: block.id,
        context: this.#context,
        subtasks: parsed.subtasks.map(task => ({
          subtask_id: task.subtask_id,
          name: MODEL_JOB,
          depends_on: task.depends_on,
          priority: task.priority,
          timeout_ms: 240_000,
          max_attempts: 3,
          payload: {
            __work_pump: {
              kind: 'BLOCK_SUBTASK',
              scope_version: this.#scopeVersion,
              block_id: block.id,
              subtask_id: task.subtask_id,
              depth: 1,
            },
          },
        })),
      }],
    });
  }

  #childInput(block, task, dependencyJobs) {
    return [
      `CEREBRO BLOCK ${block.id}: ${block.title}`,
      `MICROTASK ${task.subtask_id}: ${task.title}`,
      `OBJECTIVE: ${task.objective}`,
      `DEPENDENCY_RESULTS=${JSON.stringify(dependencyDigest(dependencyJobs)).slice(0, 12000)}`,
      'Execute this bounded microtask now. Produce concrete work product, evidence-backed findings, tests/checks required, reusable learning candidates, and an execution_handoff only if an existing governed CEREBRO capability can apply it. Prefer deterministic verification over prose. Do not create more agents. Do not claim changes were applied unless evidence says so. Never expose secrets. Never write PROD. Never access Trading.',
    ].join('\n\n').slice(0, 24000);
  }

  reconcile() {
    if (!this.#enabled) return Object.freeze({ enabled: false, status: 'DISABLED' });

    // Idempotent self-heal: every reconciliation guarantees all canonical block planners exist.
    const seedReceipt = this.seed();
    const jobs = this.#runtime.listForContext(this.#context);
    const reports = [];
    let plannedSubtasks = 0;
    let enqueuedChildren = 0;
    let repairsEnqueued = 0;
    let rejectedPlans = 0;

    for (const block of FANOUT_BLOCKS) {
      const parent = this.#planJobForBlock(jobs, block);
      if (!parent || parent.status !== 'SUCCEEDED') {
        reports.push({ block_id: block.id, status: parent?.status ?? 'WAITING_PARENT' });
        continue;
      }
      let parsed;
      try {
        parsed = parsePlan(resultText(parent), { blockId: block.id, maxSubtasks: this.#maxSubtasksPerBlock });
      } catch (error) {
        rejectedPlans += 1;
        const repair = this.#enqueueRepair(block, parent, String(error?.message || error));
        if (repair.accepted) repairsEnqueued += 1;
        reports.push({ block_id: block.id, status: 'PLAN_REJECTED', error: String(error?.message || error).slice(0, 500), repair_enqueued: Boolean(repair.accepted) });
        continue;
      }
      if (plannedSubtasks + parsed.subtasks.length > this.#maxTotalSubtasks) {
        reports.push({ block_id: block.id, status: 'GLOBAL_SUBTASK_LIMIT', planned_subtasks: parsed.subtasks.length });
        continue;
      }
      plannedSubtasks += parsed.subtasks.length;
      const planner = this.#buildPlanner(block, parsed);
      const childJobs = jobs.filter(job => {
        const meta = workMeta(job);
        return meta?.kind === 'BLOCK_SUBTASK' && meta?.scope_version === this.#scopeVersion && meta?.block_id === block.id;
      });
      const bySubtask = new Map(childJobs.map(job => [workMeta(job).subtask_id, job]));
      const completed = [];
      const running = [];
      const failed = [];
      for (const task of parsed.subtasks) {
        const job = bySubtask.get(task.subtask_id);
        if (!job) continue;
        const taskId = `${block.id}/${task.subtask_id}`;
        if (job.status === 'SUCCEEDED') completed.push(taskId);
        else if (job.status === 'DEAD_LETTER' || job.status === 'CANCELLED') failed.push(taskId);
        else running.push(taskId);
      }
      const plan = planner.plan({ completed_task_ids: completed, running_task_ids: running, failed_task_ids: failed });
      for (const ready of plan.ready) {
        const subtask = parsed.subtasks.find(item => `${block.id}/${item.subtask_id}` === ready.task_id);
        const dependencyJobs = subtask.depends_on.map(id => bySubtask.get(id)).filter(Boolean);
        const receipt = this.#runtime.enqueue({
          name: MODEL_JOB,
          context: this.#context,
          payload: {
            input: this.#childInput(block, subtask, dependencyJobs),
            instructions: 'You are one bounded CEREBRO PREPROD micro-worker. Finish exactly the assigned microtask; do not recursively delegate.',
            model: 'deepseek-flash',
            max_output_tokens: 1800,
            projected_cost_eur: this.#childCost,
            __learning: { provider_id: 'deepseek', model_id: 'deepseek-flash', task_class: 'microtask-v2' },
            __work_pump: {
              kind: 'BLOCK_SUBTASK',
              scope_version: this.#scopeVersion,
              block_id: block.id,
              subtask_id: subtask.subtask_id,
              depth: 1,
              depends_on: subtask.depends_on,
            },
          },
          priority: ready.priority,
          max_attempts: 3,
          timeout_ms: 240_000,
          idempotency_key: `pump:${this.#scopeVersion}:${block.id}:subtask:${subtask.subtask_id}`,
          correlation_id: `pump:${this.#scopeVersion}:${block.id}`,
        });
        if (receipt.accepted) {
          enqueuedChildren += 1;
          bySubtask.set(subtask.subtask_id, receipt.job);
        }
      }
      reports.push({
        block_id: block.id,
        status: plan.done ? 'DONE' : plan.ready.length ? 'READY_ENQUEUED' : 'IN_PROGRESS_OR_BLOCKED',
        total_subtasks: parsed.subtasks.length,
        completed: completed.length,
        running: running.length,
        failed: failed.length,
        ready: plan.ready.length,
        blocked: plan.blocked.length,
      });
    }

    const currentJobs = this.#runtime.listForContext(this.#context);
    const scoped = currentJobs.filter(job => workMeta(job)?.scope_version === this.#scopeVersion);
    const useful = scoped.filter(usefulStatus);
    const queued = useful.filter(job => job.status === 'QUEUED' || job.status === 'RETRY_WAIT');
    const running = useful.filter(job => job.status === 'RUNNING');
    const succeeded = useful.filter(job => job.status === 'SUCCEEDED');
    const failedTerminal = useful.filter(job => job.status === 'DEAD_LETTER' || job.status === 'CANCELLED');
    const nonTerminal = useful.filter(job => !['SUCCEEDED', 'DEAD_LETTER', 'CANCELLED'].includes(job.status));
    const completedLatencies = succeeded.map(latencyMs).filter(value => value !== null);
    const avgCompletedLatency = completedLatencies.length
      ? Math.round(completedLatencies.reduce((sum, value) => sum + value, 0) / completedLatencies.length)
      : null;
    const rootDone = reports.filter(report => report.status === 'DONE').length;
    const pendingBlocks = FANOUT_BLOCKS.length - rootDone;
    const starvation = pendingBlocks > 0 && queued.length === 0 && running.length === 0;
    const lowBacklog = pendingBlocks > 0 && (queued.length + running.length) < Math.min(this.#readyBufferTarget, 8);
    const successDenominator = Math.max(1, succeeded.length + failedTerminal.length);
    const successRate = succeeded.length / successDenominator;

    const snapshot = Object.freeze({
      enabled: true,
      environment: PREPROD,
      scope_version: this.#scopeVersion,
      context: this.#context,
      max_depth: 1,
      decomposition_mode: '25_BLOCKS_TO_BOUNDED_MICROTASK_DAGS',
      target_subtasks_per_block: this.#targetSubtasksPerBlock,
      max_subtasks_per_block: this.#maxSubtasksPerBlock,
      max_total_subtasks: this.#maxTotalSubtasks,
      theoretical_leaf_target: Math.min(this.#maxTotalSubtasks, FANOUT_BLOCKS.length * this.#targetSubtasksPerBlock),
      ready_buffer_target: this.#readyBufferTarget,
      jobs_total: scoped.length,
      useful_jobs_total: useful.length,
      useful_queued: queued.length,
      useful_running: running.length,
      useful_non_terminal: nonTerminal.length,
      succeeded: succeeded.length,
      failed_terminal: failedTerminal.length,
      pending_blocks: pendingBlocks,
      planned_subtasks: plannedSubtasks,
      enqueued_children_this_reconcile: enqueuedChildren,
      repairs_enqueued_this_reconcile: repairsEnqueued,
      rejected_plans_this_reconcile: rejectedPlans,
      self_heal_seed_accepted: seedReceipt.accepted,
      self_heal_seed_duplicates: seedReceipt.duplicates,
      starvation,
      low_backlog: lowBacklog,
      watchers_count_as_useful_work: false,
      avg_completed_latency_ms: avgCompletedLatency,
      observed_success_rate: Number(successRate.toFixed(4)),
      learning_feedback_enabled: true,
      reports: Object.freeze(reports),
      prod_authorized: false,
      prod_write_authorized: false,
      trading_access: false,
    });
    this.#lastSnapshot = snapshot;
    return snapshot;
  }

  snapshot() {
    return this.#lastSnapshot ?? Object.freeze({
      enabled: this.#enabled,
      environment: PREPROD,
      scope_version: this.#scopeVersion,
      context: this.#context,
      max_depth: 1,
      decomposition_mode: '25_BLOCKS_TO_BOUNDED_MICROTASK_DAGS',
      target_subtasks_per_block: this.#targetSubtasksPerBlock,
      max_subtasks_per_block: this.#maxSubtasksPerBlock,
      max_total_subtasks: this.#maxTotalSubtasks,
      theoretical_leaf_target: Math.min(this.#maxTotalSubtasks, FANOUT_BLOCKS.length * this.#targetSubtasksPerBlock),
      ready_buffer_target: this.#readyBufferTarget,
      watchers_count_as_useful_work: false,
      learning_feedback_enabled: true,
      status: 'NOT_RECONCILED_YET',
      prod_authorized: false,
      trading_access: false,
    });
  }
}

export const HIERARCHICAL_AGENT_WORK_PUMP_V2_CONTRACT = Object.freeze({
  capability: 'BOOST-001/JOB-001/hierarchical-agent-work-pump-v2',
  environment: PREPROD,
  extends_existing_durable_job_runtime: true,
  second_scheduler: false,
  preserves_v1_for_rollback: true,
  blocks: 25,
  hierarchy_depth: 1,
  target_subtasks_per_block_default: 12,
  max_subtasks_per_block_default: 12,
  max_total_subtasks_default: 400,
  theoretical_leaf_target_default: 300,
  ready_buffer_target_default: 24,
  idempotent_self_heal_seed: true,
  starvation_visible_in_heartbeat: true,
  watchers_are_not_useful_work: true,
  governed_learning_feedback: true,
  deepseek_measured_concurrency_ceiling: 8,
  one_repair_attempt_per_invalid_plan: true,
  idempotent_seed_and_children: true,
  all_children_use_allowlisted_model_handler: true,
  arbitrary_handler_from_model: false,
  arbitrary_shell_access: false,
  arbitrary_repo_write_access: false,
  auto_recharge: false,
  prod_authorized: false,
  prod_writes: false,
  trading_access: false,
  governed_external_action_handoff: 'reuse existing capability such as AUTO-001 when independently eligible; otherwise fail closed',
});
