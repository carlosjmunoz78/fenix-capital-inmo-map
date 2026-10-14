import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const specs = [
  {
    path: 'cerebro/skills/cerebro-184-items-25-37-live-reconciliation.v2.json',
    stateType: 'CEREBRO_184_ITEMS_25_37_LIVE_RECONCILIATION_V2',
    start: 25,
    end: 37
  },
  {
    path: 'cerebro/skills/cerebro-184-items-38-50-live-reconciliation.v2.json',
    stateType: 'CEREBRO_184_ITEMS_38_50_LIVE_RECONCILIATION_V2',
    start: 38,
    end: 50
  }
];

const canonicalDispositions = new Set(['REUTILIZAR', 'ENVOLVER', 'CATALOGAR', 'FABRICAR_GRATIS', 'HOLD', 'DESCARTAR', 'PAGO_JUSTIFICADO']);
const allowedStates = new Set([
  'FULL_PREPROD',
  'PARTIAL_PREPROD_WRAPPER_POLICY_ONLY',
  'TERMINAL_REFERENCE_ONLY',
  'LAB_REFERENCE_ONLY',
  'PARTIAL_EXTERNAL_SECRET_STORE_BINDING',
  'PARTIAL_PHYSICAL_BINDING_REQUIRED',
  'TERMINAL_HOLD',
  'DEFINED_NOT_BUILT'
]);

function load(spec) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, spec.path), 'utf8'));
}

test('reconciliation covers exact canonical item ids 25 through 50 once', () => {
  const all = [];
  for (const spec of specs) {
    const state = load(spec);
    assert.equal(state.state_type, spec.stateType);
    assert.equal(state.company_id, 'GLOBAL');
    assert.equal(state.engine_id, 'FACT-001');
    assert.equal(state.environment, 'PREPROD');
    const expected = Array.from({ length: spec.end - spec.start + 1 }, (_, index) => spec.start + index);
    assert.deepEqual(state.items.map((item) => item.id), expected);
    all.push(...state.items.map((item) => item.id));
  }
  assert.equal(all.length, 26);
  assert.equal(new Set(all).size, 26);
  assert.deepEqual(all, Array.from({ length: 26 }, (_, index) => index + 25));
});

test('every item has one canonical disposition, evidence and a justified evidence state', () => {
  for (const spec of specs) {
    const state = load(spec);
    for (const item of state.items) {
      assert.equal(canonicalDispositions.has(item.disposition), true, `item ${item.id} disposition`);
      assert.equal(allowedStates.has(item.state), true, `item ${item.id} state:${item.state}`);
      assert.ok(Array.isArray(item.owner_engine_ids) && item.owner_engine_ids.length > 0, `item ${item.id} owner`);
      assert.ok(Array.isArray(item.evidence) && item.evidence.length > 0, `item ${item.id} evidence`);
      assert.ok(typeof item.reason === 'string' && item.reason.length > 30, `item ${item.id} reason`);
      for (const relative of item.evidence) {
        assert.equal(fs.existsSync(path.join(repoRoot, relative)), true, `item ${item.id}: ${relative}`);
      }
    }
  }
});

test('external references remain metadata-only and no external skill code is authorized', () => {
  let refCount = 0;
  for (const spec of specs) {
    const state = load(spec);
    for (const item of state.items) {
      if (!item.external_reference) continue;
      refCount += 1;
      if ('external_code_executed' in item.external_reference) {
        assert.equal(item.external_reference.external_code_executed, false, `item ${item.id}`);
      }
    }
    assert.equal(state.authority.external_skill_code_execution_authorized, false);
    assert.equal(state.authority.external_dependency_install_authorized, false);
  }
  assert.ok(refCount >= 8);
});

test('zero-cost and PROD/Trading boundaries remain fail-closed', () => {
  for (const spec of specs) {
    const state = load(spec);
    const a = state.authority;
    for (const key of ['prod_authorized', 'prod_write_authorized', 'auto_merge_authorized', 'external_skill_code_execution_authorized', 'external_dependency_install_authorized', 'customer_data_authorized', 'trading_access', 'automatic_paid_fallback']) {
      assert.equal(a[key], false, `${spec.path}:${key}`);
    }
    assert.equal(a.additional_cost_eur, 0);
    assert.equal(state.summary.additional_cost_eur, 0);
    assert.deepEqual(state.summary.human_required, []);
    assert.equal(state.items.some((item) => item.disposition === 'PAGO_JUSTIFICADO'), false);
  }
});

test('25-37 reuses one Safe Engineering profile instead of spawning duplicate runtimes', () => {
  const state = load(specs[0]);
  assert.equal(state.items.find((item) => item.id === 25)?.disposition, 'ENVOLVER');
  for (const id of [26, 27, 28, 29, 31, 32]) {
    assert.equal(state.items.find((item) => item.id === id)?.state, 'FULL_PREPROD', `item ${id}`);
  }
  for (const id of [30, 33, 34, 35, 37]) {
    assert.equal(state.items.find((item) => item.id === id)?.disposition, 'CATALOGAR', `item ${id}`);
  }
  assert.equal(state.summary.full_preprod, 6);
  assert.equal(state.summary.partial_active, 1);
  assert.equal(state.summary.reference_only, 6);
});

test('38-50 routes only real gaps to existing engines / FACT-001', () => {
  const state = load(specs[1]);
  for (const id of [38, 40, 41, 42]) {
    assert.equal(state.items.find((item) => item.id === id)?.state, 'FULL_PREPROD', `item ${id}`);
  }
  assert.equal(state.items.find((item) => item.id === 43)?.disposition, 'ENVOLVER');
  assert.equal(state.items.find((item) => item.id === 45)?.disposition, 'HOLD');
  assert.equal(state.items.find((item) => item.id === 47)?.disposition, 'FABRICAR_GRATIS');
  assert.equal(state.items.find((item) => item.id === 48)?.disposition, 'FABRICAR_GRATIS');
  assert.equal(state.items.find((item) => item.id === 47)?.state, 'DEFINED_NOT_BUILT');
  assert.equal(state.items.find((item) => item.id === 48)?.state, 'DEFINED_NOT_BUILT');
  assert.equal(state.summary.fabricate_free, 2);
  assert.equal(state.summary.terminal_hold, 1);
});
