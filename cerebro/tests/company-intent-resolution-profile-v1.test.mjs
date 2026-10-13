import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTENT_SOURCE_ORDER,INTENT_SOURCE_DISPOSITIONS,COMPANY_INTENT_SIGNAL_WEIGHTS,
  planIntentSource,scoreCompanyIntent,planVisitorCompanyResolution,
  COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT
} from '../runtime/company-intent-resolution-profile-v1.mjs';

const HUMAN=[
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
];
const ctx={company_id:'fenix',engine_id:'LEAD-001',environment:'PREPROD',version:'1.0.0'};

test('company intent source order is deterministic and zero-cost first',()=>{
  assert.deepEqual(INTENT_SOURCE_ORDER,[
    'FIRST_PARTY_AGGREGATED_ACCOUNT_SIGNALS','EXISTING_CRM_SIGNALS','PUBLIC_BUSINESS_SIGNALS','OPTIONAL_SALES_NAVIGATOR'
  ]);
  const r=planIntentSource({...ctx,available:{first_party:true,crm:true,public_business:true,sales_navigator:true},sales_navigator:{already_licensed:true,incremental_cost_eur:0,roi_evidence:true}});
  assert.equal(r.status,'PLAN_READY');
  assert.equal(r.selected_source,'FIRST_PARTY_AGGREGATED_ACCOUNT_SIGNALS');
  assert.deepEqual(r.fallback_chain,['EXISTING_CRM_SIGNALS','PUBLIC_BUSINESS_SIGNALS','OPTIONAL_SALES_NAVIGATOR']);
  assert.equal(r.execution_authorized,false);
});

test('Sales Navigator is optional only with existing license, zero incremental cost and ROI evidence',()=>{
  const only={first_party:false,crm:false,public_business:false,sales_navigator:true};
  assert.equal(planIntentSource({...ctx,available:only,sales_navigator:{already_licensed:false,incremental_cost_eur:0,roi_evidence:true}}).reason,'SALES_NAVIGATOR_LICENSE_NOT_EXISTING');
  assert.equal(planIntentSource({...ctx,available:only,sales_navigator:{already_licensed:true,incremental_cost_eur:0,roi_evidence:false}}).reason,'SALES_NAVIGATOR_ROI_EVIDENCE_REQUIRED');
  const paid=planIntentSource({...ctx,available:only,sales_navigator:{already_licensed:true,incremental_cost_eur:1,roi_evidence:true}});
  assert.equal(paid.status,'HUMAN_REQUIRED');
  assert.equal(paid.human_required,'MONEY_LIMIT');
});

test('intent score uses explicit company-level signals, freshness and evidence only',()=>{
  const r=scoreCompanyIntent({...ctx,account_id:'acct-1',now:'2026-10-14T00:00:00Z',signals:[
    {type:'repeat_company_visit',observed_at:'2026-10-13T12:00:00Z',evidence_ref:'ev-1'},
    {type:'pricing_page_company_visit',observed_at:'2026-10-13T13:00:00Z',evidence_ref:'ev-2'},
    {type:'public_hiring_signal',observed_at:'2026-10-12T00:00:00Z',evidence_ref:'ev-3'}
  ]});
  assert.equal(r.status,'SCORED');
  assert.ok(r.score>0&&r.score<=100);
  assert.equal(r.person_level_signal_used,false);
  assert.equal(r.evidence_count,3);
  assert.deepEqual(Object.keys(COMPANY_INTENT_SIGNAL_WEIGHTS).sort(),[
    'company_website_visit','pricing_page_company_visit','public_funding_signal','public_hiring_signal','repeat_company_visit'
  ]);
});

test('unknown, stale or evidence-free signals fail closed or are excluded',()=>{
  assert.throws(()=>scoreCompanyIntent({...ctx,account_id:'a',signals:[{type:'person_clicked',observed_at:'2026-10-14T00:00:00Z',evidence_ref:'e'}],now:'2026-10-14T00:00:00Z'}),/signal type denied/);
  const r=scoreCompanyIntent({...ctx,account_id:'a',signals:[{type:'public_hiring_signal',observed_at:'2026-01-01T00:00:00Z',evidence_ref:'e'}],now:'2026-10-14T00:00:00Z'});
  assert.equal(r.status,'HOLD');
  assert.equal(r.reason,'NO_FRESH_EVIDENCED_COMPANY_SIGNALS');
});

test('visitor resolution is company-level only; person/device resolution requires legal review',()=>{
  const allowed=planVisitorCompanyResolution({...ctx,resolution_method:'EXPLICIT_FORM_COMPANY_DOMAIN',company_domain:'example.com',consent_or_first_party_basis:true});
  assert.equal(allowed.status,'PLAN_READY');
  assert.equal(allowed.resolution_level,'COMPANY_ONLY');
  assert.equal(allowed.fingerprinting_allowed,false);
  const personal=planVisitorCompanyResolution({...ctx,resolution_method:'PERSON_IDENTITY_GRAPH',person_resolution_requested:true,consent_or_first_party_basis:true});
  assert.equal(personal.status,'HUMAN_REQUIRED');
  assert.equal(personal.human_required,'LEGAL_REQUIRED');
  const fp=planVisitorCompanyResolution({...ctx,resolution_method:'DEVICE_FINGERPRINT',consent_or_first_party_basis:true});
  assert.equal(fp.status,'BLOCKED');
  assert.equal(fp.reason,'FINGERPRINTING_OR_COVERT_RESOLUTION_DENIED');
});

test('third-party anonymous visitor deanonymization is not silently authorized',()=>{
  const r=planVisitorCompanyResolution({...ctx,resolution_method:'THIRD_PARTY_ANONYMOUS_VISITOR_RESOLUTION',consent_or_first_party_basis:false});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.human_required,'LEGAL_REQUIRED');
  assert.equal(r.execution_authorized,false);
});

test('Gojiberry, MasLeads, Pearl Diver and Beton remain patterns/benchmarks, not mandatory services',()=>{
  const byItem=Object.fromEntries(INTENT_SOURCE_DISPOSITIONS.map(x=>[x.item,x]));
  assert.equal(byItem[69].mode,'OPTIONAL_EXISTING_LICENSE_ONLY_ROI_GATE');
  assert.equal(byItem[70].source,'Gojiberry AI');
  assert.equal(byItem[70].mode,'PATTERNS_ONLY_BUILD_ZERO_COST_EQUIVALENT');
  assert.equal(byItem[71].source,'MasLeads');
  assert.equal(byItem[71].mode,'CONCEPT_ONLY_BUILD_ZERO_COST_EQUIVALENT');
  assert.equal(byItem[72].source,'Pearl Diver');
  assert.equal(byItem[72].mode,'CONCEPT_ONLY_PRIVACY_GATED');
  assert.equal(byItem[73].source,'getbeton/inspector');
  assert.equal(byItem[73].license,'AGPL-3.0');
  assert.equal(byItem[73].mode,'LAB_BENCHMARK_PATTERNS_ONLY');
  assert.ok(INTENT_SOURCE_DISPOSITIONS.every(x=>x.required_runtime_dependency===false));
});

test('profile preserves exact human vocabulary and no PROD/outreach/Trading authority',()=>{
  assert.deepEqual(COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT.human_required_codes,HUMAN);
  assert.equal(COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT.prod_authorized,false);
  assert.equal(COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT.prod_write_authorized,false);
  assert.equal(COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT.outreach_authorized,false);
  assert.equal(COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT.trading_access,false);
  assert.equal(COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT.person_resolution_default,false);
  assert.equal(COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT.device_fingerprinting_allowed,false);
  assert.equal(COMPANY_INTENT_RESOLUTION_PROFILE_V1_CONTRACT.additional_cost_target_eur,0);
});

test('PROD and outreach remain blocked',()=>{
  assert.equal(planIntentSource({...ctx,environment:'PROD',available:{public_business:true}}).reason,'PROD_INTENT_NOT_AUTHORIZED');
  assert.equal(planIntentSource({...ctx,outreach_requested:true,available:{public_business:true}}).reason,'OUTREACH_OUT_OF_SCOPE');
});
