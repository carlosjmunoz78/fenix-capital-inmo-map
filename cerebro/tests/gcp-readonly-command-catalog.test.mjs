import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'gcp-readonly-command-catalog-v0.json'), 'utf8'));

const PROJECTS = [
  'fenix-trading-lab',
  'fenix-capital-455809',
  'fenix-inmobiliaria',
  'fenix-capital-make-web-y-seo',
];

const DOMAINS = [
  'projects','enabled_apis','cloud_run','cloud_functions','compute','jobs','scheduler','pubsub','storage','databases','artifact_registry','service_accounts_and_iam','secret_references','networking','logging_monitoring','billing_cost','regions','deployments','resource_consumers'
];

const MUTATING = [
  'create','update','delete','deploy','set','add-iam-policy-binding','remove-iam-policy-binding','enable','disable','start','stop','restart','patch','write'
];

test('GCP discovery catalog is exact SCAFFOLD PLAN_ONLY and zero-cost', () => {
  assert.equal(catalog.environment, 'SCAFFOLD');
  assert.equal(catalog.engine_id, 'INT-001');
  assert.equal(catalog.execution_mode, 'PLAN_ONLY');
  assert.equal(catalog.additional_cost_target_eur, 0);
  assert.equal(catalog.prod_writes, false);
  assert.equal(catalog.autonomous_prod, false);
  assert.equal(catalog.trading_access, false);
});

test('catalog contains exactly the four registered projects and canonical inventory domains', () => {
  assert.deepEqual(catalog.known_project_ids, PROJECTS);
  assert.deepEqual(catalog.required_inventory_domains, DOMAINS);
});

test('command policy is fail-closed and never executes mutations', () => {
  const p = catalog.command_policy;
  assert.equal(p.mode, 'READ_ONLY_FIRST');
  assert.equal(p.generator_only, true);
  assert.equal(p.execute_commands, false);
  assert.equal(p.requires_authenticated_gcloud_or_authorized_connector, true);
  assert.equal(p.secrets_policy, 'REFERENCES_ONLY');
  assert.equal(p.least_privilege, true);
  assert.deepEqual(p.forbidden_mutating_verbs, MUTATING);
});

test('fenix-trading-lab remains unclassified and Trading mutation is forbidden', () => {
  const g = catalog.training_guard;
  assert.equal(g.training_project_id, 'fenix-trading-lab');
  assert.equal(g.resource_ownership_status, 'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(g.separate_training_from_trading_before_any_write, true);
  assert.equal(g.trading_mutation_forbidden, true);
});
