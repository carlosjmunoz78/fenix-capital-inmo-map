import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateStaticSkillValue} from '../skills/skill-value-evaluator.mjs';

function fixtures({domain='software-engineering-devops',prelabState='STATIC_PRELAB_READY_INSTRUCTION_ONLY',overlapState='EXISTING_DOMAIN_OVERLAP',overlapScore=30,pushedAt='2026-10-01T00:00:00Z'}={}){
  const wrappers={plans:[{
    candidate_id:'c1',wrapper_id:'skillwrap:c1',domain,engine_bindings:['FACT-001'],skill_class:'SHARED',
    provenance:{upstream_full_name:'acme/x',upstream_head_commit:'abc',manifest_sha256:'1'.repeat(64)},
    permissions:{network:false,filesystem_read:false,filesystem_write:false,credentials:false,external_actions:false,prod_write:false,trading_access:false},
    economics:{additional_cost_target_eur:0}
  }]};
  const prelab={results:[{candidate_id:'c1',prelab_state:prelabState}]};
  const upstreams={results:[{status:'RESOLVED',full_name:'acme/x',head_commit:'abc',head_tree_sha:'tree',pushed_at:pushedAt,archived:false,disabled:false,discovery_candidate_ids:['c1']}]};
  const overlap={candidates:[{candidate_id:'c1',overlap_state:overlapState,overlap_confidence_score:overlapScore,binding_domain_id:domain}]};
  const licenses={results:[{candidate_id:'c1',status:'EXACT_LICENSE_FILE_EVIDENCE',exact_evidence:[{fetched:true,path:'LICENSE',sha256:'a'.repeat(64)}]}]};
  return {wrappers,prelab,upstreams,overlap,licenses};
}

test('scores static-ready zero-cost strategic candidate without popularity',()=>{
  const f=fixtures();
  const report=evaluateStaticSkillValue(f.wrappers,f.prelab,f.upstreams,f.overlap,f.licenses,{now:new Date('2026-10-06T00:00:00Z')});
  assert.equal(report.candidates_evaluated,1);
  assert.equal(report.popularity_used_in_score,false);
  assert.equal(report.external_code_executed,false);
  assert.equal(report.adoption_authorized,false);
  assert.equal(report.prod_authorized,false);
  assert.ok(report.results[0].value_score>70);
});

test('instruction-only candidate is more portable than code-bundle candidate',()=>{
  const a=fixtures({prelabState:'STATIC_PRELAB_READY_INSTRUCTION_ONLY'});
  const b=fixtures({prelabState:'STATIC_PRELAB_READY_CODE_BUNDLE'});
  const ra=evaluateStaticSkillValue(a.wrappers,a.prelab,a.upstreams,a.overlap,a.licenses,{now:new Date('2026-10-06T00:00:00Z')}).results[0];
  const rb=evaluateStaticSkillValue(b.wrappers,b.prelab,b.upstreams,b.overlap,b.licenses,{now:new Date('2026-10-06T00:00:00Z')}).results[0];
  assert.ok(ra.components.portability>rb.components.portability);
  assert.ok(ra.value_score>rb.value_score);
});

test('strong overlap raises duplication penalty without auto-rejecting value',()=>{
  const low=fixtures({overlapScore:10});
  const high=fixtures({overlapScore:100});
  const r1=evaluateStaticSkillValue(low.wrappers,low.prelab,low.upstreams,low.overlap,low.licenses,{now:new Date('2026-10-06T00:00:00Z')}).results[0];
  const r2=evaluateStaticSkillValue(high.wrappers,high.prelab,high.upstreams,high.overlap,high.licenses,{now:new Date('2026-10-06T00:00:00Z')}).results[0];
  assert.ok(r2.penalties.duplication>r1.penalties.duplication);
  assert.ok(r2.value_score<r1.value_score);
});

test('maintenance score declines for stale repositories',()=>{
  const fresh=fixtures({pushedAt:'2026-10-01T00:00:00Z'});
  const stale=fixtures({pushedAt:'2023-01-01T00:00:00Z'});
  const r1=evaluateStaticSkillValue(fresh.wrappers,fresh.prelab,fresh.upstreams,fresh.overlap,fresh.licenses,{now:new Date('2026-10-06T00:00:00Z')}).results[0];
  const r2=evaluateStaticSkillValue(stale.wrappers,stale.prelab,stale.upstreams,stale.overlap,stale.licenses,{now:new Date('2026-10-06T00:00:00Z')}).results[0];
  assert.ok(r1.components.maintenance>r2.components.maintenance);
  assert.ok(r1.value_score>r2.value_score);
});

test('results are ranked by value but never authorize adoption',()=>{
  const f1=fixtures({domain:'software-engineering-devops'});
  const f2=fixtures({domain:'hr-people-operations'});
  f2.wrappers.plans[0].candidate_id='c2';
  f2.wrappers.plans[0].wrapper_id='skillwrap:c2';
  f2.prelab.results[0].candidate_id='c2';
  f2.upstreams.results[0].discovery_candidate_ids=['c2'];
  f2.overlap.candidates[0].candidate_id='c2';
  f2.licenses.results[0].candidate_id='c2';
  const report=evaluateStaticSkillValue({plans:[...f1.wrappers.plans,...f2.wrappers.plans]},{results:[...f1.prelab.results,...f2.prelab.results]},{results:[...f1.upstreams.results,...f2.upstreams.results]},{candidates:[...f1.overlap.candidates,...f2.overlap.candidates]},{results:[...f1.licenses.results,...f2.licenses.results]},{now:new Date('2026-10-06T00:00:00Z')});
  assert.equal(report.results[0].candidate_id,'c1');
  assert.equal(report.results[0].adoption_authorized,false);
});
