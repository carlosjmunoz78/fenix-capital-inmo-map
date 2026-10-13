import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEAD_SCORE_WEIGHTS,VERIFICATION_SOURCE_DISPOSITIONS,
  scoreLeadPrioritization,deriveNextBestAction,evaluateEmailConfidence,evaluatePhoneConfidence,
  LEAD_PRIORITIZATION_VERIFICATION_PROFILE_V1_CONTRACT
} from '../runtime/lead-prioritization-verification-profile-v1.mjs';

const HUMAN=['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'];
const ctx={company_id:'fenix',engine_id:'LEAD-001',environment:'PREPROD',version:'1.0.0'};

test('lead prioritization deterministically combines fit, intent and urgency',()=>{
  assert.deepEqual(LEAD_SCORE_WEIGHTS,{fit:0.35,intent:0.4,urgency:0.25});
  const r=scoreLeadPrioritization({...ctx,lead_id:'lead-1',fit_score:80,company_intent_score:70,page_intent_score:60,return_visit:true,urgency_signals:{application_started:true,contact_requested:false,pricing_viewed:true,recent_return_visit:true},deal_value_eur:3500,evidence_refs:['fit:1','intent:1','evt:1'],confidence:0.9});
  assert.equal(r.status,'SCORED');
  assert.equal(r.fit_score,80);
  assert.equal(r.intent_score,70);
  assert.equal(r.urgency_score,80);
  assert.equal(r.conversion_probability,0.76);
  assert.equal(r.expected_value_eur,2660);
  assert.equal(r.outreach_authorized,false);
  assert.equal(r.crm_write_authorized,false);
});

test('missing evidence holds and low-confidence uses only canonical exception',()=>{
  const hold=scoreLeadPrioritization({...ctx,lead_id:'lead-1',fit_score:80,company_intent_score:70,page_intent_score:60,return_visit:false,urgency_signals:{},deal_value_eur:1000,evidence_refs:[],confidence:0.9});
  assert.equal(hold.status,'HOLD');
  assert.equal(hold.reason,'LEAD_SCORE_EVIDENCE_REQUIRED');
  const low=scoreLeadPrioritization({...ctx,lead_id:'lead-1',fit_score:80,company_intent_score:70,page_intent_score:60,return_visit:false,urgency_signals:{},deal_value_eur:1000,evidence_refs:['e'],confidence:0.4});
  assert.equal(low.status,'HUMAN_REQUIRED');
  assert.equal(low.human_required,'LOW_CONFIDENCE');
});

test('next best action is advisory only and never sends outreach',()=>{
  const high=deriveNextBestAction({...ctx,conversion_probability:0.8,email_confidence:90,phone_confidence:80,evidence_complete:true});
  assert.equal(high.status,'ACTION_RECOMMENDED');
  assert.equal(high.next_best_action,'PREPARE_HUMAN_FOLLOWUP');
  assert.equal(high.execution_authorized,false);
  assert.equal(high.outreach_authorized,false);
  const low=deriveNextBestAction({...ctx,conversion_probability:0.2,email_confidence:20,phone_confidence:20,evidence_complete:false});
  assert.equal(low.next_best_action,'REQUEST_MORE_EVIDENCE');
});

test('email confidence is evidence-only, redacted and catch-all aware',()=>{
  const r=evaluateEmailConfidence({...ctx,email:'person@example.com',lawful_basis_or_first_party:true,signals:{syntax_valid:true,dns_valid:true,mx_valid:true,smtp:'accepted',catch_all:false,disposable:false,role_account:false},observed_at:'2026-10-14T00:00:00Z'});
  assert.equal(r.status,'VERIFIED_EVIDENCE');
  assert.equal(r.confidence,100);
  assert.equal(r.contact_value_returned,false);
  assert.equal(r.network_probe_executed,false);
  assert.match(r.contact_ref,/^[a-f0-9]{64}$/);
  assert.equal('email' in r,false);
  const catchAll=evaluateEmailConfidence({...ctx,email:'person@example.com',lawful_basis_or_first_party:true,signals:{syntax_valid:true,dns_valid:true,mx_valid:true,smtp:'accepted',catch_all:true,disposable:false,role_account:false},observed_at:'2026-10-14T00:00:00Z'});
  assert.ok(catchAll.confidence<=70);
  assert.equal(catchAll.catch_all,true);
});

test('email/contact verification requires lawful or first-party basis',()=>{
  const r=evaluateEmailConfidence({...ctx,email:'person@example.com',lawful_basis_or_first_party:false,signals:{syntax_valid:true},observed_at:'2026-10-14T00:00:00Z'});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.human_required,'LEGAL_REQUIRED');
});

test('phone confidence is passive evidence scoring only; no calls or SMS',()=>{
  const r=evaluatePhoneConfidence({...ctx,phone:'+34600111222',lawful_basis_or_first_party:true,signals:{e164_valid:true,source:'FIRST_PARTY',line_type_known:true,country_consistent:true,recently_verified:true},observed_at:'2026-10-14T00:00:00Z'});
  assert.equal(r.status,'VERIFIED_EVIDENCE');
  assert.equal(r.confidence,100);
  assert.equal(r.call_executed,false);
  assert.equal(r.sms_executed,false);
  assert.equal(r.contact_value_returned,false);
  assert.equal('phone' in r,false);
});

test('Verifio is reference-only because current repository license has additional restrictions',()=>{
  const byItem=Object.fromEntries(VERIFICATION_SOURCE_DISPOSITIONS.map(x=>[x.item,x]));
  assert.equal(byItem[90].source,'verifio-email/verifio');
  assert.equal(byItem[90].license,'APACHE-2.0-WITH-CUSTOM-RESTRICTIONS');
  assert.equal(byItem[90].mode,'REFERENCE_ONLY_LICENSE_REVIEW_REQUIRED');
  assert.equal(byItem[90].external_code_execution,false);
  assert.equal(byItem[91].mode,'DETERMINISTIC_EVIDENCE_MODEL_NO_NETWORK_EXECUTION');
  assert.equal(byItem[92].mode,'DETERMINISTIC_EVIDENCE_MODEL_NO_CALL_OR_SMS');
});

test('PROD, paid verification and outreach remain blocked',()=>{
  assert.equal(scoreLeadPrioritization({...ctx,environment:'PROD',lead_id:'x',fit_score:1,company_intent_score:1,page_intent_score:1,return_visit:false,urgency_signals:{},deal_value_eur:1,evidence_refs:['e'],confidence:1}).reason,'PROD_LEAD_SCORING_NOT_AUTHORIZED');
  const paid=evaluateEmailConfidence({...ctx,email:'person@example.com',lawful_basis_or_first_party:true,estimated_incremental_cost_eur:1,signals:{syntax_valid:true},observed_at:'2026-10-14T00:00:00Z'});
  assert.equal(paid.status,'HUMAN_REQUIRED');
  assert.equal(paid.human_required,'MONEY_LIMIT');
});

test('profile preserves exact human vocabulary and authority boundaries',()=>{
  assert.deepEqual(LEAD_PRIORITIZATION_VERIFICATION_PROFILE_V1_CONTRACT.human_required_codes,HUMAN);
  assert.equal(LEAD_PRIORITIZATION_VERIFICATION_PROFILE_V1_CONTRACT.prod_authorized,false);
  assert.equal(LEAD_PRIORITIZATION_VERIFICATION_PROFILE_V1_CONTRACT.prod_write_authorized,false);
  assert.equal(LEAD_PRIORITIZATION_VERIFICATION_PROFILE_V1_CONTRACT.crm_write_authorized,false);
  assert.equal(LEAD_PRIORITIZATION_VERIFICATION_PROFILE_V1_CONTRACT.outreach_authorized,false);
  assert.equal(LEAD_PRIORITIZATION_VERIFICATION_PROFILE_V1_CONTRACT.network_contact_probe_authorized,false);
  assert.equal(LEAD_PRIORITIZATION_VERIFICATION_PROFILE_V1_CONTRACT.trading_access,false);
  assert.equal(LEAD_PRIORITIZATION_VERIFICATION_PROFILE_V1_CONTRACT.additional_cost_target_eur,0);
});
