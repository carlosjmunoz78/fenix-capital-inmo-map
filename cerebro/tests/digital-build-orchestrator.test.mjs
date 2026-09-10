import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCanonicalHumanRequired, planDigitalBuild } from '../digital-build-orchestrator.mjs';

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
