import crypto from 'node:crypto';
import {stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';
import {evaluateBrowserAttestation} from '../governance/identity-session-lifecycle.mjs';

export const EXTERNAL_BROWSER_WORKER_ACTIONS=Object.freeze([
  'CLAIM_BROWSER_JOB',
  'RENEW_BROWSER_JOB_LEASE',
  'ACK_BROWSER_JOB',
  'FAIL_BROWSER_JOB'
]);

export const EXTERNAL_BROWSER_WORKER_FORBIDDEN_ACTIONS=Object.freeze([
  'ENQUEUE_BROWSER_JOB',
  'ADMIN_BROWSER_QUEUE',
  'REGISTER_BROWSER_PROFILE',
  'MUTATE_BROWSER_POLICY',
  'PROD_EXECUTION',
  'PROD_WRITE'
]);

const SECRET_KEYS=new Set([
  'password','secret','token','jwt','api_key','apikey','access_token','refresh_token','private_key','service_role'
]);
const JWT_RE=/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/;
const PREPROD='PREPROD';
const VERSION='0.1.0';

function nonEmpty(value){return typeof value==='string'&&value.trim().length>0;}
function hash(value){return crypto.createHash('sha256').update(String(value)).digest('hex');}
function safe(value){
  return Object.freeze({
    ...value,
    prod_authorized:false,
    prod_write_authorized:false,
    enqueue_authorized:false,
    admin_authorized:false,
    trading_access:false,
    permissions_elevated:false,
    contains_secret_values:false,
    additional_cost_eur:0
  });
}
function secretPath(value,path='root'){
  if(value==null)return null;
  if(Array.isArray(value)){
    for(let i=0;i<value.length;i++){
      const found=secretPath(value[i],`${path}[${i}]`);
      if(found)return found;
    }
    return null;
  }
  if(typeof value==='object'){
    for(const [key,item] of Object.entries(value)){
      if(SECRET_KEYS.has(key.toLowerCase()))return `${path}.${key}`;
      const found=secretPath(item,`${path}.${key}`);
      if(found)return found;
    }
    return null;
  }
  return typeof value==='string'&&JWT_RE.test(value)?path:null;
}

export function externalBrowserWorkerManifest(){
  return safe({
    schema_version:'1.0.0',
    state_type:'CEREBRO_EXTERNAL_BROWSER_WORKER_MINPRIV_V0',
    company_scope:'EXPLICIT_REQUIRED',
    engine_scope:'EXPLICIT_REQUIRED',
    environment:PREPROD,
    version:VERSION,
    allowed_actions:EXTERNAL_BROWSER_WORKER_ACTIONS,
    forbidden_actions:EXTERNAL_BROWSER_WORKER_FORBIDDEN_ACTIONS,
    real_profile_session_binding_required:true,
    fresh_browser_attestation_required:true,
    execution_mode:'PARALLEL_CANDIDATE',
    existing_github_worker_replaced:false,
    physical_operation_status:'POR_AUDITAR_REAL_PROFILE_SESSION_BINDING',
    rollback:'delete_or_disable_candidate_branch_without_touching_main_or_existing_worker'
  });
}

export function planExternalBrowserWorkerOperation(input={},options={}){
  const forbidden=secretPath(input);
  if(forbidden) return safe({decision:'DENY_SECRET_MATERIAL',reason:`raw_secret_material_forbidden:${forbidden}`,execution_authorized:false});

  const context={
    company_id:input.company_id,
    engine_id:input.engine_id,
    environment:String(input.environment??'').toUpperCase(),
    version:input.version
  };
  const check=validateCanonicalContext(context,{allowProd:false});
  const blockers=[...check.errors];
  if(context.environment!==PREPROD)blockers.push('preprod_only');
  if(input.trading_access===true||input.trading_requested===true)blockers.push('trading_isolation_required');
  if(input.prod_write===true||input.prod_write_requested===true)blockers.push('prod_write_not_authorized');
  if(input.enqueue===true||input.enqueue_requested===true)blockers.push('enqueue_not_authorized');
  if(input.admin===true||input.admin_requested===true)blockers.push('admin_not_authorized');
  if(blockers.length)return safe({...context,decision:'HOLD',blockers:[...new Set(blockers)],execution_authorized:false});

  const action=String(input.action??'').toUpperCase();
  if(EXTERNAL_BROWSER_WORKER_FORBIDDEN_ACTIONS.includes(action)){
    return safe({...context,action,decision:'DENY_FORBIDDEN_ACTION',execution_authorized:false});
  }
  if(!EXTERNAL_BROWSER_WORKER_ACTIONS.includes(action)){
    return safe({...context,action,decision:'HOLD_ACTION_OUTSIDE_MINIMUM_SCOPE',execution_authorized:false});
  }

  const binding=input.binding??{};
  const missing=[];
  for(const key of ['identity_ref','account_ref','session_ref','browser_profile_ref']){
    if(!nonEmpty(binding[key]))missing.push(key);
  }
  if(missing.length){
    return safe({...context,action,decision:'HOLD_REAL_PROFILE_SESSION_BINDING_REQUIRED',missing_binding_refs:missing,execution_authorized:false});
  }

  const attestation=evaluateBrowserAttestation(input.browser_attestation??null,{now:options.now??new Date().toISOString()});
  if(attestation.status!=='BROWSER_SESSION_BINDING_HEALTHY'){
    return safe({...context,action,decision:'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT',browser_binding_status:attestation.status,execution_authorized:false});
  }

  const evidenceRef=String(input.binding_evidence_ref??'');
  if(!nonEmpty(evidenceRef)){
    return safe({...context,action,decision:'HOLD_BINDING_EVIDENCE_REQUIRED',browser_binding_status:attestation.status,execution_authorized:false});
  }

  const plan={
    ...context,
    action,
    decision:'ALLOW_MINIMUM_PRIVILEGE_OPERATION',
    browser_binding_status:attestation.status,
    identity_ref_hash:hash(binding.identity_ref),
    account_ref_hash:hash(binding.account_ref),
    session_ref_hash:hash(binding.session_ref),
    browser_profile_ref_hash:hash(binding.browser_profile_ref),
    binding_evidence_ref:evidenceRef,
    execution_authorized:true,
    authority_scope:'CLAIM_RENEW_ACK_FAIL_ONLY',
    existing_github_worker_replaced:false
  };
  return safe({...plan,plan_id:stableIdempotencyKey(plan)});
}
