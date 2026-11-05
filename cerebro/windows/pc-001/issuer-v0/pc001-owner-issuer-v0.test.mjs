import test from 'node:test';
import assert from 'node:assert/strict';
import {
 PC001_ISSUER_V0,pc001OwnerScopeFingerprintV0,
 preparePc001HealthCommandV0,issuePc001HealthCommandV0,bindPc001TrustedIssuerV0
} from './pc001-owner-issuer-v0.mjs';
const now='2026-11-05T09:00:00.000Z';
const scope=pc001OwnerScopeFingerprintV0();
const req={company_id:'fenix',device_id:PC001_ISSUER_V0.device_id,capability:'SERVICE_HEALTH',action:'READ_HEALTH',
 approval_id:'approval-001',event_id:'event-001',technical_id:'device-read-health-001',risk_class:'LOW',estimated_additional_cost_eur:0};
const context={request:req,now,owner_identity:{authenticated:true,role:'OWNER',source:'TRUSTED_BACKEND',verified_at:now},
 device_record:{device_id:PC001_ISSUER_V0.device_id,company_id:'fenix',environment:'PREPROD',version:'pc001-windows-v1',status:'ONLINE',revoked_at:null,last_seen_at:now},
 owner_state:{authorized_actions:{'approval-001':{status:'AUTHORIZED_WAITING_EXECUTION',approval_id:'approval-001',scope_fingerprint:scope,technical_id:'device-read-health-001',stage:'PC001_HEALTH_READ_PREPROD',expires_at:'2026-11-05T10:00:00Z'}}}};
const evaluate=(x={})=>preparePc001HealthCommandV0({...structuredClone(context),...x});
const deny=(x,reason)=>{const r=evaluate(x); assert.equal(r.decision,'HOLD');assert.equal(r.reason,reason);assert.equal(r.enqueued,false);};

test('exact owner authorized current health read prepares canonical V2 envelope',()=>{
 const r=evaluate();assert.equal(r.decision,'PREPARED_FOR_TRUSTED_ISSUER');assert.equal(r.allowed_effect,'READ_HEALTH_ONLY');assert.equal(r.row.payload.schema_version,'2.0.0');
 assert.equal(r.row.state,'QUEUED');assert.equal(r.row.device_id,PC001_ISSUER_V0.device_id);assert.equal(r.row.payload.policy.prod_allowed,false);
 assert.equal(r.row.payload.policy.trading_allowed,false);assert.equal(r.row.payload.policy.state_changing,false);
 assert.equal(r.enqueued,false);assert.equal(r.row.payload_sha256.length,64);
});
test('device scope fingerprint deterministic and private device ID exact',()=>{
 assert.equal(scope,pc001OwnerScopeFingerprintV0());assert.throws(()=>pc001OwnerScopeFingerprintV0({device_id:'other'}));
});
test('different single event IDs create different idempotency',()=>{
 let b=evaluate({request:{...req,event_id:'event-002'}});assert.notEqual(b.row.idempotency_key,evaluate().row.idempotency_key);
});
test('arbitrary submitted scope ignored; server-derived canonical scope',()=>{
 const r=evaluate({request:{...req,scope_fingerprint:'attacker'}});assert.equal(r.scope_fingerprint,scope);
});
test('unauthorized owner access not permitted',()=>{
 for(const v of [{...context.owner_identity,authenticated:false},{...context.owner_identity,role:'AGENT'},{...context.owner_identity,source:'USER_INPUT'}]) deny({owner_identity:v},'OWNER_IDENTITY_NOT_VERIFIED');
});
test('owner verified timestamp rejects stale sessions',()=>{
 deny({owner_identity:{...context.owner_identity,verified_at:'2026-11-05T08:50:00Z'}},'OWNER_AUTH_STALE');
});
test('cannot submit cross-company, cross-device or arbitrary capability',()=>{
 for(const patch of [{company_id:'other'},{device_id:'different'},{capability:'FILE_DELETE'},{action:'MOUSE_CLICK'}]) deny({request:{...req,...patch}},'CAPABILITY_OR_DEVICE_OUT_OF_SCOPE');
});
test('extra money, risk, PROD and trading denied',()=>{
 for(const patch of [{estimated_additional_cost_eur:1},{risk_class:'HIGH'},{requires_prod_write:true},{trading_access:true},{security_incident:true},{signature_required:true}]) deny({request:{...req,...patch}},'RISK_OR_COST_DENIED');
});
test('revoked, foreign and offline device denied',()=>{
 for(const patch of [{status:'OFFLINE'},{revoked_at:now},{environment:'PROD'},{version:'other'},{company_id:'other'},{device_id:'other'}]) deny({device_record:{...context.device_record,...patch}},'DEVICE_NOT_AUTHORIZED');
});
test('stale device heartbeat denied',()=>deny({device_record:{...context.device_record,last_seen_at:'2026-11-05T08:50:00Z'}},'DEVICE_HEARTBEAT_STALE'));
test('missing standing or one-shot owner authorization denied',()=>deny({owner_state:{}},'OWNER_EXACT_AUTHORIZATION_MISSING'));
test('one-shot exact approval mismatch denied',()=>deny({owner_state:{authorized_actions:{'approval-001':{...context.owner_state.authorized_actions['approval-001'],stage:'OTHER'}}}},'OWNER_EXACT_AUTHORIZATION_MISSING'));
test('standing authorization exact scope plus executor is accepted',()=>{
 const r=evaluate({owner_state:{standing_authorizations:{[scope]:{status:'ACTIVE',exact_scope_only:true,execution_binding:'PC001_PREPROD_GATEWAY_V9',approval_id:'standing-001',
    grant_id:'standing-001',policy_id:PC001_ISSUER_V0.policy_id,max_uses:100,usage_count:0,expires_at:'2026-11-05T10:00:00Z'}}}});
 assert.equal(r.decision,'PREPARED_FOR_TRUSTED_ISSUER');assert.equal(r.approval_source,'STANDING_AUTHORIZATION');
});
test('standing authorization different executor denied',()=>deny({owner_state:{standing_authorizations:{[scope]:{status:'ACTIVE',exact_scope_only:true,execution_binding:'OTHER'}}}},'OWNER_EXACT_AUTHORIZATION_MISSING'));
test('malformed inputs fail closed',()=>{for(const value of [null,[],42,'yes'])deny({request:value},'MALFORMED_TRUSTED_CONTEXT');});
test('missing privileged transaction fails closed',async()=>{
 const r=await issuePc001HealthCommandV0(context);assert.equal(r.decision,'HOLD');assert.equal(r.reason,'PRIVILEGED_ATOMIC_ENQUEUE_MISSING');
});
test('privileged transaction failure fails closed',async()=>{
 const r=await issuePc001HealthCommandV0({...context,enqueue_unique:async()=>{throw Error('private error')}});
 assert.equal(r.decision,'HOLD');assert.equal(r.reason,'ATOMIC_ENQUEUE_FAILED');
});
test('privileged transaction cannot forge created receipt',async()=>{
 for(const f of [async()=>({status:'CREATED',command_id:'wrong',payload_sha256:'wrong'}),async()=>({status:'ALREADY_EXISTS'}),async()=>({status:'QUEUED'}),async()=>null]){
   const r=await issuePc001HealthCommandV0({...context,enqueue_unique:f});assert.equal(r.decision,'HOLD');assert.equal(r.enqueued,false);
 }
});
test('successful atomic insert returns only minimal receipt; no secrets',async()=>{
 let called=0;
 const r=await issuePc001HealthCommandV0({...context,enqueue_unique:async row=>{called++;assert.equal(row.payload.action,'READ_HEALTH');return{status:'CREATED',command_id:row.command_id,payload_sha256:row.payload_sha256,owner_grant_commit:'ONE_SHOT_CONSUMED'};}});
 assert.equal(called,1);assert.equal(r.enqueued,true);assert.equal(r.requires_semantic_receipt,true);
 assert.equal(r.remote_desktop_control,false);assert.equal(r.prod_authorized,false);
 assert.equal(JSON.stringify(r).includes('bearer'),false);
});
test('missing approval never calls privileged insert',async()=>{
 let called=0;const r=await issuePc001HealthCommandV0({...context,owner_state:{},enqueue_unique:async()=>{called++;}});
 assert.equal(r.enqueued,false);assert.equal(called,0);
});

test('trusted server composition only uses backend provider results',async()=>{
  let calls=0;
  const bound=bindPc001TrustedIssuerV0({
    authenticate_owner:async ref=>{assert.equal(ref,'private-owner-session');return context.owner_identity;},
    load_owner_state:async()=>context.owner_state,
    load_device_record:async()=>context.device_record,
    enqueue_unique:async row=>{calls++;return{status:'CREATED',command_id:row.command_id,payload_sha256:row.payload_sha256,owner_grant_commit:'ONE_SHOT_CONSUMED'};}
  });
  const r=await bound.issue({request:req,owner_session_ref:'private-owner-session',now});
  assert.equal(r.enqueued,true);assert.equal(calls,1);
});
test('untrusted request owner_identity never overrides backend',async()=>{
  const bound=bindPc001TrustedIssuerV0({
    authenticate_owner:async()=>({...context.owner_identity,role:'AGENT'}),
    load_owner_state:async()=>context.owner_state,
    load_device_record:async()=>context.device_record,
    enqueue_unique:async()=>{throw Error('unreachable');}
  });
  const r=await bound.issue({request:{...req,owner_identity:context.owner_identity},owner_session_ref:'private-owner-session',now});
  assert.equal(r.decision,'HOLD');assert.equal(r.reason,'OWNER_IDENTITY_NOT_VERIFIED');
});
test('backend errors fail closed without leaking detail',async()=>{
  const bound=bindPc001TrustedIssuerV0({
    authenticate_owner:async()=>{throw Error('secret opaque');},
    load_owner_state:async()=>context.owner_state,load_device_record:async()=>context.device_record,
    enqueue_unique:async()=>null
  });
  const r=await bound.issue({request:req,owner_session_ref:'private-owner-session',now});
  assert.equal(r.decision,'HOLD');assert.equal(r.reason,'TRUSTED_BACKEND_READ_FAILED');assert.doesNotMatch(JSON.stringify(r),/secret opaque/);
});

test('command lifetime covers existing 180 second worker polling without exceeding canonical 15 minute maximum',()=>{
 const r=evaluate();const issued=Date.parse(r.row.payload.issued_at),expires=Date.parse(r.row.payload.expires_at);
 assert.ok(expires-issued>180000);assert.ok(expires-issued<=900000);
});
test('issuer policy ID matches existing PC001-Gateway-PREPROD worker contract exactly',()=>{
 assert.equal(PC001_ISSUER_V0.policy_id,'pc001-readonly-preprod-v1');
});

test('one-shot grant expiration and revocation reject before preparation',()=>{
 const grant=context.owner_state.authorized_actions['approval-001'];
 deny({owner_state:{authorized_actions:{'approval-001':{...grant,expires_at:'2026-11-05T08:00:00Z'}}}},'OWNER_GRANT_EXPIRED_OR_UNVERIFIED');
 deny({owner_state:{authorized_actions:{'approval-001':{...grant,revoked:true}}}},'OWNER_GRANT_REVOKED_OR_CONSUMED');
 deny({owner_state:{authorized_actions:{'approval-001':{...grant,consumed_at:now}}}},'OWNER_GRANT_REVOKED_OR_CONSUMED');
});
test('standing grant expiry, usage budget and policy scope reject',()=>{
 const normal={status:'ACTIVE',exact_scope_only:true,execution_binding:'PC001_PREPROD_GATEWAY_V9',
    grant_id:'standing-001',policy_id:PC001_ISSUER_V0.policy_id,max_uses:2,usage_count:0,expires_at:'2026-11-05T10:00:00Z'};
 const build=(patch)=>({owner_state:{standing_authorizations:{[scope]:{...normal,...patch}}}});
 deny(build({expires_at:'2026-11-05T08:50:00Z'}),'OWNER_GRANT_EXPIRED_OR_UNVERIFIED');
 deny(build({revoked:true}),'OWNER_GRANT_REVOKED_OR_CONSUMED');
 deny(build({usage_count:2}),'STANDING_GRANT_SCOPE_OR_BUDGET_DENIED');
 deny(build({policy_id:'other'}),'STANDING_GRANT_SCOPE_OR_BUDGET_DENIED');
});
test('privileged insert must atomically report owner grant consumption',async()=>{
 const r=await issuePc001HealthCommandV0({...context,enqueue_unique:async(row)=>({status:'CREATED',command_id:row.command_id,payload_sha256:row.payload_sha256})});
 assert.equal(r.decision,'HOLD');assert.equal(r.reason,'QUEUE_COMMIT_NOT_ATTESTED');
});