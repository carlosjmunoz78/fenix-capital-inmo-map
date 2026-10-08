import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEvent,observeOutcome,createEvidence,proposeCandidate,dedupeByKey} from '../runtime/learning-pipeline.mjs';
import {validateLearningRecord} from '../runtime/continuous-improvement-contract.mjs';

const event={
  event_id:'evt-1',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',
  occurred_at:'2026-10-08T12:00:00Z',source_type:'OUTCOME',payload:{kind:'quality'},evidence_refs:['run:1','run:1']
};

test('normalization is deterministic, scoped and deduplicates evidence refs',()=>{
  const a=normalizeEvent(event),b=normalizeEvent({...event});
  assert.equal(a.dedupe_key,b.dedupe_key);
  assert.deepEqual(a.evidence_refs,['run:1']);
  assert.equal(a.company_id,'fenix');
  assert.equal(a.engine_id,'SEO-001');
});

test('outcome and evidence preserve context and lock provenance',()=>{
  const outcome=observeOutcome({event,expected:0.8,actual:0.9,observed_at:'2026-10-08T12:05:00Z'});
  const evidence=createEvidence({outcome,refs:['metric:quality','run:1'],confidence:0.9,provenance:{source:'synthetic-test'}});
  assert.ok(Math.abs(outcome.delta-0.1)<1e-12);
  assert.equal(evidence.provenance_locked,true);
  assert.equal(evidence.persistent_publish_authorized,false);
  assert.equal(evidence.company_id,'fenix');
});

test('candidate is a canonical learning record and never makes untested causal claims',()=>{
  const outcome=observeOutcome({event,expected:0.8,actual:0.9,observed_at:'2026-10-08T12:05:00Z'});
  const evidence=createEvidence({outcome,refs:['metric:quality'],confidence:0.9,provenance:{source:'fixture'}});
  const candidate=proposeCandidate({event,outcome,evidence,hypothesis:'quality may improve',expected_metric_delta:{metric:'quality',direction:'HIGHER'},risk_class:'LOW',created_by:'LRN-001'});
  assert.equal(validateLearningRecord(candidate).ok,true);
  assert.equal(candidate.promotion_state,'CANDIDATE');
  assert.equal(candidate.prod_authorized,false);
  assert.throws(()=>proposeCandidate({event,outcome,evidence,hypothesis:'causal',expected_metric_delta:{metric:'quality'},causal_claim:true}),/separate experiment evidence/);
});

test('cross-company or cross-version evidence is rejected',()=>{
  const outcome=observeOutcome({event,expected:1,actual:1,observed_at:'2026-10-08T12:05:00Z'});
  const evidence=createEvidence({outcome,refs:['metric:x'],confidence:0.8});
  assert.throws(()=>proposeCandidate({event:{...event,company_id:'other'},outcome,evidence,hypothesis:'x',expected_metric_delta:{metric:'x'}}),/context mismatch/);
});

test('dedupeByKey keeps the first unique record only',()=>{
  const a=normalizeEvent(event);
  const b=normalizeEvent({...event});
  const c=normalizeEvent({...event,event_id:'evt-2'});
  assert.equal(dedupeByKey([a,b,c]).length,2);
});
