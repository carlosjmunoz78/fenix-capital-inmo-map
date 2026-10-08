import test from 'node:test';
import assert from 'node:assert/strict';
import {checkpointNextCandidate,moveCandidateToHumanGate,validateSafeAutoloopState} from '../skills/skill-autoloop-controller.mjs';
import {buildHumanRequiredEmailEnvelope,resolveHumanAlias} from '../governance/human-communication.mjs';

function baseState(){return {
  schema_version:'0.1.0',state_type:'CEREBRO_SKILL_AUTOLOOP_SAFE_STATE',company_id:'GLOBAL',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',enabled:true,mode:'SAFE_AUTONOMY_V0',
  safe_autonomy:{discovery:true,license_evidence:true,risk_and_overlap:true,static_lab:true,disabled_wrapper_plans:true,old_vs_new_synthetic_contracts:true,judge_and_tribunal_evidence:true,rollback_and_rebuild_proof:true,synthetic_behavioral_when_candidate_handler_is_green:true,preprod_promotion:false,prod_readonly_canary:false,prod_write:false,auto_merge:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,additional_cost_budget_eur:0},
  processed_candidate_ids:[],in_flight:{},waiting_human:{},waiting_safe_handler:{},completed:{},terminal_hold:{},prod_authorized:false,autonomous_prod_promotion_authorized:false
};}

const selected={selected:{candidate_id:'candidate-a',declared_name:'A',wrapper_id:'wrap:a',domain:'knowledge',engine_bindings:['FACT-001'],value_score:81,recommendation:'HIGH_VALUE_LAB_BENCHMARK',evidence_refs:{static:'x'}}};

test('safe baseline validates and forbidden autonomous flags fail closed',()=>{
  assert.equal(validateSafeAutoloopState(baseState()).green,true);
  const unsafe=baseState();unsafe.safe_autonomy.auto_merge=true;
  const v=validateSafeAutoloopState(unsafe);
  assert.equal(v.green,false);
  assert.ok(v.errors.includes('FORBIDDEN_AUTONOMY_AUTO_MERGE'));
});

test('new static-ready candidate is checkpointed without PROD or human escalation',()=>{
  const d=checkpointNextCandidate(baseState(),selected,{now:'2026-10-08T00:00:00Z',source_run_id:123});
  assert.equal(d.decision,'CHECKPOINT_NEXT_CANDIDATE_AND_CONTINUE_QUEUE');
  assert.equal(d.candidate_id,'candidate-a');
  assert.equal(d.human_required,null);
  assert.equal(d.prod_authorized,false);
  assert.equal(d.state.waiting_safe_handler['candidate-a'].status,'WAITING_SAFE_HANDLER');
  assert.equal(d.state.waiting_safe_handler['candidate-a'].human_alias,'Skill A');
  assert.equal(d.state.waiting_safe_handler['candidate-a'].external_skill_code_execution,false);
  assert.equal(d.state.waiting_safe_handler['candidate-a'].additional_cost_eur,0);
});

test('checkpoint is idempotent and does not loop the same candidate',()=>{
  const first=checkpointNextCandidate(baseState(),selected,{source_run_id:1});
  const second=checkpointNextCandidate(first.state,selected,{source_run_id:2});
  assert.equal(second.decision,'SKIP_ALREADY_CHECKPOINTED_CANDIDATE');
  assert.equal(second.state.processed_candidate_ids.filter((x)=>x==='candidate-a').length,1);
});

test('human gate moves only that candidate, preserves alias and leaves safe queue enabled',()=>{
  const first=checkpointNextCandidate(baseState(),selected,{source_run_id:1});
  const moved=moveCandidateToHumanGate(first.state,'candidate-a',{human_required:'HIGH_RISK',stage:'PREPROD_PROMOTION_REVIEW',evidence:{run_id:99}});
  assert.equal(moved.waiting_safe_handler['candidate-a'],undefined);
  assert.equal(moved.waiting_human['candidate-a'].human_required,'HIGH_RISK');
  assert.equal(moved.waiting_human['candidate-a'].human_alias,'Skill A');
  assert.equal(moved.enabled,true);
  assert.equal(moved.prod_authorized,false);
  assert.match(moved.last_action,/CONTINUE_OTHER_SAFE_WORK/);
});

test('unknown human reason is rejected',()=>{
  assert.throws(()=>moveCandidateToHumanGate(baseState(),'x',{human_required:'SOMETHING_ELSE'}),/INVALID_HUMAN_EXCEPTION/);
});

test('empty next candidate becomes idle without disabling AutoLoop',()=>{
  const d=checkpointNextCandidate(baseState(),{selected:null},{source_run_id:3});
  assert.equal(d.decision,'IDLE_NO_NEW_ELIGIBLE_CANDIDATE');
  assert.equal(d.state.enabled,true);
});

test('known skill aliases are human-first without replacing technical identity',()=>{
  assert.equal(resolveHumanAlias({name:'skill-creator',candidate_id:'technical-id'}),'Creador de Skills');
  assert.equal(resolveHumanAlias({name:'obsidian'}),'Memoria Obsidian');
  const email=buildHumanRequiredEmailEnvelope({
    item:{name:'obsidian',candidate_id:'lobehub:123',stage:'PREPROD_PROMOTION_REVIEW',human_required:'HIGH_RISK',updated_at:'2026-10-08T00:00:00Z'},
    plain_language:'Necesito que autorices el siguiente paso.',
    exact_action:'Revisar y decidir.'
  });
  assert.match(email.subject,/Memoria Obsidian/);
  assert.equal(email.first_line,'Te necesito.');
  assert.match(email.dedupe_marker,/lobehub:123/);
  assert.equal(email.gated_action_authorized,false);
});
