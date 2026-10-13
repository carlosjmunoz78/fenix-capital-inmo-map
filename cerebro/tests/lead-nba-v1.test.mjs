import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from '../runtime/durable-worker-runner-v1.mjs';
import { evaluateLead, leadScoreAndNbaJobHandler, LEAD_NBA_V1_CONTRACT } from '../revenue/lead-nba-v1.mjs';

const CTX = Object.freeze({ company_id: 'fenix', engine_id: 'LEAD-001', environment: 'PREPROD', version: 'v1' });

function base(overrides = {}) {
  return {
    context: CTX,
    lead_ref: 'crm:lead:synthetic-001',
    source: 'WEB_FORM',
    signals: {
      profile_fit: 82,
      explicit_intent: 90,
      behavioral_intent: 80,
      urgency: 78,
      contactability: 90,
      source_quality: 92,
      evidence_coverage: 88,
      recency: 95,
      engagement: 80,
      negative_signal: 0
    },
    evidence_refs: ['evt:web:001','crm:signal:001'],
    contact_permission: 'ALLOWED',
    estimated_value_eur: 3500,
    ...overrides
  };
}

test('same normalized evidence produces deterministic scores, action and decision id', () => {
  const a = evaluateLead(base());
  const b = evaluateLead(base({ evidence_refs: ['crm:signal:001','evt:web:001'] }));
  assert.deepEqual(a, b);
  assert.equal(a.status, 'OK');
  assert.equal(a.next_best_action.action, 'CONTACT_NOW');
  assert.equal(a.next_best_action.target_engine, 'SALE-001');
  assert.equal(a.next_best_action.target_sla_minutes, 5);
  assert.equal(a.next_best_action.autonomous_contact_allowed, true);
  assert.equal(a.side_effects_executed, false);
  assert.equal(a.additional_cost_eur, 0);
});

test('negative evidence reduces intent and priority rather than being ignored', () => {
  const clean = evaluateLead(base());
  const negative = evaluateLead(base({ signals: { ...base().signals, negative_signal: 100 } }));
  assert.ok(negative.scores.intent_score < clean.scores.intent_score);
  assert.ok(negative.scores.priority_score < clean.scores.priority_score);
  assert.ok(negative.scores.conversion_propensity_score < clean.scores.conversion_propensity_score);
});

test('unknown or denied contact permission blocks autonomous contact before commercial priority', () => {
  const unknown = evaluateLead(base({ contact_permission: 'UNKNOWN' }));
  assert.equal(unknown.next_best_action.action, 'VERIFY_CONTACT_PERMISSION');
  assert.equal(unknown.next_best_action.autonomous_contact_allowed, false);
  const denied = evaluateLead(base({ contact_permission: 'DENIED' }));
  assert.equal(denied.next_best_action.action, 'DO_NOT_CONTACT');
  assert.equal(denied.next_best_action.autonomous_contact_allowed, false);
});

test('explicit customer request prioritizes immediate contact once confidence/contactability are adequate', () => {
  const result = evaluateLead(base({
    contact_permission: 'CUSTOMER_REQUESTED_CONTACT',
    signals: { ...base().signals, profile_fit: 20, explicit_intent: 20, behavioral_intent: 10, urgency: 10, engagement: 10 }
  }));
  assert.equal(result.next_best_action.action, 'CONTACT_NOW');
  assert.equal(result.next_best_action.reason, 'CUSTOMER_REQUESTED_CONTACT');
  assert.equal(result.next_best_action.target_sla_minutes, 5);
});

test('low confidence asks for evidence silently instead of inventing a human exception', () => {
  const result = evaluateLead(base({ signals: { ...base().signals, source_quality: 20, evidence_coverage: 20 } }));
  assert.equal(result.status, 'OK');
  assert.equal(result.human_required, null);
  assert.equal(result.next_best_action.action, 'REQUEST_MORE_EVIDENCE');
  assert.equal(result.next_best_action.target_engine, 'LEAD-001');
});

test('canonical upstream human exception passes through while noncanonical reason fails closed', () => {
  const legal = evaluateLead(base({ human_required_reason: 'LEGAL_REQUIRED' }));
  assert.equal(legal.status, 'HUMAN_REQUIRED');
  assert.equal(legal.human_required, 'LEGAL_REQUIRED');
  assert.equal(legal.next_best_action.action, 'HUMAN_REQUIRED');
  assert.equal(legal.next_best_action.autonomous_contact_allowed, false);
  assert.throws(() => evaluateLead(base({ human_required_reason: 'PLEASE_REVIEW' })), /invalid HUMAN_REQUIRED reason/);
});

test('raw PII or secret-shaped fields are rejected rather than persisted into scoring jobs', () => {
  assert.throws(() => evaluateLead(base({ email: 'person@example.com' })), /raw PII\/secret field forbidden/);
  assert.throws(() => evaluateLead(base({ signals: { ...base().signals, phone_number: '600000000' } })), /raw PII\/secret field forbidden/);
  assert.throws(() => evaluateLead(base({ access_token: 'secret-material' })), /raw PII\/secret field forbidden/);
  assert.throws(() => evaluateLead(base({ lead_ref: 'person@example.com' })), /opaque safe reference/);
});

test('engine and environment are exact PREPROD LEAD-001 boundaries', () => {
  assert.throws(() => evaluateLead(base({ context: { ...CTX, environment: 'PROD' } })), /exact PREPROD/);
  assert.throws(() => evaluateLead(base({ context: { ...CTX, engine_id: 'SALE-001' } })), /requires context.engine_id=LEAD-001/);
  assert.throws(() => evaluateLead(base({ context: { ...CTX, company_id: '' } })), /company_id/);
});

test('commercial weighted value is explicitly heuristic and never exposed as calibrated probability', () => {
  const result = evaluateLead(base({ estimated_value_eur: 10_000 }));
  assert.ok(result.heuristic_weighted_value_eur >= 0 && result.heuristic_weighted_value_eur <= 10_000);
  assert.equal(result.calibration_state, 'UNCALIBRATED_HEURISTIC_DO_NOT_TREAT_AS_PROBABILITY');
  assert.equal(LEAD_NBA_V1_CONTRACT.probability_claim, false);
});

test('lead scoring runs through the existing durable JOB-001 worker without a bespoke scheduler', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-lead-nba-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const input = base();
  const { context, ...payload } = input;
  const enqueued = queue.enqueue({
    name: LEAD_NBA_V1_CONTRACT.job_name,
    context,
    payload,
    timeout_ms: 1000,
    idempotency_key: 'lead-score:synthetic-001'
  });
  assert.equal(enqueued.accepted, true);
  const worker = new DurableWorkerRunnerV1({
    job_runtime: queue,
    worker_id: 'revenue-worker-test',
    lease_ms: 1000,
    heartbeat_ms: 20,
    max_concurrency: 2,
    max_per_company: 1
  }).register({ name: LEAD_NBA_V1_CONTRACT.job_name, handler: leadScoreAndNbaJobHandler });
  const outcome = await worker.runOne({ context });
  assert.equal(outcome.status, 'SUCCEEDED');
  assert.equal(outcome.job.status, 'SUCCEEDED');
  assert.equal(outcome.job.result.next_best_action.action, 'CONTACT_NOW');
  const reopened = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  assert.equal(reopened.get(outcome.job.job_id).status, 'SUCCEEDED');
  assert.equal(reopened.get(outcome.job.job_id).result.decision_id, outcome.job.result.decision_id);
});

test('contract reuses canonical engines and stays zero-cost, non-PROD and side-effect free', () => {
  assert.deepEqual(LEAD_NBA_V1_CONTRACT.engines, ['LEAD-001','NBA-001']);
  assert.equal(LEAD_NBA_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(LEAD_NBA_V1_CONTRACT.deterministic_first, true);
  assert.equal(LEAD_NBA_V1_CONTRACT.ai_required, false);
  assert.equal(LEAD_NBA_V1_CONTRACT.raw_pii_allowed, false);
  assert.equal(LEAD_NBA_V1_CONTRACT.contact_side_effects, false);
  assert.equal(LEAD_NBA_V1_CONTRACT.prod_writes, false);
  assert.equal(LEAD_NBA_V1_CONTRACT.trading_access, false);
  assert.equal(LEAD_NBA_V1_CONTRACT.additional_cost_target_eur, 0);
  assert.match(LEAD_NBA_V1_CONTRACT.durable_execution, /JOB-001 durable V1/);
});
