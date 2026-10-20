import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSkillEvolutionPlan, loadSkillEvolutionPolicy } from '../runtime/skill-wrappers/skill-evolution-planner-v1.mjs';
import { buildSkillEvolutionReviewQueue, loadDefaultSkillRegistry } from '../runtime/skill-wrappers/skill-evolution-scout-v1.mjs';

const binding=JSON.parse(fs.readFileSync(new URL('../registry/skill-evolution-policy-binding-v1.json',import.meta.url),'utf8'));

function selectorField(selector){
  const match=String(selector??'').match(/^([A-Za-z0-9_]+)\[\*\]$/);
  assert.ok(match,`unsupported selector in test: ${selector}`);
  return match[1];
}

test('continuous improvement is inherited by every acquired/generated skill',()=>{
  const policy=loadSkillEvolutionPolicy();
  assert.equal(policy.enabled_by_default,true);
  assert.equal(policy.scope.all_acquired_skills,true);
  assert.equal(policy.scope.all_cerebro_owned_wrappers,true);
  assert.equal(policy.scope.all_generated_or_derived_skills,true);
  assert.equal(binding.future_skill_binding.inherit_policy_by_default,true);
  assert.equal(binding.future_skill_binding.exception_requires_governed_policy_record,true);
  assert.equal(binding.future_skill_binding.new_canonical_skill_registry_must_be_added_to_registry_bindings,true);
  assert.equal(policy.ownership.learning_engine,'LRN-001');
  assert.equal(policy.ownership.factory_engine,'FACT-001');
});

test('skill evolution specializes existing compounding and native learning control planes instead of duplicating them',()=>{
  assert.equal(binding.architecture_reuse.compounding_policy_ref,'cerebro/registry/cerebro-compounding-evolution-policy.v1.json');
  assert.equal(binding.architecture_reuse.native_continuous_improvement_ref,'cerebro/registry/native-capability-continuous-improvement-v1.json');
  assert.match(binding.architecture_reuse.rule,/DO_NOT_DUPLICATE_CONTROL_PLANES/);
  assert.equal(binding.learning_binding.consumer_engine,'LRN-001');
  assert.equal(binding.learning_binding.factory_engine,'FACT-001');
  assert.equal(binding.learning_binding.research_engine,'RSH-001');
  assert.equal(binding.learning_binding.evaluation_engine,'EVA-001');
  assert.equal(binding.learning_binding.tribunal_engine,'JDG-001');
});

test('evolution policy keeps PROD baseline immutable and requires proof before promotion',()=>{
  const policy=loadSkillEvolutionPolicy();
  assert.equal(policy.candidate_rules.baseline_immutable_in_prod,true);
  assert.equal(policy.candidate_rules.candidate_environment,'PREPROD');
  assert.equal(policy.candidate_rules.old_vs_new_required,true);
  assert.equal(policy.candidate_rules.tests_required,true);
  assert.equal(policy.candidate_rules.tribunal_required,true);
  assert.equal(policy.candidate_rules.rollback_required,true);
  assert.equal(policy.candidate_rules.backup_rebuild_required,true);
  assert.equal(policy.candidate_rules.promotion_requires_measurable_gain,true);
  assert.equal(policy.authority.direct_prod_mutation,false);
  assert.equal(policy.authority.trading_access,false);
  assert.equal(policy.authority.additional_cost_budget_eur,0);
});

test('planner creates a governed PREPROD candidate plan and refuses PROD mutation',()=>{
  const registry=loadDefaultSkillRegistry();
  const wrapperSource=registry.sources.find(source=>source.selector==='wrappers[*]');
  assert.ok(wrapperSource);
  const baseline=wrapperSource.registry.wrappers[0];
  const plan=createSkillEvolutionPlan({
    baseline_skill:baseline,
    trigger:'PERIODIC_REVIEW',
    strategy:'DERIVED_SKILL',
    hypothesis:'Create or derive a measurable improvement without weakening the active baseline.',
    company_id:'fenix',
    engine_id:'LRN-001',
    environment:'PREPROD',
    candidate_version:'candidate-v1',
    requested_at_utc:'2026-10-20T18:00:00Z'
  });
  assert.equal(plan.environment,'PREPROD');
  assert.equal(plan.status,'CANDIDATE_PLAN_ONLY');
  assert.equal(plan.baseline.immutable_in_prod,true);
  assert.equal(plan.candidate.direct_prod_mutation,false);
  assert.equal(plan.promotion_gate.old_vs_new_required,true);
  assert.equal(plan.promotion_gate.tribunal_required,true);
  assert.equal(plan.rollback.required,true);
  assert.equal(plan.learning.consumer_engine,'LRN-001');
  assert.equal(plan.learning.factory_engine,'FACT-001');
  assert.equal(plan.authority.additional_cost_budget_eur,0);

  assert.throws(()=>createSkillEvolutionPlan({
    baseline_skill:baseline,
    trigger:'PERIODIC_REVIEW',
    strategy:'INTERNAL_HARDENING',
    hypothesis:'Unsafe direct PROD attempt must be rejected.',
    environment:'PROD'
  }),/SKILL_EVOLUTION_PROD_MUTATION_DENIED/);
});

test('review scout covers the union of every bound adopted-skill registry, deduplicates it and preserves provenance',()=>{
  const registry=loadDefaultSkillRegistry();
  assert.equal(registry.sources.length,binding.registry_bindings.length);
  assert.ok(registry.sources.length>=3);

  const expectedNames=new Set();
  let rawCount=0;
  for(const source of registry.sources){
    const field=selectorField(source.selector);
    const entries=source.registry[field];
    assert.ok(Array.isArray(entries));
    rawCount+=entries.length;
    for(const item of entries){
      const name=String(item.technical_name??item.name??'').trim().toLowerCase();
      assert.ok(name,`missing technical_name in ${source.registry_ref}`);
      expectedNames.add(name);
    }
  }

  const queue=buildSkillEvolutionReviewQueue(registry,{requested_at_utc:'2026-10-20T18:00:00Z'});
  assert.equal(queue.status,'GREEN_REVIEW_QUEUE_READY');
  assert.equal(queue.source_registry_count,registry.sources.length);
  assert.equal(queue.raw_entry_count,rawCount);
  assert.equal(queue.review_count,expectedNames.size);
  assert.equal(queue.deduplicated_review_count,expectedNames.size);
  assert.equal(queue.reviews.length,expectedNames.size);
  assert.equal(queue.continuous_improvement_enabled,true);
  assert.equal(queue.learning_loop,'LRN-001');
  assert.equal(queue.candidate_factory,'FACT-001');

  const reviewNames=new Set(queue.reviews.map(review=>review.technical_name.toLowerCase()));
  assert.deepEqual(reviewNames,expectedNames);
  assert.ok(reviewNames.has('aws-cognito'));
  assert.ok(reviewNames.has('skill-creator'));

  for(const review of queue.reviews){
    assert.ok(Array.isArray(review.baseline.registry_refs));
    assert.ok(review.baseline.registry_refs.length>=1);
    assert.equal(review.baseline_immutable_in_prod,true);
    assert.equal(review.candidate_environment,'PREPROD');
    assert.equal(review.old_vs_new_required,true);
    assert.equal(review.tribunal_required,true);
    assert.equal(review.rollback_required,true);
    assert.equal(review.additional_cost_budget_eur,0);
    assert.ok(review.improvement_search_lanes.includes('UPSTREAM_UPDATE'));
    assert.ok(review.improvement_search_lanes.includes('INTERNAL_HARDENING'));
    assert.ok(review.improvement_search_lanes.includes('COMPOSITE_AUGMENTATION'));
    assert.ok(review.improvement_search_lanes.includes('DERIVED_SKILL'));
    assert.ok(review.improvement_search_lanes.includes('REPLACEMENT_CANDIDATE'));
  }
});
