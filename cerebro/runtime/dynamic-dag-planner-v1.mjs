const PREPROD = 'PREPROD';

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function safeContext(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  const context = Object.freeze({
    company_id: nonEmpty(value.company_id, `${label}.company_id`),
    engine_id: nonEmpty(value.engine_id, `${label}.engine_id`),
    environment: nonEmpty(value.environment, `${label}.environment`),
    version: nonEmpty(value.version, `${label}.version`),
  });
  if (context.environment !== PREPROD) throw new Error(`${label}.environment must be PREPROD`);
  return context;
}

function safeInteger(value, label, fallback) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 1_000_000) throw new TypeError(`${label} invalid`);
  return n;
}

function clone(value) { return structuredClone(value); }

function optionalId(value, label) {
  return value == null ? null : nonEmpty(value, label);
}

function normalizeTask(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`tasks[${index}] must be an object`);
  const task_id = nonEmpty(value.task_id, `tasks[${index}].task_id`);
  const depends_on = value.depends_on ?? [];
  if (!Array.isArray(depends_on)) throw new TypeError(`tasks[${index}].depends_on must be an array`);
  const deps = Object.freeze([...new Set(depends_on.map((item, depIndex) => nonEmpty(item, `tasks[${index}].depends_on[${depIndex}]`)))]);
  return Object.freeze({
    task_id,
    block_id: optionalId(value.block_id, `tasks[${index}].block_id`),
    subtask_id: optionalId(value.subtask_id, `tasks[${index}].subtask_id`),
    parent_task_id: optionalId(value.parent_task_id, `tasks[${index}].parent_task_id`),
    name: nonEmpty(value.name, `tasks[${index}].name`),
    context: safeContext(value.context, `tasks[${index}].context`),
    depends_on: deps,
    priority: safeInteger(value.priority, `tasks[${index}].priority`, 100),
    payload: clone(value.payload ?? {}),
    timeout_ms: safeInteger(value.timeout_ms, `tasks[${index}].timeout_ms`, 30_000),
    max_attempts: safeInteger(value.max_attempts, `tasks[${index}].max_attempts`, 5),
    route: clone(value.route ?? null),
  });
}

function buildGraph(tasks) {
  const byId = new Map();
  for (const task of tasks) {
    if (byId.has(task.task_id)) throw new Error(`DAG_DUPLICATE_TASK:${task.task_id}`);
    byId.set(task.task_id, task);
  }
  for (const task of tasks) {
    if (task.parent_task_id) {
      const parent = byId.get(task.parent_task_id);
      if (!parent) throw new Error(`DAG_UNKNOWN_PARENT:${task.task_id}:${task.parent_task_id}`);
      if (parent.context.company_id !== task.context.company_id) throw new Error(`DAG_CROSS_COMPANY_PARENT_DENIED:${task.task_id}:${task.parent_task_id}`);
    }
    for (const dep of task.depends_on) {
      const parent = byId.get(dep);
      if (!parent) throw new Error(`DAG_UNKNOWN_DEPENDENCY:${task.task_id}:${dep}`);
      if (parent.context.company_id !== task.context.company_id) {
        throw new Error(`DAG_CROSS_COMPANY_DEPENDENCY_DENIED:${task.task_id}:${dep}`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id, stack = []) {
    if (visiting.has(id)) throw new Error(`DAG_CYCLE:${[...stack, id].join('>')}`);
    if (visited.has(id)) return;
    visiting.add(id);
    const task = byId.get(id);
    for (const dep of task.depends_on) visit(dep, [...stack, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const task of tasks) visit(task.task_id);
  return byId;
}

function criticalDepth(taskId, children, memo) {
  if (memo.has(taskId)) return memo.get(taskId);
  const next = children.get(taskId) ?? [];
  const depth = 1 + (next.length ? Math.max(...next.map(child => criticalDepth(child, children, memo))) : 0);
  memo.set(taskId, depth);
  return depth;
}

export function expandHierarchicalBlocksV1(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) throw new TypeError('blocks must be a non-empty array');
  const tasks = [];
  const blockIds = new Set();
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    if (!block || typeof block !== 'object' || Array.isArray(block)) throw new TypeError(`blocks[${blockIndex}] must be an object`);
    const block_id = nonEmpty(block.block_id, `blocks[${blockIndex}].block_id`);
    if (blockIds.has(block_id)) throw new Error(`DAG_DUPLICATE_BLOCK:${block_id}`);
    blockIds.add(block_id);
    const context = safeContext(block.context, `blocks[${blockIndex}].context`);
    const subtasks = block.subtasks ?? [];
    if (!Array.isArray(subtasks) || subtasks.length === 0) throw new TypeError(`blocks[${blockIndex}].subtasks must be a non-empty array`);
    const localIds = new Set();
    for (let subIndex = 0; subIndex < subtasks.length; subIndex += 1) {
      const subtask = subtasks[subIndex];
      if (!subtask || typeof subtask !== 'object' || Array.isArray(subtask)) throw new TypeError(`blocks[${blockIndex}].subtasks[${subIndex}] must be an object`);
      const subtask_id = nonEmpty(subtask.subtask_id, `blocks[${blockIndex}].subtasks[${subIndex}].subtask_id`);
      if (localIds.has(subtask_id)) throw new Error(`DAG_DUPLICATE_SUBTASK:${block_id}:${subtask_id}`);
      localIds.add(subtask_id);
      const task_id = `${block_id}/${subtask_id}`;
      const depends = subtask.depends_on ?? [];
      if (!Array.isArray(depends)) throw new TypeError(`blocks[${blockIndex}].subtasks[${subIndex}].depends_on must be an array`);
      const depends_on = depends.map(dep => {
        const safe = nonEmpty(dep, `blocks[${blockIndex}].subtasks[${subIndex}].depends_on[]`);
        return safe.includes('/') ? safe : `${block_id}/${safe}`;
      });
      tasks.push({
        task_id,
        block_id,
        subtask_id,
        parent_task_id: subtask.parent_task_id ?? null,
        name: nonEmpty(subtask.name, `blocks[${blockIndex}].subtasks[${subIndex}].name`),
        context: subtask.context ? safeContext(subtask.context, `blocks[${blockIndex}].subtasks[${subIndex}].context`) : context,
        depends_on,
        priority: subtask.priority ?? block.priority ?? 100,
        payload: { ...clone(block.payload ?? {}), ...clone(subtask.payload ?? {}), __hierarchy: { block_id, subtask_id } },
        timeout_ms: subtask.timeout_ms ?? block.timeout_ms ?? 30_000,
        max_attempts: subtask.max_attempts ?? block.max_attempts ?? 5,
        route: clone(subtask.route ?? block.route ?? null),
      });
    }
  }
  return Object.freeze(tasks.map((task, index) => normalizeTask(task, index)));
}

export class DynamicDagPlannerV1 {
  static fromBlocks({ dag_id, blocks, environment = PREPROD }) {
    return new DynamicDagPlannerV1({ dag_id, tasks: expandHierarchicalBlocksV1(blocks), environment });
  }

  constructor({ dag_id, tasks, environment = PREPROD }) {
    if (environment !== PREPROD) throw new Error('DAG planner V1 is PREPROD-only');
    this.dag_id = nonEmpty(dag_id, 'dag_id');
    if (!Array.isArray(tasks) || tasks.length === 0) throw new TypeError('tasks must be a non-empty array');
    this.tasks = Object.freeze(tasks.map(normalizeTask));
    this.byId = buildGraph(this.tasks);
    this.children = new Map(this.tasks.map(task => [task.task_id, []]));
    for (const task of this.tasks) for (const dep of task.depends_on) this.children.get(dep).push(task.task_id);
    const memo = new Map();
    this.depth = new Map(this.tasks.map(task => [task.task_id, criticalDepth(task.task_id, this.children, memo)]));
  }

  plan({ completed_task_ids = [], running_task_ids = [], failed_task_ids = [] } = {}) {
    const completed = new Set(completed_task_ids.map(String));
    const running = new Set(running_task_ids.map(String));
    const failed = new Set(failed_task_ids.map(String));
    const known = new Set(this.tasks.map(task => task.task_id));
    for (const set of [completed, running, failed]) {
      for (const id of set) if (!known.has(id)) throw new Error(`DAG_UNKNOWN_STATE_TASK:${id}`);
    }

    const ready = [];
    const blocked = [];
    for (const task of this.tasks) {
      if (completed.has(task.task_id) || running.has(task.task_id) || failed.has(task.task_id)) continue;
      const failedDeps = task.depends_on.filter(id => failed.has(id));
      if (failedDeps.length) {
        blocked.push({ task, reason: 'DEPENDENCY_FAILED', waiting_for: failedDeps });
        continue;
      }
      const waiting = task.depends_on.filter(id => !completed.has(id));
      if (waiting.length) {
        blocked.push({ task, reason: 'DEPENDENCY_PENDING', waiting_for: waiting });
        continue;
      }
      ready.push(task);
    }

    ready.sort((a, b) => {
      const critical = (this.depth.get(b.task_id) ?? 0) - (this.depth.get(a.task_id) ?? 0);
      if (critical) return critical;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.task_id.localeCompare(b.task_id);
    });
    blocked.sort((a, b) => a.task.task_id.localeCompare(b.task.task_id));

    return Object.freeze({
      dag_id: this.dag_id,
      total_tasks: this.tasks.length,
      completed_count: completed.size,
      running_count: running.size,
      failed_count: failed.size,
      ready: Object.freeze(ready),
      blocked: Object.freeze(blocked),
      done: completed.size + failed.size === this.tasks.length,
    });
  }

  enqueueReady({ job_runtime, state = {}, now_ms = Date.now() }) {
    if (!job_runtime || typeof job_runtime.enqueue !== 'function') throw new TypeError('job_runtime.enqueue is required');
    const plan = this.plan(state);
    const receipts = [];
    for (const task of plan.ready) {
      receipts.push({
        task_id: task.task_id,
        receipt: job_runtime.enqueue({
          name: task.name,
          context: task.context,
          payload: {
            ...clone(task.payload),
            __dag: {
              dag_id: this.dag_id,
              task_id: task.task_id,
              block_id: task.block_id,
              subtask_id: task.subtask_id,
              parent_task_id: task.parent_task_id,
              route: clone(task.route),
            },
          },
          priority: task.priority,
          max_attempts: task.max_attempts,
          timeout_ms: task.timeout_ms,
          idempotency_key: `dag:${this.dag_id}:${task.task_id}`,
          correlation_id: `dag:${this.dag_id}`,
          now_ms,
        }),
      });
    }
    return Object.freeze({ plan, receipts: Object.freeze(receipts) });
  }
}

export const DYNAMIC_DAG_PLANNER_V1_CONTRACT = Object.freeze({
  capability: 'BOOST-001/JOB-001/dynamic-dag-planner-v1',
  environment: PREPROD,
  extends_existing_job_runtime: true,
  second_queue: false,
  hierarchical_blocks: true,
  independent_subtasks_parallel_ready: true,
  explicit_dependencies: true,
  ready_blocked_states: true,
  critical_path_priority: true,
  cross_company_dependency_default: 'DENY',
  durable_enqueue_idempotency: true,
  additional_cost_target_eur: 0,
  prod_authorized: false,
  prod_writes: false,
  trading_access: false,
});
