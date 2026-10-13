import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_PROVIDER_ORDER,PAGE_INTENT_WEIGHTS,ANALYTICS_PROVIDER_DISPOSITIONS,
  normalizeFirstPartyEvent,planAnalyticsProvider,planCompanyVisitorIdentification,
  scoreVisitedPageIntent,deriveReturnVisitSignal,mergeCrmWebsiteAccountTimeline,
  FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT
} from '../runtime/first-party-account-signals-profile-v1.mjs';

const HUMAN=[
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
];
const ctx={company_id:'fenix',engine_id:'EVT-001',environment:'PREPROD',version:'1.0.0'};
const baseEvent={...ctx,event_type:'PAGE_VIEW',occurred_at:'2026-10-14T10:00:00Z',page_url:'https://fenixcapital.es/hipotecas/?utm_source=x#top',page_category:'SERVICE',consent_state:'GRANTED_ANALYTICS',evidence_ref:'ev:1'};

test('first-party event normalization strips query/fragment and forbids direct identifiers',()=>{
  const event=normalizeFirstPartyEvent({...baseEvent,account_id:'acct-1'});
  assert.equal(event.status,'NORMALIZED');
  assert.equal(event.route_path,'/hipotecas/');
  assert.equal(event.page_url_origin,'https://fenixcapital.es');
  assert.equal(event.account_id,'acct-1');
  assert.equal(event.raw_ip_stored,false);
  assert.equal(event.user_agent_stored,false);
  assert.equal(event.form_values_stored,false);
  assert.match(event.event_id,/^[a-f0-9]{64}$/);
  for(const key of ['email','phone','name','ip','ip_address','user_agent','cookie','cookies','form_values']){
    assert.throws(()=>normalizeFirstPartyEvent({...baseEvent,[key]:'forbidden'}),/forbidden event field/);
  }
});

test('analytics capture requires analytics consent and remains PREPROD/LAB only',()=>{
  const noConsent=normalizeFirstPartyEvent({...baseEvent,consent_state:'UNKNOWN'});
  assert.equal(noConsent.status,'HOLD');
  assert.equal(noConsent.reason,'ANALYTICS_CONSENT_REQUIRED');
  const prod=normalizeFirstPartyEvent({...baseEvent,environment:'PROD'});
  assert.equal(prod.status,'BLOCKED');
  assert.equal(prod.reason,'PROD_EVENT_CAPTURE_NOT_AUTHORIZED');
});

test('provider order is first-party local before optional free analytics providers',()=>{
  assert.deepEqual(ANALYTICS_PROVIDER_ORDER,['FIRST_PARTY_LOCAL','POSTHOG_FREE','MICROSOFT_CLARITY_FREE','YANDEX_METRICA_FREE']);
  const r=planAnalyticsProvider({...ctx,consent_ready:true,privacy_review_complete:true,available:{first_party_local:true,posthog_free:true,clarity_free:true,yandex_free:true},estimated_monthly_events:1000});
  assert.equal(r.status,'PLAN_READY');
  assert.equal(r.selected_provider,'FIRST_PARTY_LOCAL');
  assert.deepEqual(r.fallback_chain,['POSTHOG_FREE','MICROSOFT_CLARITY_FREE','YANDEX_METRICA_FREE']);
  assert.equal(r.activation_authorized,false);
  assert.equal(r.additional_cost_eur,0);
});

test('PostHog free route hard-stops before paid usage',()=>{
  const only={first_party_local:false,posthog_free:true,clarity_free:false,yandex_free:false};
  const ok=planAnalyticsProvider({...ctx,consent_ready:true,privacy_review_complete:true,available:only,estimated_monthly_events:999999});
  assert.equal(ok.selected_provider,'POSTHOG_FREE');
  const over=planAnalyticsProvider({...ctx,consent_ready:true,privacy_review_complete:true,available:only,estimated_monthly_events:1000001});
  assert.equal(over.status,'HOLD');
  assert.equal(over.reason,'POSTHOG_FREE_TIER_CAP_EXCEEDED');
  const paid=planAnalyticsProvider({...ctx,consent_ready:true,privacy_review_complete:true,available:only,estimated_monthly_events:1000,estimated_incremental_cost_eur:1});
  assert.equal(paid.status,'HUMAN_REQUIRED');
  assert.equal(paid.human_required,'MONEY_LIMIT');
});

test('Clarity and Yandex require consent/privacy readiness; Talivia remains patterns only',()=>{
  const clarityOnly={first_party_local:false,posthog_free:false,clarity_free:true,yandex_free:false};
  assert.equal(planAnalyticsProvider({...ctx,consent_ready:false,privacy_review_complete:true,available:clarityOnly}).reason,'ANALYTICS_CONSENT_REQUIRED');
  const yandexOnly={first_party_local:false,posthog_free:false,clarity_free:false,yandex_free:true};
  assert.equal(planAnalyticsProvider({...ctx,consent_ready:true,privacy_review_complete:false,available:yandexOnly}).reason,'PRIVACY_REVIEW_REQUIRED');
  const byItem=Object.fromEntries(ANALYTICS_PROVIDER_DISPOSITIONS.map(x=>[x.item,x]));
  assert.equal(byItem[75].mode,'FREE_TIER_OR_SELF_HOST_CANDIDATE_NO_AUTO_SPEND');
  assert.equal(byItem[76].mode,'PATTERNS_ONLY_PAID_SERVICE');
  assert.equal(byItem[77].mode,'FREE_PROVIDER_CONSENT_GATED');
  assert.equal(byItem[78].mode,'FREE_PROVIDER_PRIVACY_GATED');
  assert.ok(ANALYTICS_PROVIDER_DISPOSITIONS.every(x=>x.required_runtime_dependency===false));
});

test('company visitor identification is exact first-party only',()=>{
  const known=planCompanyVisitorIdentification({...ctx,account_id:'acct-1',consent_or_first_party_basis:true});
  assert.equal(known.status,'PLAN_READY');
  assert.equal(known.identification_level,'COMPANY_ONLY');
  const domain=planCompanyVisitorIdentification({...ctx,company_domain:'example.com',consent_or_first_party_basis:true});
  assert.equal(domain.status,'PLAN_READY');
  const anonymous=planCompanyVisitorIdentification({...ctx,third_party_anonymous_resolution:true,consent_or_first_party_basis:false});
  assert.equal(anonymous.status,'HUMAN_REQUIRED');
  assert.equal(anonymous.human_required,'LEGAL_REQUIRED');
  assert.equal(planCompanyVisitorIdentification({...ctx,device_fingerprinting:true,consent_or_first_party_basis:true}).reason,'FINGERPRINTING_DENIED');
});

test('visited-page intent score is deterministic from normalized events',()=>{
  assert.deepEqual(PAGE_INTENT_WEIGHTS,{HOME:5,BLOG:10,SERVICE:20,CASE_STUDY:25,CONTACT:30,PRICING:35,APPLICATION_START:40});
  const events=[
    normalizeFirstPartyEvent({...baseEvent,account_id:'acct-1',page_category:'SERVICE',evidence_ref:'e1'}),
    normalizeFirstPartyEvent({...baseEvent,account_id:'acct-1',occurred_at:'2026-10-14T10:05:00Z',page_category:'PRICING',page_url:'https://fenixcapital.es/precios/',evidence_ref:'e2'}),
    normalizeFirstPartyEvent({...baseEvent,account_id:'acct-1',occurred_at:'2026-10-14T10:10:00Z',page_category:'CONTACT',page_url:'https://fenixcapital.es/contacto/',evidence_ref:'e3'})
  ];
  const score=scoreVisitedPageIntent({...ctx,account_id:'acct-1',events});
  assert.equal(score.status,'SCORED');
  assert.equal(score.score,85);
  assert.equal(score.evidence_count,3);
});

test('return visit signal requires a second visit window for the same exact account',()=>{
  const events=[
    normalizeFirstPartyEvent({...baseEvent,account_id:'acct-1',evidence_ref:'a'}),
    normalizeFirstPartyEvent({...baseEvent,account_id:'acct-1',occurred_at:'2026-10-14T10:10:00Z',evidence_ref:'b'}),
    normalizeFirstPartyEvent({...baseEvent,account_id:'acct-1',occurred_at:'2026-10-14T12:00:00Z',evidence_ref:'c'})
  ];
  const r=deriveReturnVisitSignal({...ctx,account_id:'acct-1',events,visit_gap_minutes:30});
  assert.equal(r.status,'SIGNAL_READY');
  assert.equal(r.return_visit,true);
  assert.equal(r.visit_count,2);
});

test('CRM + website merge is read-only and exact-key only',()=>{
  const crm=[{account_id:'acct-1',company_name:'Acme',company_domain:'example.com'},{account_id:'acct-2',company_name:'Other',company_domain:'other.es'}];
  const events=[normalizeFirstPartyEvent({...baseEvent,account_id:'acct-1',evidence_ref:'ev1'})];
  const merged=mergeCrmWebsiteAccountTimeline({...ctx,crm_accounts:crm,website_events:events});
  assert.equal(merged.status,'MERGED_READ_ONLY');
  assert.equal(merged.timelines.length,2);
  assert.equal(merged.timelines[0].website_events.length,1);
  assert.equal(merged.crm_write_authorized,false);
  assert.equal(merged.fuzzy_matching_used,false);
});

test('profile locks exact human vocabulary, privacy and authority boundaries',()=>{
  assert.deepEqual(FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT.human_required_codes,HUMAN);
  assert.equal(FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT.raw_ip_storage_allowed,false);
  assert.equal(FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT.form_value_capture_allowed,false);
  assert.equal(FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT.device_fingerprinting_allowed,false);
  assert.equal(FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT.prod_authorized,false);
  assert.equal(FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT.prod_write_authorized,false);
  assert.equal(FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT.crm_write_authorized,false);
  assert.equal(FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT.trading_access,false);
  assert.equal(FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1_CONTRACT.additional_cost_target_eur,0);
});
