import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSkillAutonomyActionReceipt,applySkillAutonomyActionReceipt} from '../skills/skill-autonomy-action-application-v1.mjs';

function decision(kind,overrides={}){
  const bindings=kind==='ENVOLVER'||kind==='REUTILIZAR'?['SEO-001']:[];
  return {
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_CAPABILITY_AUTONOMY_DECISION',decision_id:`skill-autonomy:${kind.toLowerCase()}`,
    company_id:'fenix',engine_id:'SKILL-AUTONOMY-CLOSURE',environment:'PREPROD',version:'1.0.0',skill_id:'skill-x',skill_version:'abc123',
    decision:kind,reasons:[],human_required:null,existing_engine_bindings:bindings,
    use_existing_authorized:kind==='REUTILIZAR',preprod_internal_wrapper_activation_authorized:false,
    factory_candidate_authorized:kind==='FABRICAR_GRATIS',factory_create_authorized:false,catalog_only:kind==='CATALOGAR',paid_activation_authorized:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,external_code_execution_authorized:false,
    rollback_required:kind==='ENVOLVER',rollback_ready:true,rebuild_ready:true,additional_cost_eur:0,next_gate:'TEST',
    ...overrides
  };
}

function safeState(d){
  return {
    schema_version:'0.1.0',state_type:'CEREBRO_SKILL_AUTOLOOP_SAFE_STATE',company_id:'GLOBAL',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',enabled:true,mode:'SAFE_AUTONOMY_V0',
    safe_autonomy:{discovery:true,license_evidence:true,risk_and_overlap:true,static_lab:true,disabled_wrapper_plans:true,old_vs_new_synthetic_contracts:true,judge_and_tribunal_evidence:true,rollback_and_rebuild_proof:true,synthetic_behavioral_when_candidate_handler_is_green:true,preprod_promotion:false,prod_readonly_canary:false,prod_write:false,auto_merge:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,additional_cost_budget_eur:0},
    processed_candidate_ids:['skill-x'],in_flight:{},waiting_human:{},waiting_safe_handler:{},terminal_hold:{},
    completed:{'skill-x':{candidate_id:'skill-x',stage:'SKILL_AUTONOMY_DECISION_RECORDED',status:'COMPLETED',disposition:d.decision,evidence:{decision_id:d.decision_id},prod_authorized:false,prod_write:false,trading_access:false,additional_cost_eur:0}},
    prod_authorized:false,autonomous_prod_promotion_authorized:false
  };
}

test('all seven canonical decisions map to bounded action receipts',()=>{
  const expected={
    REUTILIZAR:'REUSE_EXISTING_CAPABILITY',ENVOLVER:'BUILD_INTERNAL_WRAPPER_PLAN',CATALOGAR:'CATALOG_CAPABILITY',
    FABRICAR_GRATIS:'FACT001_CAPABILITY_GAP_CANDIDATE',HOLD:'HOLD_NO_ACTION',DESCARTAR:'REJECT_CAPABILITY',PAGO_JUSTIFICADO:'PAID_EXCEPTION_REVIEW'
  };
  for(const [kind,action] of Object.entries(expected)){
    const extra=kind==='PAGO_JUSTIFICADO'?{additional_cost_eur:20}:{};
    const out=buildSkillAutonomyActionReceipt(decision(kind,extra));
    assert.equal(out.action_type,action);
    assert.equal(out.prod_authorized,false);
    assert.equal(out.prod_write_authorized,false);
    assert.equal(out.trading_access,false);
    assert.equal(out.external_skill_code_execution_authorized,false);
    assert.equal(out.fact001_create_authorized,false);
    assert.equal(out.paid_activation_authorized,false);
  }
});

test('ENVOLVER queues internal wrapper build instead of activating external code',()=>{
  const out=buildSkillAutonomyActionReceipt(decision('ENVOLVER'));
  assert.equal(out.status,'QUEUED_SAFE_WORK');
  assert.equal(out.queueable_safe_work,true);
  assert.equal(out.mutation_authorized,false);
  assert.equal(out.internal_wrapper_shadow_authorized,false);
  assert.equal(out.next_gate,'INTERNAL_WRAPPER_BUILD_AND_REEVALUATE');
  assert.deepEqual(out.target_engine_ids,['SEO-001']);
});

test('verified free gap becomes FACT-001 gap candidate but never direct factory creation',()=>{
  const out=buildSkillAutonomyActionReceipt(decision('FABRICAR_GRATIS'));
  assert.equal(out.action_type,'FACT001_CAPABILITY_GAP_CANDIDATE');
  assert.equal(out.fact001_gap_candidate_authorized,true);
  assert.equal(out.fact001_create_authorized,false);
  assert.equal(out.queueable_safe_work,true);
  assert.equal(out.additional_cost_eur,0);
});

test('metadata-only outcomes do not enter safe work queue',()=>{
  for(const kind of ['REUTILIZAR','CATALOGAR','DESCARTAR']){
    const out=buildSkillAutonomyActionReceipt(decision(kind));
    assert.equal(out.terminal_metadata_only,true);
    assert.equal(out.queueable_safe_work,false);
    assert.equal(out.mutation_authorized,false);
  }
});

test('paid exception never pays and MONEY_LIMIT remains canonical human exception',()=>{
  const out=buildSkillAutonomyActionReceipt(decision('PAGO_JUSTIFICADO',{additional_cost_eur:40,human_required:'MONEY_LIMIT'}));
  assert.equal(out.status,'BLOCKED');
  assert.equal(out.next_gate,'MONEY_LIMIT');
  assert.equal(out.paid_activation_authorized,false);
  assert.equal(out.human_required,'MONEY_LIMIT');
});

test('autonomous action receipt is durably routed in safe state and is idempotent',()=>{
  const d=decision('ENVOLVER');
  const receipt=buildSkillAutonomyActionReceipt(d);
  const s1=applySkillAutonomyActionReceipt(safeState(d),receipt,{now:'2026-10-14T18:00:00Z'});
  assert.equal(s1.autonomy_action_ledger['skill-x'].action_id,receipt.action_id);
  assert.equal(s1.autonomy_action_queue['skill-x'].status,'WAITING_SAFE_ACTION_WORKER');
  assert.equal(s1.completed['skill-x'].action_status,'WAITING_SAFE_ACTION_WORKER');
  assert.equal(s1.prod_authorized,false);
  assert.equal(s1.safe_autonomy.preprod_promotion,false);
  const s2=applySkillAutonomyActionReceipt(s1,receipt,{now:'2026-10-14T19:00:00Z'});
  assert.deepEqual(s2.autonomy_action_ledger['skill-x'],s1.autonomy_action_ledger['skill-x']);
});

test('metadata-only action is recorded without action queue entry',()=>{
  const d=decision('REUTILIZAR');
  const receipt=buildSkillAutonomyActionReceipt(d);
  const s=applySkillAutonomyActionReceipt(safeState(d),receipt);
  assert.equal(s.autonomy_action_ledger['skill-x'].status,'APPLIED_METADATA_ONLY');
  assert.equal(s.autonomy_action_queue['skill-x'],undefined);
  assert.equal(s.completed['skill-x'].action_status,'APPLIED_METADATA_ONLY');
});

test('action application fails closed on mismatched decision, unsafe state and human-required receipt',()=>{
  const d=decision('ENVOLVER');
  const receipt=buildSkillAutonomyActionReceipt(d);
  const mismatch=safeState(d);mismatch.completed['skill-x'].evidence.decision_id='different';
  assert.throws(()=>applySkillAutonomyActionReceipt(mismatch,receipt),/does not match recorded decision/);
  const unsafe=safeState(d);unsafe.safe_autonomy.prod_write=true;
  assert.throws(()=>applySkillAutonomyActionReceipt(unsafe,receipt),/AUTOLOOP_STATE_UNSAFE/);
  const human=buildSkillAutonomyActionReceipt(decision('HOLD',{human_required:'POLICY_CONFLICT'}));
  assert.throws(()=>applySkillAutonomyActionReceipt(safeState(decision('HOLD',{human_required:'POLICY_CONFLICT'})),human),/human-required receipt/);
});

test('ENVOLVER without engine binding and malformed FACT candidate fail closed',()=>{
  assert.throws(()=>buildSkillAutonomyActionReceipt(decision('ENVOLVER',{existing_engine_bindings:[]})),/requires existing_engine_bindings/);
  assert.throws(()=>buildSkillAutonomyActionReceipt(decision('FABRICAR_GRATIS',{factory_candidate_authorized:false})),/candidate-only/);
});
