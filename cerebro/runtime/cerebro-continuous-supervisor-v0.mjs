const PREPROD = 'PREPROD';

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} must be a safe integer between ${min} and ${max}`);
  return value;
}

function safeContexts(values) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError('contexts must be a non-empty array');
  return Object.freeze(values.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`contexts[${index}] must be an object`);
    const context = Object.freeze({
      company_id: nonEmpty(value.company_id, `contexts[${index}].company_id`),
      engine_id: nonEmpty(value.engine_id, `contexts[${index}].engine_id`),
      environment: nonEmpty(value.environment, `contexts[${index}].environment`),
      version: nonEmpty(value.version, `contexts[${index}].version`),
    });
    if (context.environment !== PREPROD) throw new Error('continuous supervisor V0 accepts exact PREPROD only');
    return context;
  }));
}

function runtimeContract(runtime) {
  if (!runtime || typeof runtime !== 'object') throw new TypeError('job_runtime is required');
  for (const method of ['watchdog', 'listForContext']) {
    if (typeof runtime[method] !== 'function') throw new TypeError(`job_runtime.${method} is required`);
  }
  return runtime;
}

function workerContract(worker) {
  if (!worker || typeof worker !== 'object' || typeof worker.runFairRound !== 'function') throw new TypeError('worker.runFairRound is required');
  return worker;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function nowIso() { return new Date().toISOString(); }

export class CerebroContinuousSupervisorV0 {
  #runtime;
  #worker;
  #contexts;
  #idleDelayMs;
  #enabled = true;
  #running = false;
  #cycles = 0;
  #lastCycleAt = null;
  #lastOutcome = null;
  #stopReason = null;

  constructor({ job_runtime, worker, contexts, environment = PREPROD, idle_delay_ms = 1000 }) {
    if (environment !== PREPROD) throw new Error('continuous supervisor V0 accepts exact PREPROD only');
    this.#runtime = runtimeContract(job_runtime);
    this.#worker = workerContract(worker);
    this.#contexts = safeContexts(contexts);
    this.#idleDelayMs = integer(idle_delay_ms, 'idle_delay_ms', { min: 0, max: 60_000 });
  }

  get running() { return this.#running; }
  get enabled() { return this.#enabled; }

  stop(reason = 'KILL_SWITCH') {
    this.#enabled = false;
    this.#stopReason = nonEmpty(reason, 'reason');
    return this.snapshot();
  }

  snapshot() {
    return Object.freeze({
      environment: PREPROD,
      enabled: this.#enabled,
      running: this.#running,
      cycles: this.#cycles,
      last_cycle_at: this.#lastCycleAt,
      last_outcome: this.#lastOutcome,
      stop_reason: this.#stopReason,
      context_count: this.#contexts.length,
      prod_authorized: false,
      prod_write_authorized: false,
      trading_access: false,
    });
  }

  async tick({ now_ms = Date.now() } = {}) {
    integer(now_ms, 'now_ms');
    if (!this.#enabled) return Object.freeze({ status: 'STOPPED', repaired: [], outcomes: [], snapshot: this.snapshot() });
    const repaired = this.#runtime.watchdog({ now_ms });
    const outcomes = await this.#worker.runFairRound({ contexts: this.#contexts });
    this.#cycles += 1;
    this.#lastCycleAt = nowIso();
    const idle = outcomes.length === 0 || outcomes.every(item => item?.status === 'IDLE' || item?.status === 'SATURATED');
    this.#lastOutcome = Object.freeze({ repaired_count: repaired.length, outcomes_count: outcomes.length, idle });
    return Object.freeze({ status: idle ? 'IDLE' : 'WORKED', repaired, outcomes, snapshot: this.snapshot() });
  }

  async start({ signal = null, max_cycles = Infinity, on_cycle = null } = {}) {
    if (this.#running) throw new Error('continuous supervisor V0 is already running');
    if (max_cycles !== Infinity) integer(max_cycles, 'max_cycles', { min: 1, max: 10_000_000 });
    if (on_cycle !== null && typeof on_cycle !== 'function') throw new TypeError('on_cycle must be a function');
    this.#running = true;
    try {
      let localCycles = 0;
      while (this.#enabled && !(signal?.aborted) && localCycles < max_cycles) {
        const result = await this.tick();
        localCycles += 1;
        if (on_cycle) await on_cycle(result);
        if (result.status === 'IDLE' && this.#idleDelayMs > 0 && this.#enabled && !(signal?.aborted)) await sleep(this.#idleDelayMs);
      }
      if (signal?.aborted && !this.#stopReason) this.#stopReason = 'ABORT_SIGNAL';
      return this.snapshot();
    } finally {
      this.#running = false;
    }
  }
}

export const CEREBRO_CONTINUOUS_SUPERVISOR_V0_CONTRACT = Object.freeze({
  capability: 'RUNTIME-001/continuous-supervisor-v0',
  environment: PREPROD,
  continuous_while_host_alive: true,
  durable_queue_required: true,
  lease_heartbeat_required: true,
  stale_lease_reclaim: true,
  bounded_retry_required: true,
  kill_switch: true,
  multiempresa_context: ['company_id', 'engine_id', 'environment', 'version'],
  additional_cost_target_eur: 0,
  supabase_required: false,
  prod_authorized: false,
  prod_writes: false,
  trading_access: false,
  physical_always_on_claim: false,
  promotion: 'PREPROD->soak->recovery->rollback->tribunal->gradual_prod',
});
