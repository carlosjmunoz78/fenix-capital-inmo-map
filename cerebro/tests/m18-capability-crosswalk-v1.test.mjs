import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyEvidence, aggregateReports, auditCapability } from '../digital-build/m18-capability-crosswalk-v1.mjs';

test('strong physical evidence is REUSE candidate, never final decision',()=>{
  const r=classifyEvidence([
    {kind:'runtime'},{kind:'test'},{kind:'registry'},{kind:'docs'}
  ]);
  assert.equal(r.evidence_state,'EXISTING_STRONG_EVIDENCE');
  assert.equal(r.disposition_candidate,'REUSE');
  assert.equal(r.confidence,'HIGH');
  assert.equal(r.final_decision,false);
});

test('partial runtime evidence is EXTEND candidate',()=>{
  const r=classifyEvidence([{kind:'runtime'}]);
  assert.equal(r.disposition_candidate,'EXTEND');
  assert.equal(r.final_decision,false);
});

test('no evidence is BUILD candidate only',()=>{
  const r=classifyEvidence([]);
  assert.equal(r.evidence_state,'NO_PHYSICAL_EVIDENCE');
  assert.equal(r.disposition_candidate,'BUILD');
  assert.equal(r.final_decision,false);
});

test('real M18 capability audit is PREPROD and zero-cost guarded',()=>{
  const r=auditCapability('multimedia_factory');
  assert.equal(r.environment,'PREPROD');
  assert.equal(r.guards.prod_write,false);
  assert.equal(r.guards.paid_ai,false);
  assert.equal(r.guards.trading,false);
  assert.equal(r.guards.additional_cost_eur,0);
  assert.ok(r.evidence_hits>0);
});

test('aggregate keeps candidate decisions non-final',()=>{
  const base={version:'m18-capability-crosswalk-v1',report_fingerprint:'x'};
  const a=aggregateReports([
    {...base,capability_family:'a',disposition_candidate:'REUSE'},
    {...base,capability_family:'b',disposition_candidate:'BUILD'}
  ]);
  assert.equal(a.capability_count,2);
  assert.equal(a.disposition_candidates.REUSE,1);
  assert.equal(a.disposition_candidates.BUILD,1);
  assert.equal(a.final_decisions_made,0);
  assert.equal(a.safety.prod_write,false);
});
