import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCanonicalHumanRequired, planDigitalBuild } from '../digital-build-orchestrator.mjs';
import { loadDigitalBuildCatalog } from '../digital-build-capability-catalog.mjs';

function request(overrides = {}) {
  return {
    request_id: 'req-001',
    capability_id: 'cap:web-build',
    context: {
      company_id: 'company-a',
      engine_id: 'ORCH-001',
      environment: 'SCAFFOLD',
      version: '0.1.0',
    },
    requires_prod_write: false,
    autonomous_prod: false,
    trading_access: false,
    estimated_additional_cost_eur: 0,
    ...overrides,
  };
}

test('orchestrator creates deterministic plan-only output over canonical capability bindings', () => {
  const first = planDigitalBuild(request());
  const second = planDigitalBuild(request());
  assert.deepEqual(first, second);
  assert.equal(first.outcome, 'PLAN_READY');
  assert.equal(first.execution_mode, 'PLAN_ONLY');
  assert.equal(first.executed, false);
  assert.equal(first.prod_writes, false);
  assert.equal(first.autonomous_prod, false);
  assert.equal(first.trading_access, false);
  assert.equal(first.additional_cost_target_eur, 0);
  assert.ok(first.engine_bindings.includes('WEB-001'));
  assert.ok(first.engine_bindings.includes('FACT-001'));
  assert.equal(first.template.enabled, false);
  assert.equal(first.template.template_id, 'tpl:web-static-safe-v0');
  assert.deepEqual(first.gates.slice(0, 6), ['CONSERVAR', 'ENTENDER', 'ENVOLVER', 'PROBAR', 'MEJORAR', 'MIGRAR']);
});

test('orchestrator never accepts PREPROD or PROD as build-planning environment in V0', () => {
  for (const environment of ['PREPROD', 'PROD', 'prod', '']) {
    assert.throws(() => planDigitalBuild(request({ context: { ...request().context, environment } })), /SCAFFOLD|non-empty/);
  }
});

test('positive additional cost fails closed to canonical MONEY_LIMIT', () => {
  const result = planDigitalBuild(request({ estimated_additional_cost_eur: 0.01 }));
  assert.equal(result.outcome, 'HUMAN_REQUIRED');
  assert.equal(result.reason, 'MONEY_LIMIT');
  assert.equal(result.executed, false);
  assert.equal(assertCanonicalHumanRequired(result), true);
});

test('PROD write or autonomous PROD request fails closed to HIGH_RISK', () => {
  for (const patch of [{ requires_prod_write: true }, { autonomous_prod: true }]) {
    const result = planDigitalBuild(request(patch));
    assert.equal(result.outcome, 'HUMAN_REQUIRED');
    assert.equal(result.reason, 'HIGH_RISK');
    assert.equal(result.executed, false);
    assert.equal(assertCanonicalHumanRequired(result), true);
  }
});

test('Trading access is isolated and routes to POLICY_CONFLICT without execution', () => {
  const result = planDigitalBuild(request({ trading_access: true }));
  assert.equal(result.outcome, 'HUMAN_REQUIRED');
  assert.equal(result.reason, 'POLICY_CONFLICT');
  assert.equal(result.executed, false);
  assert.equal(assertCanonicalHumanRequired(result), true);
});

test('combined escalation flags select canonical highest-priority reason independent of branch order', () => {
  const all = planDigitalBuild(request({
    trading_access: true,
    requires_prod_write: true,
    autonomous_prod: true,
    estimated_additional_cost_eur: 5,
  }));
  assert.equal(all.reason, 'HIGH_RISK');

  const moneyAndTrading = planDigitalBuild(request({
    trading_access: true,
    estimated_additional_cost_eur: 5,
  }));
  assert.equal(moneyAndTrading.reason, 'MONEY_LIMIT');
});

test('orchestrator rejects unsafe scalar coercions and unknown capabilities', () => {
  assert.throws(() => planDigitalBuild(request({ estimated_additional_cost_eur: '0' })), /finite non-negative/);
  assert.throws(() => planDigitalBuild(request({ trading_access: 0 })), /boolean/);
  assert.throws(() => planDigitalBuild(request({ requires_prod_write: null })), /boolean/);
  assert.throws(() => planDigitalBuild(request({ capability_id: 'cap:not-real' })), /unknown capability/);
});

test('request context and returned plan are isolated from caller mutation', () => {
  const source = request();
  const plan = planDigitalBuild(source);
  source.context.company_id = 'company-b';
  source.capability_id = 'cap:ecommerce-build';
  assert.equal(plan.context.company_id, 'company-a');
  assert.equal(plan.capability_id, 'cap:web-build');
});

test('returned plan and HUMAN_REQUIRED snapshots are deeply frozen', () => {
  const plan = planDigitalBuild(request());
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.context), true);
  assert.equal(Object.isFrozen(plan.engine_bindings), true);
  assert.equal(Object.isFrozen(plan.template), true);
  assert.equal(Object.isFrozen(plan.skills), true);
  assert.equal(Object.isFrozen(plan.skills[0]), true);
  assert.equal(Object.isFrozen(plan.gates), true);
  assert.throws(() => { plan.context.environment = 'PROD'; }, TypeError);
  assert.throws(() => { plan.template.enabled = true; }, TypeError);
  assert.throws(() => { plan.engine_bindings.push('LAB-TRD'); }, TypeError);

  const human = planDigitalBuild(request({ requires_prod_write: true }));
  assert.equal(Object.isFrozen(human), true);
  assert.equal(Object.isFrozen(human.context), true);
  assert.throws(() => { human.context.environment = 'PROD'; }, TypeError);
});

test('accessor fields are rejected before planning', () => {
  let executed = false;
  const source = request();
  Object.defineProperty(source, 'capability_id', {
    enumerable: true,
    get() {
      executed = true;
      return 'cap:web-build';
    },
  });
  assert.throws(() => planDigitalBuild(source), /data property/);
  assert.equal(executed, false);
});

test('inherited accessors and custom prototypes are rejected before any inherited getter executes', () => {
  let executed = false;
  const proto = {};
  Object.defineProperty(proto, 'trading_access', {
    get() {
      executed = true;
      return true;
    },
  });
  const source = Object.create(proto);
  const safe = request();
  for (const [key, value] of Object.entries(safe)) {
    if (key === 'trading_access') continue;
    Object.defineProperty(source, key, { value, enumerable: true, writable: true, configurable: true });
  }
  assert.throws(() => planDigitalBuild(source), /plain object/);
  assert.equal(executed, false);

  const contextProto = {};
  Object.defineProperty(contextProto, 'environment', {
    get() {
      executed = true;
      return 'PROD';
    },
  });
  const unsafeContext = Object.create(contextProto);
  for (const [key, value] of Object.entries(request().context)) {
    if (key === 'environment') continue;
    Object.defineProperty(unsafeContext, key, { value, enumerable: true, writable: true, configurable: true });
  }
  assert.throws(() => planDigitalBuild(request({ context: unsafeContext })), /plain object/);
  assert.equal(executed, false);
});

test('nested context accessors are rejected recursively before catalog validation or mutation', () => {
  let executed = false;
  const metadata = {};
  Object.defineProperty(metadata, 'unsafe', {
    enumerable: true,
    get() {
      executed = true;
      return 'LAB-TRD';
    },
  });
  const source = request({
    context: {
      ...request().context,
      metadata,
    },
  });
  const suppliedCatalog = { marker: 'unchanged' };
  Object.defineProperty(metadata, 'mutate_catalog', {
    enumerable: true,
    get() {
      executed = true;
      suppliedCatalog.marker = 'mutated';
      return true;
    },
  });

  assert.throws(() => planDigitalBuild(source, { catalog: suppliedCatalog }), /data property/);
  assert.equal(executed, false);
  assert.equal(suppliedCatalog.marker, 'unchanged');
});

test('supplied catalog accessors are rejected before validation and cannot smuggle unvalidated bindings', () => {
  let executed = false;
  const catalog = loadDigitalBuildCatalog();
  const capability = catalog.capabilities.find((item) => item.capability_id === 'cap:web-build');
  const canonicalBindings = [...capability.engine_bindings];
  Object.defineProperty(capability, 'engine_bindings', {
    enumerable: true,
    configurable: true,
    get() {
      executed = true;
      return executed ? ['LAB-TRD'] : canonicalBindings;
    },
  });

  assert.throws(() => planDigitalBuild(request(), { catalog }), /data property/);
  assert.equal(executed, false);
});

test('options accessors are rejected before catalog extraction', () => {
  let executed = false;
  const options = {};
  Object.defineProperty(options, 'catalog', {
    enumerable: true,
    get() {
      executed = true;
      return loadDigitalBuildCatalog();
    },
  });
  assert.throws(() => planDigitalBuild(request(), options), /data property/);
  assert.equal(executed, false);
});
