import {HUMAN_REQUIRED_CODES,stableIdempotencyKey} from './continuous-improvement-contract.mjs';

export const SKILL_AUTONOMY_DECISIONS=Object.freeze([
  'REUTILIZAR','ENVOLVER','CATALOGAR','FABRICAR_GRATIS','HOLD','DESCARTAR','PAGO_JUSTIFICADO'
]);

const PREPROD='PREPROD';
const VALID_RISK=new Set(['LOW','MEDIUM','HIGH','CRITICAL']);

function text(value){return typeof value==='string'&&value.trim()?value.trim():null;}
function bool(value){return value===true;}
function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function uniq(values){return [...new Set((Array.isArray(values)?values:[]).filter((v)=>text(v)).map((v)=>v.trim()))].sort();}
function canonicalHuman(code){
  if(code==null) return null;
  if(!HUMAN_REQUIRED_CODES.includes(code)) throw new Error(`invalid HUMAN_REQUIRED code:${code}`);
  return code;
}

function normalize(raw={}){
  const company_id=text(raw.company_id);
  const skill_id=text(raw.skill_id);
  const skill_version=text(raw.skill_version);
  const version=text(raw.version)??'1.0.0';
  const environment=text(raw.environment)??PREPROD;
  if(!company_id) throw new Error('company_id required');
  if(!skill_id) throw new Error('skill_id required');
  if(!skill_version) throw new Error('skill_version required');
  if(environment!==PREPROD) throw new Error('skill autonomy closure is PREPROD-only');
  const risk_class=text(raw.risk_class)??'LOW';
  if(!VALID_RISK.has(risk_class)) throw new Error(`invalid risk_class:${risk_class}`);

  const confidence=Math.max(0,Math.min(1,finite(raw.evidence?.confidence,0)));
  const existing_engine_bindings=uniq(raw.impact?.existing_engine_bindings);
  const additional_cost_eur=Math.max(0,finite(raw.cost?.additional_cost_eur,0));
  const tribunal_decision=text(raw.tribunal?.decision)??'MORE_EVIDENCE';
  const old_vs_new_decision=text(raw.old_vs_new?.decision)??'MORE_EVIDENCE';
  const human_required=canonicalHuman(raw.tribunal?.human_required??raw.human_required??null);

  return Object.freeze({
    company_id,engine_id:'SKILL-AUTONOMY-CLOSURE',environment,version,
    skill_id,skill_version,risk_class,confidence,
    evidence_complete:bool(raw.evidence?.complete),
    provenance_ok:raw.security?.provenance_ok!==false,
    supply_chain_ok:raw.security?.supply_chain_ok!==false,
    license_ok:raw.security?.license_ok!==false,
    security_incident:bool(raw.security?.incident),
    legal_required:bool(raw.security?.legal_required),
    policy_conflict:bool(raw.policy_conflict),
    policy_locked:bool(raw.policy_locked),
    permissions_locked:bool(raw.permissions_locked),
    rollback_ready:bool(raw.rollback_ready),
    rebuild_ready:bool(raw.rebuild_ready),
    exact_duplicate:bool(raw.duplicate?.exact),
    needed_now:raw.demand?.needed_now!==false,
    existing_engine_bindings,
    old_vs_new_decision,
    old_vs_new_reasons:uniq(raw.old_vs_new?.reasons),
    tribunal_decision,
    human_required,
    additional_cost_eur,
    zero_cost_alternative:bool(raw.cost?.zero_cost_alternative),
    roi_positive:bool(raw.cost?.roi_positive),
    money_limit_exceeded:bool(raw.cost?.money_limit_exceeded),
    internal_wrapper_ready:bool(raw.internal_wrapper_ready),
    external_code_execution_required:bool(raw.external_code_execution_required),
    source_ref:text(raw.source_ref)??'UNSPECIFIED_EVIDENCE'
  });
}

function receipt(base,{decision,reasons=[],human_required=null}={}){
  const allowWrap=decision==='ENVOLVER'&&base.internal_wrapper_ready&&!base.external_code_execution_required;
  const allowReuse=decision==='REUTILIZAR';
  const allowFactory=decision==='FABRICAR_GRATIS';
  const normalizedReasons=uniq(reasons);
  const id=stableIdempotencyKey({
    company_id:base.company_id,environment:base.environment,version:base.version,
    skill_id:base.skill_id,skill_version:base.skill_version,decision,reasons:normalizedReasons,
    human_required:human_required??null,bindings:base.existing_engine_bindings,source_ref:base.source_ref
  });
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_CAPABILITY_AUTONOMY_DECISION',
    decision_id:`skill-autonomy:${id.slice(0,24)}`,
    company_id:base.company_id,engine_id:base.engine_id,environment:PREPROD,version:base.version,
    skill_id:base.skill_id,skill_version:base.skill_version,decision,reasons:Object.freeze(normalizedReasons),human_required,
    existing_engine_bindings:Object.freeze(base.existing_engine_bindings),
    use_existing_authorized:allowReuse,
    preprod_internal_wrapper_activation_authorized:allowWrap,
    factory_candidate_authorized:allowFactory,
    factory_create_authorized:false,
    catalog_only:decision==='CATALOGAR',
    paid_activation_authorized:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,
    external_code_execution_authorized:false,
    rollback_required:decision==='ENVOLVER',rollback_ready:base.rollback_ready,rebuild_ready:base.rebuild_ready,
    additional_cost_eur:base.additional_cost_eur,
    next_gate:
      decision==='ENVOLVER'?(allowWrap?'PREPROD_INTERNAL_WRAPPER_SHADOW':'INTERNAL_WRAPPER_REQUIRED'):
      decision==='REUTILIZAR'?'USE_EXISTING_CAPABILITY_NO_MUTATION':
      decision==='FABRICAR_GRATIS'?'FACT001_CAPABILITY_GAP_REVIEW':
      decision==='PAGO_JUSTIFICADO'?'PAID_EXCEPTION_REVIEW':
      decision==='CATALOGAR'?'CATALOG_ONLY':
      decision==='DESCARTAR'?'STOP_REJECTED_CANDIDATE':'HOLD_EVIDENCE_OR_POLICY'
  });
}

export function decideSkillCapabilityAutonomy(raw={}){
  const base=normalize(raw);

  if(base.security_incident){
    return receipt(base,{decision:'HOLD',reasons:['SECURITY_INCIDENT'],human_required:'SECURITY_INCIDENT'});
  }
  if(!base.provenance_ok||!base.supply_chain_ok){
    return receipt(base,{decision:'DESCARTAR',reasons:['UNTRUSTED_SOURCE_OR_SUPPLY_CHAIN']});
  }
  if(base.legal_required){
    return receipt(base,{decision:'HOLD',reasons:['LEGAL_REVIEW_REQUIRED'],human_required:'LEGAL_REQUIRED'});
  }
  if(!base.license_ok){
    return receipt(base,{decision:'DESCARTAR',reasons:['LICENSE_INCOMPATIBLE_OR_DISALLOWED']});
  }
  if(base.policy_conflict){
    return receipt(base,{decision:'HOLD',reasons:['POLICY_CONFLICT'],human_required:'POLICY_CONFLICT'});
  }
  if(base.risk_class==='HIGH'||base.risk_class==='CRITICAL'){
    return receipt(base,{decision:'HOLD',reasons:[`RISK_${base.risk_class}`],human_required:'HIGH_RISK'});
  }
  if(base.tribunal_decision==='HUMAN_REQUIRED'){
    return receipt(base,{decision:'HOLD',reasons:['TRIBUNAL_HUMAN_REQUIRED'],human_required:base.human_required??'LOW_CONFIDENCE'});
  }
  if(!base.evidence_complete||base.confidence<0.70){
    return receipt(base,{decision:'HOLD',reasons:[!base.evidence_complete?'EVIDENCE_INCOMPLETE':'LOW_CONFIDENCE'],human_required:base.confidence<0.70?'LOW_CONFIDENCE':null});
  }
  if(!base.policy_locked||!base.permissions_locked||!base.rollback_ready||!base.rebuild_ready){
    const reasons=[];
    if(!base.policy_locked) reasons.push('POLICY_NOT_LOCKED');
    if(!base.permissions_locked) reasons.push('PERMISSIONS_NOT_LOCKED');
    if(!base.rollback_ready) reasons.push('ROLLBACK_NOT_READY');
    if(!base.rebuild_ready) reasons.push('REBUILD_NOT_READY');
    return receipt(base,{decision:'HOLD',reasons});
  }

  if(base.additional_cost_eur>0){
    if(base.zero_cost_alternative) return receipt(base,{decision:'DESCARTAR',reasons:['ZERO_COST_ALTERNATIVE_AVAILABLE']});
    if(!base.roi_positive) return receipt(base,{decision:'DESCARTAR',reasons:['PAID_OPTION_WITHOUT_POSITIVE_ROI']});
    return receipt(base,{decision:'PAGO_JUSTIFICADO',reasons:['NO_REASONABLE_ZERO_COST_ALTERNATIVE','POSITIVE_ROI_EVIDENCE'],human_required:base.money_limit_exceeded?'MONEY_LIMIT':null});
  }

  if(base.old_vs_new_decision==='FAIL'||base.tribunal_decision==='FAIL'){
    return receipt(base,{decision:'DESCARTAR',reasons:['OLD_VS_NEW_OR_TRIBUNAL_REJECTED',...base.old_vs_new_reasons]});
  }
  if(base.old_vs_new_decision!=='PASS'||base.tribunal_decision!=='PASS'){
    return receipt(base,{decision:'HOLD',reasons:['OLD_VS_NEW_AND_TRIBUNAL_PASS_REQUIRED']});
  }

  if(base.exact_duplicate){
    return receipt(base,{decision:'REUTILIZAR',reasons:['EXACT_CAPABILITY_ALREADY_AVAILABLE']});
  }
  if(base.existing_engine_bindings.length>0){
    return receipt(base,{decision:'ENVOLVER',reasons:['EXTEND_EXISTING_ENGINE_FIRST']});
  }
  if(!base.needed_now){
    return receipt(base,{decision:'CATALOGAR',reasons:['USEFUL_BUT_NO_CURRENT_OPERATIONAL_DEMAND']});
  }
  return receipt(base,{decision:'FABRICAR_GRATIS',reasons:['VERIFIED_CAPABILITY_GAP','ZERO_COST_ROUTE_REQUIRED']});
}
