import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCanvaCapability, canvaFutureBindingCandidate } from './canva-capability-router-v1.mjs';

const base = (overrides={}) => ({
  company_id:'fenix', engine_id:'SOC-001', department_id:'social-facebook', environment:'PREPROD', version:'v1',
  operation:'create_design', audit_id:'audit-canva-1', idempotency_key:'idem-canva-1', expected_cost_eur:0, ...overrides
});

test('Facebook consumes shared Canva capability without owning a Canva engine', () => {
  const out = resolveCanvaCapability(base());
  assert.equal(out.ok, true);
  assert.equal(out.capability_id, 'CREATIVE-CANVA-V1');
  assert.equal(out.engine_id, 'SOC-001');
  assert.equal(out.provider_publish_authorized, false);
});

test('current core consumers can resolve only allowlisted operations', () => {
  for (const engine_id of ['MKT-001','LAB-MKT','SEO-001','WEB-001','APP-001','TRN-001','SOCBOOT-001','MKTBOOT-001','SEOBOOT-001','APPBOOT-001']) {
    const op = engine_id === 'TRN-001' ? 'export' : 'search_designs';
    assert.equal(resolveCanvaCapability(base({engine_id, operation:op})).ok, true);
  }
  assert.equal(resolveCanvaCapability(base({engine_id:'SEO-001', operation:'edit_design'})).status, 'DENIED_OPERATION');
});

test('unknown engines fail closed and future engines get candidate only', () => {
  assert.equal(resolveCanvaCapability(base({engine_id:'FUTURE-999'})).status, 'DENIED_UNBOUND_ENGINE');
  const candidate = canvaFutureBindingCandidate({engine_id:'FUTURE-999', company_scope:'MULTI_COMPANY'});
  assert.equal(candidate.status, 'BINDING_CANDIDATE_ONLY');
  assert.equal(candidate.automatic_provider_authority, false);
});

test('publication stays with origin engine and cost stays zero', () => {
  assert.equal(resolveCanvaCapability(base({provider_publish:true})).status, 'DENIED_ORIGIN_ENGINE_AUTHORITY_REQUIRED');
  const cost = resolveCanvaCapability(base({expected_cost_eur:1}));
  assert.equal(cost.status, 'HUMAN_REQUIRED');
  assert.equal(cost.reason, 'MONEY_LIMIT');
});

test('PROD is fail closed until per-binding certification', () => {
  assert.equal(resolveCanvaCapability(base({environment:'PROD'})).status, 'HOLD_PROD_BINDING_NOT_CERTIFIED');
  assert.equal(resolveCanvaCapability(base({environment:'PROD', prod_binding_green:true})).ok, true);
});
