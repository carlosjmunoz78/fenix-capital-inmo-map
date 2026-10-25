import test from 'node:test';
import assert from 'node:assert/strict';
import {materializeProdSpecialistEnrichment,prodSpecialistEnrichmentSummary} from '../knowledge/prod-specialist-enrichment-v1.mjs';

test('all previously uncovered 192 specialists receive PROD enrichment',()=>{
  const roles=materializeProdSpecialistEnrichment();
  const summary=prodSpecialistEnrichmentSummary();
  assert.equal(roles.length,192);
  assert.equal(summary.target_specialists,192);
  assert.equal(summary.target_departments,24);
  assert.equal(new Set(roles.map((x)=>x.role_id)).size,192);
  assert.ok(roles.every((x)=>x.environment==='PROD'));
});

test('every target specialist gets multiple verified sources and concrete knowledge points',()=>{
  const roles=materializeProdSpecialistEnrichment();
  assert.ok(roles.every((x)=>x.verified_sources.length>=2));
  assert.ok(roles.every((x)=>x.verified_source_uris.length>=2));
  assert.ok(roles.every((x)=>x.verified_knowledge_points.length>=6));
  assert.ok(roles.every((x)=>x.source_revalidation_required===true));
  assert.ok(roles.every((x)=>x.deep_mastery_claim===false));
});

test('existing CEREBRO skills are reused without silently promoting LAB or HOLD candidates',()=>{
  const roles=materializeProdSpecialistEnrichment();
  const allReusable=roles.flatMap((x)=>x.reusable_cerebro_skills);
  const allBenchmark=roles.flatMap((x)=>x.benchmark_candidate_skills);
  const allHeld=roles.flatMap((x)=>x.held_or_reference_skills);
  assert.ok(allReusable.some((x)=>x.skill_id==='QWEN3_TTS'));
  assert.ok(allReusable.some((x)=>x.skill_id==='HYPERFRAMES'));
  assert.ok(allBenchmark.some((x)=>x.skill_id==='LTX_VIDEO')||allBenchmark.some((x)=>x.skill_id==='IMAGE_ANALYSIS'));
  assert.ok(allHeld.every((x)=>String(x.status).startsWith('HOLD_')||x.status==='CATALOG_ONLY'));
});

test('all specialists keep daily improvement questions and governed tool promotion',()=>{
  const roles=materializeProdSpecialistEnrichment();
  for(const role of roles){
    assert.equal(role.daily_learning_questions.length,6);
    assert.ok(role.research_queries.length>=5);
    assert.deepEqual(role.learning_horizons,['NOW','EMERGING','COMING','FRONTIER']);
    assert.equal(role.operational_tool_promotion_requires_benchmark,true);
    assert.equal(role.rights_license_security_review_required,true);
    assert.equal(role.additional_cost_eur,0);
  }
});

test('summary has no false deep-mastery claims',()=>{
  const summary=prodSpecialistEnrichmentSummary();
  assert.equal(summary.roles_with_two_or_more_verified_sources,192);
  assert.equal(summary.roles_with_six_or_more_verified_knowledge_points,192);
  assert.equal(summary.roles_active,192);
  assert.equal(summary.deep_mastery_claims,0);
  assert.equal(summary.additional_cost_eur,0);
});
