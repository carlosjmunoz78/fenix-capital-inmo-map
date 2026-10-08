import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-company-reg-tenant-preprod-v0.yml', import.meta.url), 'utf8');
const fixture = JSON.parse(fs.readFileSync(new URL('../multicompany/requests/company-reg-tenant-selfcheck.v0.json', import.meta.url), 'utf8'));

test('COMP-REG TENANT workflow is hostless/event-driven and repository read-only', () => {
  assert.match(workflow, /name: CEREBRO Company Registry Tenant PREPROD V0/);
  assert.match(workflow, /\n  push:/);
  assert.match(workflow, /\n  workflow_dispatch:/);
  assert.match(workflow, /\n  repository_dispatch:/);
  assert.match(workflow, /cerebro_company_reg_tenant_preprod/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /secrets\./);
});

test('workflow pins PREPROD reference-only durability and no promotion authority', () => {
  assert.match(workflow, /COMP_REG_TENANT_PREPROD_GREEN/);
  assert.match(workflow, /IN_MEMORY_REFERENCE_ONLY/);
  assert.match(workflow, /DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED/);
  assert.match(workflow, /PHASE4_NOT_ALL_GREEN/);
  assert.match(workflow, /result\.supabase_writes !== false/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});

test('self-check request cannot authorize PROD, Trading, Supabase writes or paid spend', () => {
  assert.equal(fixture.company_id, 'cerebro-reg-tenant-selfcheck');
  assert.equal(fixture.environment, 'PREPROD');
  assert.equal(fixture.additional_cost_eur, 0);
  assert.equal(fixture.prod_authorized, false);
  assert.equal(fixture.prod_write_authorized, false);
  assert.equal(fixture.trading_access, false);
  assert.equal(fixture.supabase_writes, false);
  assert.equal(fixture.external_code_execution, false);
});
