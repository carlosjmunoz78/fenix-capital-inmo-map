import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCompanyRecordsFromOverpassV0, CAP_OSM_CORDOBA_V0_CONTRACT } from '../runtime/cap-osm-cordoba-v0.mjs';

const sample={elements:[
  {type:'node',id:101,tags:{name:'Inmo Uno',office:'estate_agent',website:'https://www.inmouno.es',phone:'+34957000000',email:'persona@example.com'}},
  {type:'way',id:202,tags:{name:'Inmo Dos',shop:'estate_agent','contact:website':'inmodos.com',contact_phone:'999'}},
  {type:'node',id:303,tags:{name:'Solo Social',office:'estate_agent',website:'https://facebook.com/solosocial'}},
  {type:'node',id:404,tags:{name:'Sin Web',office:'estate_agent',phone:'123'}},
  {type:'node',id:505,tags:{office:'estate_agent',website:'https://noname.es'}}
]};

test('CAP OSM contract is PREPROD GET-only zero-cost and side-effect free',()=>{
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.environment,'PREPROD');
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.engine_id,'CAP-001');
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.method,'GET_ONLY');
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.raw_body_persisted,false);
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.personal_contacts_generated,false);
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.outreach,false);
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.crm_writes,false);
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.prod_authorized,false);
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.trading_access,false);
  assert.equal(CAP_OSM_CORDOBA_V0_CONTRACT.additional_cost_eur,0);
});

test('OSM extraction keeps company-level allowlist only and drops personal contact fields',()=>{
  const out=extractCompanyRecordsFromOverpassV0(sample,{observed_at:'2026-10-15T07:00:00Z'});
  assert.equal(out.records.length,2);
  assert.deepEqual(out.records.map(x=>x.domain),['inmodos.com','inmouno.es']);
  assert.equal(out.stats.raw_elements,5);
  assert.equal(out.stats.dropped_social_only,1);
  assert.equal(out.stats.dropped_missing_domain,1);
  assert.equal(out.stats.dropped_missing_name,1);
  const json=JSON.stringify(out);
  assert.equal(json.includes('+34957000000'),false);
  assert.equal(json.includes('persona@example.com'),false);
  assert.equal(json.includes('999'),false);
  assert.equal(json.includes('phone'),false);
  assert.equal(json.includes('email'),false);
});

test('records are public, company scoped and deterministic',()=>{
  const a=extractCompanyRecordsFromOverpassV0(sample,{observed_at:'2026-10-15T07:00:00Z'});
  const b=extractCompanyRecordsFromOverpassV0(sample,{observed_at:'2026-10-15T07:00:00Z'});
  assert.deepEqual(a,b);
  for(const row of a.records){
    assert.equal(row.sector,'real_estate_agency');
    assert.equal(row.geography,'cordoba');
    assert.equal(row.source_access,'PUBLIC');
    assert.match(row.source_url,/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/);
    assert.deepEqual(row.signals,['public_osm_estate_agent','website_present']);
  }
});
