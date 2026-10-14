import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const filePath = path.join(repoRoot, 'cerebro/skills/cerebro-184-items-1-24-live-reconciliation.v2.json');
const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const canonicalDispositions = new Set(['REUTILIZAR', 'ENVOLVER', 'CATALOGAR', 'FABRICAR_GRATIS', 'HOLD', 'DESCARTAR', 'PAGO_JUSTIFICADO']);

test('reconciliation covers exact canonical item ids 1 through 24 once', () => {
  assert.equal(state.state_type, 'CEREBRO_184_ITEMS_1_24_LIVE_RECONCILIATION_V2');
  assert.equal(state.company_id, 'GLOBAL');
  assert.equal(state.engine_id, 'FACT-001');
  assert.equal(state.environment, 'PREPROD');
  assert.equal(state.items.length, 24);
  assert.deepEqual(state.items.map((item) => item.id), Array.from({ length: 24 }, (_, index) => index + 1));
  assert.equal(new Set(state.items.map((item) => item.id)).size, 24);
});

test('every item uses a canonical disposition and reaches a justified terminal state', () => {
  for (const item of state.items) {
    assert.equal(canonicalDispositions.has(item.disposition), true, `item ${item.id} disposition`);
    assert.equal(['FULL_PREPROD', 'TERMINAL_REFERENCE_ONLY', 'TERMINAL_HOLD'].includes(item.state), true, `item ${item.id} state`);
    assert.ok(Array.isArray(item.owner_engine_ids) && item.owner_engine_ids.length > 0, `item ${item.id} owner`);
    assert.ok(typeof item.reason === 'string' && item.reason.length > 20, `item ${item.id} reason`);
  }
});

test('all internal evidence paths physically exist on the branch', () => {
  for (const item of state.items) {
    assert.ok(Array.isArray(item.evidence) && item.evidence.length > 0, `item ${item.id} evidence`);
    for (const relative of item.evidence) {
      assert.equal(fs.existsSync(path.join(repoRoot, relative)), true, `item ${item.id}: ${relative}`);
    }
  }
});

test('external references are metadata only and cannot execute or install', () => {
  const refs = state.items.filter((item) => item.external_reference).map((item) => item.external_reference);
  assert.ok(refs.length >= 4);
  for (const ref of refs) {
    if ('code_execution_authorized' in ref) assert.equal(ref.code_execution_authorized, false);
    if ('dependency_install_authorized' in ref) assert.equal(ref.dependency_install_authorized, false);
  }
  assert.equal(state.authority.external_skill_code_execution_authorized, false);
  assert.equal(state.authority.external_dependency_install_authorized, false);
  assert.deepEqual(state.summary.external_dependencies_installed, []);
  assert.equal(state.summary.external_code_executed, false);
});

test('DBOS and external skill patterns do not create duplicate runtimes or engines', () => {
  assert.equal(state.items.find((item) => item.id === 15)?.disposition, 'CATALOGAR');
  assert.equal(state.items.find((item) => item.id === 8)?.disposition, 'CATALOGAR');
  assert.equal(state.items.find((item) => item.id === 7)?.disposition, 'HOLD');
  assert.equal(state.items.find((item) => item.id === 9)?.disposition, 'HOLD');
  assert.deepEqual(state.summary.new_engine_ids_created, []);
});

test('zero-cost and safety authority remain fail-closed', () => {
  const a = state.authority;
  for (const key of ['prod_authorized', 'prod_write_authorized', 'auto_merge_authorized', 'external_skill_code_execution_authorized', 'external_dependency_install_authorized', 'customer_data_authorized', 'trading_access', 'automatic_paid_fallback']) {
    assert.equal(a[key], false, key);
  }
  assert.equal(a.additional_cost_eur, 0);
  assert.equal(state.summary.additional_cost_eur, 0);
  assert.deepEqual(state.summary.human_required, []);
});

test('summary counts match item-level terminal evidence exactly', () => {
  const counts = state.items.reduce((acc, item) => {
    acc[item.state] = (acc[item.state] || 0) + 1;
    return acc;
  }, {});
  assert.equal(counts.FULL_PREPROD, 20);
  assert.equal(counts.TERMINAL_REFERENCE_ONLY, 2);
  assert.equal(counts.TERMINAL_HOLD, 2);
  assert.equal(state.summary.full_preprod, 20);
  assert.equal(state.summary.terminal_reference_only, 2);
  assert.equal(state.summary.terminal_hold, 2);
  assert.equal(state.summary.active_unresolved, 0);
  assert.equal(state.summary.next, 'NORMALIZE_PER_ITEM_STATUS_25_184_FROM_CURRENT_REGISTRY_EVIDENCE');
});
