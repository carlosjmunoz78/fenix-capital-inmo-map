import test from 'node:test';
import assert from 'node:assert/strict';
import {EventBus} from '../runtime/runtime.mjs';
import {buildRsiShadowBridge,validateRsiCompatibleLearningRecord} from '../skills/skill-rsi-shadow-bridge.mjs';

function event(type='SKILL_CANDIDATE_STATIC_LAB_GREEN',id='evt:skill:test'){
  return {
    event_id:id,event_type:type,severity:'INFO',company_id:'GLOBAL_ONLY',engine_id:'FACT-001',environment:'PREPROD_CANDIDATE',version:'0.1.0',candidate_id:'candidate-1',
    target_engine_bindings:['FACT-001','QA-001'],reason:'STATIC_LAB_GREEN',
    evidence_ref:{source_ref:'https://example.test/skill',upstream_full_name:'acme/skill',upstream_head_commit:'abc',manifest_path:'skills/x/SKILL.md',manifest_sha256:'1'.repeat(64)},
    payload:{domain:'software-engineering-devops',coverage_score:100,policy_alignment_score:100},publish_authorized:false,prod_authorized:false
  };
}

test('green skill event becomes valid LAB learning candidate without persistent publish',()=>{
  const report=buildRsiShadowBridge({events:[event()]},{observedAt:'2026-10-06T00:00:00Z'});
  assert.equal(report.bridge_status,'SHADOW_BRIDGE_GREEN');
  assert.equal(report.runtime_events_accepted,1);
  assert.equal(report.learning_candidates_valid,1);
  assert.equal(report.persistent_publish_authorized,false);
  assert.equal(report.rsi_publish_authorized,false);
  assert.equal(report.prod_authorized,false);
  const record=report.learning_candidates[0];
  assert.equal(record.environment,'LAB');
  assert.equal(record.promotion_state,'CANDIDATE');
  assert.equal(record.risk_class,'LOW');
  assert.equal(validateRsiCompatibleLearningRecord(record).ok,true);
});

test('security advisory becomes higher-risk learning candidate',()=>{
  const e=event('SECURITY_ADVISORY','evt:skill:sec');
  e.severity='HIGH';
  e.reason='QUARANTINE_SECURITY_REVIEW';
  const report=buildRsiShadowBridge({events:[e]},{observedAt:'2026-10-06T00:00:00Z'});
  assert.equal(report.learning_candidates[0].risk_class,'HIGH');
  assert.equal(report.learning_candidates[0].expected_metric_delta.direction,'LOWER');
});

test('runtime EventBus idempotency catches duplicate proposal ids in shadow',()=>{
  const bus=new EventBus();
  const e=event();
  const report=buildRsiShadowBridge({events:[e,e]},{observedAt:'2026-10-06T00:00:00Z',eventBus:bus});
  assert.equal(report.runtime_events_accepted,1);
  assert.equal(report.runtime_duplicates,1);
  assert.equal(report.learning_candidates_valid,1);
});

test('RSI compatibility validator fails closed on missing evidence',()=>{
  const bad={learning_id:'x',company_id:'GLOBAL_ONLY',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',source_event_ids:['e'],source_type:'SKILL_SUPPLY_CHAIN',observed_at:'2026-10-06T00:00:00Z',hypothesis:'x',expected_metric_delta:{},confidence:0.5,risk_class:'LOW',evidence_refs:[],promotion_state:'CANDIDATE',created_by:'cap:skill-supply-chain',reason:'x'};
  const result=validateRsiCompatibleLearningRecord(bad);
  assert.equal(result.ok,false);
  assert.ok(result.errors.includes('invalid:evidence_refs'));
});
