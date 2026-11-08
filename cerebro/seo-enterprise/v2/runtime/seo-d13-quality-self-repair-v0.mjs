/**
 * CEREBRO OS · SEO-D13 incremental self-repair V0 (LAB, zero-production-write).
 * Reuse the existing independent post-D13 quality gates. One failed draft
 * produces targeted feedback and another bounded draft, not an approval.
 * Deterministic repairs only touch structure; factual claims remain gated.
 */
import crypto from 'node:crypto';
import {classifyLearnedCandidate} from './seo-learned-one-batch-runner-v0.mjs';

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
 const codes=[...new Set(list.map(x=>typeof x==='string'?x:null).filter(Boolean))].slice(0,16);
 return Object.freeze({error_codes:codes,revision_kind:'REWRITE_ONLY_UNRESOLVED_ERRORS',
   no_invented_legal_facts:true,keep_grounded_sources:true,
   faq_dom_exact:true,no_image_or_form_in_model_html:true});
}
/** Bounded automatic feedback loop. A model callback may make one provider call
 * per invocation. External side effects are forbidden within this coordinator.
 * No content text is printed; each attempt records an evidence hash and issues.
 */
export async function runSelfRepairItem({brief,generate,review=classifyLearnedCandidate,
    maxAttempts=SELF_REPAIR_POLICY.attempts_per_item,budget=SELF_REPAIR_POLICY.attempts_per_item}={}){
 if(!brief||brief.company_id!=='fenix'||brief.engine_id!=='SEO-001'||
    brief.environment!=='LAB'||!['PARTICULARES','INMOBILIARIAS'].includes(brief.persona)||
    typeof generate!=='function'||typeof review!=='function'||
    !Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3||
    !Number.isInteger(budget)||budget<0||budget>6)fail('INVALID_SCOPE_OR_BUDGET');
 const history=[];let feedback=null,previousHash=null,previousErrors=null,requests=0;
 let finalHtml=null,finalReview=null;
 const allowed=Math.min(maxAttempts,budget);
 for(let attempt=1;attempt<=allowed;attempt++){
  let model;
  try{model=await generate({brief,attempt,feedback});}
  catch{history.push({attempt,provider_status:'EXCEPTION_HOLD',request_count:0});break;}
  const n=model?.request_count??0;
  if(!Number.isInteger(n)||n<0||n>1)fail('PROVIDER_REQUEST_COUNT_UNTRUSTED');
  requests+=n;
  if(n!==1||typeof model?.html!=='string'||model.html.length<100){
   history.push({attempt,provider_status:model?.status||'PROVIDER_HOLD',request_count:n});
   break;
  }
  const fix=normalizeFaqMarkup(model.html);
  const candidate={...model,html:fix.html};
  // Existing full validator is the final precheck; neither structural repair
  // nor provider success can independently set it to PASS.
  const gate=review({brief,writer:candidate});
  if(!gate||!Array.isArray(gate.copy_issues)||gate.publish_allowed!==false||
     gate.full_quality_certified!==false)fail('UNSAFE_OR_INVALID_QA_GATE');
  finalHtml=fix.html;finalReview=gate;
  const h=sha(fix.html),errors=targetedRepairFeedback(gate);
  history.push({attempt,provider_status:model.status,request_count:n,
   html_sha256:h,deterministic_repair:fix.changed?fix.reason:'NONE',
   technical_copy_precheck:gate.technical_copy_precheck,copy_issues:gate.copy_issues,
   full_quality_certified:false,publish_allowed:false});
  if(gate.technical_copy_precheck==='PASS')break;
  if(previousHash===h||JSON.stringify(previousErrors)===JSON.stringify(errors.error_codes))break;
  previousHash=h;previousErrors=errors.error_codes;feedback=errors;
 }
 const passed=finalReview?.technical_copy_precheck==='PASS';
 return {work_id:brief.work_id,company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
   status:passed?'COPY_PRECHECK_PASS_PHYSICAL_HOLD':'SELF_REPAIR_EXHAUSTED_OR_PROVIDER_HOLD',
   review:finalReview||{technical_copy_precheck:'HOLD',copy_issues:['NO_VALID_DRAFT'],
      full_quality_certified:false,publish_allowed:false},
   attempts:history,requests,content:finalHtml,
   full_quality_certified:false,publish_allowed:false,
   physical_gates_pending:['REAL_MEDIA_PROVENANCE','REAL_DESKTOP_MOBILE_QA',
     'VALIDATED_FORM_CRM_E2E','INDEPENDENT_YMYL_LEGAL_SIGNOFF']};
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
