import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export const DELIVERY_STATES=Object.freeze(["DRAFT","LAB","EVALUATED","JUDGED","PREPROD","SHADOW","CANARY","ACTIVE","MONITORED","ROLLED_BACK"]);

export function createPromotionPlan({
  company_id,engine_id,baseline_version,candidate_version,judge_decision,
  rollback_ref,post_metrics,canary_percent=5,environment="PREPROD"
}) {
  if(!company_id||!engine_id) throw new Error("identity required");
  if(baseline_version===candidate_version) throw new Error("OLD vs NEW required");
  if(judge_decision!=="PASS") throw new Error("judge PASS required");
  if(!rollback_ref) throw new Error("rollback required");
  if(!post_metrics||typeof post_metrics!=="object"||Object.keys(post_metrics).length===0) throw new Error("post metrics required");
  if(!Number.isFinite(canary_percent)||canary_percent<=0||canary_percent>25) throw new Error("unsafe canary percent");
  if(environment!=="PREPROD") throw new Error("promotion must start PREPROD");
  return {
    promotion_id:stableIdempotencyKey({company_id,engine_id,baseline_version,candidate_version,rollback_ref}),
    company_id,engine_id,baseline_version,candidate_version,rollback_ref,
    post_metrics,canary_percent,state:"PREPROD",prod_write_authorized:false
  };
}

export function advancePromotion(plan,{shadow_pass=false,canary_pass=false,human_prod_authorized=false}={}) {
  if(!plan?.promotion_id) throw new Error("plan required");
  if(plan.state==="PREPROD") return shadow_pass?{...plan,state:"SHADOW"}:{...plan};
  if(plan.state==="SHADOW") return canary_pass?{...plan,state:"CANARY"}:{...plan};
  if(plan.state==="CANARY") {
    if(!human_prod_authorized) return {...plan};
    return {...plan,state:"ACTIVE",prod_write_authorized:true};
  }
  if(plan.state==="ACTIVE") return {...plan,state:"MONITORED"};
  return {...plan};
}

export function postMonitor({plan,observed_metrics}) {
  if(!plan?.post_metrics) throw new Error("plan required");
  const breaches=[];
  for(const [metric,rule] of Object.entries(plan.post_metrics)){
    const value=observed_metrics?.[metric];
    if(typeof value!=="number") { breaches.push({metric,reason:"missing"}); continue; }
    if(rule.min!==undefined && value<rule.min) breaches.push({metric,reason:"below_min",value,min:rule.min});
    if(rule.max!==undefined && value>rule.max) breaches.push({metric,reason:"above_max",value,max:rule.max});
  }
  return breaches.length?{decision:"ROLLBACK",state:"ROLLED_BACK",rollback_ref:plan.rollback_ref,breaches}:{decision:"KEEP",state:"MONITORED",breaches:[]};
}
