import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const registry = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'registry', 'engine-registry.seed.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'gcp-training-access-contract-v0.json'), 'utf8'));

test('GCP Training access contract reuses canonical INT-001 and creates no new engine ID', () => {
  assert.equal(registry.count, 177);
  assert.ok(registry.engine_ids.includes(contract.canonical_engine_id));
  assert.equal(contract.canonical_engine_id, 'INT-001');
});

test('known Google Cloud project inventory is explicit and Training location remains audit-gated', () => {
  assert.deepEqual(contract.known_gcp_projects, [
    'fenix-trading-lab',
    'fenix-capital-455809',
    'fenix-inmobiliaria',
    'fenix-capital-make-web-y-seo',
  ]);
  assert.equal(contract.training_location.project_id, 'fenix-trading-lab');
  assert.equal(contract.training_location.resource_inventory_status, 'UNKNOWN_REQUIRES_AUDIT');
});

test('GCP access is read-only first, least privilege, zero-cost and secret-safe', () => {
  assert.equal(contract.status, 'DEFINED_NOT_BUILT');
  assert.equal(contract.environment, 'SCAFFOLD');
  assert.equal(contract.additional_cost_target_eur, 0);
  assert.equal(contract.prod_writes, false);
  assert.equal(contract.autonomous_prod, false);
  assert.equal(contract.trading_access, false);
  assert.equal(contract.access_policy.mode, 'READ_ONLY_FIRST');
  assert.equal(contract.access_policy.least_privilege, true);
  assert.equal(contract.access_policy.secrets_in_repo, false);
  assert.equal(contract.access_policy.secrets_in_logs, false);
  assert.equal(contract.access_policy.secret_transport, 'REFERENCE_OR_BROKER_ONLY');
});

test('Training and Trading must be separated before writes and preserve-first gates stay mandatory', () => {
  assert.ok(contract.safety_gates.includes('SEPARATE_TRAINING_FROM_TRADING_BEFORE_ANY_WRITE'));
  for (const gate of [
    'INVENTORY_BEFORE_CHANGE',
    'DEPENDENCY_MAP_BEFORE_CHANGE',
    'BACKUP_SNAPSHOT_BEFORE_CHANGE',
    'CURRENT_CONTRACT_BEFORE_CHANGE',
    'BEHAVIOR_TESTS_BEFORE_CHANGE',
    'PARALLEL_IMPLEMENTATION',
    'OLD_VS_NEW',
    'ROLLBACK_TESTED',
    'GRADUAL_PROMOTION',
  ]) assert.ok(contract.safety_gates.includes(gate));
});

test('human escalation contract uses exactly the canonical eight reasons', () => {
  assert.deepEqual(contract.human_required_reasons, [
    'LEGAL_REQUIRED',
    'SIGNATURE_REQUIRED',
    'LOW_CONFIDENCE',
    'HIGH_RISK',
    'POLICY_CONFLICT',
    'SECURITY_INCIDENT',
    'MONEY_LIMIT',
    'CUSTOMER_HUMAN_REQUEST',
  ]);
});
