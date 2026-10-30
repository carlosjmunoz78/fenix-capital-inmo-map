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
import { createDeepSeekGovernedHandoffHandlerV1 } from './deepseek-governed-handoff-handler-v1.mjs';
import { GovernedExecutionHandoffRouterV1 } from './governed-execution-handoff-router-v1.mjs';
import { DeepSeekBudgetLedgerV1 } from './deepseek-budget-ledger-v1.mjs';
import { AdaptiveHierarchicalAgentWorkPumpV3 } from './adaptive-hierarchical-agent-work-pump-v3.mjs';
import { createRepoSandboxJobHandlerV1, REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT } from './repo-sandbox-job-handler-v1.mjs';
import { ensureNeuronalSourceV1 } from './neuronal-source-integrity-v1.mjs';
import { NeuronalHierarchicalJob001SourceV1, neuronalJob001ContextV1, registerNeuronalAuditHandlerV1 } from './neuronal-hierarchical-job001-adapter-v1.mjs'; // NEURONAL_AUTOFILL_V1_WIRED
import { MissionDerivedJob001SourceV1, missionDerivedJob001ContextV1, registerMissionDerivedJob001HandlerV1 } from './mission-derived-job001-adapter-v1.mjs'; // GLOBAL_MISSION_AUTOFILL_V1_WIRED

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
  version: process.env.CEREBRO_WORK_PUMP_VERSION || 'work-pump-v3-adaptive',
});
const REPO_SANDBOX_CONTEXT = Object.freeze({
  company_id: DEFAULT_CONTEXT.company_id,
  engine_id: 'FACT-001',
  environment: ENV,
  version: process.env.CEREBRO_REPO_SANDBOX_VERSION || 'repo-sandbox-v1',
});
const NEURONAL_AUTOFILL_FLAG = String(process.env.CEREBRO_ENABLE_NEURONAL_AUTOFILL || 'AUTO').toUpperCase();
if (!['AUTO', 'YES', 'NO'].includes(NEURONAL_AUTOFILL_FLAG)) throw new Error('CEREBRO_ENABLE_NEURONAL_AUTOFILL must be AUTO, YES or NO');
const NEURONAL_AUTOFILL_ENABLED = NEURONAL_AUTOFILL_FLAG !== 'NO';
const NEURONAL_CONTEXT = neuronalJob001ContextV1({
  company_id: DEFAULT_CONTEXT.company_id,
  version: process.env.CEREBRO_NEURONAL_QUEUE_VERSION || 'neuronal-hierarchical-v1',
});
const MISSION_AUTOFILL_FLAG = String(process.env.CEREBRO_ENABLE_MISSION_AUTOFILL || 'AUTO').toUpperCase();
if (!['AUTO', 'YES', 'NO'].includes(MISSION_AUTOFILL_FLAG)) throw new Error('CEREBRO_ENABLE_MISSION_AUTOFILL must be AUTO, YES or NO');
const MISSION_AUTOFILL_ENABLED = MISSION_AUTOFILL_FLAG !== 'NO';
const MISSION_CONTEXT = missionDerivedJob001ContextV1({
  company_id: DEFAULT_CONTEXT.company_id,
  version: process.env.CEREBRO_MISSION_QUEUE_VERSION || 'mission-derived-useful-work-v1',
});
const WORK_PUMP_FLAG = String(process.env.CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP || 'AUTO').toUpperCase();
if (!['AUTO', 'YES', 'NO'].includes(WORK_PUMP_FLAG)) throw new Error('CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP must be AUTO, YES or NO');
const WORK_PUMP_ENABLED = WORK_PUMP_FLAG === 'YES' || (WORK_PUMP_FLAG === 'AUTO' && Boolean(process.env.DEEPSEEK_API_KEY));
const WORK_PUMP_MODE = WORK_PUMP_FLAG === 'NO'
  ? 'DISABLED_EXPLICIT'
  : WORK_PUMP_FLAG === 'YES'
    ? 'ENABLED_EXPLICIT'
    : WORK_PUMP_ENABLED ? 'AUTO_KEY_PRESENT' : 'AUTO_NO_KEY';
const REPO_SANDBOX_FLAG = String(process.env.CEREBRO_ENABLE_REPO_SANDBOX || 'AUTO').toUpperCase();
if (!['AUTO', 'YES', 'NO'].includes(REPO_SANDBOX_FLAG)) throw new Error('CEREBRO_ENABLE_REPO_SANDBOX must be AUTO, YES or NO');
const REPO_SANDBOX_CONFIGURED = Boolean(process.env.CEREBRO_REPO_SANDBOX_WORKSPACE_ROOT && process.env.CEREBRO_REPO_SANDBOX_IMAGE);
const REPO_SANDBOX_ENABLED = REPO_SANDBOX_FLAG === 'YES' || (REPO_SANDBOX_FLAG === 'AUTO' && REPO_SANDBOX_CONFIGURED);
const REPO_SANDBOX_MODE = REPO_SANDBOX_FLAG === 'NO'
  ? 'DISABLED_EXPLICIT'
  : REPO_SANDBOX_FLAG === 'YES'
    ? 'ENABLED_EXPLICIT'
    : REPO_SANDBOX_ENABLED ? 'AUTO_CONFIG_PRESENT' : 'AUTO_CONFIG_ABSENT';
let repoSandboxHandler = null;

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
  if (REPO_SANDBOX_ENABLED && !contexts.some(context => contextKey(context) === contextKey(REPO_SANDBOX_CONTEXT))) contexts.push(REPO_SANDBOX_CONTEXT);
  if (NEURONAL_AUTOFILL_ENABLED && !contexts.some(context => contextKey(context) === contextKey(NEURONAL_CONTEXT))) contexts.push(NEURONAL_CONTEXT);
  if (MISSION_AUTOFILL_ENABLED && !contexts.some(context => contextKey(context) === contextKey(MISSION_CONTEXT))) contexts.push(MISSION_CONTEXT);
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
  if (contextKey(context) === contextKey(REPO_SANDBOX_CONTEXT)) {
    return { pool: 'REPO_CI', resource_key: `repo-sandbox:${context.company_id}` };
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
  if (REPO_SANDBOX_ENABLED) {
    const repoRoute = routes[contextKey(REPO_SANDBOX_CONTEXT)];
    if (repoRoute?.pool !== 'REPO_CI' || repoRoute?.provider_id) {
      throw new Error('REPO_SANDBOX_ROUTE_MUST_BE_REPO_CI_WITHOUT_PROVIDER');
    }
  }
  return Object.freeze(routes);
}

function sanitizeRepoSandboxHandoffPayload(payload, { target_context: targetContext }) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('repo handoff payload required');
  for (const key of ['image_ref', 'docker_bin', 'git_bin', 'workspace_root']) {
    if (key in payload) throw new Error(`runtime-owned sandbox configuration cannot be overridden: ${key}`);
  }
  if (!payload.plan || typeof payload.plan !== 'object' || Array.isArray(payload.plan)) throw new TypeError('repo handoff payload.plan required');
  return {
    ...payload,
    plan: {
      ...payload.plan,
      company_id: targetContext.company_id,
      engine_id: targetContext.engine_id,
      environment: targetContext.environment,
    },
  };
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
}

function safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, extra = {}) {
  const pumpSnapshot = workPump.snapshot();
  writeJsonAtomic(HEARTBEAT, {
    schema_version: '1.8',
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
    work_pump: pumpSnapshot,
    repo_sandbox_mode: REPO_SANDBOX_MODE,
    repo_sandbox_handler: repoSandboxHandler
      ? repoSandboxHandler.snapshot()
      : { schema_version: '1.0.0', state_type: 'CEREBRO_REPO_SANDBOX_DURABLE_HANDLER_V1', status: 'DISABLED', environment: ENV, job_name: REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.job_name, additional_cost_eur: 0, prod_authorized: false, prod_writes: false, trading_access: false },
    useful_work: {
      scheduling_strategy: pumpSnapshot.scheduling_strategy ?? null,
      model_capacity: pumpSnapshot.measured_model_capacity ?? null,
      target_active_backlog: pumpSnapshot.target_active_backlog ?? null,
      queue_pressure: pumpSnapshot.queue_pressure ?? null,
      useful_queued: pumpSnapshot.useful_queued ?? null,
      useful_running: pumpSnapshot.useful_running ?? null,
      starvation: Boolean(pumpSnapshot.starvation),
    },
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
if (REPO_SANDBOX_FLAG === 'YES' && !REPO_SANDBOX_CONFIGURED) {
  throw new Error('CEREBRO_ENABLE_REPO_SANDBOX=YES requires CEREBRO_REPO_SANDBOX_WORKSPACE_ROOT and CEREBRO_REPO_SANDBOX_IMAGE');
}

fs.mkdirSync(ROOT, { recursive: true });
const queue = new DurableJobRuntimeV1({ file_path: JOURNAL });
const learningSpool = new LearningCandidateSpoolV1({ file_path: LEARNING_JOURNAL });
const budgetCapEur = positiveNumber('CEREBRO_DEEPSEEK_WORK_PUMP_BUDGET_EUR', 12, 10_000);
const budgetLedger = new DeepSeekBudgetLedgerV1({ file_path: DEEPSEEK_BUDGET_JOURNAL, hard_cap_eur: budgetCapEur });
const runtimeContexts = loadRuntimeContexts();
const schedulingRoutes = loadSchedulingRoutes(runtimeContexts);
const maxGlobal = positiveInt('CEREBRO_MAX_CONCURRENCY', 180, 1024);
const maxCompany = positiveInt('CEREBRO_MAX_PER_COMPANY', maxGlobal, maxGlobal);
const initialGlobalDefault = Math.min(180, maxGlobal);
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

worker.register({
  name: 'runtime.health.probe',
  handler: async () => ({ ok: true, environment: ENV, host: os.hostname(), at: new Date().toISOString() }),
});
if (NEURONAL_AUTOFILL_ENABLED) registerNeuronalAuditHandlerV1({ worker_runner: worker });
if (MISSION_AUTOFILL_ENABLED) registerMissionDerivedJob001HandlerV1({ worker_runner: worker });

const handoffRouter = new GovernedExecutionHandoffRouterV1({
  job_runtime: queue,
  targets: REPO_SANDBOX_ENABLED ? {
    [REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.job_name]: {
      context: REPO_SANDBOX_CONTEXT,
      enabled: true,
      sanitize_payload: sanitizeRepoSandboxHandoffPayload,
      priority: 40,
      max_attempts: 3,
      timeout_ms: 300_000,
    },
  } : {},
});
const baseDeepSeekHandler = createDeepSeekAgentHandlerV1({ budget_ledger: budgetLedger });
const deepSeekHandler = createDeepSeekGovernedHandoffHandlerV1({ base_handler: baseDeepSeekHandler, handoff_router: handoffRouter });
worker.register({ name: 'model.deepseek.agent', handler: deepSeekHandler });
if (REPO_SANDBOX_ENABLED) {
  repoSandboxHandler = createRepoSandboxJobHandlerV1({
    workspace_root: process.env.CEREBRO_REPO_SANDBOX_WORKSPACE_ROOT,
    image_ref: process.env.CEREBRO_REPO_SANDBOX_IMAGE,
    docker_bin: process.env.CEREBRO_REPO_SANDBOX_DOCKER_BIN || 'docker',
    git_bin: process.env.CEREBRO_REPO_SANDBOX_GIT_BIN || 'git',
  });
  worker.register({ name: REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT.job_name, handler: repoSandboxHandler });
}

let missionSource = null;
if (MISSION_AUTOFILL_ENABLED) {
  missionSource = new MissionDerivedJob001SourceV1({
    job_runtime: queue,
    context: MISSION_CONTEXT,
    target_active: positiveInt('CEREBRO_MISSION_TARGET_ACTIVE', Math.min(180, maxGlobal), Math.min(180, maxGlobal)),
    max_enqueue_per_reconcile: positiveInt('CEREBRO_MISSION_MAX_ENQUEUE_PER_RECONCILE', Math.min(180, maxGlobal), Math.min(180, maxGlobal)),
  });
}

let neuronalSource = null;
if (NEURONAL_AUTOFILL_ENABLED) {
  ensureNeuronalSourceV1();
  neuronalSource = new NeuronalHierarchicalJob001SourceV1({
    job_runtime: queue,
    queue_context: NEURONAL_CONTEXT,
    model_context: MODEL_CONTEXT,
    target_active: positiveInt('CEREBRO_NEURONAL_TARGET_ACTIVE', Math.min(180, maxGlobal), Math.min(180, maxGlobal)), // NEURONAL_180_CAP_V1_WIRED
    max_enqueue_per_reconcile: positiveInt('CEREBRO_NEURONAL_MAX_ENQUEUE_PER_RECONCILE', Math.min(180, maxGlobal), Math.min(180, maxGlobal)),
    model_active_cap: maxDeepSeek,
    model_enabled: WORK_PUMP_ENABLED,
  });
}

const workPump = new AdaptiveHierarchicalAgentWorkPumpV3({
  job_runtime: queue,
  context: MODEL_CONTEXT,
  scope_version: process.env.CEREBRO_WORK_PUMP_SCOPE_VERSION || '2026-10-27-v3-adaptive',
  model_capacity: maxDeepSeek,
  max_generated_tasks: positiveInt('CEREBRO_WORK_PUMP_MAX_GENERATED_TASKS', 30_000, 100_000),
  max_subtasks_per_block: positiveInt('CEREBRO_WORK_PUMP_MAX_SUBTASKS_PER_BLOCK', 12, 32),
  target_subtasks_per_block: positiveInt('CEREBRO_WORK_PUMP_TARGET_SUBTASKS_PER_BLOCK', 12, 32),
  max_total_subtasks: positiveInt('CEREBRO_WORK_PUMP_MAX_TOTAL_SUBTASKS', 400, 1000),
  parent_projected_cost_eur: positiveNumber('CEREBRO_WORK_PUMP_PARENT_PROJECTED_EUR', 0.03, budgetCapEur),
  child_projected_cost_eur: positiveNumber('CEREBRO_WORK_PUMP_CHILD_PROJECTED_EUR', 0.025, budgetCapEur),
  enabled: WORK_PUMP_ENABLED,
  // legacy CI marker preserved: additional_sources: neuronalSource ? [neuronalSource] : []
  additional_sources: [missionSource, neuronalSource].filter(Boolean),
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
  repo_sandbox_enabled: REPO_SANDBOX_ENABLED,
  repo_sandbox_mode: REPO_SANDBOX_MODE,
  neuronal_autofill_enabled: NEURONAL_AUTOFILL_ENABLED,
  neuronal_autofill_mode: NEURONAL_AUTOFILL_FLAG,
  neuronal_queue: neuronalSource ? neuronalSource.snapshot() : null,
  mission_autofill_enabled: MISSION_AUTOFILL_ENABLED,
  mission_autofill_mode: MISSION_AUTOFILL_FLAG,
  mission_queue: missionSource ? missionSource.snapshot() : null,
  governed_handoff: handoffRouter.snapshot(),
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
        work_pump_target_active_backlog: pumpSnapshot.target_active_backlog ?? null,
        work_pump_queue_pressure: pumpSnapshot.queue_pressure ?? null,
        work_pump_starvation: Boolean(pumpSnapshot.starvation),
        governed_handoff: handoffRouter.snapshot(),
        snapshot: result.snapshot,
      });
    },
  });
} finally {
  clearInterval(timer);
  workPump.reconcile();
  safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, budgetLedger, workPump, { exited: true, governed_handoff: handoffRouter.snapshot(), snapshot: supervisor.snapshot() });
}