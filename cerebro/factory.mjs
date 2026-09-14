#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CANONICAL_COUNT = 177;
const REQUIRED_CONTEXT = ['company_id', 'engine_id', 'environment', 'version'];
const HUMAN_REQUIRED = ['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'];
const TEMPLATE_FILES = [
  'manifest.json','config.json','contracts/data-contract.json','permissions.json','policy.json',
  'events.json','jobs.json','api/handlers.json','tests/contract.test.json','evaluation.json',
  'tribunal.json','observability.json','finops.json','backup.json','rollback.json','rebuild.json',
  'training-hooks.json','README.md'
];

function parseArgs(argv) {
  const args = { command: argv[2], registry: new URL('./registry/engine-registry.seed.json', import.meta.url).pathname, out: './.cerebro-generated' };
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === '--registry') args.registry = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

function plainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label} must be a plain object`);
  return value;
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function validateSafeSeed(raw) {
  plainObject(raw, 'registry');
  if (!Array.isArray(raw.engine_ids)) throw new Error('registry.engine_ids must be an array');
  if (raw.engine_ids.length !== CANONICAL_COUNT) throw new Error(`registry.engine_ids must contain exactly ${CANONICAL_COUNT} ids`);
  if (raw.count !== CANONICAL_COUNT) throw new Error(`registry.count must equal ${CANONICAL_COUNT}`);
  if (new Set(raw.engine_ids).size !== CANONICAL_COUNT) throw new Error('registry.engine_ids must be unique');
  for (const [index,id] of raw.engine_ids.entries()) {
    nonEmptyString(id, `registry.engine_ids[${index}]`);
    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id)) throw new Error(`invalid engine_id format: ${id}`);
  }
  const defaults = plainObject(raw.defaults, 'registry.defaults');
  nonEmptyString(defaults.version, 'registry.defaults.version');
  if (defaults.environment !== 'SCAFFOLD') throw new Error('FACT-001 V0 registry environment must be SCAFFOLD');
  if (!['GLOBAL_OR_SCOPED','MULTI_COMPANY','GLOBAL'].includes(defaults.company_scope)) throw new Error('invalid registry.defaults.company_scope');
  if (defaults.evidence_state !== 'UNKNOWN_REQUIRES_AUDIT') throw new Error('registry.defaults.evidence_state must be UNKNOWN_REQUIRES_AUDIT');
  if (defaults.source_status !== 'UNKNOWN_REQUIRES_AUDIT') throw new Error('registry.defaults.source_status must be UNKNOWN_REQUIRES_AUDIT');
  const overrides = raw.overrides == null ? {} : plainObject(raw.overrides, 'registry.overrides');
  const ids = new Set(raw.engine_ids);
  for (const [engineId, override] of Object.entries(overrides)) {
    if (!ids.has(engineId)) throw new Error(`override for noncanonical engine_id: ${engineId}`);
    plainObject(override, `registry.overrides.${engineId}`);
    if ('environment' in override && override.environment !== 'SCAFFOLD') throw new Error(`${engineId}: FACT-001 V0 registry environment must be SCAFFOLD`);
    for (const unsafe of ['autonomous_prod','prod_promotion','prod_writes','enabled']) if (override[unsafe] === true) throw new Error(`${engineId}: unsafe override ${unsafe}=true`);
  }
  return raw;
}

function readRegistry(file) {
  const raw = validateSafeSeed(JSON.parse(fs.readFileSync(file, 'utf8')));
  const defaults = raw.defaults;
  return {
    ...raw,
    engines: raw.engine_ids.map(engine_id => ({
      engine_id,
      name: engine_id,
      ...defaults,
      ...(raw.overrides?.[engine_id] ?? {})
    }))
  };
}

function validateRegistry(registry) {
  const errors = [];
  const ids = new Set();
  for (const engine of registry.engines) {
    if (!engine.engine_id) errors.push('engine without engine_id');
    if (ids.has(engine.engine_id)) errors.push(`duplicate engine_id: ${engine.engine_id}`);
    ids.add(engine.engine_id);
    for (const key of ['engine_id','name','version','environment','company_scope','evidence_state']) {
      if (engine[key] == null || engine[key] === '') errors.push(`${engine.engine_id || '<unknown>'}: missing ${key}`);
    }
    if (engine.environment !== 'SCAFFOLD') errors.push(`${engine.engine_id}: FACT-001 V0 registry environment must be SCAFFOLD`);
    if (engine.evidence_state !== 'UNKNOWN_REQUIRES_AUDIT') errors.push(`${engine.engine_id}: evidence_state must remain UNKNOWN_REQUIRES_AUDIT in seed`);
    for (const unsafe of ['autonomous_prod','prod_promotion','prod_writes','enabled']) if (engine[unsafe] === true) errors.push(`${engine.engine_id}: unsafe ${unsafe}=true`);
  }
  if (registry.count !== registry.engines.length) errors.push(`count mismatch: declared ${registry.count}, actual ${registry.engines.length}`);
  if (registry.engines.length !== CANONICAL_COUNT) errors.push(`canonical count mismatch: ${registry.engines.length}`);
  if (ids.size !== CANONICAL_COUNT) errors.push(`canonical unique id mismatch: ${ids.size}`);
  if (errors.length) throw new Error(errors.join('\n'));
  return { engines: registry.engines.length, unique_ids: ids.size, canonical_count: CANONICAL_COUNT, safe_scaffold: true };
}

function context(engine) {
  return { company_id: null, engine_id: engine.engine_id, environment: engine.environment, version: engine.version };
}

function json(value) { return JSON.stringify(value, null, 2) + '\n'; }

function filesFor(engine) {
  const ctx = context(engine);
  const base = { ...ctx, generated_by: 'FACT-001', schema_version: '1.0.0' };
  return {
    'manifest.json': json({ ...base, name: engine.name, layer: engine.layer ?? null, company_scope: engine.company_scope, evidence_state: engine.evidence_state, source_status: engine.source_status ?? 'UNKNOWN_REQUIRES_AUDIT', lifecycle: 'SCAFFOLD', autonomous_prod: false }),
    'config.json': json({ ...base, enabled: false, deterministic_first: true, zero_new_cost_default: true }),
    'contracts/data-contract.json': json({ ...base, inputs: [], outputs: [], invariants: REQUIRED_CONTEXT }),
    'permissions.json': json({ ...base, default: 'deny', grants: [], cross_company_access: 'deny' }),
    'policy.json': json({ ...base, human_required_reasons: HUMAN_REQUIRED }),
    'events.json': json({ ...base, consumes: [], produces: [] }),
    'jobs.json': json({ ...base, jobs: [], shared_runtime: true }),
    'api/handlers.json': json({ ...base, handlers: [], gateway_only: true }),
    'tests/contract.test.json': json({ ...base, required_checks: ['context_fields','deny_by_default','idempotence','rollback_declared','rebuild_declared'] }),
    'evaluation.json': json({ ...base, status: 'NOT_EVALUATED', criteria: [] }),
    'tribunal.json': json({ ...base, status: 'NOT_RUN', required_for_prod: true }),
    'observability.json': json({ ...base, logs: true, metrics: [], audit: true }),
    'finops.json': json({ ...base, cost_target: engine.cost_target ?? '0 € adicional por defecto', additional_cost_eur: 0, budget_gate: true }),
    'backup.json': json({ ...base, strategy: 'TO_DEFINE_BEFORE_PROD', tested: false }),
    'rollback.json': json({ ...base, strategy: 'VERSION_REVERT', tested: false }),
    'rebuild.json': json({ ...base, reproducible_from_registry_and_factory: true, tested: true }),
    'training-hooks.json': json({ ...base, enabled: false, prod_promotion_forbidden: true }),
    'README.md': `# ${engine.engine_id} · ${engine.name}\n\nGenerated by FACT-001. Evidence state: **${engine.evidence_state}**. This is a structural scaffold, not evidence of operational autonomy.\n`
  };
}

function writeGenerated(registry, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const index = [];
  for (const engine of registry.engines) {
    const root = path.join(outDir, 'engines', engine.engine_id);
    const generated = filesFor(engine);
    for (const [rel, content] of Object.entries(generated)) {
      const file = path.join(root, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, 'utf8');
    }
    const digest = crypto.createHash('sha256').update(Object.keys(generated).sort().map(k => `${k}\n${generated[k]}`).join('\n')).digest('hex');
    index.push({ engine_id: engine.engine_id, version: engine.version, files: Object.keys(generated).length, sha256: digest });
  }
  fs.writeFileSync(path.join(outDir, 'skeleton-index.json'), json({ generated_by: 'FACT-001', engine_count: index.length, template_file_count: TEMPLATE_FILES.length, engines: index }));
  return index;
}

const args = parseArgs(process.argv);
const registry = readRegistry(args.registry);
if (args.command === 'validate') {
  console.log(JSON.stringify(validateRegistry(registry)));
} else if (args.command === 'generate') {
  validateRegistry(registry);
  const index = writeGenerated(registry, args.out);
  console.log(JSON.stringify({ generated: index.length, out: path.resolve(args.out) }));
} else {
  throw new Error('Usage: node factory.mjs <validate|generate> [--registry file] [--out dir]');
}
