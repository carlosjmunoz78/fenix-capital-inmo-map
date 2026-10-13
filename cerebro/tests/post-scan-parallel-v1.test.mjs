import test from 'node:test';
import assert from 'node:assert/strict';
import {auditKeywords,auditWebsite,auditSocial,auditLocal,persistenceEnvelope,POST_SCAN_ENGINE_IDS} from '../multicompany/post-scan-parallel-v1.mjs';

const scan={company_id:'acme',engine_id:'SCAN-001',environment:'PREPROD',read_only:true,social_profiles:{instagram:['https://instagram.com/acme']}};

test('all four logical post-SCAN engines remain PREPROD read-only zero-cost',()=>{
  const cases=[
    auditKeywords({company_id:'acme',evidence_at:'2026-10-13T07:00:00Z',scan_result:scan,declared_seed_terms:['hipoteca 100'],locations:['cordoba'],public_terms:['financiacion vivienda']}),
    auditWebsite({company_id:'acme',evidence_at:'2026-10-13T07:00:00Z',scan_result:scan,pages:[{url:'https://acme.example/',status:200,html:'<html><head><title>Acme</title><meta name="description" content="x"><link rel="canonical" href="https://acme.example/"><meta name="viewport" content="width=device-width"></head><body><h1>Acme</h1></body></html>'}]}),
    auditSocial({company_id:'acme',evidence_at:'2026-10-13T07:00:00Z',scan_result:scan,public_social_evidence:[{company_id:'acme',platform:'instagram',url:'https://instagram.com/acme',followers:100,posts:[{format:'reel'}]}]}),
    auditLocal({company_id:'acme',evidence_at:'2026-10-13T07:00:00Z',scan_result:scan,declared_business:{company_id:'acme',name:'Acme',address:'Calle 1',phone:'957000000',categories:['broker hipotecario']},public_local_evidence:{company_id:'acme',name:'Acme',address:'Calle 1',phone:'957000000',categories:['broker hipotecario'],review_count:10,rating:4.8}})
  ];
  assert.deepEqual(cases.map(x=>x.engine_id),POST_SCAN_ENGINE_IDS);
  for(const result of cases){
    assert.equal(result.environment,'PREPROD');
    assert.equal(result.read_only,true);
    assert.equal(result.remote_write,false);
    assert.equal(result.prod_authorized,false);
    assert.equal(result.prod_write_authorized,false);
    assert.equal(result.trading_access,false);
    assert.equal(result.additional_cost_eur,0);
    assert.equal(result.human_required_code,null);
    assert.match(result.evidence_sha256,/^[0-9a-f]{64}$/);
    assert.match(result.result_sha256,/^[0-9a-f]{64}$/);
  }
});

test('KW never fabricates external search metrics',()=>{
  const result=auditKeywords({company_id:'acme',evidence_at:'x',scan_result:scan,declared_seed_terms:['hipoteca 100'],locations:['cordoba']});
  assert.equal(result.payload.external_metrics_fabricated,false);
  assert.ok(result.payload.opportunities.every(x=>x.external_metrics==='unknown_without_authorized_source'));
});

test('WAUD only audits supplied public snapshots and does not fetch',()=>{
  const result=auditWebsite({company_id:'acme',evidence_at:'x',scan_result:scan,pages:[{url:'https://acme.example/',status:200,html:'<html><body><img src="a.jpg"></body></html>'}]});
  assert.equal(result.payload.pages_audited,1);
  assert.ok(result.payload.findings.some(x=>x.code==='MISSING_TITLE'));
  assert.ok(result.payload.findings.some(x=>x.code==='IMAGE_ALT_MISSING'));
});

test('SOCAUD and LOCALP use public evidence only with no publishing/API mutation',()=>{
  const social=auditSocial({company_id:'acme',evidence_at:'x',scan_result:scan,public_social_evidence:[]});
  assert.equal(social.payload.profile_count,1);
  assert.equal(social.human_required_code,null);
  const local=auditLocal({company_id:'acme',evidence_at:'x',scan_result:scan,declared_business:{name:'Acme',address:'A',phone:'1'},public_local_evidence:{name:'Acme',address:'B',phone:'1'}});
  assert.ok(local.payload.findings.some(x=>x.field==='address'&&x.status==='mismatch'));
});

test('missing evidence becomes canonical LOW_CONFIDENCE instead of fake GREEN',()=>{
  const emptyScan={company_id:'acme',engine_id:'SCAN-001',environment:'PREPROD',read_only:true,social_profiles:{}};
  assert.equal(auditKeywords({company_id:'acme',evidence_at:'x',scan_result:emptyScan}).human_required_code,'LOW_CONFIDENCE');
  assert.equal(auditWebsite({company_id:'acme',evidence_at:'x',scan_result:emptyScan,pages:[]}).human_required_code,'LOW_CONFIDENCE');
  assert.equal(auditSocial({company_id:'acme',evidence_at:'x',scan_result:emptyScan,public_social_evidence:[]}).human_required_code,'LOW_CONFIDENCE');
  assert.equal(auditLocal({company_id:'acme',evidence_at:'x',scan_result:emptyScan,declared_business:{},public_local_evidence:{}}).human_required_code,'LOW_CONFIDENCE');
});

test('secret-like evidence and cross-company evidence fail closed',()=>{
  assert.throws(()=>auditKeywords({company_id:'acme',evidence_at:'x',scan_result:scan,public_terms:[{api_key:'x'}]}),/SECURITY_INCIDENT/);
  assert.throws(()=>auditSocial({company_id:'acme',evidence_at:'x',scan_result:scan,public_social_evidence:[{company_id:'other'}]}),/POLICY_CONFLICT/);
  assert.throws(()=>auditLocal({company_id:'acme',evidence_at:'x',scan_result:scan,declared_business:{company_id:'other'},public_local_evidence:{}}),/POLICY_CONFLICT/);
});

test('persistence envelope contains only bounded metadata and canonical human exception',()=>{
  const result=auditWebsite({company_id:'acme',evidence_at:'x',scan_result:scan,pages:[]});
  const envelope=persistenceEnvelope(result,{idempotency_key:'waud:1',recorded_by:'ci'});
  assert.deepEqual(Object.keys(envelope).sort(),[
    'additional_cost_eur','company_id','engine_id','evidence_at','evidence_sha256','finding_count','human_required_code','idempotency_key','item_count','prod_authorized','prod_write_authorized','recorded_by','result_sha256','trading_access','version'
  ]);
  assert.equal(envelope.human_required_code,'LOW_CONFIDENCE');
  assert.equal(JSON.stringify(envelope).includes('<html>'),false);
});
