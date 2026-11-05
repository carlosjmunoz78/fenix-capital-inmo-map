/**
 * FACT-001 / SOC-001 · Turn existing Facebook queue rows into original
 * photographic production briefs automatically, without user ChatGPT prompts.
 * Existing authored captions, CTA, audience and URL remain SOURCE OF TRUTH.
 * Future companies get their own reviewed brand-profile rules (never silently
 * inherit Fénix branding). All output is PREPROD / candidate-only.
 */
import {buildCerebroCreativeOrder} from './creative-social-prompt-v0.mjs';
const visualConcepts=Object.freeze({
  familia_primera_vivienda:{
    headline:'Antes de reservar, haz números',
    subtitle:'Una buena compra empieza antes de firmar',
    scene:'Authentic Andalusian family apartment with warm sunlight falling on a small wooden dining table, blank budgeting notebook, calculator and home keys, aspirational but believable, cinematic architectural detail, no faces or readable financial data'
  },
  comprador_que_compara_solo_cuota:{
    headline:'La cuota no lo es todo',
    subtitle:'Mira también el ahorro y tus gastos',
    scene:'Premium realistic bright Mediterranean apartment living room, natural morning light and elegant uncluttered table with keys, a notebook and calculator, carefully framed real estate editorial photography, no legible documents'
  },
  comprador_con_poco_ahorro:{
    headline:'¿Y si tienes poco ahorro?',
    subtitle:'Cada financiación requiere un estudio',
    scene:'Beautiful first-home living space in Spain, sunlit counter with symbolic house keys and carefully arranged household savings notebook, refined everyday photography, no labels, no people and no suggestion that financing is guaranteed'
  },
  comprador_que_ha_visto_una_vivienda:{
    headline:'Te enamora. ¿Te encaja?',
    subtitle:'Revisa las cifras antes de reservar',
    scene:'Photorealistic renovated Andalusian apartment viewed from the entrance, modern wooden door slightly open, natural golden light across the floor, inviting architectural perspective and realistic details'
  },
  comprador_que_no_sabe_si_llega_al_90:{
    headline:'Tu perfil importa más',
    subtitle:'El porcentaje no se garantiza',
    scene:'Elegant home-advisory consultation scene, close-up of blank paperwork, closed laptop and realistic keys in a contemporary living room, soft daylight and architectural depth, no numbers or text visible'
  },
  comprador_con_prestamos_activos:{
    headline:'Cuenta todas tus cuotas',
    subtitle:'No calcules solo con tu nómina',
    scene:'Realistic comfortable Córdoba-style home interior with orderly blank budget sheets and a calculator on a wood table next to a softly illuminated window, thoughtful premium editorial image, no labels'
  },
  comprador_con_ingresos_variables:{
    headline:'Ingresos variables, plan claro',
    subtitle:'Prepara los documentos con tiempo',
    scene:'Contemporary Mediterranean home office in an elegant apartment, notebook and unmarked folders, sunlit white wall, textured wood, modern subtle plants, refined natural photography, no visible faces or legible personal information'
  },
  pareja_que_compra_junta:{
    headline:'Compráis juntos. Calculad juntos.',
    subtitle:'Ahorro, deudas y margen mensual',
    scene:'Warm Spanish apartment dining table with two coffee cups, a keyring and unlabeled floor plan folded underneath, golden natural light, elegant honest residential setting and strong composition, no faces'
  },
  comprador_a_punto_de_firmar_arras:{
    headline:'Antes de firmar las arras',
    subtitle:'Revisa si la compra es viable',
    scene:'Photorealistic close-up of a pen and blank paperwork on a tasteful stone surface inside a modern Andalusian apartment, soft architectural view beyond, calm premium lighting, no real contracts, no text'
  },
  comprador_que_solo_mira_precio:{
    headline:'El precio no es el coste total',
    subtitle:'Piensa también en impuestos y gastos',
    scene:'Elegant realistic Spanish residential building entrance and planted terrace under soft afternoon sun, refined architecture, tasteful stonework and real proportions, open negative space for corporate text to be overlaid later'
  }
});
function nonEmpty(v,label,max=5000){
 if(typeof v!=='string'||v.trim().length<3||v.length>max)throw Error('QUEUE_'+label+'_INVALID');
 return v.trim();
}
export function buildFacebookBriefFromExistingQueue(payload){
 if(!payload||typeof payload!=='object')throw Error('SOC_QUEUE_PAYLOAD_REQUIRED');
 if(payload.brief_source!=='CEREBRO_SOC001_LIVE_EXISTING_QUEUE')throw Error('UNTRUSTED_BRIEF_SOURCE');
 const key=nonEmpty(payload.content_key,'CONTENT_KEY',110);
 if(!/^facebook-cadence-20\d{2}-\d{2}-\d{2}-fb-\d{2}$/.test(key))
  throw Error('CONTENT_KEY_NOT_SOC001_FACEBOOK');
 const persona=nonEmpty(payload.buyer_persona,'PERSONA',100);
 const concept=visualConcepts[persona];
 if(!concept)throw Error('PERSONA_REQUIRES_HUMAN_EDITORIAL_REVIEW');
 const audience=payload.audience;
 if(audience!=='particulares')throw Error('B2B_REQUIRES_DIFFERENT_CONCEPT_POLICY');
 const destination=nonEmpty(payload.destination_url,'DESTINATION',900);
 const hook=nonEmpty(payload.topic,'HOOK',170);
 const fullCaption=nonEmpty(payload.full_caption,'CAPTION',5000);
 if(!fullCaption.includes(hook))throw Error('HOOK_CAPTION_MISMATCH');
 if(!destination.includes('utm_source=facebook'))throw Error('SOC001_TRACKING_REQUIRED');
 const cta=nonEmpty(payload.approved_cta,'CTA',95);
 const funnel=payload.funnel_stage_target;
 if(!['TOFU','MOFU','BOFU'].includes(funnel))throw Error('FUNNEL_NOT_NORMALIZED');
 return Object.freeze({
   company_id:'fenix',engine_id:'SOC-001',environment:'PREPROD',version:'v0',
   content_key:key,audience,funnel_stage:funnel,topic:hook,hook,
   headline:concept.headline,subtitle:concept.subtitle,cta,
   photo_description:concept.scene,
   destination_url:destination,
   source_metadata:{
    origin:'EXISTING_SOC001_FACEBOOK_QUEUE',persona,
    original_funnel_stage:payload.funnel_stage_original??funnel,
    caption_is_existing_soc001: true,
    no_new_claims_generated:true,
    brand_profile:'fenix-capital'
   }
 });
}
export function compileQueueOrder(payload){
 const brief=buildFacebookBriefFromExistingQueue(payload);
 return {brief,order:buildCerebroCreativeOrder(brief),
   status:'CREATIVE_WORK_ORDER_COMPILED_NOT_GENERATED',
   independent_qa_required:true,publish_authorized:false};
}
