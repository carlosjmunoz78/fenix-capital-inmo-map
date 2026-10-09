import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { certifyStep6DomainPromotionClosure } from '../runtime/step6-domain-promotion-closure.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DISPOSITIONS_PATH = path.resolve(HERE, '../registry/step6-domain-promotion-dispositions.v0.json');

test('Step 6 closes only when all 10 domains are classified and authority remains bounded', () => {
  const r = certifyStep6DomainPromotionClosure();
  assert.equal(r.ok, true);
  assert.equal(r.status, 'STEP6_DOMAIN_PROMOTION_CLOSED_SAFE');
  assert.equal(r.macro_step, '6/6');
  assert.equal(r.classified_domains, 10);
  assert.deepEqual(r.autonomous_preprod, ['AUTO-001','LRN-001']);
  assert.equal(r.assisted_or_hold, 8);
  assert.equal(r.prod_authorized, false);
  assert.equal(r.prod_write_authorized, false);
  assert.equal(r.business_execution_authorized, false);
  assert.equal(r.trading_access, false);
  assert.equal(r.multicompany_continuation, false);
  assert.equal(r.additional_cost_eur, 0);
  assert.equal(r.browser_binding_is_separate_step4_gate, true);
});

test('assisted domains remain explicit evidence-backed HOLDs and SEO keeps its physical reconciliation gate', () => {
  const c = JSON.parse(fs.readFileSync(DISPOSITIONS_PATH,'utf8'));
  const assisted = c.dispositions.filter(x=>x.policy_mode==='ASSISTED');
  assert.equal(assisted.length, 8);
  for (const d of assisted) {
    assert.match(d.decision, /^HOLD_/);
    assert.ok(d.remaining_blocker && d.remaining_blocker.length > 20);
    assert.equal(d.prod_authority, false);
  }
  const seo = c.dispositions.find(x=>x.engine_id==='SEO-001');
  assert.equal(seo.decision, 'HOLD_CORE_GUARD_CANONICAL_RECONCILIATION');
  assert.match(seo.remaining_blocker, /CORE_GUARD_CANONICAL_RECONCILIATION_BEFORE_PROD_PROMOTION/);
});

test('closure does not escalate HOLD dispositions to HUMAN_REQUIRED or global/PROD autonomy', () => {
  const c = JSON.parse(fs.readFileSync(DISPOSITIONS_PATH,'utf8'));
  for (const d of c.dispositions) {
    assert.equal(Object.hasOwn(d, 'human_required'), false);
    assert.notEqual(d.decision, 'HUMAN_REQUIRED');
  }
  assert.equal(c.global_status, 'STEP6_CLOSED_SAFE');
  assert.equal(c.prod_authorized, false);
  assert.equal(c.prod_write_authorized, false);
  assert.equal(c.business_execution_authorized, false);
  assert.equal(c.paid_fallback, false);
  assert.equal(c.additional_cost_eur, 0);
});
