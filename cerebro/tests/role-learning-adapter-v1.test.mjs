import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listRoleProfiles } from '../roles/role-knowledge-runtime-v1.mjs';
import {
  ROLE_LEARNING_ADAPTER_V1_CONTRACT,
  buildRoleLearningSignal,
  buildRoleLearningEventReport,
  runRoleLearningProposalOnce
} from '../roles/role-learning-adapter-v1.mjs';

function base(role_id, overrides = {}) {
  return {
    role_id,
    company_id: 'fenix',
    environment: 'PREPROD',
    version: '1.0.0',
    observed_at: '2026-10-22T13:00:00.000Z',
    evidence_refs: [`test:${role_id.toLowerCase()}`],
    proposed_knowledge_delta: { rule: `retain evidence-backed improvement for ${role_id}` },
    observed_outcome: { status: 'GREEN' },
    ...overrides
  };
}

function tempLedger() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-role-learning-'));
  return { dir, ledger: path.join(dir, 'state', 'learning.v8') };
}

test('adapter contract binds only to canonical LRN-001 ingress/worker and keeps zero authority', () => {
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.engine_id, 'LRN-001');
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.ingress, 'cerebro/runtime/universal-learning-ingress.mjs');
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.worker, 'cerebro/runtime/rsi-learning-worker.mjs');
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.proposal_only, true);
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.auto_apply, false);
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.evaluation_required, true);
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.tribunal_required, true);
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.authority_delta, false);
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.prod_authorized, false);
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.prod_write_authorized, false);
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.trading_access, false);
  assert.equal(ROLE_LEARNING_ADAPTER_V1_CONTRACT.additional_cost_eur, 0);
});

test('all 11 verified roles produce canonical governed LRN learning events', () => {
  const roles = listRoleProfiles();
  assert.equal(roles.length, 11);
  for (const role of roles) {
    const report = buildRoleLearningEventReport(base(role.role_id));
    assert.equal(report.events_total, 1);
    const event = report.events[0];
    assert.equal(event.company_id, 'fenix');
    assert.equal(event.environment, 'PREPROD_CANDIDATE');
    assert.equal(event.payload.role_id, role.role_id);
    assert.equal(event.payload.knowledge_pack_id, role.knowledge_pack_id);
    assert.equal(event.payload.proposal_only, true);
    assert.equal(event.payload.auto_apply, false);
    assert.equal(event.payload.direct_knowledge_mutation, false);
    assert.equal(event.payload.evaluation_required, true);
    assert.equal(event.payload.tribunal_required, true);
    assert.deepEqual(event.payload.learning_pipeline, ['LRN-001', 'EVA-001', 'JDG-001']);
    assert.equal(event.prod_authorized, false);
    assert.equal(event.prod_write_authorized, false);
    assert.equal(event.trading_access, false);
    assert.equal(event.additional_cost_eur, 0);
  }
});

test('same role/evidence/delta is idempotent even when observation time changes', () => {
  const first = buildRoleLearningEventReport(base('ENG-ARCHITECT'));
  const second = buildRoleLearningEventReport(base('ENG-ARCHITECT', { observed_at: '2026-10-22T13:05:00.000Z' }));
  assert.equal(first.events[0].event_id, second.events[0].event_id);
  assert.equal(first.events[0].signal_id, second.events[0].signal_id);
});

test('role learning rejects unknown roles, PROD, unverified engines and authority/evaluation bypasses', () => {
  assert.throws(() => buildRoleLearningSignal(base('DIRECTOR-FAKE')), /unknown role_id/);
  assert.throws(() => buildRoleLearningSignal(base('ENG-CODE', { environment: 'PROD' })), /exact PREPROD/);
  assert.throws(() => buildRoleLearningSignal(base('ENG-CODE', { engine_id: 'SEO-001' })), /not verified for role/);
  assert.throws(() => buildRoleLearningSignal(base('ENG-CODE', { requested_authority: { prod_write: true } })), /authority escalation forbidden/);
  assert.throws(() => buildRoleLearningSignal(base('ENG-CODE', { auto_apply: true })), /bypass forbidden/);
  assert.throws(() => buildRoleLearningSignal(base('ENG-CODE', { skip_evaluation: true })), /bypass forbidden/);
  assert.throws(() => buildRoleLearningSignal(base('ENG-CODE', { skip_tribunal: true })), /bypass forbidden/);
});

test('role learning rejects secrets/customer data/nonzero cost before LRN ingress', () => {
  assert.throws(() => buildRoleLearningEventReport(base('ENG-SECURITY', { contains_customer_data: true })), /customer data forbidden/);
  assert.throws(() => buildRoleLearningEventReport(base('ENG-SECURITY', { contains_secrets: true })), /secrets forbidden/);
  assert.throws(() => buildRoleLearningEventReport(base('ENG-SECURITY', { additional_cost_eur: 0.01 })), /incremental cost must be zero/);
  assert.throws(() => buildRoleLearningEventReport(base('ENG-SECURITY', { proposed_knowledge_delta: { access_token: 'never' } })), /FORBIDDEN_KEY/);
});

test('sales executive can learn evidence while remaining PLAN_ONLY with no outreach/CRM authority gain', () => {
  const report = buildRoleLearningEventReport(base('AGT-SALES-EXECUTIVE', {
    engine_id: 'SALE-001',
    proposed_knowledge_delta: { objection_pattern: 'prefer approval-ready draft before any external action' }
  }));
  const event = report.events[0];
  assert.equal(event.engine_id, 'SALE-001');
  assert.equal(event.payload.role_state, 'PLAN_ONLY');
  assert.equal(event.payload.proposal_only, true);
  assert.equal(event.prod_authorized, false);
  assert.equal(event.prod_write_authorized, false);
});

test('role proposal physically persists through existing LRN worker and replay is idempotent', () => {
  const { dir, ledger } = tempLedger();
  try {
    const input = base('ENG-QA', {
      ledger_file: ledger,
      preprod_version: '1.0.0',
      policy_pass: true,
      security_pass: true,
      local_persistence_enabled: true,
      proposed_knowledge_delta: { regression_rule: 'require OLD-vs-NEW evidence before promotion' }
    });
    const first = runRoleLearningProposalOnce(input);
    assert.equal(first.status, 'GREEN');
    assert.equal(first.persisted_total, 1);
    assert.equal(first.held_total, 0);
    assert.equal(first.role_id, 'ENG-QA');
    assert.equal(first.proposal_only, true);
    assert.equal(first.auto_apply, false);
    assert.equal(first.evaluation_required, true);
    assert.equal(first.tribunal_required, true);
    assert.equal(first.prod_authorized, false);
    assert.equal(first.trading_access, false);
    assert.equal(first.additional_cost_eur, 0);
    assert.equal(fs.existsSync(ledger), true);

    const second = runRoleLearningProposalOnce(input);
    assert.equal(second.status, 'GREEN');
    assert.equal(second.persisted_total, 0);
    assert.equal(second.duplicates_total, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('HIGH risk role learning is held as HUMAN_REQUIRED rather than auto-applied', () => {
  const { dir, ledger } = tempLedger();
  try {
    const result = runRoleLearningProposalOnce(base('ENG-SECURITY', {
      ledger_file: ledger,
      preprod_version: '1.0.0',
      policy_pass: true,
      security_pass: true,
      local_persistence_enabled: true,
      risk_class: 'HIGH',
      severity: 'HIGH',
      proposed_knowledge_delta: { security_rule: 'candidate requires human high-risk review' }
    }));
    assert.equal(result.status, 'PARTIAL_HELD');
    assert.equal(result.persisted_total, 0);
    assert.equal(result.held_total, 1);
    assert.deepEqual(result.human_required, ['HIGH_RISK']);
    assert.equal(result.auto_apply, false);
    assert.equal(result.prod_authorized, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
