import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHumanRequiredEmailEnvelope,parseApprovalCommands,evaluateStandingAuthorizationCandidate} from '../governance/human-communication.mjs';
import {initialCommunicationState,normalizeCommunicationState,ingestSkillHumanRequired,applyOwnerMessages,prepareOutbound} from '../communication/communication-controller.mjs';

const item={candidate_id:'candidate-park',name:'agent-browser',engine_id:'FACT-001',stage:'PREPROD_PROMOTION_REVIEW',human_required:'HIGH_RISK',updated_at:'2026-10-10T10:00:00Z',rollback_green:true,prod_write:false,customer_data_used:false,external_skill_code_execution:false,trading_access:false,paid_fallback:false,max_money_eur:0};

test('legacy communication state upgrades to 1.1 without losing owner history',()=>{
  const legacy={schema_version:'1.0.0',version:'1.0.0',state_type:'CEREBRO_HUMAN_COMMUNICATION_STATE',pending:{x:{status:'PENDING_OWNER'}},decisions:[{approval_id:'APR-old',decision:'DENIED'}],last_digest_date:'2026-10-09',safety:{prod_write:false}};
  const next=normalizeCommunicationState(legacy,'2026-10-10T10:00:00Z');
  assert.equal(next.schema_version,'1.1.0');
  assert.equal(next.version,'1.1.0');
  assert.equal(next.pending.x.status,'PENDING_OWNER');
  assert.equal(next.decisions.length,1);
  assert.deepEqual(next.skill_digest_snapshot,{});
  assert.equal(next.safety.prod_write,false);
  assert.equal(next.safety.trading,false);
});

test('approval envelope carries an exact APARCO fallback command',()=>{
  const env=buildHumanRequiredEmailEnvelope({item,event_version:'park'});
  assert.equal(env.park_phrase,`APARCO ${env.approval_id}`);
});

test('exact APARCO is accepted but generic aparca is ignored',()=>{
  const env=buildHumanRequiredEmailEnvelope({item,event_version:'park-parse'});
  const pending=new Map([[env.approval_id,env]]);
  const generic=parseApprovalCommands('aparca esto',pending);
  assert.equal(generic.accepted.length,0);
  assert.ok(generic.ignored.some(x=>x.reason==='GENERIC_TEXT_NOT_AUTHORIZATION'));
  const exact=parseApprovalCommands(`APARCO ${env.approval_id}`,pending);
  assert.equal(exact.accepted.length,1);
  assert.equal(exact.accepted[0].decision,'PARKED');
});

test('PARKED closes the request without authorizing and prevents immediate recreation',()=>{
  let state=ingestSkillHumanRequired(initialCommunicationState('2026-10-10T10:00:00Z'),{waiting_human:{a:item}},'2026-10-10T10:00:00Z');
  const id=Object.keys(state.pending)[0];
  state=applyOwnerMessages(state,[{message_id:'park-msg',text:`APARCO ${id}`}],'2026-10-10T10:01:00Z');
  assert.equal(state.pending[id],undefined);
  assert.equal(state.authorized_actions[id],undefined);
  assert.ok(state.decisions.some(x=>x.approval_id===id&&x.decision==='PARKED'));
  const again=ingestSkillHumanRequired(state,{waiting_human:{a:item}},'2026-10-10T10:02:00Z');
  assert.equal(again.pending[id],undefined);
});

test('parking a scope blocks learning a standing authorization from the same history',()=>{
  const request=buildHumanRequiredEmailEnvelope({item,event_version:'standing',standing_learning_eligible:true,rollback_green:true});
  const history=[1,2,3].map(()=>({scope_fingerprint:request.scope_fingerprint,decision:'AUTHORIZED',rollback_green:true}));
  history.push({scope_fingerprint:request.scope_fingerprint,decision:'PARKED',rollback_green:true});
  const result=evaluateStandingAuthorizationCandidate({history,request});
  assert.equal(result.eligible,false);
});

test('approval batch exposes all four safe fallback decisions while buttons remain design-only',()=>{
  let state=ingestSkillHumanRequired(initialCommunicationState('2026-10-10T10:00:00Z'),{waiting_human:{a:item}},'2026-10-10T10:00:00Z');
  const prepared=prepareOutbound(state,{now:new Date('2026-10-10T10:05:00Z'),repoSummary:{}});
  const row=prepared.approvalMail.items[0];
  assert.match(row.authorize_phrase,/^AUTORIZO APR-/);
  assert.match(row.deny_phrase,/^NO AUTORIZO APR-/);
  assert.match(row.explain_phrase,/^EXPLICAME APR-/);
  assert.match(row.park_phrase,/^APARCO APR-/);
  assert.match(prepared.approvalMail.text,/Para aparcarlo/);
});
