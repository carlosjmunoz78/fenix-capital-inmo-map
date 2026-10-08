import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateCompanyScaffoldRequest, runCompanyScaffoldBootstrap } from '../multicompany/company-scaffold-bootstrap.mjs';

function request(overrides = {}) {
  return {
    schema_version: '1.0.0',
    request_id: 'company-bootstrap-selfcheck-v0',
    company_id: 'cerebro-bootstrap-selfcheck',
    environment: 'PREPROD',
    version: '0.1.0',
    intent: 'BOOTSTRAP_COMPANY_SCAFFOLDS',
    profile: { company_name: 'Synthetic CEREBRO Bootstrap Selfcheck', website_url: 'https://example.invalid' },
    additional_cost_eur: 0,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    supabase_writes: false,
    external_code_execution: false,
    ...overrides
  };
}

function writeRequest(data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'company-bootstrap-test-'));
  const file = path.join(dir, 'request.json');
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  return { dir, file };
}

test('company structural request is exact PREPROD zero-cost and non-PROD', () => {
  const normalized = validateCompanyScaffoldRequest(request());
  assert.equal(normalized.environment, 'PREPROD');
  assert.equal(normalized.company_id, 'cerebro-bootstrap-selfcheck');
  assert.equal(normalized.additional_cost_eur, 0);
  assert.equal(normalized.prod_authorized, false);
  assert.equal(normalized.prod_write_authorized, false);
  assert.equal(normalized.trading_access, false);
  assert.equal(normalized.supabase_writes, false);
  assert.equal(normalized.external_code_execution, false);
  assert.match(normalized.profile_sha256, /^[a-f0-9]{64}$/);
});

test('company bootstrap generates all 17 Phase 4 canonical scaffolds without marking business engines GREEN', () => {
  const { dir, file } = writeRequest(request());
  const out = path.join(dir, 'out');
  const result = runCompanyScaffoldBootstrap({ requestFile: file, outDir: out });
  assert.equal(result.status, 'STRUCTURAL_BOOTSTRAP_GREEN');
  assert.equal(result.engine_id, 'COMP-ONB-001');
  assert.equal(result.environment, 'PREPROD');
  assert.equal(result.scaffold_environment, 'SCAFFOLD');
  assert.equal(result.phase4_engine_count, 17);
  assert.equal(result.structural_files_total, 306);
  assert.equal(result.engines.length, 17);
  assert.equal(new Set(result.engines.map((engine) => engine.engine_id)).size, 17);
  assert.deepEqual(result.logical_bootstrap_state.green_engines, []);
  assert.equal(result.logical_bootstrap_state.all_green, false);
  assert.ok(result.logical_bootstrap_state.ready_engines.includes('COMP-REG-001'));
  assert.equal(result.next_gate, 'COMP_REG_AND_TENANT_PREPROD_EXECUTION_REQUIRED');
  assert.equal(result.prod_authorized, false);
  assert.equal(result.prod_write_authorized, false);
  assert.equal(result.trading_access, false);
  assert.equal(result.supabase_writes, false);
  assert.equal(result.additional_cost_eur, 0);
  for (const engine of result.engines) {
    assert.equal(engine.scaffold_environment, 'SCAFFOLD');
    assert.equal(engine.generated_file_count, 18);
    assert.equal(engine.behavioral_evaluation, 'NOT_RUN_STRUCTURAL_ONLY');
    assert.equal(engine.tribunal, 'NOT_RUN_STRUCTURAL_ONLY');
    assert.equal(engine.prod_authorized, false);
    assert.ok(fs.existsSync(path.join(out, 'engines', engine.engine_id, 'manifest.json')));
    assert.ok(fs.existsSync(path.join(out, 'engines', engine.engine_id, 'fact001-result.json')));
  }
});

test('same company request is deterministic across clean rebuilds', () => {
  const { dir, file } = writeRequest(request());
  const first = runCompanyScaffoldBootstrap({ requestFile: file, outDir: path.join(dir, 'one') });
  const second = runCompanyScaffoldBootstrap({ requestFile: file, outDir: path.join(dir, 'two') });
  assert.equal(first.aggregate_sha256, second.aggregate_sha256);
  assert.equal(first.profile_sha256, second.profile_sha256);
  assert.deepEqual(
    first.engines.map((engine) => [engine.engine_id, engine.fact001_idempotency_key, engine.bundle_sha256]),
    second.engines.map((engine) => [engine.engine_id, engine.fact001_idempotency_key, engine.bundle_sha256])
  );
});

test('tenant identity changes FACT request identity while canonical scaffold bytes stay reusable', () => {
  const one = writeRequest(request({ company_id: 'tenant-alpha', request_id: 'bootstrap-tenant-alpha' }));
  const two = writeRequest(request({ company_id: 'tenant-beta', request_id: 'bootstrap-tenant-beta' }));
  const a = runCompanyScaffoldBootstrap({ requestFile: one.file, outDir: path.join(one.dir, 'out') });
  const b = runCompanyScaffoldBootstrap({ requestFile: two.file, outDir: path.join(two.dir, 'out') });
  assert.notEqual(a.aggregate_sha256, b.aggregate_sha256);
  for (let i = 0; i < a.engines.length; i += 1) {
    assert.equal(a.engines[i].engine_id, b.engines[i].engine_id);
    assert.notEqual(a.engines[i].fact001_idempotency_key, b.engines[i].fact001_idempotency_key);
    assert.equal(a.engines[i].bundle_sha256, b.engines[i].bundle_sha256);
  }
});

test('PROD, authority expansion and non-zero cost fail closed canonically', () => {
  assert.throws(() => validateCompanyScaffoldRequest(request({ environment: 'PROD' })), (error) => error.code === 'HIGH_RISK' && error.human_required === 'HIGH_RISK');
  for (const flag of ['prod_authorized', 'prod_write_authorized', 'trading_access', 'supabase_writes', 'external_code_execution']) {
    assert.throws(() => validateCompanyScaffoldRequest(request({ [flag]: true })), (error) => error.code === 'HIGH_RISK' && error.human_required === 'HIGH_RISK');
  }
  assert.throws(() => validateCompanyScaffoldRequest(request({ additional_cost_eur: 1 })), (error) => error.code === 'MONEY_LIMIT' && error.human_required === 'MONEY_LIMIT');
});

test('structural profile refuses credential-like fields instead of persisting secrets', () => {
  for (const key of ['password', 'api_key', 'access_token', 'privateKey', 'iban']) {
    assert.throws(() => validateCompanyScaffoldRequest(request({ profile: { [key]: 'do-not-store' } })), (error) => error.code === 'SECURITY_INCIDENT' && error.human_required === 'SECURITY_INCIDENT');
  }
});
