import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadRealDomainEvidenceRegistry,
  signalsFromWorkflowRun,
  signalsFromPublicProbes,
  signalsFromExternalDispatch,
  buildRealDomainEvidenceReport,
  realDomainEvidenceCoverage,
  RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT
} from '../runtime/rsi-real-domain-evidence-wiring.mjs';

const SHA='d21dba29c5e377bef4073600e05e24646c2de59c';
const AT='2026-10-09T05:34:49Z';

function workflow(overrides={}){
  return {name:'PROD Runtime Smoke',run_id:37889224218,run_attempt:1,head_sha:SHA,head_branch:'main',event:'push',conclusion:'success',updated_at:AT,...overrides};
}

function assertSafe(event){
  assert.equal(event.company_id,'fenix');
  assert.equal(event.environment,'PREPROD_CANDIDATE');
  assert.equal(event.contains_customer_data,false);
  assert.equal(event.contains_secrets,false);
  assert.equal(event.prod_authorized,false);
  assert.equal(event.prod_write_authorized,false);
  assert.equal(event.trading_access,false);
  assert.equal(event.additional_cost_eur,0);
}

test('registry covers every registered Fenix domain policy and remains fail-closed',()=>{
  const registry=loadRealDomainEvidenceRegistry();
  const coverage=realDomainEvidenceCoverage({registry});
  assert.equal(registry.company_id,'fenix');
  assert.equal(registry.environment,'PREPROD');
  assert.equal(registry.policy_domain_count,10);
  assert.equal(registry.covered_domain_count,10);
  assert.equal(coverage.coverage_complete,true);
  assert.equal(coverage.next_gate,'HUMAN_EXCEPTION_SUPERVISOR_V0');
  assert.equal(coverage.prod_authorized,false);
  assert.equal(coverage.trading_access,false);
  assert.equal(coverage.additional_cost_eur,0);
});

test('real PROD runtime smoke becomes read-only learning evidence for APP CRM DATA and KNW only',()=>{
  const signals=signalsFromWorkflowRun(workflow());
  assert.deepEqual(signals.map((x)=>x.engine_id).sort(),['APP-001','CRM-001','DATA-001','KNW-001']);
  const report=buildRealDomainEvidenceReport({mode:'workflow_run',input:workflow()});
  assert.equal(report.status,'REAL_DOMAIN_EVIDENCE_GREEN');
  assert.equal(report.events_total,4);
  for(const event of report.events){
    assertSafe(event);
    assert.equal(event.source_type,'ENGINE_RESULT');
    assert.equal(event.source_environment,'PROD');
    assert.ok(event.evidence_refs.includes('github-actions-run:37889224218'));
    assert.ok(event.evidence_refs.includes(`git:${SHA}`));
  }
});

test('failed live workflow maps to ENGINE_ERROR without granting authority',()=>{
  const report=buildRealDomainEvidenceReport({mode:'workflow_run',input:workflow({run_id:37889999999,conclusion:'failure'})});
  assert.equal(report.events_total,4);
  for(const event of report.events){
    assertSafe(event);
    assert.equal(event.source_type,'ENGINE_ERROR');
    assert.equal(event.severity,'HIGH');
    assert.equal(event.risk_class,'MEDIUM');
  }
});

test('learning control plane becomes automatic evidence for AUTO TRN and LRN',()=>{
  const report=buildRealDomainEvidenceReport({mode:'workflow_run',input:workflow({name:'CEREBRO RSI Learning Control Plane V0',run_id:37890000001,head_sha:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',source_environment:'PREPROD'})});
  assert.deepEqual(report.events.map((x)=>x.engine_id).sort(),['AUTO-001','LRN-001','TRN-001']);
  for(const event of report.events){assertSafe(event);assert.equal(event.source_environment,'PREPROD');}
});

test('unregistered workflow is an idempotent no-op, not guessed domain evidence',()=>{
  const report=buildRealDomainEvidenceReport({mode:'workflow_run',input:workflow({name:'Unknown Workflow',run_id:37890000002})});
  assert.equal(report.status,'NO_REGISTERED_SIGNAL_FOR_SOURCE');
  assert.equal(report.events_total,0);
  assert.deepEqual(report.events,[]);
  assert.equal(report.prod_authorized,false);
});

test('public probes wire homepage to WEB and MKT and robots to SEO',()=>{
  const probes=[
    {url:'https://fenixcapital.es/',http_status:200,latency_ms:123,observed_at:AT},
    {url:'https://fenixcapital.es/robots.txt',http_status:200,latency_ms:71,observed_at:AT}
  ];
  const report=buildRealDomainEvidenceReport({mode:'public_probe',input:probes});
  assert.deepEqual(report.events.map((x)=>x.engine_id).sort(),['MKT-001','SEO-001','WEB-001']);
  for(const event of report.events){
    assertSafe(event);
    assert.equal(event.source_type,'METRIC_OBSERVATION');
    assert.equal(event.source_environment,'PROD');
  }
});

test('public HTTP failure becomes OBSERVABILITY_ALERT and never writes PROD',()=>{
  const report=buildRealDomainEvidenceReport({mode:'public_probe',input:[{url:'https://fenixcapital.es/robots.txt',http_status:503,latency_ms:411,observed_at:AT}]});
  assert.equal(report.events_total,1);
  assert.equal(report.events[0].engine_id,'SEO-001');
  assert.equal(report.events[0].source_type,'OBSERVABILITY_ALERT');
  assert.equal(report.events[0].risk_class,'MEDIUM');
  assertSafe(report.events[0]);
});

test('external sanitized dispatch accepts exact registered domain and canonicalizes through universal ingress',()=>{
  const payload={
    company_id:'fenix',engine_id:'SEO-001',domain_id:'fenix.seo',signal_id:'seo:plugin:health:001',signal_type:'METRIC_OBSERVATION',version:'core-guard-observed-v1',observed_at:AT,
    severity:'INFO',risk_class:'LOW',reason:'Authorized SEO plugin emitted a sanitized health metric.',
    metric:{name:'seo_health',direction:'HIGHER',measurement:'AUTHORIZED_SANITIZED_PLUGIN_EVIDENCE'},
    evidence_refs:['plugin:evidence:seo-health-001'],external_source:'fenix-core-guard-plugin',
    contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  const signals=signalsFromExternalDispatch(payload);
  assert.equal(signals.length,1);
  const report=buildRealDomainEvidenceReport({mode:'external_dispatch',input:payload});
  assert.equal(report.events_total,1);
  assert.equal(report.events[0].engine_id,'SEO-001');
  assertSafe(report.events[0]);
});

test('external dispatch fails closed on unknown domain, secrets/customer-data assertions, PROD authority or cost',()=>{
  const base={company_id:'fenix',engine_id:'SEO-001',domain_id:'fenix.seo',signal_id:'x',signal_type:'ENGINE_EVENT',version:'v1',observed_at:AT,reason:'safe evidence',external_source:'authorized-plugin',contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  assert.throws(()=>signalsFromExternalDispatch({...base,domain_id:'fenix.unknown'}),/not registered/);
  assert.throws(()=>signalsFromExternalDispatch({...base,contains_secrets:true}),/authority\/data\/cost violation/);
  assert.throws(()=>signalsFromExternalDispatch({...base,contains_customer_data:true}),/authority\/data\/cost violation/);
  assert.throws(()=>signalsFromExternalDispatch({...base,prod_authorized:true}),/authority\/data\/cost violation/);
  assert.throws(()=>signalsFromExternalDispatch({...base,additional_cost_eur:1}),/authority\/data\/cost violation/);
});

test('registry loader rejects authority drift and missing domain coverage',()=>{
  const original=JSON.parse(fs.readFileSync(new URL('../registry/rsi-domain-evidence-sources.v0.json',import.meta.url),'utf8'));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rsi-domain-evidence-'));
  const drift=path.join(root,'drift.json');
  fs.writeFileSync(drift,JSON.stringify({...original,prod_authorized:true}));
  assert.throws(()=>loadRealDomainEvidenceRegistry({source_registry_path:drift}),/authority\/cost drift/);
  const missing=path.join(root,'missing.json');
  fs.writeFileSync(missing,JSON.stringify({...original,bindings:original.bindings.filter((x)=>x.engine_id!=='SEO-001')}));
  assert.throws(()=>loadRealDomainEvidenceRegistry({source_registry_path:missing}),/without automatic evidence source/);
});

test('contract preserves existing learning/outbox chain and next gate',()=>{
  assert.equal(RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT.environment,'PREPROD');
  assert.equal(RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT.company_id,'fenix');
  assert.equal(RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT.universal_ingress,'universal-learning-ingress.mjs');
  assert.equal(RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT.outbox,'rsi-event-outbox.mjs');
  assert.equal(RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT.prod_authorized,false);
  assert.equal(RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT.trading_access,false);
  assert.equal(RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT.multicompany_continuation,false);
  assert.equal(RSI_REAL_DOMAIN_EVIDENCE_WIRING_CONTRACT.next_gate,'HUMAN_EXCEPTION_SUPERVISOR_V0');
});
