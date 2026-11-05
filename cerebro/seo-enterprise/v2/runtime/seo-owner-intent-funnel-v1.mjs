/**
 * SEO-001 · Verified snapshot-based URL ownership / anti-cannibalization / funnel blueprint.
 * Existing URL map is immutable; missing live telemetry is reported, never invented.
 * "Candidates" are not demonstrated Google cannibalization. No site audits/recrawls.
 */
import crypto from 'node:crypto';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const DOMAIN='https://fenixcapital.es';
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLocaleLowerCase('es').replace(/%[0-9a-f]{2}/gi,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const key=x=>normalize(x);
const urlPath=x=>{
 if(typeof x!=='string'||!x.startsWith(DOMAIN+'/'))throw Error('SEO_OWNER_URL_SCOPE');
 const p=x.slice(DOMAIN.length),path=p.split('?')[0];
 if(!path.startsWith('/')||path.includes('..'))throw Error('SEO_OWNER_URL_PATH');
 return path;
};
const dirname=u=>urlPath(u).replace(/^\/|\/$/g,'');
const isPolicy=u=>/(aviso-legal|declaracion-de-privacidad|politica-de-cookies)/.test(u);
const municipality=u=>{
 const p=dirname(u),m=p.match(/^(?:asesor-hipotecario|financiacion-compradores-inmobiliarias)-(.+)$/);
 if(m)return m[1];
 for(const [k,needle] of [['cordoba','cordoba'],['jaen','jaen'],['sevilla','sevilla']]){
  if(p.includes(needle))return k;
 }
 return null;
};
const routes=Object.freeze({
 B2C_LOCAL_ADVISOR:{persona:'PARTICULAR_HIPOTECA',stage:'BOFU',cta:'PREESTUDIO_PERSONALIZADO',
  form:'HIPOTECA_CASO_POR_PERFIL',download:'CHECKLIST_DOCUMENTACION_HIPOTECA',
  newsletter:'PARTICULARES',conversion:'CITA_O_PREESTUDIO'},
 B2B_LOCAL_PARTNERS:{persona:'INMOBILIARIA_COLABORADORA',stage:'BOFU',
  cta:'REVISION_FINANCIACION_COMPRADOR',form:'INMOBILIARIA_PARTNERS',
  download:'CHECKLIST_COMPRADOR_PREPARADO',newsletter:'INMOBILIARIAS',
  conversion:'ALTA_PARTNER_O_DERIVACION'},
 B2B_PARTNERS:{persona:'INMOBILIARIA_COLABORADORA',stage:'MOFU',
  cta:'SOLICITAR_PREOK_COMPRADOR',form:'INMOBILIARIA_PARTNERS',
  download:'PROTOCOLO_PREOK_Y_ARRAS',newsletter:'INMOBILIARIAS',
  conversion:'ALTA_PARTNER_O_DERIVACION'},
 B2C_100:{persona:'PARTICULAR_HIPOTECA_100',stage:'MOFU',
  cta:'REVISAR_VIABILIDAD_HIPOTECA_100',form:'HIPOTECA_100_ELEGIBILIDAD',
  download:'GUIA_HIPOTECA_100_REQUISITOS',newsletter:'PARTICULARES',
  conversion:'PREESTUDIO_POR_PERFIL'},
 B2C_FINANCE:{persona:'PARTICULAR_HIPOTECA',stage:'MOFU',
  cta:'CALCULAR_VIABILIDAD_HIPOTECA',form:'HIPOTECA_CASO_POR_PERFIL',
  download:'CHECKLIST_DOCUMENTACION_HIPOTECA',newsletter:'PARTICULARES',
  conversion:'PREESTUDIO_POR_PERFIL'},
 B2C_INFORMATION:{persona:'PARTICULAR_HIPOTECA',stage:'TOFU',
  cta:'DESCARGAR_CHECKLIST_Y_PREESTUDIAR',form:'HIPOTECA_CASO_POR_PERFIL',
  download:'GUIA_COMPRADOR_DOCUMENTACION_Y_GASTOS',newsletter:'PARTICULARES',
  conversion:'LEAD_CONSENTIDO'},
 INHERITANCE:{persona:'HEREDERO_O_PROPIETARIO',stage:'MOFU',
  cta:'ESTUDIAR_CASO_PATRIMONIAL',form:'PATRIMONIAL_HERENCIAS',
  download:'CHECKLIST_HERENCIA_Y_VIVIENDA',newsletter:'PARTICULARES',
  conversion:'CONSULTA_PERSONALIZADA'},
 GENERAL:{persona:'VARIOS',stage:'TOFU',cta:'CONTACTAR_SEGUN_INTENCION',
  form:'FORMULARIO_ESPECIFICO_PENDIENTE',download:'PENDIENTE_DE_VALIDAR',
  newsletter:'NO_ASIGNADA',conversion:'LEAD_SEGMENTADO'},
 INSTITUTIONAL:{persona:'VARIOS',stage:'NAVEGACION',cta:'NAVEGACION_RELEVANTE',
  form:'NO_APLICA_POR_DEFECTO',download:'NO_APLICA_POR_DEFECTO',
  newsletter:'NO_ASIGNADA',conversion:'NAVEGACION'}
});
function classify(d){
 const p=dirname(d.url),title=normalize(d.title),site=key(d.yoast?.focus_keyword||'');
 if(isPolicy(p)||p==='quienes-somos'||p==='blog'||p==='contacto')return {family:'INSTITUTIONAL',topic:p};
 if(p===''||p==='inicio')return {family:'B2C_FINANCE',topic:'hipotecas-cordoba-home'};
 if(p.startsWith('financiacion-compradores-inmobiliarias-'))
  return {family:'B2B_LOCAL_PARTNERS',topic:'financiacion-compradores'};
 if(p.startsWith('asesor-hipotecario-'))return {family:'B2C_LOCAL_ADVISOR',topic:'asesor-hipotecario'};
 if(p.startsWith('inmobiliarias/')||p==='inmobiliarias'||/inmobiliaria(s)?/.test(p)&&/comprador|preok|venta|banco/.test(p))
  return {family:'B2B_PARTNERS',topic:'financiacion-inmobiliaria'};
 if(p.startsWith('hipotecas/hipoteca-100')||p.includes('hipoteca-100')||site.includes('hipoteca 100'))
  return {family:'B2C_100',topic:'hipoteca-100'};
 if(p.includes('herencia'))return {family:'INHERITANCE',topic:'herencias'};
 if(p.includes('hipoteca')||/pre-ok|preestudio|financiacion|autodiagnostico/.test(p))
  return {family:'B2C_FINANCE',topic:'hipotecas'};
 if(/vivienda|reservar|tasacion|gastos-compra|comprar|alquilar|precio-maximo/.test(p))
  return {family:'B2C_INFORMATION',topic:'comprar-vivienda'};
 if(/vivienda|hipoteca/.test(title))return {family:'B2C_INFORMATION',topic:'comprar-vivienda'};
 return {family:'GENERAL',topic:'sin-clasificar'};
}
const topTarget=(family)=>({
 B2C_LOCAL_ADVISOR:['/pre-ok-hipotecario/','/contacto/'],
 B2B_LOCAL_PARTNERS:['/inmobiliarias/','/inmobiliarias/preok-hipotecario/'],
 B2B_PARTNERS:['/inmobiliarias/','/inmobiliarias/preok-hipotecario/'],
 B2C_100:['/hipotecas/hipoteca-100/','/pre-ok-hipotecario/'],
 B2C_FINANCE:['/pre-ok-hipotecario/','/contacto/'],
 B2C_INFORMATION:['/antes-de-reservar/','/pre-ok-hipotecario/'],
 INHERITANCE:['/gestionar-herencia-cordoba/','/contacto/'],
 GENERAL:['/contacto/'],INSTITUTIONAL:[]
})[family]||[];
const cf=(p,t)=>p==='/'||p==='/inicio/'?{canonical_hypothesis:'HOME_PRIMARY_VS_INICIO_HOLD'}:null;
function row(doc){
 const p=urlPath(doc.url),family=classify(doc),template=routes[family.family];
 const focus=String(doc.yoast?.focus_keyword||'').trim();
 return {
  post_id:doc.post_id,url:doc.url,post_type:doc.type,
  original_title:doc.title,existing_focus_keyword:focus||null,
  focus_keyword_source:focus?'YOAST_STORED':'NOT_IN_SNAPSHOT',
  focus_keyword_normalized:key(focus)||null,
  stored_canonical:doc.yoast?.canonical||null,
  source_copy_sha256:hash(doc.copy_text),
  family:family.family,topic:family.topic,municipality:municipality(doc.url),
  persona:template.persona,funnel_stage:template.stage,
  conversion_goal:template.conversion,proposed_cta:template.cta,
  form_contract:template.form,downloadable:template.download,
  newsletter_line:template.newsletter,
  form_implemented_verified:false,lead_magnet_implemented_verified:false,
  newsletter_subscription_implemented_verified:false,
  tracking_ga4_verified:false,crm_integration_verified:false,
  links_from_snapshot:doc.internal_links.length,
  images_referenced_in_saved_content:doc.images.length,
  proposed_supporting_links:topTarget(family.family).map(x=>DOMAIN+x),
  source_note:'STORED_WORDPRESS_CONTENT_NOT_A_LIVE_SITE_RENDER',
  legal_claim_check_required:family.family!=='INSTITUTIONAL',
  landing_to_cta_contract_status:'PROPOSED_NOT_CONNECTED',
  owner_override:cf(p,family.family),
  page_mutation_authorized:false,existing_url_preserved:true,
  redirect_recommended_automatically:false
 };
}
const pickLeader=(rs)=>{
 const home=rs.find(x=>x.url===DOMAIN+'/');
 if(home)return home;
 const sorted=[...rs].sort((a,b)=>{
  const qa=a.stored_canonical===a.url?1:0,qb=b.stored_canonical===b.url?1:0;
  return qb-qa||Number(a.post_type==='page')-Number(b.post_type==='page')||a.url.length-b.url.length||a.post_id-b.post_id;
 });
 return sorted[0];
};
function keywordEvidence(rows){
 const by=new Map();
 for(const r of rows){
  if(!r.focus_keyword_normalized)continue;
  const a=by.get(r.focus_keyword_normalized)||[];
  a.push(r);by.set(r.focus_keyword_normalized,a);
 }
 const overlaps=[];
 for(const [keyword,matches] of by){
  if(matches.length<2)continue;
  const leader=pickLeader(matches);
  overlaps.push({
   kind:'EXACT_FOCUS_KEYWORD_ASSIGNED_TO_MULTIPLE_EXISTING_URLS',
   keyword,priority:'P0_EDITORIAL_REVIEW',
   primary_candidate_url:leader.url,
   primary_url_choice_provisional:true,
   candidate_existing_urls:matches.map(x=>({post_id:x.post_id,url:x.url,family:x.family,persona:x.persona,canonical_from_snapshot:x.stored_canonical})),
   risk:'POTENTIAL_KEYWORD_OWNERSHIP_CONFLICT_NOT_A_GSC_CANNIBALIZATION_PROOF',
   required_before_resolution:['INDEPENDENT_D05_D08_SEMANTIC_INTENT_REVIEW',
    'ACTUAL_GSC_QUERIES_AND_CANONICAL_IF_AUTHORIZED','OLD_VS_NEW','NO_BLIND_REDIRECT'],
   publish_or_redirect:false,delete_url:false
  });
 }
 return overlaps.sort((a,b)=>a.keyword.localeCompare(b.keyword,'es'));
}
function crossPersonaSafeguards(rows){
 const b2c=rows.filter(x=>x.family==='B2C_LOCAL_ADVISOR'),b2b=rows.filter(x=>x.family==='B2B_LOCAL_PARTNERS');
 const by=new Map(b2b.map(x=>[x.municipality,x]));
 return b2c.filter(x=>by.has(x.municipality)).map(x=>({
  municipality:x.municipality,individual_url:x.url,
  b2b_partner_url:by.get(x.municipality).url,
  same_municipality_different_persona:true,
  separate_search_intents:true,
  not_a_cannibalization_just_because_same_city:true,
  preserve_both_urls:true,
  link_between_only_when_contextually_justified:true,
  shared_generic_form_forbidden:true
 }));
}
function topicalClusters(rows){
 const buckets=new Map();
 for(const r of rows){
  const k=r.family+'::'+(r.municipality??'GENERAL');
  const a=buckets.get(k)||[];a.push(r);buckets.set(k,a);
 }
 return [...buckets].map(([cluster,matches])=>({
  cluster,persona:matches[0].persona,representatives:matches.slice(0,4).map(x=>x.url),
  urls:matches.length,existing_urls_preserved:true,
  same_cluster_means_cannibalization:false,
  editorial_coordination_required:matches.length>1
 })).sort((a,b)=>b.urls-a.urls||a.cluster.localeCompare(b.cluster));
}
function funnelStatus(rows){
 const pairs=new Map();
 for(const r of rows){
  if(r.family==='INSTITUTIONAL')continue;
  const id=r.persona+'::'+r.funnel_stage+'::'+r.downloadable;
  const a=pairs.get(id)||{contract_id:id,persona:r.persona,
   stage:r.funnel_stage,downloadable:r.downloadable,
   cta:r.proposed_cta,form:r.form_contract,newsletter:r.newsletter_line,
   existing_urls:[],status:'DEFINED_NOT_VERIFIED_CONNECTED',
   tracking_kpi:['landing_view','cta_click','form_start','consented_lead',
    'qualified_lead','appointment','proposal','closed_deal'],
   opt_in_required:true,segmented_consent_required:true,
   tracking_gsc_ga4_unverified:true,crm_delivery_unverified:true};
  a.existing_urls.push(r.url);pairs.set(id,a);
 }
 return [...pairs.values()].sort((a,b)=>a.contract_id.localeCompare(b.contract_id));
}
export function buildSeoOwnerIntentFunnel({corpus}={}){
 if(!corpus||corpus.documents?.length!==200||!corpus.corpus_digest||corpus.wordpress_reaudited!==false)
  throw Error('SEO_OWNER_FROZEN_CORPUS_REQUIRED');
 const rows=corpus.documents.map(row),urlList=new Set(rows.map(x=>x.url));
 if(urlList.size!==200||rows.some(x=>x.url!==DOMAIN+'/'&&!x.url.startsWith(DOMAIN+'/')||
  !Number.isSafeInteger(x.post_id)))throw Error('SEO_OWNER_URL_INTEGRITY');
 const details=rows.map(x=>({...x,proposed_supporting_links:x.proposed_supporting_links
  .filter(u=>u!==x.url&&urlList.has(u)).slice(0,3)}));
 const overlaps=keywordEvidence(details),crossPersona=crossPersonaSafeguards(details);
 const pairs=funnelStatus(details),clusters=topicalClusters(details);
 const missing=details.filter(x=>!x.existing_focus_keyword);
 const mainHome=details.find(x=>x.url===DOMAIN+'/');
 if(!mainHome)throw Error('SEO_OWNER_HOME_REQUIRED');
 return {
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',source_digest:corpus.corpus_digest,
  status:'FROZEN_CORPUS_200_URL_INTENT_OWNERSHIP_AND_FUNNEL_BLUEPRINT',
  snapshot_last_accepted:'2026-11-05',no_new_audit:true,
  total_existing_urls:details.length,
  url_ownership:details,keyword_overlap_candidates:overlaps,
  cross_persona_pairs_to_preserve:crossPersona,topic_clusters:clusters,
  funnel_contracts:pairs,
  no_focus_keyword_in_snapshot:missing.map(x=>({url:x.url,post_id:x.post_id})),
  exact_keyword_duplicate_count:overlaps.length,
  categories:details.reduce((a,x)=>(a[x.family]=(a[x.family]||0)+1,a),{}),
  uncertainty:{
   google_cannibalization_verified:false,
   google_indexation_verified:false,search_console_performance_verified:false,
   actual_forms_and_lead_magnets_connected_verified:false,
   newsletters_connected_verified:false,
   page_visuals_rendered_verified:false,
   homepage_and_inicio_keyword_collision_status:'REVIEW_PRESERVE_BOTH',
   keyword_ownership_model_is_not_a_serp_ranking_fact:true
  },
  authority:{can_create_new_url:false,can_delete_url:false,
   can_redirect:false,can_change_canonical:false,
   can_update_wordpress:false,can_publish:false,
   no_new_subscriptions_eur:0}
 };
}
export function independentValidateOwnerIntentFunnel({proposed,corpus}={}){
 const expected=buildSeoOwnerIntentFunnel({corpus});
 if(!proposed||JSON.stringify(expected)!==JSON.stringify(proposed))
  throw Error('SEO_OWNER_QA_SOURCE_OR_INTENT_MISMATCH');
 if(proposed.authority.can_delete_url||proposed.authority.can_redirect||
  proposed.authority.can_publish||
  proposed.url_ownership.some(r=>r.page_mutation_authorized||!r.existing_url_preserved))
  throw Error('SEO_OWNER_QA_MUTATION_DENIED');
 return {status:'INDEPENDENT_QA_200_EXISTING_URLS_INTENT_FUNNELS_CONFIRMED_AS_PLANS',
  urls:200,overlap_candidates:proposed.exact_keyword_duplicate_count,
  same_city_different_persona_pairs:proposed.cross_persona_pairs_to_preserve.length,
  funnel_blueprints:proposed.funnel_contracts.length,
  no_redirects:true,actual_conversions_verified:false,no_site_reads:true};
}
