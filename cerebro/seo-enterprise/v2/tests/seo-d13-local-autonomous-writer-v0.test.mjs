import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
const model='qwen2.5:7b';
const html=fs.readFileSync('cerebro/seo-enterprise/v2/drafts/2026-11-06-b2c-comparar-pisos-cordoba-v3-faq.draft.html','utf8');
const fakeResponse=(text=html,sources=['wp_articles','wp_contact'])=>({
 model,done:true,response:JSON.stringify({html:text,used_source_ids:sources})
});
const fakeFetch=(status='healthy',text=html)=>async(url,opts)=>{
 if(url.endsWith('/api/tags'))return{ok:true,json:async()=>({models:status==='healthy'?[{name:model}]:[]})};
 if(url.endsWith('/api/generate')){
  assert.equal(opts.method,'POST');
  assert.equal(opts.headers['content-type'],'application/json');
  const obj=JSON.parse(opts.body);
  assert.equal(obj.model,model);assert.equal(obj.stream,false);assert.equal(obj.format,'json');
  return {ok:true,json:async()=>fakeResponse(text)};
 }
 throw Error('UNEXPECTED_CALL');
};

test('prompt is sourced, zero-cost, has six FAQ and company-specific copy constraints',()=>{
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
test('missing local model fails closed and never generates content or pays',async()=>{
 let n=0;
 const f=async(url,opts)=>{n++;return{ok:true,json:async()=>({models:[]})}};
 const r=await generateSeoDraftWithLocalModel({brief:b,fetch_impl:f,simulation:true});
 assert.equal(r.status,'HOLD');assert.equal(r.reason,'LOCAL_MODEL_NOT_INSTALLED');assert.equal(n,1);
 assert.equal(r.wordpress_writes,0);assert.equal(r.paid_api_calls,0);
 const unavailable=await generateSeoDraftWithLocalModel({brief:b,fetch_impl:async()=>{throw Error('UNAVAILABLE')},simulation:true});
 assert.equal(unavailable.reason,'LOCAL_OLLAMA_UNAVAILABLE');
});
test('mocked local provider exercises real ROUTE-001 and existing QA, never publishes',async()=>{
 // Simulated transport: this test does NOT prove Ollama is installed or actually wrote prose.
 const r=await generateSeoDraftWithLocalModel({brief:b,model,fetch_impl:fakeFetch(),simulation:true});
 assert.equal(r.status,'SEO_D13_LOCAL_MODEL_DRAFT_CREATED_REVIEW_ONLY');
 assert.equal(r.provider,'OLLAMA_LOCAL_LOOPBACK');assert.equal(r.simulation,true);
 assert.equal(r.faq_count,6);assert.match(r.sha256,/^[a-f0-9]{64}$/);
 assert.equal(r.additional_cost_eur,0);assert.equal(r.paid_api_calls,0);
 assert.equal(r.wordpress_writes,0);assert.equal(r.can_publish,false);
 assert.equal(r.source_fact_check_verified,false);
 assert.equal(r.seo_independent_review_verified,false);
});
test('bad content and unknown source are blocked',async()=>{
 const bad=html.replace(/<div class="faq-item"><h3>[\s\S]*?<\/h3><p>[\s\S]*?<\/p><\/div>/,'');
 const r=await generateSeoDraftWithLocalModel({brief:b,fetch_impl:fakeFetch('healthy',bad),simulation:true});
 assert.equal(r.status,'HOLD');assert.equal(r.reason,'OWNER_STYLE_OR_FAQ_QA_FAIL');
 assert.ok(r.issues.some(x=>x.includes('FAQ_MINIMUM')));
 const untrusted=async(url)=>{
  if(url.endsWith('/api/tags'))return{ok:true,json:async()=>({models:[{name:model}]})};
  return{ok:true,json:async()=>fakeResponse(html,['wp_articles','invented'])};
 };
 const r2=await generateSeoDraftWithLocalModel({brief:b,fetch_impl:untrusted,simulation:true});
 assert.equal(r2.reason,'SOURCE_COVERAGE_NOT_PROVEN');
 await assert.rejects(()=>generateSeoDraftWithLocalModel({brief:b,endpoint:'https://external.com',fetch_impl:fakeFetch(),simulation:true}),/EXTERNAL_HOST/);
});
