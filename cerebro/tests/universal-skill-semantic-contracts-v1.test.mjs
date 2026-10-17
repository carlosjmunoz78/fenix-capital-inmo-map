import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSemanticContracts,resolveSemanticContract,validateAdapterAgainstContract} from '../runtime/universal-skill-semantic-contracts-v1.mjs';

test('every governed routing domain has exactly one reusable semantic contract family',()=>{
  const loaded=loadSemanticContracts();
  const routingDomains=loaded.routing.signals.domains.map((d)=>d.domain_id).sort();
  const contractDomains=Object.keys(loaded.registry.contracts).sort();
  assert.deepEqual(contractDomains,routingDomains);
  assert.equal(new Set(Object.values(loaded.registry.contracts).map((c)=>c.contract_id)).size,contractDomains.length);
});

test('each contract has measurable delta beyond safe baseline',()=>{
  const loaded=loadSemanticContracts();
  for(const [domain,contract] of Object.entries(loaded.registry.contracts)){
    assert.ok(contract.baseline_constraints.length>=1,domain);
    assert.ok(contract.required_constraints.length>contract.baseline_constraints.length,domain);
    for(const c of contract.baseline_constraints)assert.ok(contract.required_constraints.includes(c),`${domain}:${c}`);
  }
});

test('resolving a domain binding produces deterministic engine-specific contract',()=>{
  const a=resolveSemanticContract({domain_id:'data-database-supabase',engine_id:'DATA-001'});
  const b=resolveSemanticContract({domain_id:'data-database-supabase',engine_id:'DATA-001'});
  assert.equal(a.binding_contract_id,b.binding_contract_id);
  assert.equal(a.contract_id,'USAF-DATA-V1');
  assert.equal(a.engine_id,'DATA-001');
  assert.equal(a.old_vs_new_required,true);
  assert.equal(a.prod_write_authorized,false);
});

test('contract resolver refuses engines that are not governed bindings for the domain',()=>{
  assert.throws(()=>resolveSemanticContract({domain_id:'data-database-supabase',engine_id:'SEO-001'}),/ENGINE_NOT_BOUND_TO_DOMAIN/);
});

test('exact generated adapter profile can satisfy a reusable contract without expanding authority',()=>{
  const contract=resolveSemanticContract({domain_id:'software-engineering-devops',engine_id:'FACT-001'});
  const result=validateAdapterAgainstContract({contract,adapter_profile:{
    adapter_id:'adapter:test-engineering',contract_exact:true,required_constraints:[...contract.required_constraints],
    prod_authorized:false,prod_write_authorized:false,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0
  }});
  assert.equal(result.status,'ADAPTER_CONTRACT_GREEN');
  assert.equal(result.exact,true);
  assert.equal(result.authority_green,true);
});

test('adapter missing a semantic requirement fails closed',()=>{
  const contract=resolveSemanticContract({domain_id:'browser-automation-scraping',engine_id:'QA-001'});
  const result=validateAdapterAgainstContract({contract,adapter_profile:{
    adapter_id:'adapter:incomplete',contract_exact:true,required_constraints:contract.required_constraints.slice(0,-1),
    prod_authorized:false,prod_write_authorized:false,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0
  }});
  assert.equal(result.status,'ADAPTER_CONTRACT_HOLD');
  assert.equal(result.exact,false);
  assert.equal(result.missing_constraints.length,1);
});

test('adapter authority expansion is rejected even with perfect semantic constraint coverage',()=>{
  const contract=resolveSemanticContract({domain_id:'seo-search-content',engine_id:'SEO-001'});
  const result=validateAdapterAgainstContract({contract,adapter_profile:{
    adapter_id:'adapter:unsafe',contract_exact:true,required_constraints:[...contract.required_constraints],
    prod_authorized:true,prod_write_authorized:true,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0
  }});
  assert.equal(result.status,'ADAPTER_CONTRACT_HOLD');
  assert.equal(result.authority_green,false);
});
