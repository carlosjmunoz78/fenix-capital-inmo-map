#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT = path.resolve(HERE, '..');
const FACTORY_CLI = path.join(CEREBRO_ROOT, 'factory.mjs');
const DEFAULT_REGISTRY = path.join(CEREBRO_ROOT, 'registry', 'engine-registry.seed.json');
const EXACT_ENVIRONMENT = 'SCAFFOLD';
const ALLOWED_INTENTS = new Set(['CREATE_SCAFFOLD', 'REBUILD_SCAFFOLD', 'VERIFY_SCAFFOLD']);
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

function readJson(file, label) {
  return assertPlainObject(JSON.parse(fs.readFileSync(file, 'utf8')), label);
}

function failClosed(code, message, request = {}) {
  const error = new Error(message);
  error.code = code;
  error.human_required = HUMAN_REQUIRED.has(code) ? code : null;
  error.request_id = typeof request.request_id === 'string' ? request.request_id : null;
  throw error;
}

export function validateFactoryRequest(raw, registryRaw) {
  const request = assertPlainObject(raw, 'request');
  const registry = assertPlainObject(registryRaw, 'registry');
  if (!Array.isArray(registry.engine_ids)) throw new Error('registry.engine_ids must be an array');

  const normalized = {
    schema_version: request.schema_version ?? '1.0.0',
    request_id: assertNonEmptyString(request.request_id, 'request.request_id'),
    company_id: assertNonEmptyString(request.company_id, 'request.company_id'),
    engine_id: assertNonEmptyString(request.engine_id, 'request.engine_id'),
    environment: request.environment ?? EXACT_ENVIRONMENT,
    version: request.version ?? registry.defaults?.version,
    intent: request.intent ?? 'CREATE_SCAFFOLD'
  };

  if (normalized.schema_version !== '1.0.0') failClosed('POLICY_CONFLICT', 'unsupported request schema_version', request);
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(normalized.request_id)) failClosed('POLICY_CONFLICT', 'request_id format rejected', request);
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(normalized.company_id)) failClosed('POLICY_CONFLICT', 'company_id format rejected', request);
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized.engine_id)) failClosed('POLICY_CONFLICT', 'engine_id format rejected', request);
  if (!registry.engine_ids.includes(normalized.engine_id)) failClosed('POLICY_CONFLICT', 'engine_id is not present in canonical Engine Registry seed', request);
  if (normalized.environment !== EXACT_ENVIRONMENT) failClosed('HIGH_RISK', 'FACT-001 V0 accepts SCAFFOLD environment only', request);
  if (typeof normalized.version !== 'string' || !normalized.version.trim()) failClosed('POLICY_CONFLICT', 'request.version must be a non-empty string', request);
  if (!ALLOWED_INTENTS.has(normalized.intent)) failClosed('POLICY_CONFLICT', 'request.intent is not allowed', request);

  for (const flag of ['prod_authorized', 'prod_write_authorized', 'trading_access', 'external_code_execution']) {
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
    external_code_execution: false
  });
}

function listFiles(root) {
  const files = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) files.push(path.relative(root, full).replaceAll(path.sep, '/'));
    }
  };
  walk(root);
  return files;
}

function bundleDigest(root, files) {
  const hash = crypto.createHash('sha256');
  for (const rel of files) {
    hash.update(rel, 'utf8');
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(root, rel)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function runFactoryRequest({ requestFile, outDir, registryFile = DEFAULT_REGISTRY }) {
  const rawRequest = readJson(requestFile, 'request');
  const rawRegistry = readJson(registryFile, 'registry');
  const request = validateFactoryRequest(rawRequest, rawRegistry);

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-fact001-'));
  try {
    execFileSync(process.execPath, [FACTORY_CLI, 'validate', '--registry', registryFile], { stdio: 'pipe' });
    execFileSync(process.execPath, [FACTORY_CLI, 'generate', '--registry', registryFile, '--out', scratch], { stdio: 'pipe' });

    const sourceEngineDir = path.join(scratch, 'engines', request.engine_id);
    if (!fs.existsSync(sourceEngineDir)) failClosed('LOW_CONFIDENCE', 'generated engine scaffold missing after FACT-001 execution', request);

    const targetDir = path.resolve(outDir);
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });
    fs.cpSync(sourceEngineDir, targetDir, { recursive: true, force: false });

    const files = listFiles(targetDir);
    if (files.length !== 18) failClosed('LOW_CONFIDENCE', `expected 18 scaffold files, got ${files.length}`, request);

    const registryBytes = fs.readFileSync(registryFile);
    const result = {
      schema_version: '1.0.0',
      state_type: 'CEREBRO_FACT001_AUTOMATIC_SCAFFOLD_RESULT',
      status: 'FACTORY_SCAFFOLD_GREEN',
      request_id: request.request_id,
      idempotency_key: `fact001:${sha256(canonicalJson(request) + ':' + sha256(registryBytes))}`,
      company_id: request.company_id,
      engine_id: request.engine_id,
      environment: request.environment,
      version: request.version,
      intent: request.intent,
      generated_files: files,
      generated_file_count: files.length,
      bundle_sha256: bundleDigest(targetDir, files),
      source_registry_sha256: sha256(registryBytes),
      next_gate: 'PREPROD_CONTRACT_TESTS_AND_EVALUATION_REQUIRED',
      human_required: [],
      additional_cost_eur: 0,
      prod_authorized: false,
      prod_write_authorized: false,
      trading_access: false,
      external_code_execution: false
    };
    fs.writeFileSync(path.join(targetDir, 'fact001-result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
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
    else if (argv[i] === '--registry') args.registryFile = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!args.requestFile || !args.outDir) throw new Error('Usage: node fact001-request-runner.mjs --request <file> --out <dir> [--registry <file>]');
  return args;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = runFactoryRequest(parseArgs(process.argv));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: 'FACTORY_REQUEST_REJECTED',
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
