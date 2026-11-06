import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAutonomousSeoPrompt,generateSeoDraftWithLocalModel} from '../runtime/seo-d13-local-autonomous-writer-v0.mjs';

const b={
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
 work_id:'SEO001-FENIX-D13-LAB-003',content_type:'ARTICLE',persona:'PARTICULARES',
 topic:'Comparar dos viviendas con calma',buyer_problem:'No saber cuál vivienda se adapta mejor al presupuesto',
 conversion_goal:'Consulta de viabilidad de financiación',focus_keyword:'comparar viviendas Córdoba',
 cta_url:'https://fenixcapital.es/contacto/',source_readonly:true,customer_data_present:false,
 financial_claims_preverified:false,paid_provider_requested:false,
 wordpress_write_authorized:false,publish_authorized:false,
 sources:[
  {id:'wp_articles',url:'https://fenixcapital.es/gastos-compra/',corpus_evidence_verified:true,
   quote_or_paraphrase:'Los gastos de compra deben valorarse aparte del precio del inmueble y dependen de la operación.'},
  {id:'wp_contact',url:'https://fenixcapital.es/contacto/',corpus_evidence_verified:true,
   quote_or_paraphrase:'Fénix Capital facilita un canal de contacto para consultas de clientes en Córdoba.'}
 ]
};

// Historical prompt contract is retained for comparative audit. The former
// Ollama execution path is intentionally disabled by the owner CLOUD_ONLY policy.
test('prompt contract remains source-grounded and non-publishing',()=>{
 const p=buildAutonomousSeoPrompt(b);
 assert.equal(p.min_faq,6);assert.equal(p.source_count,2);
 assert.match(p.prompt,/No uses dos puntos visibles/);
 assert.match(p.prompt,/no inventes/i);
 assert.equal(p.no_new_paid_calls,true);
 assert.equal(buildAutonomousSeoPrompt({...b,content_type:'LANDING'}).min_faq,8);
 assert.throws(()=>buildAutonomousSeoPrompt({...b,paid_provider_requested:true}),/PERMISSION/);
 assert.throws(()=>buildAutonomousSeoPrompt({...b,sources:[]}),/SOURCE_COUNT/);
 assert.throws(()=>buildAutonomousSeoPrompt({...b,company_id:'other'}),/CONTEXT/);
});
test('cloud-only policy rejects any local model without network or payment',async()=>{
 let calls=0;
 const forbiddenFetch=async()=>{calls++;throw Error('LOCAL_NETWORK_DENIED')};
 for(const simulation of [true,false]){
  const result=await generateSeoDraftWithLocalModel({brief:b,fetch_impl:forbiddenFetch,simulation});
  assert.equal(result.status,'HOLD');
  assert.equal(result.reason,'CLOUD_ONLY_POLICY_LOCAL_EXECUTION_DISABLED');
  assert.equal(result.wordpress_writes,0);
  assert.equal(result.paid_api_calls,0);
  assert.equal(result.publish_authorized,false);
 }
 assert.equal(calls,0);
});
test('even a healthy local Ollama response cannot reopen legacy execution',async()=>{
 let calls=0;
 const fakeFetch=async()=>{calls++;return{ok:true,json:async()=>({models:[{name:'qwen2.5:7b'}]})}};
 const result=await generateSeoDraftWithLocalModel({
  brief:b,model:'qwen2.5:7b',fetch_impl:fakeFetch,simulation:true
 });
 assert.equal(result.status,'HOLD');
 assert.equal(result.reason,'CLOUD_ONLY_POLICY_LOCAL_EXECUTION_DISABLED');
 assert.equal(result.external_writes,0);
 assert.equal(result.wordpress_writes,0);
 assert.equal(calls,0);
});
test('forged endpoint or input cannot bypass owner prohibition',async()=>{
 let calls=0;
 const forbiddenFetch=async()=>{calls++;throw Error('SHOULD_NOT_EXECUTE')};
 for(const changes of [
  {endpoint:'https://external.example'},
  {brief:{...b,sources:[]}},
  {brief:{...b,paid_provider_requested:true}},
  {model:'qwen2.5:7b',simulation:true}
 ]){
  const result=await generateSeoDraftWithLocalModel({brief:b,fetch_impl:forbiddenFetch,...changes});
  assert.equal(result.status,'HOLD');
  assert.equal(result.reason,'CLOUD_ONLY_POLICY_LOCAL_EXECUTION_DISABLED');
  assert.equal(result.wordpress_writes,0);
  assert.equal(result.paid_api_calls,0);
 }
 assert.equal(calls,0);
});
