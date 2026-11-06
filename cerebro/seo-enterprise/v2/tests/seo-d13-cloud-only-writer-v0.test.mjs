import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateSeoDraftWithLocalModel} from '../runtime/seo-d13-local-autonomous-writer-v0.mjs';
import {loadIdentityCredentialFoundation} from '../../../governance/identity-credential-broker.mjs';
import {evaluateSeoCloudWriter,runSeoCloudWriter,SEO_D13_CLOUD_ONLY} from '../runtime/seo-d13-cloud-only-writer-v0.mjs';
const brief={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
 version:'0.1.0',work_id:'SEO001-FENIX-D13-LAB-003',
 content_type:'ARTICLE',persona:'PARTICULARES',
 topic:'Comparar viviendas en Córdoba',
 buyer_problem:'Una persona está entre dos pisos y necesita valorar costes',
 conversion_goal:'Solicitar un estudio hipotecario',focus_keyword:'comparar pisos Córdoba',
 cta_url:'https://fenixcapital.es/contacto/',source_readonly:true,
 customer_data_present:false,financial_claims_preverified:false,
 paid_provider_requested:false,wordpress_write_authorized:false,publish_authorized:false,
 sources:[
 {id:'wp_gastos',url:'https://fenixcapital.es/gastos-compra/',
 corpus_evidence_verified:true,quote_or_paraphrase:'Los gastos de compraventa pueden variar de una operación a otra y deben considerarse por separado.'},
 {id:'wp_contacto',url:'https://fenixcapital.es/contacto/',
 corpus_evidence_verified:true,quote_or_paraphrase:'La página de contacto de Fénix Capital permite pedir información sobre los servicios hipotecarios.'}]};
const lifecycle_state={credential_health:{
 'credref:cerebro-gemini-api-key':{usable:true,status:'HEALTHY_VALID_UNTIL'}
}};
const foundation=loadIdentityCredentialFoundation();
const fakeHtml=fs.readFileSync('cerebro/seo-enterprise/v2/drafts/2026-11-06-b2c-comparar-pisos-cordoba-v3-faq.draft.html','utf8');
test('cloud-only route reuses EXISTING IAM connector, never a local runtime',()=>{
 assert.equal(SEO_D13_CLOUD_ONLY.cloud_only,true);
 assert.equal(SEO_D13_CLOUD_ONLY.local_pc_required,false);
 assert.equal(SEO_D13_CLOUD_ONLY.local_ollama_required,false);
 assert.equal(SEO_D13_CLOUD_ONLY.allow_paid_fallback,false);
 const conn=foundation.connectors.connectors.find(x=>x.connector_id==='connector:gemini-free-lab');
 assert.equal(conn.environments.includes('LAB'),true);
 assert.equal(conn.environments.includes('PROD'),false);
});
test('zero-cost billing and IAM deny access before any cloud request',async()=>{
 assert.equal(evaluateSeoCloudWriter({brief}).reason,'CLOUD_SECRET_NOT_AVAILABLE');
 assert.equal(evaluateSeoCloudWriter({brief,has_secret:true}).reason,'CLOUD_FREE_NO_BILLING_GATE');
 assert.equal(evaluateSeoCloudWriter({brief,has_secret:true,provider_free_tier_confirmed:true}).reason,'CLOUD_FREE_NO_BILLING_GATE');
 assert.equal(evaluateSeoCloudWriter({brief,has_secret:true,provider_free_tier_confirmed:true,
 billing_disabled_confirmed:true}).reason,'CLOUD_IAM_ROUTE_NOT_READY');
 let calls=0;
 const x=await runSeoCloudWriter({brief,api_key:'mock-only-secret-not-real',
 fetch_impl:async()=>{calls++;throw Error('unexpected external request')}});
 assert.equal(x.status,'HOLD');assert.equal(calls,0);
 assert.equal(x.additional_cost_eur,0);
});
test('even forged true billing flags and synthetic IAM can never enable inference',async()=>{
 let calls=0;
 const fetch_impl=async()=>{calls++;throw Error('NETWORK MUST NOT BE CALLED')};
 const x=await runSeoCloudWriter({brief,api_key:'synthetic-stub-not-a-real-key',
  provider_free_tier_confirmed:true,billing_disabled_confirmed:true,
  lifecycle_state,foundation,fetch_impl});
 assert.equal(calls,0);
 assert.equal(x.status,'HOLD');
 assert.equal(x.reason,'GEMINI_PROJECT_BILLING_ATTESTATION_NOT_AVAILABLE_NO_INFERENCE');
 assert.equal(x.wordpress_writes,0);
 assert.equal(x.paid_api_calls,0);
 assert.equal(x.publish_authorized,false);
});
test('invalid company or source still fails route preflight, and the direct writer remains closed',async()=>{
 assert.throws(()=>evaluateSeoCloudWriter({brief:{...brief,company_id:'other'}}),/CLOUD_EDITORIAL_SCOPE_INVALID/);
 assert.throws(()=>evaluateSeoCloudWriter({brief:{...brief,sources:[]}}),/CLOUD_EDITORIAL_SOURCES/);
 const r=await runSeoCloudWriter({brief:{...brief,company_id:'other'},api_key:'synthetic-stub-not-a-real-key'});
 assert.equal(r.reason,'GEMINI_PROJECT_BILLING_ATTESTATION_NOT_AVAILABLE_NO_INFERENCE');
});
test('superseded Ollama adapter is hard-disabled despite a fake or real local server',async()=>{
 let calls=0;
 const out=await generateSeoDraftWithLocalModel({
  brief,fetch_impl:async()=>{calls++;throw Error('SHOULD_NEVER_RUN')},simulation:true
 });
 assert.equal(out.status,'HOLD');
 assert.equal(out.reason,'CLOUD_ONLY_POLICY_LOCAL_EXECUTION_DISABLED');
 assert.equal(out.wordpress_writes,0);
 assert.equal(out.paid_api_calls,0);
 assert.equal(calls,0);
});
