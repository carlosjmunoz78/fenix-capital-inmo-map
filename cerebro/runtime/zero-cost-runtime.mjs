import { types } from 'node:util';
import { AtomicV8Journal } from './persistent-runtime.mjs';

const PREPROD = 'PREPROD';
const MIN_CONFIDENCE = 0.5;
const FREE_RANK = new Map([
  ['deterministic', 0],
  ['local_model', 1],
  ['existing_provider', 2],
  ['free_tier', 3],
  ['self_hosted', 4],
  ['cheap_external', 5],
  ['paid_provider', 6]
]);
const ROUTES = new Set([...FREE_RANK.keys(), 'HUMAN_REQUIRED']);
const HUMAN_REQUIRED = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function plain(value, label) {
  if (!value || typeof value !== 'object') throw new TypeError(`${label} must be a plain object`);
  if (types.isProxy(value)) throw new TypeError(`${label} must not be a Proxy`);
  if (Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${label} must be a plain object`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const descriptor of Object.values(descriptors)) {
    if (descriptor.get || descriptor.set) throw new TypeError(`${label} must not contain accessors`);
  }
  return value;
}

function contextOf(value) {
  const ctx = plain(value, 'context');
  const environment = nonEmpty(ctx.environment, 'context.environment');
  if (environment !== PREPROD) throw new Error('zero-cost runtime V0 is PREPROD-only');
  return Object.freeze({
    company_id: nonEmpty(ctx.company_id, 'context.company_id'),
    engine_id: nonEmpty(ctx.engine_id, 'context.engine_id'),
    environment,
    version: nonEmpty(ctx.version, 'context.version')
  });
}

function clone(value) { return structuredClone(value); }

function sameScope(a, b) {
  return a.company_id === b.company_id && a.engine_id === b.engine_id && a.environment === b.environment && a.version === b.version;
}

function assertNonNegativeCost(value, label = 'cost_eur') {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be a finite non-negative number`);
  return value;
}

function normalizeCapability(input) {
  const value = plain(input, 'capability');
  if (value.trading_access === true) throw new Error('Trading access is forbidden in zero-cost runtime V0');
  const health = value.health ?? 'AVAILABLE';
  if (!['AVAILABLE','DEGRADED','UNAVAILABLE'].includes(health)) throw new Error('unsupported capability health');
  const capabilities = Array.isArray(value.capabilities) ? value.capabilities.map((x, i) => nonEmpty(x, `capabilities[${i}]`)) : [];
  const environment = value.environment === undefined ? PREPROD : nonEmpty(value.environment, 'environment');
  if (environment !== PREPROD) throw new Error('LOCAL-001 V0 accepts exact PREPROD only');
  return Object.freeze({
    capability_id: nonEmpty(value.capability_id, 'capability_id'),
    company_id: value.company_id === 'GLOBAL' ? 'GLOBAL' : nonEmpty(value.company_id, 'company_id'),
    engine_id: nonEmpty(value.engine_id, 'engine_id'),
    environment,
    version: nonEmpty(value.version ?? '0.1.0', 'version'),
    kind: nonEmpty(value.kind ?? 'local', 'kind'),
    priority: Number.isSafeInteger(value.priority) ? value.priority : 100,
    health,
    cost_eur: assertNonNegativeCost(value.cost_eur ?? 0),
    capabilities,
    limits: clone(value.limits ?? {})
  });
}

export class LocalCapabilityRegistry {
  #items;
  constructor(capabilities = []) {
    if (!Array.isArray(capabilities)) throw new TypeError('capabilities must be an array');
    this.#items = capabilities.map(normalizeCapability);
  }
  list(context) {
    const ctx = contextOf(context);
    return this.#items
      .filter(item => item.environment === PREPROD)
      .filter(item => item.company_id === 'GLOBAL' || item.company_id === ctx.company_id)
      .filter(item => item.version === 'GLOBAL' || item.version === ctx.version)
      .map(clone);
  }
  select({ context, requires = [] }) {
    const ctx = contextOf(context);
    if (!Array.isArray(requires)) throw new TypeError('requires must be an array');
    const required = requires.map((x, i) => nonEmpty(x, `requires[${i}]`));
    const candidates = this.#items
      .filter(item => item.environment === PREPROD)
      .filter(item => item.company_id === 'GLOBAL' || item.company_id === ctx.company_id)
      .filter(item => item.engine_id === ctx.engine_id || item.engine_id === 'GLOBAL')
      .filter(item => item.version === 'GLOBAL' || item.version === ctx.version)
      .filter(item => item.health === 'AVAILABLE')
      .filter(item => item.cost_eur === 0)
      .filter(item => required.every(cap => item.capabilities.includes(cap)))
      .sort((a, b) => a.priority - b.priority || a.capability_id.localeCompare(b.capability_id));
    if (!candidates[0]) return Object.freeze({ status:'UNAVAILABLE', selected:null, reason:'NO_ZERO_COST_LOCAL_CAPABILITY' });
    return Object.freeze({ status:'AVAILABLE', selected:clone(candidates[0]), reason:'ZERO_COST_LOCAL_CAPABILITY' });
  }
}

function normalizeOption(input) {
  const value = plain(input, 'option');
  const route_type = nonEmpty(value.route_type, 'option.route_type');
  if (!FREE_RANK.has(route_type)) throw new Error(`unsupported route_type: ${route_type}`);
  if (value.trading_access === true) throw new Error('Trading access is forbidden in zero-cost runtime V0');
  const confidence = value.confidence === undefined ? 1 : value.confidence;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new TypeError('option.confidence must be a finite number between 0 and 1');
  return Object.freeze({
    option_id: nonEmpty(value.option_id, 'option.option_id'),
    route_type,
    available: value.available !== false,
    equivalent: value.equivalent !== false,
    cost_eur: assertNonNegativeCost(value.cost_eur ?? 0),
    confidence,
    provider: value.provider ?? null,
    metadata: clone(value.metadata ?? {})
  });
}

export class FreeFirstBroker {
  resolve({ context, options = [], money_limit_approved = false }) {
    contextOf(context);
    if (typeof money_limit_approved !== 'boolean') throw new TypeError('money_limit_approved must be boolean');
    if (!Array.isArray(options)) throw new TypeError('options must be an array');
    const candidates = options.map(normalizeOption).filter(option => option.available && option.equivalent);
    candidates.sort((a, b) => Number(a.cost_eur > 0) - Number(b.cost_eur > 0) || FREE_RANK.get(a.route_type) - FREE_RANK.get(b.route_type) || a.cost_eur - b.cost_eur || a.option_id.localeCompare(b.option_id));
    const selected = candidates[0];
    if (!selected) return Object.freeze({ route_type:'HUMAN_REQUIRED', human_reason:'LOW_CONFIDENCE', selected:null, reason:'NO_VALID_ROUTE' });
    if (selected.confidence < MIN_CONFIDENCE) return Object.freeze({ route_type:'HUMAN_REQUIRED', human_reason:'LOW_CONFIDENCE', selected:null, reason:'SELECTED_ROUTE_LOW_CONFIDENCE' });
    if (selected.route_type === 'paid_provider' || selected.cost_eur > 0) {
      if (!money_limit_approved) return Object.freeze({ route_type:'HUMAN_REQUIRED', human_reason:'MONEY_LIMIT', selected:null, reason:'PAID_ROUTE_REQUIRES_APPROVAL' });
    }
    return Object.freeze({ route_type:selected.route_type, human_reason:null, selected:clone(selected), reason:'FREE_FIRST_SELECTED' });
  }
}

function validateOperation(op, kind) {
  plain(op, 'operation');
  if (op.op !== 'put') throw new Error(`${kind} supports put operations only in V0`);
  const ctx = contextOf(op.context);
  return Object.freeze({ op:'put', context:{...ctx}, key:nonEmpty(op.key, 'key'), value:clone(op.value) });
}

export class LocalOffloadStore {
  #journal; #kind; #operations;
  constructor({ file_path, kind, environment }) {
    const env = environment === undefined ? PREPROD : environment;
    if (env !== PREPROD) throw new Error('offload store V0 accepts exact PREPROD only');
    this.#kind = nonEmpty(kind, 'kind');
    if (!['DBOFF-001','STOROFF-001','AIBUD-001'].includes(this.#kind)) throw new Error('unsupported offload kind');
    this.#journal = new AtomicV8Journal({ file_path:nonEmpty(file_path, 'file_path'), kind:this.#kind });
    const loaded = this.#journal.load();
    if (!Array.isArray(loaded)) throw new Error('offload journal payload must be an array');
    this.#operations = loaded.map(op => validateOperation(op, this.#kind));
  }
  put({ context, key, value }) {
    const op = validateOperation({ op:'put', context, key, value }, this.#kind);
    const candidate = [...this.#operations, clone(op)];
    this.#journal.commit(candidate);
    this.#operations = candidate;
    return clone(op.value);
  }
  get({ context, key }) {
    const ctx = contextOf(context); const safeKey = nonEmpty(key, 'key');
    for (let i = this.#operations.length - 1; i >= 0; i -= 1) {
      const op = this.#operations[i];
      if (sameScope(op.context, ctx) && op.key === safeKey) return clone(op.value);
    }
    return null;
  }
  backup(context) {
    const ctx = contextOf(context);
    return clone(this.#operations.filter(op => sameScope(op.context, ctx)));
  }
  prepareRestore({ context, snapshot }) {
    const ctx = contextOf(context);
    if (!Array.isArray(snapshot)) throw new TypeError('snapshot must be an array');
    const scoped = snapshot.map(op => validateOperation(op, this.#kind));
    if (scoped.some(op => !sameScope(op.context, ctx))) throw new Error('snapshot contains cross-scope operations');
    const retained = this.#operations.filter(op => !sameScope(op.context, ctx));
    return Object.freeze({ scoped:clone(scoped), candidate:clone([...retained, ...scoped]) });
  }
  commitPrepared(prepared) {
    if (!prepared || !Array.isArray(prepared.candidate) || !Array.isArray(prepared.scoped)) throw new TypeError('prepared restore is invalid');
    this.#journal.commit(prepared.candidate);
    this.#operations = clone(prepared.candidate);
    return prepared.scoped.length;
  }
  restore({ context, snapshot }) { return this.commitPrepared(this.prepareRestore({ context, snapshot })); }
  get operation_count() { return this.#operations.length; }
  get journal_path() { return this.#journal.file_path; }
}

export class BudgetModelRouterV0 {
  #broker;
  constructor({ broker = new FreeFirstBroker() } = {}) { this.#broker = broker; }
  route({ context, options = [], low_confidence = false, high_risk = false, policy_conflict = false, security_incident = false, money_limit_approved = false }) {
    contextOf(context);
    for (const [label, value] of Object.entries({ low_confidence, high_risk, policy_conflict, security_incident, money_limit_approved })) {
      if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
    }
    if (security_incident) return this.#human('SECURITY_INCIDENT');
    if (policy_conflict) return this.#human('POLICY_CONFLICT');
    if (high_risk) return this.#human('HIGH_RISK');
    if (low_confidence) return this.#human('LOW_CONFIDENCE');
    const result = this.#broker.resolve({ context, options, money_limit_approved });
    if (!ROUTES.has(result.route_type)) throw new Error('broker returned unsupported route');
    if (result.human_reason && !HUMAN_REQUIRED.has(result.human_reason)) throw new Error('broker returned unsupported HUMAN_REQUIRED reason');
    return result;
  }
  #human(reason) {
    if (!HUMAN_REQUIRED.has(reason)) throw new Error('unsupported HUMAN_REQUIRED reason');
    return Object.freeze({ route_type:'HUMAN_REQUIRED', human_reason:reason, selected:null, reason });
  }
}

export function createZeroCostRuntimeV0({ capabilities = [], broker } = {}) {
  const selectedBroker = broker ?? new FreeFirstBroker();
  return Object.freeze({
    local:new LocalCapabilityRegistry(capabilities),
    broker:selectedBroker,
    router:new BudgetModelRouterV0({ broker:selectedBroker }),
    contract:Object.freeze({
      environment:PREPROD,
      additional_cost_target_eur:0,
      supabase_preprod_required:false,
      supabase_heavy_state:false,
      prod_writes:false,
      autonomous_prod:false,
      trading_access:false,
      company_scope:'MULTI_COMPANY'
    })
  });
}
