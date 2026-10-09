import {stableIdempotencyKey} from './continuous-improvement-contract.mjs';

const PREPROD='PREPROD';
const ALLOWED_AUTONOMY=new Set(['ASSISTED','PREPROD_AUTONOMOUS']);
const ALLOWED_KILL_SWITCH=new Set(['ARMED','TRIPPED']);
const ALLOWED_RISK=new Set(['LOW','MEDIUM']);

function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function finite(value,label){const n=Number(value);if(!Number.isFinite(n))throw new Error(`${label} must be finite`);return n;}
function frozen(value){return Object.freeze({...value,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function human(code,reasons,policy,candidate){return frozen({ok:false,decision:'HUMAN_REQUIRED',human_required:code,reasons:[...reasons],policy_id:policy?.policy_id??null,candidate_id:candidate?.candidate_id??null,next_gate:'HUMAN_REQUIRED'});}
function hold(reason,policy,candidate){return frozen({ok:false,decision:'HOLD',human_required:null,reasons:[reason],policy_id:policy?.policy_id??null,candidate_id:candidate?.candidate_id??null,next_gate:'DOMAIN_POLICY_EVIDENCE_REQUIRED'});}
function capabilities(input){
  const raw=Array.isArray(input)?input:['*'];
  const values=[...new Set(raw.map((x)=>req(String(x),'allowed_capability').toUpperCase()))].sort();
  if(!values.length) throw new Error('allowed_capabilities cannot be empty');
  if(values.includes('*')&&values.length>1) throw new Error('wildcard capability cannot be combined with explicit capabilities');
  return values;
}

export function defineDomainAutonomyPolicy(input={}){
  const capabilityMode=input.capability_autonomy_mode==null?null:req(input.capability_autonomy_mode,'capability_autonomy_mode');
  const policy={
    policy_id:req(input.policy_id,'policy_id'),policy_version:req(input.policy_version,'policy_version'),company_id:req(input.company_id,'company_id'),engine_id:req(input.engine_id,'engine_id'),domain_id:req(input.domain_id,'domain_id'),
    environment:req(input.environment??PREPROD,'environment'),autonomy_mode:req(input.autonomy_mode??'PREPROD_AUTONOMOUS','autonomy_mode'),capability_autonomy_mode:capabilityMode,
    kill_switch_enabled:input.kill_switch_enabled===true,kill_switch_state:req(input.kill_switch_state??'ARMED','kill_switch_state'),automatic_rollback_allowed:input.automatic_rollback_allowed===true,
    min_confidence:finite(input.min_confidence??0.60,'min_confidence'),max_canary_percent:finite(input.max_canary_percent??10,'max_canary_percent'),
    blast_radius:{max_percent:finite(input?.blast_radius?.max_percent??10,'blast_radius.max_percent'),max_records:Number.isInteger(input?.blast_radius?.max_records)?input.blast_radius.max_records:100,scope:req(input?.blast_radius?.scope??'PREPROD_ONLY','blast_radius.scope')},
    additional_cost_limit_eur:finite(input.additional_cost_limit_eur??0,'additional_cost_limit_eur'),
    allowed_risk_classes:Array.isArray(input.allowed_risk_classes)?[...new Set(input.allowed_risk_classes.map((x)=>req(String(x),'allowed_risk_class').toUpperCase()))].sort():['LOW','MEDIUM'],
    allowed_capabilities:capabilities(input.allowed_capabilities),prod_promotion_authorized:false,prod_write_authorized:false,trading_access:false
  };
  if(policy.environment!==PREPROD) throw new Error('domain policy must remain PREPROD');
  if(!ALLOWED_AUTONOMY.has(policy.autonomy_mode)) throw new Error('autonomy_mode invalid');
  if(policy.capability_autonomy_mode!==null&&policy.capability_autonomy_mode!=='PREPROD_AUTONOMOUS') throw new Error('capability_autonomy_mode invalid');
  if(policy.capability_autonomy_mode==='PREPROD_AUTONOMOUS'&&policy.allowed_capabilities.includes('*')) throw new Error('capability-scoped autonomy requires explicit allowed_capabilities');
  if(!ALLOWED_KILL_SWITCH.has(policy.kill_switch_state)) throw new Error('kill_switch_state invalid');
  if(policy.min_confidence<0.60||policy.min_confidence>1) throw new Error('min_confidence must be 0.60..1');
  if(policy.max_canary_percent<=0||policy.max_canary_percent>25) throw new Error('max_canary_percent must be 0..25');
  if(policy.blast_radius.max_percent<=0||policy.blast_radius.max_percent>25) throw new Error('blast_radius.max_percent must be 0..25');
  if(!Number.isInteger(policy.blast_radius.max_records)||policy.blast_radius.max_records<1||policy.blast_radius.max_records>1000) throw new Error('blast_radius.max_records must be 1..1000');
  if(policy.blast_radius.scope!=='PREPROD_ONLY') throw new Error('blast_radius scope must remain PREPROD_ONLY');
  if(policy.additional_cost_limit_eur!==0) throw new Error('additional cost limit must remain zero');
  for(const risk of policy.allowed_risk_classes) if(!ALLOWED_RISK.has(risk)) throw new Error('allowed_risk_classes may only contain LOW/MEDIUM');
  if(policy.prod_promotion_authorized!==false||policy.prod_write_authorized!==false||policy.trading_access!==false) throw new Error('domain policy cannot grant PROD or Trading authority');
  return Object.freeze({...policy,blast_radius:Object.freeze({...policy.blast_radius}),allowed_risk_classes:Object.freeze([...policy.allowed_risk_classes]),allowed_capabilities:Object.freeze([...policy.allowed_capabilities]),policy_hash:stableIdempotencyKey(policy)});
}

export function evaluateDomainAdoptionPolicy({policy,candidate,promotion_plan}={}){
  if(!policy?.policy_hash) throw new Error('defined domain policy required');
  if(!candidate||typeof candidate!=='object') throw new Error('candidate required');
  if(!promotion_plan||typeof promotion_plan!=='object') throw new Error('promotion_plan required');
  if(candidate.company_id!==policy.company_id||promotion_plan.company_id!==policy.company_id) return human('POLICY_CONFLICT',['company_scope_mismatch'],policy,candidate);
  if(candidate.engine_id!==policy.engine_id||promotion_plan.engine_id!==policy.engine_id) return human('POLICY_CONFLICT',['engine_scope_mismatch'],policy,candidate);
  if(candidate.environment!==PREPROD||promotion_plan.environment!==PREPROD) return human('POLICY_CONFLICT',['non_preprod_scope_forbidden'],policy,candidate);
  if(candidate.prod_authorized===true||candidate.prod_write_authorized===true||candidate.trading_access===true||promotion_plan.prod_authorized===true||promotion_plan.prod_write_authorized===true||promotion_plan.trading_access===true) return human('SECURITY_INCIDENT',['authority_boundary_violation'],policy,candidate);
  const risk=req(candidate.risk_class??'LOW','candidate.risk_class').toUpperCase();
  if(risk==='HIGH'||risk==='CRITICAL') return human('HIGH_RISK',['risk_above_domain_autonomy_envelope'],policy,candidate);
  const confidence=finite(candidate.confidence,'candidate.confidence');
  if(confidence<policy.min_confidence) return human('LOW_CONFIDENCE',['confidence_below_domain_threshold'],policy,candidate);
  const requestedCapability=typeof candidate.requested_capability==='string'&&candidate.requested_capability.trim()?candidate.requested_capability.trim().toUpperCase():null;
  const wholeDomainAutonomous=policy.autonomy_mode==='PREPROD_AUTONOMOUS';
  const capabilityAutonomous=policy.capability_autonomy_mode==='PREPROD_AUTONOMOUS';
  if(!wholeDomainAutonomous&&!capabilityAutonomous) return hold('DOMAIN_AUTONOMY_NOT_PREPROD_AUTONOMOUS',policy,candidate);
  if(capabilityAutonomous&&!wholeDomainAutonomous){
    if(!requestedCapability) return hold('EXPLICIT_CAPABILITY_REQUIRED',policy,candidate);
    if(!policy.allowed_capabilities.includes(requestedCapability)) return hold('CAPABILITY_NOT_AUTONOMOUS',policy,candidate);
  } else if(!policy.allowed_capabilities.includes('*')){
    if(!requestedCapability) return hold('EXPLICIT_CAPABILITY_REQUIRED',policy,candidate);
    if(!policy.allowed_capabilities.includes(requestedCapability)) return hold('CAPABILITY_NOT_AUTONOMOUS',policy,candidate);
  }
  if(!policy.kill_switch_enabled) return hold('KILL_SWITCH_REQUIRED',policy,candidate);
  if(policy.kill_switch_state==='TRIPPED') return frozen({ok:false,decision:'KILL_SWITCH_BLOCK',human_required:null,reasons:['KILL_SWITCH_TRIPPED'],policy_id:policy.policy_id,candidate_id:candidate.candidate_id,next_gate:'RECOVERY_AND_REVIEW'});
  if(!policy.automatic_rollback_allowed) return hold('AUTOMATIC_ROLLBACK_REQUIRED_FOR_CANARY',policy,candidate);
  if(!policy.allowed_risk_classes.includes(risk)) return human('HIGH_RISK',['risk_not_allowed_by_domain_policy'],policy,candidate);
  const canary=finite(promotion_plan.canary_percent,'promotion_plan.canary_percent');const effectiveMax=Math.min(policy.max_canary_percent,policy.blast_radius.max_percent);
  if(canary>effectiveMax) return hold('CANARY_EXCEEDS_BLAST_RADIUS',policy,candidate);
  if(promotion_plan.additional_cost_budget_eur!==0) return human('MONEY_LIMIT',['nonzero_incremental_cost_budget'],policy,candidate);
  if(!promotion_plan.rollback_ref||!promotion_plan.rebuild_ref) return hold('ROLLBACK_AND_REBUILD_REQUIRED',policy,candidate);
  const effectiveAutonomyMode=wholeDomainAutonomous?'PREPROD_AUTONOMOUS':'PREPROD_AUTONOMOUS_CAPABILITY_SCOPED';
  const decision_id=stableIdempotencyKey({policy_hash:policy.policy_hash,candidate_id:candidate.candidate_id,promotion_id:promotion_plan.promotion_id,canary_percent:canary,requested_capability:requestedCapability});
  return frozen({ok:true,decision:'ALLOW_PREPROD_CANARY',human_required:null,reasons:[],policy_id:policy.policy_id,policy_version:policy.policy_version,decision_id,candidate_id:candidate.candidate_id,promotion_id:promotion_plan.promotion_id,domain_id:policy.domain_id,requested_capability:requestedCapability,allowed_capabilities:policy.allowed_capabilities,autonomy_mode:effectiveAutonomyMode,domain_autonomy_mode:policy.autonomy_mode,capability_autonomy_mode:policy.capability_autonomy_mode,kill_switch_state:policy.kill_switch_state,automatic_rollback_allowed:true,blast_radius:Object.freeze({...policy.blast_radius,effective_max_percent:effectiveMax}),next_gate:'B4_PREPROD_SHADOW_CANARY'});
}

export function tripDomainKillSwitch(policy,reason='OPERATOR_OR_MONITOR_TRIP'){
  if(!policy?.policy_hash) throw new Error('defined domain policy required');
  return defineDomainAutonomyPolicy({...policy,kill_switch_state:'TRIPPED',policy_version:`${policy.policy_version}+tripped`,additional_cost_limit_eur:0,prod_promotion_authorized:false,prod_write_authorized:false,trading_access:false,trip_reason:req(reason,'reason')});
}

export const RSI_DOMAIN_AUTONOMY_POLICY_CONTRACT=Object.freeze({scope:'PER_DOMAIN_CAPABILITY',environment:PREPROD,required:['policy_id','policy_version','company_id','engine_id','domain_id','autonomy_mode','kill_switch','blast_radius','automatic_rollback','confidence','risk','zero_cost'],max_canary_percent:25,allowed_autonomous_risk:['LOW','MEDIUM'],min_confidence_floor:0.60,capability_default:'*',explicit_capability_policy:'HOLD_IF_MISSING_OR_UNAUTHORIZED',high_risk:'HUMAN_REQUIRED:HIGH_RISK',low_confidence:'HUMAN_REQUIRED:LOW_CONFIDENCE',authority_violation:'HUMAN_REQUIRED:SECURITY_INCIDENT',prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0});
