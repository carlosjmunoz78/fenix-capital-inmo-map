import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-multicompany-scaffold-bootstrap-v0.yml', import.meta.url), 'utf8');
const fixture = JSON.parse(fs.readFileSync(new URL('../multicompany/requests/company-bootstrap-selfcheck.v0.json', import.meta.url), 'utf8'));

test('multi-company structural workflow is hostless/event driven and read-only', () => {
  assert.match(workflow, /name: CEREBRO Multi-Company Structural Bootstrap V0/);
  assert.match(workflow, /\n  push:/);
  assert.match(workflow, /\n  workflow_dispatch:/);
  assert.match(workflow, /\n  repository_dispatch:/);
  assert.match(workflow, /cerebro_new_company_scaffold/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /secrets\./);
});

test('workflow preserves structural-only boundary and Phase 4 count', () => {
  assert.match(workflow, /phase4_engine_count !== 17/);
  assert.match(workflow, /structural_files_total !== 306/);
  assert.match(workflow, /green_engines/);
  assert.match(workflow, /length !== 0/);
  assert.match(workflow, /NOT_RUN_STRUCTURAL_ONLY/);
  assert.match(workflow, /PREPROD/);
  assert.match(workflow, /SCAFFOLD/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});

test('synthetic fixture contains no operational authority or real credentials', () => {
  assert.equal(fixture.company_id, 'cerebro-bootstrap-selfcheck');
  assert.equal(fixture.environment, 'PREPROD');
  assert.equal(fixture.additional_cost_eur, 0);
  assert.equal(fixture.prod_authorized, false);
  assert.equal(fixture.prod_write_authorized, false);
  assert.equal(fixture.trading_access, false);
  assert.equal(fixture.supabase_writes, false);
  assert.equal(fixture.external_code_execution, false);
  assert.equal(fixture.profile.website_url, 'https://example.invalid');
});
