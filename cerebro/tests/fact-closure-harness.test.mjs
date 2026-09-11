import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyEngineState,buildFactoryDocumentationClosure,evaluateFactoryClosure,FACTORY_STATE_MODEL} from '../factory/fact-closure-harness.mjs';

const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'};
const fact={company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'0.1.0'};

test('engine state model is canonical and monotonic',()=>{
  assert.deepEqual(FACTORY_STATE_MODEL,['DEFINED','STRUCTURAL_GREEN','PREPROD_GREEN','LIVE_EVIDENCE','PROD_AUTONOMY']);
  assert.equal(classifyEngineState({context:ctx}).state,'DEFINED');
  const structural={context:ctx,scaffold_complete:true,contracts:true,permissions:true,tests:true};
  assert.equal(classifyEngineState(structural).state,'STRUCTURAL_GREEN');
  const preprod={...structural,evaluation:true,tribunal:true,observability:true,backup:true,rollback:true,rebuild:true,cost:true,policy:true,preprod:true};
  assert.equal(classifyEngineState(preprod).state,'PREPROD_GREEN');
  assert.equal(classifyEngineState({...preprod,live_evidence_refs:['evidence://1']}).state,'LIVE_EVIDENCE');
  assert.equal(classifyEngineState({...preprod,live_evidence_refs:['evidence://1'],autonomy_approved:true,prod_promotion_approved:true}).state,'PROD_AUTONOMY');
});

test('state classifier fail-closes Trading and PROD write',()=>{
  assert.equal(classifyEngineState({context:ctx,trading_access:true}).reason,'POLICY_CONFLICT');
  assert.equal(classifyEngineState({context:ctx,prod_write:true}).reason,'HIGH_RISK');
});

test('documentation closure requires all canonical documents',()=>{
  const all={ENGINE_REGISTRY:true,DEPENDENCY_MAP:true,RUNBOOK:true,CHANGELOG:true,BACKUP_REBUILD:true,AUTONOMY_STATE:true};
  assert.equal(buildFactoryDocumentationClosure({updated:all}).status,'DOCUMENTATION_READY');
  const blocked=buildFactoryDocumentationClosure({updated:{...all,RUNBOOK:false}});
  assert.equal(blocked.status,'BLOCKED');
  assert.deepEqual(blocked.missing,['RUNBOOK']);
});

test('FACT closure passes only all technical gates',()=>{
  const gates={factory_e2e:true,self_test:true,rebuild_equivalent:true,old_vs_new:true,rollback_verified:true,registry_state_tracking:true,dependency_map:true,docs_closure:true,promotion_gate:true,cost_gate:true,preprod:true};
  const r=evaluateFactoryClosure({context:fact,...gates,additional_cost_eur:0});
  assert.equal(r.status,'FACTORY_CLOSURE_READY');
  assert.equal(r.ready,true);
  assert.equal(r.prod_execution,false);
  assert.equal(r.autonomous_prod,false);
  const blocked=evaluateFactoryClosure({context:fact,...gates,old_vs_new:false});
  assert.equal(blocked.status,'BLOCKED');
  assert.deepEqual(blocked.missing,['old_vs_new']);
});

test('FACT closure blocks non-PREPROD, Trading and cost',()=>{
  const gates={factory_e2e:true,self_test:true,rebuild_equivalent:true,old_vs_new:true,rollback_verified:true,registry_state_tracking:true,dependency_map:true,docs_closure:true,promotion_gate:true,cost_gate:true,preprod:true};
  assert.equal(evaluateFactoryClosure({context:{...fact,environment:'PROD'},...gates}).reason,'HIGH_RISK');
  assert.equal(evaluateFactoryClosure({context:fact,...gates,trading:true}).reason,'POLICY_CONFLICT');
  assert.equal(evaluateFactoryClosure({context:fact,...gates,additional_cost_eur:0.01}).reason,'MONEY_LIMIT');
});