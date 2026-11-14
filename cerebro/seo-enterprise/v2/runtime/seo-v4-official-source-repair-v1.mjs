/**
 * SEO-D31 source-guided corrective pass V4.1 on genuine Gemini Free samples.
 * No model requests, no publication, no image/CMS writes. Hard source SHA lock
 * and exactly-once phrase replacement. Still needs professional YMYL review.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';
import {auditSeoHumanVoiceAndRisk} from './seo-d31-human-voice-risk-gate-v0.mjs';
import {loadDocumentaryRiskLedger} from './seo-v4-documentary-risk-gate-v1.mjs';
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const halt=x=>{throw Error('SEO_V4_OFFICIAL_SOURCE_'+x)};
export const SOURCE_GUIDED_REPAIRS=Object.freeze({
 'SEO001-FENIX-B2C-EDITORIAL-001':[
 ['comprobar la titularidad exacta y la ausencia de cargas ocultas',
  'conocer la titularidad inscrita y las cargas que figuran en el Registro'],
 ['Asegúrate de que la superficie construida y útil reflejada en el registro coincide con la realidad física que has visitado y que no existen discrepancias catastrales complejas.',
  'Contrasta la superficie y la descripción que figuren en los documentos registrales, catastrales y técnicos. Si hay diferencias, conviene aclararlas con el profesional correspondiente antes de decidir.'],
 ['Este documento protege al comprador frente a deudas acumuladas por el anterior propietario que pudieran reclamarse posteriormente a la propia vivienda adquirida.',
  'Este certificado ayuda a conocer el estado de deudas comunitarias, aunque no elimina por sí solo la responsabilidad que la ley puede vincular al inmueble por cantidades pendientes. Revisa esa situación antes de la firma.'],
 ['Estudiar los productos vinculados obligatorios, como seguros de hogar o tarjetas de crédito, ayuda a calcular el coste financiero global real de la operación a lo largo de los años.',
  'Compara el coste de las ofertas con y sin productos asociados, como determinados seguros, y revisa qué condiciones son exigibles y cuáles son opcionales. Las ventas vinculadas están sujetas a límites y excepciones legales, por lo que conviene aclarar las condiciones de cada entidad.'],
 ['Recuerda que los bancos suelen tasar el inmueble según criterios propios muy conservadores, por lo que disponer de liquidez adicional para cubrir la diferencia resulta determinante.',
  'La tasación hipotecaria la realiza una entidad o profesional homologado independiente del prestamista. La concesión del préstamo depende también de tu capacidad de pago y de la política de riesgo de cada banco, no únicamente del valor de tasación.']
 ],
 'SEO001-FENIX-B2B-EDITORIAL-002':[
 ['La comunicación constante entre ambos profesionales asegura que ninguna información relevante se pierda en el camino hacia la formalización de la reserva inmobiliaria.',
  'Una comunicación ordenada entre ambos profesionales ayuda a reducir malentendidos durante la operación, aunque no elimina por completo posibles incidencias ni sustituye los protocolos de protección de datos.'],
 ['Permitir que el comprador explore sus opciones de financiación con el asesor externo antes de bloquear el inmueble aporta tranquilidad y reduce drásticamente las rupturas contractuales posteriores.',
  'Dar al comprador la posibilidad de estudiar su financiación antes de asumir compromisos puede reducir incertidumbres y ayudarle a decidir con información. Las consecuencias de una reserva dependen de lo acordado y de cada operación.'],
 ['Se desestima la propuesta de forma limpia antes de formalizar reservas, protegiendo los intereses del comprador y del vendedor.',
  'Si el estudio resulta desfavorable, conviene revisar la situación y los compromisos que ya existan, informar con claridad a las partes y valorar las opciones conforme a la documentación y al asesoramiento correspondiente.'],
 ['Por su parte, el asesor financiero asume el estudio pormenorizado de la capacidad de endeudamiento y la relación con las entidades bancarias colaboradoras.',
  'Por su parte, el profesional hipotecario, cuando esté habilitado para las funciones que desempeñe, puede encargarse del análisis financiero y la relación con las entidades según el servicio contratado y las obligaciones aplicables.']
 ]
});
const EXPECTED_HASHES=Object.freeze({
 'SEO001-FENIX-B2C-EDITORIAL-001':'96b340eba8d97d56fd9e2ce9644df9d2b8855759301180fbf0351630e351d88d',
 'SEO001-FENIX-B2B-EDITORIAL-002':'ffc9d8d4f32dbc8e77ec9d9f4e7ba2bfb98a35141a91a85f1b420e27bed00583'
});
export function repairSourceGuidedCandidate({work_id,html,root=process.cwd()}={}){
 const ledger=loadDocumentaryRiskLedger({root});
 const src=ledger.articles.find(x=>x.work_id===work_id);
 const changes=SOURCE_GUIDED_REPAIRS[work_id];
 if(!src||!changes||typeof html!=='string'||sha(html)!==src.sha256)
  halt('SOURCE_HASH_OR_WORK_ID_MISMATCH');
 const matched=new Set();
 let next=html;
 for(const [from,to] of changes){
  if(!from||!to||next.split(from).length!==2||/<[^>]*>/.test(to)||
   /\bademás\b|\ben conclusión\b|:/.test(to)||to.length>700)
   halt('UNSAFE_OR_AMBIGUOUS_PHRASE_REPLACEMENT');
  next=next.replace(from,to);
  matched.add(from);
 }
 for(const risk of src.issues){
  if(!html.includes(risk.needle))halt('LEDGER_PREIMAGE_MISSING');
  if(next.includes(risk.needle))halt('DOCUMENTARY_RISK_NOT_REMOVED');
 }
 const newsum=sha(next);
 if(newsum!==EXPECTED_HASHES[work_id])halt('REPAIRED_OUTPUT_DIGEST_DRIFT');
 const persona=src.persona;
 const style=auditOwnerEditorialCopy({html:next,persona,content_type:'ARTICLE'});
 const voice=auditSeoHumanVoiceAndRisk({html:next,persona,content_type:'ARTICLE'});
 const depth=auditSeoContentDepth({html:next,persona,content_type:'ARTICLE'});
 const reasons=[...style.issues.map(x=>'STYLE_'+x),...voice.issues.map(x=>'VOICE_'+x),...depth.issues.map(x=>'DEPTH_'+x)];
 return Object.freeze({
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  version:'V4.1-SOURCE-GUIDED-NOT-LEGAL-SIGNOFF',
  work_id,persona,source_sha256:src.sha256,new_sha256:newsum,
  original_official_source_risk_count:src.issues.length,
  exact_repairs_applied:matched.size,original_flagged_phrases_removed:true,
  status:reasons.length?'TECHNICAL_QA_HOLD':'TECHNICAL_QA_PASS_INDEPENDENT_REVIEW_HOLD',
  technical_qa_issues:reasons,
  words:depth.total_visible_words,main_words:depth.main_content_words_excluding_faq,
  faq_count:depth.faq_count,
  individual_factual_claims_verified:false,
  independent_legal_professional_signoff:false,
  seo_editor_independent_review_verified:false,
  source_guided_revision_is_not_legal_advice:true,
  needs_new_hash_bound_release_receipt:true,
  real_model_calls:0,paid_provider_calls:0,image_api_calls:0,
  wordpress_writes:0,publish_authorized:false,html:next
 });
}
export function writeSourceGuidedRevision({results,output_dir}={}){
 if(!Array.isArray(results)||results.length!==2||typeof output_dir!=='string'||!path.isAbsolute(output_dir)||output_dir.includes('..'))halt('OUTPUT');
 const where=path.resolve(output_dir);
 const dirs=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!dirs.some(x=>where.startsWith(x+path.sep))||fs.existsSync(where))halt('NOT_ISOLATED');
 fs.mkdirSync(where,{recursive:true,mode:0o700});
 const records=[];
 for(const r of results){
  if(r.company_id!=='fenix'||r.publish_authorized!==false||
   r.real_model_calls!==0||r.wordpress_writes!==0||!EXPECTED_HASHES[r.work_id])halt('RESULT_SCOPE');
  const prefix=r.persona==='PARTICULARES'?'compradores':'inmobiliarias';
  const {html,...receipt}=r;
  fs.writeFileSync(path.join(where,prefix+'-v4-1-review-only.html'),html,{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(where,prefix+'-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  records.push({work_id:r.work_id,sha256:r.new_sha256,issues:r.technical_qa_issues,
   words:r.words,main_words:r.main_words,faq:r.faq_count,owner_approved:false,
   independent_legal_qa:false,publish_authorized:false});
 }
 fs.writeFileSync(path.join(where,'manifest.json'),JSON.stringify({company_id:'fenix',
  engine_id:'SEO-001',environment:'PREPROD',version:'V4.1',items:records,
  ai_model_calls:0,image_api_calls:0,wordpress_writes:0,
  publication_authorized:false},null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:'SOURCE_GUIDED_V4_1_REVIEW_PACKAGE_CREATED',items:records,wordpress_writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=process.argv[2],output=process.argv[3];
 if(!input||!output)halt('ARGS');
 const works=[
  ['SEO001-FENIX-B2C-EDITORIAL-001','b2c-v4-review-only.html'],
  ['SEO001-FENIX-B2B-EDITORIAL-002','b2b-v4-review-only.html']
 ];
 const results=works.map(([work_id,filename])=>repairSourceGuidedCandidate({
  work_id,html:fs.readFileSync(path.join(input,filename),'utf8')
 }));
 const receipt=writeSourceGuidedRevision({results,output_dir:path.resolve(output)});
 process.stdout.write(JSON.stringify(receipt)+'\n');
}
