import test from 'node:test';
import assert from 'node:assert/strict';
import { loadReadinessBenchmarks,evaluateUniversalMediaStudioReadiness,assertUniversalMediaStudioReady } from '../runtime/readiness-gate.mjs';

test('UMS readiness is fail-closed until all 12 physical benchmarks pass with evidence',()=>{
  const doc=loadReadinessBenchmarks();
  const result=evaluateUniversalMediaStudioReadiness(doc);
  assert.equal(result.total_required,12);
  assert.equal(result.ready,false);
  assert.equal(result.incomplete.length,12);
  assert.throws(()=>assertUniversalMediaStudioReady(doc),/UNIVERSAL_MEDIA_STUDIO_NOT_READY/);
});

test('synthetic all-green fixture becomes ready only with evidence refs',()=>{
  const doc=loadReadinessBenchmarks();
  for(const b of doc.benchmarks){b.state='PASS_WITH_EVIDENCE';b.evidence_ref=`EVID-${b.id}`;}
  const result=evaluateUniversalMediaStudioReadiness(doc);
  assert.equal(result.ready,true);
  assert.equal(result.passed_with_evidence,12);
});
