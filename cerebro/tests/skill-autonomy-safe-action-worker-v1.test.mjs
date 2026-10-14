import test from 'node:test';
import assert from 'node:assert/strict';
import {selectNextSkillAutonomyAction,routeNextSkillAutonomyAction} from '../skills/skill-autonomy-safe-action-worker-v1.mjs';

function state(action){return {
  schema_version:'0.1.0',state_type:'CEREBRO_SKILL_AUTOLOOP_SAFE_STATE',company_id:'GLOBAL',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',enabled:true,mode:'SAFE_AUTONOMY_V0',
  safe_autonomy:{discovery:true,license_evidence:true,risk_and_overlap:true,static_lab:true,disabled_wrapper_plans:true,old_vs_new_synthetic_contracts:true,judge_and_tribunal_evidence:true,rollback_and_rebuild_proof:true,synthetic_behavioral_when_candidate_handler_is_green:true,preprod_promotion:false,prod_readonly_canary:false,prod_write:false,auto_merge:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,additional_cost_budget_eur:0},
  processed_candidate_ids:['skill-x'],in_flight:{},waiting_human:{},waiting_safe_handler:{},terminal_hold:{},
  completed:{'skill-x':{candidate_id:'skill-x',wrapper_id:'wrapper-x',domain:'seo',source_discovery_run_id:123,stage:'SKILL_AUTONOMY_DECISION_RECORDED',status:'COMPLETED',disposition:action.decision,evidence:{decision_id:action.decision_id},action_id:action.action_id,prod_authorized:false,prod_write:false,trading_access:false,additional_cost_eur:0}},
  autonomy_action_ledger:{'skill-x':action},autonomy_action_queue:{'skill-x':action},prod_authorized:false,autonomous_prod_promotion_authorized:false
};}

function wrap(){return {
  schema_version:'1.0.0',state_type:'CEREBRO_SKILL_AUTONOMY_ACTION_RECEIPT',action_id:'skill-action:wrap',decision_id:'skill-autonomy:wrap',company_id:'fenix',engine_id:'SKILL-AUTONOMY-ACTION',environment:'PREPROD',version:'1.0.0',skill_id:'skill-x',skill_version:'v1',decision:'ENVOLVER',
  action_type:'BUILD_INTERNAL_WRAPPER_PLAN',status:'WAITING_SAFE_ACTION_WORKER',next_gate:'INTERNAL_WRAPPER_BUILD_AND_REEVALUATE',target_engine_ids:['SEO-001'],queueable_safe_work:true,terminal_metadata_only:false,mutation_authorized:false,internal_wrapper_shadow_authorized:false,fact001_gap_candidate_authorized:false,fact001_create_authorized:false,paid_activation_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,external_skill_code_execution_authorized:false,additional_cost_eur:0,recorded_at:'2026-10-14T18:00:00Z'
};}

function gap(){return {...wrap(),action_id:'skill-action:gap',decision_id:'skill-autonomy:gap',decision:'FABRICAR_GRATIS',action_type:'FACT001_CAPABILITY_GAP_CANDIDATE',target_engine_ids:[],internal_wrapper_shadow_authorized:false,fact001_gap_candidate_authorized:true};}

test('selects deterministic waiting action',()=>{
  const s=state(wrap());
  assert.equal(selectNextSkillAutonomyAction(s).candidate_id,'skill-x');
});

test('ENVOLVER routes to existing engine evolution handoff without executing external skill code',()=>{
  const result=routeNextSkillAutonomyAction(state(wrap()),{now:'2026-10-14T19:00:00Z'});
  assert.equal(result.status,'ROUTED');
  assert.equal(result.handoff.state_type,'CEREBRO_SKILL_ENGINE_EXTENSION_HANDOFF');
  assert.deepEqual(result.handoff.target_engine_ids,['SEO-001']);
  assert.equal(result.handoff.next_gate,'SKILL_CAPABILITY_EVOLUTION_EXISTING_ENGINE');
  assert.equal(result.handoff.external_skill_code_execution_authorized,false);
  assert.equal(result.handoff.prod_authorized,false);
  assert.equal(result.handoff.additional_cost_eur,0);
  assert.equal(result.state.autonomy_action_queue['skill-x'],undefined);
  assert.equal(result.state.completed['skill-x'].action_status,'ROUTED_TO_EXISTING_GOVERNED_PIPELINE');
});

test('FABRICAR_GRATIS routes to FACT-001 registry capability-gap review without creating engine',()=>{
  const result=routeNextSkillAutonomyAction(state(gap()));
  assert.equal(result.handoff.state_type,'CEREBRO_FACT001_CAPABILITY_GAP_HANDOFF');
  assert.equal(result.handoff.factory_candidate_authorized,true);
  assert.equal(result.handoff.factory_create_authorized,false);
  assert.equal(result.handoff.registry_change_authorized,false);
  assert.equal(result.handoff.new_engine_id,null);
  assert.equal(result.handoff.next_gate,'FACT001_REGISTRY_CAPABILITY_GAP_REVIEW');
});

test('empty action queue is safe idempotent no-op',()=>{
  const s=state(wrap());s.autonomy_action_queue={};
  const result=routeNextSkillAutonomyAction(s,{now:'2026-10-14T20:00:00Z'});
  assert.equal(result.status,'IDLE_NO_SAFE_ACTION');
  assert.equal(result.handoff,null);
  assert.equal(result.state.prod_authorized,false);
});

test('worker fails closed on unsupported action and action/completed mismatch',()=>{
  const unsupported=wrap();unsupported.action_type='OTHER';
  assert.throws(()=>routeNextSkillAutonomyAction(state(unsupported)),/unsupported queued action/);
  const mismatch=state(wrap());mismatch.completed['skill-x'].action_id='different';
  assert.throws(()=>routeNextSkillAutonomyAction(mismatch),/action\/completed decision mismatch/);
});

test('worker rejects unsafe state before routing',()=>{
  const s=state(wrap());s.safe_autonomy.prod_write=true;
  assert.throws(()=>routeNextSkillAutonomyAction(s),/AUTOLOOP_STATE_UNSAFE/);
});
