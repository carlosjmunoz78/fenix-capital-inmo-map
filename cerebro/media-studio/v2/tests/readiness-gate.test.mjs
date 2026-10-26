import test from 'node:test';
import assert from 'node:assert/strict';
import { loadReadinessBenchmarks,evaluateUniversalMediaStudioReadiness,assertUniversalMediaStudioReady } from '../runtime/readiness-gate.mjs';

test('UMS readiness reflects persisted evidence and remains fail-closed until every required benchmark passes',()=>{
  const doc=loadReadinessBenchmarks();
  const required=doc.benchmarks.filter((b)=>b.required!==false);
  const persisted=required.filter((b)=>b.state==='PASS_WITH_EVIDENCE'&&typeof b.evidence_ref==='string'&&b.evidence_ref.length>0);
  const incomplete=required.filter((b)=>b.state!=='PASS_WITH_EVIDENCE'||!b.evidence_ref);
  const result=evaluateUniversalMediaStudioReadiness(doc);
  assert.equal(result.total_required,13);
  assert.equal(result.passed_with_evidence,persisted.length);
  assert.equal(result.incomplete.length,incomplete.length);
  assert.deepEqual(new Set(result.incomplete),new Set(incomplete.map((b)=>b.id)));
  assert.equal(result.ready,persisted.length===required.length);
  for(const b of persisted){
    assert.match(b.evidence_ref,/^git:[0-9a-f]{40}:cerebro\/media-studio\/v2\/evidence\/bm\d{2}-pass-with-evidence-\d{4}-\d{2}-\d{2}\.json$/);
  }
  for(const id of ['BM-01','BM-02','BM-03','BM-04','BM-05','BM-12']){
    const b=doc.benchmarks.find((x)=>x.id===id);
    assert.equal(b.state,'PASS_WITH_EVIDENCE',`${id} must preserve its existing physical evidence`);
    assert.ok(b.evidence_ref,`${id} must keep immutable evidence_ref`);
    assert.equal(result.incomplete.includes(id),false);
  }
  const creative=doc.benchmarks.find((x)=>x.id==='BM-13');
  assert.ok(creative,'BM-13 premium creative proof must exist');
  assert.equal(creative.state,'NOT_RUN');
  assert.equal(creative.evidence_ref,null);
  assert.equal(result.incomplete.includes('BM-13'),true);
  assert.equal(result.ready,false);
  assert.throws(()=>assertUniversalMediaStudioReady(doc),/UNIVERSAL_MEDIA_STUDIO_NOT_READY:BM-13/);
});

test('synthetic all-green fixture becomes ready only with evidence refs including BM-13',()=>{
  const doc=loadReadinessBenchmarks();
  for(const b of doc.benchmarks){b.state='PASS_WITH_EVIDENCE';b.evidence_ref=`EVID-${b.id}`;}
  const result=evaluateUniversalMediaStudioReadiness(doc);
  assert.equal(result.ready,true);
  assert.equal(result.passed_with_evidence,13);
  assert.deepEqual(result.incomplete,[]);
});
