import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  WEB_ACQUISITION_ROUTE_ORDER,
  WEB_ACQUISITION_SOURCE_DISPOSITIONS,
  planWebAcquisition,
  scoreTechnologyCandidate,
  downstreamIntelligenceStatus,
  WEB_ACQUISITION_PROFILE_V1_CONTRACT
} from '../runtime/web-acquisition-intelligence-profile-v1.mjs';

const HUMAN_REQUIRED_CODES=[
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
];

const base={
  company_id:'fenix',engine_id:'RSH-001',environment:'PREPROD',version:'1.0.0',
  target_url:'https://example.com',authorized_public_research:true,robots_allowed:true,
  sources:{official_api_feed:false,scrapling:true,crawlee:true,apify_free:true,browser:true},
  estimated_incremental_cost_eur:0,browser_binding_status:'BROWSER_SESSION_BINDING_HEALTHY'
};

test('canonical acquisition order is deterministic and browser-last',()=>{
  assert.deepEqual(WEB_ACQUISITION_ROUTE_ORDER,[
    'OFFICIAL_API_FEED_SITEMAP','SCRAPLING','CRAWLEE','APIFY_FREE','BROWSER_FALLBACK'
  ]);
  const result=planWebAcquisition(base);
  assert.equal(result.status,'ROUTED');
  assert.equal(result.selected_route,'SCRAPLING');
  assert.deepEqual(result.fallback_chain,['CRAWLEE','APIFY_FREE','BROWSER_FALLBACK']);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);
});

test('official public source beats scraping providers',()=>{
  const result=planWebAcquisition({...base,sources:{...base.sources,official_api_feed:true}});
  assert.equal(result.selected_route,'OFFICIAL_API_FEED_SITEMAP');
});

test('private/local targets fail closed before acquisition',()=>{
  for(const target_url of ['http://127.0.0.1:3000','http://localhost/admin','http://10.0.0.4/x','http://192.168.1.9']){
    const result=planWebAcquisition({...base,target_url});
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'NON_PUBLIC_TARGET_DENIED');
  }
});

test('authorization and robots/legal boundaries never trigger circumvention',()=>{
  assert.equal(planWebAcquisition({...base,authorized_public_research:false}).reason,'PUBLIC_RESEARCH_AUTHORIZATION_REQUIRED');
  assert.equal(planWebAcquisition({...base,robots_allowed:false}).reason,'ROBOTS_POLICY_HOLD');
  const legal=planWebAcquisition({...base,legal_required:true});
  assert.equal(legal.status,'HUMAN_REQUIRED');
  assert.equal(legal.human_required,'LEGAL_REQUIRED');
  assert.ok(HUMAN_REQUIRED_CODES.includes(legal.human_required));
  assert.equal(WEB_ACQUISITION_PROFILE_V1_CONTRACT.captcha_bypass_allowed,false);
  assert.equal(WEB_ACQUISITION_PROFILE_V1_CONTRACT.anti_abuse_evasion_allowed,false);
  assert.equal(WEB_ACQUISITION_PROFILE_V1_CONTRACT.auth_bypass_allowed,false);
});

test('paid acquisition fails closed with MONEY_LIMIT and no silent spend',()=>{
  const result=planWebAcquisition({...base,estimated_incremental_cost_eur:0.01,sources:{official_api_feed:false,scrapling:false,crawlee:false,apify_free:true,browser:false}});
  assert.equal(result.status,'HUMAN_REQUIRED');
  assert.equal(result.human_required,'MONEY_LIMIT');
  assert.equal(result.execution_authorized,false);
});

test('browser fallback requires healthy binding and remains PREPROD/LAB only',()=>{
  const sources={official_api_feed:false,scrapling:false,crawlee:false,apify_free:false,browser:true};
  const hold=planWebAcquisition({...base,sources,browser_binding_status:'STALE'});
  assert.equal(hold.status,'HOLD');
  assert.equal(hold.reason,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
  const routed=planWebAcquisition({...base,sources});
  assert.equal(routed.selected_route,'BROWSER_FALLBACK');
  const prod=planWebAcquisition({...base,environment:'PROD',sources});
  assert.equal(prod.status,'BLOCKED');
  assert.equal(prod.reason,'PROD_ACQUISITION_NOT_AUTHORIZED');
});

test('external providers are references/adapters, never automatic production dependencies',()=>{
  const byItem=Object.fromEntries(WEB_ACQUISITION_SOURCE_DISPOSITIONS.map(x=>[x.item,x]));
  assert.equal(byItem[52].source,'D4Vinci/Scrapling');
  assert.equal(byItem[52].license,'BSD-3-Clause');
  assert.equal(byItem[53].source,'apify/crawlee');
  assert.equal(byItem[53].license,'Apache-2.0');
  assert.equal(byItem[54].mode,'FREE_TIER_ONLY_NO_SPEND');
  assert.equal(byItem[55].source,'Panniantong/Agent-Reach');
  assert.equal(byItem[55].license,'MIT');
  assert.ok(WEB_ACQUISITION_SOURCE_DISPOSITIONS.every(x=>x.external_code_execution===false));
});

test('Technology Scout scoring is deterministic, evidence-first and zero-cost-first',()=>{
  const candidate={
    candidate_id:'scrapling',source_ref:'D4Vinci/Scrapling',observed_at:'2026-10-14T00:00:00Z',
    version_ref:'main@2026-10-13',license_ref:'BSD-3-Clause',security_notes:'LAB evaluation only',
    integration_notes:'adapter candidate',cost_eur_month:0,fit:90,maintainability:80,security:75,interoperability:85,reversibility:95
  };
  const scored=scoreTechnologyCandidate({company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'1.0.0',candidate});
  assert.equal(scored.status,'SCORED');
  assert.equal(scored.recommendation,'SHORTLIST');
  assert.equal(scored.additional_cost_eur,0);
  const paid=scoreTechnologyCandidate({company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'1.0.0',candidate:{...candidate,cost_eur_month:1}});
  assert.equal(paid.status,'HUMAN_REQUIRED');
  assert.equal(paid.human_required,'MONEY_LIMIT');
  const incomplete=scoreTechnologyCandidate({company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'1.0.0',candidate:{...candidate,license_ref:''}});
  assert.equal(incomplete.status,'HOLD');
  assert.equal(incomplete.reason,'TECHNOLOGY_EVIDENCE_INCOMPLETE');
});

test('live-main intelligence evidence is reused without false status upgrades',()=>{
  const expected={
    'COMPET-001':'PARCIAL','WAUD-001':'EXISTENTE','KW-001':'EXISTENTE','SOCAUD-001':'EXISTENTE','LOCALP-001':'EXISTENTE'
  };
  for(const [engine,status] of Object.entries(expected)) assert.equal(downstreamIntelligenceStatus(engine).status,status);
  assert.equal(fs.existsSync(new URL('../multicompany/post-scan-parallel-v1.mjs',import.meta.url)),true);
  assert.equal(fs.existsSync(new URL('../runtime/competitor_intelligence.py',import.meta.url)),false);
});

test('profile keeps exact human-exception vocabulary and no PROD/Trading authority',()=>{
  assert.deepEqual(WEB_ACQUISITION_PROFILE_V1_CONTRACT.human_required_codes,HUMAN_REQUIRED_CODES);
  assert.equal(WEB_ACQUISITION_PROFILE_V1_CONTRACT.prod_authorized,false);
  assert.equal(WEB_ACQUISITION_PROFILE_V1_CONTRACT.prod_write_authorized,false);
  assert.equal(WEB_ACQUISITION_PROFILE_V1_CONTRACT.trading_access,false);
  assert.equal(WEB_ACQUISITION_PROFILE_V1_CONTRACT.additional_cost_target_eur,0);
});
