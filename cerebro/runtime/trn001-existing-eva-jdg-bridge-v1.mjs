import { Trn001TrainingLedgerV1 } from './foundation-holds-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';

const needed=(v,name)=>{if(typeof v!=='string'||!v.trim())throw Error('TRN001_TRIBUNAL_REQUIRED:'+name);return v.trim();};

export function evaluateTrn001WithExistingTribunalV1({
 ledger,company_id,engine_id,version='v1',dataset_id,dataset_version,
 champion_run_id,challenger_run_id,metric,judge_id,candidate_actor_id,
 holdout_ref,benchmark_id,benchmark_version='v1',candidate_visible_holdout=false,
 real_outcome_delta=null,metric_direction='higher',
}={}){
 if(!(ledger instanceof Trn001TrainingLedgerV1))throw Error('TRN001_LEDGER_REQUIRED');
 const company=needed(company_id,'company_id'),engine=needed(engine_id,'engine_id');
 if(/TRADING|LAB-TRD/i.test(engine))throw Error('TRN001_TRADING_DENIED');
 if(!['higher','lower'].includes(metric_direction))throw Error('TRN001_METRIC_DIRECTION');
 const comparison=ledger.compare({company_id:company,engine_id:engine,
  champion_run_id:needed(champion_run_id,'champion_run_id'),challenger_run_id:needed(challenger_run_id,'challenger_run_id'),
  metric:needed(metric,'metric'),higher_is_better:metric_direction==='higher'});
 const benchmark=defineBenchmark({company_id:company,engine_id:engine,environment:'PREPROD',version,
  benchmark_id:needed(benchmark_id,'benchmark_id'),benchmark_version,metric,
  holdout_ref:needed(holdout_ref,'holdout_ref'),adversarial_refs:['TRN001_NO_SELF_PROMOTION']});
 const experimental_id='trn-'+company+'-'+engine+'-'+needed(dataset_id,'dataset_id')+'-'+needed(dataset_version,'dataset_version');
 const common={company_id:company,engine_id:engine,environment:'PREPROD',version,experiment_id:experimental_id};
 const evaluation=evaluateOldNew({benchmark,candidate_visible_holdout,
  old_result:{...common,arm:'OLD',metrics:{[metric]:comparison.champion_value}},
  new_result:{...common,arm:'NEW',metrics:{[metric]:comparison.challenger_value}}});
 const tribunal=tribunalDecision({evaluation,judge_id:needed(judge_id,'judge_id'),
  candidate_actor_id:needed(candidate_actor_id,'candidate_actor_id'),real_outcome_delta,metric_direction});
 return Object.freeze({
  state_type:'CEREBRO_TRN001_EXISTING_EVA_JDG_GATE_V1',company_id:company,engine_id:engine,environment:'PREPROD',version,
  dataset_id,dataset_version,comparison,evaluation,tribunal,
  next_gate:tribunal.decision==='PASS'?'INDEPENDENT_PHYSICAL_EVIDENCE_REQUIRED':'TRAINING_REJECT_OR_REVIEW',
  tribunal_passes:tribunal.decision==='PASS',prod_authorized:false,prod_write_authorized:false,
  auto_promote:false,judge_identity_physically_verified:false,holdout_real_proven:false,
  trading_access:false,additional_cost_eur:0,
 });
}
export const TRN001_EXISTING_TRIBUNAL_BINDING_CONTRACT_V1=Object.freeze({
 reused_existing_evaluator:'evaluation-tribunal.mjs',judge_independence_check:true,
 holdout_leakage_denied:true,goodhart_detection:true,auto_promote:false,
 prod_authorized:false,trading_access:false,additional_cost_eur:0,
});
