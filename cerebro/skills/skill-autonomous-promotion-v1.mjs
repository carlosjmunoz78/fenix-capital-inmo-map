import fs from 'node:fs';
import path from 'node:path';
import {approvalScopeFingerprint,resolveHumanAlias} from '../governance/human-communication.mjs';

const FORBIDDEN_TRUE_KEYS=Object.freeze([
  'autonomous_prod_write','autonomous_customer_data_access','autonomous_external_skill_code_execution',
  'autonomous_new_credentials','autonomous_trading','autonomous_paid_fallback','autonomous_app_fenix_deploy'
]);
const LEARNED_BINDING='SKILL_AUTONOMY_READONLY_V1';

function clone(value){return JSON.parse(JSON.stringify(value??{}));}
function clean(v){return typeof v==='string'?v.trim():'';}
function fingerprintItem(item){return {...item,engine_id:item?.engine_id??'FACT-001'};}
function currentScope(item){return approvalScopeFingerprint(fingerprintItem(item));}

export function validateStandingAuthorization(auth){
  const errors=[];
  if(auth?.status!=='ACTIVE_STANDING_AUTHORIZATION') errors.push('AUTH_NOT_ACTIVE');
  if(auth?.company_id!=='GLOBAL'||auth?.engine_id!=='FACT-001') errors.push('AUTH_SCOPE_MISMATCH');
  if(auth?.scope?.autonomous_preprod_shadow_promotion!==true) errors.push('PREPROD_NOT_AUTHORIZED');
  if(auth?.scope?.autonomous_prod_readonly_canary!==true) errors.push('CANARY_NOT_AUTHORIZED');
  if(auth?.scope?.autonomous_readonly_advisory_registration!==true) errors.push('REGISTRATION_NOT_AUTHORIZED');
  if(auth?.scope?.autonomous_retry_and_recovery!==true) errors.push('RECOVERY_NOT_AUTHORIZED');
  for(const key of FORBIDDEN_TRUE_KEYS) if(auth?.scope?.[key]!==false) errors.push(`FORBIDDEN_SCOPE_${key.toUpperCase()}`);
  if(Number(auth?.cost?.additional_cost_budget_eur??-1)!==0) errors.push('NONZERO_COST_BUDGET');
  return Object.freeze({green:errors.length===0,errors});
}

function safeCandidateErrors(item){
  const errors=[];
  if(item?.status!=='WAITING_HUMAN') errors.push('NOT_WAITING_HUMAN');
  if(item?.stage!=='PREPROD_PROMOTION_REVIEW') errors.push('NOT_PREPROD_REVIEW');
  if(item?.human_required!=='HIGH_RISK') errors.push('NOT_HIGH_RISK_GATE');
  const ev=item?.evidence??{};
  const readiness=ev.promotion_readiness_status==='READY_FOR_PREPROD_PROMOTION_REVIEW'||ev.reason==='GREEN_PROMOTION_READINESS';
  if(!readiness) errors.push('PROMOTION_READINESS_NOT_GREEN');
  if(ev.tribunal_decision!=null&&ev.tribunal_decision!=='GREEN') errors.push('TRIBUNAL_NOT_GREEN');
  if(item?.external_skill_code_execution===true||ev.external_skill_code_executed===true) errors.push('EXTERNAL_CODE_EXECUTED');
  if(item?.customer_data_used===true||ev.customer_data_used===true) errors.push('CUSTOMER_DATA_USED');
  if(item?.prod_write===true||ev.prod_write===true) errors.push('PROD_WRITE_USED');
  if(item?.trading_access===true||ev.trading_access===true) errors.push('TRADING_USED');
  if(item?.paid_fallback===true||ev.paid_fallback===true) errors.push('PAID_FALLBACK_USED');
  if(item?.destructive_delete===true||item?.destructive_delete_requested===true) errors.push('DESTRUCTIVE_DELETE_SCOPE');
  if(item?.unbounded_prod_write===true||item?.unbounded_prod_write_requested===true) errors.push('UNBOUNDED_PROD_WRITE_SCOPE');
  if(clean(item?.credential_scope)||item?.new_credentials===true||item?.new_credentials_requested===true) errors.push('NEW_CREDENTIAL_SCOPE');
  if(Number(item?.max_money_eur??0)!==0) errors.push('MONEY_SCOPE_NONZERO');
  if(Number(item?.additional_cost_eur??ev.additional_cost_eur??0)!==0) errors.push('NONZERO_COST');
  return errors;
}

export function isCandidateEligibleForStandingSafeLane(item,auth){
  const a=validateStandingAuthorization(auth);
  const errors=[...a.errors,...safeCandidateErrors(item)];
  return Object.freeze({green:errors.length===0,errors,human_alias:resolveHumanAlias(item)});
}

export function isCandidateEligibleForExactOwnerLane(item,ownerAction){
  const errors=[...safeCandidateErrors(item)];
  const expectedScope=currentScope(item);
  if(ownerAction?.status!=='AUTHORIZED_WAITING_EXECUTION') errors.push('OWNER_ACTION_NOT_AUTHORIZED_WAITING_EXECUTION');
  if(ownerAction?.source!=='OWNER_EMAIL_EXACT_COMMAND') errors.push('OWNER_ACTION_SOURCE_INVALID');
  if(ownerAction?.one_time!==true) errors.push('OWNER_ACTION_NOT_ONE_TIME');
  if(clean(ownerAction?.technical_id)!==clean(item?.candidate_id)) errors.push('OWNER_ACTION_CANDIDATE_MISMATCH');
  if(clean(ownerAction?.stage)!==clean(item?.stage)) errors.push('OWNER_ACTION_STAGE_MISMATCH');
  if(clean(ownerAction?.scope_fingerprint)!==expectedScope) errors.push('OWNER_ACTION_SCOPE_MISMATCH');
  return Object.freeze({green:errors.length===0,errors,human_alias:resolveHumanAlias(item),expected_scope_fingerprint:expectedScope});
}

export function isCandidateEligibleForLearnedStandingLane(item,standingAuthorization,scopeFingerprint=null){
  const errors=[...safeCandidateErrors(item)];
  const expectedScope=currentScope(item);
  if(clean(scopeFingerprint)!==expectedScope) errors.push('LEARNED_SCOPE_KEY_MISMATCH');
  if(standingAuthorization?.status!=='ACTIVE') errors.push('LEARNED_STANDING_NOT_ACTIVE');
  if(standingAuthorization?.exact_scope_only!==true) errors.push('LEARNED_STANDING_NOT_EXACT_SCOPE');
  if(standingAuthorization?.execution_binding!==LEARNED_BINDING) errors.push('LEARNED_STANDING_EXECUTION_BINDING_INVALID');
  if(clean(standingAuthorization?.scope_fingerprint||expectedScope)!==expectedScope) errors.push('LEARNED_STANDING_SCOPE_MISMATCH');
  return Object.freeze({green:errors.length===0,errors,human_alias:resolveHumanAlias(item),expected_scope_fingerprint:expectedScope});
}

export function selectPromotionCandidate(state,auth,communicationState={}){
  const rows=Object.values(state?.waiting_human??{}).sort((a,b)=>String(a.updated_at??'').localeCompare(String(b.updated_at??''))||String(a.candidate_id).localeCompare(String(b.candidate_id)));
  for(const item of rows){
    const standing=isCandidateEligibleForStandingSafeLane(item,auth);
    if(standing.green) return Object.freeze({item,authorization_source:'STANDING_AUTHORIZATION',approval_id:null,owner_action:null,learned_standing:null});

    const scope=currentScope(item);
    const learned=communicationState?.standing_authorizations?.[scope];
    const learnedCheck=isCandidateEligibleForLearnedStandingLane(item,learned,scope);
    if(learnedCheck.green) return Object.freeze({item,authorization_source:'LEARNED_STANDING_AUTHORIZATION',approval_id:learned.approval_id??null,owner_action:null,learned_standing:{...learned,scope_fingerprint:scope}});

    const candidates=Object.values(communicationState?.authorized_actions??{})
      .filter(x=>x?.status==='AUTHORIZED_WAITING_EXECUTION'&&clean(x?.technical_id)===clean(item?.candidate_id)&&clean(x?.stage)===clean(item?.stage)&&clean(x?.scope_fingerprint)===scope)
      .sort((a,b)=>String(b.authorized_at??'').localeCompare(String(a.authorized_at??''))||String(b.approval_id??'').localeCompare(String(a.approval_id??'')));
    const ownerAction=candidates[0]??null;
    const exact=isCandidateEligibleForExactOwnerLane(item,ownerAction);
    if(exact.green) return Object.freeze({item,authorization_source:'OWNER_EMAIL_EXACT_COMMAND',approval_id:ownerAction.approval_id,owner_action:ownerAction,learned_standing:null});
  }
  return null;
}

export function buildAutonomousPreprodContract(item,{source_run_id,artifact_id,artifact_digest,authorization_source='STANDING_AUTHORIZATION'}={}){
  return Object.freeze({
    schema_version:'1.0.0',candidate_id:item.candidate_id,name:item.name??null,human_alias:resolveHumanAlias(item),
    wrapper_id:item.wrapper_id??null,stage:'AUTONOMOUS_PREPROD_SHADOW',status:'GREEN_AUTONOMOUS_PREPROD_SHADOW',
    execution_mode:'SYNTHETIC_NON_CUSTOMER_SHADOW_ONLY',source_run_id:source_run_id??item.run_id??item.evidence?.handler_run_id??null,
    artifact_id:artifact_id??null,artifact_digest:artifact_digest??null,customer_data_used:false,prod_data_used:false,
    prod_write:false,external_skill_code_executed:false,trading_access:false,paid_fallback:false,additional_cost_eur:0,
    rollback_required:true,rebuild_disabled_by_default:true,authorization_source,
    standing_authorization_consumed:['STANDING_AUTHORIZATION','LEARNED_STANDING_AUTHORIZATION'].includes(authorization_source)
  });
}

export function buildAutonomousReadonlyCanaryContract(item,{observed_main_sha,source_manifest_verified=true,authorization_source='STANDING_AUTHORIZATION'}={}){
  return Object.freeze({
    schema_version:'1.0.0',candidate_id:item.candidate_id,name:item.name??null,human_alias:resolveHumanAlias(item),
    wrapper_id:item.wrapper_id??null,stage:'AUTONOMOUS_PROD_READONLY_CANARY',status:'GREEN_AUTONOMOUS_PROD_READONLY_CANARY',
    execution_mode:'READONLY_ADVISORY_OBSERVATION_ONLY',observed_main_sha:observed_main_sha??null,
    source_manifest_verified:Boolean(source_manifest_verified),allowed_http_methods:['GET'],customer_data_used:false,prod_data_used:false,
    prod_write:false,github_business_mutation:false,external_skill_code_executed:false,trading_access:false,paid_fallback:false,
    additional_cost_eur:0,rollback_required:true,rebuild_disabled_by_default:true,authorization_source,
    standing_authorization_consumed:['STANDING_AUTHORIZATION','LEARNED_STANDING_AUTHORIZATION'].includes(authorization_source)
  });
}

export function completeReadonlyAdvisoryPromotion(state,candidateId,{authorization,owner_action=null,learned_standing=null,preprod,canary,now=new Date().toISOString()}={}){
  const out=clone(state);
  const item=out.waiting_human?.[candidateId];
  if(!item) throw new Error('CANDIDATE_NOT_WAITING_HUMAN');
  let eligible;
  let authorizationSource='STANDING_AUTHORIZATION';
  let authorizationBasis=authorization?.authorization_basis??null;
  if(owner_action){
    eligible=isCandidateEligibleForExactOwnerLane(item,owner_action);
    authorizationSource='OWNER_EMAIL_EXACT_COMMAND';
    authorizationBasis=owner_action.approval_id??null;
  }else if(learned_standing){
    eligible=isCandidateEligibleForLearnedStandingLane(item,learned_standing,learned_standing.scope_fingerprint);
    authorizationSource='LEARNED_STANDING_AUTHORIZATION';
    authorizationBasis=learned_standing.approval_id??null;
  }else{
    eligible=isCandidateEligibleForStandingSafeLane(item,authorization);
  }
  if(!eligible.green) throw new Error(`CANDIDATE_NOT_ELIGIBLE:${eligible.errors.join(',')}`);
  const preprodOk=preprod?.status==='GREEN_AUTONOMOUS_PREPROD_SHADOW'&&preprod?.prod_write===false&&preprod?.customer_data_used===false&&preprod?.external_skill_code_executed===false&&Number(preprod?.additional_cost_eur)===0;
  const canaryOk=canary?.status==='GREEN_AUTONOMOUS_PROD_READONLY_CANARY'&&canary?.prod_write===false&&canary?.customer_data_used===false&&canary?.external_skill_code_executed===false&&Number(canary?.additional_cost_eur)===0&&Array.isArray(canary?.allowed_http_methods)&&canary.allowed_http_methods.every((m)=>m==='GET');
  if(!preprodOk) throw new Error('AUTONOMOUS_PREPROD_NOT_GREEN');
  if(!canaryOk) throw new Error('AUTONOMOUS_CANARY_NOT_GREEN');
  out.completed=out.completed??{};
  out.completed[candidateId]={...item,candidate_id:candidateId,human_alias:eligible.human_alias,stage:'READONLY_ADVISORY_REGISTERED',status:'COMPLETED_READONLY_ADVISORY',human_required:null,authorization_basis:authorizationBasis,authorization_source:authorizationSource,preprod,canary,updated_at:now,prod_authorized:false,prod_write:false,autonomous_business_prod_write_authorized:false,external_skill_code_execution:false,customer_data_used:false,trading_access:false,paid_fallback:false,additional_cost_eur:0};
  delete out.waiting_human[candidateId];
  out.updated_at=now;
  out.last_action='AUTONOMOUS_READONLY_ADVISORY_PROMOTION_COMPLETE_CONTINUE_QUEUE';
  return out;
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const statePath=argValue('--state');
  const authPath=argValue('--authorization');
  const communicationStatePath=argValue('--communication-state');
  const output=argValue('--output')??'artifacts/autonomy/selection.json';
  if(!statePath||!authPath) throw new Error('REQUIRED: --state --authorization');
  const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
  const auth=JSON.parse(fs.readFileSync(authPath,'utf8'));
  const communicationState=communicationStatePath&&fs.existsSync(communicationStatePath)?JSON.parse(fs.readFileSync(communicationStatePath,'utf8')):{};
  const selection=selectPromotionCandidate(state,auth,communicationState);
  const selected=selection?.item??null;
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({schema_version:'1.0.0',selected:selected?{...selected,human_alias:resolveHumanAlias(selected)}:null,authorization_source:selection?.authorization_source??null,approval_id:selection?.approval_id??null,owner_action:selection?.owner_action??null,learned_standing:selection?.learned_standing??null,standing_authorization_green:validateStandingAuthorization(auth).green,prod_write:false,customer_data:false,external_skill_code_execution:false,additional_cost_eur:0},null,2)+'\n');
  console.log(JSON.stringify({selected_candidate_id:selected?.candidate_id??null,human_alias:selected?resolveHumanAlias(selected):null,authorization_source:selection?.authorization_source??null,approval_id:selection?.approval_id??null,prod_write:false,cost_eur:0}));
}