/**
 * CEREBRO PC-001 / PREPROD owner-scoped command issuer V0.
 * Additive code candidate. Does NOT read credentials or connect to Supabase.
 * The caller must pass trusted server-side owner state and an atomic queue adapter.
 * Fail closed; only existing SERVICE_HEALTH/READ_HEALTH until Windows physical
 * remote-actuator gate has independent evidence.
 */
import {createHash} from 'node:crypto';
import {evaluateOwnerAuthorization} from '../../../communication/owner-approval-gate.mjs';
import {validateUniversalDeviceEnvelopeV2} from '../../../runtime/universal-device-command-envelope-v2.mjs';

export const PC001_ISSUER_V0 = Object.freeze({
  schema_version:'0.1.0',
  engine_id:'PC-001', company_id:'fenix', venture_id:'fenix',
  device_id:'78ca78cf158b3cda329cf39e0270f0a5',
  environment:'PREPROD', version:'pc001-windows-v1',
  capability:'SERVICE_HEALTH', action:'READ_HEALTH',
  policy_id:'pc001-readonly-preprod-v1',
  extra_cost_eur:0, remote_desktop_control:false, prod_allowed:false
});
const MAX_AGE_MS=120_000;
const TTL_MS=8*60_000; // existing worker polls every 180s; do not expire before normal poll
const DEVICE_ONLINE_MAX_MS=180_000;
const safeId=/^[A-Za-z0-9._:-]{8,150}$/;
const hash=(value)=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const hold=(reason)=>Object.freeze({decision:'HOLD',reason,enqueued:false,prod_authorized:false,remote_desktop_control:false});
const plain=(x)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const validIso=(x)=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const same=(a,b)=>a===b;

/**
 * Deterministic scope fingerprint for one PC, one operation and one policy.
 * The privileged backend must independently bind this exact fingerprint to an
 * owner approval record; arbitrary submitted scope strings are never trusted.
 */
export function pc001OwnerScopeFingerprintV0({device_id=PC001_ISSUER_V0.device_id}={}) {
  if(device_id!==PC001_ISSUER_V0.device_id) throw new Error('device scope denied');
  return `pc001-owner:${hash({company_id:'fenix',device_id,
    engine_id:'PC-001',environment:'PREPROD',version:'pc001-windows-v1',
    capability:'SERVICE_HEALTH',action:'READ_HEALTH',policy_id:PC001_ISSUER_V0.policy_id}).slice(0,48)}`;
}

export function preparePc001HealthCommandV0({
  request, owner_state, owner_identity, device_record, now='2026-11-05T09:00:00.000Z'
}={}) {
  if(!plain(request)||!plain(owner_state)||!plain(owner_identity)||!plain(device_record)||!validIso(now)) return hold('MALFORMED_TRUSTED_CONTEXT');
  if(request.company_id!=='fenix'||request.device_id!==PC001_ISSUER_V0.device_id||request.capability!=='SERVICE_HEALTH'||request.action!=='READ_HEALTH') return hold('CAPABILITY_OR_DEVICE_OUT_OF_SCOPE');
  if(!safeId.test(request.approval_id??'')||!safeId.test(request.event_id??'')||!safeId.test(request.technical_id??'')) return hold('INVALID_OWNER_EVENT');
  if(request.estimated_additional_cost_eur!==0||request.risk_class!=='LOW'||request.requires_prod_write===true||request.trading_access===true||request.security_incident===true||request.signature_required===true) return hold('RISK_OR_COST_DENIED');
  if(owner_identity.authenticated!==true||owner_identity.role!=='OWNER'||owner_identity.source!=='TRUSTED_BACKEND' || owner_identity.verified_at==null||!validIso(owner_identity.verified_at)) return hold('OWNER_IDENTITY_NOT_VERIFIED');
  if(Math.abs(Date.parse(now)-Date.parse(owner_identity.verified_at))>MAX_AGE_MS) return hold('OWNER_AUTH_STALE');
  if(device_record.device_id!==PC001_ISSUER_V0.device_id||device_record.company_id!=='fenix'||device_record.environment!=='PREPROD'||device_record.version!=='pc001-windows-v1'||device_record.status!=='ONLINE'||device_record.revoked_at!=null) return hold('DEVICE_NOT_AUTHORIZED');
  if(!validIso(device_record.last_seen_at)||Date.parse(now)-Date.parse(device_record.last_seen_at)>DEVICE_ONLINE_MAX_MS||Date.parse(device_record.last_seen_at)>Date.parse(now)+MAX_AGE_MS) return hold('DEVICE_HEARTBEAT_STALE');
  const scope=pc001OwnerScopeFingerprintV0();
  const approval=evaluateOwnerAuthorization({communicationState:owner_state,
    request:{approval_id:request.approval_id,scope_fingerprint:scope,
      technical_id:request.technical_id,stage:'PC001_HEALTH_READ_PREPROD',
      execution_binding:'PC001_PREPROD_GATEWAY_V9'}});
  if(approval.authorized!==true) return hold('OWNER_EXACT_AUTHORIZATION_MISSING');
  if(!['EXACT_AUTHORIZED_ACTION_MATCH','ACTIVE_STANDING_AUTHORIZATION_EXACT_SCOPE_AND_EXECUTOR'].includes(approval.reason)) return hold('OWNER_AUTH_SOURCE_NOT_ALLOWED');
  const isStanding = approval.source==='STANDING_AUTHORIZATION';
  const grant = isStanding ? owner_state.standing_authorizations?.[scope] : owner_state.authorized_actions?.[request.approval_id];
  if(!plain(grant) || !validIso(grant.expires_at) || Date.parse(grant.expires_at)<=Date.parse(now)) return hold('OWNER_GRANT_EXPIRED_OR_UNVERIFIED');
  if(grant.revoked===true || grant.revoked_at!=null || grant.consumed_at!=null) return hold('OWNER_GRANT_REVOKED_OR_CONSUMED');
  if(isStanding) {
    if(grant.policy_id!==PC001_ISSUER_V0.policy_id || !Number.isSafeInteger(grant.max_uses) || grant.max_uses<1 ||
       !Number.isSafeInteger(grant.usage_count) || grant.usage_count<0 || grant.usage_count>=grant.max_uses) return hold('STANDING_GRANT_SCOPE_OR_BUDGET_DENIED');
  }
  const issued=new Date(now).toISOString(),expires=new Date(Date.parse(now)+TTL_MS).toISOString();
  const fingerprint=hash({event_id:request.event_id,scope,approval_id:request.approval_id,technical_id:request.technical_id});
  const idempotency_key=`pc001-owner-health-${fingerprint.slice(0,24)}`;
  const command_id=`pc001-health-${fingerprint.slice(0,32)}`;
  const envelope={
    schema_version:'2.0.0',request_id:`pc001-request-${fingerprint.slice(0,30)}`,
    idempotency_key,issued_at:issued,expires_at:expires,
    device_id:PC001_ISSUER_V0.device_id,company_id:'fenix',venture_id:'fenix',
    engine_id:'PC-001',environment:'PREPROD',version:'pc001-windows-v1',
    capability:'SERVICE_HEALTH',action:'READ_HEALTH',
    policy:{policy_id:PC001_ISSUER_V0.policy_id,
      allowed_company_ids:['fenix'],allowed_venture_ids:['fenix'],allowed_engine_ids:['PC-001'],
      allowed_environments:['PREPROD'],allowed_versions:['pc001-windows-v1'],
      allowed_capabilities:['SERVICE_HEALTH'],allowed_actions:['READ_HEALTH'],
      state_changing:false,prod_allowed:false,trading_allowed:false}
  };
  const validation=validateUniversalDeviceEnvelopeV2(envelope,{now});
  if(!validation.ok) return hold('CANONICAL_DEVICE_ENVELOPE_DENIED');
  const row={command_id,company_id:'fenix',environment:'PREPROD',device_id:PC001_ISSUER_V0.device_id,
    engine_id:'PC-001',version:'pc001-windows-v1',idempotency_key,
    payload:envelope,payload_sha256:hash(JSON.stringify(envelope)),state:'QUEUED'};
  return Object.freeze({decision:'PREPARED_FOR_TRUSTED_ISSUER',enqueued:false,
    row,scope_fingerprint:scope,approval_source:approval.source,
    owner_event_id:request.event_id,owner_grant_kind:isStanding?'STANDING':'ONE_SHOT',
    grant_id:isStanding?(grant.grant_id??null):request.approval_id,automatic_retries_allowed:false,
    allowed_effect:'READ_HEALTH_ONLY',remote_desktop_control:false,prod_authorized:false,
    additional_cost_eur:0});
}

/**
 * This adapter never constructs an admin client or accepts raw secret material.
 * enqueue_unique is a privileged server-owned DB transaction binding; it must
 * atomically enforce the existing compound UNIQUE constraint, consume ONE_SHOT
 * grants or increment standing usage, and compare hashes on duplicates. No direct DB grant to client apps or device workers.
 */
export async function issuePc001HealthCommandV0({
  request,owner_state,owner_identity,device_record,now,enqueue_unique
}={}) {
  if(typeof enqueue_unique!=='function') return hold('PRIVILEGED_ATOMIC_ENQUEUE_MISSING');
  const prepared=preparePc001HealthCommandV0({request,owner_state,owner_identity,device_record,now});
  if(prepared.decision!=='PREPARED_FOR_TRUSTED_ISSUER') return prepared;
  let result;
  try{result=await enqueue_unique(structuredClone(prepared.row),Object.freeze({
      grant_id:prepared.grant_id,grant_kind:prepared.owner_grant_kind,
      scope_fingerprint:prepared.scope_fingerprint,owner_event_id:prepared.owner_event_id,
      atomic_grant_commit_required:true
    }));}
  catch{return hold('ATOMIC_ENQUEUE_FAILED');}
  if(!plain(result)||result.status!=='CREATED'||result.command_id!==prepared.row.command_id||result.payload_sha256!==prepared.row.payload_sha256||
      result.owner_grant_commit !== (prepared.owner_grant_kind==='STANDING'?'STANDING_USE_RECORDED':'ONE_SHOT_CONSUMED')) {
    return hold(result?.status==='ALREADY_EXISTS'?'IDEMPOTENCY_ALREADY_USED':'QUEUE_COMMIT_NOT_ATTESTED');
  }
  return Object.freeze({decision:'QUEUED_OWNER_AUTHORIZED_HEALTH_READ',enqueued:true,
    command_id:prepared.row.command_id,scope_fingerprint:prepared.scope_fingerprint,
    owner_event_id:prepared.owner_event_id,remote_desktop_control:false,
    additional_cost_eur:0,prod_authorized:false,requires_semantic_receipt:true});
}

/**
 * Secure composition boundary for use inside an authenticated backend only.
 * These callbacks are injected at server startup by trusted code and may NOT
 * be materialized from the request, a model, a browser, or a device.
 */
export function bindPc001TrustedIssuerV0({authenticate_owner,load_owner_state,load_device_record,enqueue_unique}={}) {
  for(const [name,fn] of Object.entries({authenticate_owner,load_owner_state,load_device_record,enqueue_unique})) {
    if(typeof fn!=='function') throw new TypeError(`trusted backend ${name} required`);
  }
  return Object.freeze({
    async issue({request,owner_session_ref,now=new Date().toISOString()}={}) {
      if(typeof owner_session_ref!=='string'||!owner_session_ref.trim()) return hold('OWNER_SESSION_REQUIRED');
      let owner_identity,owner_state,device_record;
      try {
        owner_identity=await authenticate_owner(owner_session_ref);
        if(!plain(owner_identity)||owner_identity.authenticated!==true||owner_identity.role!=='OWNER'||owner_identity.source!=='TRUSTED_BACKEND') return hold('OWNER_IDENTITY_NOT_VERIFIED');
        [owner_state,device_record]=await Promise.all([load_owner_state(owner_identity),load_device_record(PC001_ISSUER_V0.device_id)]);
      }catch{return hold('TRUSTED_BACKEND_READ_FAILED');}
      return issuePc001HealthCommandV0({request,owner_state,owner_identity,device_record,now,enqueue_unique});
    }
  });
}