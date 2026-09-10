import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGcpTrainingInventoryPlan, allowedGcpProjectIds } from '../gcp-training-inventory-wrapper.mjs';

const base = {
  company_id: 'fenix-capital',
  environment: 'SCAFFOLD',
  version: '0.1.0',
  project_id: 'fenix-trading-lab',
};

test('registers exactly the four known GCP project ids', () => {
  assert.deepEqual(allowedGcpProjectIds(), [
    'fenix-trading-lab',
    'fenix-capital-455809',
    'fenix-inmobiliaria',
    'fenix-capital-make-web-y-seo',
  ]);
});

test('builds a read-only PLAN_ONLY inventory plan with zero additional cost', () => {
  const plan = buildGcpTrainingInventoryPlan(base);
  assert.equal(plan.status, 'PLAN_READY');
  assert.equal(plan.engine_id, 'INT-001');
  assert.equal(plan.mode, 'READ_ONLY_FIRST');
  assert.equal(plan.execution_mode, 'PLAN_ONLY');
  assert.equal(plan.executed, false);
  assert.equal(plan.prod_writes, false);
  assert.equal(plan.trading_access, false);
  assert.equal(plan.additional_cost_target_eur, 0);
  assert.equal(plan.secrets_policy, 'REFERENCES_ONLY');
  assert.equal(plan.live_inventory_status, 'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(plan.training_trading_separation_required_before_write, true);
});

test('rejects unknown GCP projects and non-SCAFFOLD environments', () => {
  assert.throws(() => buildGcpTrainingInventoryPlan({ ...base, project_id: 'unknown-project' }), /unregistered GCP project_id/);
  assert.throws(() => buildGcpTrainingInventoryPlan({ ...base, environment: 'PROD' }), /exact SCAFFOLD only/);
});

test('rejects accessors, proxies and extra fields before reading caller-controlled values', () => {
  let getterRuns = 0;
  const withGetter = { ...base };
  Object.defineProperty(withGetter, 'project_id', {
    enumerable: true,
    get() {
      getterRuns += 1;
      return getterRuns === 1 ? 'fenix-trading-lab' : 'fenix-capital-455809';
    },
  });
  assert.throws(() => buildGcpTrainingInventoryPlan(withGetter), /must be a data property/);
  assert.equal(getterRuns, 0);

  let trapRuns = 0;
  const proxy = new Proxy({ ...base }, {
    getPrototypeOf() {
      trapRuns += 1;
      return Object.prototype;
    },
  });
  assert.throws(() => buildGcpTrainingInventoryPlan(proxy), /proxy objects are forbidden/);
  assert.equal(trapRuns, 0);

  assert.throws(
    () => buildGcpTrainingInventoryPlan({ ...base, prod_writes: 'true' }),
    /unexpected input field prod_writes/,
  );
});

test('inventory plan includes all required discovery domains and integration precedence', () => {
  const plan = buildGcpTrainingInventoryPlan(base);
  for (const domain of ['services','cloud_run','functions','compute','jobs','scheduler','pubsub','storage','databases','artifact_registry','iam','secret_references','networking','logging_monitoring','billing_cost','regions','deployments','consumers']) {
    assert.ok(plan.inventory_domains.includes(domain), `missing inventory domain ${domain}`);
  }
  assert.deepEqual(plan.integration_precedence, [
    'EXISTING_API',
    'AUTHORIZED_MCP_OR_CONNECTOR',
    'GCLOUD_OR_SCRIPT',
    'FACT001_NEW_CONNECTOR_ONLY_IF_GAP_PROVEN',
  ]);
});
