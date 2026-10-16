import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPostSignatureJourney,scoreCustomerExperience,buildCustomerJourneyBundle,CUSTOMER_JOURNEY_V1_CONTRACT} from '../customer/customer-journey-native-v1.mjs';

const base={company_id:'fenix',customer_ref:'customer:synthetic-001',operation_ref:'operation:synthetic-001',completed_successfully:true,satisfaction_score:9,days_since_last_update:1,sla_breaches:0,unresolved_issues:0,handoffs_without_resolution:0,response_confidence:.95,positive_feedback_signal:true};

test('customer journey contract preserves zero-cost PREPROD authority',()=>{
  assert.equal(CUSTOMER_JOURNEY_V1_CONTRACT.environment,'PREPROD');
  assert.equal(CUSTOMER_JOURNEY_V1_CONTRACT.ml_required,false);
  assert.equal(CUSTOMER_JOURNEY_V1_CONTRACT.external_dispatch_authorized,false);
  assert.equal(CUSTOMER_JOURNEY_V1_CONTRACT.crm_write_authorized,false);
  assert.equal(CUSTOMER_JOURNEY_V1_CONTRACT.prod_authorized,false);
  assert.equal(CUSTOMER_JOURNEY_V1_CONTRACT.additional_cost_target_eur,0);
});

test('POST turns confirmed closing into full post-sale engine chain without execution',()=>{
  const p=buildPostSignatureJourney({context:{company_id:'fenix',engine_id:'POST-001',environment:'PREPROD',version:'1'},customer_ref:base.customer_ref,operation_ref:base.operation_ref,completed_successfully:true,closing_confirmed:true});
  assert.equal(p.status,'JOURNEY_READY');
  assert.deepEqual(p.stages.map(x=>x.target_engine),['POST-001','CX-001','RET-001','REP-001','REF-001','SALE-001']);
  assert.equal(p.stages.every(x=>x.execute_external===false),true);
  assert.equal(p.source_of_truth_replaced,false);
  assert.equal(p.prod_authorized,false);
});

test('CX scores friction deterministically and routes retention when needed',()=>{
  const low=scoreCustomerExperience({context:{company_id:'fenix',engine_id:'CX-001',environment:'PREPROD',version:'1'},customer_ref:base.customer_ref,days_since_last_update:1,sla_breaches:0,unresolved_issues:0,handoffs_without_resolution:0,satisfaction_score:9,response_confidence:.95,positive_feedback_signal:true});
  assert.equal(low.friction_band,'LOW');assert.equal(low.human_required,null);assert.equal(low.additional_cost_eur,0);
  const high=scoreCustomerExperience({context:{company_id:'fenix',engine_id:'CX-001',environment:'PREPROD',version:'1'},customer_ref:base.customer_ref,days_since_last_update:5,sla_breaches:2,unresolved_issues:1,handoffs_without_resolution:1,satisfaction_score:3,response_confidence:.9,negative_feedback_signal:true});
  assert.ok(['HIGH','CRITICAL'].includes(high.friction_band));assert.equal(high.retention_handoff_required,true);assert.equal(high.proactive_update_required,true);
});

test('full customer journey connects POST CX RET REF REP COM and SALE contracts',()=>{
  const b=buildCustomerJourneyBundle(base);
  assert.equal(b.post.status,'JOURNEY_READY');
  assert.equal(b.cx.status,'SCORED');
  assert.equal(b.retention.status,'RETENTION_RISK_SCORED');
  assert.equal(b.review.status,'REVIEW_REQUEST_PLAN_READY');
  assert.equal(b.referral.status,'BEST_REFERRAL_MOMENT_READY');
  assert.equal(b.upsell.status,'UPSELL_CROSS_SELL_PLAN_READY');
  assert.equal(b.connections.POST_to_CX,true);assert.equal(b.connections.POST_to_RET,true);assert.equal(b.connections.POST_to_REP,true);assert.equal(b.connections.POST_to_REF,true);assert.equal(b.connections.POST_to_SALE,true);
  assert.equal(b.connections.REP_to_COM,true);assert.equal(b.connections.REF_to_COM,true);assert.equal(b.connections.RET_to_SALE,true);
  assert.equal(b.review.communication_intent.dispatch_authorized,false);assert.equal(b.referral.communication_intent.dispatch_authorized,false);assert.equal(b.crm_write_authorized,false);assert.equal(b.external_side_effect_executed,false);
});

test('CX low confidence and POST human request use canonical exceptions',()=>{
  const cx=scoreCustomerExperience({context:{company_id:'fenix',engine_id:'CX-001',environment:'PREPROD',version:'1'},customer_ref:base.customer_ref,days_since_last_update:1,sla_breaches:0,unresolved_issues:0,handoffs_without_resolution:0,satisfaction_score:8,response_confidence:.4});
  assert.equal(cx.status,'HUMAN_REQUIRED');assert.equal(cx.human_required,'LOW_CONFIDENCE');
  const post=buildPostSignatureJourney({context:{company_id:'fenix',engine_id:'POST-001',environment:'PREPROD',version:'1'},customer_ref:base.customer_ref,operation_ref:base.operation_ref,completed_successfully:true,closing_confirmed:true,customer_human_request:true});
  assert.equal(post.status,'HUMAN_REQUIRED');assert.equal(post.human_required,'CUSTOMER_HUMAN_REQUEST');
});

test('raw PII fails closed',()=>{
  assert.throws(()=>buildCustomerJourneyBundle({...base,email:'x@y.es'}),/raw PII/);
});
