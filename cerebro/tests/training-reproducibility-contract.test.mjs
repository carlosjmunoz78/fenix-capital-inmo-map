import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const registry = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'registry', 'engine-registry.seed.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'training-reproducibility-contract-v0.json'), 'utf8'));

const REQUIRED = [
  'inventory','dependency_map','backup_snapshot','current_contract','behavioral_tests','dataset_manifest','dataset_version','run_id','code_version','config_version','prompt_or_rule_version','metrics','evaluation_result','judge_result','champion_challenger_state','observability_references','cost_evidence','rebuild_runbook','rollback_runbook','rollback_test_result','old_vs_new_result','promotion_decision'
];

test('Training reproducibility uses only canonical engines and four canonical context keys', () => {
  assert.equal(registry.count, 177);
  for (const id of contract.training_engine_ids) assert.ok(registry.engine_ids.includes(id), `noncanonical Training engine ${id}`);
  assert.deepEqual(contract.canonical_context_keys, ['company_id','engine_id','environment','version']);
});

test('Training reproducibility evidence is complete and exact', () => {
  assert.deepEqual(contract.required_reproducibility_evidence, REQUIRED);
  assert.equal(new Set(contract.required_reproducibility_evidence).size, REQUIRED.length);
});

test('Training cannot promote directly to PROD and requires safety gates', () => {
  const p = contract.promotion_policy;
  assert.equal(p.direct_training_to_prod, false);
  for (const key of ['requires_preprod_or_equivalent_safe_gate','requires_evaluation','requires_tribunal','requires_rollback_tested','requires_backup','requires_rebuild','requires_measured_cost']) assert.equal(p[key], true, `${key} must be true`);
});

test('GCP access remains read-only-first and Trading-isolated', () => {
  assert.equal(contract.live_inventory_status, 'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(contract.gcp_safety.access_mode, 'READ_ONLY_FIRST');
  assert.equal(contract.gcp_safety.training_trading_resource_separation_required_before_write, true);
  assert.equal(contract.gcp_safety.secrets_policy, 'REFERENCES_ONLY');
  assert.equal(contract.gcp_safety.least_privilege, true);
  assert.equal(contract.additional_cost_target_eur, 0);
  assert.equal(contract.trading_access, false);
});
