import test from 'node:test';
import assert from 'node:assert/strict';
import {selectWaitingSafeCandidate,reconcileSafeHandlerResult} from '../skills/skill-autoloop-safe-handler.mjs';

function baseState(){return {
  schema_version:'0.1.0',state_type:'CEREBRO_SKILL_AUTOLOOP_SAFE_STATE',company_id:'GLOBAL',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',enabled:true,mode:'SAFE_AUTONOMY_V0',
  safe_autonomy:{discovery:true,license_evidence:true,risk_and_overlap:true,static_lab:true,disabled_wrapper_plans:true,old_vs_new_synthetic_contracts:true,judge_and_tribunal_evidence:true,rollback_and_rebuild_proof:true,synthetic_behavioral_when_candidate_handler_is_green:true,preprod_promotion:false,prod_readonly_canary:false,prod_write:false,auto_merge:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,additional_cost_budget_eur:0},
  processed_candidate_ids:['a','b'],in_flight:{},waiting_human:{},waiting_safe_handler:{
    a:{candidate_id:'a',name:'A',status:'WAITING_SAFE_HANDLER',value_score:80,checkpointed_at:'2026-10-08T01:00:00Z'},
    b:{candidate_id:'b',name:'B',wrapper_id:'wrapper-b',status:'WAITING_SAFE_HANDLER',value_score:90,checkpointed_at:'2026-10-08T02:00:00Z'}
  },completed:{},terminal_hold:{},prod_authorized:false,autonomous_prod_promotion_authorized:false
};}

test('highest value waiting safe candidate is selected deterministically',()=>{
  assert.equal(selectWaitingSafeCandidate(baseState()).candidate_id,'b');
});

test('canonical free gap decision records decision and queues governed FACT-001 gap work without human gate',()=>{
  const s=reconcileSafeHandlerResult(baseState(),'b',{outcome:'AUTONOMOUS_PREPROD_DECISION',evidence:{decision:'FABRICAR_GRATIS',decision_id:'skill-autonomy:123',factory_candidate_authorized:true,additional_cost_eur:0},now:'2026-10-08T03:00:00Z'});
  assert.equal(s.waiting_safe_handler.b,undefined);
  assert.equal(s.waiting_human.b,undefined);
  assert.equal(s.completed.b.status,'COMPLETED');
  assert.equal(s.completed.b.disposition,'FABRICAR_GRATIS');
  assert.equal(s.completed.b.human_required,null);
  assert.equal(s.completed.b.action_type,'FACT001_CAPABILITY_GAP_CANDIDATE');
  assert.equal(s.completed.b.action_status,'WAITING_SAFE_ACTION_WORKER');
  assert.equal(s.autonomy_action_queue.b.status,'WAITING_SAFE_ACTION_WORKER');
  assert.equal(s.autonomy_action_queue.b.fact001_create_authorized,false);
  assert.equal(s.autonomy_action_queue.b.prod_authorized,false);
  assert.equal(s.enabled,true);
  assert.ok(s.waiting_safe_handler.a);
});

test('ENVOLVER queues internal wrapper build against existing engine and never external execution',()=>{
  const state=baseState();state.waiting_safe_handler.b.engine_bindings=['SEO-001'];
  const s=reconcileSafeHandlerResult(state,'b',{outcome:'AUTONOMOUS_PREPROD_DECISION',evidence:{decision:'ENVOLVER',decision_id:'skill-autonomy:wrap',preprod_internal_wrapper_activation_authorized:false,additional_cost_eur:0},now:'2026-10-08T03:00:00Z'});
  assert.equal(s.autonomy_action_queue.b.action_type,'BUILD_INTERNAL_WRAPPER_PLAN');
  assert.deepEqual(s.autonomy_action_queue.b.target_engine_ids,['SEO-001']);
  assert.equal(s.autonomy_action_queue.b.internal_wrapper_shadow_authorized,false);
  assert.equal(s.autonomy_action_queue.b.external_skill_code_execution_authorized,false);
  assert.equal(s.completed.b.next_gate,'INTERNAL_WRAPPER_BUILD_AND_REEVALUATE');
});

test('real canonical human exception is routed to waiting_human with exact reason',()=>{
  const s=reconcileSafeHandlerResult(baseState(),'b',{outcome:'HUMAN_REQUIRED',evidence:{human_required:'POLICY_CONFLICT',decision:'HOLD'},now:'2026-10-08T03:00:00Z'});
  assert.equal(s.waiting_safe_handler.b,undefined);
  assert.equal(s.waiting_human.b.human_required,'POLICY_CONFLICT');
  assert.equal(s.waiting_human.b.stage,'SKILL_AUTONOMY_HUMAN_EXCEPTION');
  assert.equal(s.waiting_human.b.prod_authorized,false);
});

test('non-canonical human exception is rejected',()=>{
  assert.throws(()=>reconcileSafeHandlerResult(baseState(),'b',{outcome:'HUMAN_REQUIRED',evidence:{human_required:'OTHER'}}),/INVALID_HUMAN_EXCEPTION/);
});

test('legacy GREEN handler route remains fail-closed behind HIGH_RISK for old artifacts only',()=>{
  const s=reconcileSafeHandlerResult(baseState(),'b',{outcome:'READY_FOR_PREPROD_PROMOTION_REVIEW',evidence:{run_id:7},now:'2026-10-08T03:00:00Z'});
  assert.equal(s.waiting_human.b.human_required,'HIGH_RISK');
  assert.equal(s.waiting_human.b.stage,'PREPROD_PROMOTION_REVIEW_LEGACY');
  assert.equal(s.waiting_human.b.evidence.legacy_generic_high_risk_gate,true);
});

test('terminal hold does not ask human and preserves zero-cost safety',()=>{
  const s=reconcileSafeHandlerResult(baseState(),'b',{outcome:'TERMINAL_HOLD',evidence:{reason:'LOW_VALUE_OR_POLICY_HOLD'}});
  assert.equal(s.terminal_hold.b.status,'TERMINAL_HOLD');
  assert.equal(s.terminal_hold.b.human_required,null);
  assert.equal(s.terminal_hold.b.additional_cost_eur,0);
  assert.equal(s.prod_authorized,false);
});

test('transient failure retries same safe handler without crossing a human gate',()=>{
  const s=reconcileSafeHandlerResult(baseState(),'b',{outcome:'RETRY_SAFE_HANDLER',evidence:{reason:'HTTP_429'}});
  assert.equal(s.waiting_safe_handler.b.status,'WAITING_SAFE_HANDLER');
  assert.equal(s.waiting_safe_handler.b.retry_count,1);
  assert.equal(s.waiting_safe_handler.b.human_required,null);
});

test('autonomous PREPROD decision requires canonical disposition, decision id and exact action invariants',()=>{
  assert.throws(()=>reconcileSafeHandlerResult(baseState(),'b',{outcome:'AUTONOMOUS_PREPROD_DECISION',evidence:{decision:'OTHER'}}),/INVALID_SKILL_AUTONOMY_DECISION/);
  assert.throws(()=>reconcileSafeHandlerResult(baseState(),'b',{outcome:'AUTONOMOUS_PREPROD_DECISION',evidence:{decision:'ENVOLVER',human_required:'HIGH_RISK'}}),/MUST_NOT_REQUIRE_HUMAN/);
  assert.throws(()=>reconcileSafeHandlerResult(baseState(),'b',{outcome:'AUTONOMOUS_PREPROD_DECISION',evidence:{decision:'FABRICAR_GRATIS',decision_id:'skill-autonomy:no-factory-flag'}}),/candidate-only/);
});

test('unsafe state is rejected before selection or reconciliation',()=>{
  const s=baseState();s.safe_autonomy.prod_write=true;
  assert.throws(()=>selectWaitingSafeCandidate(s),/AUTOLOOP_STATE_UNSAFE/);
});
