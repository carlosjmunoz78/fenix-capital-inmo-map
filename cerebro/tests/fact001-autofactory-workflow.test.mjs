import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-fact001-autofactory-v0.yml', import.meta.url), 'utf8');
const request = JSON.parse(fs.readFileSync(new URL('../factory/requests/fact001-selfcheck.v0.json', import.meta.url), 'utf8'));

test('FACT-001 AutoFactory is event-driven hostless and keeps repository permissions read-only', () => {
  assert.match(workflow, /name: CEREBRO FACT-001 AutoFactory V0/);
  assert.match(workflow, /\n  push:/);
  assert.match(workflow, /\n  workflow_dispatch:/);
  assert.match(workflow, /\n  repository_dispatch:/);
  assert.match(workflow, /cerebro_fact001_engine_request/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /secrets\./);
});

test('workflow runs canonical contracts before scaffold and emits immutable artifact evidence', () => {
  assert.match(workflow, /npm run validate/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /fact001-request-runner\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /STRUCTURAL_FACTORY_GREEN/);
  assert.match(workflow, /engine_evaluation: 'NOT_RUN_SCAFFOLD_ONLY'/);
  assert.match(workflow, /tribunal: 'NOT_RUN_SCAFFOLD_ONLY'/);
});

test('workflow and seed request cannot authorize PROD Trading external code or cost', () => {
  for (const marker of [
    'prod_authorized: false',
    'prod_write_authorized: false',
    'trading_access: false',
    'additional_cost_eur: 0'
  ]) assert.match(workflow, new RegExp(marker));

  assert.equal(request.environment, 'SCAFFOLD');
  assert.equal(request.additional_cost_eur, 0);
  assert.equal(request.prod_authorized, false);
  assert.equal(request.prod_write_authorized, false);
  assert.equal(request.trading_access, false);
  assert.equal(request.external_code_execution, false);
});
