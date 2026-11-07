/**
 * SEO-001 -> existing CEREBRO CREATIVE-PROGRAMMATIC-RENDER-V1 / UMS-001.
 * An exact, rights-aware media brief. Produces controlled orders; never generates
 * or publishes media itself, never requests new paid APIs.
 */
import crypto from 'node:crypto';
import {buildCreativeOutputPlan} from '../../../runtime/creative-output-pipeline-v1.mjs';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const BRAND=Object.freeze({
 manual:"Fénix Capital Manual de marca 2025 (fuente aportada por propietario)",
 typography:"Montserrat",
 background:"#222222",primary:"#FFFFFF",magenta:"#870064",
 yellow:"#FFB71B",orange:"#FF5F00",
 allowed_palette:["#222222","#870064","#FFB71B","#FF5F00","#FFFFFF"],
 layout:"Premium, editorial, muy legible, espacio negativo, sin exceso de texto"
});
const assertScope=(owner,corpus)=>{
 if(owner?.total_existing_urls!==200||corpus?.documents?.length!==200||
 owner.source_digest!==corpus.corpus_digest||owner.authority?.can_publish!==false||
 owner.authority?.can_create_new_url!==false)
  throw Error('SEO_CREATIVE_FROZEN_STRATEGY_REQUIRED');
};
function candidate(owner,corpus,id){
 const d=corpus.documents.find(x=>x.post_id===id),
       o=owner.url_ownership.find(x=>x.post_id===id);
 if(!d||!o||d.url!==o.url||o.family==='INSTITUTIONAL'||
 d.yoast?.focus_keyword!==o.existing_focus_keyword||!d.copy_text)
   throw Error('SEO_CREATIVE_UNTRUSTED_SOURCE');
 return {d,o};
}
function promptFor(d,o){
 const topic=d.title;
 return {
  objective:'Crear recurso visual editorial distintivo para mejorar comprensión y experiencia del artículo EXISTENTE, sin crear otra URL.',
  subject:'Persona autónoma profesional en Córdoba revisando documentación e ingresos de un expediente hipotecario. Contexto español natural, sin atribuir identidad a clientes reales.',
  narrative:'Preparación documental, claridad, organización y asesoramiento independiente. Evitar apariencia de aprobación bancaria garantizada.',
  composition:'Composición editorial 1200x630 para SEO/OpenGraph; legible en móvil y escritorio, contraste WCAG, jerarquía Montserrat y paleta estricta Fénix. Zona segura 8% del borde, tipografía de mínimo 28 px cuando se use.',
  visual_policy:'Preferir fotografía ORIGINAL con derechos verificados si el adaptador generativo autorizado lo permite; si no, usar diseño editorial vectorial/geométrico propio generado por Chromium/HTML. Nunca usar stock no licenciado ni imágenes de clientes sin consentimiento.',
  graphic_text_allowed:['Hipoteca para autónomos en Córdoba','Documentación y viabilidad','Fénix Capital'],
  graphic_text_forbidden:['100% garantizado','aprobación garantizada','mejor tipo del mercado','sin riesgos','TAE o tipos no verificados','logotipos de bancos no autorizados'],
  if_text_uncertain:'Usar imagen conceptual sin texto ni claims y dejar titular para el HTML del artículo',
  exact_source:{post_id:d.post_id,url:d.url,title:topic,keyword:d.yoast?.focus_keyword||null,
   copy_sha256:sha(d.copy_text),
   stored_images_referenced:d.images.length,rendered_page_image_absence_verified:false,
   conversion_persona:o.persona,funnel_stage:o.funnel_stage,newsletter_line:o.newsletter_line},
  accessibility:{alt_proposal:'Profesional autónomo revisando documentación para estudiar una hipoteca en Córdoba',
   decorative_image_alt_when_purely_graphic:'',
   descriptive_filename:'fenix-capital-hipoteca-autonomos-cordoba-documentacion-seo.webp',
   output_png_allowed:true,webp_conversion_required_before_wordpress:true,
   EXIF_private_data_exposure_forbidden:true},
  rights:{commercial_use_and_reuse_required:true,model_release_if_real_person:true,
   company_logo_authorized_only_from_verified_fenix_assets:true,
   prompt_and_generated_image_provenance_required:true,
   copyright_ownership_review_before_publication:true},
  qa:['FENIX_2025_PALETTE','MONTSERRAT_COMPOSITION','1200_630_DIMENSIONS',
   'SAFE_AREAS_AND_OVERFLOW','NO_UNVERIFIED_FINANCIAL_PROMISES',
   'RIGHTS_AND_PROVENANCE','WCAG_CONTRAST_AND_ALT','D16_FINANCIAL_QA',
   'D26_IMAGE_EDITOR','D31_INDEPENDENT_SEO_QA','NO_PUBLICATION'],
  constraints:{new_url_forbidden:true,modify_existing_site_forbidden:true,
   publication_forbidden:true,paid_ai_provider_authorized_for_this_order:false,
   new_subscription_forbidden:true,expected_extra_eur:0}
 };
}
export function makeSeoAudiovisualOrder({owner,corpus,post_id=960}={}){
 assertScope(owner,corpus);
 if(post_id!==960)throw Error('SEO_CREATIVE_PILOT_POST_ID_FROZEN');
 const {d,o}=candidate(owner,corpus,post_id);
 if(o.family!=='B2C_FINANCE'||o.persona!=='PARTICULAR_HIPOTECA')
  throw Error('SEO_CREATIVE_WRONG_FUNNEL');
 const brief=promptFor(d,o);
 const base='seo-existing-960-manual2025';
 const route=buildCreativeOutputPlan({
  company_id:'fenix',target_company_id:'fenix',engine_id:'SEO-001',
  environment:'PROD',version:'v1',request_id:base,
  asset_ref:'seo:'+post_id+':og:20261105',
  brand_profile_ref:'brand:fenix-capital:manual-2025',
  brief_ref:'brief:seo:hipoteca-autonomos-cordoba:20261105',
  channel:'SEO',output_type:'SEO_IMAGE',
  expected_cost_eur:0,paid_provider_requested:false,
  extra_purchase_requested:false,confidence:1,
  canva_native_required:false,interactive_editor_required:false,
  generated_visuals_required:false,voice_requested:false,
  publish_requested:false
 });
 if(route.ok!==true||route.preset.width!==1200||route.preset.height!==630||
  route.publish_authorized!==false||route.expected_cost_eur!==0)
  throw Error('SEO_CREATIVE_PROD_ROUTE_NOT_PERMITTED');
 return {
  schema_version:'1.0.0',status:'READY_TO_REQUEST_EXISTING_PRODUCER_PRIVATE_IMAGE',
  company_id:'fenix',engine_id:'SEO-001',environment:'PROD',
  producer_id:'CREATIVE-PROGRAMMATIC-RENDER-V1',studio:'UMS-001',
  strategy_source_digest:corpus.corpus_digest,
  brand_profile:BRAND,format:'SEO_IMAGE',width:1200,height:630,
  creative_brief:brief,
  route_status:route.status,route_capability:route.route?.capability_id||null,
  source_existing_page:d.url,
  wordPress_image_uploaded:false,wordPress_page_modified:false,
  human_quality_gate:'REVIEW_CREATIVE_ARTIFACT_BEFORE_ANY_CMS_IMPORT',
  price_additional_eur:0,
  must_record_queue_job_id_and_asset_digest:true,
  request_payload:{
   company_id:'fenix',target_company_id:'fenix',engine_id:'SEO-001',
   department_id:'creative',environment:'PROD',version:'v1',
   channel:'SEO',output_type:'SEO_IMAGE',
   idempotency_key:'creative-seo-960-manual2025-og-20261105',
   audit_id:'seo-editorial-owner960-manual2025',
   created_by:'SEO-001-OWNER_INTENT_FUNNEL',
   priority:75,max_attempts:1,
   expected_cost_eur:0,publish_requested:false,
   brand_profile_ref:'brand:fenix-capital:manual-2025',
   brief_ref:'brief:seo:hipoteca-autonomos-cordoba:20261105',
   creative_payload:{
    visual_style:'EDITORIAL',
    headline:'Hipoteca para autónomos',
    subheadline:'Documentación y viabilidad en Córdoba',
    cta:'Fénix Capital',
    brand_label:'Fénix Capital',
    brand:{background:'#222222',primary:'#FFFFFF',accent:'#870064'},
    composition_notes:'Montserrat; brand yellow #FFB71B and orange #FF5F00 if supported; no bank logos, financial promises or unlicensed people; safe areas and accessibility'
   }
  },
  status_after_enqueue:'WAITING_FOR_CREATIVE_QA_AND_ASSET_MANIFEST',
  image_generation_not_claimed:true
 };
}
export function validateSeoAudiovisualOrder({order,owner,corpus}={}){
 const expected=makeSeoAudiovisualOrder({owner,corpus});
 if(!order||JSON.stringify(order)!==JSON.stringify(expected))
  throw Error('SEO_CREATIVE_QA_ORDER_TAMPERING');
 if(order.request_payload.publish_requested!==false||
  order.request_payload.expected_cost_eur!==0||
  order.wordPress_page_modified!==false)
  throw Error('SEO_CREATIVE_QA_POLICY');
 return {status:'SEO_CREATIVE_PRODUCER_BRIEF_VERIFIED',post_id:960,
  producer:order.producer_id,format:'SEO_IMAGE',width:1200,height:630,
  can_enqueue_existing_producer:true,
  cannot_auto_publish:true,new_paid_services:0};
}
