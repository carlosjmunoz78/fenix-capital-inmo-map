import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { DurableJobRuntimeV1 } from './durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from './durable-worker-runner-v1.mjs';
import { CerebroContinuousSupervisorV0 } from './cerebro-continuous-supervisor-v0.mjs';
import { DynamicConcurrencyPolicyV1, DynamicConcurrencyControllerV1 } from './dynamic-concurrency-policy-v1.mjs';
import { LearningCandidateSpoolV1 } from './learning-candidate-spool-v1.mjs';
import { createDeepSeekAgentHandlerV1 } from './deepseek-agent-handler-v1.mjs';
import { DeepSeekBudgetLedgerV1 } from './deepseek-budget-ledger-v1.mjs';
import { HierarchicalAgentWorkPumpV2 } from './hierarchical-agent-work-pump-v2.mjs';

const ENV = 'PREPROD';
const ROOT = path.resolve(process.env.CEREBRO_SUPERVISOR_STATE_DIR || path.join(os.homedir(), 'AppData', 'Local', 'CEREBRO', 'SupervisorRuntime'));
const JOURNAL = path.join(ROOT, 'jobs.v8journal');
const LEARNING_JOURNAL = path.join(ROOT, 'learning-candidates.v8journal');
const DEEPSEEK_BUDGET_JOURNAL = path.join(ROOT, 'deepseek-budget.v8journal');
const HEARTBEAT = path.join(ROOT, 'heartbeat.json');
const KILL = path.join(ROOT, 'KILL_SWITCH');
const DEFAULT_CONTEXT = Object.freeze({
  company_id: process.env.CEREBRO_COMPANY_ID || 'fenix',
  engine_id: process.env.CEREBRO_ENGINE_ID || 'RUNTIME-001',
  environment: ENV,
  version: process.env.CEREBRO_SUPERVISOR_VERSION || 'v0',
});
const MODEL_CONTEXT = Object.freeze({
  company_id: DEFAULT_CONTEXT.company_id,
  engine_id: 'BOOST-001',
  environment: ENV,
  version: process.env.CEREBRO_WORK_PUMP_VERSION || 'work-pump-v2',
});
const WORK_PUMP_FLAG = String(process.env.CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP || 'AUTO').toUpperCase();
if (!['AUTO', 'YES', 'NO'].includes(WORK_PUMP_FLAG)) throw new Error('CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP must be AUTO, YES or NO');
const WORK_PUMP_ENABLED = WORK_PUMP_FLAG === 'YES' || (WORK_PUMP_FLAG === 'AUTO' && Boolean(process.env.DEEPSEEK_API_KEY));
const WORK_PUMP_MODE = WORK_PUMP_FLAG === 'NO'
  ? 'DISABLED_EXPLICIT'
  : WORK_PUMP_FLAG === 'YES'
    ? 'ENABLED_EXPLICIT'
    : WORK_PUMP_ENABLED ? 'AUTO_KEY_PRESENT' : 'AUTO_NO_KEY';

function positiveInt(name, fallback, max = 60_000) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error(`${name} invalid`);
  return value;
}

function positiveNumber(name, fallback, max = 10_000) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > max) throw new Error(`${name} invalid`);
  return value;
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} required`);
  return value.trim();
}

function safeContext(value, label = 'context') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const context = Object.freeze({
    company_id: nonEmpty(value.company_id, `${label}.company_id`),
    engine_id: nonEmpty(value.engine_id, `${label}.engine_id`),
    environment: nonEmpty(value.environment, `${label}.environment`),
    version: nonEmpty(value.version, `${label}.version`),
  });
  if (context.environment !== ENV) throw new Error(`${label}.environment must be PREPROD`);
  return context;
}

function contextKey(context) {
  return `${context.company_id}|${context.engine_id}|${context.environment}|${context.version}`;
}

function parseJsonEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  try { return JSON.parse(raw); }
  catch { throw new Error(`${name} invalid JSON`); }
}

function loadRuntimeContexts() {
  const raw = parseJsonEnv('CEREBRO_RUNTIME_CONTEXTS_JSON', [DEFAULT_CONTEXT]);
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('CEREBRO_RUNTIME_CONTEXTS_JSON must be a non-empty array');
  const contexts = raw.map((value, index) => safeContext(value, `CEREBRO_RUNTIME_CONTEXTS_JSON[${index}]`));
  if (WORK_PUMP_ENABLED && !contexts.some(context => contextKey(context) === contextKey(MODEL_CONTEXT))) contexts.push(MODEL_CONTEXT);
  const seen = new Set();
  for (const context of contexts) {
    const key = contextKey(context);
    if (seen.has(key)) throw new Error(`duplicate runtime context: ${key}`);
    seen.add(key);
  }
  return Object.freeze(contexts);
}

function defaultRoute(context) {
  if (contextKey(context) === contextKey(MODEL_CONTEXT)) {
    return { pool: 'MODEL', provider_id: 'deepseek', resource_key: 'provider:deepseek' };
  }
  return { pool: 'CPU', resource_key: `engine:${context.company_id}:${context.engine_id}` };
}

function loadSchedulingRoutes(contexts) {
  const fallback = Object.fromEntries(contexts.map(context => [contextKey(context), defaultRoute(context)]));
  const configured = parseJsonEnv('CEREBRO_SCHEDULING_ROUTES_JSON', fallback);
  if (!configured || typeof configured !== 'object' || Array.isArray(configured)) throw new Error('CEREBRO_SCHEDULING_ROUTES_JSON must be an object');
  const routes = {};
  for (const context of contexts) {
    const key = contextKey(context);
    const route = configured[key];
    if (!route) throw new Error(`SCHEDULING_ROUTE_MISSING:${key}`);
    routes[key] = route;
  }
  if (WORK_PUMP_ENABLED) {
    const modelRoute = routes[contextKey(MODEL_CONTEXT)];
    if (modelRoute?.pool !== 'MODEL' || modelRoute?.provider_id !== 'deepseek') {
      throw new Error('WORK_PUMP_MODEL_ROUTE_MUST_BE_MODEL_DEEPSEEK');
    }
  }
  return Object.freeze(routes);
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
}

function safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, extra = {}) {
  writeJsonAtomic(HEARTBEAT, {
    schema_version: '1.5',
    service: 'CEREBRO Continuous Supervisor',
    status: supervisor.enabled ? 'GREEN' : 'STOPPED',
    pid: process.pid,
    host: os.hostname(),
    company_id: DEFAULT_CONTEXT.company_id,
    engine_id: DEFAULT_CONTEXT.engine_id,
    environment: ENV,
    version: DEFAULT_CONTEXT.version,
    updated_at: new Date().toISOString(),
    queue_journal_present: fs.existsSync(JOURNAL),
    learning_journal_present: fs.existsSync(LEARNING_JOURNAL),
    deepseek_budget_journal_present: fs.existsSync(DEEPSEEK_BUDGET_JOURNAL),
    learning_candidate_count: learningSpool.size,
    deepseek_agent_handler: deepSeekHandler.snapshot(),
    deepseek_budget: budgetLedger.snapshot(),
    work_pump_mode: WORK_PUMP_MODE,
    work_pump: workPump.snapshot(),
    kill_switch_present: fs.existsSync(KILL),
    dynamic_concurrency: dynamicWorker.policy_snapshot,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    ...extra,
  });
}

if ((process.env.CEREBRO_SUPERVISOR_ENV || ENV).toUpperCase() !== ENV) {
  throw new Error('daemon-v0 is PREPROD-only; PROD requires a separate promoted contract');
}
if (WORK_PUMP_FLAG === 'YES' && !process.env.DEEPSEEK_API_KEY) {
  throw new Error('CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP=YES requires DEEPSEEK_API_KEY in the runtime secret store');
}

fs.mkdirSync(ROOT, { recursive: true });
const queue = new DurableJobRuntimeV1({ file_path: JOURNAL });
const learningSpool = new LearningCandidateSpoolV1({ file_path: LEARNING_JOURNAL });
const budgetCapEur = positiveNumber('CEREBRO_DEEPSEEK_WORK_PUMP_BUDGET_EUR', 12, 10_000);
const budgetLedger = new DeepSeekBudgetLedgerV1({ file_path: DEEPSEEK_BUDGET_JOURNAL, hard_cap_eur: budgetCapEur });
const runtimeContexts = loadRuntimeContexts();
const schedulingRoutes = loadSchedulingRoutes(runtimeContexts);
const maxGlobal = positiveInt('CEREBRO_MAX_CONCURRENCY', 64, 1024);
const maxCompany = positiveInt('CEREBRO_MAX_PER_COMPANY', Math.min(16, maxGlobal), maxGlobal);
const initialGlobalDefault = WORK_PUMP_ENABLED ? Math.min(16, maxGlobal) : Math.min(4, maxGlobal);
const initialGlobal = positiveInt('CEREBRO_INITIAL_CONCURRENCY', initialGlobalDefault, maxGlobal);
const maxDeepSeek = positiveInt('CEREBRO_MAX_DEEPSEEK_CONCURRENCY', Math.min(8, maxGlobal), Math.min(8, maxGlobal));
const maxRepoWrites = positiveInt('CEREBRO_MAX_REPO_WRITE_CONCURRENCY', 1, Math.max(1, maxGlobal));

const policy = new DynamicConcurrencyPolicyV1({
  initial_global_concurrency: initialGlobal,
  max_global_concurrency: maxGlobal,
  max_company_concurrency: maxCompany,
  max_provider_concurrency: { deepseek: maxDeepSeek },
  max_repo_write_concurrency: maxRepoWrites,
  hard_cost_cap_eur: 100,
});

const worker = new DurableWorkerRunnerV1({
  job_runtime: queue,
  worker_id: process.env.CEREBRO_WORKER_ID || `fenix-preprod-${os.hostname()}`,
  lease_ms: positiveInt('CEREBRO_LEASE_MS', 30_000, 600_000),
  heartbeat_ms: positiveInt('CEREBRO_JOB_HEARTBEAT_MS', 5_000, 60_000),
  max_concurrency: maxGlobal,
  max_per_company: maxCompany,
});

// No arbitrary shell/process handler. Capabilities are registered explicitly.
worker.register({
  name: 'runtime.health.probe',
  handler: async () => ({ ok: true, environment: ENV, host: os.hostname(), at: new Date().toISOString() }),
});
const deepSeekHandler = createDeepSeekAgentHandlerV1({ budget_ledger: budgetLedger });
worker.register({ name: 'model.deepseek.agent', handler: deepSeekHandler });

const workPump = new HierarchicalAgentWorkPumpV2({
  job_runtime: queue,
  context: MODEL_CONTEXT,
  scope_version: process.env.CEREBRO_WORK_PUMP_SCOPE_VERSION || '2026-10-27-v2',
  max_subtasks_per_block: positiveInt('CEREBRO_WORK_PUMP_MAX_SUBTASKS_PER_BLOCK', 12, 32),
  target_subtasks_per_block: positiveInt('CEREBRO_WORK_PUMP_TARGET_SUBTASKS_PER_BLOCK', 12, 32),
  max_total_subtasks: positiveInt('CEREBRO_WORK_PUMP_MAX_TOTAL_SUBTASKS', 400, 1000),
  ready_buffer_target: positiveInt('CEREBRO_WORK_PUMP_READY_BUFFER_TARGET', 24, 256),
  parent_projected_cost_eur: positiveNumber('CEREBRO_WORK_PUMP_PARENT_PROJECTED_EUR', 0.03, budgetCapEur),
  child_projected_cost_eur: positiveNumber('CEREBRO_WORK_PUMP_CHILD_PROJECTED_EUR', 0.025, budgetCapEur),
  enabled: WORK_PUMP_ENABLED,
});
if (WORK_PUMP_ENABLED) workPump.seed();
workPump.reconcile();

const dynamicWorker = new DynamicConcurrencyControllerV1({ worker, policy, routes: schedulingRoutes });
const supervisor = new CerebroContinuousSupervisorV0({
  job_runtime: queue,
  worker: dynamicWorker,
  contexts: runtimeContexts,
  idle_delay_ms: positiveInt('CEREBRO_IDLE_DELAY_MS', 500, 60_000),
  outcome_sink: ({ outcome, latency_ms }) => learningSpool.appendJobOutcome({ outcome, latency_ms }),
});

const abort = new AbortController();
let stopping = false;
function shutdown(reason) {
  if (stopping) return;
  stopping = true;
  supervisor.stop(reason);
  abort.abort(reason);
  safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, { stop_reason: reason });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, { status: 'RED', error: String(error?.message || error).slice(0, 500) });
  process.exitCode = 1;
  shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (error) => {
  safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, { status: 'RED', error: String(error?.message || error).slice(0, 500) });
  process.exitCode = 1;
  shutdown('UNHANDLED_REJECTION');
});

const probeEvery = positiveInt('CEREBRO_HEARTBEAT_MS', 10_000, 60_000);
const timer = setInterval(() => {
  if (fs.existsSync(KILL)) shutdown('KILL_SWITCH_FILE');
  else safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, { snapshot: supervisor.snapshot() });
}, probeEvery);
timer.unref();

if (process.argv.includes('--enqueue-health-probe')) {
  queue.enqueue({ name: 'runtime.health.probe', context: DEFAULT_CONTEXT, payload: {}, timeout_ms: 10_000 });
}

safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, {
  booted: true,
  context_count: runtimeContexts.length,
  work_pump_enabled: WORK_PUMP_ENABLED,
  work_pump_mode: WORK_PUMP_MODE,
});
const cyclesArg = process.argv.indexOf('--cycles');
const maxCycles = cyclesArg >= 0 ? Number(process.argv[cyclesArg + 1]) : Infinity;
if (maxCycles !== Infinity && (!Number.isSafeInteger(maxCycles) || maxCycles < 1)) throw new Error('--cycles requires integer >= 1');

try {
  await supervisor.start({
    signal: abort.signal,
    max_cycles: maxCycles,
    on_cycle: async (result) => {
      if (fs.existsSync(KILL)) shutdown('KILL_SWITCH_FILE');
      const pumpSnapshot = workPump.reconcile();
      safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, {
        cycle_status: result.status,
        learning_receipts_count: result.learning_receipts?.length ?? 0,
        work_pump_enqueued_children: pumpSnapshot.enqueued_children_this_reconcile ?? 0,
        work_pump_useful_queued: pumpSnapshot.useful_queued ?? 0,
        work_pump_useful_running: pumpSnapshot.useful_running ?? 0,
        work_pump_starvation: Boolean(pumpSnapshot.starvation),
        snapshot: result.snapshot,
      });
    },
  });
} finally {
  clearInterval(timer);
  workPump.reconcile();
  safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, { exited: true, snapshot: supervisor.snapshot() });
}
