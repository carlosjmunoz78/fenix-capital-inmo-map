import test from 'node:test';
import assert from 'node:assert/strict';
import { runFactSkillNative, FACT_SKILL_NATIVE_FULL_GATES, FACT_SKILL_NATIVE_ROUTE } from '../runtime/fact-skill-native-v1.mjs';
import { routeFactSkillNative } from '../runtime/fact-skill-native-router-v1.mjs';

const HASH='a'.repeat(64);
function fixture(overrides={}){
  const base={
    company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'1.0.0',risk_class:'LOW',
    candidate:{skill_id:'synthetic-safe-skill',skill_version:'1.2.3',source_ref:'fixture://synthetic-safe-skill',manifest_sha256:HASH,license_spdx:'MIT'},
    observed_registry:[],
    impact:{existing_engine_bindings:['FACT-001']},
    evidence:{confidence:0.99,old_vs_new:{decision:'PASS',reasons:['NO_REGRESSION']},evaluation:{decision:'PASS'},tribunal:{decision:'PASS'}},
    security:{provenance_ok:true,supply_chain_ok:true,license_ok:true,incident:false,legal_required:false,policy_conflict:false},
    permissions:{requested:['skill:register','skill:evaluate'],allowed:['skill:register','skill:evaluate'],locked:true},
    policy:{locked:true},
    lifecycle:{
      internal_wrapper_ready:true,external_code_execution_required:false,rollback_ready:true,rebuild_ready:true,backup_ready:true,
      runbook_ready:true,changelog_ready:true,dependencies_mapped:true,router_connected:true,integration_e2e_green:true,
      observability_connected:true,idempotency_proven:true,fallback_ready:true,preprod_green_evidence:true,learning_hooks_connected:true
    },
    demand:{needed_now:true},
    cost:{additional_cost_eur:0,zero_cost_alternative:false,roi_positive:false,money_limit_exceeded:false}
  };
  return { ...base, ...overrides };
}

test('synthetic governed skill closes every NATIVA/FULL PREPROD gate',()=>{
  const receipt=runFactSkillNative(fixture());
  assert.equal(receipt.status,'NATIVE_FULL_PREPROD');
  assert.equal(receipt.native_full,true);
  assert.equal(receipt.decision.decision,'ENVOLVER');
  assert.equal(receipt.promotion.preprod_registration_authorized,true);
  assert.equal(receipt.promotion.prod_authorized,false);
  assert.equal(receipt.discovery_import.external_skill_code_executed,false);
  assert.equal(receipt.finops.additional_cost_eur,0);
  assert.deepEqual(receipt.failed_gates,[]);
  for(const gate of FACT_SKILL_NATIVE_FULL_GATES) assert.equal(receipt.full_gates[gate],true,gate);
  assert.equal(receipt.learning.hooks_connected,true);
  assert.ok(receipt.events.some((event)=>event.type==='skill.native.learning.feedback'));
});

test('same candidate is idempotent and versioned',()=>{
  const one=runFactSkillNative(fixture());
  const two=runFactSkillNative(fixture());
  assert.equal(one.registration.registration_id,two.registration.registration_id);
  assert.equal(one.observability.idempotency_key,two.observability.idempotency_key);
});

test('exact duplicate reuses existing capability instead of creating a new engine',()=>{
  const input=fixture({observed_registry:[{skill_id:'synthetic-safe-skill',skill_version:'1.2.3',manifest_sha256:HASH}]});
  const receipt=runFactSkillNative(input);
  assert.equal(receipt.registration.duplicate,true);
  assert.equal(receipt.decision.decision,'REUTILIZAR');
  assert.equal(receipt.impact_analysis.create_new_engine_authorized,false);
  assert.equal(receipt.native_full,true);
});

test('permission expansion fails closed',()=>{
  const input=fixture({permissions:{requested:['skill:register','repo:write'],allowed:['skill:register'],locked:true}});
  const receipt=runFactSkillNative(input);
  assert.equal(receipt.native_full,false);
  assert.equal(receipt.status,'HOLD');
  assert.ok(receipt.failed_gates.includes('permissions_policy'));
});

test('HIGH risk emits only canonical HUMAN_REQUIRED and never promotes',()=>{
  const receipt=runFactSkillNative(fixture({risk_class:'HIGH'}));
  assert.equal(receipt.status,'HUMAN_REQUIRED');
  assert.equal(receipt.decision.human_required,'HIGH_RISK');
  assert.equal(receipt.promotion.preprod_registration_authorized,false);
  assert.equal(receipt.promotion.prod_authorized,false);
});

test('gateway/router enforces PREPROD, FACT ownership and company isolation',()=>{
  const payload=fixture();
  const receipt=routeFactSkillNative({route:FACT_SKILL_NATIVE_ROUTE,payload,context:{gateway_authorized:true,environment:'PREPROD',company_id:'fenix',engine_id:'FACT-001'}});
  assert.equal(receipt.native_full,true);
  assert.throws(()=>routeFactSkillNative({route:FACT_SKILL_NATIVE_ROUTE,payload,context:{gateway_authorized:true,environment:'PREPROD',company_id:'other',engine_id:'FACT-001'}}),/CROSS_COMPANY_ROUTE_DENIED/);
  assert.throws(()=>routeFactSkillNative({route:FACT_SKILL_NATIVE_ROUTE,payload,context:{gateway_authorized:false,environment:'PREPROD',company_id:'fenix',engine_id:'FACT-001'}}),/GATEWAY_AUTHORIZATION_REQUIRED/);
});

test('PROD route is denied by construction',()=>{
  const payload={...fixture(),environment:'PROD'};
  assert.throws(()=>runFactSkillNative(payload),/PREPROD-only/);
});
