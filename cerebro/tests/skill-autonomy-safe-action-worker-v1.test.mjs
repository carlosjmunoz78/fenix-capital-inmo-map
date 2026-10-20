import test from 'node:test';
import assert from 'node:assert/strict';
import {selectNextSkillAutonomyAction,routeNextSkillAutonomyAction,routeSkillAutonomyActions} from '../skills/skill-autonomy-safe-action-worker-v1.mjs';

function baseState(){return {
  schema_version:'0.1.0',state_type:'CEREBRO_SKILL_AUTOLOOP_SAFE_STATE',company_id:'GLOBAL',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',enabled:true,mode:'SAFE_AUTONOMY_V0',
  safe_autonomy:{discovery:true,license_evidence:true,risk_and_overlap:true,static_lab:true,disabled_wrapper_plans:true,old_vs_new_synthetic_contracts:true,judge_and_tribunal_evidence:true,rollback_and_rebuild_proof:true,synthetic_behavioral_when_candidate_handler_is_green:true,preprod_promotion:false,prod_readonly_canary:false,prod_write:false,auto_merge:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,additional_cost_budget_eur:0},
  processed_candidate_ids:[],in_flight:{},waiting_human:{},waiting_safe_handler:{},terminal_hold:{},completed:{},autonomy_action_ledger:{},autonomy_action_queue:{},prod_authorized:false,autonomous_prod_promotion_authorized:false
};}

function actionFor(id,{decision='ENVOLVER',recorded_at='2026-10-14T18:00:00Z'}={}){return {
  schema_version:'1.0.0',state_type:'CEREBRO_SKILL_AUTONOMY_ACTION_RECEIPT',action_id:`skill-action:${id}`,decision_id:`skill-autonomy:${id}`,company_id:'fenix',engine_id:'SKILL-AUTONOMY-ACTION',environment:'PREPROD',version:'1.0.0',skill_id:id,skill_version:'v1',decision,
  action_type:decision==='ENVOLVER'?'BUILD_INTERNAL_WRAPPER_PLAN':'FACT001_CAPABILITY_GAP_CANDIDATE',status:'WAITING_SAFE_ACTION_WORKER',next_gate:'INTERNAL_WRAPPER_BUILD_AND_REEVALUATE',target_engine_ids:decision==='ENVOLVER'?['SEO-001']:[],queueable_safe_work:true,terminal_metadata_only:false,mutation_authorized:false,internal_wrapper_shadow_authorized:false,fact001_gap_candidate_authorized:decision==='FABRICAR_GRATIS',fact001_create_authorized:false,paid_activation_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,external_skill_code_execution_authorized:false,additional_cost_eur:0,recorded_at
};}

function addAction(s,id,options={}){
  const action=actionFor(id,options);s.processed_candidate_ids.push(id);s.autonomy_action_queue[id]=action;s.autonomy_action_ledger[id]=action;s.completed[id]={candidate_id:id,wrapper_id:`wrapper-${id}`,domain:'seo',source_discovery_run_id:123,stage:'SKILL_AUTONOMY_DECISION_RECORDED',status:'COMPLETED',disposition:action.decision,evidence:{decision_id:action.decision_id},action_id:action.action_id,prod_authorized:false,prod_write:false,trading_access:false,additional_cost_eur:0};return action;
}

function state(action){const s=baseState();addAction(s,'skill-x',{decision:action.decision,recorded_at:action.recorded_at});s.autonomy_action_queue['skill-x']={...action,skill_id:'skill-x'};s.autonomy_action_ledger['skill-x']=s.autonomy_action_queue['skill-x'];s.completed['skill-x'].disposition=action.decision;s.completed['skill-x'].action_id=action.action_id;s.completed['skill-x'].evidence={decision_id:action.decision_id};return s;}
function wrap(){return actionFor('skill-x');}
function gap(){return actionFor('skill-x',{decision:'FABRICAR_GRATIS'});}

test('selects deterministic waiting action',()=>{assert.equal(selectNextSkillAutonomyAction(state(wrap())).candidate_id,'skill-x');});

test('ENVOLVER routes to existing engine evolution handoff without executing external skill code',()=>{
  const result=routeNextSkillAutonomyAction(state(wrap()),{now:'2026-10-14T19:00:00Z'});
  assert.equal(result.status,'ROUTED');assert.equal(result.handoff.state_type,'CEREBRO_SKILL_ENGINE_EXTENSION_HANDOFF');assert.deepEqual(result.handoff.target_engine_ids,['SEO-001']);assert.equal(result.handoff.next_gate,'SKILL_CAPABILITY_EVOLUTION_EXISTING_ENGINE');assert.equal(result.handoff.external_skill_code_execution_authorized,false);assert.equal(result.handoff.prod_authorized,false);assert.equal(result.handoff.additional_cost_eur,0);assert.equal(result.state.autonomy_action_queue['skill-x'],undefined);assert.equal(result.state.completed['skill-x'].action_status,'ROUTED_TO_EXISTING_GOVERNED_PIPELINE');
});

test('FABRICAR_GRATIS routes to FACT-001 registry capability-gap review without creating engine',()=>{
  const result=routeNextSkillAutonomyAction(state(gap()));assert.equal(result.handoff.state_type,'CEREBRO_FACT001_CAPABILITY_GAP_HANDOFF');assert.equal(result.handoff.factory_candidate_authorized,true);assert.equal(result.handoff.factory_create_authorized,false);assert.equal(result.handoff.registry_change_authorized,false);assert.equal(result.handoff.new_engine_id,null);assert.equal(result.handoff.next_gate,'FACT001_REGISTRY_CAPABILITY_GAP_REVIEW');
});

test('empty action queue is safe idempotent no-op',()=>{const s=state(wrap());s.autonomy_action_queue={};const result=routeNextSkillAutonomyAction(s,{now:'2026-10-14T20:00:00Z'});assert.equal(result.status,'IDLE_NO_SAFE_ACTION');assert.equal(result.handoff,null);assert.equal(result.state.prod_authorized,false);});

test('worker fails closed on unsupported action and action/completed mismatch',()=>{const unsupported=wrap();unsupported.action_type='OTHER';assert.throws(()=>routeNextSkillAutonomyAction(state(unsupported)),/unsupported queued action/);const mismatch=state(wrap());mismatch.completed['skill-x'].action_id='different';assert.throws(()=>routeNextSkillAutonomyAction(mismatch),/action\/completed decision mismatch/);});

test('worker rejects unsafe state before routing',()=>{const s=state(wrap());s.safe_autonomy.prod_write=true;assert.throws(()=>routeNextSkillAutonomyAction(s),/AUTOLOOP_STATE_UNSAFE/);});

test('batch worker routes up to eight independent safe actions deterministically in one cycle',()=>{
  const s=baseState();for(let i=0;i<10;i+=1)addAction(s,`skill-${i}`,{decision:i%2===0?'ENVOLVER':'FABRICAR_GRATIS',recorded_at:`2026-10-14T18:${String(i).padStart(2,'0')}:00Z`});
  const result=routeSkillAutonomyActions(s,{now:'2026-10-20T16:00:00Z',max_actions:8});
  assert.equal(result.status,'ROUTED_BATCH');assert.equal(result.routed,8);assert.equal(result.handoffs.length,8);assert.equal(result.remaining_queue_depth,2);assert.equal(Object.keys(result.state.autonomy_action_handoffs).length,8);assert.equal(result.state.autonomy_action_queue['skill-0'],undefined);assert.ok(result.state.autonomy_action_queue['skill-8']);
  for(const handoff of result.handoffs){assert.equal(handoff.prod_authorized,false);assert.equal(handoff.prod_write_authorized,false);assert.equal(handoff.trading_access,false);assert.equal(handoff.external_skill_code_execution_authorized,false);assert.equal(handoff.additional_cost_eur,0);}
});

test('batch worker rejects unsafe state and invalid batch sizes',()=>{const s=baseState();addAction(s,'skill-1');assert.throws(()=>routeSkillAutonomyActions(s,{max_actions:0}),/max_actions/);assert.throws(()=>routeSkillAutonomyActions(s,{max_actions:26}),/max_actions/);s.safe_autonomy.trading=true;assert.throws(()=>routeSkillAutonomyActions(s,{max_actions:8}),/AUTOLOOP_STATE_UNSAFE/);});