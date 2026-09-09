import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inventory = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../evidence/observability-audit-finops-inventory-v0.json'), 'utf8'));

test('OBSERV/AUD/FINOPS inventory is read-only PREPROD evidence and does not overclaim autonomy', () => {
  assert.equal(inventory.audit_type, 'READ_ONLY_INVENTORY');
  assert.equal(inventory.environment, 'PREPROD');
  assert.equal(inventory.additional_cost_target_eur, 0);
  assert.equal(inventory.autonomous_prod, false);
  assert.deepEqual(Object.keys(inventory.engines).sort(), ['AUD-001', 'FINOPS-001', 'OBSERV-001']);
  for (const engine of Object.values(inventory.engines)) {
    assert.equal(engine.evidence_state, 'DOCUMENTED_PARTIAL');
    assert.ok(engine.existing.length > 0);
    assert.ok(engine.gaps.length > 0);
  }
});

test('inventory preserves App, SharedRuntime, Supabase cost boundary and Trading isolation', () => {
  assert.deepEqual(inventory.preservation, {
    app_fenix_feature_code_touched: false,
    shared_runtime_replaced: false,
    supabase_heavy_logs_added: false,
    new_paid_service_added: false,
    trading_boundary_changed: false
  });
  assert.match(inventory.next_safe_scope, /parallel PREPROD local\/self-hosted/);
});
