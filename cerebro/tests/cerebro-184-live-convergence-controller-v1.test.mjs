import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseRange,
  validateConvergenceLedger,
  runConvergenceController
} from '../skills/cerebro-184-live-convergence-controller-v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const ledgerPath = path.join(repoRoot, 'cerebro/skills/cerebro-184-live-convergence.v2.json');

function loadLedger() {
  return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
}

test('canonical ranges cover exactly 184 capabilities with no duplicate or missing item', () => {
  const report = runConvergenceController({ ledgerPath, repoRoot });
  assert.equal(report.status, 'GREEN_COVERAGE_ACTIVE_CONVERGENCE');
  assert.equal(report.catalog_size, 184);
  assert.equal(report.covered_items, 184);
  assert.equal(report.coverage_complete, true);
  assert.equal(report.blocks_total, 17);
});

test('production, trading, external code, customer data and paid fallback stay denied', () => {
  const ledger = loadLedger();
  const report = validateConvergenceLedger(ledger, { repoRoot, checkFiles: true });
  assert.equal(ledger.authority.prod_authorized, false);
  assert.equal(ledger.authority.prod_write_authorized, false);
  assert.equal(ledger.authority.external_skill_code_execution_authorized, false);
  assert.equal(ledger.authority.customer_data_authorized, false);
  assert.equal(ledger.authority.trading_access, false);
  assert.equal(ledger.authority.automatic_paid_fallback, false);
  assert.equal(ledger.authority.additional_cost_eur, 0);
  assert.equal(report.prod.authorized, false);
  assert.equal(report.prod.write_authorized, false);
  assert.equal(report.trading_access, false);
  assert.equal(report.additional_cost_eur, 0);
});

test('main remains integration-only and Cloudflare production branch remains isolated', () => {
  const report = runConvergenceController({ ledgerPath, repoRoot });
  assert.equal(report.prod.cloudflare_production_branch, 'deploy/cloudflare-prod');
  assert.equal(report.prod.main_is_production_branch, false);
});

test('all declared current-main evidence files physically exist', () => {
  const ledger = loadLedger();
  for (const block of ledger.blocks) {
    for (const relative of [block.registry, block.item_level_reconciliation].filter(Boolean)) {
      assert.equal(fs.existsSync(path.join(repoRoot, relative)), true, relative);
    }
  }
});

test('item-level FULL/REMAINING advance only from explicit normalized counts', () => {
  const report = runConvergenceController({ ledgerPath, repoRoot });
  assert.equal(report.full_item_count, 50);
  assert.equal(report.remaining_item_count, 134);
  assert.match(report.item_count_reason, /normalized/i);
});

test('items 1-50 are normalized at justified scope and next is 51-184 normalization', () => {
  const report = runConvergenceController({ ledgerPath, repoRoot });
  assert.equal(report.next, 'NORMALIZE_PER_ITEM_STATUS_51_184_FROM_CURRENT_REGISTRY_EVIDENCE');
  assert.deepEqual(report.blocks_terminal_at_declared_scope.slice(0, 2), ['1-12', '13-24']);
  assert.equal(report.blocks_active_or_partial.some((block) => block.range === '25-37'), true);
  assert.equal(report.blocks_active_or_partial.some((block) => block.range === '38-50'), true);
  assert.notEqual(report.blocks_active_or_partial[0]?.range, '1-12');
  assert.notEqual(report.blocks_active_or_partial[0]?.range, '13-24');
});

test('range parser fails closed on malformed ranges', () => {
  assert.deepEqual(parseRange('25-37'), { start: 25, end: 37, count: 13 });
  assert.throws(() => parseRange('37-25'), /INVALID_RANGE/);
  assert.throws(() => parseRange('bad'), /INVALID_RANGE/);
});

test('coverage validation fails closed if an item range is removed', () => {
  const ledger = loadLedger();
  ledger.blocks = ledger.blocks.filter((block) => block.range !== '176-184');
  assert.throws(
    () => validateConvergenceLedger(ledger, { repoRoot, checkFiles: false }),
    /MISSING_ITEMS/
  );
});

test('normalization counts fail closed if they do not sum to 184', () => {
  const ledger = loadLedger();
  ledger.remaining_item_normalization_count = 133;
  assert.throws(
    () => validateConvergenceLedger(ledger, { repoRoot, checkFiles: false }),
    /ITEM_NORMALIZATION_COUNTS_MUST_SUM_TO_CATALOG/
  );
});

test('authority validation fails closed on accidental PROD expansion', () => {
  const ledger = loadLedger();
  ledger.authority.prod_write_authorized = true;
  assert.throws(
    () => validateConvergenceLedger(ledger, { repoRoot, checkFiles: false }),
    /AUTHORITY_MUST_REMAIN_FALSE:prod_write_authorized/
  );
});
