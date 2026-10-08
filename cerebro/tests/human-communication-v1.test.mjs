import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHumanRequiredEmailEnvelope,
  parseApprovalCommands,
  isQuietHours,
  shouldSendDailyDigest,
  evaluateStandingAuthorizationCandidate,
  resolveHumanAlias
} from '../governance/human-communication.mjs';

const baseItem={
  candidate_id:'lobehub-skills:abc123',
  name:'obsidian',
  engine_id:'FACT-001',
  stage:'PREPROD_WRITE_REVIEW',
  human_required:'HIGH_RISK',
  updated_at:'2026-10-08T07:00:00Z',
  authorization_class:'BOUNDED_PREPROD_PROMOTION',
  requested_capability:'PREPROD_PROMOTION',
  prod_write_requested:false,
  customer_data_requested:false
};

test('human alias remains understandable and technical identity is separate',()=>{
  assert.equal(resolveHumanAlias(baseItem),'Memoria Obsidian');
});

test('approval envelope explains capability and emits exact copyable phrases',()=>{
  const envelope=buildHumanRequiredEmailEnvelope({
    item:baseItem,
    plain_language:'Necesito permiso para avanzar una prueba controlada.',
    purpose:'Organiza conocimiento para CEREBRO.',
    requested_change:'Promover a PREPROD controlado.',
    can_modify:['estado PREPROD del candidato'],
    cannot_modify:['datos de clientes','Trading'],
    risk:'MEDIO_CONTROLADO',
    rollback:'GREEN',
    standing_learning_eligible:true
  });
  assert.match(envelope.approval_id,/^APR-20261008-[A-F0-9]{8}$/);
  assert.equal(envelope.authorize_phrase,`AUTORIZO ${envelope.approval_id}`);
  assert.equal(envelope.deny_phrase,`NO AUTORIZO ${envelope.approval_id}`);
  assert.equal(envelope.explain_phrase,`EXPLICAME ${envelope.approval_id}`);
  assert.equal(envelope.gated_action_authorized,false);
  assert.deepEqual(envelope.cannot_modify,['datos de clientes','Trading']);
});

test('multiple exact commands are accepted in a single reply while generic yes is ignored',()=>{
  const a=buildHumanRequiredEmailEnvelope({item:baseItem,event_version:'a',standing_learning_eligible:true});
  const b=buildHumanRequiredEmailEnvelope({item:{...baseItem,candidate_id:'x2',name:'github',updated_at:'2026-10-08T07:01:00Z'},event_version:'b'});
  const pending=new Map([[a.approval_id,a],[b.approval_id,b]]);
  const parsed=parseApprovalCommands(`sí, adelante\nAUTORIZO ${a.approval_id}\nNO AUTORIZO ${b.approval_id}`,pending);
  assert.equal(parsed.accepted.length,2);
  assert.equal(parsed.accepted[0].decision,'AUTHORIZED');
  assert.equal(parsed.accepted[1].decision,'DENIED');
  assert.ok(parsed.ignored.some(x=>x.reason==='GENERIC_TEXT_NOT_AUTHORIZATION'));
});

test('Madrid quiet hours aggregate from 21:00 until 08:00',()=>{
  assert.equal(isQuietHours(new Date('2026-10-08T19:30:00Z')),true); // 21:30 CEST
  assert.equal(isQuietHours(new Date('2026-10-08T05:30:00Z')),true); // 07:30 CEST
  assert.equal(isQuietHours(new Date('2026-10-08T06:30:00Z')),false); // 08:30 CEST
});

test('daily digest sends once after 08:20 Madrid',()=>{
  assert.equal(shouldSendDailyDigest({now:new Date('2026-10-08T06:19:00Z'),last_digest_date:null}),false);
  assert.equal(shouldSendDailyDigest({now:new Date('2026-10-08T06:20:00Z'),last_digest_date:null}),true);
  assert.equal(shouldSendDailyDigest({now:new Date('2026-10-08T06:30:00Z'),last_digest_date:'2026-10-08'}),false);
});

test('repeated approvals only propose, never silently broaden, standing authorization',()=>{
  const request=buildHumanRequiredEmailEnvelope({item:baseItem,event_version:'learn',standing_learning_eligible:true});
  const history=[1,2,3].map(()=>({scope_fingerprint:request.scope_fingerprint,decision:'AUTHORIZED',rollback_green:true}));
  const result=evaluateStandingAuthorizationCandidate({history,request});
  assert.equal(result.eligible,true);
  assert.equal(result.requires_explicit_owner_command,true);
});
