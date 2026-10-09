import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_HUMAN_REQUIRED,
  HUMAN_EXCEPTION_SUPERVISOR_V0_CONTRACT,
  initialHumanExceptionSupervisorState,
  ingestHumanException,
  ingestHumanExceptionBatch,
  normalizeHumanException,
  validateSupervisorState
} from '../governance/human-exception-supervisor.mjs';
import {envelopeFromHumanRequired,ingestSkillHumanRequired,initialCommunicationState} from '../communication/communication-controller.mjs';

function payload(overrides={}){
  return {
    event_id:'evt-hex-001',company_id:'fenix',engine_id:'APP-001',human_required:'HIGH_RISK',observed_at:'2026-10-09T06:10:00Z',source:'cerebro.test',stage:'PREPROD_ACTION_REVIEW',
    human_alias:'App Fénix',plain_language:'Una acción controlada ha superado el umbral de riesgo permitido.',purpose:'Mantener la App dentro del perímetro de autonomía aprobado.',requested_change:'Revisar esta acción y decidir si puede continuar.',
    reason_summary:'El riesgo calculado supera el umbral autónomo.',evidence_refs:['run:123','git:48bcbe126beb35667b31d91a9fdb0db334c2b727'],resource_scope:['app-preprod'],rollback_green:true,
    contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,
    ...overrides
  };
}

test('canonical policy contains exactly the eight project human exception reasons',()=>{
  assert.deepEqual(CANONICAL_HUMAN_REQUIRED,[
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ]);
  assert.deepEqual(HUMAN_EXCEPTION_SUPERVISOR_V0_CONTRACT.canonical_human_required,CANONICAL_HUMAN_REQUIRED);
});

test('all eight canonical reasons queue a sanitized human-required item and nothing grants authority',()=>{
  let state=initialHumanExceptionSupervisorState('2026-10-09T06:00:00Z');
  const rows=CANONICAL_HUMAN_REQUIRED.map((reason,i)=>payload({event_id:`evt-${i}`,human_required:reason,engine_id:i%2===0?'APP-001':'CRM-001'}));
  const report=ingestHumanExceptionBatch(state,rows,{now:'2026-10-09T06:11:00Z'});
  state=report.state;
  assert.equal(report.accepted_total,8);
  assert.equal(Object.keys(state.waiting_human).length,8);
  for(const item of Object.values(state.waiting_human)){
    assert.equal(item.prod_authorized,false);
    assert.equal(item.prod_write_authorized,false);
    assert.equal(item.trading_access,false);
    assert.equal(item.additional_cost_eur,0);
    assert.equal(item.customer_data_requested,false);
    assert.equal(item.evidence.customer_data_used,false);
  }
  validateSupervisorState(state);
});

test('noncanonical human reason is recorded as rejected and never becomes a notification',()=>{
  const state=initialHumanExceptionSupervisorState('2026-10-09T06:00:00Z');
  const result=ingestHumanException(state,payload({human_required:'GENERIC_FAILURE'}),{now:'2026-10-09T06:12:00Z'});
  assert.equal(result.result.decision,'REJECT_NON_CANONICAL_HUMAN_REQUIRED');
  assert.equal(result.result.accepted,false);
  assert.equal(result.result.notified,false);
  assert.equal(Object.keys(result.state.waiting_human).length,0);
  assert.equal(result.state.stats.rejected_total,1);
});

test('stable event id dedupes repeated exception and keeps one waiting item',()=>{
  let state=initialHumanExceptionSupervisorState('2026-10-09T06:00:00Z');
  const first=ingestHumanException(state,payload(),{now:'2026-10-09T06:12:00Z'});state=first.state;
  const second=ingestHumanException(state,payload(),{now:'2026-10-09T06:13:00Z'});
  assert.equal(first.result.accepted,true);
  assert.equal(second.result.decision,'DEDUPED_EXISTING_EVENT');
  assert.equal(Object.keys(second.state.waiting_human).length,1);
  assert.equal(second.state.stats.deduped_total,1);
});

test('payload fails closed on secrets, customer data, authority, cost, other companies or unknown engines',()=>{
  assert.throws(()=>normalizeHumanException(payload({contains_secrets:true})),/no customer data or secrets/);
  assert.throws(()=>normalizeHumanException(payload({contains_customer_data:true})),/no customer data or secrets/);
  assert.throws(()=>normalizeHumanException(payload({prod_authorized:true})),/cannot grant authority or cost/);
  assert.throws(()=>normalizeHumanException(payload({additional_cost_eur:1})),/cannot grant authority or cost/);
  assert.throws(()=>normalizeHumanException(payload({company_id:'other'})),/company_id denied/);
  assert.throws(()=>normalizeHumanException(payload({engine_id:'NOT-AN-ENGINE'})),/non-canonical engine_id/);
  assert.throws(()=>normalizeHumanException(payload({plain_language:'token=abc',contains_secrets:false})),/secret-like material/);
});

test('supervisor output is directly consumable by the existing human communication layer with stable dedupe',()=>{
  const supervisor=ingestHumanException(initialHumanExceptionSupervisorState('2026-10-09T06:00:00Z'),payload(),{now:'2026-10-09T06:12:00Z'}).state;
  const item=Object.values(supervisor.waiting_human)[0];
  const env=envelopeFromHumanRequired(item);
  assert.equal(env.human_required,'HIGH_RISK');
  assert.equal(env.human_alias,'App Fénix');
  assert.match(env.approval_id,/^APR-20261009-[A-F0-9]{8}$/);
  assert.equal(env.gated_action_authorized,false);
  const comm=ingestSkillHumanRequired(initialCommunicationState('2026-10-09T06:12:00Z'),supervisor,'2026-10-09T06:12:00Z');
  assert.equal(Object.keys(comm.pending).length,1);
  const req=Object.values(comm.pending)[0];
  assert.equal(req.human_required,'HIGH_RISK');
  assert.equal(req.status,'PENDING_OWNER');
  assert.equal(req.gated_action_authorized,false);
});

test('supervisor state itself is fail closed and cannot drift into PROD authority or MULTIEMPRESA',()=>{
  const state=initialHumanExceptionSupervisorState();
  assert.throws(()=>validateSupervisorState({...state,prod_write_authorized:true}),/authority\/cost drift/);
  assert.throws(()=>validateSupervisorState({...state,multicompany_continuation:true}),/authority\/cost drift/);
  assert.throws(()=>validateSupervisorState({...state,human_exception_policy:['HIGH_RISK']}),/policy drift/);
});
