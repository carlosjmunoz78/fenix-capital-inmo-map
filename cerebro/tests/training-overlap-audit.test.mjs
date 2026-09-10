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
  assert.ok(audit.constraints.includes('No Trading execution, credentials or critical-resource mutation'));
});

test('Training cloud location is recorded without claiming live resource inventory', () => {
  assert.deepEqual(audit.known_cloud_projects, [
    'fenix-trading-lab',
    'fenix-capital-455809',
    'fenix-inmobiliaria',
    'fenix-capital-make-web-y-seo',
  ]);
  assert.equal(audit.training_cloud_location.project_id, 'fenix-trading-lab');
  assert.equal(audit.training_cloud_location.evidence_status, 'USER_CONFIRMED_REQUIRES_LIVE_AUDIT');
  assert.equal(audit.training_cloud_location.resource_inventory_status, 'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(audit.training_cloud_location.trading_resource_boundary_required, true);
});

test('Google Cloud access gate is read-only first and secrets remain out of repo', () => {
  assert.equal(audit.access_control_gate.status, 'PLANNED');
  assert.equal(audit.access_control_gate.read_only_first, true);
  assert.equal(audit.access_control_gate.secrets_in_repo, false);
  assert.equal(audit.access_control_gate.least_privilege_required, true);
  assert.equal(audit.access_control_gate.credential_broker_or_reference_required, true);
  assert.deepEqual(audit.access_control_gate.preferred_order, [
    'existing Google Cloud API access',
    'authorized MCP/connector',
    'gcloud/script with least privilege',
    'new connector via FACT-001 only if a real gap remains',
  ]);
});

test('Training-first audit does not claim operational gates without evidence', () => {
  for (const state of Object.values(audit.gates)) assert.equal(state, 'PLANNED');
  assert.equal(audit.status, 'DOCUMENTED_PARTIAL');
});
