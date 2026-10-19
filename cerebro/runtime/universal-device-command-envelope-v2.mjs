import {HUMAN_REQUIRED_CODES,stableIdempotencyKey} from './continuous-improvement-contract.mjs';

export const UNIVERSAL_DEVICE_ENVELOPE_VERSION='2.0.0';
export const UNIVERSAL_DEVICE_ALLOWED_ENVIRONMENTS=Object.freeze(['LAB','PREPROD']);
export const UNIVERSAL_DEVICE_HUMAN_REQUIRED=Object.freeze([...HUMAN_REQUIRED_CODES]);
const SECRET_KEYS=new Set(['password','passwd','secret','token','access_token','refresh_token','api_key','apikey','cookie','cookies','authorization','auth_header','private_key','client_secret']);
const CREDENTIAL_REF_KEYS=new Set(['credential_ref','credential_refs']);
const REQUIRED_FIELDS=Object.freeze(['request_id','idempotency_key','issued_at','expires_at','device_id','company_id','venture_id','engine_id','environment','version','capability','action','policy']);
const POLICY_SCOPE_FIELDS=Object.freeze(['allowed_company_ids','allowed_venture_ids','allowed_engine_ids','allowed_capabilities','allowed_actions']);

export class UniversalDeviceEnvelopeError extends Error{
  constructor(code,message,context={}){super(message);this.name='UniversalDeviceEnvelopeError';this.code=code;this.context=context;}
}
const fail=(code,message,context={})=>{throw new UniversalDeviceEnvelopeError(code,message,context);};
const nonEmpty=v=>typeof v==='string'&&v.trim().length>0;
const uniq=v=>[...new Set(v)];
const upper=v=>String(v??'').toUpperCase();

function walkForSecretValues(value,path=[]){
  const errors=[];
  if(Array.isArray(value)){
    value.forEach((entry,index)=>errors.push(...walkForSecretValues(entry,[...path,String(index)])));
    return errors;
  }
  if(!value||typeof value!=='object') return errors;
  for(const [key,entry] of Object.entries(value)){
    const normalized=key.toLowerCase();
    if(CREDENTIAL_REF_KEYS.has(normalized)){
      if(normalized==='credential_ref'&&entry!=null&&!nonEmpty(entry)) errors.push(`invalid_credential_ref:${[...path,key].join('.')}`);
      if(normalized==='credential_refs'&&(!Array.isArray(entry)||entry.some(x=>!nonEmpty(x)))) errors.push(`invalid_credential_refs:${[...path,key].join('.')}`);
      continue;
    }
    if(SECRET_KEYS.has(normalized)&&entry!=null&&entry!=='') errors.push(`raw_secret_forbidden:${[...path,key].join('.')}`);
    errors.push(...walkForSecretValues(entry,[...path,key]));
  }
  return errors;
}

function policyAllows(value,allowed){
  if(!Array.isArray(allowed)||allowed.length===0) return false;
  return allowed.includes(value);
}

export function resolveCanonicalDeviceIdentity(deviceId,identity={}){
  const canonical=String(identity.canonical_device_id??'').trim();
  const aliases=Array.isArray(identity.device_aliases)?identity.device_aliases.map(String):[];
  if(!canonical) fail('IDENTITY_MISSING','canonical_device_id is required');
  if(deviceId===canonical) return Object.freeze({canonical_device_id:canonical,matched_by:'CANONICAL',presented_device_id:deviceId});
  if(aliases.includes(deviceId)) return Object.freeze({canonical_device_id:canonical,matched_by:'ALIAS',presented_device_id:deviceId});
  fail('DEVICE_SCOPE_DENIED','device_id is not canonical or an authorized alias',{device_id:deviceId,canonical_device_id:canonical});
}

export function wrapLegacyTransportProfile(profile={}){
  return Object.freeze({
    profile_id:profile.profile_id??null,
    gateway_url:profile.gateway_url??null,
    credential_ref:profile.credential_ref??null,
    transport_device_id:profile.device_id??null,
    capabilities:Array.isArray(profile.capabilities)?Object.freeze([...profile.capabilities]):Object.freeze([]),
    active:profile.active===true,
    legacy_scope_metadata:Object.freeze({company_id:profile.company_id??null,venture_id:profile.venture_id??null,environment:profile.environment??null}),
    tenant_authority:false,
    note:'Legacy browser profile metadata is routing evidence only; command envelope V2 owns tenant/business scope.'
  });
}

export function validateUniversalDeviceEnvelopeV2(envelope={},options={}){
  const errors=[];
  for(const field of REQUIRED_FIELDS) if(envelope[field]===undefined||envelope[field]===null||envelope[field]==='') errors.push(`missing:${field}`);
  for(const field of ['request_id','idempotency_key','device_id','company_id','venture_id','engine_id','version','capability','action']) if(envelope[field]!=null&&!nonEmpty(envelope[field])) errors.push(`invalid:${field}`);
  const environment=upper(envelope.environment);
  if(!UNIVERSAL_DEVICE_ALLOWED_ENVIRONMENTS.includes(environment)) errors.push(environment==='PROD'?'prod_context_not_allowed':'invalid:environment');
  if(!envelope.policy||typeof envelope.policy!=='object'||Array.isArray(envelope.policy)) errors.push('invalid:policy');
  else{
    if(!nonEmpty(envelope.policy.policy_id)) errors.push('missing:policy.policy_id');
    for(const field of POLICY_SCOPE_FIELDS){
      const values=envelope.policy[field];
      if(!Array.isArray(values)||values.length===0) errors.push(`invalid:policy.${field}`);
      else{
        if(values.some(x=>!nonEmpty(x))) errors.push(`invalid:policy.${field}`);
        if(values.includes('*')) errors.push(`wildcard_forbidden:policy.${field}`);
      }
    }
    if(envelope.policy.prod_allowed===true) errors.push('policy_prod_authority_forbidden');
    if(envelope.policy.trading_allowed===true) errors.push('policy_trading_authority_forbidden');
    if(envelope.policy.human_required!=null&&!HUMAN_REQUIRED_CODES.includes(envelope.policy.human_required)) errors.push('invalid:policy.human_required');
  }
  errors.push(...walkForSecretValues(envelope));
  const nowMs=Date.parse(options.now??new Date().toISOString());
  const issuedMs=Date.parse(envelope.issued_at);
  const expiresMs=Date.parse(envelope.expires_at);
  const maxFutureSkewMs=Number(options.maxFutureSkewMs??120000);
  const maxLifetimeMs=Number(options.maxLifetimeMs??15*60*1000);
  if(!Number.isFinite(issuedMs)) errors.push('invalid:issued_at');
  if(!Number.isFinite(expiresMs)) errors.push('invalid:expires_at');
  if(Number.isFinite(issuedMs)&&Number.isFinite(expiresMs)){
    if(expiresMs<=issuedMs) errors.push('invalid:time_window');
    if(expiresMs-issuedMs>maxLifetimeMs) errors.push('time_window_too_long');
    if(issuedMs>nowMs+maxFutureSkewMs) errors.push('issued_in_future');
    if(expiresMs<nowMs) errors.push('envelope_expired');
  }
  return Object.freeze({ok:errors.length===0,errors:Object.freeze(uniq(errors)),normalized_environment:environment});
}

export function authorizeUniversalDeviceEnvelopeV2(envelope={},context={}){
  const check=validateUniversalDeviceEnvelopeV2(envelope,context);
  if(!check.ok) return Object.freeze({decision:'HOLD',blockers:check.errors,human_required:null,prod_authorized:false,trading_access:false});
  let identity;
  try{
    identity=resolveCanonicalDeviceIdentity(envelope.device_id,context.identity??{});
  }catch(error){
    if(error instanceof UniversalDeviceEnvelopeError){
      return Object.freeze({decision:'HOLD',blockers:Object.freeze([String(error.code).toLowerCase()]),human_required:null,prod_authorized:false,trading_access:false});
    }
    throw error;
  }
  const p=envelope.policy;
  const blockers=[];
  if(!policyAllows(envelope.company_id,p.allowed_company_ids)) blockers.push('company_scope_denied');
  if(!policyAllows(envelope.venture_id,p.allowed_venture_ids)) blockers.push('venture_scope_denied');
  if(!policyAllows(envelope.engine_id,p.allowed_engine_ids)) blockers.push('engine_scope_denied');
  if(!policyAllows(envelope.capability,p.allowed_capabilities)) blockers.push('capability_scope_denied');
  if(!policyAllows(envelope.action,p.allowed_actions)) blockers.push('action_scope_denied');
  if(context.expected_company_id&&context.expected_company_id!==envelope.company_id) blockers.push('tenant_isolation_violation');
  if(context.legacy_profile){
    const transport=wrapLegacyTransportProfile(context.legacy_profile);
    if(transport.transport_device_id&&![identity.canonical_device_id,identity.presented_device_id].includes(transport.transport_device_id)) blockers.push('transport_device_binding_mismatch');
  }
  if(blockers.length) return Object.freeze({decision:'HOLD',blockers:Object.freeze(uniq(blockers)),human_required:null,canonical_device_id:identity.canonical_device_id,prod_authorized:false,trading_access:false});
  if(p.human_required) return Object.freeze({decision:'HUMAN_REQUIRED',human_required:p.human_required,canonical_device_id:identity.canonical_device_id,prod_authorized:false,trading_access:false});
  return Object.freeze({decision:'AUTHORIZED_PREPROD',human_required:null,canonical_device_id:identity.canonical_device_id,presented_device_id:identity.presented_device_id,identity_match:identity.matched_by,scope:Object.freeze({company_id:envelope.company_id,venture_id:envelope.venture_id,engine_id:envelope.engine_id,environment:check.normalized_environment,version:envelope.version,capability:envelope.capability,action:envelope.action}),policy_id:p.policy_id,credential_refs:Object.freeze([...(Array.isArray(envelope.credential_refs)?envelope.credential_refs:[]),...(nonEmpty(envelope.credential_ref)?[envelope.credential_ref]:[])]),prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}

export function commandFingerprintV2(envelope={}){
  const sanitized={...envelope};
  delete sanitized.issued_at;delete sanitized.expires_at;delete sanitized.request_id;
  return stableIdempotencyKey(sanitized);
}

export function claimUniversalDeviceEnvelopeV2(envelope,ledger=new Map(),options={}){
  if(!(ledger instanceof Map)) fail('LEDGER_INVALID','ledger must be a Map');
  const authorization=authorizeUniversalDeviceEnvelopeV2(envelope,options);
  if(authorization.decision!=='AUTHORIZED_PREPROD') return Object.freeze({...authorization,ledger_action:'NONE'});
  const fingerprint=commandFingerprintV2(envelope);
  const requestKey=`request:${envelope.request_id}`;
  const idempotencyKey=`idempotency:${envelope.idempotency_key}`;
  if(ledger.has(requestKey)) return Object.freeze({decision:'HOLD',blockers:Object.freeze(['replay_request_id']),human_required:null,canonical_device_id:authorization.canonical_device_id,ledger_action:'REPLAY_REJECTED',prod_authorized:false,trading_access:false});
  const prior=ledger.get(idempotencyKey);
  if(prior){
    if(prior.fingerprint!==fingerprint) return Object.freeze({decision:'HOLD',blockers:Object.freeze(['idempotency_key_payload_conflict']),human_required:null,canonical_device_id:authorization.canonical_device_id,ledger_action:'IDEMPOTENCY_CONFLICT',prod_authorized:false,trading_access:false});
    ledger.set(requestKey,{fingerprint,idempotency_key:envelope.idempotency_key,seen_at:options.now??new Date().toISOString()});
    return Object.freeze({...authorization,decision:'IDEMPOTENT_REPLAY',ledger_action:'RETURN_CACHED',execution_id:prior.execution_id??null,fingerprint});
  }
  const executionId=`udx_${stableIdempotencyKey({idempotency_key:envelope.idempotency_key,canonical_device_id:authorization.canonical_device_id,fingerprint}).slice(0,24)}`;
  const record=Object.freeze({fingerprint,execution_id:executionId,seen_at:options.now??new Date().toISOString()});
  ledger.set(idempotencyKey,record);ledger.set(requestKey,{...record,idempotency_key:envelope.idempotency_key});
  return Object.freeze({...authorization,decision:'CLAIMED',ledger_action:'EXECUTE_ONCE',execution_id:executionId,fingerprint});
}

export function buildSanitizedUniversalDeviceReceiptV2({envelope,claim,result={}}={}){
  if(!envelope||!claim) fail('RECEIPT_INPUT_INVALID','envelope and claim are required');
  const stateChanging=envelope.policy?.state_changing===true;
  const semanticReadback=result.semantic_readback;
  let status='EXECUTION_RECORDED';
  if(claim.decision==='IDEMPOTENT_REPLAY') status='IDEMPOTENT_REPLAY';
  else if(claim.decision!=='CLAIMED') status='NOT_EXECUTED';
  else if(stateChanging&&(!semanticReadback||typeof semanticReadback!=='object'||semanticReadback.verified!==true)) status='PARCIAL_SEMANTIC_READBACK_REQUIRED';
  else if(result.ok===true) status='PASS';
  else status='PARCIAL';
  const receipt={schema_version:'2.0.0',state_type:'CEREBRO_UNIVERSAL_DEVICE_EXECUTION_RECEIPT_V2',status,request_id:envelope.request_id,idempotency_key:envelope.idempotency_key,execution_id:claim.execution_id??null,canonical_device_id:claim.canonical_device_id??null,company_id:envelope.company_id,venture_id:envelope.venture_id,engine_id:envelope.engine_id,environment:upper(envelope.environment),version:envelope.version,capability:envelope.capability,action:envelope.action,policy_id:envelope.policy?.policy_id??null,credential_refs:Array.isArray(claim.credential_refs)?claim.credential_refs:[],semantic_readback:semanticReadback&&typeof semanticReadback==='object'?{verified:semanticReadback.verified===true,kind:semanticReadback.kind??null,evidence_ref:semanticReadback.evidence_ref??null}:null,human_required:claim.human_required??null,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  const secretErrors=walkForSecretValues(receipt);
  if(secretErrors.length) fail('RECEIPT_SECRET_LEAK','receipt contains forbidden secret-shaped fields',{errors:secretErrors});
  return Object.freeze(receipt);
}
