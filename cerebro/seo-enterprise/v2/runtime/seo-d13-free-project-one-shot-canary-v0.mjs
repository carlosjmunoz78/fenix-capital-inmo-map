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
 max_output_tokens:3400,
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
 'Eres el redactor SEO-D13 de CEREBRO OS, empresa Fénix Capital, Córdoba, España.',
 'Misión de prueba REAL en LAB, NO publicar. Redacta un borrador ORIGINAL, natural, útil y cercano para particulares.',
 'Tema '+BRIEF.topic+'. Buyer persona '+BRIEF.buyer_problem+'. Palabra clave '+BRIEF.focus_keyword+'.',
 'Redacta entre 340 y 580 palabras en total, contando preguntas y respuestas.',
 'Usa UN H1 menor de 65 caracteres, 3 o 4 H2 naturales, cortos, atractivos y sin numerar.',
 'El artículo debe cerrar con la sección <section class="faq"><h2>...</h2> y EXACTAMENTE seis',
 'parejas <div class="faq-item"><h3>¿Pregunta real?</h3><p>Respuesta útil de 12 a 45 palabras.</p></div></section>.',
 'Sin dos puntos visibles en el texto ni en los títulos, sin las expresiones además ni en conclusión.',
 'No inventes estadísticas, testimonios, tasaciones, legislación, promesas de aprobación bancaria ni garantías.',
 'La revisión documental, los gastos y la financiación dependen de cada inmueble y persona.',
 'Incluye una invitación final sencilla a consultar con Fénix Capital usando un enlace',
 '<a href="https://fenixcapital.es/contacto/">contacta con Fénix Capital</a>.',
 'Puedes enlazar a https://fenixcapital.es/gastos-compra/ sin inventar su contenido.',
 'Responde SOLO JSON válido sin markdown con claves html y used_source_ids.',
 'used_source_ids debe ser el array ["fenix_gastos","fenix_contacto"].',
 'HTML como fragmento seguro con H1,H2,H3,p,section,div y a. Sin scripts, estilos ni imágenes.',
 'Las fuentes declaradas son solo enlaces públicos propios. El texto final pasará fact-check humano o independiente.',
 'No incluyas datos personales ni supuestas experiencias reales.'
 ].join('\n');
}
export async function runOneShotFreeCanary({
 api_key=null,fetch_impl=globalThis.fetch,expected_secret_name=FREE_SECRET,
 owner_verified_free_project=true,policy_only=false
}={}){
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
    contents:[{role:'user',parts:[{text:buildOneShotPrompt()}]}],
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
  !Array.isArray(sources)||sources.length!==2||!BRIEF.allowed_source_ids.every(x=>sources.includes(x))||
  sources.some(x=>!BRIEF.allowed_source_ids.includes(x)))
  return hold('MODEL_OUTPUT_CONTRACT_INVALID',{real_inference_attempted:true,request_count:calls});
 if(/<(?:script|iframe|style|svg|img|form|object|embed|base|link)\b/i.test(html)||
    /\s(?:style|onerror|onload|onclick|srcdoc)\s*=/i.test(html)||
    [...html.matchAll(/href="([^"]+)"/g)].some(x=>!/^https:\/\/fenixcapital\.es\/[a-z0-9/%._-]+$/i.test(x[1])))
   return hold('HTML_SECURITY_REJECTED',{real_inference_attempted:true,request_count:calls});
 const qa=auditOwnerEditorialCopy({html,persona:'PARTICULARES',content_type:'ARTICLE'});
 const result={
  status:qa.deterministic_style_precheck_passed?'REAL_CLOUD_DRAFT_REVIEW_ONLY':'REAL_CLOUD_DRAFT_STYLE_HOLD',
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',model:MODEL,
  provider:'GOOGLE_GEMINI_FREE_PROJECT',
  work_id:BRIEF.work_id,project_id:OWNER_ATTESTATION.project_id,
  source_sha256:SHA(html),used_source_ids:sources,
  faq_count:qa.faq_count,word_count:qa.word_count,
  style_issues:qa.issues,
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
