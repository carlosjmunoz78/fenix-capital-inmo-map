/**
 * CEREBRO OS · SEO-D13 incremental self-repair V0 (LAB, zero-production-write).
 * Reuse the existing independent post-D13 quality gates. One failed draft
 * produces targeted feedback and another bounded draft, not an approval.
 * Deterministic repairs only touch structure; factual claims remain gated.
 */
import crypto from 'node:crypto';
import {classifyLearnedCandidate} from './seo-learned-one-batch-runner-v0.mjs';
import {runOneShotFreeCanary} from './seo-d13-free-project-one-shot-canary-v0.mjs';
import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoHumanVoiceAndRisk} from './seo-d31-human-voice-risk-gate-v0.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';

const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const fail=code=>{throw Error('SEO_SELF_REPAIR_'+code)};
export const SELF_REPAIR_POLICY=Object.freeze({
 company_id:'fenix',engine_id:'SEO-001',environment:'LAB',version:'0.1.0',
 attempts_per_item:3,max_requests_per_batch:6,paid_fallback:false,
 wp_writes:false,crm_writes:false,media_calls:false,publish:false,
 real_mobile_and_legal_review_required:true
});
/** Only changes a uniquely located trailing FAQ H2 and exactly six H3/P pairs.
 * Does not invent or shorten questions, answers, claims or external links.
 */
export function normalizeFaqMarkup(html){
 if(typeof html!=='string'||html.length<1||html.length>25000)return {html,changed:false,reason:'INVALID_HTML'};
 if(/<section\b[^>]*class=["']faq["']/i.test(html))return {html,changed:false,reason:'ALREADY_MARKED'};
 const matches=[...html.matchAll(/<h2\b[^>]*>\s*Preguntas frecuentes\s*<\/h2>/gi)];
 if(matches.length!==1)return {html,changed:false,reason:'FAQ_H2_NOT_UNIQUE'};
 const at=matches[0].index,after=html.slice(at).trim();
 const heading=after.match(/^<h2\b[^>]*>[\s\S]*?<\/h2>/i)?.[0];
 if(!heading)return {html,changed:false,reason:'FAQ_H2_MALFORMED'};
 let tail=after.slice(heading.length).trim();const pairs=[];
 for(let i=0;i<6;i++){
  const pair=tail.match(/^<h3\b[^>]*>([\s\S]*?)<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*/i);
  if(!pair)return {html,changed:false,reason:'FAQ_PAIRS_NOT_SIX'};
  if(/<[^>]+>/.test(pair[1])||/<(?:script|iframe|form|img)\b/i.test(pair[2]))
    return {html,changed:false,reason:'FAQ_NESTED_OR_UNSAFE'};
  pairs.push({question:pair[1],answer:pair[2]});
  tail=tail.slice(pair[0].length).trim();
 }
 if(tail)return {html,changed:false,reason:'FAQ_TRAILING_CONTENT'};
 const prefix=html.slice(0,at);
 const fixed='<section class="faq">'+heading+
  pairs.map(p=>'<div class="faq-item"><h3>'+p.question+'</h3><p>'+p.answer+'</p></div>').join('')+
  '</section>';
 return {html:prefix+fixed,changed:true,reason:'WRAPPER_FIXED_PRESERVED_SIX_QA'};
}
export function targetedRepairFeedback(review){
 const list=[...(review?.copy_issues||[]),...(review?.style_issues||[]),
   ...(review?.voice_issues||[]),...(review?.content_depth_issues||[])];
 const raw=[...new Set(list.map(x=>typeof x==='string'?x:null).filter(Boolean))];
 // Preserve actionable semantic risks and one summary per section before
 // repetitive paragraph-range errors. Otherwise the first 15 errors may cover
 // only sections 1 and 2 of an underdeveloped six-section article.
 const priority=raw.filter(x=>/^ARTICLE_|^YMYL_|^H2_TOO_LONG$|^ABSOLUTE_/.test(x));
 const summary=raw.filter(x=>/^SECTION_[0-9]{2}_TOTAL_/.test(x));
 const detail=raw.filter(x=>/^SECTION_[0-9]{2}_PARAGRAPH_/.test(x))
   .filter((x,i,arr)=>arr.findIndex(y=>y.slice(0,10)===x.slice(0,10))===i);
 const ranked=[...new Set([...priority,...summary,...detail,...raw])];
 const codes=ranked.filter(x=>/^[A-Z][A-Z0-9_]{2,79}$/.test(x)).slice(0,15);
 if(raw.length!==codes.length&&codes.length<16)codes.push('EDITORIAL_REVIEW_REQUIRED');
 return Object.freeze({error_codes:codes,revision_kind:'REWRITE_ONLY_UNRESOLVED_ERRORS',
   no_invented_legal_facts:true,keep_grounded_sources:true,
   faq_dom_exact:true,no_image_or_form_in_model_html:true});
}
/** Bounded automatic feedback loop. A model callback may make one provider call
 * per invocation. External side effects are forbidden within this coordinator.
 * No content text is printed; each attempt records an evidence hash and issues.
 */
/** Relative draft ranking only; NEVER a publication or truth certificate. */
export function rankDraftForRepair(review){
 if(!review||!Array.isArray(review.copy_issues)||review.publish_allowed!==false||
    review.full_quality_certified!==false)fail('RANK_UNSAFE_REVIEW');
 const arr=[...new Set([...(review.copy_issues||[]),
    ...(review.style_issues||[]),...(review.voice_issues||[]),
    ...(review.content_depth_issues||[])].filter(x=>typeof x==='string'))];
 if(review.technical_copy_precheck==='PASS'&&arr.length!==0)
    fail('RANK_CONTRADICTORY_PASS');
 if(review.technical_copy_precheck==='PASS')return 0;
 let score=0;
 for(const issue of arr){
   if(/^ARTICLE_TOPIC_DRIFT|^ARTICLE_LEGAL_PADDING|^YMYL_|^ABSOLUTE_|^UNWARRANTED_/.test(issue))score+=1000;
   else if(/CONTENT_DEPTH_MISSING|MAIN_WORDS_BELOW|TOTAL_WORDS_BELOW/.test(issue))score+=100;
   else if(/^SECTION_[0-9]{2}_TOTAL_/.test(issue))score+=20;
   else if(/^SECTION_[0-9]{2}_PARAGRAPH_/.test(issue))score+=4;
   else if(/^H2_TOO_LONG$|OWNER_BANNED_|COLON_VISIBLE_TEXT/.test(issue))score+=8;
   else score+=10;
 }
 return score;
}

export async function runSelfRepairItem({brief,generate,review=classifyLearnedCandidate,
    maxAttempts=SELF_REPAIR_POLICY.attempts_per_item,budget=SELF_REPAIR_POLICY.attempts_per_item}={}){
 if(!brief||brief.company_id!=='fenix'||brief.engine_id!=='SEO-001'||
    brief.environment!=='LAB'||!['PARTICULARES','INMOBILIARIAS'].includes(brief.persona)||
    typeof generate!=='function'||typeof review!=='function'||
    !Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3||
    !Number.isInteger(budget)||budget<0||budget>6)fail('INVALID_SCOPE_OR_BUDGET');
 const history=[];let feedback=null,previousHash=null,previousHtml=null,requests=0;
 let best=null;
 const allowed=Math.min(maxAttempts,budget);
 for(let attempt=1;attempt<=allowed;attempt++){
  let model;
  try{model=await generate({brief,attempt,feedback,previous_html:previousHtml});}
  catch{requests++;history.push({attempt,provider_status:'EXCEPTION_HOLD',request_count:1,estimated_request:true});break;}
  const n=model?.request_count??0;
  if(!Number.isInteger(n)||n<0||n>1)fail('PROVIDER_REQUEST_COUNT_UNTRUSTED');
  requests+=n;
  if(n!==1||typeof model?.html!=='string'||model.html.length<100){
   history.push({attempt,provider_status:model?.status||'PROVIDER_HOLD',request_count:n});
   break;
  }
  const fix=normalizeFaqMarkup(model.html);
  let candidate={...model,html:fix.html},auditTrace=null;
  // A deterministic HTML repair MUST re-run all original provider QA checks.
  // Otherwise the original FAQ=0/style HOLD persists after a valid wrapper fix.
  if(fix.changed&&review===classifyLearnedCandidate){
   try{
    const q=auditOwnerEditorialCopy({html:fix.html,persona:brief.persona});
    const voice=auditSeoHumanVoiceAndRisk({html:fix.html,persona:brief.persona});
    const depth=auditSeoContentDepth({html:fix.html,persona:brief.persona});
    candidate={...candidate,faq_count:q.faq_count,word_count:q.word_count,
      content_depth_precheck_passed:depth.preliminary_depth_check_passed,
      status:q.deterministic_style_precheck_passed&&voice.deterministic_precheck_passed&&depth.preliminary_depth_check_passed
        ?'REAL_CLOUD_DRAFT_REVIEW_ONLY':'REAL_CLOUD_DRAFT_STYLE_HOLD'};
    auditTrace={style_issues:q.issues,voice_issues:voice.issues,content_depth_issues:depth.issues};
   }catch{candidate={...candidate,status:'REAL_CLOUD_DRAFT_STYLE_HOLD'};}
  }
  // Existing full validator is the final precheck; neither structural repair
  // nor provider success can independently set it to PASS.
  const rawGate=review({brief,writer:candidate});
  // Carry the actual editorial/voice/depth failure codes to the next model
  // attempt even when no deterministic HTML normalization took place.
  const gate={...rawGate,
   style_issues:auditTrace?.style_issues??model.style_issues??[],
   voice_issues:auditTrace?.voice_issues??model.voice_issues??[],
   content_depth_issues:auditTrace?.content_depth_issues??model.content_depth_issues??[]};
  if(!gate||!Array.isArray(gate.copy_issues)||gate.publish_allowed!==false||
     gate.full_quality_certified!==false)fail('UNSAFE_OR_INVALID_QA_GATE');
  const h=sha(fix.html),score=rankDraftForRepair(gate);
  if(!best||score<best.score)best={html:fix.html,review:gate,score,attempt};
  history.push({attempt,provider_status:model.status,request_count:n,
   html_sha256:h,deterministic_repair:fix.changed?fix.reason:'NONE',
   technical_copy_precheck:gate.technical_copy_precheck,copy_issues:gate.copy_issues,
   relative_quality_penalty:score,selected_best_attempt:best.attempt,
   full_quality_certified:false,publish_allowed:false});
  if(gate.technical_copy_precheck==='PASS')break;
  if(previousHash===h)break; // Text truly unchanged; same error code with new text can still improve.
  previousHash=h;feedback=targetedRepairFeedback(best.review);previousHtml=best.html;
 }
 const finalHtml=best?.html||null,finalReview=best?.review||null;
 const passed=finalReview?.technical_copy_precheck==='PASS';
 return {work_id:brief.work_id,company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
   status:passed?'COPY_PRECHECK_PASS_PHYSICAL_HOLD':'SELF_REPAIR_EXHAUSTED_OR_PROVIDER_HOLD',
   review:finalReview||{technical_copy_precheck:'HOLD',copy_issues:['NO_VALID_DRAFT'],
      full_quality_certified:false,publish_allowed:false},
   attempts:history,requests,content:finalHtml,
   selected_best_attempt:best?.attempt||null,selected_relative_quality_penalty:best?.score??null,
   full_quality_certified:false,publish_allowed:false,
   physical_gates_pending:['REAL_MEDIA_PROVENANCE','REAL_DESKTOP_MOBILE_QA',
     'VALIDATED_FORM_CRM_E2E','INDEPENDENT_YMYL_LEGAL_SIGNOFF']};
}

/** Connect real Gemini Free writer only under a NEW, owner-scoped single-batch manifest.
 * This is a factory callback; defining it does not start a provider call.
 * The prior 2026-11-08 sealed pilot cannot be reused here.
 */
export function makeGeminiFreeRepairGenerator({manifest,api_key,fetch_impl,
   owner_verified_free_project=false,one_shot=runOneShotFreeCanary}={}){
 if(!manifest||manifest.company_id!=='fenix'||manifest.engine_id!=='SEO-001'||
    manifest.environment!=='LAB'||manifest.status!=='PREPARED_NOT_EXECUTED'||
    !/^TRIGGER_ONCE_[A-Z0-9_]{8,60}$/.test(manifest.workflow_trigger_nonce||'')||
    manifest.batch_id==='SEO001-AUTONOMY-PILOT-20261108-ONE'||
    manifest.allow_wordpress_writes!==false||
    manifest.allow_wordpress_publication!==false||
    manifest.allow_paid_fallback!==false||
    manifest.allow_image_api_calls!==false||
    !Number.isInteger(manifest.max_real_model_calls)||
    manifest.max_real_model_calls<1||manifest.max_real_model_calls>6||
    !Number.isInteger(manifest.max_calls_per_item)||
    manifest.max_calls_per_item<1||manifest.max_calls_per_item>3||
    !Array.isArray(manifest.briefs)||manifest.briefs.length<1||manifest.briefs.length>2||
    typeof one_shot!=='function'||owner_verified_free_project!==true||
    typeof api_key!=='string'||api_key.length<16)fail('REAL_WRITER_PRECONDITIONS');
 const ids=new Set(manifest.briefs.map(x=>x.work_id));
 if(ids.size!==manifest.briefs.length)fail('DUPLICATE_MANIFEST_WORK_ID');
 let spent=0;const attempts=new Map();
 return async({brief,attempt,feedback,previous_html=null})=>{
  if(!ids.has(brief?.work_id)||JSON.stringify(manifest.briefs.find(b=>b.work_id===brief.work_id))!==JSON.stringify(brief)||
    !Number.isInteger(attempt)||attempt<1||attempt>manifest.max_calls_per_item||
    attempt!==(attempts.get(brief.work_id)||0)+1||
    spent>=manifest.max_real_model_calls||
    (attempt===1&&feedback!==null)||(attempt>1&&!feedback))fail('REVISION_SCOPE_OR_CALL_LIMIT');
  spent++;attempts.set(brief.work_id,attempt);
  // Exactly one free-model call per invoked attempt. An exception never retries.
  return await one_shot({api_key,fetch_impl,owner_verified_free_project:true,
    brief_override:brief,revision_feedback:feedback,revision_reference_html:previous_html});
 };
}

export async function runSelfRepairBatch({batch_id,briefs,generate,review=classifyLearnedCandidate,
   maxRequests=SELF_REPAIR_POLICY.max_requests_per_batch,maxAttempts=SELF_REPAIR_POLICY.attempts_per_item}={}){
 if(typeof batch_id!=='string'||!/^SEO001-[A-Z0-9_-]{10,120}$/.test(batch_id)||
   !Array.isArray(briefs)||briefs.length<1||briefs.length>2||
   typeof generate!=='function'||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>6||
   !Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)fail('BATCH_SCOPE');
 const works=[],seen=new Set();let calls=0;
 for(const brief of briefs){
  if(seen.has(brief.work_id))fail('DUPLICATE_WORK_ID');
  seen.add(brief.work_id);
  const remain=maxRequests-calls;
  if(remain<=0){works.push({work_id:brief.work_id,status:'SKIPPED_BATCH_BUDGET',
      requests:0,publish_allowed:false,full_quality_certified:false});continue;}
  const result=await runSelfRepairItem({brief,generate,review,maxAttempts,budget:remain});
  calls+=result.requests;works.push(result);
 }
 if(calls>maxRequests)fail('REQUEST_CEILING');
 return {batch_id,company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
   status:works.every(x=>x.status==='COPY_PRECHECK_PASS_PHYSICAL_HOLD')?
     'COPY_READY_PHYSICAL_QA_PENDING':'INCOMPLETE_HOLD',
   model_calls:calls,paid_fallback_calls:0,wordpress_writes:0,crm_writes:0,
   images_created:0,published:0,publish_allowed:false,
   next_batch_auto_allowed:false,works};
}
