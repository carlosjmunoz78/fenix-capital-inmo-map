import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audit = JSON.parse(fs.readFileSync(path.join(root, 'evidence/phase2-existing-bindings-audit.json'), 'utf8'));
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

test('CONFIRMED_OPERATIONAL requires successful exact-SHA live evidence', () => {
  const confirmed = audit.engines.filter(e => e.evidence_state === 'CONFIRMED_OPERATIONAL');
  assert.ok(confirmed.length > 0);
  for (const engine of confirmed) {
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

test('APP-001 is the only live-confirmed binding in this audit and does not imply CEREBRO autonomy', () => {
  const confirmed = audit.engines.filter(e => e.evidence_state === 'CONFIRMED_OPERATIONAL');
  assert.deepEqual(confirmed.map(e => e.engine_id), ['APP-001']);
  assert.match(confirmed[0].rationale, /not autonomous CEREBRO|not autonomous/i);
});

test('unaudited CRM SEO WEB and Trading remain unconfirmed', () => {
  for (const id of ['CRM-001','SEO-001','WEB-001','LAB-TRD']) {
    const engine = audit.engines.find(e => e.engine_id === id);
    assert.equal(engine.evidence_state, 'UNKNOWN_REQUIRES_AUDIT');
    assert.equal(engine.live_claim, false);
  }
  assert.equal(audit.engines.find(e => e.engine_id === 'LAB-TRD').isolated, true);
});

test('partial source/document evidence cannot be mislabeled as a live claim', () => {
  for (const id of ['CORE-001','SUP-001','TRN-001','DOC-001']) {
    const engine = audit.engines.find(e => e.engine_id === id);
    assert.equal(engine.evidence_state, 'DOCUMENTED_PARTIAL');
    assert.equal(engine.live_claim, false);
  }
});
