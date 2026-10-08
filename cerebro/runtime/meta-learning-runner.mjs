import {createMetaCandidate,detectLearningBottleneck,metaGate} from './meta-learning.mjs';

const PREPROD='PREPROD';
const MIN_SAMPLES=3;

function metricMeans(summary){
  const out={};
  for(const stage of ['collect','learn','evaluate']){
    const value=summary?.stage_metrics?.[stage]?.mean_ms;
    if(Number.isFinite(value)&&value>=0)out[stage]=value;
  }
  return out;
}

export function buildMetaLearningReview({summary,company_id,version,reviewed_at}){
  if(!summary||summary.company_id!==company_id||summary.engine_id!=='LRN-001'||summary.environment!==PREPROD||summary.version!==version)throw new Error('META_REVIEW_CONTEXT_MISMATCH');
  if(summary.prod_authorized!==false||summary.trading_access!==false)throw new Error('META_REVIEW_AUTHORITY_EXPANDED');
  const metrics=metricMeans(summary);
  const bottleneck=detectLearningBottleneck(metrics);
  if((summary.samples_total??0)<MIN_SAMPLES||!bottleneck){
    return Object.freeze({schema_version:'1.0.0',company_id,engine_id:'METALEARN-001',environment:PREPROD,version,reviewed_at:new Date(reviewed_at).toISOString(),status:'MORE_EVIDENCE',minimum_samples:MIN_SAMPLES,samples_total:summary.samples_total??0,bottleneck:null,candidate:null,gate:{ok:false,reasons:['insufficient_stage_metrics'],next_gate:'HOLD',prod_authorized:false},additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
  }
  const target_stage=bottleneck.stage;
  const candidate=createMetaCandidate({
    company_id,engine_id:'METALEARN-001',environment:'PREPROD',version,
    target_stage,
    prior_strategy_version:`lrn-orchestration-${version}`,
    candidate_strategy_version:`lrn-orchestration-${version}-opt-${target_stage}`,
    dataset_scope:`LOCAL_PREPROD_STAGE_TIMINGS_LAST_${summary.samples_total}`,
    metric_definition:{name:'mean_stage_duration_ms',direction:'MINIMIZE',current_value_ms:bottleneck.cost_or_latency,p95_ms:summary.stage_metrics[target_stage]?.p95_ms??null},
    leakage_checks:{raw_customer_data:false,tenant_scope:company_id,holdout_required_before_claim:true},
    anti_gaming_checks:{quality_gates_must_not_degrade:true,cost_budget_eur:0,authority_must_not_expand:true},
    proposed_change:{type:'PROFILE_AND_OPTIMIZE_STAGE',target_stage,claim_status:'HYPOTHESIS_ONLY',requires_old_vs_new:true},
    reduces_requirements:false,may_edit_judge:false,may_elevate_permissions:false,may_elevate_budget:false
  });
  const gate=metaGate({candidate,independent_evaluation:false,independent_judge:false,rollback_ready:false,rebuild_ready:false});
  return Object.freeze({schema_version:'1.0.0',company_id,engine_id:'METALEARN-001',environment:PREPROD,version,reviewed_at:new Date(reviewed_at).toISOString(),status:'META_CANDIDATE_CREATED_HELD',minimum_samples:MIN_SAMPLES,samples_total:summary.samples_total,bottleneck,candidate,gate,automatic_promotion:false,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
}
