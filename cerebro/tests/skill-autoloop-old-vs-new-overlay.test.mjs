import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAutoloopOldVsNewPackages} from '../skills/skill-autoloop-old-vs-new-overlay.mjs';

const lab={results:[
  {candidate_id:'agent',domain:'agent-ai-orchestration',status:'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL',coverage_score:100,policy_alignment_score:100},
  {candidate_id:'knowledge',domain:'knowledge-research-training',status:'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL',coverage_score:100,policy_alignment_score:100}
]};
const values={results:[{candidate_id:'agent',value_score:91},{candidate_id:'knowledge',value_score:89}]};
const wrappers={plans:[
  {candidate_id:'agent',wrapper_id:'skillwrap:agent',domain:'agent-ai-orchestration',engine_bindings:['ORCH-001'],provenance:{upstream_full_name:'example/agent',upstream_head_commit:'abc',manifest_sha256:'1'.repeat(64)}},
  {candidate_id:'knowledge',wrapper_id:'skillwrap:knowledge',domain:'knowledge-research-training',engine_bindings:['RAG-001'],provenance:{upstream_full_name:'example/knowledge',upstream_head_commit:'def',manifest_sha256:'2'.repeat(64)}}
]};

test('AutoLoop adds bounded synthetic packages for agent and knowledge domains',()=>{
  const r=buildAutoloopOldVsNewPackages(lab,values,wrappers,{createdAt:'2026-10-08T00:00:00Z'});
  assert.equal(r.packages_total,2);
  assert.deepEqual(r.packages.map(x=>x.candidate_id).sort(),['agent','knowledge']);
  for(const p of r.packages){
    assert.equal(p.fixtures.length,3);
    assert.equal(p.external_skill_execution_authorized,false);
    assert.equal(p.prod_authorized,false);
    assert.equal(p.promotion_authorized,false);
  }
});

test('policy-conflict fixture requires the canonical human exception',()=>{
  const r=buildAutoloopOldVsNewPackages(lab,values,wrappers);
  const agent=r.packages.find(x=>x.candidate_id==='agent');
  const fixture=agent.fixtures.find(x=>x.fixture_id==='instruction-conflict');
  assert.equal(fixture.rubric.expected_human_required,'POLICY_CONFLICT');
});
