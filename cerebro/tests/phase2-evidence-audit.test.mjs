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
  }
});

test('CONFIRMED_OPERATIONAL requires an approved live evidence profile', () => {
  const confirmed = audit.engines.filter(e => e.evidence_state === 'CONFIRMED_OPERATIONAL');
  assert.ok(confirmed.length > 0);

  for (const engine of confirmed) {
    assert.equal(engine.live_claim, true);
    const exactSha = engine.evidence.filter(e => e.type === 'live_exact_sha');
    const externalReadonly = engine.evidence.filter(e => e.type === 'external_readonly_live_check');

    if (exactSha.length > 0) {
      assert.ok(exactSha.length >= 2, `${engine.engine_id} lacks complete exact-SHA live evidence`);
      for (const item of exactSha) {
        assert.equal(item.conclusion, 'success');
        assert.match(item.head_sha, /^[0-9a-f]{40}$/);
        assert.ok(Number.isSafeInteger(item.run_id) && item.run_id > 0);
      }
      assert.ok(exactSha.some(e => e.workflow === 'PROD Live Deploy'));
      assert.ok(exactSha.some(e => e.workflow === 'PROD Runtime Smoke'));
      assert.equal(new Set(exactSha.map(e => e.head_sha)).size, 1, `${engine.engine_id} live evidence spans multiple SHAs`);
      continue;
    }

    assert.equal(engine.engine_id, 'WEB-001', `${engine.engine_id} uses an unapproved non-SHA live evidence profile`);
    assert.equal(engine.environment, 'PROD');
    assert.ok(externalReadonly.length >= 1, 'WEB-001 lacks external read-only live evidence');
    assert.ok(engine.evidence.some(e => e.type === 'owner_directive'), 'WEB-001 lacks owner state correction evidence');
    for (const item of externalReadonly) {
      assert.match(item.url, /^https:\/\//);
      assert.equal(item.result, 'REACHABLE_EXISTING_PROD_SURFACE');
      assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
    }

    assert.equal(externalState.web_001.evidence_state, 'CONFIRMED_OPERATIONAL');
    assert.equal(externalState.web_001.system_exists, true);
    assert.equal(externalState.web_001.environment, 'PROD');
    assert.equal(externalState.web_001.mutation_now_authorized, false);
    assert.equal(externalState.web_001.url, externalReadonly[0].url);
    assert.equal(externalState.web_001.live_readonly_check.result, externalReadonly[0].result);
  }
});

test('APP-001 and WEB-001 are confirmed existing live surfaces without granting CEREBRO autonomy', () => {
  const confirmed = audit.engines.filter(e => e.evidence_state === 'CONFIRMED_OPERATIONAL');
  assert.deepEqual(confirmed.map(e => e.engine_id), ['APP-001', 'WEB-001']);
  const app = confirmed.find(e => e.engine_id === 'APP-001');
  const web = confirmed.find(e => e.engine_id === 'WEB-001');
  assert.match(app.rationale, /not autonomous CEREBRO|not autonomous/i);
  assert.match(web.rationale, /already exists in PROD|existing surface|not an initial deployment/i);
  assert.equal(audit.autonomous_prod, false);
  assert.equal(audit.prod_execution_enabled, false);
});

test('CRM and SEO remain unaudited while Trading remains documented-partial and isolated', () => {
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
  assert.equal(externalState.lab_trd.isolated, true);
  assert.equal(externalState.lab_trd.cerebro_trading_access, false);
});

test('partial source/document evidence cannot be mislabeled as a live claim', () => {
  for (const id of ['CORE-001','SUP-001','TRN-001','DOC-001']) {
    const engine = audit.engines.find(e => e.engine_id === id);
    assert.equal(engine.evidence_state, 'DOCUMENTED_PARTIAL');
    assert.equal(engine.live_claim, false);
  }
});
