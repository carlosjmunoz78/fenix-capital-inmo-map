import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const fromRoot = (...parts) => path.join(repoRoot, ...parts);
const readJson = (...parts) => JSON.parse(fs.readFileSync(fromRoot(...parts), 'utf8'));
const readText = (...parts) => fs.readFileSync(fromRoot(...parts), 'utf8');

const convergence = readJson('cerebro', 'skills', 'cerebro-184-live-convergence.v3.json');
const b20 = readJson('cerebro', 'registry', 'universal-skill-b20-p0-acceptance-and-scale-release.v1.json');
const intake = readText('.github', 'workflows', 'cerebro-universal-skill-continuous-intake-v1.yml');
const batch = readText('cerebro', 'runtime', 'universal-skill-batch-orchestrator-v1.mjs');
const autoEngineering = readText('cerebro', 'runtime', 'universal-skill-auto-engineering-v1.mjs');

test('FACT-001 P0 freezes the complete 184-item catalog without false FULL', () => {
  assert.equal(convergence.environment, 'PREPROD');
  assert.equal(convergence.catalog_size, 184);
  assert.equal(convergence.normalized_item_count, 184);
  assert.equal(convergence.remaining_item_normalization_count, 0);
  assert.equal(convergence.full_catalog_reconciled, true);
  assert.equal(convergence.all_184_physically_active, false);
  assert.equal(convergence.remaining_physical_gates.length, 4);

  const ids = new Set(convergence.remaining_physical_gates.map((gate) => gate.id));
  for (const id of ['ANDROID_48_183', 'WATCH_LEARN_47', 'COMPET_57_61', 'CAP_62_68']) {
    assert.equal(ids.has(id), true, `missing governed physical gate ${id}`);
  }
});

test('FACT-001 P0 preserves authority, cost and safety boundaries', () => {
  const authority = convergence.authority;
  assert.equal(authority.prod_authorized, false);
  assert.equal(authority.prod_write_authorized, false);
  assert.equal(authority.auto_merge_authorized, false);
  assert.equal(authority.external_skill_code_execution_authorized, false);
  assert.equal(authority.customer_data_authorized, false);
  assert.equal(authority.trading_access, false);
  assert.equal(authority.automatic_paid_fallback, false);
  assert.equal(authority.additional_cost_eur, 0);
  assert.equal(convergence.b3_server_write_e2e.prod_touched, false);
  assert.equal(convergence.b3_server_write_e2e.additional_cost_eur, 0);
});

test('B20 proves candidate-free generic factory behavior and recovery invariants', () => {
  assert.equal(b20.environment, 'PREPROD');
  assert.equal(b20.status, 'B20_GREEN_PREPROD');
  assert.equal(b20.acceptance.new_candidate_without_candidate_specific_core_proven, true);
  assert.equal(b20.acceptance.terminal_truth_proven, true);
  assert.equal(b20.acceptance.idempotency_proven, true);
  assert.equal(b20.acceptance.rollback_rebuild_proven, true);
  assert.equal(b20.acceptance.full_without_binding_forbidden, true);
  assert.equal(b20.authority.prod_authorized, false);
  assert.equal(b20.authority.auto_merge_authorized, false);
  assert.equal(b20.authority.additional_cost_eur, 0);
});

test('mass intake and engineering remain generic and engine-routed', () => {
  assert.match(intake, /cerebro_skill_intake/);
  assert.match(intake, /PREPROD/);
  assert.match(batch, /UNIVERSAL_SKILL_ACTIVATION_V1/);
  assert.match(batch, /mapConcurrent/);
  assert.match(autoEngineering, /FIRST_PARTY_SOFTWARE_ENGINEERING_SAFE_WRAP_V1/);
  assert.match(convergence.learning_policy, /FACT-001 routes capabilities into existing engines/);
  assert.match(convergence.learning_policy, /No skill is forced into every engine/);
  assert.match(convergence.active_policy, /HOLD, LAB, reference-only, simulation and scaffold items remain intentionally non-active/);
});
