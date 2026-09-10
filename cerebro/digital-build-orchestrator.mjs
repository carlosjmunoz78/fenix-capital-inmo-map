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

function ownDataObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!('value' in descriptor)) throw new Error(`${label}.${key} must be a data property`);
  }
  return value;
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

export function planDigitalBuild(request, { catalog = loadDigitalBuildCatalog() } = {}) {
  ownDataObject(request, 'request');
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

  if (tradingAccess) {
    return Object.freeze({
      outcome: 'HUMAN_REQUIRED',
      reason: 'POLICY_CONFLICT',
      request_id: requestId,
      context: snapshot(context),
      capability_id: capabilityId,
      executed: false,
    });
  }
  if (requiresProdWrite || autonomousProd) {
    return Object.freeze({
      outcome: 'HUMAN_REQUIRED',
      reason: 'HIGH_RISK',
      request_id: requestId,
      context: snapshot(context),
      capability_id: capabilityId,
      executed: false,
    });
  }
  if (additionalCost > 0) {
    return Object.freeze({
      outcome: 'HUMAN_REQUIRED',
      reason: 'MONEY_LIMIT',
      request_id: requestId,
      context: snapshot(context),
      capability_id: capabilityId,
      executed: false,
    });
  }

  const template = selectTemplate(capabilityId, { catalog });
  const plan = {
    outcome: 'PLAN_READY',
    request_id: requestId,
    context: snapshot(context),
    capability_id: capability.capability_id,
    capability_version: capability.version,
    capability_status: capability.status,
    engine_bindings: snapshot(capability.engine_bindings),
    template,
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

  return Object.freeze(plan);
}

export function assertCanonicalHumanRequired(result) {
  ownDataObject(result, 'result');
  if (result.outcome !== 'HUMAN_REQUIRED') throw new Error('result is not HUMAN_REQUIRED');
  if (!HUMAN_REQUIRED.has(result.reason)) throw new Error('noncanonical HUMAN_REQUIRED reason');
  return true;
}
