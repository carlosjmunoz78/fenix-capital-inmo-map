import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const filePath = path.join(repoRoot, 'cerebro/skills/cerebro-184-items-51-61-live-reconciliation.v2.json');
const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const canonicalDispositions = new Set(['REUTILIZAR', 'ENVOLVER', 'CATALOGAR', 'FABRICAR_GRATIS', 'HOLD', 'DESCARTAR', 'PAGO_JUSTIFICADO']);
const allowedStates = new Set([
  'FULL_PREPROD',
  'PARTIAL_PREPROD_ROUTE_ONLY',
  'LAB_CANDIDATE_NOT_ACTIVATED',
  'TERMINAL_HOLD',
  'LAB_REFERENCE_ONLY',
  'PARTIAL_PREPROD_SCORING_ONLY',
  'DEFINED_NOT_BUILT_CURRENT_MAIN'
]);

test('reconciliation covers exact canonical item ids 51 through 61 once', () => {
  assert.equal(state.state_type, 'CEREBRO_184_ITEMS_51_61_LIVE_RECONCILIATION_V2');
  assert.equal(state.company_id, 'GLOBAL');
  assert.equal(state.engine_id, 'FACT-001');
  assert.equal(state.environment, 'PREPROD');
  assert.equal(state.items.length, 11);
  assert.deepEqual(state.items.map((item) => item.id), Array.from({ length: 11 }, (_, index) => index + 51));
  assert.equal(new Set(state.items.map((item) => item.id)).size, 11);
});

test('every item has canonical disposition, evidence and a justified state', () => {
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
});

test('provider candidates remain metadata-only and no dependency is silently activated', () => {
  const refs = state.items.filter((item) => item.external_reference);
  assert.equal(refs.length, 3);
  for (const item of refs) {
    assert.equal(item.external_reference.external_code_executed, false, `item ${item.id} external execution`);
    assert.equal(item.external_reference.dependency_installed, false, `item ${item.id} dependency`);
  }
  assert.equal(state.authority.external_skill_code_execution_authorized, false);
  assert.equal(state.authority.external_dependency_install_authorized, false);
});

test('zero-cost and authority boundaries remain fail-closed', () => {
  const a = state.authority;
  for (const key of ['prod_authorized', 'prod_write_authorized', 'auto_merge_authorized', 'external_skill_code_execution_authorized', 'external_dependency_install_authorized', 'customer_data_authorized', 'trading_access', 'automatic_paid_fallback']) {
    assert.equal(a[key], false, key);
  }
  assert.equal(a.additional_cost_eur, 0);
  assert.equal(state.summary.additional_cost_eur, 0);
  assert.deepEqual(state.summary.human_required, []);
  assert.equal(state.items.some((item) => item.disposition === 'PAGO_JUSTIFICADO'), false);
});

test('existing multi-company post-scan engines are reused at FULL_PREPROD', () => {
  for (const id of [58, 59, 60, 61]) {
    const item = state.items.find((entry) => entry.id === id);
    assert.equal(item?.disposition, 'REUTILIZAR', `item ${id} disposition`);
    assert.equal(item?.state, 'FULL_PREPROD', `item ${id} state`);
  }
  assert.equal(state.summary.full_preprod, 4);
});

test('only current-main COMPET runtime gap is routed to FACT-001 for free build', () => {
  const compet = state.items.find((item) => item.id === 57);
  assert.equal(compet?.disposition, 'FABRICAR_GRATIS');
  assert.equal(compet?.state, 'DEFINED_NOT_BUILT_CURRENT_MAIN');
  assert.equal(compet?.owner_engine_ids.includes('COMPET-001'), true);
  assert.equal(compet?.owner_engine_ids.includes('FACT-001'), true);
  assert.equal(state.summary.fabricate_free, 1);
});

test('Apify remains HOLD and OSS adapters remain catalogued until a measured gap exists', () => {
  assert.equal(state.items.find((item) => item.id === 54)?.disposition, 'HOLD');
  for (const id of [52, 53, 55]) {
    assert.equal(state.items.find((item) => item.id === id)?.disposition, 'CATALOGAR', `item ${id}`);
  }
  assert.equal(state.summary.terminal_hold, 1);
  assert.equal(state.summary.reference_or_candidate_only, 3);
});
