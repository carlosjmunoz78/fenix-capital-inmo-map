import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapApp,bootstrapAutomation,bootstrapTraining,activateEngineSet,persistenceEnvelope,FINAL_ONBOARDING_ENGINE_IDS} from '../multicompany/final-onboarding-chain-v1.mjs';

const up=(engine_id,hex='a')=>({company_id:'acme',engine_id,environment:'PREPROD',evidence_sha256:hex.repeat(64).slice(0,64),human_required_code:null,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
const k=up('KBOOT-001','1');
const crm=up('CRMBOOT-001','2');
const seo=up('SEOBOOT-001','3');
const soc=up('SOCBOOT-001','4');
const mkt=up('MKTBOOT-001','5');
const tenant=up('TENANT-001','6');

test('APPBOOT reuses FACT App Factory and remains plan-only PREPROD',()=>{
  const r=bootstrapApp({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,crm_bootstrap:crm,app_slug:'acme-app',surface:'PWA',brand_tokens_ref:'brand:acme',requirements_ref:'requirements:acme'});
  assert.equal(r.engine_id,'APPBOOT-001');
  assert.equal(r.payload.wrapped_owner,'FACT-001');
  assert.equal(r.payload.wrapped_capability,'BRAND-COMMERCE-APPFACTORY');
  assert.equal(r.payload.deploy,false); assert.equal(r.payload.publish,false); assert.equal(r.prod_authorized,false); assert.equal(r.additional_cost_eur,0);
});

test('AUTBOOT composes EVT JOB AUTO without dispatch',()=>{
  const app=bootstrapApp({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,crm_bootstrap:crm,app_slug:'acme-app',brand_tokens_ref:'brand:acme',requirements_ref:'requirements:acme'});
  const r=bootstrapAutomation({company_id:'acme',evidence_at:'x',crm_bootstrap:crm,app_bootstrap:app,event_types:['lead_scored'],job_types:['followup']});
  assert.equal(r.engine_id,'AUTBOOT-001'); assert.deepEqual(r.payload.composed_engines,['EVT-001','JOB-001','AUTO-001']); assert.equal(r.payload.dispatch_authorized,false); assert.equal(r.payload.external_execution_authorized,false);
});

test('TRNBOOT reuses TRN LRN EVA and never trains PROD automatically',()=>{
  const app=bootstrapApp({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,crm_bootstrap:crm,app_slug:'acme-app',brand_tokens_ref:'brand:acme',requirements_ref:'requirements:acme'});
  const aut=bootstrapAutomation({company_id:'acme',evidence_at:'x',crm_bootstrap:crm,app_bootstrap:app});
  const r=bootstrapTraining({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,automation_bootstrap:aut,learning_tracks:['ops']});
  assert.equal(r.engine_id,'TRNBOOT-001'); assert.deepEqual(r.payload.composed_engines,['TRN-001','LRN-001','EVA-001']); assert.equal(r.payload.automatic_prod_training,false); assert.equal(r.payload.raw_training_data,false);
});

test('ENGACT requires exact canonical green dependency evidence and still grants no PROD',()=>{
  const app=bootstrapApp({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,crm_bootstrap:crm,app_slug:'acme-app',brand_tokens_ref:'brand:acme',requirements_ref:'requirements:acme'});
  const aut=bootstrapAutomation({company_id:'acme',evidence_at:'x',crm_bootstrap:crm,app_bootstrap:app});
  const trn=bootstrapTraining({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,automation_bootstrap:aut});
  const r=activateEngineSet({company_id:'acme',evidence_at:'x',tenant_guard:tenant,seo_bootstrap:seo,social_bootstrap:soc,marketing_bootstrap:mkt,crm_bootstrap:crm,app_bootstrap:app,automation_bootstrap:aut,training_bootstrap:trn});
  assert.equal(r.engine_id,'ENGACT-001'); assert.equal(r.payload.source_count,8); assert.equal(r.payload.prod_promotion,false); assert.equal(r.payload.next_gate,'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED');
});

test('cross-company, forbidden data and authority expansion fail closed',()=>{
  assert.throws(()=>bootstrapApp({company_id:'other',evidence_at:'x',knowledge_bootstrap:k,crm_bootstrap:crm,app_slug:'other-app',brand_tokens_ref:'brand:other',requirements_ref:'requirements:other'}),/POLICY_CONFLICT/);
  assert.throws(()=>bootstrapAutomation({company_id:'acme',evidence_at:'x',crm_bootstrap:{...crm,prod_authorized:true},app_bootstrap:up('APPBOOT-001','7')}),/POLICY_CONFLICT/);
  assert.throws(()=>bootstrapTraining({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,automation_bootstrap:up('AUTBOOT-001','8'),learning_tracks:[{email:'x'}]}),/SECURITY_INCIDENT/);
});

test('all four runtime outputs remain bounded PREPROD zero-cost',()=>{
  const app=bootstrapApp({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,crm_bootstrap:crm,app_slug:'acme-app',brand_tokens_ref:'brand:acme',requirements_ref:'requirements:acme'});
  const aut=bootstrapAutomation({company_id:'acme',evidence_at:'x',crm_bootstrap:crm,app_bootstrap:app});
  const trn=bootstrapTraining({company_id:'acme',evidence_at:'x',knowledge_bootstrap:k,automation_bootstrap:aut});
  const act=activateEngineSet({company_id:'acme',evidence_at:'x',tenant_guard:tenant,seo_bootstrap:seo,social_bootstrap:soc,marketing_bootstrap:mkt,crm_bootstrap:crm,app_bootstrap:app,automation_bootstrap:aut,training_bootstrap:trn});
  assert.deepEqual([app.engine_id,aut.engine_id,trn.engine_id,act.engine_id],FINAL_ONBOARDING_ENGINE_IDS);
  for(const r of [app,aut,trn,act]){assert.equal(r.environment,'PREPROD');assert.equal(r.plan_only,true);assert.equal(r.prod_authorized,false);assert.equal(r.prod_write_authorized,false);assert.equal(r.trading_access,false);assert.equal(r.additional_cost_eur,0);assert.equal(r.human_required_code,null);}
  const env=persistenceEnvelope(act,{idempotency_key:'act:1',recorded_by:'ci'}); assert.equal(env.item_count,8); assert.equal(JSON.stringify(env).includes('customer'),false);
});
