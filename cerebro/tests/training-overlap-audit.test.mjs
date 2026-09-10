import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const registry = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'registry', 'engine-registry.seed.json'), 'utf8'));
const audit = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'training-overlap-audit-v0.json'), 'utf8'));

test('Training-first audit reuses only canonical engine IDs and creates no new IDs', () => {
  assert.equal(registry.count, 177);
  assert.equal(registry.engine_ids.length, 177);
  assert.equal(new Set(registry.engine_ids).size, 177);
  for (const id of audit.training_engine_ids) assert.ok(registry.engine_ids.includes(id), `noncanonical Training engine ${id}`);
  assert.deepEqual(audit.training_engine_ids, ['KNW-001', 'LRN-001', 'TRN-001', 'EVA-001', 'JDG-001', 'TRNBOOT-001']);
});

test('Training-first audit is preserve-first, scaffold-only, zero-cost and Trading-isolated', () => {
  assert.equal(audit.scope, 'TRAINING_FIRST');
  assert.equal(audit.environment, 'SCAFFOLD');
  assert.equal(audit.additional_cost_target_eur, 0);
  assert.equal(audit.autonomous_prod, false);
  assert.equal(audit.prod_writes, false);
  assert.equal(audit.trading_access, false);
  assert.equal(audit.principle, 'CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR');
  assert.ok(audit.constraints.includes('No Trading LAB access or dependency'));
});

test('Training-first audit does not claim operational gates without evidence', () => {
  for (const state of Object.values(audit.gates)) assert.equal(state, 'PLANNED');
  assert.equal(audit.status, 'DOCUMENTED_PARTIAL');
});
