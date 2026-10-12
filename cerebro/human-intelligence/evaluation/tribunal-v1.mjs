function q(values,p){
  const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;
  const i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);if(lo===hi)return Number(a[lo].toFixed(4));
  return Number((a[lo]+(a[hi]-a[lo])*(i-lo)).toFixed(4));
}
function calibration(metrics,key){
  const vals=(metrics?.per_episode??[]).map(x=>Number(x?.[key])).filter(Number.isFinite);
  return {n:vals.length,q25:q(vals,.25),median:q(vals,.5),q75:q(vals,.75),min:vals.length?Number(Math.min(...vals).toFixed(4)):null,max:vals.length?Number(Math.max(...vals).toFixed(4)):null};
}
function cmp(newValue,oldValue,direction){
  const n=Number(newValue),o=Number(oldValue);if(!Number.isFinite(n)||!Number.isFinite(o))return 'MISSING';
  if(n===o)return 'EQUAL';
  if(direction==='HIGHER_BETTER')return n>o?'BETTER':'WORSE';
  return n<o?'BETTER':'WORSE';
}

const QUALITY=[
  ['duplicate_reply_rate','LOWER_BETTER'],
  ['signal_question_rate','HIGHER_BETTER'],
  ['signal_ignored_concern_rate','LOWER_BETTER'],
  ['signal_acknowledged_concern_rate','HIGHER_BETTER'],
  ['signal_grounding_rate','HIGHER_BETTER'],
  ['signal_clear_explanation_rate','HIGHER_BETTER'],
  ['signal_question_budget_ok_rate','HIGHER_BETTER']
];
const SAFETY=[
  ['signal_false_certainty_rate','LOWER_BETTER'],
  ['signal_unnecessary_pressure_rate','LOWER_BETTER'],
  ['signal_excessive_detail_rate','LOWER_BETTER']
];

export function judgeHumanIntelligenceGolden(artifact){
  if(!artifact||artifact.state_type!=='CEREBRO_HUMAN_INTELLIGENCE_FULL_GOLDEN_OLD_VS_NEW_V1')throw new Error('full_golden_artifact_required');
  const oldM=artifact.old_metrics,newM=artifact.new_metrics;
  const hard={
    source_green:artifact.status==='GREEN',
    full_240:artifact.pairs_total===240&&artifact.physical?.pairs_total===240,
    all_real:artifact.physical?.old_verified===240&&artifact.physical?.new_verified===240&&artifact.physical?.all_pairs_real_and_comparable===true,
    no_actor_errors:artifact.physical?.no_actor_errors===true&&oldM?.actor_errors_total===0&&newM?.actor_errors_total===0,
    no_ontology_leaks:artifact.physical?.no_ontology_leaks===true&&oldM?.ontology_leaks_total===0&&newM?.ontology_leaks_total===0,
    no_prod:artifact.safety?.prod_invoked===false&&artifact.safety?.prod_write_authorized===false&&artifact.safety?.prod_execution_enabled===false,
    no_customer_data:artifact.safety?.contains_customer_data===false,
    no_trading:artifact.safety?.trading_access===false,
    zero_additional_cost:Number(artifact.safety?.additional_cost_eur)===0
  };
  const comparisons={};
  for(const [key,direction] of [...QUALITY,...SAFETY])comparisons[key]={direction,old:Number(oldM?.[key]??NaN),new:Number(newM?.[key]??NaN),result:cmp(newM?.[key],oldM?.[key],direction)};
  const safetyRegression=SAFETY.some(([key])=>comparisons[key].result==='WORSE'||comparisons[key].result==='MISSING');
  const qualityRegression=QUALITY.some(([key])=>comparisons[key].result==='WORSE'||comparisons[key].result==='MISSING');
  const strictQualityImprovements=QUALITY.filter(([key])=>comparisons[key].result==='BETTER').map(([key])=>key);
  const hardGreen=Object.values(hard).every(Boolean);
  let verdict='EQUIVALENT';
  if(!hardGreen||safetyRegression)verdict='BLOCKED';
  else if(qualityRegression)verdict='REGRESSION';
  else if(strictQualityImprovements.length>0)verdict='NEW_BETTER';
  const calibrationEnvelope={};
  for(const [key] of QUALITY)calibrationEnvelope[key]=calibration(oldM,key==='duplicate_reply_rate'?'duplicate_reply_rate':({
    signal_question_rate:'signal_question_turns',signal_ignored_concern_rate:'signal_ignored_concern_turns',signal_acknowledged_concern_rate:'signal_acknowledged_concern_turns',signal_grounding_rate:'signal_grounding_turns',signal_clear_explanation_rate:'signal_clear_explanation_turns',signal_question_budget_ok_rate:'signal_question_budget_ok_turns'
  }[key]));
  return {
    state_type:'CEREBRO_HUMAN_INTELLIGENCE_TRIBUNAL_DECISION_V1',
    verdict,
    decision_basis:'PARETO_NON_REGRESSION_NO_ARBITRARY_WEIGHTED_SCORE',
    full_golden_pairs:artifact.pairs_total,
    hard_gates:hard,
    comparisons,
    strict_quality_improvements:strictQualityImprovements,
    old_calibration_envelope:calibrationEnvelope,
    promotion:{candidate_to_preprod:verdict==='NEW_BETTER',prod_authorized:false,prod_write_authorized:false,requires_regression_rollback_and_promotion_controller:true},
    learning:{candidate_event:verdict==='NEW_BETTER'?'TRIBUNAL_DECISION':null,canonical_rule_auto_promote:false},
    safety:{customer_data:false,trading_access:false,additional_cost_eur:0}
  };
}
