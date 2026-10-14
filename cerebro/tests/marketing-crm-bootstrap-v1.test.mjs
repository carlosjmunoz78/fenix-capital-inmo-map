import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapMarketing,bootstrapCrm,persistenceEnvelope,MARKETING_CRM_BOOTSTRAP_ENGINE_IDS} from '../multicompany/marketing-crm-bootstrap-v1.mjs';

const upstream=(engine_id,hash)=>({company_id:'acme',engine_id,environment:'PREPROD',evidence_sha256:hash.padEnd(64,'a').slice(0,64),human_required_code:null,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
const k=upstream('KBOOT-001','1');
const seo=upstream('SEOBOOT-001','2');
const soc=upstream('SOCBOOT-001','3');

test('marketing and crm bootstrap stay PREPROD plan-only zero-cost',()=>{
  const m=bootstrapMarketing({company_id:'acme',evidence_at:'2026-10-14T12:00:00Z',knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc,segments:['familias'],offers:['hipoteca'],channels:['web'],funnel_stages:['lead']});
  const c=bootstrapCrm({company_id:'acme',evidence_at:'2026-10-14T12:00:00Z',knowledge_bootstrap:k,pipeline_stages:['lead','qualified'],required_fields:['status'],automation_hooks:['lead_scored']});
  assert.deepEqual([m.engine_id,c.engine_id],MARKETING_CRM_BOOTSTRAP_ENGINE_IDS);
  for(const r of [m,c]){
    assert.equal(r.environment,'PREPROD'); assert.equal(r.plan_only,true); assert.equal(r.read_only,true);
    assert.equal(r.remote_write,false); assert.equal(r.publish_authorized,false); assert.equal(r.crm_write_authorized,false); assert.equal(r.spend_authorized,false);
    assert.equal(r.prod_authorized,false); assert.equal(r.prod_write_authorized,false); assert.equal(r.trading_access,false); assert.equal(r.additional_cost_eur,0);
    assert.equal(r.human_required_code,null); assert.match(r.evidence_sha256,/^[0-9a-f]{64}$/); assert.match(r.result_sha256,/^[0-9a-f]{64}$/);
  }
});

test('marketing requires exactly the three canonical bootstrap sources',()=>{
  const r=bootstrapMarketing({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc});
  assert.equal(r.payload.source_count,3);
  assert.deepEqual(r.payload.source_refs.sort(),[k.evidence_sha256,seo.evidence_sha256,soc.evidence_sha256].sort());
  assert.equal(r.payload.campaign_execution,false);
  assert.equal(r.payload.publishing,false);
});

test('crm wraps existing CRM boundary and never writes customer data',()=>{
  const r=bootstrapCrm({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,pipeline_stages:['lead']});
  assert.equal(r.payload.orchestration_target,'CRM-001');
  assert.equal(r.payload.crm_write_authorized,false);
  assert.equal(r.payload.customer_data_required,false);
});

test('cross-company, upstream authority expansion and forbidden pii fail closed',()=>{
  assert.throws(()=>bootstrapCrm({company_id:'other',evidence_at:'x',knowledge_bootstrap:k}),/POLICY_CONFLICT/);
  assert.throws(()=>bootstrapMarketing({company_id:'acme',evidence_at:'x',knowledge_bootstrap:{...k,prod_authorized:true},seo_bootstrap:seo,social_bootstrap:soc}),/POLICY_CONFLICT/);
  assert.throws(()=>bootstrapCrm({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,required_fields:[{email:'x'}]}),/SECURITY_INCIDENT/);
});

test('persistence envelope is bounded metadata only',()=>{
  const r=bootstrapMarketing({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc,segments:['familias'],channels:['web']});
  const e=persistenceEnvelope(r,{idempotency_key:'mkt:1',recorded_by:'ci'});
  assert.deepEqual(Object.keys(e).sort(),['additional_cost_eur','company_id','crm_write_authorized','engine_id','evidence_at','evidence_sha256','human_required_code','idempotency_key','item_count','prod_authorized','prod_write_authorized','publish_authorized','recorded_by','result_sha256','source_count','spend_authorized','trading_access','version'].sort());
  assert.equal(JSON.stringify(e).includes('familias'),false);
  assert.equal(JSON.stringify(e).includes('web'),false);
});
