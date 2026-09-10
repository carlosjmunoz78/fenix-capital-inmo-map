import { loadDigitalBuildCatalog, selectTemplate, validateDigitalBuildCatalog } from './digital-build-capability-catalog.mjs';

const REQUIRED_CONTEXT = ['company_id', 'engine_id', 'environment', 'version'];
const HUMAN_REQUIRED = new Set([
  'LEGAL_REQUIRED',
  'SIGNATURE_REQUIRED',
  'LOW_CONFIDENCE',
  'HIGH_RISK',
  'POLICY_CONFLICT',
  'SECURITY_INCIDENT',
  'MONEY_LIMIT',
  'CUSTOMER_HUMAN_REQUEST',
]);
const PRIORITY_BY_REASON = Object.freeze({
  SECURITY_INCIDENT: 100,
  LEGAL_REQUIRED: 90,
  SIGNATURE_REQUIRED: 85,
  HIGH_RISK: 80,
  MONEY_LIMIT: 70,
  POLICY_CONFLICT: 60,
  CUSTOMER_HUMAN_REQUEST: 50,
  LOW_CONFIDENCE: 40,
});

function ownDataObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  if (Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label} must be a plain object`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const out = {};
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string') throw new Error(`${label} symbol properties are forbidden`);
    const descriptor = descriptors[key];
    if (!('value' in descriptor)) throw new Error(`${label}.${key} must be a data property`);
    Object.defineProperty(out, key, {
      value: descriptor.value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return out;
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`);
  return value;
}

function boolean(value, label) {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
  return value;
}

function finiteNonNegative(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number`);
  return value;
}

function snapshot(value) {
  return structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) deepFreeze(item);
  return value;
}

function highestReason(reasons) {
  return [...new Set(reasons)]
    .sort((a, b) => PRIORITY_BY_REASON[b] - PRIORITY_BY_REASON[a] || a.localeCompare(b))[0] ?? null;
}

function humanRequired({ reason, requestId, context, capabilityId }) {
  return deepFreeze({
    outcome: 'HUMAN_REQUIRED',
    reason,
    request_id: requestId,
    context: snapshot(context),
    capability_id: capabilityId,
    executed: false,
  });
}

export function planDigitalBuild(requestInput, { catalog = loadDigitalBuildCatalog() } = {}) {
  const request = ownDataObject(requestInput, 'request');
  validateDigitalBuildCatalog({ catalog });

  const context = ownDataObject(request.context, 'request.context');
  for (const key of REQUIRED_CONTEXT) nonEmptyString(context[key], `request.context.${key}`);
  if (context.environment !== 'SCAFFOLD') throw new Error('digital build V0 accepts exact SCAFFOLD only');

  const capabilityId = nonEmptyString(request.capability_id, 'request.capability_id');
  const requestId = nonEmptyString(request.request_id, 'request.request_id');
  const requiresProdWrite = boolean(request.requires_prod_write, 'request.requires_prod_write');
  const autonomousProd = boolean(request.autonomous_prod, 'request.autonomous_prod');
  const tradingAccess = boolean(request.trading_access, 'request.trading_access');
  const additionalCost = finiteNonNegative(request.estimated_additional_cost_eur, 'request.estimated_additional_cost_eur');

  const capability = catalog.capabilities.find((item) => item.capability_id === capabilityId);
  if (!capability) throw new Error(`unknown capability ${capabilityId}`);

  const reasons = [];
  if (requiresProdWrite || autonomousProd) reasons.push('HIGH_RISK');
  if (additionalCost > 0) reasons.push('MONEY_LIMIT');
  if (tradingAccess) reasons.push('POLICY_CONFLICT');
  const reason = highestReason(reasons);
  if (reason) return humanRequired({ reason, requestId, context, capabilityId });

  const template = selectTemplate(capabilityId, { catalog });
  const plan = {
    outcome: 'PLAN_READY',
    request_id: requestId,
    context: snapshot(context),
    capability_id: capability.capability_id,
    capability_version: capability.version,
    capability_status: capability.status,
    engine_bindings: snapshot(capability.engine_bindings),
    template: snapshot(template),
    skills: snapshot(capability.skills),
    execution_mode: 'PLAN_ONLY',
    deterministic_first: true,
    executed: false,
    prod_writes: false,
    autonomous_prod: false,
    trading_access: false,
    additional_cost_target_eur: 0,
    gates: [
      'CONSERVAR',
      'ENTENDER',
      'ENVOLVER',
      'PROBAR',
      'MEJORAR',
      'MIGRAR',
      'PREPROD_BEFORE_PROMOTION',
      'ROLLBACK_REQUIRED_BEFORE_PROMOTION'
    ],
  };

  return deepFreeze(plan);
}

export function assertCanonicalHumanRequired(resultInput) {
  const result = ownDataObject(resultInput, 'result');
  if (result.outcome !== 'HUMAN_REQUIRED') throw new Error('result is not HUMAN_REQUIRED');
  if (!HUMAN_REQUIRED.has(result.reason)) throw new Error('noncanonical HUMAN_REQUIRED reason');
  return true;
}
