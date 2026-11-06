/**
 * SEO-D13 · one-shot, real public-data Gemini Free LAB generation.
 * PREPROD only. One API POST per run, no retry, no paid fallback, no scheduled
 * invocation. Requires authenticated owner-verified Free project attestation
 * plus the secret named only CEREBRO_GEMINI_FREE_API_KEY.
 * A successful writer output remains REVIEW_ONLY, not CMS/publication permission.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadIdentityCredentialFoundation,connectorAuthDecision,credentialReferenceDecision} from '../../../governance/identity-credential-broker.mjs';
import {routeWork} from '../../../router/execution-model-router.mjs';
import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoHumanVoiceAndRisk} from './seo-d31-human-voice-risk-gate-v0.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';

const MODEL='gemini-3.5-flash-lite';
const URL='https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent';
const FREE_SECRET='CEREBRO_GEMINI_FREE_API_KEY';
const CONNECTOR='connector:seo-gemini-free-lab';
const REF='credref:cerebro-gemini-free-api-key';
const SHA=s=>crypto.createHash('sha256').update(s).digest('hex');
const OWNER_ATTESTATION=Object.freeze({
 company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
 provider:'GOOGLE_AI_STUDIO_AUTHENTICATED_OWNER_UI',
 project:'CEREBRO-GEMINI-FREE',
 project_id:'gen-lang-client-0458863116',
 state:'NIVEL_GRATUITO_CONFIGURAR_LA_FACTURACION',
 date:'2026-11-06',
 secret_name:FREE_SECRET,
 paid_project_excluded:'fenix-capital-455809',
 authorization:'OWNER_EXPLICIT_VENGA_DALE_2026_11_06',
 max_real_inference_requests:1,max_retry_requests:0,
 max_output_tokens:4800,
 billing_change_allowed:false,paid_fallback:false
});
const BRIEF=Object.freeze({
 topic:'Qué preguntar cuando visitas tu primer piso en Córdoba',
 persona:'PARTICULARES',content_type:'ARTICLE',
 work_id:'SEO001-FENIX-D13-REAL-FREE-LAB-003',
 focus_keyword:'primera visita piso Córdoba',
 buyer_problem:'Comprador primerizo que quiere comprobar detalles prácticos y su presupuesto sin decidir por impulso',
 cta_url:'https://fenixcapital.es/contacto/',
 allowed_source_ids:['fenix_gastos','fenix_contacto'],
 sources:[
  {id:'fenix_gastos',url:'https://fenixcapital.es/gastos-compra/',
   note:'Recurso propio sobre gastos de adquisición. No atribuir cifras ni garantías.'},
  {id:'fenix_contacto',url:'https://fenixcapital.es/contacto/',
   note:'Página de contacto de Fénix Capital. No atribuir promesas ni plazos.'}
 ]
});

/** Strict company and source scope for V4 cloud LAB candidates. */
export function validateSeoV4Brief(b){
 const expected={
  'SEO001-FENIX-B2C-EDITORIAL-001':'PARTICULARES',
  'SEO001-FENIX-B2B-EDITORIAL-002':'INMOBILIARIAS'
 };
 if(!b||b.company_id!=='fenix'||b.engine_id!=='SEO-001'||b.environment!=='LAB'||
    b.version!=='V4-CANDIDATE'||b.content_type!=='ARTICLE'||
    expected[b.work_id]!==b.persona||b.customer_data_present!==false||
    b.source_readonly!==true||b.wordpress_write_authorized!==false||
    b.publish_authorized!==false||b.paid_provider_requested!==false)
    throw Error('SEO_V4_SCOPE_NOT_ALLOWED');
 for(const key of ['topic','buyer_problem','focus_keyword','search_intent','unique_angle','avoid_cannibalization']){
  if(typeof b[key]!=='string'||b[key].length<15||b[key].length>450||
     /[<>{}\x00]/.test(b[key]))throw Error('SEO_V4_BRIEF_FIELD_'+key);
 }
 if(b.cta_url!=='https://fenixcapital.es/contact/')throw Error('SEO_V4_CTA_URL');
 if(!Array.isArray(b.sources)||b.sources.length!==2)throw Error('SEO_V4_SOURCE_COUNT');
 const unique=new Set();
 for(const src of b.sources){
  if(typeof src.id!=='string'||!/^fenix_[a-z_]{4,40}$/.test(src.id)||
   unique.has(src.id)||typeof src.url!=='string'||
   !/^https:\/\/fenixcapital\.es\/[a-z0-9/-]+\/$/.test(src.url)||
   typeof src.evidence_note!=='string'||src.evidence_note.length<45||
   src.evidence_note.length>450)throw Error('SEO_V4_SOURCE_EVIDENCE');
  unique.add(src.id);
 }
 return b;
}
export function buildSeoV4OwnerPrompt(brief){
 const b=validateSeoV4Brief(brief);
 return [
  'CEREBRO SEO-D13 Fénix Capital. Esta es una prueba REAL en LAB, NO hay autorización de publicación.',
  'Redacta en español de España un artículo ORIGINAL, útil, bien investigado dentro del corpus aportado y orientado a '+b.persona+'.',
  'TEMA '+b.topic, 'BUYER PERSONA '+b.buyer_problem,
  'INTENCIÓN DE BÚSQUEDA '+b.search_intent,
  'ÁNGULO DIFERENCIADOR '+b.unique_angle,
  'Evita canibalización y repetición de contenidos ya existentes '+b.avoid_cannibalization,
  'PALABRA CLAVE '+b.focus_keyword+'; usarla de forma natural solo si encaja gramaticalmente.',
  'Estructura EXACTA: un H1 breve de 35 a 65 caracteres que invite a leer; entre 4 y 7 H2 de 30 a 65 caracteres naturales y NO numerados; 10 a 18 párrafos de 25 a 75 palabras cada uno distribuidos bajo H2.',
  'Extensión OBJETIVO 1250 a 1550 palabras visibles incluyendo FAQ. EXIGIDO al menos 1000 palabras totales y al menos 750 palabras de contenido principal EXCLUYENDO FAQ.',
  'Escribe profundidad real y ejemplos prácticos SIN inventar casos de clientes ni duplicar párrafos. Cubre objeciones, decisiones, escenarios reales, requisitos y errores frecuentes.',
  'En B2B habla a agentes y responsables de agencias, explica hitos y comunicaciones sin inventar acuerdos ni usar datos personales. En B2C habla a un comprador que ha visitado dos viviendas, no al público general.',
  'Solo 6 FAQ, en sección final con <section class="faq"><h2>Preguntas frecuentes...</h2> y exactamente 6 <div class="faq-item"><h3>¿Pregunta natural?</h3><p>Respuesta útil de 20 a 50 palabras.</p></div>. No añadas otras FAQ en otra parte.',
  'No uses dos puntos EN EL TEXTO visible; prohibidas las palabras además y en conclusión. Sin H2 numerados, sin clichés publicitarios, sin etiquetas de IA, sin relleno repetitivo.',
  'No uses garantía, financiación asegurada, promesas bancarias o cifras no contrastadas. Evita consejos jurídicos imperativos como nunca debes firmar o siempre debes pagar.',
  'No atribuyas a las fuentes afirmaciones que no están explícitamente verificadas. Si no hay datos suficientes, explica qué conviene comprobar antes de decidir.',
  'Incluye enlaces internos solo a URLs de las fuentes y a '+b.cta_url+'. CTA concreta en un párrafo final cercano al buyer persona. Sin inventar teléfonos, direcciones ni testimonios.',
  'Fuentes actuales verificadas en WordPress y contexto autorizado '+JSON.stringify(b.sources),
  'Devuelve EXCLUSIVAMENTE JSON válido con claves html (fragmento HTML) y used_source_ids (exactamente '+JSON.stringify(b.sources.map(x=>x.id))+').',
  'HTML solo h1,h2,h3,p,a,section,div; NO CSS, script, formularios, imágenes, testimonios ficticios ni texto publicitario en imagen.',
  'Antes de devolver verifica voz natural, titulares atractivos, al menos 6 preguntas completas y la longitud mínima real. Una frase útil vale más que relleno.'
 ].join('\n');
}

const hold=(code,extra={})=>Object.freeze({status:'HOLD',reason:code,
 company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
 model:MODEL,wordpress_writes:0,external_data_writes:0,
 real_inference_attempted:false,paid_fallback:false,can_publish:false,...extra});
const eligible=()=>{
 const f=loadIdentityCredentialFoundation();
 const c=connectorAuthDecision({connector_id:CONNECTOR,environment:'LAB',foundation:f});
 const r=credentialReferenceDecision({credential_ref_id:REF,consumer:'seo-d13-cloud-only-writer',environment:'LAB',foundation:f});
 if(!c.ok||!r.ok||r.symbolic_name!==FREE_SECRET||!c.credential_ref_ids?.includes(REF))return hold('IAM_FREE_PROJECT_SCOPE_DENIED');
 // ROUTE-001 is metadata and not the executor; its credential lifecycle remains
 // unverified at this point. This canary is a separately reviewed manual permit.
 return {status:'IAM_METADATA_ONLY_OK',foundation:f};
};
export function validateOneShotFreePermit(){
 const a=OWNER_ATTESTATION;
 if(a.project!=='CEREBRO-GEMINI-FREE'||a.project_id!=='gen-lang-client-0458863116'||
   a.secret_name!==FREE_SECRET||a.state!=='NIVEL_GRATUITO_CONFIGURAR_LA_FACTURACION'||
   a.paid_project_excluded!=='fenix-capital-455809'||
   a.date!=='2026-11-06'||a.max_real_inference_requests!==1||
   a.max_retry_requests!==0||a.billing_change_allowed!==false||a.paid_fallback!==false)return hold('FREE_PROJECT_PERMIT_INVALID');
 return Object.freeze({status:'FREE_PROJECT_MANUAL_ONE_SHOT_PERMIT',
  project:a.project,project_id:a.project_id,secret_name:a.secret_name,
  max_requests:1,max_retries:0,source:'AUTHENTICATED_OWNER_AI_STUDIO_UI',
  runtime_billing_automatically_proven:false,restricted_to_one_canary:true});
}
export function buildOneShotPrompt(){
 return [
 'Eres SEO-D13 de CEREBRO OS. Escribes para una persona real que busca comprar su primer piso en Córdoba, no para un algoritmo.',
 'Misión LAB aislada para evaluar calidad, nunca publicar. Escribe un texto nuevo sobre '+BRIEF.topic+'.',
 'Buyer persona concreto '+BRIEF.buyer_problem+'. Duda principal '+BRIEF.focus_keyword+'.',
 'Prioriza hablar al lector en segunda persona, frases breves y ejemplos prácticos situados en la vida cotidiana de Córdoba.',
 'Nunca fuerces una cadena de palabras clave. No escribas Primera visita piso Córdoba. Sí puedes usar Primera visita a un piso en Córdoba.',
 'H1 de 35 a 60 caracteres que despierte curiosidad, con sentido natural en castellano y sin promesas exageradas.',
 'Tres o cuatro H2 específicos que hagan querer seguir leyendo, sin enumeraciones, sin repetir la palabra clave mecánicamente.',
 'Una idea útil por párrafo, preferiblemente 20 a 48 palabras, con comas y puntuación natural.',
 'Redacta entre 1200 y 1550 palabras útiles para el artículo completo, incluyendo las seis FAQ. Al menos 750 palabras de desarrollo real deben estar FUERA de las FAQ. Rechaza párrafos vacíos o repetidos.',
 'Da detalles comprobables durante una visita como luz en otra franja horaria, ruidos, gastos de comunidad o posibles obras, sin afirmar que conoces un inmueble concreto.',
 'Ejemplo de buen H2 para este tema Qué mirar cuando se apaga el entusiasmo de la visita.',
 'Evita H2 genéricos como Da el siguiente paso con asesoramiento experto.',
 'No utilices clichés como marca la diferencia entre el acierto y el error, ni con total realismo y evitar sorpresas financieras desagradables.',
 'No uses además ni en conclusión. No pongas dos puntos visibles en ningún titular o párrafo.',
 'No escribas Nunca debes firmar, Siempre debes pagar ni instrucciones jurídicas absolutas. Sugiere revisar documentos y compromisos con un profesional cuando haga falta.',
 'No prometas hipotecas, tasaciones, resultados bancarios ni plazos. Evita cifras o normas sin fuentes directas.',
 'Termina con una CTA sobria, específica para alguien que está comparando pisos, vinculada a https://fenixcapital.es/contacto/.',
 'Puedes enlazar a https://fenixcapital.es/gastos-compra/ solo como recurso de orientación, sin atribuirle cifras o contenido no comprobado.',
 'Incluye un bloque FAQ visible al final usando <section class="faq"><h2>...</h2> y exactamente seis parejas <div class="faq-item"><h3>¿Pregunta real?</h3><p>Respuesta de 12 a 45 palabras.</p></div></section>.',
 'Las FAQ deben resolver seis dudas distintas del comprador y no repetir párrafos previos.',
 'Responde solo JSON válido con las claves html y used_source_ids, sin markdown ni explicaciones. used_source_ids es ["fenix_gastos","fenix_contacto"].',
 'HTML fragmento seguro con h1, h2, h3, p, section, div y a. Sin imágenes, scripts, estilos ni formularios.',
 'Fuentes son enlaces públicos, no prueban por sí solos afirmaciones nuevas. Todas las afirmaciones requerirán control documental.',
 'Antes de devolver comprueba que el H1 suena natural, que no hay palabras clave forzadas, que hay seis FAQ útiles, que no hay dos puntos y que las frases tienen puntuación legible.',
 'No incluyas datos personales ni supuestas experiencias reales. Solo un artículo en revisión interna.'
 ].join('\n');
}
export async function runOneShotFreeCanary({
 api_key=null,fetch_impl=globalThis.fetch,expected_secret_name=FREE_SECRET,
 owner_verified_free_project=true,policy_only=false,brief_override=null
}={}){
 const activeBrief=brief_override?validateSeoV4Brief(brief_override):BRIEF;
 const permit=validateOneShotFreePermit();
 if(permit.status!=='FREE_PROJECT_MANUAL_ONE_SHOT_PERMIT')return permit;
 if(expected_secret_name!==FREE_SECRET)return hold('PAID_OR_WRONG_SECRET_DENIED');
 const iam=eligible();
 if(iam.status!=='IAM_METADATA_ONLY_OK')return iam;
 if(owner_verified_free_project!==true)return hold('FREE_PROJECT_OWNER_UI_UNVERIFIED');
 if(policy_only)return Object.freeze({status:'ONE_SHOT_POLICY_CHECK_PASS',secret_value_read:false,
  external_requests:0,billing_automatically_proven:false,max_requests:1,can_publish:false});
 if(typeof api_key!=='string'||api_key.length<16)return hold('FREE_SECRET_NOT_AVAILABLE');
 if(typeof fetch_impl!=='function')return hold('FETCH_TRANSPORT_UNAVAILABLE');
 let calls=0,resp;
 try{
  calls++;
  resp=await fetch_impl(URL,{
   method:'POST',redirect:'error',
   headers:{'content-type':'application/json','x-goog-api-key':api_key},
   signal:AbortSignal.timeout(60000),
   body:JSON.stringify({
    contents:[{role:'user',parts:[{text:brief_override?buildSeoV4OwnerPrompt(activeBrief):buildOneShotPrompt()}]}],
    generationConfig:{responseMimeType:'application/json',
     temperature:0.55,maxOutputTokens:OWNER_ATTESTATION.max_output_tokens}
   })
  });
 }catch{return hold('PROVIDER_NETWORK_FAILURE',{real_inference_attempted:true,request_count:calls})}
 if(!resp?.ok)return hold('PROVIDER_HTTP_REJECTED',{http_status:Number(resp?.status)||null,
  real_inference_attempted:true,request_count:calls});
 let obj;try{obj=await resp.json()}catch{return hold('PROVIDER_RESPONSE_PARSE_FAILED',{real_inference_attempted:true,request_count:calls})}
 const usage=obj?.usageMetadata??{};
 const parts=obj?.candidates?.[0]?.content?.parts;
 const raw=Array.isArray(parts)?parts.filter(p=>typeof p?.text==='string').map(p=>p.text).join(''):'';
 let parsed;try{parsed=JSON.parse(raw)}catch{return hold('MODEL_NOT_JSON',{real_inference_attempted:true,request_count:calls,
  usage:{input:Number(usage.promptTokenCount||0),output:Number(usage.candidatesTokenCount||0)}})}
 const html=parsed?.html;
 const sources=parsed?.used_source_ids;
 if(typeof html!=='string'||html.length<600||html.length>18000||
  !Array.isArray(sources)||sources.length!==2||!(brief_override?activeBrief.sources.map(x=>x.id):BRIEF.allowed_source_ids).every(x=>sources.includes(x))||
  sources.some(x=>!(brief_override?activeBrief.sources.map(x=>x.id):BRIEF.allowed_source_ids).includes(x)))
  return hold('MODEL_OUTPUT_CONTRACT_INVALID',{real_inference_attempted:true,request_count:calls});
 if(/<(?:script|iframe|style|svg|img|form|object|embed|base|link)\b/i.test(html)||
    /\s(?:style|onerror|onload|onclick|srcdoc)\s*=/i.test(html)||
    [...html.matchAll(/href="([^"]+)"/g)].some(x=>!/^https:\/\/fenixcapital\.es\/[a-z0-9/%._-]+$/i.test(x[1])))
   return hold('HTML_SECURITY_REJECTED',{real_inference_attempted:true,request_count:calls});
 const qa=auditOwnerEditorialCopy({html,persona:activeBrief.persona,content_type:'ARTICLE'});
 const voice=auditSeoHumanVoiceAndRisk({html,persona:activeBrief.persona,content_type:'ARTICLE'});
 const depth=auditSeoContentDepth({html,persona:activeBrief.persona,content_type:'ARTICLE'});
 const result={
  status:(qa.deterministic_style_precheck_passed&&voice.deterministic_precheck_passed&&depth.preliminary_depth_check_passed)?'REAL_CLOUD_DRAFT_REVIEW_ONLY':'REAL_CLOUD_DRAFT_STYLE_HOLD',
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',model:MODEL,
  provider:'GOOGLE_GEMINI_FREE_PROJECT',
  work_id:activeBrief.work_id,project_id:OWNER_ATTESTATION.project_id,
  source_sha256:SHA(html),used_source_ids:sources,
  faq_count:qa.faq_count,word_count:qa.word_count,
  style_issues:qa.issues,
  voice_issues:voice.issues,
  human_voice_precheck_passed:voice.deterministic_precheck_passed,
  content_depth_precheck_passed:depth.preliminary_depth_check_passed,
  content_depth_issues:depth.issues,
  main_content_words_excluding_faq:depth.main_content_words_excluding_faq,
  required_main_words:depth.required_main_words,
  required_total_words:depth.required_total_words,
  semantic_buyer_persona_qa_independently_verified:false,
  real_inference_attempted:true,request_count:calls,retry_count:0,
  provider_usage:{input_tokens:Number(usage.promptTokenCount||0),
   output_tokens:Number(usage.candidatesTokenCount||0),
   total_tokens:Number(usage.totalTokenCount||0)},
  generated_by_cerebro_cloud_model:true,
  source_factcheck_verified:false,independent_professional_qa_verified:false,
  wordpress_writes:0,images_created:0,can_publish:false,
  billable_project_linked_observed:false,
  free_project_owner_ui_verified:true,
  automatic_billing_monitor_installed:false,
  html
 };
 return Object.freeze(result);
}
export function storeOneShotEvidence({out,output_dir}={}){
 if(typeof output_dir!=='string'||!path.isAbsolute(output_dir))throw Error('ABSOLUTE_TEMP_PATH_REQUIRED');
 const parent=path.resolve(os.tmpdir());
 const runner=path.resolve(process.env.RUNNER_TEMP||parent);
 const target=path.resolve(output_dir);
 if(![parent,runner].some(b=>target.startsWith(b+path.sep)))throw Error('OUTPUT_OUTSIDE_TEMP_DENIED');
 if(fs.existsSync(target))throw Error('OUTPUT_ALREADY_EXISTS');
 if(!out||!['HOLD','REAL_CLOUD_DRAFT_REVIEW_ONLY','REAL_CLOUD_DRAFT_STYLE_HOLD'].includes(out.status))throw Error('STATUS');
 fs.mkdirSync(target,{recursive:true,mode:0o700});
 const {html,...receipt}=out;
 fs.writeFileSync(path.join(target,'receipt.json'),JSON.stringify({...receipt,
  status_name:'ONE_SHOT_LAB_ONLY_NO_AUTOMATIC_SCHEDULE',published:false},null,2)+'\n',{mode:0o600,flag:'wx'});
 if(typeof html==='string')fs.writeFileSync(path.join(target,'candidate.html'),html,{mode:0o600,flag:'wx'});
 return {status:out.status,files:typeof html==='string'?2:1,provider_calls:out.request_count||0,wordpress_writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output)throw Error('OUTPUT_REQUIRED');
 const r=await runOneShotFreeCanary({api_key:process.env.CEREBRO_GEMINI_FREE_API_KEY||null});
 const summary=storeOneShotEvidence({out:r,output_dir:path.resolve(output)});
 // Never echo text or secret. Only count/diagnostics; visible output in artifact.
 process.stdout.write(JSON.stringify({...summary,reason:r.reason||null,faq_count:r.faq_count??null,
  style_issues:r.style_issues||null,source_sha256:r.source_sha256||null,
  usage:r.provider_usage||null,authoritative_billing_monitor:false})+'\n');
 if(!r.real_inference_attempted)process.exitCode=2;
}
