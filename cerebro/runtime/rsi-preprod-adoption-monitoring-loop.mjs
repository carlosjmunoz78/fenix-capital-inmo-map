import {stableIdempotencyKey} from './continuous-improvement-contract.mjs';
import {advancePromotion,postMonitor} from './promotion-pipeline.mjs';
import {buildUniversalLearningEventReport} from './universal-learning-ingress.mjs';
import {eventToCandidate} from './continuous-improvement-scheduler.mjs';

const PREPROD='PREPROD';

function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function safeRefs(values){return [...new Set((values??[]).map((v)=>req(String(v),'evidence_ref')))].sort();}
function frozen(value){return Object.freeze({...value,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function human(code,reasons,plan=null){return frozen({ok:false,decision:'HUMAN_REQUIRED',human_required:code,reasons:[...reasons],promotion_id:plan?.promotion_id??null,next_gate:'HUMAN_REQUIRED'});}
function hold(reason,plan,stage,evidence=[]){return frozen({ok:false,decision:'HOLD',human_required:null,reasons:[reason],promotion_id:plan?.promotion_id??null,state:stage,next_gate:stage==='PREPROD'?'SHADOW_EVIDENCE':'CANARY_EVIDENCE',evidence_refs:safeRefs(evidence)});}
function assertPlan(plan){
  if(!plan||typeof plan!=='object') throw new Error('promotion_plan required');
  for(const key of ['promotion_id','company_id','engine_id','environment','version','baseline_version','candidate_version','rollback_ref','rebuild_ref','state']) req(plan[key],`promotion_plan.${key}`);
  if(plan.environment!==PREPROD||plan.state!==PREPROD) throw new Error('B4 requires PREPROD promotion plan start');
  if(plan.baseline_version===plan.candidate_version) throw new Error('B4 requires distinct OLD and NEW versions');
  if(!plan.post_metrics||typeof plan.post_metrics!=='object'||Array.isArray(plan.post_metrics)||Object.keys(plan.post_metrics).length===0) throw new Error('promotion_plan.post_metrics required');
  if(plan.additional_cost_budget_eur!==0) throw new Error('B4 incremental cost budget must remain zero');
}
function authorityBoundary(plan){
  if(plan.prod_authorized===true||plan.prod_write_authorized===true) return human('SECURITY_INCIDENT',['promotion_plan_carries_prod_authority'],plan);
  if(plan.trading_access===true) return human('SECURITY_INCIDENT',['promotion_plan_carries_trading_authority'],plan);
  return null;
}
function evidencePass(input,label){
  if(!input||typeof input!=='object') throw new Error(`${label} evidence required`);
  if(input.prod_authorized===true||input.prod_write_authorized===true||input.trading_access===true) throw new Error(`${label} authority boundary violation`);
  if(input.additional_cost_eur!==0) throw new Error(`${label} incremental cost must be zero`);
  const refs=safeRefs(input.evidence_refs);
  if(refs.length===0) throw new Error(`${label} evidence_refs required`);
  return Object.freeze({pass:input.pass===true,evidence_refs:refs,reason:typeof input.reason==='string'?input.reason:null});
}
function feedbackSignal({plan,monitor,observed_metrics,observed_at,evidence_refs}){
  const rollback=monitor.decision==='ROLLBACK';
  const signal_type=rollback?'OBSERVABILITY_ALERT':'ENGINE_RESULT';
  const event_type=rollback?'REGRESSION':'EXPERIMENT_RESULT';
  const severity=rollback?'MEDIUM':'INFO';
  const risk_class=rollback?'MEDIUM':'LOW';
  const reason=rollback?'PREPROD canary monitoring detected a regression and executed the configured rollback.':'PREPROD canary monitoring remained within the predefined safety envelope; candidate stays NONPROD pending current domain promotion authority.';
  const signal_id=`rsi:b4:${stableIdempotencyKey({promotion_id:plan.promotion_id,monitor_decision:monitor.decision,observed_metrics,observed_at}).slice(0,32)}`;
  const signal={
    signal_id,signal_type,company_id:plan.company_id,engine_id:plan.engine_id,source_environment:'CANARY',version:plan.candidate_version,
    observed_at,severity,risk_class,confidence:rollback?0.9:0.85,reason,
    hypothesis:rollback
      ?`The ${plan.engine_id} candidate ${plan.candidate_version} should be revised before another controlled OLD-vs-NEW attempt because PREPROD canary monitoring breached a predefined guardrail.`
      :`The ${plan.engine_id} candidate ${plan.candidate_version} produced a safe PREPROD canary outcome that should be retained as evidence for future candidate selection without granting PROD authority.`,
    metric:{name:rollback?'canary_regression_rate':'safe_candidate_outcome',direction:rollback?'LOWER':'HIGHER',measurement:'PREPROD_SHADOW_CANARY_POST_MONITOR'},
    evidence_refs:safeRefs([...evidence_refs,`promotion:${plan.promotion_id}`,`rollback:${plan.rollback_ref}`,`rebuild:${plan.rebuild_ref}`]),
    payload:{promotion_id:plan.promotion_id,baseline_version:plan.baseline_version,candidate_version:plan.candidate_version,monitor_decision:monitor.decision,monitor_state:monitor.state,observed_metrics,breaches:monitor.breaches??[]},
    contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  const report=buildUniversalLearningEventReport(signal);
  const scheduled=eventToCandidate(event_type);
  return Object.freeze({signal_id,event_type,report,scheduled});
}

export function runPreprodAdoptionMonitoringLoop({
  promotion_plan,shadow_evidence,canary_evidence,observed_metrics,observed_at,evidence_refs=[]
}={}){
  assertPlan(promotion_plan);
  const boundary=authorityBoundary(promotion_plan); if(boundary) return boundary;
  const shadow=evidencePass(shadow_evidence,'shadow');
  if(!shadow.pass) return hold('SHADOW_EVIDENCE_NOT_GREEN',promotion_plan,'PREPROD',[...evidence_refs,...shadow.evidence_refs]);
  const shadowPlan=advancePromotion(promotion_plan,{shadow_pass:true});
  if(shadowPlan.state!=='SHADOW') throw new Error('promotion pipeline failed PREPROD to SHADOW transition');
  const canary=evidencePass(canary_evidence,'canary');
  if(!canary.pass) return hold('CANARY_EVIDENCE_NOT_GREEN',shadowPlan,'SHADOW',[...evidence_refs,...shadow.evidence_refs,...canary.evidence_refs]);
  const canaryPlan=advancePromotion(shadowPlan,{canary_pass:true});
  if(canaryPlan.state!=='CANARY') throw new Error('promotion pipeline failed SHADOW to CANARY transition');
  if(!observed_metrics||typeof observed_metrics!=='object'||Array.isArray(observed_metrics)) throw new Error('observed_metrics required');
  const when=req(observed_at,'observed_at');
  if(Number.isNaN(Date.parse(when))) throw new Error('observed_at invalid');
  const observedAt=new Date(when).toISOString();
  const monitor=postMonitor({plan:canaryPlan,observed_metrics});
  const allEvidence=safeRefs([...evidence_refs,...shadow.evidence_refs,...canary.evidence_refs]);
  const feedback=feedbackSignal({plan:canaryPlan,monitor,observed_metrics,observed_at:observedAt,evidence_refs:allEvidence});
  const loop_id=stableIdempotencyKey({promotion_id:canaryPlan.promotion_id,monitor,feedback_event_id:feedback.report.events[0].event_id});
  const rollback=monitor.decision==='ROLLBACK';
  return frozen({
    ok:true,loop_id,decision:rollback?'ROLLBACK_AND_RELEARN':'KEEP_NONPROD_AND_RELEARN',human_required:null,
    promotion_id:canaryPlan.promotion_id,state:monitor.state,next_gate:'B1_UNIVERSAL_LEARNING_INGRESS',
    shadow_plan:shadowPlan,canary_plan:canaryPlan,monitor,feedback_report:feedback.report,
    relearning_schedule:feedback.scheduled,evidence_refs:allEvidence,
    rollback_executed:rollback,rollback_ref:rollback?canaryPlan.rollback_ref:null,rebuild_ref:canaryPlan.rebuild_ref,
    current_domain_promotion_authority_required:true
  });
}

export const RSI_B4_PREPROD_ADOPTION_MONITORING_CONTRACT=Object.freeze({
  environment:PREPROD,
  flow:['PREPROD','SHADOW','CANARY','MONITOR','KEEP_OR_ROLLBACK','RELEARN'],
  reuses:['promotion-pipeline.mjs','universal-learning-ingress.mjs','continuous-improvement-scheduler.mjs'],
  keep_result:'KEEP_NONPROD_AND_RELEARN',
  regression_result:'ROLLBACK_AND_RELEARN',
  relearning_next_gate:'B1_UNIVERSAL_LEARNING_INGRESS',
  prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0
});
