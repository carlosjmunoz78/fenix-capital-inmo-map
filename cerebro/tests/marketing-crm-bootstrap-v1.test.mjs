import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapMarketing,bootstrapCrm,persistenceEnvelope,MARKETING_CRM_ENGINE_IDS} from '../multicompany/marketing-crm-bootstrap-v1.mjs';

const upstream=(engine_id,evidence_sha256)=>({company_id:'acme',engine_id,environment:'PREPROD',evidence_sha256,payload:{},human_required_code:null,prod_authorized:false,prod_write_authorized:false,trading_access:false});
const k=upstream('KBOOT-001','a'.repeat(64));
const seo=upstream('SEOBOOT-001','b'.repeat(64));
const soc=upstream('SOCBOOT-001','c'.repeat(64));

test('marketing plan is organic-first, publication-closed and zero-cost',()=>{
  const r=bootstrapMarketing({company_id:'acme',evidence_at:'2026-10-13T14:30:00Z',knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc,objectives:['qualified leads'],channels:['seo','social'],campaigns:['education'],budget_eur:0});
  assert.equal(r.engine_id,'MKTBOOT-001');
  assert.equal(r.human_required_code,null);
  assert.equal(r.payload.organic_first,true);
  assert.equal(r.payload.paid_media_authorized,false);
  assert.equal(r.publish_authorized,false);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.trading_access,false);
  assert.equal(r.additional_cost_eur,0);
  assert.equal(r.payload.source_refs.length,3);
});

test('positive marketing budget becomes canonical MONEY_LIMIT and never authorizes paid media',()=>{
  const r=bootstrapMarketing({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc,objectives:['leads'],channels:['seo'],budget_eur:1});
  assert.equal(r.human_required_code,'MONEY_LIMIT');
  assert.equal(r.payload.paid_media_authorized,false);
  assert.equal(r.additional_cost_eur,0);
});

test('CRM bootstrap wraps an existing CRM instead of replacing or copying customer data',()=>{
  const r=bootstrapCrm({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,existing_crm_ref:'existing-crm://acme',integration_refs:['existing-automation']});
  assert.equal(r.engine_id,'CRMBOOT-001');
  assert.equal(r.human_required_code,null);
  assert.equal(r.payload.mode,'WRAP_EXISTING');
  assert.equal(r.payload.existing_crm_reference_present,true);
  assert.equal(r.payload.schema_write_authorized,false);
  assert.equal(r.payload.customer_data_copy_authorized,false);
  assert.equal(r.payload.destructive_migration_authorized,false);
  assert.equal(r.payload.existing_crm_ref_sha256.length,64);
  assert.equal(JSON.stringify(r).includes('existing-crm://acme'),false);
});

test('CRM without existing contract or declared stages fails to LOW_CONFIDENCE',()=>{
  const r=bootstrapCrm({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k});
  assert.equal(r.human_required_code,'LOW_CONFIDENCE');
});

test('cross-company upstream and secret-like input fail closed',()=>{
  const other={...k,company_id:'other'};
  assert.throws(()=>bootstrapCrm({company_id:'acme',evidence_at:'x',knowledge_bootstrap:other,existing_crm_ref:'x'}),/POLICY_CONFLICT/);
  assert.throws(()=>bootstrapMarketing({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc,campaigns:[{api_key:'x'}]}),/SECURITY_INCIDENT/);
});

test('persistence envelopes expose bounded metadata only',()=>{
  const m=bootstrapMarketing({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc,objectives:['leads'],channels:['seo'],budget_eur:0});
  const c=bootstrapCrm({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,existing_crm_ref:'existing-crm://acme'});
  assert.deepEqual([m.engine_id,c.engine_id],MARKETING_CRM_ENGINE_IDS);
  for(const r of [m,c]){
    const e=persistenceEnvelope(r,{idempotency_key:`${r.engine_id}:1`,recorded_by:'ci'});
    assert.equal(e.prod_authorized,false);
    assert.equal(e.prod_write_authorized,false);
    assert.equal(e.publish_authorized,false);
    assert.equal(e.trading_access,false);
    assert.equal(e.additional_cost_eur,0);
    assert.equal(JSON.stringify(e).includes('existing-crm://acme'),false);
  }
});
