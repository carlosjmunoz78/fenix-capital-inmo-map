/**
 * SEO-D13 cloud-only LAB inference using an EXISTING registered cloud connector.
 * No local computer, no Ollama, no paid fallback; no WordPress publishing.
 * Fails closed unless IAM lifecycle and true free billing tier are confirmed.
 */
import crypto from 'node:crypto';
import {routeWork} from '../../../router/execution-model-router.mjs';
import {loadIdentityCredentialFoundation} from '../../../governance/identity-credential-broker.mjs';

import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';
const MODEL='gemini-3.5-flash-lite';
const CONNECTOR='connector:seo-gemini-free-lab';
const REF='credref:cerebro-gemini-free-api-key';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function buildCloudEditorialPrompt(brief){
 if(!brief||brief.company_id!=='fenix'||brief.engine_id!=='SEO-001'||
  brief.environment!=='PREPROD'||brief.version!=='0.1.0'||
  !['ARTICLE','LANDING'].includes(brief.content_type)||
  !['PARTICULARES','INMOBILIARIAS'].includes(brief.persona)||
  typeof brief.work_id!=='string'||!/^SEO001-FENIX-[A-Z0-9-]{8,80}$/.test(brief.work_id)||
  brief.customer_data_present!==false||brief.source_readonly!==true||
  brief.financial_claims_preverified!==false||
  brief.wordpress_write_authorized!==false||brief.publish_authorized!==false||
  brief.paid_provider_requested!==false)throw Error('CLOUD_EDITORIAL_SCOPE_INVALID');
 for(const key of ['topic','buyer_problem','conversion_goal','focus_keyword']){
  if(typeof brief[key]!=='string'||brief[key].length<5||brief[key].length>200||
   /[<>{}]/.test(brief[key]))throw Error('CLOUD_EDITORIAL_BRIEF_'+key);
 }
 if(!/^https:\/\/fenixcapital\.es\/[a-z0-9/%._-]+$/i.test(brief.cta_url||''))
  throw Error('CLOUD_EDITORIAL_CTA');
 if(!Array.isArray(brief.sources)||brief.sources.length<2||brief.sources.length>8)
  throw Error('CLOUD_EDITORIAL_SOURCES');
 for(const source of brief.sources){
  if(!source||source.corpus_evidence_verified!==true||
   !/^[A-Za-z0-9_-]{3,60}$/.test(source.id||'')||
   !/^https:\/\/(?:fenixcapital\.es|www\.boe\.es|www\.bde\.es|www\.juntadeandalucia\.es)\/[a-zA-Z0-9/%._?=#&-]+$/.test(source.url||'')||
   typeof source.quote_or_paraphrase!=='string'||source.quote_or_paraphrase.length<25)
   throw Error('CLOUD_EDITORIAL_SOURCE_NOT_VERIFIED');
 }
 const min_faq=brief.content_type==='ARTICLE'?6:8;
 const isArticle=brief.content_type==='ARTICLE';
 const min_total_words=isArticle?1000:900;
 const min_main_words=isArticle?750:600;
 const prompt=[
  'SEO-D13 CEREBRO FENIX. Escribe borrador HTML profesional en español de Córdoba SOLO para revisión.',
  'Persona '+brief.persona+' tema '+brief.topic+' problema '+brief.buyer_problem,
  'Intención '+brief.focus_keyword+' conversión '+brief.conversion_goal,
  'H1 corto. H2 atractivos sin numerar. Prosa cercana. Sin dos puntos visibles.',
  'Evita las expresiones además y en conclusión. Nada de párrafos de relleno.',
  'Extensión mínima '+min_total_words+' palabras visibles, de ellas '+min_main_words+' de desarrollo útil fuera de las FAQ.',
  'Objetivo orientativo '+(isArticle?'1200 a 1800':'1000 a 1600')+' palabras, sin hinchar el texto con repeticiones.',
  'Incluye al menos '+min_faq+' FAQ naturales visibles dentro de una section con clase faq.',
  'Cada pregunta en H3 dentro de div class faq-item y respuesta en p de 12 a 65 palabras.',
  'No inventes normativa ni concedas hipotecas. Todas las afirmaciones requieren revisión.',
  'Incluye CTA con '+brief.cta_url,
  'Usa solo las fuentes documentadas '+JSON.stringify(brief.sources.map(x=>({
   id:x.id,url:x.url,verified_text:x.quote_or_paraphrase
  }))),
  'Devuelve SOLO JSON con html y used_source_ids. Sin código de página ni formularios.'
 ].join('\n');
 return {prompt,min_faq,min_total_words,min_main_words};
}

const hold=(reason,fields={})=>Object.freeze({
 status:'HOLD',reason,company_id:'fenix',engine_id:'SEO-001',
 environment:'PREPROD',inference_environment:'LAB',
 cloud_only:true,local_pc_required:false,paid_api_calls:0,
 wordpress_writes:0,additional_cost_eur:0,publish_authorized:false,...fields
});
export function evaluateSeoCloudWriter({
 brief,has_secret=false,provider_free_tier_confirmed=false,
 billing_disabled_confirmed=false,lifecycle_state=null,foundation=null
}={}){
 const p=buildCloudEditorialPrompt(brief);
 if(!has_secret)return hold('CLOUD_SECRET_NOT_AVAILABLE');
 if(!provider_free_tier_confirmed||!billing_disabled_confirmed)return hold('CLOUD_FREE_NO_BILLING_GATE');
 const result=routeWork({
  company_id:'fenix',task_type:'redaction',environment:'LAB',confidence:0.9,
  risk:'MEDIUM',contains_customer_data:false,contains_secrets:false,
  prod_write_requested:false,paid_route_requested:false,
  estimated_paid_cost_eur:0,lifecycle_state,
  available_resources:[{resource_id:'SEO_GEMINI_EXISTING_FREE_LAB',
   resource_class:'FREE_AI',connector_id:CONNECTOR,available:true,
   capabilities:['redaction'],incremental_cost_eur:0,ai:true,
   privacy:'REGISTERED_EXISTING_PATH'}]
 },{foundation:foundation??loadIdentityCredentialFoundation()});
 if(result.status!=='ROUTED'||result.selected_resource_class!=='FREE_AI')
  return hold('CLOUD_IAM_ROUTE_NOT_READY',{router_status:result.status});
 return Object.freeze({status:'CLOUD_ONLY_FREE_LAB_READY',provider:'GEMINI_FREE_LAB',
  model:MODEL,connector_id:CONNECTOR,credential_ref_id:REF,
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  inference_environment:'LAB',prompt:p.prompt,min_faq:p.min_faq,
  min_total_words:p.min_total_words,min_main_words:p.min_main_words,
  cloud_only:true,local_pc_required:false,paid_api_calls:0,
  wordpress_writes:0,additional_cost_eur:0,publish_authorized:false});
}
function extract(obj){
 const parts=obj?.candidates?.[0]?.content?.parts;
 if(!Array.isArray(parts))return null;
 const txt=parts.filter(p=>typeof p?.text==='string').map(p=>p.text).join('').trim();
 try{return JSON.parse(txt)}catch{return null}
}
export async function runSeoCloudWriter({
 brief,api_key=null,provider_free_tier_confirmed=false,
 billing_disabled_confirmed=false,lifecycle_state=null,foundation=null,
 fetch_impl=globalThis.fetch
}={}){
 // Never infer actual project billing from boolean flags or an API key.
 // A project-bound, provider-authenticated billing attestation is not yet integrated.
 // Keep real inference egress disabled, even if callers pass 'true' to stale flags.
 return hold('GEMINI_PROJECT_BILLING_ATTESTATION_NOT_AVAILABLE_NO_INFERENCE');
 // Legacy implementation deliberately unreachable until independent provider-side proof is implemented.
 const gate=evaluateSeoCloudWriter({
  brief,has_secret:typeof api_key==='string'&&api_key.length>=16,
  provider_free_tier_confirmed,billing_disabled_confirmed,lifecycle_state,foundation
 });
 if(gate.status!=='CLOUD_ONLY_FREE_LAB_READY')return gate;
 if(typeof fetch_impl!=='function')return hold('CLOUD_TRANSPORT_MISSING');
 const url='https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent';
 let response;
 try{
  response=await fetch_impl(url,{method:'POST',
   headers:{'content-type':'application/json','x-goog-api-key':api_key},
   signal:AbortSignal.timeout(60000),
   body:JSON.stringify({
    contents:[{role:'user',parts:[{text:gate.prompt}]}],
    generationConfig:{responseMimeType:'application/json',
     maxOutputTokens:4800,temperature:0.6}
   })
  });
 }catch{return hold('CLOUD_PROVIDER_TRANSPORT_FAILED')}
 if(!response?.ok)return hold('CLOUD_PROVIDER_REJECTED',{http_status:response?.status??null});
 let responseData;try{responseData=await response.json()}catch{return hold('CLOUD_PROVIDER_JSON_ERROR')}
 const x=extract(responseData);
 if(!x||typeof x.html!=='string'||x.html.length<1000||x.html.length>20000||
  !Array.isArray(x.used_source_ids))return hold('CLOUD_INVALID_OUTPUT');
 const sourceIds=new Set(brief.sources.map(s=>s.id));
 if(x.used_source_ids.length<2||x.used_source_ids.some(id=>!sourceIds.has(id)))
  return hold('CLOUD_UNSUPPORTED_SOURCES');
 if(/<(script|iframe|img|svg|form|style|object|embed|link)\b/i.test(x.html)||
    /\s(?:onerror|onclick|onload|style)\s*=/i.test(x.html))
  return hold('CLOUD_ACTIVE_HTML_DENIED');
 const qa=auditOwnerEditorialCopy({html:x.html,persona:brief.persona,content_type:brief.content_type});
 const depth=auditSeoContentDepth({html:x.html,persona:brief.persona,content_type:brief.content_type});
 if(!qa.deterministic_style_precheck_passed||!depth.preliminary_depth_check_passed)
  return hold('CLOUD_STYLE_FAQ_OR_DEPTH_FAIL',{issues:[...qa.issues,...depth.issues],total_words:depth.total_visible_words,main_words:depth.main_content_words_excluding_faq});
 return Object.freeze({status:'SEO_D13_CLOUD_DRAFT_CREATED_FOR_QA',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  inference_environment:'LAB',model:MODEL,
  generated_by_cerebro_cloud_model:true,
  sha256:hash(x.html),html:x.html,faq_count:qa.faq_count,
  source_ids:x.used_source_ids,independent_fact_check_verified:false,
  visual_producer_bound:false,publish_authorized:false,
  wordpress_writes:0,paid_api_calls:0,additional_cost_eur:0});
}
export const SEO_D13_CLOUD_ONLY=Object.freeze({
 connector_id:CONNECTOR,cloud_only:true,local_pc_required:false,
 local_ollama_required:false,
 ai_endpoint:'GOOGLE_GEMINI_FREE_PROJECT_LAB_ONLY',
 free_secret_symbolic_name:'CEREBRO_GEMINI_FREE_API_KEY',
 paid_project_key_forbidden:true,
 mandatory_billing:'FREE_TIER_BILLING_DISABLED',
 allow_paid_fallback:false,external_customer_data_allowed:false,
 release_authorized:false,wordpress_writes:false});
