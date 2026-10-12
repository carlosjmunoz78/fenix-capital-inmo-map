import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHumanIntelligenceLearningReport } from '../human-intelligence/integration/learning-bridge-v1.mjs';
import { buildHumanIntelligenceRollbackManifest, buildHumanIntelligencePromotionPackage, simulateHumanIntelligenceNonProdPromotion } from '../human-intelligence/integration/promotion-controller-v1.mjs';

const decision={
  state_type:'CEREBRO_HUMAN_INTELLIGENCE_TRIBUNAL_DECISION_V1',verdict:'NEW_BETTER',strict_quality_improvements:['duplicate_reply_rate','signal_question_rate'],
  promotion:{candidate_to_preprod:true,prod_authorized:false,prod_write_authorized:false}
};
const newMetrics={duplicate_reply_rate:0,signal_question_rate:1,signal_ignored_concern_rate:0,signal_acknowledged_concern_rate:.86,signal_grounding_rate:.68,signal_false_certainty_rate:0,signal_unnecessary_pressure_rate:0,signal_excessive_detail_rate:0};
const oldMetrics={duplicate_reply_rate:.82,signal_question_rate:0,signal_ignored_concern_rate:.54,signal_acknowledged_concern_rate:0,signal_grounding_rate:0};
const golden={
  state_type:'CEREBRO_HUMAN_INTELLIGENCE_FULL_GOLDEN_OLD_VS_NEW_V1',status:'GREEN',generated_at:'2026-10-12T11:07:00.000Z',pairs_total:240,
  old_metrics:oldMetrics,new_metrics:newMetrics,
  safety:{contains_customer_data:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0}
};

test('tribunal result enters existing universal LRN-001 ingress as bounded TRIBUNAL_DECISION',()=>{
  const report=buildHumanIntelligenceLearningReport({decision,golden,version:'1.0.0'});
  assert.equal(report.state_type,'CEREBRO_RSI_UNIVERSAL_LEARNING_EVENT_REPORT');
  assert.equal(report.events_total,1);
  const event=report.events[0];
  assert.equal(event.source_type,'TRIBUNAL_DECISION');
  assert.equal(event.company_id,'fenix');
  assert.equal(event.engine_id,'SIM-001');
  assert.equal(event.environment,'PREPROD_CANDIDATE');
  assert.equal(event.prod_authorized,false);
  assert.equal(event.prod_write_authorized,false);
  assert.equal(event.trading_access,false);
  assert.equal(event.additional_cost_eur,0);
});

test('learning bridge is deterministic/idempotent for identical evidence',()=>{
  const a=buildHumanIntelligenceLearningReport({decision,golden,version:'1.0.0'});
  const b=buildHumanIntelligenceLearningReport({decision:structuredClone(decision),golden:structuredClone(golden),version:'1.0.0'});
  assert.equal(a.events[0].event_id,b.events[0].event_id);
});

test('rollback manifest preserves physical OLD and never grants PROD',()=>{
  const rb=buildHumanIntelligenceRollbackManifest({decision,golden});
  assert.equal(rb.environment,'PREPROD');
  assert.equal(rb.baseline.service,'cerebro-human-old-actor-preprod-v0');
  assert.equal(rb.rollback_action,'RESTORE_OLD_PREPROD_ACTOR_ROUTE');
  assert.equal(rb.physical_rollback_execution_required_before_prod,true);
  assert.equal(rb.prod_authorized,false);
  assert.equal(rb.prod_write_authorized,false);
});

test('promotion package reuses canonical promotion pipeline and stops before activation',()=>{
  const learningReport=buildHumanIntelligenceLearningReport({decision,golden});
  const pkg=buildHumanIntelligencePromotionPackage({decision,golden,learningReport});
  assert.equal(pkg.status,'READY_PREPROD');
  assert.equal(pkg.plan.state,'PREPROD');
  assert.equal(pkg.authority.preprod_deploy_authorized,false);
  assert.equal(pkg.authority.prod_authorized,false);
  assert.equal(pkg.next_gate,'PHYSICAL_PREPROD_ROLLBACK_REHEARSAL_AND_SHADOW');
});

test('canonical non-PROD pipeline reaches CANARY but cannot cross current authority',()=>{
  const learningReport=buildHumanIntelligenceLearningReport({decision,golden});
  const pkg=buildHumanIntelligencePromotionPackage({decision,golden,learningReport});
  const out=simulateHumanIntelligenceNonProdPromotion({promotionPackage:pkg,shadowPass:true,canaryPass:true});
  assert.equal(out.plan.state,'CANARY');
  assert.equal(out.plan.next_gate,'CURRENT_PROMOTION_AUTHORITY_REQUIRED');
  assert.equal(out.prod_authorized,false);
});

test('post-monitoring produces rollback on any certified metric breach',()=>{
  const learningReport=buildHumanIntelligenceLearningReport({decision,golden});
  const pkg=buildHumanIntelligencePromotionPackage({decision,golden,learningReport});
  const observed={duplicate_reply_rate:.1,question_rate:1,ignored_concern_rate:0,acknowledged_concern_rate:.86,grounding_rate:.68,false_certainty_rate:0,unnecessary_pressure_rate:0,excessive_detail_rate:0};
  const out=simulateHumanIntelligenceNonProdPromotion({promotionPackage:pkg,shadowPass:true,canaryPass:true,observedMetrics:observed});
  assert.equal(out.monitor.decision,'ROLLBACK');
  assert.equal(out.monitor.rollback_ref,pkg.rollback.rollback_id);
  assert.equal(out.monitor.prod_write_authorized,false);
});

test('bridge fails closed on unsafe or non-winning evidence',()=>{
  assert.throws(()=>buildHumanIntelligenceLearningReport({decision:{...decision,verdict:'REGRESSION'},golden}),/new_better_required/);
  assert.throws(()=>buildHumanIntelligenceLearningReport({decision,golden:{...golden,safety:{...golden.safety,contains_customer_data:true}}}),/unsafe_golden_evidence/);
});
