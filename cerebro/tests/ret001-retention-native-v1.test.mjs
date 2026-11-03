import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRetentionRisk,compareRetentionAssessment,RET001_RETENTION_V1_CONTRACT} from '../customer/ret001-retention-native-v1.mjs';

const ctx=(company_id='fenix')=>({company_id,engine_id:'RET-001',environment:'PREPROD',version:'1.0.0'});
const base=(overrides={})=>({context:ctx(),signals:{customer_ref:'lead:ret:001',no_response_days:8,engagement_drop:.7,friction_score:.4,satisfaction_risk:.4,explicit_abandonment:false,complaint_open:false,legal_risk:false,high_risk:false,customer_human_request:false,confidence:.9,...overrides}});

test('RET-001 deterministic risk score and contextual rescue plan',()=>{
  const a=assessRetentionRisk(base()),b=assessRetentionRisk(base());
  assert.equal(a.assessment_id,b.assessment_id);
  assert.equal(a.risk_score,b.risk_score);
  assert.equal(compareRetentionAssessment(a,b).replay_green,true);
  assert.ok(['LOW','MEDIUM','HIGH','CRITICAL'].includes(a.risk_band));
  assert.ok(a.rescue_plan.playbook.includes('PREPARE_CONTEXTUAL_REENGAGEMENT'));
  assert.equal(a.action_mode,'PLAN_ONLY');
});

test('RET-001 fail-closed boundaries deny external dispatch, CRM/DB write and PROD',()=>{
  const r=assessRetentionRisk(base());
  assert.equal(r.read_only,true);
  assert.equal(r.source_of_truth_replaced,false);
  assert.equal(r.rescue_plan.dispatch_authorized,false);
  assert.equal(r.crm_write_authorized,false);
  assert.equal(r.db_mutation_authorized,false);
  assert.equal(r.external_dispatch_authorized,false);
  assert.equal(r.external_side_effect_executed,false);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.prod_write_authorized,false);
  assert.equal(r.trading_access,false);
  assert.equal(r.additional_cost_eur,0);
  assert.equal(r.ml_used,false);
  assert.equal(r.ai_required,false);
});

test('RET-001 LOW_CONFIDENCE escalates without dispatch',()=>{
  const r=assessRetentionRisk(base({confidence:.4}));
  assert.equal(r.human_required,'LOW_CONFIDENCE');
  assert.equal(r.action_mode,'HUMAN_REVIEW');
  assert.equal(r.rescue_plan.dispatch_authorized,false);
});

test('RET-001 legal risk escalates LEGAL_REQUIRED',()=>{
  const r=assessRetentionRisk(base({legal_risk:true}));
  assert.equal(r.human_required,'LEGAL_REQUIRED');
  assert.equal(r.action_mode,'HUMAN_REVIEW');
});

test('RET-001 high risk escalates HIGH_RISK',()=>{
  const r=assessRetentionRisk(base({high_risk:true}));
  assert.equal(r.human_required,'HIGH_RISK');
});

test('RET-001 customer human request escalates CUSTOMER_HUMAN_REQUEST',()=>{
  const r=assessRetentionRisk(base({customer_human_request:true}));
  assert.equal(r.human_required,'CUSTOMER_HUMAN_REQUEST');
});

test('RET-001 cross-company context changes deterministic identity and never leaks',()=>{
  const a=assessRetentionRisk(base());
  const b=assessRetentionRisk({...base(),context:ctx('other-company')});
  assert.notEqual(a.assessment_id,b.assessment_id);
  assert.equal(a.context.company_id,'fenix');
  assert.equal(b.context.company_id,'other-company');
});

test('RET-001 rejects wrong environment and wrong owner',()=>{
  assert.throws(()=>assessRetentionRisk({...base(),context:{...ctx(),environment:'PROD'}}),/PREPROD_ONLY/);
  assert.throws(()=>assessRetentionRisk({...base(),context:{...ctx(),engine_id:'C360-001'}}),/OWNER_MISMATCH/);
});

test('RET-001 rejects raw PII and secrets',()=>{
  assert.throws(()=>assessRetentionRisk({...base(),signals:{...base().signals,email:'x@example.com'}}),/raw PII/);
  assert.throws(()=>assessRetentionRisk({...base(),signals:{...base().signals,token:'secret'}}),/raw PII/);
});

test('RET-001 validates ranges',()=>{
  assert.throws(()=>assessRetentionRisk(base({confidence:1.1})),/confidence invalid/);
  assert.throws(()=>assessRetentionRisk(base({no_response_days:-1})),/no_response_days invalid/);
});

test('RET-001 explicit abandonment produces contextual review step',()=>{
  const r=assessRetentionRisk(base({explicit_abandonment:true}));
  assert.ok(r.rescue_plan.playbook.includes('REVIEW_ABANDONMENT_REASON'));
});

test('RET-001 contract is zero-cost deterministic PREPROD-only and multi-company',()=>{
  assert.equal(RET001_RETENTION_V1_CONTRACT.engine_id,'RET-001');
  assert.equal(RET001_RETENTION_V1_CONTRACT.environment,'PREPROD');
  assert.equal(RET001_RETENTION_V1_CONTRACT.multi_company,true);
  assert.equal(RET001_RETENTION_V1_CONTRACT.deterministic_first,true);
  assert.equal(RET001_RETENTION_V1_CONTRACT.ai_required,false);
  assert.equal(RET001_RETENTION_V1_CONTRACT.external_dispatch,false);
  assert.equal(RET001_RETENTION_V1_CONTRACT.additional_cost_target_eur,0);
});
