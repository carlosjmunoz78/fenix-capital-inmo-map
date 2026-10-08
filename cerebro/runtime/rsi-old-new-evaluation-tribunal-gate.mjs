import {stableIdempotencyKey} from './continuous-improvement-contract.mjs';
import {defineExperiment,registerReplay,recordArmResult,compareArms} from './experiment-pipeline.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {createPromotionPlan} from './promotion-pipeline.mjs';

const PREPROD='PREPROD';
const MIN_AUTONOMOUS_CONFIDENCE=0.60;
const HUMAN_CODES=new Set(['LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT']);

function nonEmpty(value,label){
  if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);
  return value.trim();
}
function frozenResult(input){return Object.freeze({...input,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function human(code,reasons,candidate=null){
  if(!HUMAN_CODES.has(code)) throw new Error('invalid human code');
  return frozenResult({ok:false,decision:'HUMAN_REQUIRED',human_required:code,reasons:[...reasons],candidate_id:candidate?.candidate_id??null,next_gate:'HUMAN_REQUIRED'});
}
function hold(reason,candidate=null,extra={}){
  return frozenResult({ok:false,decision:'HOLD',human_required:null,reasons:[reason],candidate_id:candidate?.candidate_id??null,next_gate:'B3_EVIDENCE_OR_CONTRACT_REQUIRED',...extra});
}
function validateCandidate(candidate){
  if(!candidate||typeof candidate!=='object') throw new Error('candidate required');
  for(const key of ['candidate_id','company_id','engine_id','environment','candidate_version','baseline_version','hypothesis','next_gate']) nonEmpty(candidate[key],`candidate.${key}`);
  if(candidate.environment!==PREPROD) throw new Error('candidate must use PREPROD');
  if(candidate.next_gate!=='OLD_VS_NEW_EXPERIMENT') throw new Error('candidate not ready for OLD vs NEW');
  if(candidate.baseline_version===candidate.candidate_version) throw new Error('OLD and NEW versions must differ');
  if(candidate.additional_cost_eur!==0) throw new Error('candidate incremental cost must be zero');
}
function securityBoundary(candidate){
  if(candidate.prod_authorized!==false||candidate.prod_write_authorized!==false||candidate.trading_access!==false){
    return human('SECURITY_INCIDENT',['candidate_authority_boundary_violation'],candidate);
  }
  const p=candidate.preservation_contract??{};
  if(p.policy_mutation_allowed===true||p.permission_elevation_allowed===true||p.budget_elevation_allowed===true){
    return human('POLICY_CONFLICT',['candidate_self_governance_mutation_forbidden'],candidate);
  }
  return null;
}
function metricDirection(candidate){
  const direction=String(candidate?.target_metric?.direction??'').toUpperCase();
  if(direction==='HIGHER') return 'higher';
  if(direction==='LOWER') return 'lower';
  return null;
}
function resolveBaseline(candidate,baseline_resolution){
  if(candidate.baseline_verification_required!==true) return {ok:true,version:candidate.baseline_version,evidence_ref:null};
  if(!baseline_resolution||baseline_resolution.verified!==true) return {ok:false,reason:'EXACT_OLD_CONTRACT_RESOLUTION_REQUIRED'};
  const version=nonEmpty(baseline_resolution.resolved_version,'baseline_resolution.resolved_version');
  const evidence_ref=nonEmpty(baseline_resolution.evidence_ref,'baseline_resolution.evidence_ref');
  if(version===candidate.candidate_version) throw new Error('resolved OLD version must differ from NEW');
  return {ok:true,version,evidence_ref};
}
function recoveryReady({backup_ref,rollback_ref,rebuild_ref}){
  return typeof backup_ref==='string'&&backup_ref.trim()&&typeof rollback_ref==='string'&&rollback_ref.trim()&&typeof rebuild_ref==='string'&&rebuild_ref.trim();
}
function validateFixture(fixture){
  if(!fixture||typeof fixture!=='object') throw new Error('fixture required');
  const fixture_ref=nonEmpty(fixture.fixture_ref,'fixture.fixture_ref');
  if(!Array.isArray(fixture.case_ids)||fixture.case_ids.length===0) throw new Error('fixture.case_ids required');
  const case_ids=[...new Set(fixture.case_ids.map((x)=>nonEmpty(String(x),'fixture.case_id')))].sort();
  const dataset_kind=String(fixture.dataset_kind??'SYNTHETIC').toUpperCase();
  if(!['HISTORICAL','SYNTHETIC','HOLDOUT'].includes(dataset_kind)) throw new Error('fixture.dataset_kind invalid');
  const fixture_id=stableIdempotencyKey({fixture_ref,case_ids,dataset_kind});
  return Object.freeze({fixture_ref,case_ids,dataset_kind,fixture_id});
}
function armToRecorded({raw,arm,version,experiment,replay,metric}){
  if(!raw||typeof raw!=='object') throw new Error(`${arm} arm result required`);
  if(raw.version!==version) throw new Error(`${arm} arm version mismatch`);
  if(raw.fixture_id!==replay.fixture_id) throw new Error(`${arm} arm fixture mismatch`);
  if(raw.prod_authorized===true||raw.prod_write_authorized===true||raw.trading_access===true) throw new Error(`${arm} arm authority boundary violation`);
  if(raw.additional_cost_eur!==0) throw new Error(`${arm} arm incremental cost must be zero`);
  if(!raw.metrics||typeof raw.metrics!=='object'||Array.isArray(raw.metrics)) throw new Error(`${arm} metrics required`);
  if(typeof raw.metrics[metric]!=='number'||!Number.isFinite(raw.metrics[metric])) throw new Error(`${arm} predefined metric required`);
  if(!Array.isArray(raw.evidence_refs)||raw.evidence_refs.length===0) throw new Error(`${arm} evidence required`);
  return recordArmResult({
    experiment_id:experiment.experiment_id,company_id:experiment.company_id,engine_id:experiment.engine_id,
    environment:experiment.environment,version:experiment.version,arm,metrics:raw.metrics,evidence_refs:raw.evidence_refs
  });
}
function promotionRule(metric_direction,post_metric_rule){
  if(!post_metric_rule||typeof post_metric_rule!=='object'||Array.isArray(post_metric_rule)) throw new Error('post_metric_rule required');
  const allowed=metric_direction==='higher'?'min':'max';
  const value=post_metric_rule[allowed];
  if(typeof value!=='number'||!Number.isFinite(value)) throw new Error(`post_metric_rule.${allowed} required`);
  return {[allowed]:value};
}

export async function runOldNewEvaluationTribunalGate({
  candidate,fixture,execute_arm,benchmark_contract,judge,baseline_resolution=null,
  backup_ref,rollback_ref,rebuild_ref,post_metric_rule=null,canary_percent=5,
  candidate_visible_holdout=false,real_outcome_delta=null
}={}){
  validateCandidate(candidate);
  const boundary=securityBoundary(candidate); if(boundary) return boundary;
  if(['HIGH','CRITICAL'].includes(candidate.risk_class)) return human('HIGH_RISK',['candidate_risk_requires_human'],candidate);
  if(typeof candidate.confidence==='number'&&candidate.confidence<MIN_AUTONOMOUS_CONFIDENCE) return human('LOW_CONFIDENCE',['candidate_confidence_below_autonomous_threshold'],candidate);
  const baseline=resolveBaseline(candidate,baseline_resolution);
  if(!baseline.ok) return hold(baseline.reason,candidate);
  if(!recoveryReady({backup_ref,rollback_ref,rebuild_ref})) return hold('BACKUP_ROLLBACK_REBUILD_REQUIRED',candidate);
  const direction=metricDirection(candidate);
  if(!direction) return hold('DOMAIN_COMPARATOR_REQUIRED_FOR_TARGET_OR_STABLE_METRIC',candidate);
  if(typeof execute_arm!=='function') throw new Error('execute_arm required');
  const preparedFixture=validateFixture(fixture);
  const metric=nonEmpty(candidate?.target_metric?.name,'candidate.target_metric.name');
  const experiment=defineExperiment({
    company_id:candidate.company_id,engine_id:candidate.engine_id,environment:PREPROD,version:candidate.candidate_version,
    hypothesis:candidate.hypothesis,baseline_version:baseline.version,candidate_version:candidate.candidate_version,
    metrics:[metric],controls:[`fixture:${preparedFixture.fixture_id}`],dataset_kind:preparedFixture.dataset_kind,allow_prod_writes:false
  });
  const replayBase=registerReplay({experiment,case_ids:preparedFixture.case_ids});
  const replay=Object.freeze({...replayBase,fixture_id:preparedFixture.fixture_id,fixture_ref:preparedFixture.fixture_ref});
  const armInput=Object.freeze({
    company_id:candidate.company_id,engine_id:candidate.engine_id,environment:PREPROD,
    experiment_id:experiment.experiment_id,replay_id:replay.replay_id,fixture_id:replay.fixture_id,
    fixture_ref:replay.fixture_ref,case_ids:[...replay.case_ids],metric,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
  const oldRaw=await execute_arm(Object.freeze({...armInput,arm:'OLD',version:baseline.version}));
  const newRaw=await execute_arm(Object.freeze({...armInput,arm:'NEW',version:candidate.candidate_version}));
  const old_result=armToRecorded({raw:oldRaw,arm:'OLD',version:baseline.version,experiment,replay,metric});
  const new_result=armToRecorded({raw:newRaw,arm:'NEW',version:candidate.candidate_version,experiment,replay,metric});
  const comparison=compareArms({old_result,new_result,metric,direction});

  if(!benchmark_contract||typeof benchmark_contract!=='object') throw new Error('benchmark_contract required');
  const benchmark=defineBenchmark({
    company_id:candidate.company_id,engine_id:candidate.engine_id,environment:PREPROD,version:candidate.candidate_version,
    benchmark_id:nonEmpty(benchmark_contract.benchmark_id,'benchmark_contract.benchmark_id'),
    benchmark_version:nonEmpty(benchmark_contract.benchmark_version,'benchmark_contract.benchmark_version'),metric,
    holdout_ref:nonEmpty(benchmark_contract.holdout_ref,'benchmark_contract.holdout_ref'),
    adversarial_refs:Array.isArray(benchmark_contract.adversarial_refs)?benchmark_contract.adversarial_refs:[]
  });
  const evaluation=evaluateOldNew({benchmark,old_result,new_result,candidate_visible_holdout});
  const judge_id=nonEmpty(judge?.judge_id,'judge.judge_id');
  const candidate_actor_id=nonEmpty(judge?.candidate_actor_id??candidate.candidate_id,'judge.candidate_actor_id');
  const tribunal=tribunalDecision({evaluation,judge_id,candidate_actor_id,real_outcome_delta,metric_direction:direction});

  const common={
    candidate_id:candidate.candidate_id,company_id:candidate.company_id,engine_id:candidate.engine_id,environment:PREPROD,
    baseline_version:baseline.version,candidate_version:candidate.candidate_version,experiment,replay,old_result,new_result,
    comparison,benchmark,evaluation,tribunal,backup_ref,rollback_ref,rebuild_ref,
    baseline_resolution_evidence_ref:baseline.evidence_ref,
    evidence_hash:stableIdempotencyKey({candidate_id:candidate.candidate_id,experiment_id:experiment.experiment_id,replay_id:replay.replay_id,evaluation_id:evaluation.evaluation_id,tribunal,backup_ref,rollback_ref,rebuild_ref})
  };
  if(tribunal.decision==='FAIL') return frozenResult({ok:false,decision:'REJECT',human_required:null,reasons:[tribunal.reason],next_gate:'RETURN_TO_LEARNING',...common});
  if(tribunal.decision==='MORE_EVIDENCE') return frozenResult({ok:false,decision:'HOLD',human_required:null,reasons:[tribunal.reason],next_gate:'MORE_EVIDENCE',...common});
  if(tribunal.decision!=='PASS') return hold('TRIBUNAL_NOT_GREEN',candidate,common);

  const rule=promotionRule(direction,post_metric_rule);
  const promotion_plan=createPromotionPlan({
    company_id:candidate.company_id,engine_id:candidate.engine_id,environment:PREPROD,version:candidate.candidate_version,
    baseline_version:baseline.version,candidate_version:candidate.candidate_version,judge_decision:'PASS',tribunal_decision:'GREEN',
    rollback_ref,rebuild_ref,post_metrics:{[metric]:rule},canary_percent
  });
  const gate_id=stableIdempotencyKey({candidate_id:candidate.candidate_id,evidence_hash:common.evidence_hash,promotion_id:promotion_plan.promotion_id});
  return frozenResult({ok:true,decision:'APPROVE_PREPROD_NEXT_STAGE',human_required:null,reasons:[],next_gate:'B4_PREPROD_SHADOW_CANARY',gate_id,promotion_plan,...common});
}

export const RSI_B3_OLD_NEW_TRIBUNAL_CONTRACT=Object.freeze({
  environment:PREPROD,
  input:'VERSIONED_IMPROVEMENT_CANDIDATE + exact fixture + arm executor + independent benchmark/judge + backup/rollback/rebuild',
  decisions:['REJECT','HOLD','APPROVE_PREPROD_NEXT_STAGE','HUMAN_REQUIRED'],
  reuses:['experiment-pipeline.mjs','evaluation-tribunal.mjs','promotion-pipeline.mjs'],
  requires_same_fixture:true,
  requires_independent_judge:true,
  requires_backup:true,
  requires_rollback:true,
  requires_rebuild:true,
  high_risk:'HUMAN_REQUIRED:HIGH_RISK',
  low_confidence:'HUMAN_REQUIRED:LOW_CONFIDENCE',
  target_or_stable_metric:'HOLD:DOMAIN_COMPARATOR_REQUIRED',
  additional_cost_target_eur:0,
  prod_authorized:false,
  prod_write_authorized:false,
  trading_access:false
});
