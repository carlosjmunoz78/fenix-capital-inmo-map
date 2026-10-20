import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));

test('WEB-001 is recorded as an existing PROD surface without authorizing a mutation now', async () => {
  const state = await loadJson('../registry/external-system-state.v1.json');

  assert.equal(state.web_001.evidence_state, 'CONFIRMED_OPERATIONAL');
  assert.equal(state.web_001.system_exists, true);
  assert.equal(state.web_001.environment, 'PROD');
  assert.equal(state.web_001.url, 'https://fenixcapital.es');
  assert.equal(state.web_001.live_readonly_check.result, 'REACHABLE_EXISTING_PROD_SURFACE');
  assert.equal(state.web_001.planned_change.date, '2026-10-21');
  assert.equal(state.web_001.planned_change.status, 'PLANIFICADO');
  assert.equal(state.web_001.mutation_now_authorized, false);
});

test('LAB-TRD exists in isolated Google Cloud scope while real-capital and CEREBRO access stay fail-closed', async () => {
  const state = await loadJson('../registry/external-system-state.v1.json');

  assert.equal(state.lab_trd.evidence_state, 'DOCUMENTED_PARTIAL');
  assert.equal(state.lab_trd.system_exists, true);
  assert.equal(state.lab_trd.runtime_location, 'GOOGLE_CLOUD');
  assert.equal(state.lab_trd.gcp_project, 'fenix-trading-lab');
  assert.equal(state.lab_trd.gcp_vm, 'cerebro-trading-lab');
  assert.equal(state.lab_trd.isolated, true);
  assert.equal(state.lab_trd.cerebro_trading_access, false);
  assert.equal(state.lab_trd.historical_operational_evidence.shadow_automatic, 'ACTIVE');
  assert.equal(state.lab_trd.historical_operational_evidence.alpaca_paper, 'ARMED_AND_ACTIVE_BEHIND_GATES');
  assert.equal(state.lab_trd.historical_operational_evidence.real_capital_authorized, false);
  assert.equal(state.lab_trd.historical_operational_evidence.current_health_revalidated_on_2026_10_20, false);
});

test('integral Trading tuning remains gated by physical browser and PC E2E closure', async () => {
  const state = await loadJson('../registry/external-system-state.v1.json');
  const accessBoot = await loadJson('../registry/accessboot-universal-end-state.v1.json');

  assert.deepEqual(state.lab_trd.integral_tuning_or_authority_expansion_blocked_until, [
    'BROWSER_CONTROL_E2E_CONFIRMED',
    'PC_CONTROL_E2E_CONFIRMED'
  ]);
  assert.equal(state.device_control.evidence_state, 'PARCIAL');
  assert.equal(state.device_control.fail_closed, true);
  assert.equal(accessBoot.trading_dependency.trading_system_exists, true);
  assert.equal(accessBoot.trading_dependency.trading_access, false);
  assert.equal(accessBoot.trading_access, false);
  assert.equal(accessBoot.prod_authorized, false);
});

test('correction remains zero-cost and does not record raw secrets', async () => {
  const state = await loadJson('../registry/external-system-state.v1.json');

  assert.equal(state.additional_cost_target_eur, 0);
  assert.equal(state.secrets_recorded, false);
  assert.deepEqual(state.human_required_set, [
    'LEGAL_REQUIRED',
    'SIGNATURE_REQUIRED',
    'LOW_CONFIDENCE',
    'HIGH_RISK',
    'POLICY_CONFLICT',
    'SECURITY_INCIDENT',
    'MONEY_LIMIT',
    'CUSTOMER_HUMAN_REQUEST'
  ]);
});
