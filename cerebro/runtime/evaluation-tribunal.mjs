import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export function defineBenchmark({benchmark_id,version,metric,holdout_ref,adversarial_refs=[]}) {
  if(!benchmark_id||!version||!metric||!holdout_ref) throw new Error("benchmark contract incomplete");
  return {benchmark_id,version,metric,holdout_ref,adversarial_refs,secret_holdout:true};
}

export function evaluateOldNew({benchmark,old_result,new_result,candidate_visible_holdout=false}) {
  if(!benchmark?.secret_holdout) throw new Error("holdout required");
  if(candidate_visible_holdout) throw new Error("holdout leakage detected");
  const oldv=old_result?.metrics?.[benchmark.metric];
  const newv=new_result?.metrics?.[benchmark.metric];
  if(typeof oldv!=="number"||typeof newv!=="number") throw new Error("metric missing");
  return {
    evaluation_id:stableIdempotencyKey({benchmark:benchmark.benchmark_id,version:benchmark.version,oldv,newv}),
    benchmark_ref:`${benchmark.benchmark_id}@${benchmark.version}`,
    metric:benchmark.metric,old:oldv,new:newv,delta:newv-oldv,
    leakage_check:"PASS",adversarial_count:benchmark.adversarial_refs.length
  };
}

export function tribunalDecision({evaluation,judge_id,candidate_actor_id,real_outcome_delta=null,metric_direction="higher"}) {
  if(!evaluation||!judge_id) throw new Error("evaluation and judge required");
  if(judge_id===candidate_actor_id) return {decision:"FAIL",reason:"judge_not_independent"};
  const metricImproved=metric_direction==="higher"?evaluation.delta>0:evaluation.delta<0;
  if(real_outcome_delta!==null && metricImproved && real_outcome_delta<0) {
    return {decision:"FAIL",reason:"GOODHART_DETECTED",evaluator_improvement_candidate:true};
  }
  if(evaluation.delta===0) return {decision:"MORE_EVIDENCE",reason:"no_measurable_delta"};
  return metricImproved?{decision:"PASS",reason:"predefined_metric_improved"}:{decision:"FAIL",reason:"candidate_degraded"};
}

export function validateEvaluatorChange({reduces_requirements=false,independent_gate=false}) {
  if(reduces_requirements && !independent_gate) return {ok:false,reason:"cannot_weaken_evaluator_without_independent_gate"};
  return {ok:true};
}
