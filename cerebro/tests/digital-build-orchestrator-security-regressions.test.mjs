import test from 'node:test';
import assert from 'node:assert/strict';
import { planDigitalBuild } from '../digital-build-orchestrator.mjs';
import { loadDigitalBuildCatalog } from '../digital-build-capability-catalog.mjs';

function request(overrides = {}) {
  return {
    request_id: 'req-security-001',
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

test('context engine_id must be one of the 177 canonical registry IDs', () => {
  const context = { ...request().context, engine_id: 'NEW-999' };
  assert.throws(() => planDigitalBuild(request({ context })), /noncanonical context engine NEW-999/);
});

test('supplied templates cannot smuggle Trading engine directives through extra fields', () => {
  const catalog = loadDigitalBuildCatalog();
  const capability = catalog.capabilities.find((item) => item.capability_id === 'cap:web-build');
  capability.templates[0].engine_id = 'LAB-TRD';
  assert.throws(() => planDigitalBuild(request(), { catalog }), /unexpected template field engine_id/);
});

test('supplied skills cannot smuggle Trading engine bindings through extra fields', () => {
  const catalog = loadDigitalBuildCatalog();
  const capability = catalog.capabilities.find((item) => item.capability_id === 'cap:web-build');
  capability.skills[0].engine_bindings = ['LAB-TRD'];
  assert.throws(() => planDigitalBuild(request(), { catalog }), /unexpected skill field engine_bindings/);
});
