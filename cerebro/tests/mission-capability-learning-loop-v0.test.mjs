import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRsiShadowBridge } from '../skills/skill-rsi-shadow-bridge.mjs';
import {
  buildMissionLearningEvent,
  buildFactoryCapabilityGapHandoff,
  buildJarvisLearningFeed,
  shouldUseDeepSeek,
  maybeDeepSeekLearningAdvisory
} from '../runtime/mission-capability-learning-loop-v0.mjs';

function report(overrides={}){
  return {
    generated_at:'2026-10-29T21:30:00.000Z',
    company_id:'fenix',engine_id:'JOB-001',environment:'PREPROD',version:'mission-derived-useful-work-v1',lane:7,cycle:11,
    source_fingerprint:'source-fingerprint-1',execution_state:'EVIDENCE_COLLECTED',phase:'inventory',
    work_unit:{work_unit_id:'M01.inventory.inventory_scan',mission_id:'M01'},
    mission_scope:{title:'Factory first',scope_text:'Preserve existing behavior and discover useful work.',scope_fingerprint:'scope-fingerprint-1'},
    repo_evidence:{evidence_hits:3,top_evidence:[{path:'cerebro/registry/engine-registry.seed.json'},{path:'cerebro/runtime/runtime.mjs'}]},
    capability:null,test_result:null,
    ...overrides
  };
}

test('every PREPROD mission outcome becomes a valid RSI learning candidate and JARVIS feed candidate',()=>{
  const source=report();
  const event=buildMissionLearningEvent(source);
  assert.equal(event.source_type,'MISSION_DERIVED_WORK');
  assert.equal(event.publish_authorized,false);
  const bridge=buildRsiShadowBridge({events:[event]},{observedAt:event.observed_at});
  assert.equal(bridge.bridge_status,'SHADOW_BRIDGE_GREEN');
  assert.equal(bridge.learning_candidates_valid,1);
  assert.equal(bridge.learning_candidates_invalid,0);
  const feed=buildJarvisLearningFeed({report:source,bridge});
  assert.equal(feed.feed_state,'CANDIDATE_READY_FOR_EVALUATION');
  assert.equal(feed.learning_candidates.length,1);
  assert.equal(feed.learning_candidates[0].trust_state,'CANDIDATE_PENDING_INDEPENDENT_EVALUATION');
  assert.equal(feed.stable_memory_write_authorized,false);
  assert.equal(feed.skill_activation_authorized,false);
  assert.equal(feed.prod_write_authorized,false);
});

test('capability gap routes to existing FACT-001 governed review without authorizing creation',()=>{
  const source=report({
    phase:'capabilities',
    work_unit:{work_unit_id:'M07.capabilities.capability_ensure',mission_id:'M07'},
    capability:{capability:'browser-control',state:'MISSING_EVIDENCE',action:'ROUTE_TO_FACTORY'}
  });
  const handoff=buildFactoryCapabilityGapHandoff(source);
  assert.equal(handoff.state_type,'CEREBRO_FACT001_CAPABILITY_GAP_HANDOFF');
  assert.equal(handoff.factory_first,true);
  assert.equal(handoff.reuse_existing_first,true);
  assert.equal(handoff.factory_candidate_authorized,true);
  assert.equal(handoff.factory_create_authorized,false);
  assert.equal(handoff.next_gate,'FACT001_REGISTRY_CAPABILITY_GAP_REVIEW');
  assert.equal(handoff.prod_authorized,false);
});

test('failed test is learned as evidence but never auto-promoted',()=>{
  const source=report({
    phase:'test',execution_state:'FAILED_TEST',
    work_unit:{work_unit_id:'M03.test.contract_test',mission_id:'M03'},
    test_result:{ran:true,target:'cerebro/tests/example.test.mjs',passed:false,exit_code:1}
  });
  const event=buildMissionLearningEvent(source);
  assert.equal(event.event_type,'MISSION_EXECUTION_FAILURE_EVIDENCE');
  assert.equal(event.risk_class,'MEDIUM');
  const bridge=buildRsiShadowBridge({events:[event]},{observedAt:event.observed_at});
  const feed=buildJarvisLearningFeed({report:source,bridge});
  assert.equal(feed.feed_state,'CANDIDATE_READY_FOR_EVALUATION');
  assert.equal(feed.autonomous_self_modification_authorized,false);
  assert.equal(feed.next_gate,'LRN-001_INDEPENDENT_EVALUATION_AND_TRIBUNAL');
});

test('DeepSeek is selective and remains an untrusted advisory behind live money guard',async()=>{
  const source=report({
    phase:'capabilities',
    work_unit:{work_unit_id:'M09.capabilities.capability_ensure',mission_id:'M09'},
    capability:{capability:'market-intelligence',state:'MISSING_EVIDENCE',action:'ROUTE_TO_FACTORY'}
  });
  assert.equal(shouldUseDeepSeek(source,{force:true}),true);
  let authorized=0;let called=0;
  const advisory=await maybeDeepSeekLearningAdvisory(source,{
    allowPaid:true,apiKey:'test-secret-never-logged',force:true,projectedCostUsd:0.001,
    guard:{authorize:async()=>{authorized+=1;return {allowed:true,result:'ALLOW',auto_recharge:false};}},
    provider:{respond:async()=>{called+=1;return {provider:'deepseek',model:'deepseek-flash',request_id:'test',response_id:'resp-test',status:'completed',usage:{input_tokens:10,cached_input_tokens:0,output_tokens:20,reasoning_tokens:0},output_text:'{"learning_hypothesis":"reuse before build","reusable_procedure":["inspect","test"],"capability_recommendation":"reuse","confidence":0.9}'};}}
  });
  assert.equal(authorized,1);assert.equal(called,1);
  assert.equal(advisory.status,'ENRICHED');
  assert.equal(advisory.trust,'UNTRUSTED_ADVISORY_PENDING_EVALUATION');
  assert.equal(advisory.parsed.capability_recommendation,'reuse');
  assert.equal(advisory.prod_write_authorized,false);
});

test('DeepSeek stays off cleanly when paid route is not enabled',async()=>{
  const advisory=await maybeDeepSeekLearningAdvisory(report(),{allowPaid:false});
  assert.equal(advisory.status,'SKIPPED_POLICY');
  assert.equal(advisory.used,false);
});
