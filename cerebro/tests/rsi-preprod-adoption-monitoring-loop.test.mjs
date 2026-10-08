import test from 'node:test';
import assert from 'node:assert/strict';
import {createPromotionPlan} from '../runtime/promotion-pipeline.mjs';
import {runPreprodAdoptionMonitoringLoop,RSI_B4_PREPROD_ADOPTION_MONITORING_CONTRACT} from '../runtime/rsi-preprod-adoption-monitoring-loop.mjs';

function plan(overrides={}){
  return {...createPromotionPlan({
    company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'new-v2',baseline_version:'old-v1',candidate_version:'new-v2',
    judge_decision:'PASS',tribunal_decision:'GREEN',rollback_ref:'rollback:b4:1',rebuild_ref:'rebuild:b4:1',post_metrics:{score:{min:80}},canary_percent:5
  }),...overrides};
}
function evidence(prefix,pass=true){return {pass,evidence_refs:[`evidence:${prefix}:1`,`evidence:${prefix}:2`],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};}
function args(overrides={}){
  return {promotion_plan:plan(),shadow_evidence:evidence('shadow'),canary_evidence:evidence('canary'),observed_metrics:{score:90},observed_at:'2026-10-09T00:00:00Z',evidence_refs:['evidence:b3:tribunal'],...overrides};
}

test('B4 keeps a safe candidate NONPROD and emits a universal relearning event',()=>{
  const result=runPreprodAdoptionMonitoringLoop(args());
  assert.equal(result.ok,true);
  assert.equal(result.decision,'KEEP_NONPROD_AND_RELEARN');
  assert.equal(result.shadow_plan.state,'SHADOW');
  assert.equal(result.canary_plan.state,'CANARY');
  assert.equal(result.monitor.decision,'KEEP_NONPROD');
  assert.equal(result.monitor.state,'MONITORED');
  assert.equal(result.next_gate,'B1_UNIVERSAL_LEARNING_INGRESS');
  assert.equal(result.feedback_report.events_total,1);
  const event=result.feedback_report.events[0];
  assert.equal(event.source_type,'ENGINE_RESULT');
  assert.equal(event.source_environment,'CANARY');
  assert.equal(event.environment,'PREPROD_CANDIDATE');
  assert.equal(event.prod_authorized,false);
  assert.equal(event.prod_write_authorized,false);
  assert.equal(event.trading_access,false);
  assert.equal(event.additional_cost_eur,0);
  assert.equal(result.relearning_schedule.candidate_type,'LEARNING_CANDIDATE');
  assert.equal(result.current_domain_promotion_authority_required,true);
});

test('B4 rolls back a monitored regression and feeds the evidence back to learning',()=>{
  const result=runPreprodAdoptionMonitoringLoop(args({observed_metrics:{score:70}}));
  assert.equal(result.ok,true);
  assert.equal(result.decision,'ROLLBACK_AND_RELEARN');
  assert.equal(result.monitor.decision,'ROLLBACK');
  assert.equal(result.monitor.state,'ROLLED_BACK');
  assert.equal(result.rollback_executed,true);
  assert.equal(result.rollback_ref,'rollback:b4:1');
  assert.equal(result.next_gate,'B1_UNIVERSAL_LEARNING_INGRESS');
  const event=result.feedback_report.events[0];
  assert.equal(event.source_type,'OBSERVABILITY_ALERT');
  assert.equal(event.source_environment,'CANARY');
  assert.equal(event.risk_class,'MEDIUM');
  assert.equal(event.payload.monitor_decision,'ROLLBACK');
  assert.equal(event.payload.breaches[0].reason,'below_min');
  assert.equal(result.relearning_schedule.candidate_type,'IMPROVEMENT_CANDIDATE');
  assert.equal(result.relearning_schedule.priority,'HIGH');
});

test('B4 holds before SHADOW when shadow evidence is not green',()=>{
  const result=runPreprodAdoptionMonitoringLoop(args({shadow_evidence:evidence('shadow-red',false)}));
  assert.equal(result.ok,false);
  assert.equal(result.decision,'HOLD');
  assert.equal(result.state,'PREPROD');
  assert.equal(result.next_gate,'SHADOW_EVIDENCE');
  assert.equal(result.feedback_report,undefined);
});

test('B4 holds in SHADOW when canary evidence is not green',()=>{
  const result=runPreprodAdoptionMonitoringLoop(args({canary_evidence:evidence('canary-red',false)}));
  assert.equal(result.ok,false);
  assert.equal(result.decision,'HOLD');
  assert.equal(result.state,'SHADOW');
  assert.equal(result.next_gate,'CANARY_EVIDENCE');
  assert.equal(result.feedback_report,undefined);
});

test('B4 maps a promotion authority boundary violation to SECURITY_INCIDENT',()=>{
  const result=runPreprodAdoptionMonitoringLoop(args({promotion_plan:plan({prod_write_authorized:true})}));
  assert.equal(result.decision,'HUMAN_REQUIRED');
  assert.equal(result.human_required,'SECURITY_INCIDENT');
});

test('B4 rejects shadow or canary evidence that tries to carry authority or cost',()=>{
  assert.throws(()=>runPreprodAdoptionMonitoringLoop(args({shadow_evidence:{...evidence('shadow'),prod_authorized:true}})),/shadow authority boundary violation/);
  assert.throws(()=>runPreprodAdoptionMonitoringLoop(args({canary_evidence:{...evidence('canary'),additional_cost_eur:1}})),/canary incremental cost must be zero/);
});

test('B4 is reproducible and idempotent for the same promotion evidence and observation',()=>{
  const a=runPreprodAdoptionMonitoringLoop(args());
  const b=runPreprodAdoptionMonitoringLoop(args());
  assert.equal(a.loop_id,b.loop_id);
  assert.equal(a.feedback_report.events[0].event_id,b.feedback_report.events[0].event_id);
  assert.deepEqual(a.evidence_refs,b.evidence_refs);
});

test('B4 never grants PROD or Trading authority even after safe monitoring',()=>{
  const result=runPreprodAdoptionMonitoringLoop(args());
  assert.equal(result.prod_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);
  assert.equal(result.canary_plan.prod_authorized,false);
  assert.equal(result.canary_plan.prod_write_authorized,false);
  assert.equal(result.feedback_report.prod_authorized,false);
  assert.equal(result.feedback_report.trading_access,false);
});

test('B4 contract closes the logical loop back to B1 without bypassing current domain authority',()=>{
  assert.deepEqual(RSI_B4_PREPROD_ADOPTION_MONITORING_CONTRACT.flow,['PREPROD','SHADOW','CANARY','MONITOR','KEEP_OR_ROLLBACK','RELEARN']);
  assert.equal(RSI_B4_PREPROD_ADOPTION_MONITORING_CONTRACT.relearning_next_gate,'B1_UNIVERSAL_LEARNING_INGRESS');
  assert.equal(RSI_B4_PREPROD_ADOPTION_MONITORING_CONTRACT.prod_authorized,false);
  assert.equal(RSI_B4_PREPROD_ADOPTION_MONITORING_CONTRACT.prod_write_authorized,false);
  assert.equal(RSI_B4_PREPROD_ADOPTION_MONITORING_CONTRACT.trading_access,false);
  assert.equal(RSI_B4_PREPROD_ADOPTION_MONITORING_CONTRACT.additional_cost_target_eur,0);
  assert.deepEqual(RSI_B4_PREPROD_ADOPTION_MONITORING_CONTRACT.reuses,['promotion-pipeline.mjs','universal-learning-ingress.mjs','continuous-improvement-scheduler.mjs']);
});
