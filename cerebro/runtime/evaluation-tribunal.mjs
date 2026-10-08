import {stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';

export function defineBenchmark({company_id,engine_id,environment='PREPROD',version='0.1.0',benchmark_id,benchmark_version,metric,holdout_ref,adversarial_refs=[]}){
  const context={company_id,engine_id,environment,version};
  const check=validateCanonicalContext(context,{allowProd:false});
  if(!check.ok) throw new Error(`invalid benchmark context:${check.errors.join(',')}`);
  if(!benchmark_id||!benchmark_version||!metric||!holdout_ref) throw new Error('benchmark contract incomplete');
  return Object.freeze({...context,benchmark_id,benchmark_version,metric,holdout_ref,adversarial_refs:[...adversarial_refs],secret_holdout:true,prod_authorized:false});
}

export function evaluateOldNew({benchmark,old_result,new_result,candidate_visible_holdout=false}){
  if(!benchmark?.secret_holdout) throw new Error('holdout required');
  if(candidate_visible_holdout) throw new Error('holdout leakage detected');
  if(old_result?.arm!=='OLD'||new_result?.arm!=='NEW') throw new Error('OLD and NEW results required');
  if(old_result.experiment_id!==new_result.experiment_id) throw new Error('arm experiment mismatch');
  for(const key of ['company_id','engine_id','environment','version']){
    if(old_result[key]!==new_result[key]) throw new Error('arm context mismatch');
    if(benchmark[key]!==old_result[key]) throw new Error('benchmark context mismatch');
  }
  const oldv=old_result.metrics?.[benchmark.metric];
  const newv=new_result.metrics?.[benchmark.metric];
  if(typeof oldv!=='number'||!Number.isFinite(oldv)||typeof newv!=='number'||!Number.isFinite(newv)) throw new Error('metric missing');
  return Object.freeze({
    evaluation_id:stableIdempotencyKey({benchmark:benchmark.benchmark_id,benchmark_version:benchmark.benchmark_version,experiment_id:old_result.experiment_id,oldv,newv}),
    company_id:benchmark.company_id,engine_id:benchmark.engine_id,environment:benchmark.environment,version:benchmark.version,
    experiment_id:old_result.experiment_id,benchmark_ref:`${benchmark.benchmark_id}@${benchmark.benchmark_version}`,
    metric:benchmark.metric,old:oldv,new:newv,delta:newv-oldv,leakage_check:'PASS',adversarial_count:benchmark.adversarial_refs.length,
    prod_authorized:false
  });
}

export function tribunalDecision({evaluation,judge_id,candidate_actor_id,real_outcome_delta=null,metric_direction='higher'}){
  if(!evaluation||!judge_id) throw new Error('evaluation and judge required');
  if(!['higher','lower'].includes(metric_direction)) throw new Error('invalid metric direction');
  if(judge_id===candidate_actor_id) return Object.freeze({decision:'FAIL',reason:'judge_not_independent',prod_authorized:false});
  const metricImproved=metric_direction==='higher'?evaluation.delta>0:evaluation.delta<0;
  if(real_outcome_delta!==null&&(!Number.isFinite(real_outcome_delta))) throw new Error('invalid real_outcome_delta');
  if(real_outcome_delta!==null&&metricImproved&&real_outcome_delta<0){
    return Object.freeze({decision:'FAIL',reason:'GOODHART_DETECTED',evaluator_improvement_candidate:true,prod_authorized:false});
  }
  if(evaluation.delta===0) return Object.freeze({decision:'MORE_EVIDENCE',reason:'no_measurable_delta',prod_authorized:false});
  return Object.freeze(metricImproved
    ?{decision:'PASS',reason:'predefined_metric_improved',prod_authorized:false}
    :{decision:'FAIL',reason:'candidate_degraded',prod_authorized:false});
}

export function validateEvaluatorChange({reduces_requirements=false,independent_gate=false,may_edit_judge=false,may_elevate_permissions=false,may_elevate_budget=false}={}){
  const reasons=[];
  if(reduces_requirements&&!independent_gate) reasons.push('cannot_weaken_evaluator_without_independent_gate');
  if(may_edit_judge) reasons.push('self_judge_edit_forbidden');
  if(may_elevate_permissions) reasons.push('permission_self_elevation_forbidden');
  if(may_elevate_budget) reasons.push('budget_self_elevation_forbidden');
  return Object.freeze({ok:reasons.length===0,reasons,prod_authorized:false});
}
