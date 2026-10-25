import test from 'node:test';
import assert from 'node:assert/strict';
import {materializeRoleProfiles} from '../registry/role-profile-factory.mjs';
import {materializeSpecialtyKnowledgePacks,specialtyKnowledgePackSummary} from '../knowledge/specialty-knowledge-pack.mjs';

test('all 384 specialists receive one unique inherited professional knowledge pack',()=>{
  const specialists=materializeRoleProfiles().filter((p)=>p.role_class==='SPECIALIST');
  const packs=materializeSpecialtyKnowledgePacks();
  assert.equal(specialists.length,384);
  assert.equal(packs.length,specialists.length);
  assert.equal(new Set(packs.map((p)=>p.role_id)).size,packs.length);
  assert.deepEqual(new Set(packs.map((p)=>p.role_id)),new Set(specialists.map((p)=>p.id)));
});

test('every specialist pack carries evidence, benchmark, rights, rollback-oriented quality structure',()=>{
  for(const pack of materializeSpecialtyKnowledgePacks()){
    assert.equal(pack.state_type,'CEREBRO_UMS_SPECIALTY_KNOWLEDGE_PACK_V1');
    assert.equal(pack.environment,'PREPROD');
    assert.ok(pack.specialty_terms.length>0,pack.role_id);
    assert.ok(pack.topics.length>=10,pack.role_id);
    assert.ok(pack.source_classes.includes('SRC-STANDARDS'));
    assert.ok(pack.source_classes.includes('SRC-INTERNAL'));
    assert.ok(pack.required_sections.includes('failure_modes'));
    assert.ok(pack.required_sections.includes('rights_and_licenses'));
    assert.ok(pack.required_sections.includes('benchmarks'));
    assert.equal(pack.promotion_policy.benchmark_before_operational_promotion,true);
    assert.equal(pack.promotion_policy.old_vs_new,true);
    assert.equal(pack.promotion_policy.tribunal,true);
    assert.equal(pack.evaluation.independent_review_required,true);
  }
});

test('structured packs do not falsely claim deep verified operational knowledge',()=>{
  const summary=specialtyKnowledgePackSummary();
  assert.equal(summary.specialists,384);
  assert.equal(summary.structured,384);
  assert.equal(summary.operational_claims,0);
  assert.equal(summary.additional_cost_eur,0);
  for(const pack of materializeSpecialtyKnowledgePacks()){
    assert.equal(pack.deep_knowledge_status,'STRUCTURED_RESEARCH_REQUIRED');
    assert.equal(pack.operational_claim,false);
  }
});
