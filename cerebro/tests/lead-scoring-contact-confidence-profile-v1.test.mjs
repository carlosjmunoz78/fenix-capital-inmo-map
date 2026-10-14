import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEAD_SCORING_CONTACT_CONFIDENCE_PROFILE_V1_CONTRACT,
  scoreLeadDecision,
  scoreEmailContactConfidence,
  scorePhoneContactConfidence,
  planVerificationProvider
} from '../runtime/lead-scoring-contact-confidence-profile-v1.mjs';

const ctx={company_id:'fenix',engine_id:'LEAD-001',environment:'PREPROD',version:'1.0.0'};
const canonicalHuman=new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

const icp={status:'SCORED',score:80,evidence_refs:['icp:1']};
const intent={status:'SCORED',score:70,evidence_refs:['intent:1']};
const page={status:'SCORED',score:60,evidence_refs:['page:1']};

test('contract is multiempresa, zero-cost and read-only',()=>{
  const c=LEAD_SCORING_CONTACT_CONFIDENCE_PROFILE_V1_CONTRACT;
  assert.equal(c.engine_id,'LEAD-001');
  assert.equal(c.company_scope,'MULTIEMPRESA_CONTEXT_REQUIRED');
  assert.equal(c.additional_cost_target_eur,0);
  assert.equal(c.prod_authorized,false);
  assert.equal(c.prod_write_authorized,false);
  assert.equal(c.crm_write_authorized,false);
  assert.equal(c.outreach_authorized,false);
  assert.equal(c.trading_access,false);
  assert.equal(c.active_smtp_probe_authorized,false);
  assert.deepEqual(new Set(c.human_required_codes),canonicalHuman);
});

test('lead decision reuses evidenced ICP, company intent and page intent deterministically',()=>{
  const result=scoreLeadDecision({
    ...ctx,
    now:'2026-10-14T06:00:00Z',
    icp_score_result:icp,
    company_intent_result:intent,
    page_intent_result:page,
    business_events:[
      {type:'CONTACT_REQUEST',observed_at:'2026-10-14T05:00:00Z',evidence_ref:'event:contact'},
      {type:'REPEAT_VISIT',observed_at:'2026-10-13T05:00:00Z',evidence_ref:'event:return'}
    ],
    business_value_eur:5000
  });
  assert.equal(result.status,'SCORED');
  assert.equal(result.fit_score,80);
  assert.equal(result.intent_score,66);
  assert.equal(result.urgency_score,55);
  assert.ok(result.conversion_probability>0 && result.conversion_probability<1);
  assert.equal(result.expected_value,Math.round(result.conversion_probability*5000*100)/100);
  assert.equal(result.model_type,'DETERMINISTIC_HEURISTIC_V0');
  assert.equal(result.calibrated,false);
  assert.equal(result.crm_write_authorized,false);
  assert.equal(result.outreach_authorized,false);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.trading_access,false);
  assert.ok(result.evidence_refs.includes('icp:1'));
  assert.ok(result.evidence_refs.includes('intent:1'));
  assert.ok(result.evidence_refs.includes('page:1'));
});

test('lead decision degrades safely when score evidence is missing',()=>{
  const result=scoreLeadDecision({...ctx,now:'2026-10-14T06:00:00Z',business_value_eur:2500});
  assert.equal(result.status,'HOLD');
  assert.equal(result.reason,'EVIDENCED_LEAD_SCORES_REQUIRED');
  assert.equal(result.human_required,null);
});

test('expected value is analytically bounded and cannot authorize spend',()=>{
  const result=scoreLeadDecision({
    ...ctx,now:'2026-10-14T06:00:00Z',icp_score_result:icp,company_intent_result:intent,page_intent_result:page,
    business_events:[],business_value_eur:900000,value_cap_eur:100000
  });
  assert.equal(result.status,'SCORED');
  assert.equal(result.business_value_used_eur,100000);
  assert.equal(result.value_capped,true);
  assert.equal(result.additional_cost_eur,0);
  assert.equal(result.money_action_authorized,false);
});

test('email confidence is passive, explainable and catch-all stays uncertain',()=>{
  const result=scoreEmailContactConfidence({
    ...ctx,email:'info@example.com',source_basis:'PUBLIC_BUSINESS_CONTACT',evidence_ref:'web:contact',
    domain_exists:true,mx_records:['mx1.example.com'],catch_all:true,smtp_status:'UNKNOWN'
  });
  assert.equal(result.status,'SCORED');
  assert.equal(result.syntax_valid,true);
  assert.equal(result.mx_present,true);
  assert.equal(result.catch_all,true);
  assert.equal(result.classification,'UNCERTAIN_CATCH_ALL');
  assert.ok(result.confidence_score<=60);
  assert.equal(result.deliverability_guaranteed,false);
  assert.equal(result.email_sent,false);
  assert.equal(result.smtp_probe_executed,false);
});

test('active SMTP probing is not silently executed',()=>{
  const result=scoreEmailContactConfidence({
    ...ctx,email:'info@example.com',source_basis:'PUBLIC_BUSINESS_CONTACT',evidence_ref:'web:contact',smtp_probe_requested:true
  });
  assert.equal(result.status,'HOLD');
  assert.equal(result.reason,'ACTIVE_SMTP_PROBE_NOT_AUTHORIZED');
  assert.equal(result.email_sent,false);
  assert.equal(result.smtp_probe_executed,false);
});

test('phone confidence only normalizes and scores lawful supplied contact evidence',()=>{
  const result=scorePhoneContactConfidence({
    ...ctx,phone:'+34957123456',source_basis:'FIRST_PARTY_EXPLICIT',evidence_ref:'form:phone',country_context_match:true
  });
  assert.equal(result.status,'SCORED');
  assert.equal(result.normalized_phone,'+34957123456');
  assert.equal(result.e164_plausible,true);
  assert.ok(result.confidence_score>=80);
  assert.equal(result.carrier_lookup_executed,false);
  assert.equal(result.person_lookup_executed,false);
});

test('personal contact without approved basis escalates only through canonical LEGAL_REQUIRED',()=>{
  const result=scoreEmailContactConfidence({...ctx,email:'person@example.com',source_basis:'UNKNOWN',person_level_contact:true,evidence_ref:'x'});
  assert.equal(result.status,'HUMAN_REQUIRED');
  assert.equal(result.human_required,'LEGAL_REQUIRED');
  assert.ok(canonicalHuman.has(result.human_required));
});

test('paid verification is MONEY_LIMIT and Verifio stays held on repository license conflict',()=>{
  const paid=planVerificationProvider({...ctx,provider:'LOCAL_PASSIVE',estimated_incremental_cost_eur:1});
  assert.equal(paid.status,'HUMAN_REQUIRED');
  assert.equal(paid.human_required,'MONEY_LIMIT');

  const verifio=planVerificationProvider({...ctx,provider:'VERIFIO',estimated_incremental_cost_eur:0});
  assert.equal(verifio.status,'HOLD');
  assert.equal(verifio.reason,'VERIFIO_LICENSE_CONFLICT_REVIEW_REQUIRED');
  assert.equal(verifio.external_code_execution,false);
});

test('PROD scoring and verification remain closed',()=>{
  const prod={...ctx,environment:'PROD'};
  assert.equal(scoreLeadDecision({...prod,now:'2026-10-14T06:00:00Z',icp_score_result:icp,business_value_eur:1000}).status,'BLOCKED');
  assert.equal(scoreEmailContactConfidence({...prod,email:'info@example.com',source_basis:'PUBLIC_BUSINESS_CONTACT',evidence_ref:'x'}).status,'BLOCKED');
  assert.equal(scorePhoneContactConfidence({...prod,phone:'+34957123456',source_basis:'PUBLIC_BUSINESS_CONTACT',evidence_ref:'x'}).status,'BLOCKED');
});
