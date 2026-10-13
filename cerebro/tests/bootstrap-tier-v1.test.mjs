import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapKnowledge,bootstrapSeo,bootstrapSocial,persistenceEnvelope,BOOTSTRAP_TIER_ENGINE_IDS} from '../multicompany/bootstrap-tier-v1.mjs';

const base=(engine_id,payload={})=>({company_id:'acme',engine_id,environment:'PREPROD',evidence_sha256:`${engine_id}`.padEnd(64,'a').slice(0,64),payload,human_required_code:null,prod_authorized:false,prod_write_authorized:false,trading_access:false});
const kw=base('KW-001',{opportunities:[{keyword:'hipoteca 100'},{keyword:'financiacion vivienda'}]});
const waud=base('WAUD-001',{finding_count:2});
const soc=base('SOCAUD-001',{profile_count:2});
const local=base('LOCALP-001',{finding_count:1});

test('all three logical bootstrap engines remain PREPROD read-only zero-cost',()=>{
  const cases=[
    bootstrapKnowledge({company_id:'acme',evidence_at:'2026-10-13T13:30:00Z',keyword_audit:kw,website_audit:waud,social_audit:soc,local_audit:local,rules:['cite sources'],glossary:['pre-ok'],products:['hipoteca'],processes:['onboarding']}),
    bootstrapSeo({company_id:'acme',evidence_at:'2026-10-13T13:30:00Z',keyword_audit:kw,website_audit:waud,local_audit:local,url_inventory:['https://acme.example/hipotecas'],content_topics:['documentacion hipotecaria']}),
    bootstrapSocial({company_id:'acme',evidence_at:'2026-10-13T13:30:00Z',social_audit:soc,brand_context:{company_id:'acme',tone_ref:'brand-v1'},business_context:{company_id:'acme',audience_ref:'familias'},content_pillars:['educacion'],formats:['reel'],cadence:['weekly']})
  ];
  assert.deepEqual(cases.map(x=>x.engine_id),BOOTSTRAP_TIER_ENGINE_IDS);
  for(const result of cases){
    assert.equal(result.environment,'PREPROD');
    assert.equal(result.read_only,true);
    assert.equal(result.remote_write,false);
    assert.equal(result.publish_authorized,false);
    assert.equal(result.prod_authorized,false);
    assert.equal(result.prod_write_authorized,false);
    assert.equal(result.trading_access,false);
    assert.equal(result.additional_cost_eur,0);
    assert.equal(result.human_required_code,null);
    assert.match(result.evidence_sha256,/^[0-9a-f]{64}$/);
    assert.match(result.result_sha256,/^[0-9a-f]{64}$/);
  }
});

test('KBOOT creates company namespace with provenance and no cross-company merge',()=>{
  const result=bootstrapKnowledge({company_id:'acme',evidence_at:'x',keyword_audit:kw,website_audit:waud,social_audit:soc,local_audit:local});
  assert.equal(result.payload.namespace_id,'acme:knowledge:v1');
  assert.equal(result.payload.provenance_required,true);
  assert.ok(result.payload.source_count>=4);
  assert.throws(()=>bootstrapKnowledge({company_id:'other',evidence_at:'x',keyword_audit:kw,website_audit:waud,social_audit:soc,local_audit:local}),/POLICY_CONFLICT/);
});

test('SEOBOOT maps only observed keyword evidence and declared URLs without publishing',()=>{
  const result=bootstrapSeo({company_id:'acme',evidence_at:'x',keyword_audit:kw,website_audit:waud,url_inventory:['https://acme.example/hipotecas']});
  assert.equal(result.payload.keyword_count,2);
  assert.equal(result.payload.publish_authorized,false);
  assert.equal(result.payload.external_metrics_fabricated,false);
  assert.ok(result.payload.keyword_url_map.every(x=>x.url==='https://acme.example/hipotecas'));
});

test('SOCBOOT is planning only and needs observed social evidence',()=>{
  const result=bootstrapSocial({company_id:'acme',evidence_at:'x',social_audit:soc,content_pillars:['educacion'],formats:['reel']});
  assert.equal(result.payload.planning_only,true);
  assert.equal(result.payload.publish_authorized,false);
  const empty=base('SOCAUD-001',{profile_count:0});
  assert.equal(bootstrapSocial({company_id:'acme',evidence_at:'x',social_audit:empty}).human_required_code,'LOW_CONFIDENCE');
});

test('missing KBOOT provenance and missing SEO keywords fail to canonical LOW_CONFIDENCE',()=>{
  const noHashes=(id,payload={})=>({company_id:'acme',engine_id:id,environment:'PREPROD',payload,human_required_code:null,prod_authorized:false,prod_write_authorized:false,trading_access:false});
  const k=bootstrapKnowledge({company_id:'acme',evidence_at:'x',keyword_audit:noHashes('KW-001'),website_audit:noHashes('WAUD-001'),social_audit:noHashes('SOCAUD-001'),local_audit:noHashes('LOCALP-001')});
  assert.equal(k.human_required_code,'LOW_CONFIDENCE');
  const seo=bootstrapSeo({company_id:'acme',evidence_at:'x',keyword_audit:noHashes('KW-001',{opportunities:[]}),website_audit:noHashes('WAUD-001',{finding_count:0})});
  assert.equal(seo.human_required_code,'LOW_CONFIDENCE');
});

test('secret-like and cross-company evidence fail closed',()=>{
  assert.throws(()=>bootstrapSeo({company_id:'acme',evidence_at:'x',keyword_audit:kw,website_audit:waud,content_topics:[{api_key:'x'}]}),/SECURITY_INCIDENT/);
  assert.throws(()=>bootstrapSocial({company_id:'acme',evidence_at:'x',social_audit:soc,brand_context:{company_id:'other'}}),/POLICY_CONFLICT/);
});

test('persistence envelope contains bounded metadata only',()=>{
  const result=bootstrapSeo({company_id:'acme',evidence_at:'x',keyword_audit:kw,website_audit:waud,url_inventory:['https://acme.example/']});
  const envelope=persistenceEnvelope(result,{idempotency_key:'seo:1',recorded_by:'ci'});
  assert.deepEqual(Object.keys(envelope).sort(),[
    'additional_cost_eur','company_id','engine_id','evidence_at','evidence_sha256','human_required_code','idempotency_key','item_count','prod_authorized','prod_write_authorized','publish_authorized','recorded_by','result_sha256','source_count','trading_access','version'
  ]);
  assert.equal(JSON.stringify(envelope).includes('hipoteca 100'),false);
});
