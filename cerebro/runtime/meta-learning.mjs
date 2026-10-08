import {stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';

export const META_STAGES=Object.freeze(['collect','normalize','learn','experiment','evaluate','judge','promote']);

function finiteNonNegative(value,label){
  if(!Number.isFinite(value)||value<0) throw new Error(`invalid ${label}`);
  return value;
}
function instant(value,label){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) throw new Error(`invalid ${label}`);
  return d.getTime();
}

export function computeMetaMetrics({candidates_evaluated,useful_improvements,evidence_cost,validated_gain,signal_at,validated_at,promoted_changes,regressions}){
  [
    ['candidates_evaluated',candidates_evaluated],['useful_improvements',useful_improvements],['evidence_cost',evidence_cost],
    ['validated_gain',validated_gain],['promoted_changes',promoted_changes],['regressions',regressions]
  ].forEach(([label,value])=>finiteNonNegative(value,label));
  const safeDiv=(a,b)=>b>0?a/b:null;
  return Object.freeze({
    learning_yield:safeDiv(useful_improvements,candidates_evaluated),
    evidence_efficiency:safeDiv(validated_gain,evidence_cost),
    time_from_signal_to_validated_learning_ms:instant(validated_at,'validated_at')-instant(signal_at,'signal_at'),
    regression_from_promoted_changes:safeDiv(regressions,promoted_changes)
  });
}

export function createMetaCandidate({
  company_id,engine_id,environment='LAB',version='0.1.0',target_stage,prior_strategy_version,candidate_strategy_version,
  dataset_scope,metric_definition,leakage_checks,anti_gaming_checks,proposed_change,reduces_requirements=false,
  may_edit_judge=false,may_elevate_permissions=false,may_elevate_budget=false
}){
  const context={company_id,engine_id,environment,version};
  const check=validateCanonicalContext(context,{allowProd:false});
  if(!check.ok) throw new Error(`invalid meta context:${check.errors.join(',')}`);
  if(!META_STAGES.includes(target_stage)) throw new Error('invalid target stage');
  if(!prior_strategy_version||!candidate_strategy_version||prior_strategy_version===candidate_strategy_version) throw new Error('versioned OLD vs NEW required');
  if(!dataset_scope||!metric_definition||!leakage_checks||!anti_gaming_checks||!proposed_change) throw new Error('meta contract incomplete');
  if(reduces_requirements) throw new Error('meta candidate cannot weaken approval requirements');
  if(may_edit_judge) throw new Error('self judge edit forbidden');
  if(may_elevate_permissions) throw new Error('permission self elevation forbidden');
  if(may_elevate_budget) throw new Error('budget self elevation forbidden');
  return Object.freeze({
    meta_learning_id:stableIdempotencyKey({...context,target_stage,prior_strategy_version,candidate_strategy_version,dataset_scope,proposed_change}),
    ...context,target_stage,prior_strategy_version,candidate_strategy_version,dataset_scope,metric_definition,leakage_checks,anti_gaming_checks,proposed_change,
    decision:null,state:'META_CANDIDATE',reduces_requirements:false,may_edit_judge:false,may_elevate_permissions:false,may_elevate_budget:false,
    prod_authorized:false,additional_cost_budget_eur:0
  });
}

export function detectLearningBottleneck(stageMetrics){
  const entries=Object.entries(stageMetrics??{}).filter(([stage,value])=>META_STAGES.includes(stage)&&typeof value==='number'&&Number.isFinite(value)&&value>=0);
  if(entries.length===0) return null;
  entries.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  return Object.freeze({stage:entries[0][0],cost_or_latency:entries[0][1]});
}

export function metaGate({candidate,independent_evaluation=false,independent_judge=false,rollback_ready=false,rebuild_ready=false}={}){
  if(!candidate?.meta_learning_id) return Object.freeze({ok:false,reasons:['candidate_missing'],prod_authorized:false});
  const reasons=[];
  if(!independent_evaluation) reasons.push('independent_evaluation_required');
  if(!independent_judge) reasons.push('independent_judge_required');
  if(!rollback_ready) reasons.push('rollback_required');
  if(!rebuild_ready) reasons.push('rebuild_required');
  if(candidate.reduces_requirements) reasons.push('approval_requirement_weakening_forbidden');
  if(candidate.may_edit_judge) reasons.push('self_judge_edit_forbidden');
  if(candidate.may_elevate_permissions) reasons.push('permission_self_elevation_forbidden');
  if(candidate.may_elevate_budget) reasons.push('budget_self_elevation_forbidden');
  return Object.freeze({ok:reasons.length===0,reasons,next_gate:reasons.length===0?'META_EXPERIMENT_REVIEW':'HOLD',prod_authorized:false,prod_write_authorized:false});
}
