#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MultiCompanyBootstrap } from './bootstrap.mjs';

const EXACT_ENVIRONMENT = 'PREPROD';
const EXACT_INTENT = 'EXECUTE_COMP_REG_TENANT_PREPROD';
const HUMAN_REQUIRED = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${label} must be a plain object`);
  }
  return value;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function failClosed(code, message, request = {}) {
  const error = new Error(message);
  error.code = code;
  error.human_required = HUMAN_REQUIRED.has(code) ? code : null;
  error.request_id = typeof request.request_id === 'string' ? request.request_id : null;
  throw error;
}

export function validateCompanyRegTenantRequest(raw) {
  const request = assertPlainObject(raw, 'request');
  const normalized = {
    schema_version: request.schema_version ?? '1.0.0',
    request_id: assertNonEmptyString(request.request_id, 'request.request_id'),
    company_id: assertNonEmptyString(request.company_id, 'request.company_id'),
    environment: request.environment ?? EXACT_ENVIRONMENT,
    version: request.version ?? '0.1.0',
    intent: request.intent ?? EXACT_INTENT
  };

  if (normalized.schema_version !== '1.0.0') failClosed('POLICY_CONFLICT', 'unsupported request schema_version', request);
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(normalized.request_id)) failClosed('POLICY_CONFLICT', 'request_id format rejected', request);
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(normalized.company_id)) failClosed('POLICY_CONFLICT', 'company_id format rejected', request);
  if (normalized.environment !== EXACT_ENVIRONMENT) failClosed('HIGH_RISK', 'COMP-REG/TENANT V0 requires exact PREPROD', request);
  if (typeof normalized.version !== 'string' || !normalized.version.trim()) failClosed('POLICY_CONFLICT', 'version must be a non-empty string', request);
  if (normalized.intent !== EXACT_INTENT) failClosed('POLICY_CONFLICT', 'unsupported execution intent', request);

  for (const flag of ['prod_authorized', 'prod_write_authorized', 'trading_access', 'supabase_writes', 'external_code_execution']) {
    if (request[flag] === true) failClosed('HIGH_RISK', `${flag}=true is forbidden`, request);
  }
  if (request.additional_cost_eur != null && Number(request.additional_cost_eur) !== 0) failClosed('MONEY_LIMIT', 'additional_cost_eur must remain zero', request);

  return Object.freeze({
    ...normalized,
    version: normalized.version.trim(),
    additional_cost_eur: 0,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    supabase_writes: false,
    external_code_execution: false
  });
}

function readJson(file) {
  return assertPlainObject(JSON.parse(fs.readFileSync(file, 'utf8')), 'request');
}

function stateDigest(company) {
  return Object.fromEntries(
    Object.entries(company.engines)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([engineId, node]) => [engineId, {
        state: node.state,
        human_required: node.human_required,
        dependencies: [...node.dependencies].sort()
      }])
  );
}

function greenEngines(company) {
  return Object.values(company.engines)
    .filter((node) => node.state === 'GREEN')
    .map((node) => node.engine_id)
    .sort();
}

export function runCompanyRegTenantPreprod({ requestFile, outFile = null }) {
  const request = validateCompanyRegTenantRequest(readJson(requestFile));
  const runtime = new MultiCompanyBootstrap({ environment: EXACT_ENVIRONMENT, version: request.version });
  const controlCompanyId = `control-${sha256(request.company_id).slice(0, 16)}`;

  const primaryRegistration = runtime.registerCompany({ company_id: request.company_id, profile: {} });
  const controlRegistration = runtime.registerCompany({ company_id: controlCompanyId, profile: {} });
  if (!primaryRegistration.accepted || !controlRegistration.accepted) {
    failClosed('LOW_CONFIDENCE', 'fresh PREPROD registration was not accepted', request);
  }
  if (primaryRegistration.company.state !== 'REGISTERED_PREPROD') {
    failClosed('LOW_CONFIDENCE', 'primary company did not enter REGISTERED_PREPROD', request);
  }
  if (runtime.nextReady(request.company_id).join(',') !== 'COMP-REG-001') {
    failClosed('POLICY_CONFLICT', 'COMP-REG-001 must be the only initial ready engine', request);
  }
  if (runtime.nextReady(controlCompanyId).join(',') !== 'COMP-REG-001') {
    failClosed('POLICY_CONFLICT', 'control tenant initial state drift', request);
  }

  runtime.startEngine({ company_id: request.company_id, engine_id: 'COMP-REG-001' });
  const afterCompanyRegistry = runtime.markEngineResult({
    company_id: request.company_id,
    engine_id: 'COMP-REG-001',
    status: 'SUCCESS',
    evidence: [{
      kind: 'PREPROD_REFERENCE_EXECUTION',
      request_id: request.request_id,
      company_id: request.company_id,
      engine_id: 'COMP-REG-001',
      environment: EXACT_ENVIRONMENT,
      version: request.version,
      prod_authorized: false
    }]
  });

  if (afterCompanyRegistry.engines['COMP-REG-001'].state !== 'GREEN') {
    failClosed('LOW_CONFIDENCE', 'COMP-REG-001 did not become GREEN', request);
  }
  const readyAfterRegistry = runtime.nextReady(request.company_id);
  if (!readyAfterRegistry.includes('COMP-ONB-001') || !readyAfterRegistry.includes('TENANT-001')) {
    failClosed('POLICY_CONFLICT', 'COMP-REG dependency progression drift', request);
  }

  runtime.startEngine({ company_id: request.company_id, engine_id: 'TENANT-001' });
  const afterTenant = runtime.markEngineResult({
    company_id: request.company_id,
    engine_id: 'TENANT-001',
    status: 'SUCCESS',
    evidence: [{
      kind: 'TENANT_BOUNDARY_PREPROD_REFERENCE',
      request_id: request.request_id,
      company_id: request.company_id,
      engine_id: 'TENANT-001',
      environment: EXACT_ENVIRONMENT,
      version: request.version,
      cross_company_access: 'deny',
      prod_authorized: false
    }]
  });

  if (afterTenant.engines['TENANT-001'].state !== 'GREEN') {
    failClosed('LOW_CONFIDENCE', 'TENANT-001 did not become GREEN', request);
  }
  if (afterTenant.engines['COMP-ONB-001'].state !== 'READY') {
    failClosed('POLICY_CONFLICT', 'COMP-ONB-001 should remain READY after registry/tenant reference execution', request);
  }
  if (afterTenant.engines['SCAN-001'].state !== 'BLOCKED') {
    failClosed('POLICY_CONFLICT', 'SCAN-001 cannot unlock before COMP-ONB-001 is GREEN', request);
  }
  if (afterTenant.engines['ENGACT-001'].state !== 'BLOCKED') {
    failClosed('POLICY_CONFLICT', 'ENGACT-001 cannot unlock from tenant boundary alone', request);
  }

  const controlAfter = runtime.inspectCompany(controlCompanyId);
  if (greenEngines(controlAfter).length !== 0 || runtime.nextReady(controlCompanyId).join(',') !== 'COMP-REG-001') {
    failClosed('SECURITY_INCIDENT', 'cross-company state leakage detected', request);
  }

  const primaryGreens = greenEngines(afterTenant);
  if (canonicalJson(primaryGreens) !== canonicalJson(['COMP-REG-001', 'TENANT-001'])) {
    failClosed('POLICY_CONFLICT', 'reference execution marked unexpected engines GREEN', request);
  }

  const promotion = runtime.canPromote(request.company_id);
  if (promotion.allowed !== false || promotion.reason !== 'PHASE4_NOT_ALL_GREEN') {
    failClosed('HIGH_RISK', 'reference execution cannot authorize promotion', request);
  }

  const identity = {
    request_id: request.request_id,
    company_id: request.company_id,
    control_company_id: controlCompanyId,
    environment: request.environment,
    version: request.version,
    primary_engine_states: stateDigest(afterTenant),
    control_engine_states: stateDigest(controlAfter),
    promotion
  };

  const result = {
    schema_version: '1.0.0',
    state_type: 'CEREBRO_COMP_REG_TENANT_PREPROD_RESULT',
    status: 'COMP_REG_TENANT_PREPROD_GREEN',
    request_id: request.request_id,
    company_id: request.company_id,
    engine_ids: ['COMP-REG-001', 'TENANT-001'],
    environment: request.environment,
    version: request.version,
    registered_state: afterTenant.state,
    green_engines: primaryGreens,
    next_ready: runtime.nextReady(request.company_id),
    scan_state: afterTenant.engines['SCAN-001'].state,
    activation_state: afterTenant.engines['ENGACT-001'].state,
    control_company_id: controlCompanyId,
    control_green_engines: greenEngines(controlAfter),
    tenant_isolation_verified: true,
    promotion,
    execution_sha256: sha256(canonicalJson(identity)),
    durability_state: 'IN_MEMORY_REFERENCE_ONLY',
    next_gate: 'DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED',
    human_required: [],
    additional_cost_eur: 0,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    supabase_writes: false,
    external_code_execution: false
  };

  if (outFile) {
    const target = path.resolve(outFile);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  return result;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--request') args.requestFile = argv[++i];
    else if (argv[i] === '--out') args.outFile = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!args.requestFile) throw new Error('Usage: node company-reg-tenant-preprod.mjs --request <file> [--out <file>]');
  return args;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = runCompanyRegTenantPreprod(parseArgs(process.argv));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: 'COMP_REG_TENANT_PREPROD_REJECTED',
      code: error?.code ?? 'INVALID_REQUEST',
      human_required: error?.human_required ?? null,
      request_id: error?.request_id ?? null,
      message: error?.message ?? 'unknown error',
      additional_cost_eur: 0,
      prod_authorized: false,
      prod_write_authorized: false,
      trading_access: false
    })}\n`);
    process.exitCode = 1;
  }
}
