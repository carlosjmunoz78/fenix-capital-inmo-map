import test from 'node:test';
import assert from 'node:assert/strict';
import { DynamicConcurrencyPolicyV1, DynamicConcurrencyControllerV1, DYNAMIC_CONCURRENCY_V1_CONTRACT } from '../runtime/dynamic-concurrency-policy-v1.mjs';

const fenixModel = { company_id: 'fenix', engine_id: 'ROUTE-001', environment: 'PREPROD', version: 'v1' };
const aionModel = { company_id: 'aion', engine_id: 'ROUTE-001', environment: 'PREPROD', version: 'v1' };
const deepseek = { pool: 'MODEL', provider_id: 'deepseek', resource_key: 'model:deepseek' };

function key(c) { return `${c.company_id}|${c.engine_id}|${c.environment}|${c.version}`; }

test('healthy pressure doubles 1 -> 2 -> 4 -> 8 and never exceeds configured max', () => {
  const p = new DynamicConcurrencyPolicyV1({ initial_global_concurrency: 1, max_global_concurrency: 8 });
  for (const expected of [2, 4, 8, 8]) {
    p.observe({ ready_count: 100, started_count: p.target_global_concurrency, success_count: p.target_global_concurrency, elapsed_ms: 100 });
    assert.equal(p.target_global_concurrency, expected);
  }
});

test('429 or conflicts scale down immediately', () => {
  const p = new DynamicConcurrencyPolicyV1({ initial_global_concurrency: 16, max_global_concurrency: 64 });
  p.observe({ ready_count: 32, started_count: 16, success_count: 15, failure_count: 1, rate_limit_429_count: 1, elapsed_ms: 100 });
  assert.equal(p.target_global_concurrency, 8);
  assert.equal(p.last_decision, 'SCALE_DOWN_DEGRADED');
  p.observe({ ready_count: 16, started_count: 8, success_count: 7, failure_count: 1, conflict_count: 1, elapsed_ms: 100 });
  assert.equal(p.target_global_concurrency, 4);
});

test('provider/company/repo limits are enforced and unknown provider fails closed', () => {
  const p = new DynamicConcurrencyPolicyV1({
    initial_global_concurrency: 8,
    max_global_concurrency: 8,
    max_company_concurrency: 2,
    max_provider_concurrency: { deepseek: 2 },
    max_repo_write_concurrency: 1,
  });
  const reservations = [
    { context: fenixModel, route: deepseek },
    { context: fenixModel, route: deepseek },
  ];
  assert.equal(p.canStart({ context: fenixModel, route: deepseek }, reservations).reason, 'MAX_COMPANY_CONCURRENCY');
  assert.equal(p.canStart({ context: aionModel, route: deepseek }, reservations).reason, 'MAX_PROVIDER_CONCURRENCY');
  assert.equal(p.canStart({ context: aionModel, route: { ...deepseek, provider_id: 'unknown' } }, []).reason, 'PROVIDER_NOT_ALLOWLISTED');

  const repoRoute = { pool: 'REPO_CI', resource_key: 'repo:fenix', repo_write_key: 'fenix-capital-inmo-map:main' };
  const r = [{ context: fenixModel, route: repoRoute }];
  assert.equal(p.canStart({ context: aionModel, route: repoRoute }, r).reason, 'MAX_REPO_WRITE_CONCURRENCY');
});

test('controller expands a single context to target slots but respects deepseek provider ceiling', async () => {
  const calls = [];
  const worker = { runFairRound: async ({ contexts }) => {
    calls.push(contexts.length);
    return contexts.map((context, i) => ({ status: 'SUCCEEDED', context, i }));
  }};
  const policy = new DynamicConcurrencyPolicyV1({
    initial_global_concurrency: 8,
    max_global_concurrency: 32,
    max_company_concurrency: 16,
    max_provider_concurrency: { deepseek: 4 },
  });
  const controller = new DynamicConcurrencyControllerV1({ worker, policy, routes: { [key(fenixModel)]: deepseek } });
  const out = await controller.runFairRound({ contexts: [fenixModel] });
  assert.equal(calls[0], 4);
  assert.equal(out.length, 4);
});

test('two-company MODEL scheduling preserves isolation and shares capacity', async () => {
  const seen = [];
  const worker = { runFairRound: async ({ contexts }) => {
    seen.push(...contexts.map(c => c.company_id));
    return contexts.map(context => ({ status: 'SUCCEEDED', context }));
  }};
  const policy = new DynamicConcurrencyPolicyV1({
    initial_global_concurrency: 4,
    max_global_concurrency: 16,
    max_company_concurrency: 2,
    max_provider_concurrency: { deepseek: 4 },
  });
  const controller = new DynamicConcurrencyControllerV1({
    worker, policy,
    routes: { [key(fenixModel)]: deepseek, [key(aionModel)]: deepseek },
  });
  await controller.runFairRound({ contexts: [fenixModel, aionModel] });
  assert.equal(seen.filter(x => x === 'fenix').length, 2);
  assert.equal(seen.filter(x => x === 'aion').length, 2);
});

test('missing scheduling route fails closed', async () => {
  const worker = { runFairRound: async () => [] };
  const policy = new DynamicConcurrencyPolicyV1();
  const controller = new DynamicConcurrencyControllerV1({ worker, policy, routes: {} });
  await assert.rejects(() => controller.runFairRound({ contexts: [fenixModel] }), /SCHEDULING_ROUTE_MISSING/);
});

test('contract never claims PROD authority, second daemon, trading, or auto recharge', () => {
  assert.equal(DYNAMIC_CONCURRENCY_V1_CONTRACT.second_daemon, false);
  assert.equal(DYNAMIC_CONCURRENCY_V1_CONTRACT.prod_authorized, false);
  assert.equal(DYNAMIC_CONCURRENCY_V1_CONTRACT.prod_writes, false);
  assert.equal(DYNAMIC_CONCURRENCY_V1_CONTRACT.trading_access, false);
  assert.equal(DYNAMIC_CONCURRENCY_V1_CONTRACT.auto_recharge, false);
  assert.equal(DYNAMIC_CONCURRENCY_V1_CONTRACT.hard_cost_cap_eur, 100);
});
