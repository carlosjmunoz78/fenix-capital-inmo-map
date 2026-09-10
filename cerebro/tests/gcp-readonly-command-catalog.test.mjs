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

const READ_VERBS = new Set(['describe','list','search-all-resources','get-iam-policy']);

function commandVerb(command) {
  const tokens = command.trim().split(/\s+/);
  const positional = tokens.filter((token) => !token.startsWith('-') && token !== 'gcloud' && !token.startsWith('${'));
  return positional.findLast((token) => READ_VERBS.has(token));
}

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
  assert.deepEqual(p.parameter_tokens, ['${PROJECT_ID}','${LOCATION}']);
  assert.deepEqual(p.allowed_read_verbs, ['describe','list','search-all-resources','get-iam-policy']);
  assert.deepEqual(p.forbidden_mutating_verbs, MUTATING);
});

test('every canonical inventory domain has explicit parameterized read-only command templates', () => {
  assert.equal(catalog.domain_commands.length, DOMAINS.length);
  assert.deepEqual(catalog.domain_commands.map((entry) => entry.domain), DOMAINS);
  for (const entry of catalog.domain_commands) {
    assert.ok(Array.isArray(entry.commands) && entry.commands.length > 0, `missing commands for ${entry.domain}`);
    for (const command of entry.commands) {
      assert.match(command, /^gcloud\s/);
      assert.match(command, /\$\{PROJECT_ID\}/);
      assert.ok(commandVerb(command), `command for ${entry.domain} lacks an allowed read verb: ${command}`);
      const tokens = command.trim().split(/\s+/);
      for (const forbidden of MUTATING) {
        assert.ok(!tokens.includes(forbidden), `forbidden mutating verb ${forbidden} in ${entry.domain}`);
      }
    }
  }
});

test('scheduler inventory enumerates project locations and never relies on ambient location defaults', () => {
  const scheduler = catalog.domain_commands.find((entry) => entry.domain === 'scheduler');
  assert.ok(scheduler);
  assert.deepEqual(scheduler.commands, [
    'gcloud scheduler locations list --project=${PROJECT_ID} --format=json',
    'gcloud scheduler jobs list --project=${PROJECT_ID} --location=${LOCATION} --format=json',
  ]);
  assert.match(scheduler.expansion_policy, /same PROJECT_ID/i);
  assert.match(scheduler.expansion_policy, /one jobs list command per returned location/i);
  assert.match(scheduler.expansion_policy, /never use ambient gcloud scheduler\/location defaults/i);
});

test('secret discovery is metadata-only and never reads secret payload versions', () => {
  const secretDomain = catalog.domain_commands.find((entry) => entry.domain === 'secret_references');
  assert.ok(secretDomain);
  assert.deepEqual(secretDomain.commands, ['gcloud secrets list --project=${PROJECT_ID} --format=json']);
  assert.match(secretDomain.safety_note, /metadata only/i);
  assert.ok(secretDomain.commands.every((command) => !command.includes('versions access')));
});

test('billing and asset discovery fail closed when richer read access is unavailable', () => {
  const billing = catalog.domain_commands.find((entry) => entry.domain === 'billing_cost');
  const consumers = catalog.domain_commands.find((entry) => entry.domain === 'resource_consumers');
  assert.match(billing.safety_note, /must not be invented/i);
  assert.match(consumers.safety_note, /do not enable APIs/i);
});

test('fenix-trading-lab remains unclassified and Trading mutation is forbidden', () => {
  const g = catalog.training_guard;
  assert.equal(g.training_project_id, 'fenix-trading-lab');
  assert.equal(g.resource_ownership_status, 'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(g.separate_training_from_trading_before_any_write, true);
  assert.equal(g.trading_mutation_forbidden, true);
});
