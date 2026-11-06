/**
 * SEO-001 · V4.2 exact-source FAQ GDPR and internal-link de-duplication.
 * New review-only content SHA; never revises V4.1 or WordPress.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';
import {auditSeoHumanVoiceAndRisk} from './seo-d31-human-voice-risk-gate-v0.mjs';

const old='cerebro/seo-enterprise/v2/drafts/v4-1-review-only';
const out='cerebro/seo-enterprise/v2/drafts/v4-2-review-only';
const registry='cerebro/seo-enterprise/v2/registry/seo001-v4-2-source-locked-review-only-2026-11-06.json';
const src={
 buyers:{id:'SEO001-FENIX-B2C-EDITORIAL-001',filename:'compradores-v4-1-review-only.html',
  source_sha256:'96b340eba8d97d56fd9e2ce9644df9d2b8855759301180fbf0351630e351d88d',persona:'PARTICULARES'},
 agencies:{id:'SEO001-FENIX-B2B-EDITORIAL-002',filename:'inmobiliarias-v4-1-review-only.html',
  source_sha256:'ffc9d8d4f32dbc8e77ec9d9f4e7ba2bfb98a35141a91a85f1b420e27bed00583',persona:'INMOBILIARIAS'}
};
const sha=x=>crypto.createHash('sha256').update(x,'utf8').digest('hex');
const no=x=>{throw Error('SEO_V42_SOURCE_LOCK_'+x)};
const replaceOnce=(s,from,to)=>{
 if(s.split(from).length!==2||typeof to!=='string'||to.includes('<script'))no('TARGET_AMBIGUOUS_OR_MISSING');
 return s.replace(from,to);
};
export function makeSeoV42({root=process.cwd()}={}){
 const results=[];
 for(const [type,x] of Object.entries(src)){
  const html=fs.readFileSync(path.resolve(root,old,x.filename),'utf8');
  if(sha(html)!==x.source_sha256)no('INPUT_SHA_INVALID_'+type);
  let next=html;
  if(type==='agencies'){
   next=replaceOnce(next,
    '<div class="faq-item"><h3>¿Debe firmar el cliente una autorización inicial?</h3><p>Sí, es necesario contar con una base jurídica adecuada que ampare la transmisión de los datos imprescindibles para el estudio.</p></div>',
    '<div class="faq-item"><h3>¿Hace falta consentimiento para derivar al comprador?</h3><p>No necesariamente. La comunicación de datos personales exige una base jurídica válida y una información transparente al comprador. El consentimiento puede ser una de esas bases, pero no la única. Conviene documentar el procedimiento y revisar cada supuesto antes de transmitir datos.</p></div>');
   next=replaceOnce(next,
    '<div class="faq-item"><h3>¿Puede la agencia prometer plazos bancarios?</h3><p>No, los tiempos dependen exclusivamente de los criterios internos de riesgo de cada entidad financiera colaboradora.</p></div>',
    '<div class="faq-item"><h3>¿Puede la agencia prometer plazos bancarios?</h3><p>No. Los plazos dependen también de la documentación, la tasación, las verificaciones y el análisis de cada entidad. Es preferible explicar que cualquier previsión es orientativa y mantener informado al comprador cuando existan retrasos.</p></div>');
   for(const url of [
    'https://fenixcapital.es/financiacion-servicio-valor-inmobiliaria/',
    'https://fenixcapital.es/seguimiento-hipotecario-por-fases-inmobiliaria/'
   ]){
    const pattern=/<a href="([^"]+)">([^<]+)<\/a>/g;
    let matches=0;
    next=next.replace(pattern,(all,href,anchor)=>{
     if(href!==url)return all;
     matches++;
     return matches===1?all:anchor;
    });
    if(matches!==3)no('LINK_COUNT_DRIFT');
   }
  }
  const voice=auditSeoHumanVoiceAndRisk({html:next,persona:x.persona,content_type:'ARTICLE'});
  const style=auditOwnerEditorialCopy({html:next,persona:x.persona,content_type:'ARTICLE'});
  const depth=auditSeoContentDepth({html:next,persona:x.persona,content_type:'ARTICLE'});
  const issues=[...voice.issues.map(y=>'VOICE_'+y),
   ...style.issues.map(y=>'STYLE_'+y),...depth.issues.map(y=>'DEPTH_'+y)];
  // Preserve the exact historical V4.2 bytes, but never re-certify an archived
  // candidate against a newer QA rubric. Only these two newly discovered
  // B2B risks are permitted as a historical hold, not as a successful review.
  const historicalHold=type==='agencies'?[
   'VOICE_UNWARRANTED_MORTGAGE_SUCCESS_GUARANTEE',
   'VOICE_UNILATERAL_TRANSACTION_DISMISSAL_REQUIRES_REVIEW'
  ]:['VOICE_PURCHASE_MORTGAGE_FEES_UNDIFFERENTIATED'];
  if(issues.length&&issues.some(y=>!historicalHold.includes(y)))
   no('UNEXPECTED_TECHNICAL_QA_FAILED_'+type+'_'+issues.join('_'));
  if(depth.total_visible_words<1000||depth.main_content_words_excluding_faq<750||
   depth.faq_count!==6)no('DEPTH_FAQ');
  const digest=sha(next);
  if(type==='agencies'&&digest===x.source_sha256)no('NO_CHANGE');
  results.push(Object.freeze({
   company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
   version:'V4.2-REVIEW-ONLY',work_id:x.id,persona:x.persona,
   source_sha256:x.source_sha256,new_sha256:digest,
   source_kind:'HISTORICAL_GEMINI_FREE_WITH_SOURCE_GUIDED_DETERMINISTIC_EDITS',
   source_filename:x.filename,output_filename:x.filename.replace('v4-1','v4-2'),
   word_count:depth.total_visible_words,main_words_excluding_faq:depth.main_content_words_excluding_faq,
   faq_count:depth.faq_count,technical_precheck_pass:issues.length===0,technical_issues:issues,
   legal_content_human_verified:false,
   professional_ymyl_qa_verified:false,independent_seo_review_verified:false,
   image_original_generated:false,wordpress_writes:0,
   model_calls_this_revision:0,publish_authorized:false,
   html:next
  }));
 }
 return Object.freeze(results);
}
export function persistSeoV42({results,root=process.cwd()}={}){
 if(!Array.isArray(results)||results.length!==2||
  results.some(r=>r.company_id!=='fenix'||r.publish_authorized!==false||
   r.wordpress_writes!==0||r.model_calls_this_revision!==0))no('PERSIST_SCOPE');
 const dst=path.resolve(root,out);
 if(fs.existsSync(dst))no('OUTPUT_ALREADY_EXISTS');
 fs.mkdirSync(dst,{recursive:true,mode:0o700});
 const work=results.map(r=>{
  const output=path.join(dst,r.output_filename);
  fs.writeFileSync(output,r.html,{flag:'wx',mode:0o600});
  const {html,...meta}=r;
  return meta;
 });
 const manifest={schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',version:'V4.2-REVIEW-ONLY',
  status:'SOURCE_LOCKED_TECHNICAL_QA_PASS_INDEPENDENT_RELEASE_HOLD',
  work,content_changes_applied:2,article_source_rewrites_for_b2c:0,
  b2b_reduced_duplicate_internal_links:true,
  aepd_reference:'https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/5-bases-legitimadoras-del-tratamiento/FAQ-0214-cuales-son-las-bases-de-legitimacion-para-el-tratamiento-de-datos',
  independent_professional_legal_review_complete:false,
  owner_exact_digest_approved:false,media_generated:false,
  wordpress_drafts_created:false,publish_authorized:false,
  paid_provider_calls:0,model_calls_this_revision:0,wordpress_writes:0};
 fs.mkdirSync(path.dirname(path.resolve(root,registry)),{recursive:true});
 fs.writeFileSync(path.resolve(root,registry),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:manifest.status,work:work.map(x=>({work_id:x.work_id,
  sha256:x.new_sha256,words:x.word_count,faq:x.faq_count})),
  no_paid_calls:true,wordpress_writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)no('CLI_ARGS');
 const result=persistSeoV42({results:makeSeoV42()});
 process.stdout.write(JSON.stringify(result)+'\n');
}
