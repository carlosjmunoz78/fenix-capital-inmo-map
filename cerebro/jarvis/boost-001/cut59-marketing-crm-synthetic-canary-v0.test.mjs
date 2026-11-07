import test from 'node:test';
import assert from 'node:assert/strict';
import {executeSyntheticCanary} from './cut59-marketing-crm-synthetic-canary-v0.mjs';
import {bootstrapMarketing,bootstrapCrm,persistenceEnvelope} from '../../multicompany/marketing-crm-bootstrap-v1.mjs';

const source=(engine_id,s)=>({
 company_id:'fenix',engine_id,environment:'PREPROD',
 evidence_sha256:s.repeat(64),human_required_code:null,
 prod_authorized:false,prod_write_authorized:false,
 trading_access:false,additional_cost_eur:0
});
const k=source('KBOOT-001','a'),seo=source('SEOBOOT-001','b'),soc=source('SOCBOOT-001','c');
test('CUT59 invokes both existing real JS engine functions, synthetic only, reproducibly',()=>{
 const a=executeSyntheticCanary(), b=executeSyntheticCanary();
 assert.deepEqual(a,b);
 assert.equal(a.runtime_success_count,2);
 assert.deepEqual(a.outputs.map(x=>x.engine_id),['MKTBOOT-001','CRMBOOT-001']);
 assert.equal(a.execution_type,'REAL_EXISTING_JS_ENGINE_FUNCTIONS_SYNTHETIC_INPUTS');
 assert.equal(a.source_hashes_synthetic,true);
 assert.equal(a.source_historical_proofs_reused,false);
 for(const row of a.outputs){
  assert.equal(row.runtime_completed_in_process,true);
  assert.equal(row.backend_receipt_created,false);
  assert.equal(row.synthetic_data_only,true);
  assert.match(row.evidence_sha256,/^[a-f0-9]{64}$/);
  assert.match(row.result_sha256,/^[a-f0-9]{64}$/);
 }
});
test('No App/CRM write, marketing publication, spend, tenant registration or LRN release',()=>{
 const s=executeSyntheticCanary();
 for(const k of ['actual_crm_read','actual_crm_write','actual_customer_data_used',
 'actual_marketing_publication','actual_budget_spend','supabase_rpc_called',
 'backend_receipt_created','live_production_integration_verified','stage_green_evidence',
 'app_preprod_restored','independent_external_tribunal_passed','lrn_ingest_authorized',
 'prod_write_authorized','production_ready'])assert.equal(s[k],false,k);
});
test('existing bootstrap security denies cross-company and forbidden personal data',()=>{
 assert.throws(()=>bootstrapMarketing({company_id:'other',evidence_at:'x',
   knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc}),/POLICY_CONFLICT/);
 assert.throws(()=>bootstrapCrm({company_id:'fenix',evidence_at:'x',
   knowledge_bootstrap:k,required_fields:[{customer_name:'secret'}]}),/SECURITY_INCIDENT/);
 assert.throws(()=>bootstrapMarketing({company_id:'fenix',evidence_at:'x',
   knowledge_bootstrap:k,seo_bootstrap:{...seo,trading_access:true},social_bootstrap:soc}),/POLICY_CONFLICT/);
});
test('real engine source always yields plan-only metadata, never a writable persistence RPC call',()=>{
 const m=bootstrapMarketing({company_id:'fenix',evidence_at:'2026-11-07T15:00:00Z',
   knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc,
   segments:['test'],offers:['test'],channels:['web'],funnel_stages:['visit']});
 const c=bootstrapCrm({company_id:'fenix',evidence_at:'2026-11-07T15:00:00Z',
   knowledge_bootstrap:k,pipeline_stages:['lead'],required_fields:['status']});
 for(const x of [m,c]){
  const env=persistenceEnvelope(x,{idempotency_key:'synthetic:'+x.engine_id,recorded_by:'test'});
  assert.equal(x.read_only,true);
  assert.equal(x.plan_only,true);
  assert.equal(env.prod_authorized,false);
  assert.equal(env.prod_write_authorized,false);
  assert.equal(env.additional_cost_eur,0);
  assert.equal(env.publish_authorized,false);
  assert.equal(env.crm_write_authorized,false);
  assert.equal(env.spend_authorized,false);
 }
});
