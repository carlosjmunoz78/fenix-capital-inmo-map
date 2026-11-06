/**
 * SEO-D13 (PREPROD). Truly invokes a locally installed model only when its
 * own Ollama /api/tags proves a requested model exists. Never uses paid AI.
 * All generated prose is a REVIEW CANDIDATE, not publication-authorized.
 * Existing ROUTE-001 selects resources. It does not itself execute the model.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {routeWork} from '../../../router/execution-model-router.mjs';
import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';

const sha256=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const reason=(code)=>Object.freeze({status:'HOLD',reason:code,company_id:'fenix',
 engine_id:'SEO-001',environment:'PREPROD',external_writes:0,
 wordpress_writes:0,paid_api_calls:0,publish_authorized:false});
const denied=(code)=>{throw Error('SEO_D13_'+code)};
export const LOCAL_ENDPOINT='http://127.0.0.1:11434';
const SAFE_URL=/^https:\/\/fenixcapital\.es\/[A-Za-z0-9/%._?=-]*$/;
const SAFE_PUBLIC_SOURCE=/^https:\/\/(?:fenixcapital\.es|www\.boe\.es|www\.juntadeandalucia\.es|www\.bde\.es)\/[A-Za-z0-9/%._?=#&-]+$/;
const SAFE_MODEL=/^[A-Za-z0-9][A-Za-z0-9:._-]{2,80}$/;
const inputText=(x,k,max=200)=>{if(typeof x!=='string'||x.trim().length<3||x.length>max||/[<>{}\0]/.test(x))denied(k);return x.trim()};
function checkBrief(b){
 if(!b||b.company_id!=='fenix'||b.engine_id!=='SEO-001'||b.environment!=='PREPROD'||b.version!=='0.1.0')denied('CONTEXT');
 if(!['ARTICLE','LANDING'].includes(b.content_type)||!['PARTICULARES','INMOBILIARIAS'].includes(b.persona))denied('SCOPE');
 if(!/^[A-Z0-9-]{15,90}$/.test(b.work_id||''))denied('WORK_ID');
 for(const key of ['topic','buyer_problem','conversion_goal','focus_keyword'])inputText(b[key],key.toUpperCase(),190);
 if(!SAFE_URL.test(b.cta_url||''))denied('CTA_URL');
 if(b.source_readonly!==true||b.customer_data_present!==false||b.financial_claims_preverified!==false)denied('SOURCE_POLICY');
 if(!Array.isArray(b.sources)||b.sources.length<2||b.sources.length>10)denied('SOURCE_COUNT');
 const ids=new Set();
 for(const source of b.sources){
  if(!source||!/^[A-Za-z0-9_-]{3,50}$/.test(source.id||'')||ids.has(source.id)||
   !SAFE_PUBLIC_SOURCE.test(source.url||'')||source.corpus_evidence_verified!==true||
   typeof source.quote_or_paraphrase!=='string'||source.quote_or_paraphrase.length<25||
   source.quote_or_paraphrase.length>500)denied('SOURCE_EVIDENCE');
  ids.add(source.id);
 }
 if(b.paid_provider_requested!==false||b.wordpress_write_authorized!==false||b.publish_authorized!==false)denied('PERMISSION');
 return b;
}
const localResources=model=>[{
 resource_id:'SEO_D13_LOCAL_OLLAMA_'+model.replace(/[^A-Za-z0-9]/g,'_'),
 resource_class:'LOCAL_AI',available:true,
 capabilities:['redaction'],incremental_cost_eur:0,
 privacy:'LOCAL',ai:true,latency_ms:1000
}];
const preventHTML=s=>{
 if(/<(?:script|iframe|style|svg|img|form|object|embed|base|link)\b/i.test(s)||
    /\s(?:style|onload|onclick|onerror|onfocus|srcdoc)\s*=/i.test(s))denied('ACTIVE_HTML');
 const urls=[...s.matchAll(/\bhref="([^"]+)"/g)].map(x=>x[1]);
 if(urls.some(u=>!SAFE_URL.test(u)))denied('EXTERNAL_LINK');
 if(s.length>20000||s.length<1500||s.includes('<!doctype')||s.includes('<html'))denied('HTML_BOUNDARY');
};
export function buildAutonomousSeoPrompt(brief){
 const b=checkBrief(brief);
 const minFaq=b.content_type==='ARTICLE'?6:8;
 const sourceLines=b.sources.map(s=>({id:s.id,url:s.url,fact:s.quote_or_paraphrase}));
 const outputContract={
  html:'<h1>...</h1><p>...</p><h2>...</h2><p>...</p><section class="faq" aria-label="..."><h2>...</h2><div class="faq-item"><h3>¿...?</h3><p>...</p></div></section>',
  used_source_ids:['SOURCE_ID_1','SOURCE_ID_2']
 };
 const prompt=[
 'Eres SEO-D13 de CEREBRO OS. Genera una PROPUESTA editorial en español de Córdoba, no una página publicada.',
 'PERSONA '+b.persona+' | TIPO '+b.content_type+' | OBJETIVO '+b.conversion_goal,
 'TEMA '+b.topic+' | NECESIDAD '+b.buyer_problem+' | PALABRA CLAVE '+b.focus_keyword,
 'El título H1 debe ser corto, atractivo y natural. Encabezados H2 breves, con intención de búsqueda, nunca numerados.',
 'No uses dos puntos visibles, ni las expresiones además o en conclusión. Evita fórmulas repetidas o tono mecánico.',
 'Incluye un bloque FAQ visible con al menos '+minFaq+' preguntas reales de la persona objetivo; usa h3 por pregunta y una respuesta útil de 12 a 65 palabras.',
 'No afirmes que una hipoteca está garantizada ni inventes normas, estadísticas, garantías, citas, reseñas o fuentes.',
 'No añadas formularios ni recursos externos. Termina con CTA para '+b.cta_url+'.',
 'Usa únicamente los hechos del paquete, sin datos personales. Si faltan datos devuelve objeto con error y no inventes.',
 'HECHOS Y EVIDENCIAS '+JSON.stringify(sourceLines),
 'Devuelve exclusivamente JSON con las claves html (HTML fragment) y used_source_ids (lista de identificadores realmente utilizados).',
 'ESTRUCTURA DEL RESULTADO '+JSON.stringify(outputContract)
 ].join('\n');
 return Object.freeze({prompt,min_faq:minFaq,source_count:b.sources.length,company_id:'fenix',
  engine_id:'SEO-001',environment:'PREPROD',no_new_paid_calls:true});
}
const json=async(r,label)=>{if(!r?.ok)return null;try{return await r.json()}catch{return null}};
export async function generateSeoDraftWithLocalModel({brief,model='qwen2.5:7b',
 fetch_impl=globalThis.fetch,endpoint=LOCAL_ENDPOINT,timeout_ms=60000,simulation=false}={}){
 // Historical isolated prototype retained for audit; hard-disabled by cloud-only owner architecture.
 return reason('CLOUD_ONLY_POLICY_LOCAL_EXECUTION_DISABLED');
 // Legacy implementation deliberately unreachable.
 const b=checkBrief(brief);
 const prompt=buildAutonomousSeoPrompt(b);
 if(endpoint!==LOCAL_ENDPOINT)denied('EXTERNAL_HOST_OR_SSRF');
 if(!SAFE_MODEL.test(model))denied('MODEL_NAME');
 if(typeof fetch_impl!=='function'||!Number.isSafeInteger(timeout_ms)||timeout_ms<1000||timeout_ms>120000)denied('TRANSPORT');
 let health;
 try{
  const r=await fetch_impl(endpoint+'/api/tags',{method:'GET',signal:AbortSignal.timeout(Math.min(5000,timeout_ms))});
  health=await json(r,'TAGS');
 }catch{return reason('LOCAL_OLLAMA_UNAVAILABLE')}
 const installed=Array.isArray(health?.models)&&health.models.some(x=>x?.name===model||x?.model===model);
 if(!installed)return reason('LOCAL_MODEL_NOT_INSTALLED');
 const selected=routeWork({
  company_id:'fenix',task_type:'redaction',environment:'PREPROD',confidence:0.9,risk:'MEDIUM',
  contains_customer_data:false,contains_secrets:false,prod_write_requested:false,
  paid_route_requested:false,estimated_paid_cost_eur:0,available_resources:localResources(model)
 });
 if(selected.status!=='ROUTED'||selected.selected_resource_class!=='LOCAL_AI'||selected.estimated_incremental_cost_eur!==0)
  return reason('MODEL_ROUTER_NOT_READY');
 let generated;
 try{
  const r=await fetch_impl(endpoint+'/api/generate',{
   method:'POST',headers:{'content-type':'application/json'},
   signal:AbortSignal.timeout(timeout_ms),
   body:JSON.stringify({model,prompt:prompt.prompt,stream:false,format:'json',
    options:{num_predict:2600,temperature:0.65}})
  });
  generated=await json(r,'GENERATE');
 }catch{return reason('LOCAL_MODEL_GENERATION_FAILED')}
 if(generated?.done!==true||generated?.model!==model||typeof generated.response!=='string')
  return reason('INCOMPLETE_PROVIDER_RESPONSE');
 let response;try{response=JSON.parse(generated.response)}catch{return reason('INVALID_MODEL_JSON')}
 if(!response||typeof response.html!=='string'||!Array.isArray(response.used_source_ids))
  return reason('INVALID_GENERATED_CONTRACT');
 const ids=new Set(b.sources.map(x=>x.id));
 if(response.used_source_ids.length<2||response.used_source_ids.some(x=>!ids.has(x))||
    new Set(response.used_source_ids).size!==response.used_source_ids.length)return reason('SOURCE_COVERAGE_NOT_PROVEN');
 preventHTML(response.html);
 const quality=auditOwnerEditorialCopy({html:response.html,persona:b.persona,content_type:b.content_type});
 if(!quality.deterministic_style_precheck_passed)return Object.freeze({
  ...reason('OWNER_STYLE_OR_FAQ_QA_FAIL'),issues:quality.issues,faq_count:quality.faq_count,
  source_sha256:sha256(response.html),model,simulation
 });
 return Object.freeze({status:'SEO_D13_LOCAL_MODEL_DRAFT_CREATED_REVIEW_ONLY',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
  work_id:b.work_id,source_ids:response.used_source_ids,
  html:response.html,sha256:sha256(response.html),model,provider:'OLLAMA_LOCAL_LOOPBACK',
  external_writes:0,wordpress_writes:0,paid_api_calls:0,
  additional_cost_eur:0,simulation,faq_count:quality.faq_count,
  editorial_qa_precheck:true,source_fact_check_verified:false,
  seo_independent_review_verified:false,can_publish:false,release_authorized:false});
}
