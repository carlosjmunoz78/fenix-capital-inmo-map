import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFacebookBriefFromExistingQueue,compileQueueOrder} from '../runtime/facebook-existing-queue-brief-v0.mjs';
import {assessAiCreativeJob} from '../runtime/creative-ai-job-v0.mjs';

// Canonical PERSONA/FUNNEL/KEY set derived from 10 actual SOC-001 media-missing
// posts, Nov 16–26, 2026; no actual image, network calls or paid API invocation.
const CASES=[
 ['16','01','familia_primera_vivienda','MOFU'],
 ['17','03','comprador_que_compara_solo_cuota','TOFU_MOFU'],
 ['18','04','comprador_con_poco_ahorro','MOFU'],
 ['19','05','comprador_que_ha_visto_una_vivienda','MOFU'],
 ['20','06','comprador_que_no_sabe_si_llega_al_90','MOFU'],
 ['21','07','comprador_con_prestamos_activos','MOFU'],
 ['23','08','comprador_con_ingresos_variables','MOFU'],
 ['24','09','pareja_que_compra_junta','TOFU_MOFU'],
 ['25','10','comprador_a_punto_de_firmar_arras','BOFU'],
 ['26','11','comprador_que_solo_mira_precio','TOFU']
];
function p([date,number,persona,funnel]){
 const content_key=`facebook-cadence-2026-11-${date}-fb-${number}`;
 const topic=`CEREBRO SOC-001 professional homebuyer education for ${persona}`;
 return {
   brief_source:'CEREBRO_SOC001_LIVE_EXISTING_QUEUE',
   content_key,buyer_persona:persona,funnel_stage_original:funnel,
   funnel_stage_target:funnel==='TOFU_MOFU'?'MOFU':funnel,
   audience:'particulares',destination_url:
     `https://fenixcapital.es/contacto/?utm_source=facebook&utm_medium=social&utm_campaign=soc001_cadence_202611${date}&utm_content=${content_key}`,
   topic,full_caption:`${topic}\nLa compraventa requiere comprobar gastos y viabilidad.`,
   approved_cta:'Solicita una revisión con Fénix Capital.'
 };
}
test('prepare all 10 existing SOC-001 Facebook posts without asking the owner for prompts',()=>{
 const orders=CASES.map(t=>compileQueueOrder(p(t)));
 assert.equal(orders.length,10);
 assert.equal(new Set(orders.map(v=>v.order.prompt_sha256)).size,10);
 assert.equal(new Set(orders.map(v=>v.brief.headline)).size,10);
 assert.ok(orders.every(o=>o.order.company_id==='fenix'&&o.order.engine_id==='SOC-001'));
 assert.ok(orders.every(o=>o.order.brand_company_alias==='fenix-capital'));
 assert.ok(orders.every(o=>o.order.environment==='PREPROD'));
 assert.ok(orders.every(o=>o.independent_qa_required===true&&o.publish_authorized===false));
 assert.ok(orders.every(o=>o.order.ai_scene_request.prompt.includes('No typography, no captions, no logos')));
 assert.ok(orders.every(o=>o.order.destination_url.startsWith('https://fenixcapital.es/')));
 assert.ok(orders.every(o=>o.brief.source_metadata.origin==='EXISTING_SOC001_FACEBOOK_QUEUE'));
});
test('FACT-001 consumes current actual queue company/engine; paid work still blocked until secure budget',()=>{
 for(const item of CASES){
   const payload=p(item),job={company_id:'fenix',engine_id:'FACT-001',
    environment:'PREPROD',channel:'FACEBOOK',output_type:'SQUARE_POST',
    request:{creative_payload:{scene_provider:'OPENAI_IMAGE',requester_engine_id:'SOC-001',...payload},
      expected_cost_eur:null}};
   const result=assessAiCreativeJob(job);
   assert.equal(result.is_ai,true);
   assert.equal(result.ready,false);
   assert.equal(result.reason,'MONEY_LIMIT');
   assert.ok(result.order===undefined);
 }
});
test('no creative work order if destination, caption provenance, buyer persona or company wrong',()=>{
 const x=p(CASES[0]);
 assert.throws(()=>buildFacebookBriefFromExistingQueue({...x,destination_url:'https://staging.fenixcapital.es/contacto/?utm_source=facebook'}),/PRODUCTION_HOST_ONLY/);
 assert.throws(()=>buildFacebookBriefFromExistingQueue({...x,buyer_persona:'unknown-persona'}),/PERSONA_REQUIRES_HUMAN_EDITORIAL_REVIEW/);
 assert.throws(()=>buildFacebookBriefFromExistingQueue({...x,full_caption:'No coincide el texto'}),/HOOK_CAPTION_MISMATCH/);
 assert.throws(()=>buildFacebookBriefFromExistingQueue({...x,audience:'inmobiliarias'}),/B2B_REQUIRES_DIFFERENT_CONCEPT_POLICY/);
 assert.throws(()=>buildFacebookBriefFromExistingQueue({...x,brief_source:'CHATGPT_MANUAL'}),/UNTRUSTED_BRIEF_SOURCE/);
 assert.throws(()=>buildFacebookBriefFromExistingQueue({...x,destination_url:'https://fenixcapital.es/contacto/'}),/SOC001_TRACKING_REQUIRED/);
});
