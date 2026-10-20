import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProdOperationalFastLane,evaluateProdOperationalCandidate,resolveProdOperationalSkillCapability} from '../runtime/skill-prod-operational-fastlane-v1.mjs';

function greenRow(overrides={}){return {candidate_id:'fixture:operational',technical_name:'operational-fixture',target_engine_bindings:['FACT-001'],source_kind:'DYNAMIC_ADOPTION',capability_contracts:[{capability_id:'cap:fixture',technical_name:'operational-fixture',domains:[{domain_id:'engineering',engine_bindings:['FACT-001']}]}],eligible:true,canary_evidence:'GREEN_DYNAMIC_OPERATIONAL_FIXTURE_1234ABCD_PROD_READONLY_CANARY',authority:{prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,trading_access:false,spend_authorized:false,additional_cost_eur:0},...overrides};}
function greenWrapper(overrides={}){return {candidate_id:'fixture:operational',technical_name:'operational-fixture',wrapper_id:'skillwrap:fixture-v1',wrapper_ref:'cerebro/runtime/skill-wrappers/fixture-v1.mjs',export_name:'executeFixture',implementation_kind:'CEREBRO_INTERNAL_REIMPLEMENTATION_FROM_LICENSED_KNOWLEDGE',target_engine_bindings:['FACT-001'],supported_modes:['ANALYZE','TRANSFORM','GENERATE','VALIDATE','SIMULATE','EXECUTE_INTERNAL'],external_skill_code_execution:false,dependency_install_authorized:false,external_side_effects_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,trading_access:false,spend_authorized:false,additional_cost_eur:0,status:'READY_INTERNAL_OPERATIONAL_CANARY',...overrides};}

test('green readonly capability needs a real internal wrapper before operational promotion',()=>{
  const missing=evaluateProdOperationalCandidate(greenRow(),null);assert.equal(missing.eligible,false);assert.ok(missing.blockers.includes('EXECUTABLE_INTERNAL_WRAPPER_MISSING'));
  const row=evaluateProdOperationalCandidate(greenRow(),greenWrapper());assert.equal(row.eligible,true);assert.equal(row.status,'PROD_CAPABILITY_AVAILABLE_OPERATIONAL');assert.equal(row.wrapper_id,'skillwrap:fixture-v1');assert.equal(row.authority.direct_prod_write_authorized,false);assert.equal(row.authority.external_side_effects_authorized,false);assert.equal(row.authority.trading_access,false);assert.equal(row.authority.additional_cost_eur,0);assert.ok(row.allowed_modes.includes('GENERATE'));assert.ok(row.allowed_modes.includes('EXECUTE_INTERNAL'));
});

test('unsafe authority Trading or incomplete wrapper coverage fails closed',()=>{
  assert.equal(evaluateProdOperationalCandidate(greenRow({authority:{...greenRow().authority,prod_write_authorized:true}}),greenWrapper()).eligible,false);
  assert.equal(evaluateProdOperationalCandidate(greenRow({target_engine_bindings:['TRADING-001']}),greenWrapper({target_engine_bindings:['TRADING-001']})).eligible,false);
  assert.equal(evaluateProdOperationalCandidate(greenRow({target_engine_bindings:['FACT-001','WEB-001']}),greenWrapper({target_engine_bindings:['FACT-001']})).eligible,false);
});

test('canonical PROD operational set contains only executable internal wrappers',()=>{
  const report=buildProdOperationalFastLane();assert.equal(report.status,'GREEN_PROD_OPERATIONAL_INTERNAL_CAPABILITY_SET');assert.ok(report.available_count>=1);
  for(const row of report.available){assert.equal(row.status,'PROD_CAPABILITY_AVAILABLE_OPERATIONAL');assert.ok(row.wrapper_ref.startsWith('cerebro/runtime/skill-wrappers/'));assert.equal(row.authority.direct_prod_write_authorized,false);assert.equal(row.authority.external_side_effects_authorized,false);}
  const drei=report.available.find(x=>x.technical_name==='drei');assert.ok(drei);const resolved=resolveProdOperationalSkillCapability({candidate_id:drei.candidate_id,engine_id:'WEB-001',requested_mode:'GENERATE'});assert.equal(resolved.allowed,true);assert.equal(resolved.prod_capability_operational,true);assert.equal(resolved.wrapper_id,'skillwrap:drei-internal-v1');
});

test('direct external write remains denied',()=>{
  const report=buildProdOperationalFastLane();const drei=report.available.find(x=>x.technical_name==='drei');
  const denied=resolveProdOperationalSkillCapability({candidate_id:drei.candidate_id,engine_id:'WEB-001',requested_mode:'WRITE'});assert.equal(denied.allowed,false);assert.equal(denied.status,'DENY_MODE_NOT_SAFE_OPERATIONAL');
  const ok=resolveProdOperationalSkillCapability({candidate_id:drei.candidate_id,engine_id:'WEB-001',requested_mode:'EXECUTE_INTERNAL'});assert.equal(ok.allowed,true);assert.equal(ok.action_authority_source,'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY');
});
