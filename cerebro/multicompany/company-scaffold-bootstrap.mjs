#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MultiCompanyBootstrap, getPhase4Registry } from './bootstrap.mjs';
import { runFactoryRequest } from '../runtime/fact001-request-runner.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT = path.resolve(HERE, '..');
const FACT_REGISTRY = path.join(CEREBRO_ROOT, 'registry', 'engine-registry.seed.json');
const EXACT_ENVIRONMENT = 'PREPROD';
const SCAFFOLD_ENVIRONMENT = 'SCAFFOLD';
const MAX_PROFILE_BYTES = 8192;
const SENSITIVE_PROFILE_KEY = /(password|passwd|secret|token|credential|private[_-]?key|api[_-]?key|iban|bank[_-]?account)/i;
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

function validateProfile(value, request) {
  if (value == null) return Object.freeze({});
  const profile = assertPlainObject(value, 'request.profile');
  const json = canonicalJson(profile);
  if (Buffer.byteLength(json, 'utf8') > MAX_PROFILE_BYTES) failClosed('POLICY_CONFLICT', 'request.profile exceeds structural V0 size limit', request);
  const walk = (node, prefix = 'profile') => {
    if (node == null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) walk(node[i], `${prefix}[${i}]`);
      return;
    }
    if (Object.getPrototypeOf(node) !== Object.prototype) failClosed('POLICY_CONFLICT', `${prefix} must contain JSON/plain data only`, request);
    for (const [key, child] of Object.entries(node)) {
      if (SENSITIVE_PROFILE_KEY.test(key)) failClosed('SECURITY_INCIDENT', `${prefix}.${key} is not allowed in structural onboarding`, request);
      walk(child, `${prefix}.${key}`);
    }
  };
  walk(profile);
  return profile;
}

export function validateCompanyScaffoldRequest(raw) {
  const request = assertPlainObject(raw, 'request');
  const normalized = {
    schema_version: request.schema_version ?? '1.0.0',
    request_id: assertNonEmptyString(request.request_id, 'request.request_id'),
    company_id: assertNonEmptyString(request.company_id, 'request.company_id'),
    environment: request.environment ?? EXACT_ENVIRONMENT,
    version: request.version ?? '0.1.0',
    intent: request.intent ?? 'BOOTSTRAP_COMPANY_SCAFFOLDS'
  };

  if (normalized.schema_version !== '1.0.0') failClosed('POLICY_CONFLICT', 'unsupported request schema_version', request);
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(normalized.request_id)) failClosed('POLICY_CONFLICT', 'request_id format rejected', request);
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(normalized.company_id)) failClosed('POLICY_CONFLICT', 'company_id format rejected', request);
  if (normalized.environment !== EXACT_ENVIRONMENT) failClosed('HIGH_RISK', 'multi-company structural bootstrap requires exact PREPROD', request);
  if (typeof normalized.version !== 'string' || !normalized.version.trim()) failClosed('POLICY_CONFLICT', 'version must be a non-empty string', request);
  if (normalized.intent !== 'BOOTSTRAP_COMPANY_SCAFFOLDS') failClosed('POLICY_CONFLICT', 'unsupported onboarding intent', request);

  for (const flag of ['prod_authorized', 'prod_write_authorized', 'trading_access', 'supabase_writes', 'external_code_execution']) {
    if (request[flag] === true) failClosed('HIGH_RISK', `${flag}=true is forbidden`, request);
  }
  if (request.additional_cost_eur != null && Number(request.additional_cost_eur) !== 0) failClosed('MONEY_LIMIT', 'additional_cost_eur must remain zero', request);

  const profile = validateProfile(request.profile, request);
  return Object.freeze({
    ...normalized,
    version: normalized.version.trim(),
    profile_sha256: sha256(canonicalJson(profile)),
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

function logicalStateSummary(company) {
  const states = {};
  const green = [];
  for (const node of Object.values(company.engines)) {
    states[node.state] = (states[node.state] ?? 0) + 1;
    if (node.state === 'GREEN') green.push(node.engine_id);
  }
  return {
    registered_state: company.state,
    states,
    ready_engines: Object.values(company.engines).filter((node) => node.state === 'READY').map((node) => node.engine_id).sort(),
    green_engines: green.sort(),
    all_green: green.length === Object.keys(company.engines).length
  };
}

export function runCompanyScaffoldBootstrap({ requestFile, outDir, factRegistryFile = FACT_REGISTRY }) {
  const request = validateCompanyScaffoldRequest(readJson(requestFile));
  const registry = getPhase4Registry();
  if (registry.engines.length !== 17) failClosed('LOW_CONFIDENCE', 'Phase 4 registry must expose exactly 17 engines', request);

  const runtime = new MultiCompanyBootstrap({ environment: EXACT_ENVIRONMENT, version: request.version });
  const registration = runtime.registerCompany({ company_id: request.company_id, profile: {} });
  if (!registration.accepted) failClosed('LOW_CONFIDENCE', 'fresh structural onboarding registration was not accepted', request);
  const logical = logicalStateSummary(registration.company);
  if (logical.green_engines.length !== 0) failClosed('POLICY_CONFLICT', 'structural scaffold generation cannot mark business engines GREEN', request);

  const targetRoot = path.resolve(outDir);
  fs.rmSync(targetRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(targetRoot, 'engines'), { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-company-bootstrap-'));

  try {
    const engines = [];
    for (const engine of [...registry.engines].sort((a, b) => a.stage - b.stage || a.engine_id.localeCompare(b.engine_id))) {
      const factoryRequest = {
        schema_version: '1.0.0',
        request_id: `${request.request_id}:${engine.engine_id}`,
        company_id: request.company_id,
        engine_id: engine.engine_id,
        environment: SCAFFOLD_ENVIRONMENT,
        version: request.version,
        intent: 'CREATE_SCAFFOLD',
        additional_cost_eur: 0,
        prod_authorized: false,
        prod_write_authorized: false,
        trading_access: false,
        external_code_execution: false
      };
      const factoryRequestFile = path.join(scratch, `${engine.engine_id}.json`);
      fs.writeFileSync(factoryRequestFile, `${JSON.stringify(factoryRequest, null, 2)}\n`, 'utf8');
      const engineOut = path.join(targetRoot, 'engines', engine.engine_id);
      const factResult = runFactoryRequest({ requestFile: factoryRequestFile, outDir: engineOut, registryFile: factRegistryFile });
      if (factResult.generated_file_count !== 18 || factResult.status !== 'FACTORY_SCAFFOLD_GREEN') {
        failClosed('LOW_CONFIDENCE', `${engine.engine_id} FACT-001 structural result is not GREEN`, request);
      }
      engines.push({
        engine_id: engine.engine_id,
        stage: engine.stage,
        depends_on: [...engine.depends_on],
        phase4_mode: engine.mode,
        logical_state_after_registration: registration.company.engines[engine.engine_id].state,
        scaffold_environment: factResult.environment,
        generated_file_count: factResult.generated_file_count,
        fact001_idempotency_key: factResult.idempotency_key,
        bundle_sha256: factResult.bundle_sha256,
        source_registry_sha256: factResult.source_registry_sha256,
        behavioral_evaluation: 'NOT_RUN_STRUCTURAL_ONLY',
        tribunal: 'NOT_RUN_STRUCTURAL_ONLY',
        prod_authorized: false
      });
    }

    const aggregateIdentity = engines.map((engine) => ({
      engine_id: engine.engine_id,
      fact001_idempotency_key: engine.fact001_idempotency_key,
      bundle_sha256: engine.bundle_sha256,
      source_registry_sha256: engine.source_registry_sha256
    }));

    const result = {
      schema_version: '1.0.0',
      state_type: 'CEREBRO_MULTI_COMPANY_STRUCTURAL_BOOTSTRAP_RESULT',
      status: 'STRUCTURAL_BOOTSTRAP_GREEN',
      request_id: request.request_id,
      company_id: request.company_id,
      engine_id: 'COMP-ONB-001',
      environment: request.environment,
      version: request.version,
      scaffold_environment: SCAFFOLD_ENVIRONMENT,
      profile_sha256: request.profile_sha256,
      phase4_engine_count: engines.length,
      structural_files_total: engines.reduce((sum, engine) => sum + engine.generated_file_count, 0),
      aggregate_sha256: sha256(canonicalJson(aggregateIdentity)),
      logical_bootstrap_state: logical,
      engines,
      next_gate: 'COMP_REG_AND_TENANT_PREPROD_EXECUTION_REQUIRED',
      human_required: [],
      additional_cost_eur: 0,
      prod_authorized: false,
      prod_write_authorized: false,
      trading_access: false,
      supabase_writes: false,
      external_code_execution: false
    };

    if (result.phase4_engine_count !== 17 || result.structural_files_total !== 306) {
      failClosed('LOW_CONFIDENCE', 'structural onboarding output count drift', request);
    }
    fs.writeFileSync(path.join(targetRoot, 'company-bootstrap-result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    return result;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--request') args.requestFile = argv[++i];
    else if (argv[i] === '--out') args.outDir = argv[++i];
    else if (argv[i] === '--factory-registry') args.factRegistryFile = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!args.requestFile || !args.outDir) throw new Error('Usage: node company-scaffold-bootstrap.mjs --request <file> --out <dir>');
  return args;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = runCompanyScaffoldBootstrap(parseArgs(process.argv));
    process.stdout.write(`${JSON.stringify({
      status: result.status,
      request_id: result.request_id,
      company_id: result.company_id,
      phase4_engine_count: result.phase4_engine_count,
      structural_files_total: result.structural_files_total,
      aggregate_sha256: result.aggregate_sha256,
      next_gate: result.next_gate,
      additional_cost_eur: 0,
      prod_authorized: false,
      trading_access: false
    })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: 'COMPANY_STRUCTURAL_BOOTSTRAP_REJECTED',
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
