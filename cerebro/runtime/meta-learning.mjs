import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export const META_STAGES=Object.freeze(["collect","normalize","learn","experiment","evaluate","judge","promote"]);

export function computeMetaMetrics({candidates_evaluated,useful_improvements,evidence_cost,validated_gain,signal_at,validated_at,promoted_changes,regressions}) {
  const safeDiv=(a,b)=>b>0?a/b:null;
  return {
    learning_yield:safeDiv(useful_improvements,candidates_evaluated),
    evidence_efficiency:safeDiv(validated_gain,evidence_cost),
    time_from_signal_to_validated_learning_ms:new Date(validated_at).getTime()-new Date(signal_at).getTime(),
    regression_from_promoted_changes:safeDiv(regressions,promoted_changes)
  };
}

export function createMetaCandidate({
  target_stage,prior_strategy_version,candidate_strategy_version,dataset_scope,
  metric_definition,leakage_checks,anti_gaming_checks,proposed_change,reduces_requirements=false
}) {
  if(!META_STAGES.includes(target_stage)) throw new Error("invalid target stage");
  if(!prior_strategy_version||!candidate_strategy_version||prior_strategy_version===candidate_strategy_version) throw new Error("versioned OLD vs NEW required");
  if(!dataset_scope||!metric_definition||!leakage_checks||!anti_gaming_checks||!proposed_change) throw new Error("meta contract incomplete");
  if(reduces_requirements) throw new Error("meta candidate cannot weaken approval requirements");
  return {
    meta_learning_id:stableIdempotencyKey({target_stage,prior_strategy_version,candidate_strategy_version,dataset_scope,proposed_change}),
    target_stage,prior_strategy_version,candidate_strategy_version,dataset_scope,
    metric_definition,leakage_checks,anti_gaming_checks,proposed_change,
    decision:null,state:"META_CANDIDATE",may_edit_judge:false,may_elevate_permissions:false,may_elevate_budget:false
  };
}

export function detectLearningBottleneck(stageMetrics) {
  const entries=Object.entries(stageMetrics||{}).filter(([,v])=>typeof v==="number"&&Number.isFinite(v));
  if(entries.length===0) return null;
  entries.sort((a,b)=>b[1]-a[1]);
  return {stage:entries[0][0],cost_or_latency:entries[0][1]};
}

export function metaGate({candidate,independent_evaluation=false,independent_judge=false}) {
  if(!candidate?.meta_learning_id) return {ok:false,reasons:["candidate_missing"]};
  const reasons=[];
  if(!independent_evaluation) reasons.push("independent_evaluation_required");
  if(!independent_judge) reasons.push("independent_judge_required");
  if(candidate.may_edit_judge) reasons.push("self_judge_edit_forbidden");
  if(candidate.may_elevate_permissions) reasons.push("permission_self_elevation_forbidden");
  if(candidate.may_elevate_budget) reasons.push("budget_self_elevation_forbidden");
  return {ok:reasons.length===0,reasons};
}
