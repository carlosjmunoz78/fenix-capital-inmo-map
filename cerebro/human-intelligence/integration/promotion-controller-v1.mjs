import { createPromotionPlan, advancePromotion, postMonitor } from '../../runtime/promotion-pipeline.mjs';

const OLD=Object.freeze({
  service:'cerebro-human-old-actor-preprod-v0',
  source_version:'prod-v33-frozen-old',
  source_sha256:'a32fc26e4b328d0477bc53f0ae9085c0d5d280703779db5ac8593fd9b718553a',
  source_ref:'supabase/functions/cerebro-human-old-actor-preprod-v0/index.ts'
});
const NEW_SERVICE='cerebro-human-new-actor-preprod-v1';
const NEW_SOURCE_REF='supabase/functions/cerebro-human-new-actor-preprod-v1/';

function candidateFromGolden(golden){
  const evidence=golden?.new_preflight?.actor_evidence;
  if(!evidence||evidence.source_service!==NEW_SERVICE)throw new Error('attested_new_actor_required');
  if(typeof evidence.source_version!=='string'||!/^human-intelligence-new-v1\.2@[a-f0-9]{40}$/i.test(evidence.source_version))throw new Error('attested_candidate_version_required');
  if(evidence.provenance_kind!=='GIT_COMMIT_BLOB'||!/^[a-f0-9]{40}$/i.test(String(evidence.source_commit_sha??''))||!/^[a-f0-9]{40}$/i.test(String(evidence.source_blob_sha??'')))throw new Error('attested_candidate_provenance_required');
  if(!evidence.source_version.endsWith(`@${evidence.source_commit_sha}`))throw new Error('candidate_commit_mismatch');
  return Object.freeze({service:NEW_SERVICE,source_version:evidence.source_version,provenance_kind:'GIT_COMMIT_BLOB',source_commit_sha:evidence.source_commit_sha,source_blob_sha:evidence.source_blob_sha,source_ref:NEW_SOURCE_REF});
}

export function buildHumanIntelligenceRollbackManifest({decision,golden}={}){
  if(decision?.verdict!=='NEW_BETTER'||decision?.hard_gates?.declared_episode_hard_gates!==true)throw new Error('new_better_with_hard_gates_required');
  if(golden?.status!=='GREEN'||golden?.pairs_total!==240||golden?.candidate_hard_gates?.summary?.all_green!==true)throw new Error('green_full_golden_required');
  const candidate=candidateFromGolden(golden);
  return Object.freeze({
    state_type:'CEREBRO_HUMAN_INTELLIGENCE_ROLLBACK_MANIFEST_V1',
    company_id:'fenix',engine_id:'SIM-001',environment:'PREPROD',version:'1.0.0',
    rollback_id:`hi:rollback:${OLD.source_sha256.slice(0,16)}`,
    baseline:OLD,candidate,
    trigger_policy:'ANY_CRITICAL_GATE_OR_CERTIFIED_METRIC_REGRESSION',
    rollback_action:'RESTORE_OLD_PREPROD_ACTOR_ROUTE',
    verification:['OLD_HEALTH_ATTESTED','OLD_MULTI_TURN_GREEN','NO_PROD_INVOCATION','NO_CUSTOMER_DATA','NO_TRADING'],
    rebuild:{old_source_ref:OLD.source_ref,new_source_ref:candidate.source_ref,deterministic_from_git:true},
    tested_contractually:true,physical_rollback_execution_required_before_prod:true,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

function deterministicPostMetrics(golden){
  const m=golden?.new_metrics??{};
  const number=(key)=>{const n=Number(m[key]);if(!Number.isFinite(n))throw new Error(`new_metric_required:${key}`);return n;};
  return {
    duplicate_reply_rate:{max:number('duplicate_reply_rate')},
    question_rate:{min:number('signal_question_rate')},
    ignored_concern_rate:{max:number('signal_ignored_concern_rate')},
    acknowledged_concern_rate:{min:number('signal_acknowledged_concern_rate')},
    grounding_rate:{min:number('signal_grounding_rate')},
    false_certainty_rate:{max:number('signal_false_certainty_rate')},
    unnecessary_pressure_rate:{max:number('signal_unnecessary_pressure_rate')},
    excessive_detail_rate:{max:number('signal_excessive_detail_rate')}
  };
}

export function buildHumanIntelligencePromotionPackage({decision,golden,learningReport}={}){
  const rollback=buildHumanIntelligenceRollbackManifest({decision,golden});
  if(learningReport?.state_type!=='CEREBRO_RSI_UNIVERSAL_LEARNING_EVENT_REPORT'||learningReport.events_total!==1)throw new Error('canonical_learning_report_required');
  const event=learningReport.events[0];
  if(event.source_type!=='TRIBUNAL_DECISION'||event.environment!=='PREPROD_CANDIDATE'||event.prod_authorized!==false)throw new Error('canonical_tribunal_learning_event_required');
  const post=deterministicPostMetrics(golden);
  const plan=createPromotionPlan({
    company_id:'fenix',engine_id:'SIM-001',environment:'PREPROD',version:'1.0.0',
    baseline_version:OLD.source_version,candidate_version:rollback.candidate.source_version,
    judge_decision:'PASS',tribunal_decision:'GREEN',
    rollback_ref:rollback.rollback_id,rebuild_ref:`git:${rollback.candidate.source_commit_sha}:${rollback.candidate.source_blob_sha}`,
    post_metrics:post,canary_percent:5
  });
  return Object.freeze({
    state_type:'CEREBRO_HUMAN_INTELLIGENCE_PROMOTION_PACKAGE_V1',status:'READY_PREPROD',
    learning_event_id:event.event_id,rollback,plan,
    authority:{candidate_package_ready:true,preprod_deploy_authorized:false,shadow_activation_authorized:false,canary_activation_authorized:false,prod_authorized:false,prod_write_authorized:false},
    next_gate:'PHYSICAL_PREPROD_ROLLBACK_REHEARSAL_AND_SHADOW',
    safety:{contains_customer_data:false,contains_secrets:false,trading_access:false,additional_cost_eur:0}
  });
}

export function simulateHumanIntelligenceNonProdPromotion({promotionPackage,shadowPass=false,canaryPass=false,observedMetrics=null}={}){
  if(promotionPackage?.state_type!=='CEREBRO_HUMAN_INTELLIGENCE_PROMOTION_PACKAGE_V1')throw new Error('promotion_package_required');
  let plan=promotionPackage.plan;
  plan=advancePromotion(plan,{shadow_pass:shadowPass});
  if(plan.state==='SHADOW')plan=advancePromotion(plan,{canary_pass:canaryPass});
  const monitor=observedMetrics&&plan.state==='CANARY'?postMonitor({plan,observed_metrics:observedMetrics}):null;
  return Object.freeze({plan,monitor,prod_authorized:false,prod_write_authorized:false});
}
