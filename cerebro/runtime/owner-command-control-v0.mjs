/**
 * CEREBRO · FACT-001 owner operations contract · V0
 * All user interaction happens through a trusted client such as ChatGPT;
 * execution is independent of the language model and never bypasses Gateway.
 * Owner can inspect, guide, pause, resume, reject, iterate and rollback.
 * This module has NO credentials, network calls, or production writes.
 */
import {createHash} from 'node:crypto';

const ACTIONS=new Set([
  'STATUS','REQUEST_IMAGE','REVIEW_IMAGE','REJECT_IMAGE','APPROVE_IMAGE',
  'REQUEST_IMPROVEMENT','PAUSE_ENGINE','RESUME_ENGINE','CANCEL_JOB','ROLLBACK'
]);
const ID=/^[a-z][a-z0-9_-]{2,79}$/i;
const SAFE_REF=/^[a-zA-Z0-9][a-zA-Z0-9:._/-]{1,199}$/;
const FINANCE_ACTIONS=new Set(['REQUEST_IMAGE','RESUME_ENGINE']);
const REVIEW_ACTIONS=new Set(['APPROVE_IMAGE']);
const HIGH_RISK_ACTIONS=new Set(['ROLLBACK','PAUSE_ENGINE','RESUME_ENGINE']);
const ALLOWED_ENVIRONMENTS=new Set(['PREPROD']); // Parallel candidate, no PROD writes.
export const CEREBRO_OWNER_CONTROL_V0=Object.freeze({
  company_id:'fenix', // actual canonical queue ID in existing Supabase
  brand_alias:'fenix-capital',
  engine_id:'FACT-001',environment:'PREPROD',version:'v0',
  preferred_human_interface:'CHATGPT',
  gateway_required:true,
  automation_mode:'HUMAN_BY_EXCEPTION',
  chatgpt_is_mandatory_runtime:false, // operations must continue autonomously
  owner_control_available:true,
  break_glass_human_admin_must_remain:true,
  no_publishing_without_separate_SOC001_authority:true,
  no_secret_exposure:true,
  autospend_not_allowed_without_active_budget:true,
  no_destructive_prod_mutation:true,
  supported_actions:Object.freeze([...ACTIONS])
});
function required(v,name,max=200){
  if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error(name+'_INVALID');
  return v.trim();
}
function deepSafe(x,path='',depth=0){
  if(depth>6)throw new Error('PAYLOAD_DEPTH_DENIED');
  if(x===null||typeof x==='boolean')return x;
  if(typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e8)return x;
  if(typeof x==='string'){
    if(x.length>1500)throw new Error('PAYLOAD_TEXT_TOO_LONG');
    return x;
  }
  if(Array.isArray(x)){
    if(x.length>12)throw new Error('PAYLOAD_LIST_TOO_LONG');
    return x.map(v=>deepSafe(v,path,depth+1));
  }
  if(!x||typeof x!=='object'||Object.getPrototypeOf(x)!==Object.prototype)throw new Error('PAYLOAD_TYPE_DENIED');
  const entries=Object.entries(x);
  if(entries.length>24)throw new Error('PAYLOAD_KEYS_LIMIT');
  const out={};
  for(const [k,v] of entries){
    if(!/^[a-z][a-z0-9_]{0,63}$/i.test(k))throw new Error('PAYLOAD_KEY_INVALID');
    if(/(password|secret|api.?key|access.?token|refresh.?token|private.?key|bearer|authorization|cookie|iban|dni|nif|nie)/i.test(k))throw new Error('PAYLOAD_SECRET_OR_PII_DENIED');
    out[k]=deepSafe(v,path+'.'+k,depth+1);
  }
  return out;
}
export function compileOwnerCommand(input,{verified_owner=false,gate_state={}}={}){
  if(verified_owner!==true)return Object.freeze({ok:false,status:'HUMAN_REQUIRED',reason:'SECURITY_INCIDENT'});
  const company=required(input?.company_id,'COMPANY',80);
  // Known mapping only; unknown future companies must be explicitly registered.
  if(company!=='fenix'&&company!=='fenix-capital')
    return Object.freeze({ok:false,status:'HOLD',reason:'UNREGISTERED_COMPANY'});
  const engine=required(input?.engine_id,'ENGINE',80);
  if(engine!=='FACT-001'&&engine!=='SOC-001')
    return Object.freeze({ok:false,status:'HOLD',reason:'UNREGISTERED_ENGINE'});
  const environment=required(input?.environment,'ENVIRONMENT',20).toUpperCase();
  if(!ALLOWED_ENVIRONMENTS.has(environment))return Object.freeze({ok:false,status:'HOLD',reason:'PROD_NOT_CERTIFIED'});
  const action=required(input?.action,'ACTION',50).toUpperCase();
  if(!ACTIONS.has(action))return Object.freeze({ok:false,status:'HOLD',reason:'UNSUPPORTED_COMMAND'});
  const key=required(input?.idempotency_key,'IDEMPOTENCY',120);
  if(!ID.test(key))throw new Error('IDEMPOTENCY_INVALID');
  const payload=deepSafe(input?.payload??{});
  if(action==='REQUEST_IMAGE'&&engine!=='FACT-001')return Object.freeze({ok:false,status:'HOLD',reason:'ENGINE_ACTION_SCOPE_DENIED'});
  if((action==='REVIEW_IMAGE'||action==='APPROVE_IMAGE'||action==='REJECT_IMAGE')&&!SAFE_REF.test(payload.artifact_ref??''))
    return Object.freeze({ok:false,status:'HOLD',reason:'ARTIFACT_REF_REQUIRED'});
  if(['CANCEL_JOB','ROLLBACK'].includes(action)&&!SAFE_REF.test(payload.target_ref??''))
    return Object.freeze({ok:false,status:'HOLD',reason:'TARGET_REF_REQUIRED'});
  if(action==='REQUEST_IMAGE'&&(payload.image_count!==1||payload.publish_requested===true))
    return Object.freeze({ok:false,status:'HOLD',reason:'IMAGE_CANARY_ONE_NO_PUBLISH'});
  let hold=null;
  if(action==='REQUEST_IMAGE'&&!gate_state.credential_rotated_and_verified)
    hold='SECURITY_INCIDENT';
  else if(FINANCE_ACTIONS.has(action)&&!gate_state.authorized_budget_active)
    hold='MONEY_LIMIT';
  else if(action==='REQUEST_IMAGE'&&!gate_state.paid_media_worker_certified)
    hold='WORKER_NOT_CERTIFIED';
  else if(REVIEW_ACTIONS.has(action)&&!gate_state.independent_qa_passed)
    hold='LOW_CONFIDENCE';
  else if(HIGH_RISK_ACTIONS.has(action)&&!gate_state.rollback_and_backup_verified)
    hold='HIGH_RISK';
  // Human has control; the worker handles normal tasks without needing model.
  const record={
    idempotency_key:key,company_id:'fenix',engine_id:engine,
    environment,version:'v0',source_interface:'CHATGPT_CONNECTED_OWNER',
    actor:'CARLOS-ADMIN',command_type:action,command_payload:payload,
    status:hold?'HOLD':'REQUESTED',
    hold_reason:hold,
    publish_authorized:false,
    high_risk:HIGH_RISK_ACTIONS.has(action),
    owner_input_digest:createHash('sha256').update(JSON.stringify({
      company_id:'fenix',engine_id:engine,environment,action,payload,idempotency_key:key
    })).digest('hex')
  };
  return Object.freeze({ok:true,record:Object.freeze(record),execution_performed:false});
}
