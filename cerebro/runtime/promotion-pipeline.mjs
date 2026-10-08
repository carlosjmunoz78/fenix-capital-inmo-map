import {stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';

export const DELIVERY_STATES=Object.freeze(['PREPROD','SHADOW','CANARY','MONITORED','ROLLED_BACK']);
export const CURRENT_PROMOTION_AUTHORITY='CURRENT_DOMAIN_PROMOTION_AUTHORITY';

export function createPromotionPlan({
  company_id,engine_id,environment='PREPROD',version='0.1.0',baseline_version,candidate_version,
  judge_decision,tribunal_decision,rollback_ref,rebuild_ref,post_metrics,canary_percent=5
}){
  const context={company_id,engine_id,environment,version};
  const check=validateCanonicalContext(context,{allowProd:false});
  if(!check.ok) throw new Error(`invalid promotion context:${check.errors.join(',')}`);
  if(environment!=='PREPROD') throw new Error('promotion envelope must start PREPROD');
  if(baseline_version===candidate_version) throw new Error('OLD vs NEW required');
  if(judge_decision!=='PASS') throw new Error('judge PASS required');
  if(!['PASS','GREEN'].includes(tribunal_decision)) throw new Error('tribunal PASS/GREEN required');
  if(!rollback_ref) throw new Error('rollback required');
  if(!rebuild_ref) throw new Error('rebuild required');
  if(!post_metrics||typeof post_metrics!=='object'||Array.isArray(post_metrics)||Object.keys(post_metrics).length===0) throw new Error('post metrics required');
  if(!Number.isFinite(canary_percent)||canary_percent<=0||canary_percent>25) throw new Error('unsafe canary percent');
  return Object.freeze({
    promotion_id:stableIdempotencyKey({...context,baseline_version,candidate_version,rollback_ref,rebuild_ref}),
    ...context,baseline_version,candidate_version,rollback_ref,rebuild_ref,post_metrics:{...post_metrics},canary_percent,
    state:'PREPROD',next_gate:'SHADOW_EVIDENCE',prod_authorized:false,prod_write_authorized:false,
    external_activation_authority:CURRENT_PROMOTION_AUTHORITY,additional_cost_budget_eur:0
  });
}

export function advancePromotion(plan,{shadow_pass=false,canary_pass=false}={}){
  if(!plan?.promotion_id) throw new Error('plan required');
  if(plan.prod_authorized===true||plan.prod_write_authorized===true) throw new Error('generic RSI promotion envelope cannot carry PROD authority');
  if(plan.state==='PREPROD'){
    return Object.freeze(shadow_pass?{...plan,state:'SHADOW',next_gate:'CANARY_EVIDENCE'}:{...plan});
  }
  if(plan.state==='SHADOW'){
    return Object.freeze(canary_pass?{...plan,state:'CANARY',next_gate:'CURRENT_PROMOTION_AUTHORITY_REQUIRED'}:{...plan});
  }
  if(plan.state==='CANARY'){
    return Object.freeze({...plan,next_gate:'CURRENT_PROMOTION_AUTHORITY_REQUIRED',prod_authorized:false,prod_write_authorized:false});
  }
  return Object.freeze({...plan});
}

export function postMonitor({plan,observed_metrics}){
  if(!plan?.post_metrics) throw new Error('plan required');
  const breaches=[];
  for(const [metric,rule] of Object.entries(plan.post_metrics)){
    const value=observed_metrics?.[metric];
    if(typeof value!=='number'||!Number.isFinite(value)){breaches.push({metric,reason:'missing'});continue;}
    if(rule.min!==undefined&&value<rule.min) breaches.push({metric,reason:'below_min',value,min:rule.min});
    if(rule.max!==undefined&&value>rule.max) breaches.push({metric,reason:'above_max',value,max:rule.max});
  }
  return Object.freeze(breaches.length
    ?{decision:'ROLLBACK',state:'ROLLED_BACK',rollback_ref:plan.rollback_ref,breaches,prod_authorized:false,prod_write_authorized:false}
    :{decision:'KEEP_NONPROD',state:'MONITORED',breaches:[],next_gate:'CURRENT_PROMOTION_AUTHORITY_REQUIRED',prod_authorized:false,prod_write_authorized:false});
}
