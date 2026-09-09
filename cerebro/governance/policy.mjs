import { createHash } from 'node:crypto';

export const HUMAN_REQUIRED_REASONS = Object.freeze([
  'LEGAL_REQUIRED',
  'SIGNATURE_REQUIRED',
  'LOW_CONFIDENCE',
  'HIGH_RISK',
  'POLICY_CONFLICT',
  'SECURITY_INCIDENT',
  'MONEY_LIMIT',
  'CUSTOMER_HUMAN_REQUEST'
]);

const HUMAN_REQUIRED_SET = new Set(HUMAN_REQUIRED_REASONS);
const POLICY_EFFECTS = new Set(['ALLOW', 'DENY', 'REVIEW']);
const PRIORITY_BY_REASON = Object.freeze({
  SECURITY_INCIDENT: 100,
  LEGAL_REQUIRED: 90,
  SIGNATURE_REQUIRED: 85,
  HIGH_RISK: 80,
  MONEY_LIMIT: 70,
  POLICY_CONFLICT: 60,
  CUSTOMER_HUMAN_REQUEST: 50,
  LOW_CONFIDENCE: 40
});
const ROLE_BY_REASON = Object.freeze({
  SECURITY_INCIDENT: 'SECURITY',
  LEGAL_REQUIRED: 'LEGAL',
  SIGNATURE_REQUIRED: 'LEGAL',
  HIGH_RISK: 'OPERATIONS',
  MONEY_LIMIT: 'FINANCE',
  POLICY_CONFLICT: 'GOVERNANCE',
  CUSTOMER_HUMAN_REQUEST: 'CUSTOMER_SERVICE',
  LOW_CONFIDENCE: 'OPERATIONS'
});

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function assertPreprod(value) {
  if (value !== 'PREPROD') throw new Error('POL/HEX V0 accepts exact PREPROD only');
}

function assertSafeInt(value, name, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${name} must be a safe integer in range`);
  return value;
}

function clonePlain(value, path = '$') {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains non-finite number`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => clonePlain(item, `${path}[${index}]`));
  if (typeof value !== 'object') throw new TypeError(`${path} contains unsupported value`);
  if (Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${path} must contain plain data only`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const out = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if ('get' in descriptor || 'set' in descriptor) throw new TypeError(`${path}.${key} accessor properties are forbidden`);
    out[key] = clonePlain(descriptor.value, `${path}.${key}`);
  }
  return out;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) deepFreeze(item);
  return value;
}

function canonicalContext(context) {
  if (!context || typeof context !== 'object') throw new TypeError('context is required');
  const next = {
    company_id: assertNonEmptyString(context.company_id, 'company_id'),
    engine_id: assertNonEmptyString(context.engine_id, 'engine_id'),
    environment: assertNonEmptyString(context.environment, 'environment'),
    version: assertNonEmptyString(context.version, 'version')
  };
  assertPreprod(next.environment);
  return deepFreeze(next);
}

function normalizeRule(rule) {
  const safe = clonePlain(rule, '$rule');
  const normalized = {
    rule_id: assertNonEmptyString(safe.rule_id, 'rule_id'),
    version: assertNonEmptyString(safe.version, 'rule.version'),
    environment: safe.environment ?? 'PREPROD',
    company_id: safe.company_id ?? '*',
    engine_id: safe.engine_id ?? '*',
    action: safe.action ?? '*',
    effect: safe.effect,
    priority: safe.priority ?? 0,
    min_confidence_bp: safe.min_confidence_bp ?? 0,
    max_amount_eur_cents: safe.max_amount_eur_cents ?? null,
    enabled: safe.enabled !== false
  };
  assertPreprod(normalized.environment);
  assertNonEmptyString(normalized.company_id, 'rule.company_id');
  assertNonEmptyString(normalized.engine_id, 'rule.engine_id');
  assertNonEmptyString(normalized.action, 'rule.action');
  if (!POLICY_EFFECTS.has(normalized.effect)) throw new TypeError('rule.effect must be ALLOW, DENY or REVIEW');
  assertSafeInt(normalized.priority, 'rule.priority', 0, 1_000_000);
  assertSafeInt(normalized.min_confidence_bp, 'rule.min_confidence_bp', 0, 10_000);
  if (normalized.max_amount_eur_cents !== null) assertSafeInt(normalized.max_amount_eur_cents, 'rule.max_amount_eur_cents');
  return deepFreeze(normalized);
}

function normalizeRequest(request) {
  const safe = clonePlain(request, '$request');
  const normalized = {
    action: assertNonEmptyString(safe.action, 'action'),
    confidence_bp: safe.confidence_bp ?? 10_000,
    amount_eur_cents: safe.amount_eur_cents ?? 0,
    legal_required: safe.legal_required === true,
    signature_required: safe.signature_required === true,
    high_risk: safe.high_risk === true,
    security_incident: safe.security_incident === true,
    customer_human_request: safe.customer_human_request === true,
    source: safe.source ?? 'UNSPECIFIED'
  };
  assertSafeInt(normalized.confidence_bp, 'confidence_bp', 0, 10_000);
  assertSafeInt(normalized.amount_eur_cents, 'amount_eur_cents');
  assertNonEmptyString(normalized.source, 'source');
  return deepFreeze(normalized);
}

function humanRequired(reason, context, request, policy = null) {
  if (!HUMAN_REQUIRED_SET.has(reason)) throw new Error('non-canonical HUMAN_REQUIRED reason');
  return deepFreeze({
    status: 'HUMAN_REQUIRED',
    reason,
    context,
    action: request.action,
    policy
  });
}

function matchRule(rule, context, request) {
  if (!rule.enabled) return false;
  if (rule.environment !== context.environment) return false;
  if (rule.company_id !== '*' && rule.company_id !== context.company_id) return false;
  if (rule.engine_id !== '*' && rule.engine_id !== context.engine_id) return false;
  if (rule.action !== '*' && rule.action !== request.action) return false;
  return true;
}

function specificity(rule) {
  return Number(rule.company_id !== '*') + Number(rule.engine_id !== '*') + Number(rule.action !== '*');
}

export class PolicyEngine {
  #rules;
  #environment;
  #version;
  #audit = [];

  constructor({ rules = [], environment = 'PREPROD', version = '0.1.0' } = {}) {
    assertPreprod(environment);
    this.#environment = environment;
    this.#version = assertNonEmptyString(version, 'version');
    const normalized = rules.map(normalizeRule);
    const ids = new Set();
    for (const rule of normalized) {
      const key = `${rule.rule_id}@${rule.version}`;
      if (ids.has(key)) throw new Error(`duplicate policy rule version: ${key}`);
      ids.add(key);
    }
    this.#rules = Object.freeze(normalized);
  }

  get environment() { return this.#environment; }
  get version() { return this.#version; }

  evaluate(contextInput, requestInput) {
    const context = canonicalContext(contextInput);
    if (context.environment !== this.#environment) throw new Error('context environment does not match policy engine');
    const request = normalizeRequest(requestInput);

    let result;
    if (request.security_incident) result = humanRequired('SECURITY_INCIDENT', context, request);
    else if (request.legal_required) result = humanRequired('LEGAL_REQUIRED', context, request);
    else if (request.signature_required) result = humanRequired('SIGNATURE_REQUIRED', context, request);
    else if (request.customer_human_request) result = humanRequired('CUSTOMER_HUMAN_REQUEST', context, request);
    else if (request.high_risk) result = humanRequired('HIGH_RISK', context, request);
    else {
      const matches = this.#rules.filter(rule => matchRule(rule, context, request));
      if (matches.length === 0) {
        result = deepFreeze({ status: 'DENY', reason: 'NO_MATCHING_POLICY', context, action: request.action, policy: null });
      } else {
        const maxSpecificity = Math.max(...matches.map(specificity));
        const specific = matches.filter(rule => specificity(rule) === maxSpecificity);
        const maxPriority = Math.max(...specific.map(rule => rule.priority));
        const top = specific.filter(rule => rule.priority === maxPriority);
        const effects = new Set(top.map(rule => rule.effect));
        if (effects.size > 1) {
          result = humanRequired('POLICY_CONFLICT', context, request, top.map(rule => `${rule.rule_id}@${rule.version}`));
        } else {
          const selected = top[0];
          const policy = `${selected.rule_id}@${selected.version}`;
          if (request.confidence_bp < selected.min_confidence_bp) result = humanRequired('LOW_CONFIDENCE', context, request, policy);
          else if (selected.max_amount_eur_cents !== null && request.amount_eur_cents > selected.max_amount_eur_cents) result = humanRequired('MONEY_LIMIT', context, request, policy);
          else if (selected.effect === 'REVIEW') result = humanRequired('POLICY_CONFLICT', context, request, policy);
          else result = deepFreeze({ status: selected.effect, reason: `POLICY_${selected.effect}`, context, action: request.action, policy });
        }
      }
    }

    this.#audit.push(deepFreeze({ type: 'POLICY_EVALUATED', context, action: request.action, status: result.status, reason: result.reason, policy: result.policy ?? null }));
    return clonePlain(result);
  }

  auditLog({ company_id } = {}) {
    const company = assertNonEmptyString(company_id, 'company_id');
    return this.#audit.filter(entry => entry.context.company_id === company).map(entry => clonePlain(entry));
  }
}

function exceptionKey(context, action, reason) {
  return createHash('sha256').update(JSON.stringify([context.company_id, context.engine_id, context.environment, context.version, action, reason])).digest('hex');
}

export class HumanExceptionEngine {
  #environment;
  #version;
  #exceptions = new Map();

  constructor({ environment = 'PREPROD', version = '0.1.0' } = {}) {
    assertPreprod(environment);
    this.#environment = environment;
    this.#version = assertNonEmptyString(version, 'version');
  }

  get environment() { return this.#environment; }
  get version() { return this.#version; }

  ingest(resultInput) {
    const result = clonePlain(resultInput, '$result');
    if (result?.status !== 'HUMAN_REQUIRED' || !HUMAN_REQUIRED_SET.has(result.reason)) throw new TypeError('HEX-001 accepts canonical HUMAN_REQUIRED results only');
    const context = canonicalContext(result.context);
    if (context.environment !== this.#environment) throw new Error('context environment does not match exception engine');
    const action = assertNonEmptyString(result.action, 'action');
    const key = exceptionKey(context, action, result.reason);
    const existing = this.#exceptions.get(key);
    if (existing) return clonePlain(existing);

    const item = deepFreeze({
      exception_id: key,
      status: 'OPEN',
      reason: result.reason,
      priority: PRIORITY_BY_REASON[result.reason],
      assigned_role: ROLE_BY_REASON[result.reason],
      context,
      action,
      policy: result.policy ?? null
    });
    this.#exceptions.set(key, item);
    return clonePlain(item);
  }

  list({ company_id } = {}) {
    const company = assertNonEmptyString(company_id, 'company_id');
    return [...this.#exceptions.values()]
      .filter(item => item.context.company_id === company)
      .sort((a, b) => b.priority - a.priority || a.exception_id.localeCompare(b.exception_id))
      .map(item => clonePlain(item));
  }
}

export const GOVERNANCE_V0_CONTRACT = deepFreeze({
  environment: 'PREPROD',
  additional_cost_target_eur: 0,
  prod_execution_enabled: false,
  autonomous_prod: false,
  supabase_writes: false,
  external_actions: false,
  cross_company_access: 'DENY',
  policy_effects: ['ALLOW', 'DENY', 'REVIEW'],
  human_required_reasons: [...HUMAN_REQUIRED_REASONS]
});
