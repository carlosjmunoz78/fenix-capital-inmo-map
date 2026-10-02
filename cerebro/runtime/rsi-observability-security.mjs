import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export function cycleTelemetry({company_id,engine_id,cycle_id,started_at,ended_at,cost_eur,candidates,useful_improvements,attempts}) {
  if(!company_id||!engine_id||!cycle_id) throw new Error("identity required");
  if(!Number.isFinite(cost_eur)||cost_eur<0) throw new Error("invalid cost");
  if(!Number.isInteger(attempts)||attempts<0) throw new Error("invalid attempts");
  const duration_ms=new Date(ended_at)-new Date(started_at);
  if(!Number.isFinite(duration_ms)||duration_ms<0) throw new Error("invalid timestamps");
  return {correlation_id:stableIdempotencyKey({company_id,engine_id,cycle_id}),company_id,engine_id,cycle_id,duration_ms,cost_per_cycle:cost_eur,learning_yield:candidates>0?useful_improvements/candidates:null,attempts};
}

export function loopGuard({attempts,max_attempts=3,cost_eur=0,budget_eur=0,rate_count=0,rate_limit=100,security_incident=false,kill_switch=false}) {
  const reasons=[];
  if(kill_switch) reasons.push("KILL_SWITCH");
  if(security_incident) reasons.push("SECURITY_INCIDENT");
  if(attempts>max_attempts) reasons.push("RUNAWAY_LOOP");
  if(cost_eur>budget_eur) reasons.push("MONEY_LIMIT");
  if(rate_count>rate_limit) reasons.push("RATE_LIMIT");
  return {allowed:reasons.length===0,reasons,human_required:reasons.includes("SECURITY_INCIDENT")?"SECURITY_INCIDENT":reasons.includes("MONEY_LIMIT")?"MONEY_LIMIT":null};
}

export function authorizeExternalChange({auditable=false,reversible=false,policy_pass=false,security_pass=false}) {
  const reasons=[];
  if(!auditable) reasons.push("NOT_AUDITABLE");
  if(!reversible) reasons.push("NO_ROLLBACK");
  if(!policy_pass) reasons.push("POLICY_GATE");
  if(!security_pass) reasons.push("SECURITY_GATE");
  return {allowed:reasons.length===0,reasons};
}
