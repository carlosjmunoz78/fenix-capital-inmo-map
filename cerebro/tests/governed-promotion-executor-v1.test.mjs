import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessGovernedPromotion,finalizeGovernedPromotion,HUMAN_EXCEPTION_REASONS,REQUIRED_PROMOTION_GATES} from '../governance/governed-promotion-executor-v1.mjs';

const SHA='a'.repeat(40);
const greenGates=Object.fromEntries(REQUIRED_PROMOTION_GATES.map(k=>[k,true]));
function packet(overrides={}){return {state_type:'CEREBRO_GOVERNED_PROMOTION_PACKET_V1',company_id:'fenix',engine_id:'APP-001',target:'APP_FENIX_STATIC',pr_number:1055,expected_head_sha:SHA,gates:{...greenGates},additional_subscription_eur:0,trading_access:false,...overrides};}

test('all required gates produce PROMOTE_READY, never a false PROD claim',()=>{
  const r=assessGovernedPromotion(packet());
  assert.equal(r.status,'PROMOTE_READY');
  assert.equal(r.environment,'PREPROD');
  assert.equal(r.authority.prod_write_authorized,true);
  assert.equal(r.next_gate,'EXACT_HEAD_MERGE_AND_PHYSICAL_PROD_PROOF');
});

test('AUTO-001 closure packet declares every required PROD gate explicitly green',()=>{
  const workflow=fs.readFileSync('.github/workflows/cerebro-auto001-prod-closure-v1.yml','utf8');
  for(const gate of REQUIRED_PROMOTION_GATES){
    assert.match(workflow,new RegExp(`${gate}:true`),`closure packet missing ${gate}:true`);
  }
});

test('APP-001 PROD policy stays in exact gate and HUMAN_REQUIRED parity with executor',()=>{
  const registry=JSON.parse(fs.readFileSync('cerebro/registry/prod-promotion-policy-overrides.v1.json','utf8'));
  const app=registry.policies.find(p=>p.engine_id==='APP-001'&&p.target==='APP_FENIX_STATIC');
  assert.ok(app);
  assert.deepEqual([...app.required_gates].sort(),[...REQUIRED_PROMOTION_GATES].sort());
  assert.deepEqual([...app.human_required_reasons].sort(),[...HUMAN_EXCEPTION_REASONS].sort());
  assert.equal(app.required_terminal_state,'PROD_PROMOTED');
  assert.equal(app.additional_cost_limit_eur,0);
});

test('any missing gate returns REPAIR_REQUIRED',()=>{
  const r=assessGovernedPromotion(packet({gates:{...greenGates,rollback:false}}));
  assert.equal(r.status,'REPAIR_REQUIRED');
  assert.ok(r.blockers.includes('GATE_ROLLBACK_NOT_GREEN'));
});

test('unsupported target cannot promote',()=>{
  const r=assessGovernedPromotion(packet({target:'UNKNOWN'}));
  assert.equal(r.status,'REPAIR_REQUIRED');
  assert.ok(r.blockers.some(x=>x.startsWith('UNSUPPORTED_TARGET_ADAPTER_')));
});

test('cost and Trading cannot be silently expanded',()=>{
  assert.equal(assessGovernedPromotion(packet({additional_subscription_eur:1})).status,'REPAIR_REQUIRED');
  assert.equal(assessGovernedPromotion(packet({trading_access:true})).status,'REPAIR_REQUIRED');
});

test('HUMAN_REQUIRED is restricted to the eight canonical reasons',()=>{
  assert.deepEqual(HUMAN_EXCEPTION_REASONS,['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
  for(const reason of HUMAN_EXCEPTION_REASONS){assert.equal(assessGovernedPromotion(packet({human_exception:{reason,detail:'test'}})).status,'HUMAN_REQUIRED');}
  assert.throws(()=>assessGovernedPromotion(packet({human_exception:{reason:'OTHER'}})),/invalid HUMAN_REQUIRED reason/);
});

test('PROD_PROMOTED requires physical deployment, smoke and monitor proof',()=>{
  const missing=finalizeGovernedPromotion(packet(),{deployment_run_id:123,prod_source_sha:SHA,smoke_passed:true,monitor_passed:false});
  assert.equal(missing.status,'REPAIR_REQUIRED');
  assert.ok(missing.blockers.includes('PHYSICAL_MONITOR_NOT_GREEN'));
  const green=finalizeGovernedPromotion(packet(),{deployment_run_id:123,prod_source_sha:SHA,smoke_passed:true,monitor_passed:true,proof_url:'https://app.fenixcapital.es/PROD_SOURCE_SHA.txt'});
  assert.equal(green.status,'PROD_PROMOTED');
  assert.equal(green.environment,'PROD');
  assert.equal(green.next_gate,'MONITOR_AND_LEARN');
});
