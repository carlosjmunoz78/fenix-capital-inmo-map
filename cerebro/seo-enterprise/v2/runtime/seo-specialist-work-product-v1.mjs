/**
 * SEO Enterprise V2: 32 discipline-specific, 141 role-specific useful work products
 * on the ALREADY-ACCEPTED 200-URL corpus. No new crawl or new audit.
 * Proposals, not completed optimizations or expert certifications.
 */
import crypto from 'node:crypto';
import {getSeoDepartmentKnowledge} from './seo-specialist-workforce-v2.mjs';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const SPEC=Object.freeze({
 '01':['STRATEGY_PRIORITIZATION','Priorizar una mejora sobre URL existente con objetivo comercial, coste y dependencia','OWNER_OBJECTIVE_AND_VERIFIED_KPI'],
 '02':['TERRITORIAL_MARKET_HYPOTHESIS','Conectar servicio y territorio real sin estimar volúmenes de mercado','MARKET_SOURCE'],
 '03':['BUYER_PERSONA_MESSAGE','Diferenciar intención B2B, comprador, vendedor o financiación y redactar preguntas de investigación','CONSENTED_PERSONA_EVIDENCE'],
 '04':['ROI_CASE','Preparar priorización con impacto medible sin asumir tráfico ni ingresos','VERIFIED_CONVERSION_BASELINE'],
 '05':['KEYWORD_URL_OWNERSHIP','Anclar una intención semántica a una URL existente sin crear una competidora','SEARCH_QUERY_INTENT_AND_GSC_IF_AVAILABLE'],
 '06':['SERP_FORMAT_RESEARCH','Preparar ficha de formato por intención sin inventar resultados de Google','DATED_SERP_SAMPLE'],
 '07':['COMPETITOR_DIFFERENTIATION','Definir comparación comprobable contra competidores reales sin copiarles','DATED_COMPETITOR_EVIDENCE'],
 '08':['CANNIBALIZATION_TRIAGE','Examinar el ownership de keyword y similitud como hipótesis; preservar las dos URLs','SEARCH_CONSOLE_URL_QUERY_EVIDENCE'],
 '09':['INDEXABILITY_DECISION','Separar campos CMS de indexación real; propuesta conservadora sin noindex ni 301','INDEXING_DATA_REQUIRED_FOR_CONFIRMATION'],
 '10':['RENDERING_DEPENDENCY','Documentar bloque, shortcode y necesidad de render sin reconstruir página','DOM_RENDER_PROOF_FOR_EXECUTION'],
 '11':['INTERNAL_LINKS','Proponer vínculo contextual relevante hacia contenido existente con ancla natural','FULL_GRAPH_AND_BUSINESS_APPROVAL'],
 '12':['STRUCTURED_DATA','Definir entidad y propiedad schema únicamente desde copy y servicios visibles','VISIBLE_RENDERED_CONTENT_AND_SCHEMA_VALIDATION'],
 '13':['EDITORIAL_COPY_IMPROVEMENT','Preparar briefing de mejora incremental del copy preservado, sin publicación','EDITORIAL_FACT_CHECK'],
 '14':['CONVERSION_COPY','Preparar CTA ajustado a intención con condiciones verificables, sin promesas absolutas','CLAIM_EVIDENCE'],
 '15':['FORM_MICROCOPY','Proponer aclaración del paso siguiente y consentimiento; sin tocar formularios','ACTUAL_FORM_FLOW_AND_CONSENT_GATE'],
 '16':['YMYL_FACTCHECK','Enumerar claims hipotecarios que necesitan fuente y validación humana','CURRENT_FINANCIAL_LEGAL_EVIDENCE'],
 '17':['GOOGLE_BUSINESS_PROFILE','Preparar correspondencia de servicio y lugar, sin crear fichas de oficinas ficticias','VERIFIED_GBP_AND_REAL_PRESENCE'],
 '18':['LOCAL_REPUTATION','Preparar guía de reseñas auténticas sin suplantación ni datos de clientes','CONSENTED_REVIEW_EVIDENCE'],
 '19':['DIGITAL_PR','Definir pieza de utilidad apta para relaciones públicas sin comprar enlaces','REAL_EDITORIAL_OUTREACH_SOURCE'],
 '20':['TERRITORIAL_EXPANSION_GUARD','Validar diferenciación local real antes de nuevas páginas','REAL_TERRITORIAL_SERVICE_EVIDENCE'],
 '21':['UX_NAVIGATION','Preparar cambio puntual de claridad y accesibilidad, reversible','DEVICE_AND_ACCESSIBILITY_VALIDATION'],
 '22':['WORDPRESS_COMPONENT_CONTRACT','Proponer cambio aditivo controlado, nunca editar bloque compartido sin snapshot','WP_DEPENDENCY_AND_ROLLBACK_GATE'],
 '23':['PERFORMANCE_ACCESSIBILITY','Preparar hipótesis de optimización sin inventar Core Web Vitals','CRUX_LIGHTHOUSE_AND_DEVICE_SOURCE'],
 '24':['FUNNEL_AND_FORM','Mapear CTA hacia captación diferenciada, sin reutilizar consentimiento implícito','FORM_CONSENT_AND_AGGREGATED_FUNNEL'],
 '25':['AEO_CLARITY','Preparar respuesta precisa y documentada sin prometer apariciones en IA','ENTITY_AND_SOURCE_VERIFICATION'],
 '26':['IMAGE_ALT_RIGHTS','Relacionar uso de imagen con ALT contextual y comprobación de derechos','IMAGE_RIGHTS_AND_RENDER_PROOF'],
 '27':['ECOMMERCE_APPLICABILITY','Evaluar si existe catálogo real antes de recomendar schema de producto','BUSINESS_ECOMMERCE_APPLICABILITY'],
 '28':['SOCIAL_DISTRIBUTION','Proponer reutilización consentida de una página en canal específico','SOCIAL_CHANNEL_AND_PERMISSION'],
 '29':['KPI_PROVENANCE','Definir KPI y fuente; no declarar clics o sesiones sin GSC/GA4','AUTHENTICATED_GSC_GA4'],
 '30':['CONVERSION_ATTRIBUTION','Definir evento y ventana de atribución desde CTA a lead y firma','CONSENTED_AGGREGATED_CRM_EVENTS'],
 '31':['INDEPENDENT_QA_CHECKLIST','Emitir checklist de revisión ajena y evidencia OLD vs NEW; no autocertificar','INDEPENDENT_REVIEW_EVIDENCE'],
 '32':['SPECIALIST_LEARNING_CASE','Preparar corrección y reexamen sin premiar a ningún actor','REAL_ACTOR_RESPONSE_AND_INDEPENDENT_EXAM']
});
const httpUrl=x=>typeof x==='string'&&x.startsWith('https://fenixcapital.es/');
const docFacts=d=>({
 post_id:d.post_id,url:d.url,title:d.title,post_type:d.type,
 stored_title:d.yoast?.title??null,stored_description:d.yoast?.description??null,
 stored_canonical:d.yoast?.canonical??null,
 h1_text:(d.headings||[]).filter(h=>h.level===1).map(x=>x.text).slice(0,3),
 h2_count:(d.headings||[]).filter(h=>h.level===2).length,
 stored_copy_characters:d.copy_text.length,
 stored_image_tags:d.images.length,
 img_tags_without_alt:d.images.filter(x=>!x.alt?.trim()).length,
 first_image_src:d.images.find(x=>httpUrl(x.src))?.src??null,
 first_internal_link:d.internal_links.find(httpUrl)??null,
 internal_links_count:d.internal_links.length,
 reusable_block_refs:d.wordpress_block_refs??[],
 copy_sha256:sha(d.copy_text),
 extracted_word_count:d.copy_text.trim()?d.copy_text.trim().split(/\s+/).length:0
});
const candidateScore=f=>
 (f.stored_description?0:2)+(f.stored_title?0:1)+
 (f.img_tags_without_alt>0?3:0)+(f.h1_text.length===0?1:0)+
 (f.reusable_block_refs.length?1:0)+(f.stored_copy_characters<300?3:0);
const pageSignal=f=>{
 if(f.img_tags_without_alt>0)return 'ALT_USAGE_REVIEW';
 if(!f.stored_description)return 'YOAST_STORED_DESCRIPTION_REVIEW';
 if(f.stored_copy_characters<300)return 'STORED_COPY_SOURCE_COMPLETENESS';
 if(f.reusable_block_refs.length)return 'REUSABLE_BLOCK_DEPENDENCY';
 if(!f.h1_text.length)return 'STORED_HEADING_STRUCTURE_CHECK';
 if(!f.stored_title)return 'YOAST_STORED_TITLE_REVIEW';
 return 'CONTEXTUAL_INTERNAL_LINK_AND_CTA_REVIEW';
};
export function createSeoSpecialistWorkProducts({corpus,evidence}={}){
 if(corpus?.documents?.length!==200||!Array.isArray(evidence)||evidence.length!==141)
  throw Error('SEO_WORK_PRODUCTS_CORPUS_REQUIRED');
 const facts=corpus.documents.map(docFacts);
 if(facts.some(f=>!httpUrl(f.url))||new Set(facts.map(f=>f.post_id)).size!==200)
  throw Error('SEO_WORK_PRODUCTS_SOURCE_MISMATCH');
 const priority=facts.map(f=>({...f,priority:Math.min(10,candidateScore(f)),
  candidate_action:pageSignal(f),
  evidence_state:'WORDPRESS_STORED_SNAPSHOT_ONLY_NOT_RENDERED_SITE',
  action_status:'PROPOSAL_NEEDS_REVIEW_NO_WRITE',
  do_not_redirect_or_delete:true,
  seo_improvement_not_yet_implemented:true}))
  .sort((a,b)=>b.priority-a.priority||a.post_id-b.post_id);
 const all=new Set(),roleProducts=[];
 for(const e of evidence){
  if(all.has(e.role_id)||e.source_snapshot_digest!==corpus.corpus_digest)throw Error('SEO_WORK_ROLE_INVALID');
  all.add(e.role_id);
  const pack=getSeoDepartmentKnowledge(e.department_id);
  const dept=e.department_id.slice(-2),spec=SPEC[dept];
  const role=pack.workforce.subagents.find(a=>a.role_id===e.role_id);
  if(!role||role.competency!==e.competency||!spec)throw Error('SEO_WORK_COMPETENCE_MISMATCH');
  // Assign priority page deterministically, balance role contributions over distinct URLs.
  const index=roleProducts.length,selected=priority[index%priority.length];
  const hasSourceLimitations=e.source_limitations?.length>0;
  const dependency=spec[2];
  const actions={
    signal:selected.candidate_action,mode:spec[0],
    requested_work:spec[1],competency_instruction:role.competency,
    evidence_from_existing_page:selected.url,
    required_external_gate:dependency,
    preserve_url:true,publish:false,need_independent_review:true,
    avoid_duplicate_or_thin_page_creation:true,
    additional_budget_eur:0
  };
  roleProducts.push({
    role_id:e.role_id,department_id:e.department_id,
    department_name:pack.department_name,competency:e.competency,
    source_digest:corpus.corpus_digest,
    target_post_id:selected.post_id,target_url:selected.url,
    evidence:{title:selected.title,copy_sha256:selected.copy_sha256,
      stored_meta_title:selected.stored_title,stored_meta_description:selected.stored_description,
      h1_text:selected.h1_text,img_tags_without_alt:selected.img_tags_without_alt,
      first_image_src:selected.first_image_src,first_internal_link:selected.first_internal_link,
      source_storage:'PINNED_WORDPRESS_SNAPSHOT',source_render_claim:false},
    action:actions,source_limitations:e.source_limitations,
    status:hasSourceLimitations?'EVIDENCE_DEPENDENCY_REQUIRED':'REVIEWABLE_DETERMINISTIC_DRAFT',
    complete_specialty_reasoning:false,
    content_draft_published:false,source_reviewed_by_external_expert:false,
    user_approved_strategy:false,real_agent_execution_certified:false
  });
 }
 if(roleProducts.length!==141||all.size!==141||priority.length!==200)throw Error('SEO_WORK_COVERAGE');
 const counts=roleProducts.reduce((a,x)=>{a[x.status]=(a[x.status]||0)+1;return a},{});
 const proposals={
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  status:'SEO_CORPUS_200_URL_ACTION_QUEUE_AND_141_SPECIALIZED_WORK_PRODUCTS',
  source_snapshot_digest:corpus.corpus_digest,source_kind:'OWNER_ACCEPTED_SAVED_WP_CONTENT',
  no_site_reaudit:true,site_mutations:0,external_research_requests:0,
  current_rankings_asserted:false,crawl_or_indexing_conclusions_asserted:false,
  actor_training_claimed:false,role_products:roleProducts,
  url_action_queue:priority,role_products_by_status:counts,
  business_strategy_final_approval:false,all_are_readonly_proposals:true
 };
 return proposals;
}
export function independentlyReviewSeoWorkProducts({work_products,corpus,evidence}={}){
 const expected=createSeoSpecialistWorkProducts({corpus,evidence});
 if(!work_products||JSON.stringify(work_products)!==JSON.stringify(expected))
  throw Error('SEO_WORK_PRODUCTS_INDEPENDENT_RECOMPUTE_MISMATCH');
 if(work_products.role_products.some(x=>x.action.publish||x.content_draft_published||
   x.real_agent_execution_certified)||work_products.url_action_queue.some(x=>!x.do_not_redirect_or_delete))
  throw Error('SEO_WORK_PRODUCTS_UNSAFE');
 return {status:'INDEPENDENT_QA_141_REAL_SOURCE_SCOPED_PROPOSALS_VERIFIED',
  role_products:141,url_queue:200,departments:32,
  proof_scope:'READONLY_SNAPSHOT_ONLY',specialist_iam_certifications:0,
  actionable_drafts_not_publications:true,external_mutations:0};
}
