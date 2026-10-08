import {stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';

export const CADENCES=Object.freeze({DAILY:'DAILY',WEEKLY:'WEEKLY',MONTHLY:'MONTHLY',EVENT:'EVENT'});
export const EVENT_TRIGGERS=Object.freeze([
  'REPEATED_FAILURE','REGRESSION','HUMAN_CORRECTION','CEREBRO_HUMAN_DIFF',
  'EXTERNAL_CHANGE','EXPERIMENT_RESULT','INCIDENT','COST_SPIKE',
  'LATENCY_SPIKE','PERFORMANCE_DEGRADATION','NEW_CAPABILITY'
]);

function instant(value,label){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) throw new Error(`invalid ${label}`);
  return d.toISOString();
}

export function createCyclePlan({
  company_id,engine_id,environment='PREPROD',version='0.1.0',cadence,now,checkpoint=null,event_type=null,
  max_attempts=3,budget_eur=0
}){
  const context={company_id,engine_id,environment,version};
  const contextCheck=validateCanonicalContext(context,{allowProd:false});
  if(!contextCheck.ok) throw new Error(`invalid cycle context:${contextCheck.errors.join(',')}`);
  if(!Object.values(CADENCES).includes(cadence)) throw new Error('invalid cadence');
  if(cadence===CADENCES.EVENT&&!EVENT_TRIGGERS.includes(event_type)) throw new Error('invalid event trigger');
  if(cadence!==CADENCES.EVENT&&event_type!==null) throw new Error('event_type only allowed for EVENT cadence');
  if(!Number.isInteger(max_attempts)||max_attempts<1||max_attempts>3) throw new Error('max_attempts must be 1..3');
  if(!Number.isFinite(budget_eur)||budget_eur!==0) throw new Error('additional cost budget must remain 0 EUR');
  const scheduled_at=instant(now,'now');
  const lock_key=stableIdempotencyKey({...context,cadence,event_type:event_type??null,checkpoint});
  return Object.freeze({
    ...context,cadence,event_type:event_type??null,scheduled_at,checkpoint,lock_key,max_attempts,
    backoff_seconds:[30,120,600].slice(0,max_attempts),budget_eur:0,execution_mode:'INCREMENTAL_PLAN_ONLY',
    allow_prod_writes:false,prod_authorized:false,paid_fallback:false,trading_access:false,customer_data_access:false
  });
}

export function shouldRunHorizon({cadence,last_run_at,now}){
  const current=new Date(instant(now,'now'));
  if(!last_run_at) return true;
  const last=new Date(instant(last_run_at,'last_run_at'));
  const elapsed=current.getTime()-last.getTime();
  if(elapsed<0) return false;
  const day=24*60*60*1000;
  if(cadence===CADENCES.DAILY) return elapsed>=day;
  if(cadence===CADENCES.WEEKLY) return elapsed>=7*day;
  if(cadence===CADENCES.MONTHLY) return elapsed>=28*day;
  if(cadence===CADENCES.EVENT) return true;
  throw new Error('invalid cadence');
}

export function nextRetry({attempt,max_attempts=3}){
  if(!Number.isInteger(max_attempts)||max_attempts<1||max_attempts>3) throw new Error('max_attempts must be 1..3');
  if(!Number.isInteger(attempt)||attempt<1) throw new Error('invalid attempt');
  if(attempt>=max_attempts) return Object.freeze({retry:false,human_required:null,exhausted:true});
  return Object.freeze({retry:true,after_seconds:[30,120,600][attempt-1]??600,human_required:null,exhausted:false});
}

export function eventToCandidate(event_type){
  if(!EVENT_TRIGGERS.includes(event_type)) throw new Error('invalid event trigger');
  return Object.freeze({
    candidate_type:['INCIDENT','REPEATED_FAILURE','REGRESSION'].includes(event_type)?'IMPROVEMENT_CANDIDATE':'LEARNING_CANDIDATE',
    priority:['INCIDENT','REGRESSION','COST_SPIKE'].includes(event_type)?'HIGH':'NORMAL',
    human_required:null,
    prod_authorized:false
  });
}
