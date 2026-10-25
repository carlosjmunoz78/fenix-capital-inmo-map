import test from 'node:test';
import assert from 'node:assert/strict';
import { loadReadinessBenchmarks,evaluateUniversalMediaStudioReadiness,assertUniversalMediaStudioReady } from '../runtime/readiness-gate.mjs';

test('UMS readiness remains fail-closed with BM-01 and BM-04 proven and 10 benchmarks incomplete',()=>{
  const doc=loadReadinessBenchmarks();
  const result=evaluateUniversalMediaStudioReadiness(doc);
  assert.equal(result.total_required,12);
  assert.equal(result.ready,false);
  assert.equal(result.passed_with_evidence,2);
  assert.equal(result.incomplete.length,10);
  assert.equal(result.incomplete.includes('BM-01'),false);
  assert.equal(result.incomplete.includes('BM-04'),false);
  assert.equal(result.incomplete.includes('BM-02'),true);
  const bm01=doc.benchmarks.find((b)=>b.id==='BM-01');
  const bm04=doc.benchmarks.find((b)=>b.id==='BM-04');
  assert.equal(bm01.state,'PASS_WITH_EVIDENCE');
  assert.equal(bm04.state,'PASS_WITH_EVIDENCE');
  assert.match(bm01.evidence_ref,/^git:[0-9a-f]{40}:cerebro\/media-studio\/v2\/evidence\/bm01-pass-with-evidence-2026-10-25\.json$/);
  assert.match(bm04.evidence_ref,/^git:[0-9a-f]{40}:cerebro\/media-studio\/v2\/evidence\/bm04-pass-with-evidence-2026-10-25\.json$/);
  assert.throws(()=>assertUniversalMediaStudioReady(doc),/UNIVERSAL_MEDIA_STUDIO_NOT_READY/);
});

test('synthetic all-green fixture becomes ready only with evidence refs',()=>{
  const doc=loadReadinessBenchmarks();
  for(const b of doc.benchmarks){b.state='PASS_WITH_EVIDENCE';b.evidence_ref=`EVID-${b.id}`;}
  const result=evaluateUniversalMediaStudioReadiness(doc);
  assert.equal(result.ready,true);
  assert.equal(result.passed_with_evidence,12);
});
