import {stableIdempotencyKey,validateCanonicalContext,HUMAN_REQUIRED_CODES} from './continuous-improvement-contract.mjs';

function instant(value,label){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) throw new Error(`invalid ${label}`);
  return d.toISOString();
}

export function cycleTelemetryEnvelope({company_id,engine_id,environment='PREPROD',version='0.1.0',cycle_id,started_at,ended_at,cost_eur=0,candidates,useful_improvements,attempts}){
  const context={company_id,engine_id,environment,version};
  const check=validateCanonicalContext(context,{allowProd:false});
  if(!check.ok||environment!=='PREPROD') throw new Error(`RSI telemetry requires exact PREPROD context:${check.errors.join(',')}`);
  if(!cycle_id) throw new Error('cycle_id required');
  if(!Number.isFinite(cost_eur)||cost_eur!==0) throw new Error('additional RSI cost must remain 0 EUR');
  if(!Number.isInteger(candidates)||candidates<0||!Number.isInteger(useful_improvements)||useful_improvements<0) throw new Error('invalid learning counts');
  if(useful_improvements>candidates) throw new Error('useful improvements cannot exceed candidates');
  if(!Number.isInteger(attempts)||attempts<0) throw new Error('invalid attempts');
  const start=instant(started_at,'started_at'),end=instant(ended_at,'ended_at');
  const duration_ms=new Date(end).getTime()-new Date(start).getTime();
  if(duration_ms<0) throw new Error('invalid timestamps');
  const correlation_id=`rsi_${stableIdempotencyKey({...context,cycle_id}).slice(0,24)}`;
  const data={cycle_id,duration_ms,cost_per_cycle_eur:0,learning_yield:candidates>0?useful_improvements/candidates:null,attempts,candidates,useful_improvements,source:'RSI_RECOVERY_001'};
  return Object.freeze({
    authority:'OBSERV-001/current-observability-audit-finops',
    observability_input:{context,correlation_id,level:'INFO',message:'RSI improvement cycle telemetry',data},
    finops_input:{context,correlation_id,task_id:`rsi-cycle:${cycle_id}`,provider:'LOCAL',cost_eur:0,metadata:{source:'RSI_RECOVERY_001'}},
    persistent_write_authorized:false,prod_authorized:false,prod_write_authorized:false
  });
}

export function loopGuard({attempts,max_attempts=3,cost_eur=0,budget_eur=0,rate_count=0,rate_limit=100,security_incident=false,kill_switch=false}){
  const reasons=[];
  if(!Number.isInteger(attempts)||attempts<0||!Number.isInteger(max_attempts)||max_attempts<1||max_attempts>3) throw new Error('invalid attempts');
  if(!Number.isFinite(cost_eur)||cost_eur<0||!Number.isFinite(budget_eur)||budget_eur<0) throw new Error('invalid cost');
  if(!Number.isInteger(rate_count)||rate_count<0||!Number.isInteger(rate_limit)||rate_limit<1) throw new Error('invalid rate');
  if(kill_switch) reasons.push('KILL_SWITCH');
  if(security_incident) reasons.push('SECURITY_INCIDENT');
  if(attempts>max_attempts) reasons.push('RUNAWAY_LOOP');
  if(cost_eur>budget_eur) reasons.push('MONEY_LIMIT');
  if(rate_count>rate_limit) reasons.push('RATE_LIMIT');
  const human_required=reasons.includes('SECURITY_INCIDENT')?'SECURITY_INCIDENT':reasons.includes('MONEY_LIMIT')?'MONEY_LIMIT':null;
  if(human_required&&!HUMAN_REQUIRED_CODES.includes(human_required)) throw new Error('invalid human exception mapping');
  return Object.freeze({allowed:reasons.length===0,reasons,human_required,prod_authorized:false});
}

export function externalChangeGate({auditable=false,reversible=false,policy_pass=false,security_pass=false,preprod_evidence=false}){
  const reasons=[];
  if(!auditable) reasons.push('NOT_AUDITABLE');
  if(!reversible) reasons.push('NO_ROLLBACK');
  if(!policy_pass) reasons.push('POLICY_GATE');
  if(!security_pass) reasons.push('SECURITY_GATE');
  if(!preprod_evidence) reasons.push('PREPROD_EVIDENCE_REQUIRED');
  return Object.freeze({allowed:reasons.length===0,reasons,next_gate:reasons.length===0?'CURRENT_DOMAIN_AUTHORITY_REVIEW':'HOLD',prod_authorized:false,prod_write_authorized:false});
}
