import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audit = JSON.parse(fs.readFileSync(path.join(root, 'evidence/phase2-existing-bindings-audit.json'), 'utf8'));
const externalState = JSON.parse(fs.readFileSync(path.join(root, 'registry/external-system-state.v1.json'), 'utf8'));
const IDS = ['CORE-001','SUP-001','TRN-001','APP-001','CRM-001','DOC-001','SEO-001','WEB-001','LAB-TRD'];
const STATES = new Set(['CONFIRMED_OPERATIONAL','DOCUMENTED_PARTIAL','DEFINED_NOT_BUILT','PROPOSED','UNKNOWN_REQUIRES_AUDIT']);
const CONFIRMATION_BASES = new Set(['EXACT_SHA_WORKFLOW_PAIR','EXTERNAL_READONLY_EXISTENCE_CHECK']);

test('Phase 2 audit covers exactly the nine canonical existing-engine bindings', () => {
  assert.equal(audit.engines.length, IDS.length);
  assert.deepEqual(new Set(audit.engines.map(e => e.engine_id)), new Set(IDS));
  assert.equal(new Set(audit.engines.map(e => e.engine_id)).size, IDS.length);
});

test('Phase 2 audit is read-only, zero-cost and cannot enable PROD autonomy', () => {
  assert.equal(audit.audit_mode, 'READ_ONLY_NO_ACTIVATION');
  assert.equal(audit.prod_execution_enabled, false);
  assert.equal(audit.autonomous_prod, false);
  assert.equal(audit.additional_cost_target_eur, 0);
});

test('every evidence state is canonical and every rationale is explicit', () => {
  for (const engine of audit.engines) {
    assert.ok(STATES.has(engine.evidence_state), `${engine.engine_id} has invalid evidence state`);
    assert.equal(typeof engine.live_claim, 'boolean');
    assert.equal(typeof engine.rationale, 'string');
    assert.ok(engine.rationale.trim().length > 20);
    if (engine.evidence_state === 'CONFIRMED_OPERATIONAL') {
      assert.ok(CONFIRMATION_BASES.has(engine.confirmation_basis), `${engine.engine_id} lacks a canonical confirmation basis`);
    }
  }
});

test('exact-SHA confirmed bindings still require successful deploy and runtime evidence on one SHA', () => {
  const exactShaConfirmed = audit.engines.filter(e => e.confirmation_basis === 'EXACT_SHA_WORKFLOW_PAIR');
  assert.deepEqual(exactShaConfirmed.map(e => e.engine_id), ['APP-001']);

  for (const engine of exactShaConfirmed) {
    assert.equal(engine.evidence_state, 'CONFIRMED_OPERATIONAL');
    assert.equal(engine.live_claim, true);
    const live = engine.evidence.filter(e => e.type === 'live_exact_sha');
    assert.ok(live.length >= 2, `${engine.engine_id} lacks exact-SHA live evidence`);
    for (const item of live) {
      assert.equal(item.conclusion, 'success');
      assert.match(item.head_sha, /^[0-9a-f]{40}$/);
      assert.ok(Number.isSafeInteger(item.run_id) && item.run_id > 0);
    }
    assert.ok(live.some(e => e.workflow === 'PROD Live Deploy'));
    assert.ok(live.some(e => e.workflow === 'PROD Runtime Smoke'));
    assert.equal(new Set(live.map(e => e.head_sha)).size, 1, `${engine.engine_id} live evidence spans multiple SHAs`);
  }
});

test('APP-001 exact-SHA evidence confirms the existing App but not autonomous CEREBRO', () => {
  const app = audit.engines.find(e => e.engine_id === 'APP-001');
  assert.equal(app.evidence_state, 'CONFIRMED_OPERATIONAL');
  assert.equal(app.confirmation_basis, 'EXACT_SHA_WORKFLOW_PAIR');
  assert.match(app.rationale, /not autonomous CEREBRO|not autonomous/i);
});

test('WEB-001 may be confirmed only as an externally observed existing PROD surface with mutation disabled', () => {
  const web = audit.engines.find(e => e.engine_id === 'WEB-001');
  assert.equal(web.evidence_state, 'CONFIRMED_OPERATIONAL');
  assert.equal(web.confirmation_basis, 'EXTERNAL_READONLY_EXISTENCE_CHECK');
  assert.equal(web.live_claim, true);
  assert.equal(web.environment, 'PROD');
  assert.equal(web.mutation_now_authorized, false);

  const checks = web.evidence.filter(e => e.type === 'external_readonly_live_check');
  assert.ok(checks.length >= 1);
  assert.ok(checks.some(e => e.result === 'REACHABLE_EXISTING_PROD_SURFACE'));
  assert.match(web.rationale, /no autonomous CEREBRO mutation|no autonomous/i);

  assert.equal(externalState.web_001.evidence_state, 'CONFIRMED_OPERATIONAL');
  assert.equal(externalState.web_001.system_exists, true);
  assert.equal(externalState.web_001.environment, 'PROD');
  assert.equal(externalState.web_001.live_readonly_check.result, 'REACHABLE_EXISTING_PROD_SURFACE');
  assert.equal(externalState.web_001.mutation_now_authorized, false);
});

test('CRM and SEO remain unaudited while LAB-TRD remains partial, isolated and inaccessible to CEREBRO', () => {
  for (const id of ['CRM-001','SEO-001']) {
    const engine = audit.engines.find(e => e.engine_id === id);
    assert.equal(engine.evidence_state, 'UNKNOWN_REQUIRES_AUDIT');
    assert.equal(engine.live_claim, false);
  }

  const trading = audit.engines.find(e => e.engine_id === 'LAB-TRD');
  assert.equal(trading.evidence_state, 'DOCUMENTED_PARTIAL');
  assert.equal(trading.live_claim, false);
  assert.equal(trading.isolated, true);
  assert.equal(trading.cerebro_trading_access, false);
  assert.equal(externalState.lab_trd.evidence_state, 'DOCUMENTED_PARTIAL');
  assert.equal(externalState.lab_trd.system_exists, true);
  assert.equal(externalState.lab_trd.isolated, true);
  assert.equal(externalState.lab_trd.cerebro_trading_access, false);
});

test('partial source/document evidence cannot be mislabeled as a live claim', () => {
  for (const id of ['CORE-001','SUP-001','TRN-001','DOC-001','LAB-TRD']) {
    const engine = audit.engines.find(e => e.engine_id === id);
    assert.equal(engine.evidence_state, 'DOCUMENTED_PARTIAL');
    assert.equal(engine.live_claim, false);
  }
});
