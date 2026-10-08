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

test('company structural request is exact PREPROD zero-cost and tenant scoped', () => {
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
  const other = validateCompanyScaffoldRequest(request({ company_id: 'tenant-beta', request_id: 'company-bootstrap-tenant-beta' }));
  assert.notEqual(normalized.company_id, other.company_id);
  assert.equal(normalized.profile_sha256, other.profile_sha256);
});

test('company bootstrap generates all 17 canonical scaffolds, preserves real logical state and rebuilds deterministically', () => {
  const { dir, file } = writeRequest(request());
  const firstOut = path.join(dir, 'one');
  const secondOut = path.join(dir, 'two');
  const first = runCompanyScaffoldBootstrap({ requestFile: file, outDir: firstOut });

  assert.equal(first.status, 'STRUCTURAL_BOOTSTRAP_GREEN');
  assert.equal(first.engine_id, 'COMP-ONB-001');
  assert.equal(first.environment, 'PREPROD');
  assert.equal(first.scaffold_environment, 'SCAFFOLD');
  assert.equal(first.phase4_engine_count, 17);
  assert.equal(first.structural_files_total, 306);
  assert.equal(first.engines.length, 17);
  assert.equal(new Set(first.engines.map((engine) => engine.engine_id)).size, 17);
  assert.deepEqual(first.logical_bootstrap_state.green_engines, []);
  assert.equal(first.logical_bootstrap_state.all_green, false);
  assert.ok(first.logical_bootstrap_state.ready_engines.includes('COMP-REG-001'));
  assert.equal(first.next_gate, 'COMP_REG_AND_TENANT_PREPROD_EXECUTION_REQUIRED');
  assert.equal(first.prod_authorized, false);
  assert.equal(first.prod_write_authorized, false);
  assert.equal(first.trading_access, false);
  assert.equal(first.supabase_writes, false);
  assert.equal(first.additional_cost_eur, 0);
  for (const engine of first.engines) {
    assert.equal(engine.scaffold_environment, 'SCAFFOLD');
    assert.equal(engine.generated_file_count, 18);
    assert.equal(engine.behavioral_evaluation, 'NOT_RUN_STRUCTURAL_ONLY');
    assert.equal(engine.tribunal, 'NOT_RUN_STRUCTURAL_ONLY');
    assert.equal(engine.prod_authorized, false);
    assert.ok(fs.existsSync(path.join(firstOut, 'engines', engine.engine_id, 'manifest.json')));
    assert.ok(fs.existsSync(path.join(firstOut, 'engines', engine.engine_id, 'fact001-result.json')));
  }

  const second = runCompanyScaffoldBootstrap({ requestFile: file, outDir: secondOut });
  assert.equal(first.aggregate_sha256, second.aggregate_sha256);
  assert.equal(first.profile_sha256, second.profile_sha256);
  assert.deepEqual(
    first.engines.map((engine) => [engine.engine_id, engine.fact001_idempotency_key, engine.bundle_sha256]),
    second.engines.map((engine) => [engine.engine_id, engine.fact001_idempotency_key, engine.bundle_sha256])
  );
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
