import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGap, aggregate } from '../digital-build/m18-deep-gap-verifier-v1.mjs';

test('unknown non-candidate fails closed',()=>{
  assert.throws(()=>verifyGap('brand_factory'),/not a Wave2 BUILD candidate/);
});

test('wordpress deep verification sees existing governed evidence and never final-builds',()=>{
  const r=verifyGap('wordpress_factory');
  assert.equal(r.environment,'PREPROD');
  assert.equal(r.final_build_decision,false);
  assert.equal(r.guards.prod_write,false);
  assert.equal(r.guards.paid_ai,false);
  assert.equal(r.guards.trading,false);
  assert.equal(r.guards.additional_cost_eur,0);
  assert.ok(r.evidence_count>0);
  assert.notEqual(r.verified_state,'NO_EVIDENCE');
});

test('aggregate preserves non-final build policy',()=>{
  const base={report_fingerprint:'x'};
  const a=aggregate([
    {...base,capability_family:'a',verified_state:'EXISTING_PHYSICAL_STACK',disposition_candidate:'REUSE_OR_EXTEND'},
    {...base,capability_family:'b',verified_state:'NO_EVIDENCE',disposition_candidate:'BUILD_PENDING_BUSINESS_VALUE'}
  ]);
  assert.equal(a.candidate_count,2);
  assert.deepEqual(a.build_pending_business_value,['b']);
  assert.equal(a.final_build_decisions,0);
  assert.equal(a.safety.prod_write,false);
});
