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

const ENV = 'PREPROD';
const ROOT = path.resolve(process.env.CEREBRO_SUPERVISOR_STATE_DIR || path.join(os.homedir(), 'AppData', 'Local', 'CEREBRO', 'SupervisorRuntime'));
const JOURNAL = path.join(ROOT, 'jobs.v8journal');
const LEARNING_JOURNAL = path.join(ROOT, 'learning-candidates.v8journal');
const HEARTBEAT = path.join(ROOT, 'heartbeat.json');
const KILL = path.join(ROOT, 'KILL_SWITCH');
const DEFAULT_CONTEXT = Object.freeze({
  company_id: process.env.CEREBRO_COMPANY_ID || 'fenix',
  engine_id: process.env.CEREBRO_ENGINE_ID || 'RUNTIME-001',
  environment: ENV,
  version: process.env.CEREBRO_SUPERVISOR_VERSION || 'v0',
});

function positiveInt(name, fallback, max = 60_000) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error(`${name} invalid`);
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
  const seen = new Set();
  for (const context of contexts) {
    const key = contextKey(context);
    if (seen.has(key)) throw new Error(`duplicate runtime context: ${key}`);
    seen.add(key);
  }
  return Object.freeze(contexts);
}

function loadSchedulingRoutes(contexts) {
  const fallback = Object.fromEntries(contexts.map(context => [contextKey(context), {
    pool: 'CPU',
    resource_key: `engine:${context.company_id}:${context.engine_id}`,
  }]));
  const raw = parseJsonEnv('CEREBRO_SCHEDULING_ROUTES_JSON', fallback);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('CEREBRO_SCHEDULING_ROUTES_JSON must be an object');
  const routes = {};
  for (const context of contexts) {
    const key = contextKey(context);
    const route = raw[key];
    if (!route) throw new Error(`SCHEDULING_ROUTE_MISSING:${key}`);
    routes[key] = route;
  }
  return Object.freeze(routes);
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
}

function safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, extra = {}) {
  writeJsonAtomic(HEARTBEAT, {
    schema_version: '1.3',
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
    learning_candidate_count: learningSpool.size,
    deepseek_agent_handler: deepSeekHandler.snapshot(),
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

fs.mkdirSync(ROOT, { recursive: true });
const queue = new DurableJobRuntimeV1({ file_path: JOURNAL });
const learningSpool = new LearningCandidateSpoolV1({ file_path: LEARNING_JOURNAL });
const runtimeContexts = loadRuntimeContexts();
const schedulingRoutes = loadSchedulingRoutes(runtimeContexts);
const maxGlobal = positiveInt('CEREBRO_MAX_CONCURRENCY', 64, 1024);
const maxCompany = positiveInt('CEREBRO_MAX_PER_COMPANY', maxGlobal, maxGlobal);
const initialGlobal = positiveInt('CEREBRO_INITIAL_CONCURRENCY', Math.min(4, maxGlobal), maxGlobal);
const maxDeepSeek = positiveInt('CEREBRO_MAX_DEEPSEEK_CONCURRENCY', Math.min(8, maxGlobal), maxGlobal);
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

// V0 deliberately exposes no arbitrary shell/process handler. Capabilities are registered explicitly.
worker.register({
  name: 'runtime.health.probe',
  handler: async () => ({ ok: true, environment: ENV, host: os.hostname(), at: new Date().toISOString() }),
});
const deepSeekHandler = createDeepSeekAgentHandlerV1();
worker.register({ name: 'model.deepseek.agent', handler: deepSeekHandler });

const dynamicWorker = new DynamicConcurrencyControllerV1({ worker, policy, routes: schedulingRoutes });
const supervisor = new CerebroContinuousSupervisorV0({
  job_runtime: queue,
  worker: dynamicWorker,
  contexts: runtimeContexts,
  idle_delay_ms: positiveInt('CEREBRO_IDLE_DELAY_MS', 2_000, 60_000),
  outcome_sink: ({ outcome, latency_ms }) => learningSpool.appendJobOutcome({ outcome, latency_ms }),
});

const abort = new AbortController();
let stopping = false;
function shutdown(reason) {
  if (stopping) return;
  stopping = true;
  supervisor.stop(reason);
  abort.abort(reason);
  safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, { stop_reason: reason });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, { status: 'RED', error: String(error?.message || error).slice(0, 500) });
  process.exitCode = 1;
  shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (error) => {
  safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, { status: 'RED', error: String(error?.message || error).slice(0, 500) });
  process.exitCode = 1;
  shutdown('UNHANDLED_REJECTION');
});

const probeEvery = positiveInt('CEREBRO_HEARTBEAT_MS', 10_000, 60_000);
const timer = setInterval(() => {
  if (fs.existsSync(KILL)) shutdown('KILL_SWITCH_FILE');
  else safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, { snapshot: supervisor.snapshot() });
}, probeEvery);
timer.unref();

if (process.argv.includes('--enqueue-health-probe')) {
  queue.enqueue({ name: 'runtime.health.probe', context: DEFAULT_CONTEXT, payload: {}, timeout_ms: 10_000 });
}

safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, { booted: true, context_count: runtimeContexts.length });
const cyclesArg = process.argv.indexOf('--cycles');
const maxCycles = cyclesArg >= 0 ? Number(process.argv[cyclesArg + 1]) : Infinity;
if (maxCycles !== Infinity && (!Number.isSafeInteger(maxCycles) || maxCycles < 1)) throw new Error('--cycles requires integer >= 1');

try {
  await supervisor.start({
    signal: abort.signal,
    max_cycles: maxCycles,
    on_cycle: async (result) => {
      if (fs.existsSync(KILL)) shutdown('KILL_SWITCH_FILE');
      safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, {
        cycle_status: result.status,
        learning_receipts_count: result.learning_receipts?.length ?? 0,
        snapshot: result.snapshot,
      });
    },
  });
} finally {
  clearInterval(timer);
  safeHeartbeat(supervisor, dynamicWorker, learningSpool, deepSeekHandler, { exited: true, snapshot: supervisor.snapshot() });
}
