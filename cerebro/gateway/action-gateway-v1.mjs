const HUMAN_REQUIRED = new Set([
  'LEGAL_REQUIRED',
  'SIGNATURE_REQUIRED',
  'LOW_CONFIDENCE',
  'HIGH_RISK',
  'POLICY_CONFLICT',
  'SECURITY_INCIDENT',
  'MONEY_LIMIT',
  'CUSTOMER_HUMAN_REQUEST'
]);

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function plainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be a plain object`);
  }
  return value;
}

function safeClone(value) {
  return structuredClone(value);
}

function canonicalContext(raw) {
  plainObject(raw, 'context');
  const context = {
    company_id: requiredString(raw.company_id, 'context.company_id'),
    engine_id: requiredString(raw.engine_id, 'context.engine_id'),
    environment: requiredString(raw.environment, 'context.environment'),
    version: requiredString(raw.version, 'context.version')
  };
  if (context.engine_id !== 'ACTGW-001') throw new Error('context.engine_id must be ACTGW-001');
  if (context.environment !== 'PREPROD') throw new Error('ACTGW-001 V1 requires PREPROD');
  return Object.freeze(context);
}

function validateHumanRequired(result) {
  if (!result || result.status !== 'HUMAN_REQUIRED') return;
  if (!HUMAN_REQUIRED.has(result.reason)) throw new Error('invalid HUMAN_REQUIRED reason');
}

function humanRequired(context, reason, detail) {
  if (!HUMAN_REQUIRED.has(reason)) throw new Error('invalid HUMAN_REQUIRED reason');
  return Object.freeze({ status: 'HUMAN_REQUIRED', reason, detail, executed: false, context });
}

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

export class ActionGatewayV1 {
  #environment;
  #capabilities = new Map();
  #idempotency = new Map();
  #audit = [];

  constructor({ environment = 'PREPROD' } = {}) {
    if (environment !== 'PREPROD') throw new Error('Action Gateway V1 is PREPROD-only');
    this.#environment = environment;
  }

  registerCapability(name, handler) {
    const capability = requiredString(name, 'capability');
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    if (this.#capabilities.has(capability)) throw new Error('capability already registered');
    this.#capabilities.set(capability, handler);
  }

  async execute(input) {
    plainObject(input, 'input');
    const context = canonicalContext(input.context);
    const capability = requiredString(input.capability, 'capability');
    const idempotencyKey = requiredString(input.idempotency_key, 'idempotency_key');
    const payload = input.payload === undefined ? {} : safeClone(plainObject(input.payload, 'payload'));
    const signatureRequired = input.signature_required === true;
    const requiresProdWrite = input.requires_prod_write === true;
    const autonomousProd = input.autonomous_prod === true;
    const tradingAccess = input.trading_access === true;
    const risk = requiredString(input.risk ?? 'LOW', 'risk');
    const cost = input.estimated_additional_cost_eur ?? 0;

    if (input.authorized !== true) return this.#recordHuman(context, capability, idempotencyKey, 'POLICY_CONFLICT', 'explicit authorization missing');
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(risk)) throw new Error('invalid risk');
    if (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0) throw new Error('invalid estimated_additional_cost_eur');
    if (tradingAccess) return this.#recordHuman(context, capability, idempotencyKey, 'POLICY_CONFLICT', 'trading access denied by control-plane policy');
    if (requiresProdWrite || autonomousProd) return this.#recordHuman(context, capability, idempotencyKey, 'HIGH_RISK', 'PROD execution is not authorized by Action Gateway V1');
    if (signatureRequired) return this.#recordHuman(context, capability, idempotencyKey, 'SIGNATURE_REQUIRED', 'signature required before execution');
    if (risk === 'HIGH') return this.#recordHuman(context, capability, idempotencyKey, 'HIGH_RISK', 'high-risk action requires human exception handling');
    if (cost > 0) return this.#recordHuman(context, capability, idempotencyKey, 'MONEY_LIMIT', 'additional cost exceeds zero-cost policy');

    const handler = this.#capabilities.get(capability);
    if (!handler) return this.#recordHuman(context, capability, idempotencyKey, 'LOW_CONFIDENCE', `unknown capability:${capability}`);

    const fingerprint = stableJson({ capability, payload, company_id: context.company_id, version: context.version });
    const prior = this.#idempotency.get(idempotencyKey);
    if (prior) {
      if (prior.fingerprint !== fingerprint) {
        return this.#recordHuman(context, capability, idempotencyKey, 'POLICY_CONFLICT', 'idempotency key reused with different action');
      }
      this.#audit.push({ type: 'ACTION_REPLAYED', capability, idempotency_key: idempotencyKey, context });
      return safeClone(prior.response);
    }

    const raw = await handler({ context, payload: safeClone(payload) });
    const result = safeClone(raw);
    validateHumanRequired(result);

    if (result?.status === 'HUMAN_REQUIRED') {
      this.#audit.push({ type: 'HUMAN_REQUIRED', capability, idempotency_key: idempotencyKey, context, result });
      return safeClone(result);
    }

    const response = Object.freeze({
      status: 'ACTION_EXECUTED',
      engine_id: 'ACTGW-001',
      capability,
      idempotency_key: idempotencyKey,
      executed: true,
      context,
      result
    });
    this.#idempotency.set(idempotencyKey, { fingerprint, response: safeClone(response) });
    this.#audit.push({ type: 'ACTION_EXECUTED', capability, idempotency_key: idempotencyKey, context });
    return safeClone(response);
  }

  auditLog() {
    return safeClone(this.#audit);
  }

  contract() {
    return Object.freeze({
      engine_id: 'ACTGW-001',
      environment: this.#environment,
      version: '1.0.0-preprod',
      execution: 'REGISTERED_CAPABILITIES_ONLY',
      prod_writes: false,
      autonomous_prod: false,
      trading_access: false,
      additional_cost_target_eur: 0,
      idempotency_required: true,
      audit_required: true
    });
  }

  #recordHuman(context, capability, idempotencyKey, reason, detail) {
    const result = humanRequired(context, reason, detail);
    this.#audit.push({ type: 'HUMAN_REQUIRED', capability, idempotency_key: idempotencyKey, context, result });
    return safeClone(result);
  }
}
