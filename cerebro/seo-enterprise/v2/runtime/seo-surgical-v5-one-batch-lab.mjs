/**
 * CEREBRO SEO001 V5 · one-shot surgical revision of REAL V4 draft artifacts.
 * Do not reconstruct a whole new article or change a published site.
 * Two model requests maximum; only four identified paragraphs can change.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runOneShotFreeCanary,validateSeoV4Brief} from './seo-d13-free-project-one-shot-canary-v0.mjs';
import {classifyLearnedCandidate} from './seo-learned-one-batch-runner-v0.mjs';
import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoHumanVoiceAndRisk} from './seo-d31-human-voice-risk-gate-v0.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';
import {rankDraftForRepair,targetedRepairFeedback} from './seo-d13-quality-self-repair-v0.mjs';
const fail=c=>{throw Error('SEO001_SURGICAL_V5_'+c)};
const hash=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
export const V5='SEO001-SURGICAL-PATCH-20261108-V5';
export const M='cerebro/seo-enterprise/v2/registry/seo001-surgical-patch-v5-2026-11-08.json';
const V4='cerebro/seo-enterprise/v2/registry/seo001-autorepair-one-batch-v4-2026-11-08.json';
const V4_RESULT='cerebro/seo-enterprise/v2/registry/seo001-autorepair-one-batch-v4-result-2026-11-08.json';
const personaPrefix={PARTICULARES:'buyer',INMOBILIARIAS:'agency'};

export function verifySurgicalV5({root=process.cwd()}={}){
 const m=JSON.parse(fs.readFileSync(path.resolve(root,M),'utf8'));
 const old=JSON.parse(fs.readFileSync(path.resolve(root,V4),'utf8'));
 const result=JSON.parse(fs.readFileSync(path.resolve(root,V4_RESULT),'utf8'));
 if(m.batch_id!==V5||m.company_id!=='fenix'||m.engine_id!=='SEO-001'||m.environment!=='LAB'||
   m.status!=='PREPARED_NOT_EXECUTED'||m.workflow_trigger_nonce!=='TRIGGER_ONCE_20261108_SURGICAL_V5'||
   m.max_batch_runs!==1||m.max_real_model_calls!==2||m.max_calls_per_item!==1||
   m.allow_paid_fallback!==false||m.owner_cost_ceiling_eur!==0||m.allow_new_subscriptions!==false||
   m.allow_wordpress_writes!==false||m.allow_wordpress_publication!==false||
   m.allow_supabase_crm_writes!==false||m.allow_image_api_calls!==false||
   m.actual_release_authorized!==false||m.source_artifact?.id!==13603825279||
   m.source_artifact?.run_id!==42445381306||m.model!=='gemini-3.5-flash-lite'||
   m.external_free_tier_check?.plan!=='Nivel gratuito'||m.external_free_tier_check?.billing_configured!==false)
    fail('NO_FREE_EXACT_BATCH_OR_PUBLISH_GUARD');
 if(old.batch_id!=='SEO001-AUTOREPAIR-PILOT-20261108-V4'||old.status!=='COMPLETED_HOLD'||
   old.workflow_trigger_nonce!=='CONSUMED_20261108_AUTOREPAIR_V4'||old.model_calls_consumed!==4||
   result.batch_id!==old.batch_id||result.quality_result!=='NOT_PERFECT_DO_NOT_PUBLISH'||
   result.model_calls!==4||result.artifact_id!==13603825279)fail('PREVIOUS_V4_NOT_SEALED');
 if(!Array.isArray(m.briefs)||m.briefs.length!==2||
    m.briefs[0]?.work_id!=='SEO001-FENIX-AR20261108V5-B2C-001'||
    m.briefs[1]?.work_id!=='SEO001-FENIX-AR20261108V5-B2B-002'||
    m.briefs[0]?.persona!=='PARTICULARES'||
    m.briefs[1]?.persona!=='INMOBILIARIAS')fail('BAD_WORK_IDS');
 for(let i=0;i<2;i++){
  validateSeoV4Brief(m.briefs[i]);
  if(JSON.stringify({...m.briefs[i],work_id:old.briefs[i].work_id})!==JSON.stringify(old.briefs[i]))fail('BRIEF_DRIFT');
 }
 if(JSON.stringify(m.surgical_target_positions)!==
    JSON.stringify({PARTICULARES:[[1,1],[5,3]],INMOBILIARIAS:[[2,1],[4,1]]}))
    fail('SURGICAL_TARGETS_CHANGED');
 return m;
}
export function bodyParagraphs(html){
 if(typeof html!=='string'||html.length<150||html.length>27000||
   /<(?:script|iframe|form|textarea|input|img)\b/i.test(html))fail('HTML_UNSAFE_OR_SIZE');
 const faq=html.search(/<section\b[^>]*class=["']faq["'][^>]*>/i);
 if(faq<0)fail('FAQ_MISSING');
 const main=html.slice(0,faq);
 const sections=[...main.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>([\s\S]*?)(?=<h2\b|$)/gi)];
 if(sections.length!==6)fail('SIX_MAIN_H2_REQUIRED');
 const result=[];
 for(let i=0;i<6;i++){
  const p=[...sections[i][0].matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)];
  if(p.length!==3)fail('THREE_PARAGRAPHS_REQUIRED');
  p.forEach((v,j)=>{const htmlp=v[0],inner=htmlp.replace(/^<p\b[^>]*>/i,'').replace(/<\/p>$/i,'');
    result.push({section:i+1,paragraph:j+1,full:htmlp,inner,offset:sections[i].index+v.index,
     words:inner.replace(/<[^>]+>/g,' ').trim().split(/\s+/).filter(Boolean).length});});
 }
 return result;
}
function commonality(a,b){
 const terms=x=>new Set(x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z]{4,}/g)||[]);
 const aa=terms(a),bb=terms(b);
 return [...aa].filter(x=>bb.has(x)).length/Math.max(1,aa.size);
}
export function mergeOnlyFourParagraphs({original,proposed,targets}={}){
 if(!Array.isArray(targets)||targets.length!==2||new Set(targets.map(x=>x.join(':'))).size!==2)
    fail('TARGET_COUNT');
 const before=bodyParagraphs(original),after=bodyParagraphs(proposed),replacements=[];
 for(const [section,paragraph] of targets){
   const base=before.find(x=>x.section===section&&x.paragraph===paragraph);
   const next=after.find(x=>x.section===section&&x.paragraph===paragraph);
   if(!base||!next||/<[^>]+>/.test(next.inner)||next.words<60||next.words>85||
      commonality(base.inner,next.inner)<0.33)fail('PATCH_REJECT_LENGTH_MARKUP_OR_DRIFT');
   replacements.push({offset:base.offset,len:base.full.length,replacement:'<p>'+next.inner+'</p>',
     section,paragraph,before_words:base.words,after_words:next.words});
 }
 let edited=original;
 for(const r of replacements.sort((a,b)=>b.offset-a.offset))
  edited=edited.slice(0,r.offset)+r.replacement+edited.slice(r.offset+r.len);
 const changed=bodyParagraphs(edited);
 for(const p of before){
  if(targets.some(t=>t[0]===p.section&&t[1]===p.paragraph))continue;
  const x=changed.find(z=>z.section===p.section&&z.paragraph===p.paragraph);
  if(x.full!==p.full)fail('NON_TARGET_BODY_MODIFIED');
 }
 if((edited.match(/<h1\b/gi)||[]).length!==(original.match(/<h1\b/gi)||[]).length||
    (edited.match(/href=/gi)||[]).length!==(original.match(/href=/gi)||[]).length||
    (edited.match(/class=["']faq-item/gi)||[]).length!==6)
    fail('TEMPLATE_OR_LINKS_CHANGED');
 return {html:edited,changes:replacements.map(({offset,len,replacement,...info})=>info),sha256:hash(edited)};
}
export function auditSurgicalText(html,brief){
 const style=auditOwnerEditorialCopy({html,persona:brief.persona});
 const voice=auditSeoHumanVoiceAndRisk({html,persona:brief.persona});
 const depth=auditSeoContentDepth({html,persona:brief.persona});
 const writer={html,faq_count:style.faq_count,content_depth_precheck_passed:depth.preliminary_depth_check_passed,
  status:style.deterministic_style_precheck_passed&&voice.deterministic_precheck_passed&&depth.preliminary_depth_check_passed?
    'REAL_CLOUD_DRAFT_REVIEW_ONLY':'REAL_CLOUD_DRAFT_STYLE_HOLD'};
 const q=classifyLearnedCandidate({brief,writer});
 return {...q,style_issues:style.issues,voice_issues:voice.issues,content_depth_issues:depth.issues};
}
export function loadV4Artifact({source_dir,manifest}={}){
 if(!source_dir||!path.isAbsolute(source_dir)||!manifest)fail('ARTIFACT_DIRECTORY');
 const receipt=JSON.parse(fs.readFileSync(path.join(source_dir,'manifest.json'),'utf8'));
 if(receipt.batch_id!=='SEO001-AUTOREPAIR-PILOT-20261108-V4'||receipt.model_calls!==4||
    receipt.wordpress_writes!==0||receipt.published!==0||receipt.can_publish!==false||
    receipt.manifest_sha256!==manifest.source_artifact.manifest_sha256)fail('V4_RECEIPT_INVALID');
 return manifest.briefs.map(brief=>{
  const prefix=personaPrefix[brief.persona],html=fs.readFileSync(path.join(source_dir,prefix+'-UNAPPROVED.html'),'utf8');
  const q=JSON.parse(fs.readFileSync(path.join(source_dir,prefix+'-qa.json'),'utf8'));
  if(q.work_id!==receipt.works.find(x=>x.work_id===q.work_id)?.work_id||
     q.work_id.replace('V4-','V5-')!==brief.work_id||
     q.publish_allowed!==false||q.requests!==2)fail('V4_WORK_RECEIPT_INVALID');
  bodyParagraphs(html);
  return {brief,html,source_qa:q};
 });
}
export async function runSurgicalV5({root=process.cwd(),source_dir,api_key=process.env.CEREBRO_GEMINI_FREE_API_KEY||null,
    one_shot=runOneShotFreeCanary}={}){
 const m=verifySurgicalV5({root}),old=loadV4Artifact({source_dir,manifest:m}),out=[];let calls=0;
 for(const seed of old){
  const {brief,html}=seed,targets=m.surgical_target_positions[brief.persona];
  const oldQA=auditSurgicalText(html,brief),oldScore=rankDraftForRepair(oldQA);
  if(typeof api_key!=='string'||api_key.length<16){out.push({brief,content:html,model_calls:0,
    status:'HOLD_FREE_SECRET_NOT_AVAILABLE',oldScore,review:oldQA,changed:[],selected:'SOURCE_V4'});continue;}
  const feedback=targetedRepairFeedback(oldQA);
  let response=null;
  try{response=await one_shot({api_key,owner_verified_free_project:true,
    brief_override:brief,revision_feedback:feedback,revision_reference_html:html});}
  catch{calls++;out.push({brief,content:html,model_calls:1,status:'HOLD_PROVIDER_EXCEPTION',
    review:oldQA,oldScore,changed:[],selected:'SOURCE_V4'});continue;}
  const used=response?.request_count??0;
  if(!Number.isInteger(used)||used<0||used>1)fail('PROVIDER_COUNT');
  calls+=used;
  let merged=null,newQA=null;
  if(response?.html&&used===1){
   try{
    merged=mergeOnlyFourParagraphs({original:html,proposed:response.html,targets});
    newQA=auditSurgicalText(merged.html,brief);
   }catch{}
  }
  const candidateScore=newQA?rankDraftForRepair(newQA):Infinity;
  const improved=merged&&newQA&&candidateScore<oldScore;
  const finalQA=improved?newQA:oldQA;
  out.push({brief,content:improved?merged.html:html,model_calls:used,
   status:finalQA.technical_copy_precheck==='PASS'?'COPY_PRECHECK_PASS_PHYSICAL_HOLD':'SURGICAL_HOLD',
   review:finalQA,oldScore,newScore:Number.isFinite(candidateScore)?candidateScore:null,
   selected:improved?'SURGICAL_V5':'SOURCE_V4',changed:improved?merged.changes:[]});
 }
 if(calls>2)fail('BUDGET');
 return {batch_id:V5,company_id:'fenix',engine_id:'SEO-001',environment:'LAB',model_calls:calls,
   status:out.every(x=>x.status==='COPY_PRECHECK_PASS_PHYSICAL_HOLD')?'COPY_PRECHECK_ONLY_PHYSICAL_HOLD':'INCOMPLETE_HOLD',
   works:out,paid_fallback_calls:0,published:0,wordpress_writes:0,crm_writes:0,
   publish_allowed:false,next_batch_auto_allowed:false};
}
export function persistSurgicalV5({result,dest}={}){
 if(result?.batch_id!==V5||result?.model_calls>2||result?.published!==0||
   result?.wordpress_writes!==0||result?.publish_allowed!==false||
   typeof dest!=='string'||!path.isAbsolute(dest)||dest.includes('..')||
   ![os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).some(x=>path.resolve(dest).startsWith(path.resolve(x)+path.sep))||
   fs.existsSync(dest))fail('OUTPUT_SCOPE');
 fs.mkdirSync(dest,{recursive:true,mode:0o700});const summary=[];
 for(const w of result.works){
   const prefix=personaPrefix[w.brief.persona];
   fs.writeFileSync(path.join(dest,prefix+'-UNAPPROVED.html'),w.content,{flag:'wx',mode:0o600});
   const {content,...rec}=w;fs.writeFileSync(path.join(dest,prefix+'-qa.json'),JSON.stringify(rec,null,2)+'\n',{flag:'wx',mode:0o600});
   summary.push({id:w.brief.work_id,status:w.status,selected:w.selected,changed:w.changed,
    oldScore:w.oldScore,newScore:w.newScore,copy_issues:w.review.copy_issues,
    published:false});
 }
 fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify({
  batch_id:V5,status:result.status,model_calls:result.model_calls,works:summary,
  physical_visual_qa:false,original_image_verified:false,crm_positive_e2e:false,
  professional_legal_approved:false,published:0,wordpress_writes:0,
  automatic_next_batch:false},null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:result.status,model_calls:result.model_calls,works:summary.map(x=>({
   id:x.id,status:x.status,selected:x.selected,patched_paragraphs:x.changed.length,
   remaining_copy_issues:x.copy_issues.length})),publication:0,wordpress_writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==4)fail('ARGS_SOURCE_DIR_AND_OUTPUT_DIR');
 const result=await runSurgicalV5({source_dir:path.resolve(process.argv[2])});
 process.stdout.write(JSON.stringify(persistSurgicalV5({result,dest:path.resolve(process.argv[3])}))+'\n');
}
