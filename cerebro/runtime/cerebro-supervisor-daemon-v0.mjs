import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { DurableJobRuntimeV1 } from './durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from './durable-worker-runner-v1.mjs';
import { CerebroContinuousSupervisorV0 } from './cerebro-continuous-supervisor-v0.mjs';

const ENV = 'PREPROD';
const ROOT = path.resolve(process.env.CEREBRO_SUPERVISOR_STATE_DIR || path.join(os.homedir(), 'AppData', 'Local', 'CEREBRO', 'SupervisorRuntime'));
const JOURNAL = path.join(ROOT, 'jobs.v8journal');
const HEARTBEAT = path.join(ROOT, 'heartbeat.json');
const KILL = path.join(ROOT, 'KILL_SWITCH');
const CONTEXT = Object.freeze({
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

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
}

function safeHeartbeat(supervisor, extra = {}) {
  writeJsonAtomic(HEARTBEAT, {
    schema_version: '1.0',
    service: 'CEREBRO Continuous Supervisor',
    status: supervisor.enabled ? 'GREEN' : 'STOPPED',
    pid: process.pid,
    host: os.hostname(),
    company_id: CONTEXT.company_id,
    engine_id: CONTEXT.engine_id,
    environment: ENV,
    version: CONTEXT.version,
    updated_at: new Date().toISOString(),
    queue_journal_present: fs.existsSync(JOURNAL),
    kill_switch_present: fs.existsSync(KILL),
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
const worker = new DurableWorkerRunnerV1({
  job_runtime: queue,
  worker_id: process.env.CEREBRO_WORKER_ID || `fenix-preprod-${os.hostname()}`,
  lease_ms: positiveInt('CEREBRO_LEASE_MS', 30_000, 600_000),
  heartbeat_ms: positiveInt('CEREBRO_JOB_HEARTBEAT_MS', 5_000, 60_000),
  max_concurrency: positiveInt('CEREBRO_MAX_CONCURRENCY', 2, 8),
  max_per_company: positiveInt('CEREBRO_MAX_PER_COMPANY', 1, 4),
});

// V0 deliberately exposes no arbitrary shell/process handler. Capabilities are registered explicitly.
worker.register({
  name: 'runtime.health.probe',
  handler: async () => ({ ok: true, environment: ENV, host: os.hostname(), at: new Date().toISOString() }),
});

const supervisor = new CerebroContinuousSupervisorV0({
  job_runtime: queue,
  worker,
  contexts: [CONTEXT],
  idle_delay_ms: positiveInt('CEREBRO_IDLE_DELAY_MS', 2_000, 60_000),
});

const abort = new AbortController();
let stopping = false;
function shutdown(reason) {
  if (stopping) return;
  stopping = true;
  supervisor.stop(reason);
  abort.abort(reason);
  safeHeartbeat(supervisor, { stop_reason: reason });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  safeHeartbeat(supervisor, { status: 'RED', error: String(error?.message || error).slice(0, 500) });
  process.exitCode = 1;
  shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (error) => {
  safeHeartbeat(supervisor, { status: 'RED', error: String(error?.message || error).slice(0, 500) });
  process.exitCode = 1;
  shutdown('UNHANDLED_REJECTION');
});

const probeEvery = positiveInt('CEREBRO_HEARTBEAT_MS', 10_000, 60_000);
const timer = setInterval(() => {
  if (fs.existsSync(KILL)) shutdown('KILL_SWITCH_FILE');
  else safeHeartbeat(supervisor, { snapshot: supervisor.snapshot() });
}, probeEvery);
timer.unref();

if (process.argv.includes('--enqueue-health-probe')) {
  queue.enqueue({ name: 'runtime.health.probe', context: CONTEXT, payload: {}, timeout_ms: 10_000 });
}

safeHeartbeat(supervisor, { booted: true });
const cyclesArg = process.argv.indexOf('--cycles');
const maxCycles = cyclesArg >= 0 ? Number(process.argv[cyclesArg + 1]) : Infinity;
if (maxCycles !== Infinity && (!Number.isSafeInteger(maxCycles) || maxCycles < 1)) throw new Error('--cycles requires integer >= 1');

try {
  await supervisor.start({
    signal: abort.signal,
    max_cycles: maxCycles,
    on_cycle: async (result) => {
      if (fs.existsSync(KILL)) shutdown('KILL_SWITCH_FILE');
      safeHeartbeat(supervisor, { cycle_status: result.status, snapshot: result.snapshot });
    },
  });
} finally {
  clearInterval(timer);
  safeHeartbeat(supervisor, { exited: true, snapshot: supervisor.snapshot() });
}
