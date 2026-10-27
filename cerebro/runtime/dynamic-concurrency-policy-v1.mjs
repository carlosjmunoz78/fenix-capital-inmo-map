const PREPROD = 'PREPROD';
const POOLS = new Set(['CPU', 'IO', 'MODEL', 'BROWSER_DEVICE', 'REPO_CI']);

function positiveInt(value, label, { min = 1, max = 1024 } = {}) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new TypeError(`${label} must be an integer between ${min} and ${max}`);
  return n;
}

function finite(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new TypeError(`${label} must be between ${min} and ${max}`);
  return n;
}

function contextKey(context) {
  return `${context.company_id}|${context.engine_id}|${context.environment}|${context.version}`;
}

function safeContext(value) {
  if (!value || typeof value !== 'object') throw new TypeError('context is required');
  for (const key of ['company_id', 'engine_id', 'environment', 'version']) {
    if (typeof value[key] !== 'string' || value[key].trim() === '') throw new TypeError(`context.${key} is required`);
  }
  if (value.environment !== PREPROD) throw new Error('dynamic concurrency V1 is PREPROD-only');
  return value;
}

function safeRoute(value = {}) {
  const pool = String(value.pool || '').trim();
  if (!POOLS.has(pool)) throw new Error(`unknown or missing pool: ${pool || 'EMPTY'}`);
  const provider_id = value.provider_id == null ? null : String(value.provider_id).trim();
  const resource_key = value.resource_key == null ? pool : String(value.resource_key).trim();
  const repo_write_key = value.repo_write_key == null ? null : String(value.repo_write_key).trim();
  if (!resource_key) throw new TypeError('resource_key must be non-empty');
  if (provider_id === '') throw new TypeError('provider_id must be non-empty when provided');
  if (repo_write_key === '') throw new TypeError('repo_write_key must be non-empty when provided');
  return Object.freeze({ pool, provider_id, resource_key, repo_write_key });
}

function limitMap(input, label, fallback = {}) {
  const src = input ?? fallback;
  if (!src || typeof src !== 'object' || Array.isArray(src)) throw new TypeError(`${label} must be an object`);
  const out = {};
  for (const [key, value] of Object.entries(src)) out[key] = positiveInt(value, `${label}.${key}`);
  return Object.freeze(out);
}

function count(items, predicate) {
  let n = 0;
  for (const item of items) if (predicate(item)) n += 1;
  return n;
}

function percentile95(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

export class DynamicConcurrencyPolicyV1 {
  #target;
  #previousThroughput = null;
  #lastDecision = 'HOLD_BOOT';

  constructor({
    environment = PREPROD,
    initial_global_concurrency = 4,
    max_global_concurrency = 64,
    max_company_concurrency = null,
    max_resource_concurrency = { CPU: 32, IO: 48, MODEL: 32, BROWSER_DEVICE: 4, REPO_CI: 4 },
    max_provider_concurrency = { deepseek: 8 },
    max_repo_write_concurrency = 1,
    max_p95_ms = 120_000,
    max_error_rate = 0.05,
    max_conflict_rate = 0.02,
    max_429_rate = 0,
    max_ci_queue_ms = 120_000,
    hard_cost_cap_eur = 100,
  } = {}) {
    if (environment !== PREPROD) throw new Error('dynamic concurrency V1 is PREPROD-only');
    this.max_global_concurrency = positiveInt(max_global_concurrency, 'max_global_concurrency');
    this.max_company_concurrency = positiveInt(max_company_concurrency ?? this.max_global_concurrency, 'max_company_concurrency', { max: this.max_global_concurrency });
    this.max_resource_concurrency = limitMap(max_resource_concurrency, 'max_resource_concurrency');
    this.max_provider_concurrency = limitMap(max_provider_concurrency, 'max_provider_concurrency');
    this.max_repo_write_concurrency = positiveInt(max_repo_write_concurrency, 'max_repo_write_concurrency', { max: this.max_global_concurrency });
    this.max_p95_ms = finite(max_p95_ms, 'max_p95_ms', { min: 1 });
    this.max_error_rate = finite(max_error_rate, 'max_error_rate', { max: 1 });
    this.max_conflict_rate = finite(max_conflict_rate, 'max_conflict_rate', { max: 1 });
    this.max_429_rate = finite(max_429_rate, 'max_429_rate', { max: 1 });
    this.max_ci_queue_ms = finite(max_ci_queue_ms, 'max_ci_queue_ms');
    this.hard_cost_cap_eur = finite(hard_cost_cap_eur, 'hard_cost_cap_eur');
    this.#target = positiveInt(initial_global_concurrency, 'initial_global_concurrency', { max: this.max_global_concurrency });
  }

  get target_global_concurrency() { return this.#target; }
  get last_decision() { return this.#lastDecision; }

  canStart({ context: rawContext, route: rawRoute }, reservations = []) {
    const context = safeContext(rawContext);
    const route = safeRoute(rawRoute);
    if (reservations.length >= this.#target) return { allowed: false, reason: 'TARGET_GLOBAL_CONCURRENCY' };
    if (count(reservations, item => item.context.company_id === context.company_id) >= this.max_company_concurrency) {
      return { allowed: false, reason: 'MAX_COMPANY_CONCURRENCY' };
    }
    const poolLimit = this.max_resource_concurrency[route.pool];
    if (!poolLimit) return { allowed: false, reason: 'POOL_NOT_ALLOWLISTED' };
    if (count(reservations, item => item.route.pool === route.pool) >= poolLimit) return { allowed: false, reason: 'MAX_RESOURCE_CONCURRENCY' };
    if (route.provider_id) {
      const providerLimit = this.max_provider_concurrency[route.provider_id];
      if (!providerLimit) return { allowed: false, reason: 'PROVIDER_NOT_ALLOWLISTED' };
      if (count(reservations, item => item.route.provider_id === route.provider_id) >= providerLimit) return { allowed: false, reason: 'MAX_PROVIDER_CONCURRENCY' };
    }
    if (route.repo_write_key) {
      if (count(reservations, item => item.route.repo_write_key === route.repo_write_key) >= this.max_repo_write_concurrency) {
        return { allowed: false, reason: 'MAX_REPO_WRITE_CONCURRENCY' };
      }
    }
    return { allowed: true, reason: 'ALLOW', context, route };
  }

  observe({
    ready_count = 0,
    started_count = 0,
    success_count = 0,
    failure_count = 0,
    conflict_count = 0,
    rate_limit_429_count = 0,
    ci_queue_ms = 0,
    elapsed_ms = 1,
    cumulative_cost_eur = 0,
    latencies_ms = [],
  } = {}) {
    const attempts = Math.max(1, success_count + failure_count);
    const errorRate = failure_count / attempts;
    const conflictRate = conflict_count / attempts;
    const rate429 = rate_limit_429_count / attempts;
    const p95 = percentile95(latencies_ms.length ? latencies_ms : [elapsed_ms]);
    const throughput = success_count / Math.max(0.001, elapsed_ms / 1000);
    const degraded = errorRate > this.max_error_rate || conflictRate > this.max_conflict_rate || rate429 > this.max_429_rate || p95 > this.max_p95_ms || ci_queue_ms > this.max_ci_queue_ms || cumulative_cost_eur > this.hard_cost_cap_eur;

    if (degraded) {
      this.#target = Math.max(1, Math.floor(this.#target / 2));
      this.#lastDecision = 'SCALE_DOWN_DEGRADED';
    } else {
      const saturated = ready_count > started_count || started_count >= this.#target;
      const throughputImproved = this.#previousThroughput === null || throughput >= this.#previousThroughput * 0.98;
      if (saturated && success_count > 0 && failure_count === 0 && throughputImproved && this.#target < this.max_global_concurrency) {
        this.#target = Math.min(this.max_global_concurrency, this.#target * 2);
        this.#lastDecision = 'SCALE_UP_HEALTHY';
      } else {
        this.#lastDecision = 'HOLD';
      }
    }
    this.#previousThroughput = throughput;
    return this.snapshot({ throughput, p95_ms: p95, error_rate: errorRate, conflict_rate: conflictRate, rate_429: rate429 });
  }

  snapshot(extra = {}) {
    return Object.freeze({
      environment: PREPROD,
      target_global_concurrency: this.#target,
      max_global_concurrency: this.max_global_concurrency,
      max_company_concurrency: this.max_company_concurrency,
      max_resource_concurrency: this.max_resource_concurrency,
      max_provider_concurrency: this.max_provider_concurrency,
      max_repo_write_concurrency: this.max_repo_write_concurrency,
      hard_cost_cap_eur: this.hard_cost_cap_eur,
      decision: this.#lastDecision,
      ...extra,
    });
  }
}

export class DynamicConcurrencyControllerV1 {
  #worker;
  #policy;
  #routes;
  #cursor = 0;

  constructor({ worker, policy, routes = {} }) {
    if (!worker || typeof worker.runFairRound !== 'function') throw new TypeError('worker.runFairRound is required');
    if (!(policy instanceof DynamicConcurrencyPolicyV1)) throw new TypeError('policy must be DynamicConcurrencyPolicyV1');
    this.#worker = worker;
    this.#policy = policy;
    this.#routes = new Map(Object.entries(routes));
  }

  get policy_snapshot() { return this.#policy.snapshot(); }

  #routeFor(context) {
    const route = this.#routes.get(contextKey(context));
    if (!route) throw new Error(`SCHEDULING_ROUTE_MISSING:${contextKey(context)}`);
    return safeRoute(route);
  }

  #selectLanes(contexts) {
    if (!Array.isArray(contexts) || contexts.length === 0) throw new TypeError('contexts must be a non-empty array');
    const normalized = contexts.map(safeContext);
    const reservations = [];
    const selected = [];
    let madeProgress = true;
    let spins = 0;
    const target = this.#policy.target_global_concurrency;

    while (selected.length < target && madeProgress && spins < normalized.length * Math.max(2, target)) {
      madeProgress = false;
      for (let offset = 0; offset < normalized.length && selected.length < target; offset += 1) {
        const index = (this.#cursor + offset) % normalized.length;
        const context = normalized[index];
        const route = this.#routeFor(context);
        const gate = this.#policy.canStart({ context, route }, reservations);
        if (!gate.allowed) continue;
        reservations.push({ context, route });
        selected.push(context);
        madeProgress = true;
      }
      spins += 1;
    }
    this.#cursor = (this.#cursor + 1) % normalized.length;
    return { selected, reservations, target };
  }

  #observe({ selected, outcomes, startedAt }) {
    const elapsed = Math.max(1, Date.now() - startedAt);
    const worked = outcomes.filter(item => item?.status !== 'IDLE' && item?.status !== 'SATURATED');
    const success = outcomes.filter(item => item?.status === 'SUCCEEDED' || item?.status === 'HUMAN_REQUIRED').length;
    const failures = outcomes.filter(item => ['RETRY_SCHEDULED', 'DEAD_LETTER', 'DISPATCH_FAILED', 'LEASE_LOST'].includes(item?.status)).length;
    const errors = outcomes.map(item => String(item?.error || item?.reason || ''));
    const conflicts = errors.filter(text => /conflict|lock/i.test(text)).length;
    const rate429 = errors.filter(text => /429|rate[_ -]?limit/i.test(text)).length;
    this.#policy.observe({
      ready_count: selected.length,
      started_count: Math.min(selected.length, worked.length),
      success_count: success,
      failure_count: failures,
      conflict_count: conflicts,
      rate_limit_429_count: rate429,
      elapsed_ms: elapsed,
      latencies_ms: worked.length ? Array(worked.length).fill(elapsed / Math.max(1, worked.length)) : [elapsed],
      cumulative_cost_eur: 0,
    });
  }

  async runFairRound({ contexts }) {
    const { selected } = this.#selectLanes(contexts);
    if (!selected.length) return [];
    const startedAt = Date.now();
    const outcomes = await this.#worker.runFairRound({ contexts: selected });
    this.#observe({ selected, outcomes, startedAt });
    return outcomes;
  }

  async runSaturatedRound({ contexts, completion_budget = null }) {
    const { selected, target } = this.#selectLanes(contexts);
    if (!selected.length) return [];
    const startedAt = Date.now();
    const budget = completion_budget ?? Math.max(target, selected.length * 4);
    const outcomes = typeof this.#worker.runSaturatedRound === 'function'
      ? await this.#worker.runSaturatedRound({ contexts: selected, completion_budget: budget })
      : await this.#worker.runFairRound({ contexts: selected });
    this.#observe({ selected, outcomes, startedAt });
    return outcomes;
  }
}

export const DYNAMIC_CONCURRENCY_V1_CONTRACT = Object.freeze({
  capability: 'BOOST-001/JOB-001/dynamic-concurrency-v1',
  environment: PREPROD,
  extends_existing_durable_worker: true,
  second_daemon: false,
  pools: Object.freeze([...POOLS]),
  adaptive_scale: '1->2->4->N bounded by policy and telemetry',
  continuous_slot_refill: true,
  provider_backpressure: true,
  deepseek_measured_default_ceiling: 8,
  company_isolation: true,
  repo_write_locking: true,
  fail_closed_unknown_routes: true,
  hard_cost_cap_eur: 100,
  auto_recharge: false,
  prod_authorized: false,
  prod_writes: false,
  trading_access: false,
});
