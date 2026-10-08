import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateCompanyRegTenantRequest, runCompanyRegTenantPreprod } from '../multicompany/company-reg-tenant-preprod.mjs';

function request(overrides = {}) {
  return {
    schema_version: '1.0.0',
    request_id: 'company-reg-tenant-selfcheck-v0',
    company_id: 'cerebro-reg-tenant-selfcheck',
    environment: 'PREPROD',
    version: '0.1.0',
    intent: 'EXECUTE_COMP_REG_TENANT_PREPROD',
    additional_cost_eur: 0,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    supabase_writes: false,
    external_code_execution: false,
    ...overrides
  };
}

function writeRequest(value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-comp-reg-tenant-test-'));
  const file = path.join(dir, 'request.json');
  fs.writeFileSync(file, JSON.stringify(value), 'utf8');
  return { dir, file };
}

test('request contract is exact PREPROD and zero-authority', () => {
  const normalized = validateCompanyRegTenantRequest(request());
  assert.equal(normalized.environment, 'PREPROD');
  assert.equal(normalized.additional_cost_eur, 0);
  assert.equal(normalized.prod_authorized, false);
  assert.equal(normalized.prod_write_authorized, false);
  assert.equal(normalized.trading_access, false);
  assert.equal(normalized.supabase_writes, false);
  assert.equal(normalized.external_code_execution, false);
});

test('COMP-REG and TENANT execute through existing Phase 4 state machine without unlocking business chain', () => {
  const { dir, file } = writeRequest(request());
  const out = path.join(dir, 'result.json');
  const result = runCompanyRegTenantPreprod({ requestFile: file, outFile: out });

  assert.equal(result.status, 'COMP_REG_TENANT_PREPROD_GREEN');
  assert.equal(result.environment, 'PREPROD');
  assert.deepEqual(result.engine_ids, ['COMP-REG-001', 'TENANT-001']);
  assert.deepEqual(result.green_engines, ['COMP-REG-001', 'TENANT-001']);
  assert.ok(result.next_ready.includes('COMP-ONB-001'));
  assert.equal(result.scan_state, 'BLOCKED');
  assert.equal(result.activation_state, 'BLOCKED');
  assert.equal(result.tenant_isolation_verified, true);
  assert.deepEqual(result.control_green_engines, []);
  assert.deepEqual(result.promotion, { allowed: false, reason: 'PHASE4_NOT_ALL_GREEN', all_green: false });
  assert.equal(result.durability_state, 'IN_MEMORY_REFERENCE_ONLY');
  assert.equal(result.next_gate, 'DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED');
  assert.match(result.execution_sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.additional_cost_eur, 0);
  assert.equal(result.prod_authorized, false);
  assert.equal(result.prod_write_authorized, false);
  assert.equal(result.trading_access, false);
  assert.equal(result.supabase_writes, false);
  assert.equal(result.external_code_execution, false);
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), result);
});

test('clean reruns are deterministic and tenant identity changes execution identity', () => {
  const one = writeRequest(request());
  const first = runCompanyRegTenantPreprod({ requestFile: one.file });
  const second = runCompanyRegTenantPreprod({ requestFile: one.file });
  assert.equal(first.execution_sha256, second.execution_sha256);
  assert.deepEqual(first.green_engines, second.green_engines);
  assert.deepEqual(first.next_ready, second.next_ready);

  const two = writeRequest(request({ request_id: 'tenant-other-selfcheck', company_id: 'tenant-other' }));
  const other = runCompanyRegTenantPreprod({ requestFile: two.file });
  assert.notEqual(first.execution_sha256, other.execution_sha256);
  assert.notEqual(first.control_company_id, other.control_company_id);
});

test('PROD, authority expansion and cost fail closed with canonical HUMAN_REQUIRED', () => {
  assert.throws(() => validateCompanyRegTenantRequest(request({ environment: 'PROD' })), (error) => error.code === 'HIGH_RISK' && error.human_required === 'HIGH_RISK');
  for (const flag of ['prod_authorized', 'prod_write_authorized', 'trading_access', 'supabase_writes', 'external_code_execution']) {
    assert.throws(() => validateCompanyRegTenantRequest(request({ [flag]: true })), (error) => error.code === 'HIGH_RISK' && error.human_required === 'HIGH_RISK');
  }
  assert.throws(() => validateCompanyRegTenantRequest(request({ additional_cost_eur: 0.01 })), (error) => error.code === 'MONEY_LIMIT' && error.human_required === 'MONEY_LIMIT');
});

test('schema, company id and intent drift fail closed', () => {
  assert.throws(() => validateCompanyRegTenantRequest(request({ schema_version: '2.0.0' })), (error) => error.code === 'POLICY_CONFLICT');
  assert.throws(() => validateCompanyRegTenantRequest(request({ company_id: 'bad company id' })), (error) => error.code === 'POLICY_CONFLICT');
  assert.throws(() => validateCompanyRegTenantRequest(request({ intent: 'ACTIVATE_PROD' })), (error) => error.code === 'POLICY_CONFLICT');
});
