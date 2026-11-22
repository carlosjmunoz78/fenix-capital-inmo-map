/**
 * SEO-001 additive owner-feedback correction of two immutable V4 cloud samples.
 * Exact digest + exact phrase allowlist, no generative provider request.
 * Physical output remains new UNAPPROVED candidate; no CMS/media mutations.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';
import {auditSeoHumanVoiceAndRisk} from './seo-d31-human-voice-risk-gate-v0.mjs';
import {inspectCandidateSeoHandoff} from './seo-circuit-readiness-orchestrator-v0.mjs';
const h=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const denied=s=>{throw Error('SEO_D13_V4_REPAIR_'+s)};
export const RULESET=Object.freeze({
 'SEO001-FENIX-B2C-EDITORIAL-001':{
  original_sha256:'eb047007504311dca7b4cdb98e2a622e2677b943f2dbca196b60a9806bcbb358',
  persona:'PARTICULARES',
  corrections:[
   ['Primeras impresiones frente a los datos reales tras salir del portal',
    'Lo que recuerdas de cada piso al llegar a casa'],
   ['Mientras que el primer piso destacaba por una cocina moderna reformada recientemente, el segundo ofrecía una terraza amplia que compensaba un salón algo más reducido.',
    'Por ejemplo, una vivienda puede tener una cocina reformada y la otra una terraza amplia, aunque con un salón más pequeño. Esa diferencia no pesa igual si pasas más tiempo cocinando que recibiendo visitas.'],
   ['La nota simple permite verificar la titularidad real del inmueble, comprobar su superficie exacta y confirmar que no existen cargas, embargos u otras limitaciones jurídicas ocultas.',
    'La nota simple ofrece información registral sobre la titularidad, la descripción y las cargas que constan en el Registro. Conviene contrastarla con la documentación disponible y consultar a un profesional cuando existan dudas.']
  ]
 },
 'SEO001-FENIX-B2B-EDITORIAL-002':{
  original_sha256:'f60d409f1d2082b4e022c3e3ac51dbf95149b55ae47645a03c3955646924415e',
  persona:'INMOBILIARIAS',
  corrections:[
   ['Cuando un comprador visita dos inmuebles y muestra un interés firme por avanzar, surge la oportunidad ideal para explicarle el valor de contar con un soporte especializado.',
    'Cuando un comprador muestra interés por avanzar y necesita aclarar su financiación, puede ser un buen momento para explicarle el valor de contar con asesoramiento especializado.'],
   ['Esta conversación debe surgir de manera natural tras la segunda visita, evitando cualquier sensación de presión comercial durante el recorrido inicial por la vivienda.',
    'Esta conversación debe surgir con naturalidad y cuando el comprador lo necesite, evitando cualquier sensación de presión comercial durante las visitas.'],
   ['Conviene presentar al asesor tras la segunda visita cuando el comprador muestra un interés real por avanzar en la compra.',
    'Conviene presentar al asesor cuando el comprador necesita aclarar su financiación y acepta hablar con un especialista, sin fijar la derivación a un número concreto de visitas.']
  ]
 }
});
export function repairSeoV4FromKnownOwnerFeedback({work_id,html,root=process.cwd()}={}){
 const spec=RULESET[work_id];
 if(!spec||typeof html!=='string')denied('WORK_OR_HTML_SCOPE');
 if(h(html)!==spec.original_sha256)denied('UNKNOWN_OR_MODIFIED_SOURCE_DIGEST');
 let fixed=html;
 for(const [from,to] of spec.corrections){
  if((fixed.split(from).length-1)!==1||typeof to!=='string'||to.includes(':')||
    /<[^>]+>/.test(to)||/\bademás\b|\ben conclusión\b/i.test(to))denied('PATCH_NOT_EXACT_OR_UNSAFE');
  fixed=fixed.replace(from,to);
 }
 const style=auditOwnerEditorialCopy({html:fixed,persona:spec.persona,content_type:'ARTICLE'});
 const voice=auditSeoHumanVoiceAndRisk({html:fixed,persona:spec.persona,content_type:'ARTICLE'});
 const depth=auditSeoContentDepth({html:fixed,persona:spec.persona,content_type:'ARTICLE'});
 const issues=[...style.issues.map(x=>'STYLE_'+x),...voice.issues.map(x=>'VOICE_'+x),
  ...depth.issues.map(x=>'DEPTH_'+x)];
 const status=issues.length?'V4_REPAIR_STILL_HOLD':'V4_REPAIR_TECHNICAL_PRECHECK_PASS_RELEASE_HOLD';
 const newHash=h(fixed);
 const receipt={status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',work_id,company_id:'fenix',
  engine_id:'SEO-001',environment:'LAB',
  can_publish:false,wordpress_writes:0,request_count:1,
  source_sha256:newHash,origin_model_sample_sha256:spec.original_sha256,
  exact_deterministic_repair_count:spec.corrections.length,
  no_new_ai_calls:true,postprocessed_from_model_sample:true};
 const handoff=issues.length?null:inspectCandidateSeoHandoff({
  root,work_id,receipt,html:fixed
 });
 return Object.freeze({
  status,company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  version:'V4-OWNER-FEEDBACK-REPAIRED-UNAPPROVED',work_id,
  original_sha256:spec.original_sha256,repaired_sha256:newHash,
  facts_verified:false,independent_professional_qa:false,
  owner_content_version_approved:false,persona:spec.persona,
  qa_issues:issues,faq_count:style.faq_count,words:depth.total_visible_words,
  main_words:depth.main_content_words_excluding_faq,
  media_order:handoff?.image_order||null,wordpress_dryrun_plan:handoff?.wordpress_dry_run_plan||null,
  edited_html:fixed,model_calls:0,paid_api_calls:0,image_api_calls:0,
  wordpress_writes:0,can_publish:false
 });
}
export function persistSeoV4Repairs({results,output_dir}={}){
 if(!Array.isArray(results)||results.length!==2||typeof output_dir!=='string'||
  !path.isAbsolute(output_dir)||output_dir.includes('..'))denied('OUTPUT_SCOPE');
 const dir=path.resolve(output_dir),allowed=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!allowed.some(base=>dir.startsWith(base+path.sep)))denied('OUTSIDE_TEMP');
 if(fs.existsSync(dir))denied('OUTPUT_EXISTS');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const manifest=[];
 for(const r of results){
  if(r.company_id!=='fenix'||r.can_publish!==false||r.model_calls!==0||
    r.wordpress_writes!==0||!RULESET[r.work_id])denied('RESULT_INVALID');
  const name=r.persona==='PARTICULARES'?'b2c':'b2b';
  const {edited_html,...receipt}=r;
  fs.writeFileSync(path.join(dir,name+'-v4-review-only.html'),edited_html,{mode:0o600,flag:'wx'});
  fs.writeFileSync(path.join(dir,name+'-qa-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600,flag:'wx'});
  manifest.push({work_id:r.work_id,status:r.status,sha256:r.repaired_sha256,
   faq:r.faq_count,words:r.words,main_words:r.main_words,
   independent_professional_qa:false,media_generated:false,publish_authorized:false});
 }
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'V4',
  original_ai_provider_calls_this_job:0,external_spend_eur:0,
  items:manifest,publication_authorized:false},null,2)+'\n',{mode:0o600,flag:'wx'});
 return {status:'EXACT_DIGEST_V4_REPAIR_REPORT_WRITTEN',items:manifest,paid_api_calls:0,wordpress_writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=process.argv[2],output=process.argv[3];
 if(!input||!output)denied('INPUT_AND_OUTPUT_REQUIRED');
 const results=[
  repairSeoV4FromKnownOwnerFeedback({
   work_id:'SEO001-FENIX-B2C-EDITORIAL-001',
   html:fs.readFileSync(path.join(input,'b2c-v4-unapproved.html'),'utf8')
  }),
  repairSeoV4FromKnownOwnerFeedback({
   work_id:'SEO001-FENIX-B2B-EDITORIAL-002',
   html:fs.readFileSync(path.join(input,'b2b-v4-unapproved.html'),'utf8')
  })
 ];
 const result=persistSeoV4Repairs({results,output_dir:path.resolve(output)});
 process.stdout.write(JSON.stringify(result)+'\n');
}
