import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildGovernedWrapperScaffold,
  inspectSkillCandidateForScaffold
} from '../runtime/skill-wrappers/governed-wrapper-scaffold-v1.mjs';

const VALID_PIN='0123456789abcdef0123456789abcdef01234567';

function validCandidate(overrides={}){
  return {
    candidate_id:'repo:test-skill-001',
    technical_name:'test-skill',
    source_locator:`github://example/test@${VALID_PIN}/skills/test-skill`,
    source_license:'MIT',
    pinned_sha:VALID_PIN,
    target_engine_bindings:['FACT-001','QA-001'],
    additional_cost_eur:0,
    external_skill_code_execution:false,
    dependency_install_authorized:false,
    external_side_effects_authorized:false,
    prod_write_authorized:false,
    prod_mutation_authorized:false,
    trading_access:false,
    spend_authorized:false,
    ...overrides
  };
}

test('valid governed metadata produces a non-operational PREPROD scaffold bundle',()=>{
  const scaffold=buildGovernedWrapperScaffold(validCandidate(),{company_id:'fenix'});
  assert.equal(scaffold.status,'GREEN_SCAFFOLD_READY_PREPROD');
  assert.equal(scaffold.environment,'PREPROD');
  assert.equal(scaffold.company_id,'fenix');
  assert.equal(scaffold.operational,false);
  assert.equal(scaffold.generated_files.length,7);
  assert.equal(scaffold.registry_entry_candidate.registry_promotion_authorized,false);
  assert.equal(scaffold.registry_entry_candidate.operational,false);
  assert.equal(scaffold.implementation_contract.promotion_after_scaffold,false);
  assert.equal(scaffold.implementation_contract.raw_external_code_execution,false);
  assert.equal(scaffold.evaluation_contract.old_vs_new_required,true);
  assert.equal(scaffold.evaluation_contract.measurable_gain_required,true);
  assert.equal(scaffold.evaluation_contract.no_regression_required,true);
  assert.equal(scaffold.recovery_contract.backup_required,true);
  assert.equal(scaffold.recovery_contract.rollback_required,true);
  assert.equal(scaffold.recovery_contract.rebuild_required,true);
  assert.equal(scaffold.continuous_improvement.inherit_on_creation,true);
  assert.equal(scaffold.authority.direct_prod_write_authorized,false);
  assert.equal(scaffold.authority.direct_prod_mutation_authorized,false);
  assert.equal(scaffold.authority.external_skill_code_execution,false);
  assert.equal(scaffold.authority.trading_access,false);
  assert.equal(scaffold.authority.additional_cost_budget_eur,0);

  const wrapper=scaffold.generated_files.find(file=>file.path.endsWith('.scaffold.mjs'));
  assert.ok(wrapper);
  assert.match(wrapper.content,/SCAFFOLD_ONLY_NOT_IMPLEMENTED/);
  assert.match(wrapper.content,/SKILL_WRAPPER_SCAFFOLD_NOT_IMPLEMENTED:test-skill/);

  const readme=scaffold.generated_files.find(file=>file.path.endsWith('.README.md'));
  assert.ok(readme);
  assert.match(readme.content,/Continuous evolution/);
  assert.match(readme.content,/Skill Evolution Loop/);
});

test('missing or non-allowlisted external license blocks automatic scaffolding and routes legal review',()=>{
  for(const source_license of ['', 'GPL-3.0']){
    const inspection=inspectSkillCandidateForScaffold(validCandidate({source_license}));
    assert.equal(inspection.status,'BLOCKED_FAIL_CLOSED');
    assert.equal(inspection.human_required,'LEGAL_REQUIRED');
    const scaffold=buildGovernedWrapperScaffold(validCandidate({source_license}));
    assert.equal(scaffold.status,'BLOCKED_FAIL_CLOSED');
    assert.equal(scaffold.operational,false);
    assert.deepEqual(scaffold.generated_files,[]);
  }
});

test('cost above zero blocks automatic scaffolding at MONEY_LIMIT',()=>{
  const inspection=inspectSkillCandidateForScaffold(validCandidate({additional_cost_eur:1}));
  assert.equal(inspection.status,'BLOCKED_FAIL_CLOSED');
  assert.equal(inspection.human_required,'MONEY_LIMIT');
  assert.ok(inspection.blockers.some(item=>item.code==='ADDITIONAL_COST_BUDGET_EXCEEDED'));
});

test('unsafe authority requests and Trading bindings are rejected fail-closed',()=>{
  const unsafeCandidates=[
    validCandidate({prod_write_authorized:true}),
    validCandidate({prod_mutation_authorized:true}),
    validCandidate({external_skill_code_execution:true}),
    validCandidate({dependency_install_authorized:true}),
    validCandidate({external_side_effects_authorized:true}),
    validCandidate({target_engine_bindings:['TRAD-001']})
  ];
  for(const candidate of unsafeCandidates){
    const scaffold=buildGovernedWrapperScaffold(candidate);
    assert.equal(scaffold.status,'BLOCKED_FAIL_CLOSED');
    assert.equal(scaffold.operational,false);
    assert.equal(scaffold.generated_files.length,0);
  }
});

test('real aws-cognito adoption metadata can generate a safe scaffold without becoming operational',()=>{
  const adoption=JSON.parse(fs.readFileSync(new URL('../registry/skill-dynamic-adoption-v1.json',import.meta.url),'utf8'));
  const candidate=adoption.capabilities.find(item=>item.technical_name==='aws-cognito');
  assert.ok(candidate);
  const scaffold=buildGovernedWrapperScaffold(candidate,{company_id:'fenix'});
  assert.equal(scaffold.status,'GREEN_SCAFFOLD_READY_PREPROD');
  assert.equal(scaffold.technical_name,'aws-cognito');
  assert.equal(scaffold.operational,false);
  assert.equal(scaffold.registry_entry_candidate.registry_promotion_authorized,false);
  assert.equal(scaffold.authority.additional_cost_budget_eur,0);
});

test('incomplete full-adoption metadata is not silently upgraded into an automatic scaffold',()=>{
  const full=JSON.parse(fs.readFileSync(new URL('../registry/skill-full-adoption-v1.json',import.meta.url),'utf8'));
  const candidate=full.queue.find(item=>item.technical_name==='skill-creator');
  assert.ok(candidate);
  const scaffold=buildGovernedWrapperScaffold(candidate,{company_id:'fenix'});
  assert.equal(scaffold.status,'BLOCKED_FAIL_CLOSED');
  assert.equal(scaffold.operational,false);
  assert.equal(scaffold.generated_files.length,0);
  assert.ok(scaffold.inspection.blockers.some(item=>item.code==='SOURCE_LICENSE_REQUIRED'||item.code==='PINNED_SHA_REQUIRED'));
});
