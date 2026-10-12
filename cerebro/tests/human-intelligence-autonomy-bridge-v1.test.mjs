import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHumanIntelligenceLearningReport, buildHumanIntelligenceLearningSignal } from '../human-intelligence/integration/learning-bridge-v1.mjs';
import { buildHumanIntelligenceRollbackManifest, buildHumanIntelligencePromotionPackage, simulateHumanIntelligenceNonProdPromotion } from '../human-intelligence/integration/promotion-controller-v1.mjs';

const candidateEvidence={
  real_cerebro_actor:true,environment:'PREPROD',project_ref:'hnqlnvakzaywtafeiybt',prod_write_authorized:false,prod_execution_enabled:false,customer_data:false,trading_access:false,additional_cost_eur:0,
  source_service:'cerebro-human-new-actor-preprod-v1',source_version:'human-intelligence-new-v1.2@9c137a419ebf2eb983c1e22e8912f69580c2d164',provenance_kind:'GIT_COMMIT_BLOB',source_commit_sha:'9c137a419ebf2eb983c1e22e8912f69580c2d164',source_blob_sha:'c6a6197b18e50a228014d984cc92b5c59254dab5',source_mode:'HUMAN_INTELLIGENCE_NEW_V1_PREPROD',source_scope:'SAFE_CONVERSATIONAL_CORE',auth_mode:'GITHUB_OIDC'
};
const decision={
  state_type:'CEREBRO_HUMAN_INTELLIGENCE_TRIBUNAL_DECISION_V1',verdict:'NEW_BETTER',strict_quality_improvements:['duplicate_reply_rate','signal_question_rate'],
  hard_gates:{declared_episode_hard_gates:true},
  promotion:{candidate_to_preprod:true,prod_authorized:false,prod_write_authorized:false}
};
const newMetrics={duplicate_reply_rate:0,signal_question_rate:1,signal_ignored_concern_rate:0,signal_acknowledged_concern_rate:.86,signal_grounding_rate:.68,signal_false_certainty_rate:0,signal_unnecessary_pressure_rate:0,signal_excessive_detail_rate:0};
const oldMetrics={duplicate_reply_rate:.82,signal_question_rate:0,signal_ignored_concern_rate:.54,signal_acknowledged_concern_rate:0,signal_grounding_rate:0};
const golden={
  state_type:'CEREBRO_HUMAN_INTELLIGENCE_FULL_GOLDEN_OLD_VS_NEW_V1',status:'GREEN',generated_at:'2026-10-12T11:07:00.000Z',pairs_total:240,
  old_metrics:oldMetrics,new_metrics:newMetrics,new_preflight:{actor_evidence:candidateEvidence},
  candidate_hard_gates:{summary:{episodes_total:240,episodes_green:240,episodes_failed:0,all_green:true}},
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

test('learning bridge distinguishes materially different evidence even with same timestamp',()=>{
  const changed=structuredClone(golden);
  changed.new_metrics={...changed.new_metrics,signal_grounding_rate:.69};
  const a=buildHumanIntelligenceLearningReport({decision,golden,version:'1.0.0'});
  const b=buildHumanIntelligenceLearningReport({decision,golden:changed,version:'1.0.0'});
  assert.notEqual(a.events[0].event_id,b.events[0].event_id);
});

test('learning signal hashes broad improvement evidence within universal ingress length limit',()=>{
  const broad={...decision,strict_quality_improvements:['duplicate_reply_rate','signal_question_rate','signal_ignored_concern_rate','signal_acknowledged_concern_rate','signal_grounding_rate','signal_clear_explanation_rate','signal_question_budget_ok_rate']};
  const signal=buildHumanIntelligenceLearningSignal({decision:broad,golden,version:'1.0.0'});
  assert.ok(signal.signal_id.length<240);
  assert.match(signal.payload.evidence_sha256,/^[a-f0-9]{64}$/);
  assert.equal(typeof signal.payload.evidence_identity,'string');
});

test('rollback manifest binds physical candidate to attested V1.2 lineage and never grants PROD',()=>{
  const rb=buildHumanIntelligenceRollbackManifest({decision,golden});
  assert.equal(rb.environment,'PREPROD');
  assert.equal(rb.engine_id,'SIM-001');
  assert.equal(rb.baseline.service,'cerebro-human-old-actor-preprod-v0');
  assert.equal(rb.candidate.source_version,candidateEvidence.source_version);
  assert.equal(rb.candidate.source_blob_sha,candidateEvidence.source_blob_sha);
  assert.equal(rb.rollback_action,'RESTORE_OLD_PREPROD_ACTOR_ROUTE');
  assert.equal(rb.physical_rollback_execution_required_before_prod,true);
  assert.equal(rb.prod_authorized,false);
  assert.equal(rb.prod_write_authorized,false);
});

test('promotion package separates SIM evidence source from CHAT live target and stops before activation',()=>{
  const learningReport=buildHumanIntelligenceLearningReport({decision,golden});
  const pkg=buildHumanIntelligencePromotionPackage({decision,golden,learningReport});
  assert.equal(pkg.status,'READY_PREPROD');
  assert.equal(pkg.evidence_source.engine_id,'SIM-001');
  assert.equal(pkg.promotion_target.engine_id,'CHAT-001');
  assert.equal(pkg.promotion_target.authority_gateway,'cerebro-console-gateway-v0');
  assert.equal(pkg.promotion_target.candidate_overlay,'cerebro-console-gateway-human-v1-canary');
  assert.equal(pkg.plan.engine_id,'CHAT-001');
  assert.equal(pkg.plan.state,'PREPROD');
  assert.equal(pkg.plan.candidate_version,candidateEvidence.source_version);
  assert.equal(pkg.authority.preprod_deploy_authorized,false);
  assert.equal(pkg.authority.prod_authorized,false);
  assert.equal(pkg.next_gate,'PHYSICAL_PREPROD_ROLLBACK_REHEARSAL_AND_SHADOW');
});

test('canonical non-PROD pipeline reaches CANARY but cannot cross current authority',()=>{
  const learningReport=buildHumanIntelligenceLearningReport({decision,golden});
  const pkg=buildHumanIntelligencePromotionPackage({decision,golden,learningReport});
  const out=simulateHumanIntelligenceNonProdPromotion({promotionPackage:pkg,shadowPass:true,canaryPass:true});
  assert.equal(out.plan.engine_id,'CHAT-001');
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

test('bridge fails closed on unsafe non-winning or missing hard-gate evidence',()=>{
  assert.throws(()=>buildHumanIntelligenceLearningReport({decision:{...decision,verdict:'REGRESSION'},golden}),/new_better_required/);
  assert.throws(()=>buildHumanIntelligenceLearningReport({decision:{...decision,hard_gates:{declared_episode_hard_gates:false}},golden}),/declared_episode_hard_gates_required/);
  assert.throws(()=>buildHumanIntelligenceLearningReport({decision,golden:{...golden,safety:{...golden.safety,contains_customer_data:true}}}),/unsafe_golden_evidence/);
});
