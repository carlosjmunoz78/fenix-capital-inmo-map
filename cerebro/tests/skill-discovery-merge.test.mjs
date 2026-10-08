import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeDiscoveryReports} from '../skills/skill-discovery-merge.mjs';

test('merges sources and dedupes candidate ids without authorizing execution',()=>{
  const a={results:[{source_id:'a',status:'OK',candidates:[{candidate_id:'x',upstream_hints:['u'],primary_upstream_hint:'u'}]}]};
  const b={results:[{source_id:'b',status:'OK',candidates:[{candidate_id:'x'},{candidate_id:'y',upstream_hints:['v'],primary_upstream_hint:'v'}]}]};
  const r=mergeDiscoveryReports([a,b],{observedAt:'2026-10-08T00:00:00Z'});
  assert.equal(r.sources_total,2);
  assert.equal(r.sources_ok,2);
  assert.equal(r.candidates_discovered,2);
  assert.equal(r.deduped_candidates,1);
  assert.equal(r.external_skill_code_executed,false);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.additional_cost_eur,0);
});
