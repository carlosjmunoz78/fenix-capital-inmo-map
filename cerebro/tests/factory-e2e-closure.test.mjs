import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const cli = path.join(root, 'factory.mjs');
const registryFile = path.join(root, 'registry', 'engine-registry.seed.json');
const REQUIRED_CONTEXT = ['company_id', 'engine_id', 'environment', 'version'];
const HUMAN_REQUIRED = [
  'LEGAL_REQUIRED',
  'SIGNATURE_REQUIRED',
  'LOW_CONFIDENCE',
  'HIGH_RISK',
  'POLICY_CONFLICT',
  'SECURITY_INCIDENT',
  'MONEY_LIMIT',
  'CUSTOMER_HUMAN_REQUEST'
];
const JSON_FILES = [
  'manifest.json',
  'config.json',
  'contracts/data-contract.json',
  'permissions.json',
  'policy.json',
  'events.json',
  'jobs.json',
  'api/handlers.json',
  'tests/contract.test.json',
  'evaluation.json',
  'tribunal.json',
  'observability.json',
  'finops.json',
  'backup.json',
  'rollback.json',
  'rebuild.json',
  'training-hooks.json'
];

function generate() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-fact001-e2e-'));
  execFileSync(process.execPath, [cli, 'generate', '--registry', registryFile, '--out', out], { encoding: 'utf8' });
  return out;
}

function readJson(base, rel) {
  return JSON.parse(fs.readFileSync(path.join(base, rel), 'utf8'));
}

function assertContext(doc, engine) {
  assert.equal(doc.company_id, null);
  assert.equal(doc.engine_id, engine.engine_id);
  assert.equal(doc.environment, engine.environment);
  assert.equal(doc.version, engine.version);
  assert.equal(doc.generated_by, 'FACT-001');
  assert.equal(doc.schema_version, '1.0.0');
}

test('FACT-001 end-to-end scaffold contract is complete and safe for all 177 canonical engines', () => {
  const out = generate();
  const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
  const index = readJson(out, 'skeleton-index.json');

  assert.equal(index.generated_by, 'FACT-001');
  assert.equal(index.engine_count, 177);
  assert.equal(index.template_file_count, 18);
  assert.equal(index.engines.length, 177);

  for (const engineId of registry.engine_ids) {
    const engine = {
      engine_id: engineId,
      ...registry.defaults,
      ...(registry.overrides?.[engineId] ?? {})
    };
    const base = path.join(out, 'engines', engineId);
    const indexed = index.engines.find(item => item.engine_id === engineId);
    assert.ok(indexed, `${engineId}: missing skeleton-index entry`);
    assert.equal(indexed.files, 18, `${engineId}: incomplete scaffold`);
    assert.match(indexed.sha256, /^[a-f0-9]{64}$/, `${engineId}: invalid digest`);

    for (const rel of JSON_FILES) {
      assert.ok(fs.existsSync(path.join(base, rel)), `${engineId}: missing ${rel}`);
      assertContext(readJson(base, rel), engine);
    }
    assert.ok(fs.existsSync(path.join(base, 'README.md')), `${engineId}: missing README.md`);

    const manifest = readJson(base, 'manifest.json');
    assert.equal(manifest.lifecycle, 'SCAFFOLD');
    assert.equal(manifest.autonomous_prod, false);
    assert.equal(manifest.company_scope, engine.company_scope);
    assert.equal(manifest.evidence_state, engine.evidence_state);

    const config = readJson(base, 'config.json');
    assert.equal(config.enabled, false);
    assert.equal(config.deterministic_first, true);
    assert.equal(config.zero_new_cost_default, true);

    const contract = readJson(base, 'contracts/data-contract.json');
    assert.deepEqual(contract.invariants, REQUIRED_CONTEXT);
    assert.deepEqual(contract.inputs, []);
    assert.deepEqual(contract.outputs, []);

    const permissions = readJson(base, 'permissions.json');
    assert.equal(permissions.default, 'deny');
    assert.deepEqual(permissions.grants, []);
    assert.equal(permissions.cross_company_access, 'deny');

    const policy = readJson(base, 'policy.json');
    assert.deepEqual(policy.human_required_reasons, HUMAN_REQUIRED);

    const events = readJson(base, 'events.json');
    assert.deepEqual(events.consumes, []);
    assert.deepEqual(events.produces, []);

    const jobs = readJson(base, 'jobs.json');
    assert.deepEqual(jobs.jobs, []);
    assert.equal(jobs.shared_runtime, true);

    const api = readJson(base, 'api/handlers.json');
    assert.deepEqual(api.handlers, []);
    assert.equal(api.gateway_only, true);

    const contractTest = readJson(base, 'tests/contract.test.json');
    for (const gate of ['context_fields', 'deny_by_default', 'idempotence', 'rollback_declared', 'rebuild_declared']) {
      assert.ok(contractTest.required_checks.includes(gate), `${engineId}: missing required check ${gate}`);
    }

    const evaluation = readJson(base, 'evaluation.json');
    assert.equal(evaluation.status, 'NOT_EVALUATED');
    assert.deepEqual(evaluation.criteria, []);

    const tribunal = readJson(base, 'tribunal.json');
    assert.equal(tribunal.status, 'NOT_RUN');
    assert.equal(tribunal.required_for_prod, true);

    const observability = readJson(base, 'observability.json');
    assert.equal(observability.logs, true);
    assert.equal(observability.audit, true);
    assert.deepEqual(observability.metrics, []);

    const finops = readJson(base, 'finops.json');
    assert.equal(finops.additional_cost_eur, 0);
    assert.equal(finops.budget_gate, true);

    const backup = readJson(base, 'backup.json');
    assert.equal(backup.strategy, 'TO_DEFINE_BEFORE_PROD');
    assert.equal(backup.tested, false);

    const rollback = readJson(base, 'rollback.json');
    assert.equal(rollback.strategy, 'VERSION_REVERT');
    assert.equal(rollback.tested, false);

    const rebuild = readJson(base, 'rebuild.json');
    assert.equal(rebuild.reproducible_from_registry_and_factory, true);
    assert.equal(rebuild.tested, true);

    const training = readJson(base, 'training-hooks.json');
    assert.equal(training.enabled, false);
    assert.equal(training.prod_promotion_forbidden, true);

    const readme = fs.readFileSync(path.join(base, 'README.md'), 'utf8');
    assert.match(readme, new RegExp(engineId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(readme, /structural scaffold, not evidence of operational autonomy/i);
  }
});

test('FACT-001 full 177-engine output is reproducible across clean directories', () => {
  const first = generate();
  const second = generate();
  const firstIndex = fs.readFileSync(path.join(first, 'skeleton-index.json'), 'utf8');
  const secondIndex = fs.readFileSync(path.join(second, 'skeleton-index.json'), 'utf8');
  assert.equal(secondIndex, firstIndex);
});
