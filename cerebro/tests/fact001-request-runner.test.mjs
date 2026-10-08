import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateFactoryRequest, runFactoryRequest } from '../runtime/fact001-request-runner.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const registryFile = path.join(root, 'registry', 'engine-registry.seed.json');
const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));

function request(overrides = {}) {
  return {
    schema_version: '1.0.0',
    request_id: 'fact001-test-request-v0',
    company_id: 'fenix',
    engine_id: 'FACT-001',
    environment: 'SCAFFOLD',
    version: '0.1.0',
    intent: 'CREATE_SCAFFOLD',
    additional_cost_eur: 0,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    external_code_execution: false,
    ...overrides
  };
}

function writeRequest(data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fact001-request-'));
  const file = path.join(dir, 'request.json');
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  return { dir, file };
}

test('valid canonical request remains SCAFFOLD-only zero-cost and non-PROD', () => {
  const normalized = validateFactoryRequest(request(), registry);
  assert.equal(normalized.engine_id, 'FACT-001');
  assert.equal(normalized.environment, 'SCAFFOLD');
  assert.equal(normalized.additional_cost_eur, 0);
  assert.equal(normalized.prod_authorized, false);
  assert.equal(normalized.prod_write_authorized, false);
  assert.equal(normalized.trading_access, false);
  assert.equal(normalized.external_code_execution, false);
});

test('automatic request generates exactly one canonical 18-file scaffold with deterministic evidence', () => {
  const { dir, file } = writeRequest(request());
  const outA = path.join(dir, 'out-a');
  const outB = path.join(dir, 'out-b');
  const first = runFactoryRequest({ requestFile: file, outDir: outA, registryFile });
  const second = runFactoryRequest({ requestFile: file, outDir: outB, registryFile });

  assert.equal(first.status, 'FACTORY_SCAFFOLD_GREEN');
  assert.equal(first.generated_file_count, 18);
  assert.equal(first.bundle_sha256, second.bundle_sha256);
  assert.equal(first.idempotency_key, second.idempotency_key);
  assert.equal(first.next_gate, 'PREPROD_CONTRACT_TESTS_AND_EVALUATION_REQUIRED');
  assert.deepEqual(first.human_required, []);
  assert.equal(first.prod_authorized, false);
  assert.equal(first.prod_write_authorized, false);
  assert.equal(first.trading_access, false);
  assert.ok(fs.existsSync(path.join(outA, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(outA, 'rollback.json')));
  assert.ok(fs.existsSync(path.join(outA, 'rebuild.json')));
  assert.ok(fs.existsSync(path.join(outA, 'fact001-result.json')));
});

test('unknown engine fails closed to canonical POLICY_CONFLICT', () => {
  assert.throws(() => validateFactoryRequest(request({ engine_id: 'NEW-999' }), registry), (error) => {
    assert.equal(error.code, 'POLICY_CONFLICT');
    assert.equal(error.human_required, 'POLICY_CONFLICT');
    return true;
  });
});

test('authority expansion fails closed to HIGH_RISK', () => {
  for (const flag of ['prod_authorized', 'prod_write_authorized', 'trading_access', 'external_code_execution']) {
    assert.throws(() => validateFactoryRequest(request({ [flag]: true }), registry), (error) => {
      assert.equal(error.code, 'HIGH_RISK');
      assert.equal(error.human_required, 'HIGH_RISK');
      return true;
    });
  }
});

test('non-zero incremental cost fails closed to MONEY_LIMIT', () => {
  assert.throws(() => validateFactoryRequest(request({ additional_cost_eur: 0.01 }), registry), (error) => {
    assert.equal(error.code, 'MONEY_LIMIT');
    assert.equal(error.human_required, 'MONEY_LIMIT');
    return true;
  });
});

test('request cannot jump directly into PREPROD or PROD', () => {
  for (const environment of ['PREPROD', 'PROD']) {
    assert.throws(() => validateFactoryRequest(request({ environment }), registry), (error) => {
      assert.equal(error.code, 'HIGH_RISK');
      return true;
    });
  }
});
