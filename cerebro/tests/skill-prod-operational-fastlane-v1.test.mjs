import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProdOperationalFastLane,evaluateProdOperationalCandidate,resolveProdOperationalSkillCapability} from '../runtime/skill-prod-operational-fastlane-v1.mjs';

function greenRow(overrides={}){
  return {
    candidate_id:'fixture:operational',
    technical_name:'operational-fixture',
    target_engine_bindings:['FACT-001'],
    source_kind:'DYNAMIC_ADOPTION',
    capability_contracts:[{capability_id:'cap:fixture',technical_name:'operational-fixture',domains:[{domain_id:'engineering',engine_bindings:['FACT-001']}]}],
    eligible:true,
    canary_evidence:'GREEN_DYNAMIC_OPERATIONAL_FIXTURE_1234ABCD_PROD_READONLY_CANARY',
    authority:{
      prod_write_authorized:false,
      prod_mutation_authorized:false,
      permission_expansion_authorized:false,
      external_skill_code_execution:false,
      trading_access:false,
      spend_authorized:false,
      additional_cost_eur:0
    },
    ...overrides
  };
}

test('green PROD readonly capability is promoted to internal operational use without external authority',()=>{
  const row=evaluateProdOperationalCandidate(greenRow());
  assert.equal(row.eligible,true);
  assert.equal(row.status,'PROD_CAPABILITY_AVAILABLE_OPERATIONAL');
  assert.equal(row.authority.prod_capability_operational,true);
  assert.equal(row.authority.direct_prod_write_authorized,false);
  assert.equal(row.authority.direct_prod_mutation_authorized,false);
  assert.equal(row.authority.external_side_effects_authorized,false);
  assert.equal(row.authority.trading_access,false);
  assert.equal(row.authority.additional_cost_eur,0);
  assert.ok(row.allowed_modes.includes('TRANSFORM'));
  assert.ok(row.allowed_modes.includes('GENERATE'));
  assert.ok(row.allowed_modes.includes('VALIDATE'));
  assert.ok(row.allowed_modes.includes('SIMULATE'));
  assert.ok(row.allowed_modes.includes('EXECUTE_INTERNAL'));
});

test('unsafe authority or Trading binding fails closed',()=>{
  assert.equal(evaluateProdOperationalCandidate(greenRow({authority:{...greenRow().authority,prod_write_authorized:true}})).eligible,false);
  assert.equal(evaluateProdOperationalCandidate(greenRow({target_engine_bindings:['TRADING-001']})).eligible,false);
});

test('canonical PROD capability set becomes immediately callable for safe internal operational modes',()=>{
  const report=buildProdOperationalFastLane();
  assert.equal(report.status,'GREEN_PROD_OPERATIONAL_INTERNAL_CAPABILITY_SET');
  assert.ok(report.available_count>=1);
  for(const row of report.available){
    assert.equal(row.status,'PROD_CAPABILITY_AVAILABLE_OPERATIONAL');
    assert.equal(row.authority.direct_prod_write_authorized,false);
    assert.equal(row.authority.external_side_effects_authorized,false);
  }
  const first=report.available[0];
  const engine=first.target_engine_bindings[0];
  const resolved=resolveProdOperationalSkillCapability({candidate_id:first.candidate_id,engine_id:engine,requested_mode:'TRANSFORM'});
  assert.equal(resolved.allowed,true);
  assert.equal(resolved.status,'PROD_CAPABILITY_AVAILABLE_OPERATIONAL');
  assert.equal(resolved.prod_capability_operational,true);
  assert.equal(resolved.direct_prod_write_authorized,false);
  assert.equal(resolved.external_side_effects_authorized,false);
});

test('external write request is denied and external actions remain owned by governed origin engine',()=>{
  const report=buildProdOperationalFastLane();
  const first=report.available[0];
  const engine=first.target_engine_bindings[0];
  const denied=resolveProdOperationalSkillCapability({candidate_id:first.candidate_id,engine_id:engine,requested_mode:'WRITE'});
  assert.equal(denied.allowed,false);
  assert.equal(denied.status,'DENY_MODE_NOT_SAFE_OPERATIONAL');
  const ok=resolveProdOperationalSkillCapability({candidate_id:first.candidate_id,engine_id:engine,requested_mode:'EXECUTE_INTERNAL'});
  assert.equal(ok.allowed,true);
  assert.equal(ok.action_authority_source,'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY');
});
