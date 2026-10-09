import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approvalScopeFingerprint,
  buildHumanRequiredEmailEnvelope,
  parseApprovalCommands,
  isQuietHours,
  shouldSendDailyDigest,
  evaluateStandingAuthorizationCandidate,
  resolveHumanAlias
} from '../governance/human-communication.mjs';
import {
  initialCommunicationState,
  envelopeFromHumanRequired,
  standingExecutionBinding,
  ingestSkillHumanRequired,
  applyOwnerMessages,
  prepareOutbound
} from '../communication/communication-controller.mjs';

const baseItem={
  candidate_id:'lobehub-skills:abc123',name:'obsidian',engine_id:'FACT-001',stage:'PREPROD_WRITE_REVIEW',human_required:'HIGH_RISK',updated_at:'2026-10-08T07:00:00Z',authorization_class:'BOUNDED_PREPROD_PROMOTION',requested_capability:'PREPROD_PROMOTION',prod_write_requested:false,customer_data_requested:false,rollback_green:true
};
const safeLearnableItem={...baseItem,stage:'PREPROD_PROMOTION_REVIEW',prod_write:false,customer_data_used:false,external_skill_code_execution:false,trading_access:false,paid_fallback:false,max_money_eur:0};

test('human alias remains understandable and technical identity is separate',()=>{assert.equal(resolveHumanAlias(baseItem),'Memoria Obsidian');});

test('approval envelope explains capability and emits exact copyable phrases',()=>{
  const envelope=buildHumanRequiredEmailEnvelope({item:baseItem,plain_language:'Necesito permiso para avanzar una prueba controlada.',purpose:'Organiza conocimiento para CEREBRO.',requested_change:'Promover a PREPROD controlado.',can_modify:['estado PREPROD del candidato'],cannot_modify:['datos de clientes','Trading'],risk:'MEDIO_CONTROLADO',rollback:'GREEN',rollback_green:true,standing_learning_eligible:true});
  assert.match(envelope.approval_id,/^APR-20261008-[A-F0-9]{8}$/);
  assert.equal(envelope.authorize_phrase,`AUTORIZO ${envelope.approval_id}`);
  assert.equal(envelope.deny_phrase,`NO AUTORIZO ${envelope.approval_id}`);
  assert.equal(envelope.explain_phrase,`EXPLICAME ${envelope.approval_id}`);
  assert.equal(envelope.gated_action_authorized,false);
  assert.deepEqual(envelope.cannot_modify,['datos de clientes','Trading']);
});

test('effective privileges change the scope fingerprint even without requested aliases',()=>{
  const safe=approvalScopeFingerprint({...baseItem,prod_write:false,trading_access:false});
  const write=approvalScopeFingerprint({...baseItem,prod_write:true,trading_access:false});
  const trading=approvalScopeFingerprint({...baseItem,prod_write:false,trading_access:true});
  assert.notEqual(safe,write);assert.notEqual(safe,trading);
});

test('human gate reason changes the standing authorization scope fingerprint',()=>{
  const highRisk=approvalScopeFingerprint({...baseItem,human_required:'HIGH_RISK'}),legal=approvalScopeFingerprint({...baseItem,human_required:'LEGAL_REQUIRED'}),security=approvalScopeFingerprint({...baseItem,human_required:'SECURITY_INCIDENT'});
  assert.notEqual(highRisk,legal);assert.notEqual(highRisk,security);assert.notEqual(legal,security);
});

test('multiple exact commands are accepted in a single reply while generic yes is ignored',()=>{
  const a=buildHumanRequiredEmailEnvelope({item:baseItem,event_version:'a',rollback_green:true});
  const b=buildHumanRequiredEmailEnvelope({item:{...baseItem,candidate_id:'x2',name:'github',updated_at:'2026-10-08T07:01:00Z'},event_version:'b',rollback_green:true});
  const pending=new Map([[a.approval_id,a],[b.approval_id,b]]);
  const parsed=parseApprovalCommands(`sí, adelante\nAUTORIZO ${a.approval_id}\nNO AUTORIZO ${b.approval_id}`,pending);
  assert.equal(parsed.accepted.length,2);assert.equal(parsed.accepted[0].decision,'AUTHORIZED');assert.equal(parsed.accepted[1].decision,'DENIED');assert.ok(parsed.ignored.some(x=>x.reason==='GENERIC_TEXT_NOT_AUTHORIZATION'));
});

test('quoted original authorization instructions are never parsed as owner commands',()=>{
  const a=buildHumanRequiredEmailEnvelope({item:baseItem,event_version:'quoted'});const pending=new Map([[a.approval_id,a]]);const parsed=parseApprovalCommands(`No quiero autorizar esto todavía.\n\nEl miércoles CEREBRO escribió:\n> AUTORIZO ${a.approval_id}\n> NO AUTORIZO ${a.approval_id}`,pending);assert.equal(parsed.accepted.length,0);
});

test('conflicting commands for the same approval id fail closed',()=>{
  const a=buildHumanRequiredEmailEnvelope({item:baseItem,event_version:'conflict'});const pending=new Map([[a.approval_id,a]]);const parsed=parseApprovalCommands(`AUTORIZO ${a.approval_id}\nNO AUTORIZO ${a.approval_id}`,pending);assert.equal(parsed.accepted.length,0);assert.ok(parsed.ignored.some(x=>x.reason==='CONFLICTING_COMMANDS_FOR_SAME_APPROVAL_ID'));
});

test('Madrid quiet hours aggregate from 21:00 until 08:00',()=>{
  assert.equal(isQuietHours(new Date('2026-10-08T19:30:00Z')),true);assert.equal(isQuietHours(new Date('2026-10-08T05:30:00Z')),true);assert.equal(isQuietHours(new Date('2026-10-08T06:30:00Z')),false);
});

test('daily digest sends once after 08:20 Madrid',()=>{
  assert.equal(shouldSendDailyDigest({now:new Date('2026-10-08T06:19:00Z'),last_digest_date:null}),false);assert.equal(shouldSendDailyDigest({now:new Date('2026-10-08T06:20:00Z'),last_digest_date:null}),true);assert.equal(shouldSendDailyDigest({now:new Date('2026-10-08T06:30:00Z'),last_digest_date:'2026-10-08'}),false);
});

test('repeated approvals only propose standing authorization with positive rollback evidence',()=>{
  const request=buildHumanRequiredEmailEnvelope({item:baseItem,event_version:'learn',standing_learning_eligible:true,rollback_green:true});const history=[1,2,3].map(()=>({scope_fingerprint:request.scope_fingerprint,decision:'AUTHORIZED',rollback_green:true}));const result=evaluateStandingAuthorizationCandidate({history,request});assert.equal(result.eligible,true);assert.equal(result.requires_explicit_owner_command,true);
  const noRollback=buildHumanRequiredEmailEnvelope({item:{...baseItem,rollback_green:undefined},event_version:'no-rollback',standing_learning_eligible:true,rollback_green:false});const blocked=evaluateStandingAuthorizationCandidate({history:[1,2,3].map(()=>({scope_fingerprint:noRollback.scope_fingerprint,decision:'AUTHORIZED',rollback_green:false})),request:noRollback});assert.equal(blocked.eligible,false);
});

test('authorization learning requires a real safe execution binding and rejects destructive requested aliases',()=>{
  assert.equal(standingExecutionBinding(safeLearnableItem),'SKILL_AUTONOMY_READONLY_V1');const safe=envelopeFromHumanRequired(safeLearnableItem);assert.equal(safe.standing_learning_eligible,true);assert.equal(safe.standing_execution_binding,'SKILL_AUTONOMY_READONLY_V1');
  const destructive=envelopeFromHumanRequired({...safeLearnableItem,destructive_delete_requested:true});const unbounded=envelopeFromHumanRequired({...safeLearnableItem,unbounded_prod_write_requested:true});assert.equal(destructive.standing_learning_eligible,false);assert.equal(destructive.standing_execution_binding,null);assert.equal(unbounded.standing_learning_eligible,false);assert.equal(unbounded.standing_execution_binding,null);
});

test('active learned standing authorization suppresses mail only when a registered executor binding matches',()=>{
  const env=envelopeFromHumanRequired(safeLearnableItem);let state=initialCommunicationState('2026-10-08T07:00:00Z');state.standing_authorizations[env.scope_fingerprint]={status:'ACTIVE',approval_id:'APR-STANDING',scope_fingerprint:env.scope_fingerprint,exact_scope_only:true,execution_binding:'SKILL_AUTONOMY_READONLY_V1'};const suppressed=ingestSkillHumanRequired(state,{waiting_human:{a:safeLearnableItem}},'2026-10-08T07:01:00Z');assert.equal(Object.keys(suppressed.pending).length,0);
  const bad=initialCommunicationState('2026-10-08T07:00:00Z');bad.standing_authorizations[env.scope_fingerprint]={status:'ACTIVE',approval_id:'APR-STANDING',scope_fingerprint:env.scope_fingerprint,exact_scope_only:true,execution_binding:'UNKNOWN'};const notSuppressed=ingestSkillHumanRequired(bad,{waiting_human:{a:safeLearnableItem}},'2026-10-08T07:01:00Z');assert.equal(Object.keys(notSuppressed.pending).length,1);
});

test('nighttime keeps pending approvals unsent and daytime creates one batch with stable per-approval delivery key',()=>{
  const skillState={waiting_human:{[baseItem.candidate_id]:baseItem}};let state=ingestSkillHumanRequired(initialCommunicationState('2026-10-08T19:30:00Z'),skillState,'2026-10-08T19:30:00Z');const night=prepareOutbound(state,{now:new Date('2026-10-08T19:30:00Z'),repoSummary:{}});assert.equal(night.approvalMail,null);const morning=prepareOutbound(night.state,{now:new Date('2026-10-09T06:05:00Z'),repoSummary:{}});assert.ok(morning.approvalMail);assert.equal(morning.approvalMail.approval_ids.length,1);assert.equal(morning.approvalMail.kind,'approval_batch');assert.equal(morning.approvalMail.items[0].delivery_key,`APPROVAL:${morning.approvalMail.approval_ids[0]}`);
  assert.equal(morning.approvalMail.items[0].authorize_phrase,`AUTORIZO ${morning.approvalMail.approval_ids[0]}`);
  assert.equal(morning.approvalMail.items[0].deny_phrase,`NO AUTORIZO ${morning.approvalMail.approval_ids[0]}`);
  assert.equal(morning.approvalMail.items[0].explain_phrase,`EXPLICAME ${morning.approvalMail.approval_ids[0]}`);
});

test('daily digest has a stable logical delivery key independent of mutable content',()=>{
  const state=initialCommunicationState('2026-10-08T06:20:00Z');const first=prepareOutbound(state,{now:new Date('2026-10-08T06:20:00Z'),repoSummary:{human:['A']}});const second=prepareOutbound(state,{now:new Date('2026-10-08T06:21:00Z'),repoSummary:{human:['B']}});assert.equal(first.digestMail.delivery_key,'DIGEST:2026-10-08');assert.equal(second.digestMail.delivery_key,'DIGEST:2026-10-08');assert.notEqual(first.digestMail.text,second.digestMail.text);
});

test('daily digest uses executive labels and persists the skill delta snapshot after sending',()=>{
  const state=initialCommunicationState('2026-10-08T06:20:00Z');
  const snapshot={'name:github':{kind:'COMPLETED',name:'github'}};
  const prepared=prepareOutbound(state,{now:new Date('2026-10-08T06:20:00Z'),repoSummary:{human:['Carlos: NO necesitas hacer nada.'],skills_engines:['GitHub seguro'],_skill_snapshot:snapshot}});
  assert.match(prepared.digestMail.text,/CEREBRO · RESUMEN EJECUTIVO DIARIO/);
  assert.match(prepared.digestMail.text,/RESUMEN DE 20 SEGUNDOS/);
  assert.match(prepared.digestMail.text,/SKILLS QUE MERECEN TU ATENCIÓN/);
  assert.deepEqual(prepared.state.skill_digest_snapshot,snapshot);
});

test('one owner email may authorize multiple exact APR lines independently and authorized action stays visible until consumed',()=>{
  const item2={...baseItem,candidate_id:'candidate-2',name:'github',updated_at:'2026-10-08T07:02:00Z'};let state=initialCommunicationState('2026-10-08T07:00:00Z');state=ingestSkillHumanRequired(state,{waiting_human:{a:baseItem,b:item2}},'2026-10-08T07:00:00Z');const ids=Object.keys(state.pending);assert.equal(ids.length,2);state=applyOwnerMessages(state,[{message_id:'msg-1',text:`AUTORIZO ${ids[0]}\nNO AUTORIZO ${ids[1]}`}],'2026-10-08T07:05:00Z');assert.equal(state.decisions.length,2);assert.equal(state.pending[ids[0]].status,'AUTHORIZED_WAITING_EXECUTION');assert.equal(state.authorized_actions[ids[0]].status,'AUTHORIZED_WAITING_EXECUTION');assert.equal(state.pending[ids[1]],undefined);
});

test('EXPLICAME returns an expanded human explanation with its own stable delivery key without authorizing',()=>{
  let state=initialCommunicationState('2026-10-08T07:00:00Z');state=ingestSkillHumanRequired(state,{waiting_human:{a:baseItem}},'2026-10-08T07:00:00Z');const id=Object.keys(state.pending)[0];state=applyOwnerMessages(state,[{message_id:'msg-explain',text:`EXPLICAME ${id}`}],'2026-10-08T07:05:00Z');assert.equal(state.decisions.length,0);assert.equal(state.pending[id].status,'PENDING_OWNER_EXPLANATION');const prepared=prepareOutbound(state,{now:new Date('2026-10-08T07:10:00Z'),repoSummary:{}});assert.ok(prepared.approvalMail.text.includes('Explicación ampliada'));assert.ok(prepared.approvalMail.text.includes('autorización de un solo uso'));assert.match(prepared.approvalMail.items[0].delivery_key,new RegExp(`^EXPLAIN:${id}:`));
});
