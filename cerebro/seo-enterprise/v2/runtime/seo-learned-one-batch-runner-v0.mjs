/** SEO001 2026-11-08 · EXACTLY ONE learned batch experiment.
 * WRITES ONLY TEMP LAB ARTIFACTS. Calls existing cloud-free D13 writer at most
 * once per work; no retry or paid fallback. No WordPress, CRM, Supabase writes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runOneShotFreeCanary, validateOneShotFreePermit, validateSeoV4Brief } from './seo-d13-free-project-one-shot-canary-v0.mjs';
const REF='cerebro/seo-enterprise/v2/registry/seo001-learned-one-batch-pilot-2026-11-08.json';
const PREVIOUS='cerebro/seo-enterprise/v2/registry/seo001-batch2-wordpress-physical-qa-2026-11-07.json';
const hash=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const stop=s=>{throw Error('SEO001_LEARNED_BATCH_'+s)};
export const EXPECTED_IDS=Object.freeze(['SEO001-FENIX-LRN-20261108-B2C-001','SEO001-FENIX-LRN-20261108-B2B-002']);
export const LEARNING_GATES=Object.freeze([
 'L01_CANONICAL_SEMANTIC_H1','L02_POST_HEADER','L03_PAGE_TEMPLATE','L04_BREADCRUMBS',
 'L05_IMAGES','L06_PERSONA_FORMS','L07_PRIVACY','L08_EDITORIAL','L09_FULL_VISUAL','L10_RELEASE'
]);
export function preflightLearnedBatch({root=process.cwd()}={}) {
 const m=JSON.parse(fs.readFileSync(path.resolve(root,REF),'utf8'));
 const prior=JSON.parse(fs.readFileSync(path.resolve(root,PREVIOUS),'utf8'));
 if(m.company_id!=='fenix'||m.engine_id!=='SEO-001'||m.environment!=='LAB'||
    m.batch_id!=='SEO001-AUTONOMY-PILOT-20261108-ONE'||
    m.status!=='PREPARED_NOT_EXECUTED'||m.workflow_trigger_nonce!=='TRIGGER_ONCE_20261108'||
    m.max_batch_runs!==1||m.max_real_model_calls!==2||
    m.max_calls_per_item!==1||m.allow_retries!==false||
    m.allow_paid_fallback!==false||m.allow_new_subscriptions!==false||
    m.allow_wordpress_writes!==false||m.allow_wordpress_publication!==false||
    m.allow_supabase_crm_writes!==false||m.allow_image_api_calls!==false)stop('AUTHORIZATION_OR_CEILING');
 if(prior.company_id!=='fenix'||prior.engine_id!=='SEO-001'||
    prior.release_status!=='HOLD_NOT_OWNER_APPROVED'||
    !prior.partner_form_dedicated_transport_2026_11_08||
    !prior.article_astra_native_banner_2026_11_07)stop('LEARNING_PROVENANCE_MISSING');
 if(m.learning_contract_id!=='SEO001_LEARNED_10_GATES_20261108'||
    !m.lessons||Object.keys(m.lessons).length!==LEARNING_GATES.length||
    LEARNING_GATES.some(k=>typeof m.lessons[k]!=='string'||m.lessons[k].length<75))
    stop('LEARNING_GATES_UNWIRED');
 if(!Array.isArray(m.briefs)||m.briefs.length!==2||
    m.briefs.some((b,i)=>b.work_id!==EXPECTED_IDS[i]||
      b.learning_contract_id!==m.learning_contract_id||
      b.persona!==(i===0?'PARTICULARES':'INMOBILIARIAS')))
    stop('NEW_BATCH_ITEMS');
 for(const b of m.briefs)validateSeoV4Brief(b);
 if(new Set(m.briefs.flatMap(b=>b.sources.map(s=>s.id))).size!==4)stop('SOURCES_NOT_UNIQUE');
 const permit=validateOneShotFreePermit();
 if(permit.status!=='FREE_PROJECT_MANUAL_ONE_SHOT_PERMIT'||permit.max_requests!==1||
    permit.max_retries!==0||permit.runtime_billing_automatically_proven!==false)
    stop('FREE_PROJECT_PERMIT');
 return Object.freeze({manifest:m,source_sha256:hash(JSON.stringify(m)),
   prior_release:'HOLD_NOT_OWNER_APPROVED',learning_gates_loaded:LEARNING_GATES.length,
   provider_policy:'FREE_ONLY_NO_RETRIES',
   all_facts_sources_verified_independently:false,
   media_and_visual_qa_done:false,wordpress_writes:0,publication_authorized:false});
}
export function classifyLearnedCandidate({brief,writer}={}) {
 if(!brief||!writer||writer.work_id&&writer.work_id!==brief.work_id)stop('WRITER_WORK_ID');
 const text=typeof writer.html==='string'?writer.html:'';
 const h1=(text.match(/<h1\b/gi)||[]).length,imgs=(text.match(/<img\b/gi)||[]).length;
 const inlineForms=/<form\b|<script\b|<iframe\b/i.test(text);
 const errors=[];
 if(writer.status!=='REAL_CLOUD_DRAFT_REVIEW_ONLY')errors.push('MODEL_OR_COPY_PRECHECK_NOT_PASSED');
 if(h1!==1)errors.push('LAB_CANDIDATE_REQUIRES_EXACTLY_ONE_H1');
 if(imgs>0||inlineForms)errors.push('IMAGE_OR_FORM_WRONGLY_EMBEDDED_IN_MODEL_HTML');
 if(writer.faq_count!==6)errors.push('SIX_FAQ_REQUIRED');
 const faqSection=[...text.matchAll(/<section\b[^>]*class=["']faq["'][^>]*>[\s\S]*?<\/section>/gi)];
 const faqHtml=faqSection.length===1?faqSection[0][0]:'';
 const mainHtml=faqHtml?text.replace(faqHtml,''):text;
 const coreH2=(mainHtml.match(/<h2\b/gi)||[]).length;
 if(coreH2!==6)errors.push('SIX_MAIN_H2_REQUIRED');
 if(faqSection.length!==1||(faqHtml.match(/<h2\b/gi)||[]).length!==1||
    (mainHtml.match(/<h3\b/gi)||[]).length!==0)errors.push('EXACT_FAQ_DOM_WRAPPER_REQUIRED');
 const faqBlocks=faqHtml?
   [...faqHtml.matchAll(/<div\b[^>]*class=["']faq-item["'][^>]*>([\s\S]*?)<\/div>/gi)]:[];
 if(faqBlocks.length!==6)errors.push('EXACT_FAQ_DOM_WRAPPER_REQUIRED');
 const coreSections=[...mainHtml.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>([\s\S]*?)(?=<h2\b|$)/gi)];
 if(coreSections.length===6){
   coreSections.forEach(([,chunk],sindex)=>{
      const paragraphs=[...chunk.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
      const section=String(sindex+1).padStart(2,'0');
      if(paragraphs.length!==3){
       errors.push('EXACTLY_THREE_PARAGRAPHS_PER_MAIN_SECTION');
       errors.push('SECTION_'+section+'_PARAGRAPHS_'+paragraphs.length+'_EXPECTED_3');
      }
      let total=0;
      paragraphs.forEach(([,paragraph],pindex)=>{
        const count=paragraph.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().split(/\s+/).filter(Boolean).length;
        total+=count;
        if(count<60||count>85){
         errors.push('MAIN_PARAGRAPH_WORD_RANGE');
         errors.push('SECTION_'+section+'_PARAGRAPH_'+String(pindex+1).padStart(2,'0')+'_WORDS_'+count+'_NEEDS_60_TO_85');
        }
      });
      if(total<180)errors.push('SECTION_'+section+'_TOTAL_'+total+'_WORDS_BELOW_180');
   });
 }
 for(const b of faqBlocks){
   if((b[1].match(/<h3\b/gi)||[]).length!==1||(b[1].match(/<p\b/gi)||[]).length!==1)
      errors.push('FAQ_ITEM_HEADING_AND_PARAGRAPH_REQUIRED');
   const answer=b[1].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'';
   const words=answer.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().split(/\s+/).filter(Boolean).length;
   if(words<20||words>40)errors.push('FAQ_ANSWER_WORD_RANGE');
 }
 if(writer.content_depth_precheck_passed!==true)errors.push('CONTENT_DEPTH_MISSING');
 if(/el vendedor debe abonar las derramas|(?:la )?demora depende exclusivamente|el retraso(?: administrativo)? no invalida el acuerdo/i.test(text))
   errors.push('YMYL_UNQUALIFIED_LEGAL_OR_EXCLUSIVE_CAUSE_CLAIM');
 // Relevance is a first-class gate: this buyer article is about recurring
 // ownership costs, not conveyancing/tasacion litigation. Too much tangential
 // legal prose must fail even if every paragraph has exactly 60-85 words.
 if(brief.persona==='PARTICULARES'&&
    /gastos de mantener un piso/i.test(String(brief.focus_keyword||''))){
   const driftTerms=mainHtml.match(/\b(?:tasaci[oó]n|arras|condiciones suspensivas|subrogaci[oó]n de contratos|resoluci[oó]n contractual|cl[aá]usulas de un contrato)\b/gi)||[];
   if(driftTerms.length>=2)errors.push('ARTICLE_TOPIC_DRIFT_RECURRING_COSTS');
   const legalPara=[...mainHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .filter(x=>/\b(?:contrato|clausulado|legislaci[oó]n|responsabilidad jur[ií]dica|compraventa|contratantes)\b/i.test(x[1])&&
      !/\b(?:comunidad de propietarios|recibo|gasto mensual|suministro)\b/i.test(x[1])).length;
   if(legalPara>=3)errors.push('ARTICLE_LEGAL_PADDING_WITHOUT_USER_VALUE');
 }
 // Persona B2B: a retraso de tasación article is a communication playbook.
 // The previous real pilot drifted into IBI, utilities and derramas.
 if(brief.persona==='INMOBILIARIAS'&&
    /retraso tasaci[oó]n/i.test(String(brief.focus_keyword||''))){
    const offTopic=mainHtml.match(/\b(?:Impuesto sobre Bienes Inmuebles|IBI|suministros b[aá]sicos|derramas extraordinarias|costes de mantenimiento|cuota mensual de comunidad|facturas de agua|primas de seguros)\b/gi)||[];
    if(offTopic.length>=3)errors.push('ARTICLE_TOPIC_DRIFT_TASACION_B2B');
 }
 // Observed in V4 B2C: preventive maintenance may help preserve condition,
 // but it does not GUARANTEE asset appreciation. Treat that as YMYL risk.
 const appreciationClaim=/\b(?:asegura|garantiza)\s+(?:la\s+)?revalorizaci[oó]n\b/gi;
 if([...text.matchAll(appreciationClaim)].some(m=>!/(?:\bno|\bnunca)\s*$/.test(text.slice(Math.max(0,m.index-15),m.index))))
    errors.push('YMYL_UNSUPPORTED_GUARANTEED_PROPERTY_APPRECIATION');
 if(brief.persona==='INMOBILIARIAS'&&!/inmobiliaria|agencia/i.test(text))errors.push('B2B_PERSONA_MISSING');
 // No image, license, real CMS rendering, real form success, or mobile screenshot
 // can be asserted from a text-only provider response.
 const physicalGates=['ORIGINAL_HERO_MEDIA_WITH_PROVENANCE','ASTRA_NATIVE_BANNER_NO_DUPLICATE',
   'REAL_DESKTOP_AND_MOBILE_RENDER','REAL_B2B_FORM_CRM_E2E','LEGAL_YMYL_SIGNOFF'];
 return {work_id:brief.work_id,persona:brief.persona,
  technical_copy_precheck:errors.length===0?'PASS':'HOLD',
  copy_issues:errors,physical_gates_pending:physicalGates,
  full_quality_certified:false,publish_allowed:false,
  cms_plan:{post_type:'post',status:'draft',rendered_h1_owner:'ASTRA_NATIVE',
    content_h1_strip_before_wordpress:true,media:'CHECK_EXISTING_THEN_UMS',
    breadcrumb:'HOME_AND_CATEGORY_ONLY',form:brief.persona==='INMOBILIARIAS'?
      'fenix_seo001_partner_form':'fenix_seo001_city_form',
    requires_real_mobile_qa:true},
  counted_original_media_generated:0
 };
}
export async function executeOneLearnedBatch({root=process.cwd(),api_key=null,fetch_impl=globalThis.fetch}={}) {
 const check=preflightLearnedBatch({root});const items=[];let calls=0;
 for(const brief of check.manifest.briefs) {
  if(items.some(x=>x.provider_status==='HOLD')) {
   items.push({work_id:brief.work_id,provider_status:'SKIPPED_AFTER_PROVIDER_HOLD',
     request_count:0,review:{full_quality_certified:false,publish_allowed:false},html:null});
   continue;
  }
  const w=await runOneShotFreeCanary({api_key,fetch_impl,brief_override:brief,owner_verified_free_project:true});
  calls+=w.request_count||0;
  if(w.request_count>1||calls>2)stop('MODEL_CALL_CEILING');
  const {html,...receipt}=w;
  items.push({work_id:brief.work_id,provider_status:w.status,request_count:w.request_count||0,
    receipt,review:classifyLearnedCandidate({brief,writer:w}),html:html||null});
 }
 return {batch_id:check.manifest.batch_id,company_id:'fenix',engine_id:'SEO-001',
  environment:'LAB',status:items.every(x=>x.review.technical_copy_precheck==='PASS')?
    'COPY_PRECHECK_ONLY_PHYSICAL_RELEASE_HOLD':'LEARNED_BATCH_INCOMPLETE_HOLD',
  learning_gates_loaded:check.learning_gates_loaded,learning_manifest_sha256:check.source_sha256,
  max_batches:1,provider_calls:calls,auto_retry_count:0,paid_fallback_calls:0,
  image_generation_calls:0,wordpress_writes:0,crm_writes:0,can_publish:false,
  independent_visual_qa:false,full_legal_editorial_qa:false,items};
}
export function persistOneLearnedBatch({batch,output_dir}={}) {
 if(!batch||batch.batch_id!=='SEO001-AUTONOMY-PILOT-20261108-ONE'||batch.provider_calls>2||
    batch.wordpress_writes!==0||batch.can_publish!==false)stop('WRITE_SCOPE');
 if(typeof output_dir!=='string'||!path.isAbsolute(output_dir)||output_dir.includes('..'))stop('OUTPUT_PATH');
 const dest=path.resolve(output_dir),temp=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(p=>path.resolve(p));
 if(!temp.some(p=>dest.startsWith(p+path.sep))||fs.existsSync(dest))stop('OUTSIDE_TEMP_OR_DUPLICATE');
 fs.mkdirSync(dest,{recursive:true,mode:0o700});
 const evidence=[];
 for(let i=0;i<batch.items.length;i++) {
  const item=batch.items[i],name=i===0?'b2c':'b2b';
  if(item.html)fs.writeFileSync(path.join(dest,name+'-unapproved.html'),item.html,{flag:'wx',mode:0o600});
  const {html,...meta}=item;
  fs.writeFileSync(path.join(dest,name+'-receipt.json'),JSON.stringify(meta,null,2)+'\n',{flag:'wx',mode:0o600});
  evidence.push({id:item.work_id,status:item.provider_status,request_count:item.request_count,
    media_verified:false,visual_qa_verified:false,certified:false});
 }
 const manifest={...batch,items:evidence,production_enabled:false};
 fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:batch.status,provider_calls:batch.provider_calls,
  files:fs.readdirSync(dest),wordpress_writes:0,publication:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)stop('ONE_OUTPUT_DIRECTORY_REQUIRED');
 const batch=await executeOneLearnedBatch({api_key:process.env.CEREBRO_GEMINI_FREE_API_KEY||null});
 const receipt=persistOneLearnedBatch({batch,output_dir:path.resolve(process.argv[2])});
 process.stdout.write(JSON.stringify(receipt)+'\n');
 if(batch.provider_calls===0)process.exitCode=2;
}
