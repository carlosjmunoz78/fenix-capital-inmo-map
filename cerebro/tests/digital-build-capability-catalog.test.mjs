import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDigitalBuildCatalog, selectTemplate, validateDigitalBuildCatalog } from '../digital-build-capability-catalog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const registry = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'registry', 'engine-registry.seed.json'), 'utf8'));
assert.ok(Array.isArray(registry.engine_ids));
const canonicalIds = new Set(registry.engine_ids);

const EXPECTED_CAPABILITIES = [
  'cap:web-build',
  'cap:wordpress-build',
  'cap:ecommerce-build',
  'cap:app-pwa-mobile-desktop',
  'cap:plugin-theme-module-component',
  'cap:integration-api-webhook-worker-job',
  'cap:automation-build',
  'cap:content-multimedia',
  'cap:deployment-resilience',
  'cap:technology-scout',
];

test('FACT-001 digital-build catalog validates against exactly 177 canonical engine IDs', () => {
  const result = validateDigitalBuildCatalog();
  assert.equal(registry.count, 177);
  assert.equal(registry.engine_ids.length, 177);
  assert.equal(result.canonical_engine_ids, 177);
  assert.equal(result.capabilities, EXPECTED_CAPABILITIES.length);
  assert.equal(result.templates, EXPECTED_CAPABILITIES.length);
  assert.equal(result.skills, EXPECTED_CAPABILITIES.length);
});

test('catalog covers the agreed V0 digital-build and technology-scout capability families', () => {
  const catalog = loadDigitalBuildCatalog();
  assert.deepEqual(catalog.capabilities.map((item) => item.capability_id), EXPECTED_CAPABILITIES);
});

test('every capability binding reuses an existing canonical engine and creates no hidden engine IDs', () => {
  const catalog = loadDigitalBuildCatalog();
  for (const capability of catalog.capabilities) {
    for (const engineId of capability.engine_bindings) assert.equal(canonicalIds.has(engineId), true, `${capability.capability_id}: ${engineId}`);
  }
  assert.equal(canonicalIds.size, 177);
});

test('all template defaults are fail-closed, zero-additional-cost and non-PROD', () => {
  const catalog = loadDigitalBuildCatalog();
  assert.equal(catalog.environment, 'SCAFFOLD');
  assert.equal(catalog.additional_cost_target_eur, 0);
  assert.equal(catalog.autonomous_prod, false);
  assert.equal(catalog.prod_writes, false);
  assert.equal(catalog.trading_access, false);
  for (const capability of catalog.capabilities) {
    assert.notEqual(capability.status, 'PROD');
    for (const template of capability.templates) {
      assert.equal(template.enabled, false);
      assert.equal(template.autonomous_prod, false);
      assert.equal(template.prod_writes, false);
      assert.equal(template.trading_access, false);
      assert.equal(template.additional_cost_target_eur, 0);
    }
  }
});

test('direct overlap engines remain represented without overclaiming runtime operation', () => {
  const catalog = loadDigitalBuildCatalog();
  const byId = new Map(catalog.capabilities.map((item) => [item.capability_id, item]));
  assert.ok(byId.get('cap:web-build').engine_bindings.includes('WEB-001'));
  assert.ok(byId.get('cap:content-multimedia').engine_bindings.includes('VOICE-001'));
  for (const id of ['DR-001', 'RBLD-001', 'BCP-001', 'COMP-BKP-001']) {
    assert.ok(byId.get('cap:deployment-resilience').engine_bindings.includes(id));
  }
  assert.equal(byId.get('cap:wordpress-build').status, 'DEFINED_NOT_BUILT');
  assert.equal(byId.get('cap:technology-scout').status, 'DEFINED_NOT_BUILT');
});

test('template selection is deterministic and returns an isolated safe snapshot', () => {
  const first = selectTemplate('cap:web-build');
  const second = selectTemplate('cap:web-build');
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.equal(first.template_id, 'tpl:web-static-safe-v0');
  first.priority = 999;
  assert.equal(selectTemplate('cap:web-build').priority, 10);
});

test('validator rejects PROD, autonomous, paid or noncanonical catalog mutations', () => {
  const base = loadDigitalBuildCatalog();

  const prod = structuredClone(base);
  prod.environment = 'PROD';
  assert.throws(() => validateDigitalBuildCatalog({ catalog: prod, registry }), /SCAFFOLD/);

  const autonomous = structuredClone(base);
  autonomous.autonomous_prod = true;
  assert.throws(() => validateDigitalBuildCatalog({ catalog: autonomous, registry }), /autonomous_prod/);

  const paid = structuredClone(base);
  paid.capabilities[0].templates[0].additional_cost_target_eur = 1;
  assert.throws(() => validateDigitalBuildCatalog({ catalog: paid, registry }), /nonzero cost/);

  const invented = structuredClone(base);
  invented.capabilities[0].engine_bindings.push('DIGITAL-BUILD-NEW-999');
  assert.throws(() => validateDigitalBuildCatalog({ catalog: invented, registry }), /noncanonical engine binding/);
});

test('validator rejects malformed or inconsistent canonical registry snapshots', () => {
  const catalog = loadDigitalBuildCatalog();
  const wrongCount = structuredClone(registry);
  wrongCount.count = 176;
  assert.throws(() => validateDigitalBuildCatalog({ catalog, registry: wrongCount }), /exactly 177/);

  const duplicate = structuredClone(registry);
  duplicate.engine_ids[176] = duplicate.engine_ids[175];
  assert.throws(() => validateDigitalBuildCatalog({ catalog, registry: duplicate }), /177 unique/);
});
