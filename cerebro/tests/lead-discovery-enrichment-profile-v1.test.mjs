import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LEAD_DISCOVERY_ROUTE_ORDER,
  LEAD_ENRICHMENT_WATERFALL,
  LEAD_EXTERNAL_SOURCE_DISPOSITIONS,
  planLeadDiscovery,
  buildIcpDefinition,
  scoreCompanyAgainstIcp,
  planLeadEnrichment,
  dedupeLeadCandidates,
  LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT
} from '../runtime/lead-discovery-enrichment-profile-v1.mjs';

const HUMAN_REQUIRED_CODES=[
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
];

const base={
  company_id:'fenix',engine_id:'CAP-001',environment:'PREPROD',version:'1.0.0',
  purpose:'B2B_LEAD_DISCOVERY',authorized_business_research:true,
  sources:{first_party_inbound:false,existing_crm:false,official_public_business_source:true,web_acquisition:true},
  estimated_incremental_cost_eur:0,personal_data_requested:false,outreach_requested:false
};

test('discovery route is deterministic and existing/public paths precede web acquisition',()=>{
  assert.deepEqual(LEAD_DISCOVERY_ROUTE_ORDER,[
    'FIRST_PARTY_INBOUND','EXISTING_CRM','OFFICIAL_PUBLIC_BUSINESS_SOURCE','WEB_ACQUISITION_PROFILE'
  ]);
  const result=planLeadDiscovery(base);
  assert.equal(result.status,'PLAN_READY');
  assert.equal(result.selected_route,'OFFICIAL_PUBLIC_BUSINESS_SOURCE');
  assert.deepEqual(result.fallback_chain,['WEB_ACQUISITION_PROFILE']);
  assert.equal(result.execution_authorized,false);
  assert.equal(result.outreach_authorized,false);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);
});

test('first-party and CRM inputs beat external discovery',()=>{
  const result=planLeadDiscovery({...base,sources:{...base.sources,first_party_inbound:true,existing_crm:true}});
  assert.equal(result.selected_route,'FIRST_PARTY_INBOUND');
  assert.deepEqual(result.fallback_chain,['EXISTING_CRM','OFFICIAL_PUBLIC_BUSINESS_SOURCE','WEB_ACQUISITION_PROFILE']);
});

test('personal contact discovery requires legal gate and outreach is never implied',()=>{
  const personal=planLeadDiscovery({...base,personal_data_requested:true});
  assert.equal(personal.status,'HUMAN_REQUIRED');
  assert.equal(personal.human_required,'LEGAL_REQUIRED');
  const outreach=planLeadDiscovery({...base,outreach_requested:true});
  assert.equal(outreach.status,'BLOCKED');
  assert.equal(outreach.reason,'OUTREACH_OUT_OF_SCOPE');
});

test('paid routes and PROD fail closed',()=>{
  const paid=planLeadDiscovery({...base,estimated_incremental_cost_eur:0.01});
  assert.equal(paid.status,'HUMAN_REQUIRED');
  assert.equal(paid.human_required,'MONEY_LIMIT');
  const prod=planLeadDiscovery({...base,environment:'PROD'});
  assert.equal(prod.status,'BLOCKED');
  assert.equal(prod.reason,'PROD_DISCOVERY_NOT_AUTHORIZED');
});

test('ICP definition is firmographic only and rejects protected/personal dimensions',()=>{
  const icp=buildIcpDefinition({
    company_id:'fenix',engine_id:'CAP-001',environment:'PREPROD',version:'1.0.0',
    criteria:{sectors:['real_estate'],locations:['cordoba'],employee_bands:['1-10','11-50'],business_models:['b2b'],required_signals:['website']}
  });
  assert.equal(icp.status,'ICP_DEFINED');
  assert.equal(icp.personal_or_protected_attributes_used,false);
  assert.throws(()=>buildIcpDefinition({
    company_id:'fenix',engine_id:'CAP-001',environment:'PREPROD',version:'1.0.0',criteria:{religion:['x']}
  }),/criterion denied/);
});

test('ICP scoring is deterministic and evidence-aware',()=>{
  const definition=buildIcpDefinition({
    company_id:'fenix',engine_id:'CAP-001',environment:'PREPROD',version:'1.0.0',
    criteria:{sectors:['real_estate'],locations:['cordoba'],employee_bands:['1-10'],business_models:['b2b'],required_signals:['website','public_phone']}
  });
  const scored=scoreCompanyAgainstIcp({definition,candidate:{company_name:'Acme',sector:'real_estate',location:'cordoba',employee_band:'1-10',business_model:'b2b',signals:['website','public_phone'],evidence_refs:['https://example.com/about']}});
  assert.equal(scored.status,'SCORED');
  assert.equal(scored.score,100);
  assert.equal(scored.classification,'ICP_STRONG_MATCH');
  assert.equal(scored.evidence_count,1);
});

test('enrichment waterfall is company-first, zero-cost, provenance-required and no personal guessing',()=>{
  assert.deepEqual(LEAD_ENRICHMENT_WATERFALL,[
    'NORMALIZE_COMPANY','DOMAIN_AND_WEBSITE','PUBLIC_FIRMOGRAPHICS','PUBLIC_BUSINESS_CHANNELS','EVIDENCE_AND_FRESHNESS','ICP_SCORE'
  ]);
  const plan=planLeadEnrichment({
    company_id:'fenix',engine_id:'CAP-001',environment:'PREPROD',version:'1.0.0',
    candidate:{company_name:'Acme',website:'https://example.com'},available_zero_cost_fields:['domain','sector','location','public_phone'],estimated_incremental_cost_eur:0
  });
  assert.equal(plan.status,'PLAN_READY');
  assert.equal(plan.personal_data_enrichment,false);
  assert.equal(plan.email_guessing_allowed,false);
  assert.equal(plan.phone_guessing_allowed,false);
  assert.equal(plan.execution_authorized,false);
});

test('dedupe is deterministic and keeps merged evidence without exposing raw secrets',()=>{
  const result=dedupeLeadCandidates([
    {company_name:'Acme SL',domain:'example.com',location:'Cordoba',evidence_refs:['a']},
    {company_name:' ACME SL ',domain:'https://example.com/',location:'cordoba',evidence_refs:['b']},
    {company_name:'Other',domain:'other.es',location:'Cordoba',evidence_refs:['c']}
  ]);
  assert.equal(result.length,2);
  assert.deepEqual(result[0].evidence_refs,['a','b']);
  assert.match(result[0].lead_key,/^[a-f0-9]{64}$/);
});

test('Clay, PhantomBuster and Octoparse remain optional references/benchmarks',()=>{
  const byItem=Object.fromEntries(LEAD_EXTERNAL_SOURCE_DISPOSITIONS.map(x=>[x.item,x]));
  assert.equal(byItem[66].source,'Clay');
  assert.equal(byItem[66].mode,'PATTERNS_OPTIONAL_CONNECTOR');
  assert.equal(byItem[67].source,'PhantomBuster');
  assert.equal(byItem[67].mode,'BENCHMARK_ONLY');
  assert.equal(byItem[68].source,'Octoparse');
  assert.equal(byItem[68].mode,'FALLBACK_BENCHMARK_FREE_LOCAL_ONLY');
  assert.ok(LEAD_EXTERNAL_SOURCE_DISPOSITIONS.every(x=>x.required_runtime_dependency===false));
});

test('current main CAP evidence remains partial rather than overstated',()=>{
  const registry=JSON.parse(fs.readFileSync(new URL('../registry/engine-registry.seed.json',import.meta.url),'utf8'));
  assert.ok(registry.engine_ids.includes('CAP-001'));
  assert.ok(registry.engine_ids.includes('LEAD-001'));
  assert.equal(fs.existsSync(new URL('../marketing/acquisition-engine.mjs',import.meta.url)),false);
  assert.equal(fs.existsSync(new URL('./web-acquisition-intelligence-profile-v1.test.mjs',import.meta.url)),true);
});

test('profile locks human vocabulary, zero cost and non-execution boundaries',()=>{
  assert.deepEqual(LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT.human_required_codes,HUMAN_REQUIRED_CODES);
  assert.equal(LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT.additional_cost_target_eur,0);
  assert.equal(LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT.prod_authorized,false);
  assert.equal(LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT.prod_write_authorized,false);
  assert.equal(LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT.outreach_authorized,false);
  assert.equal(LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT.trading_access,false);
  assert.equal(LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT.protected_attribute_inference_allowed,false);
  assert.equal(LEAD_DISCOVERY_ENRICHMENT_PROFILE_V1_CONTRACT.auth_bypass_allowed,false);
});
