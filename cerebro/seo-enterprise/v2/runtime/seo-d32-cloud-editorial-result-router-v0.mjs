/**
 * CEREBRO SEO-D32 real writer result -> deterministic evaluation and training
 * handoff. No further model calls, retries, publication or external writes.
 * Not an AI detector and does not certify commercial/financial correctness.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoHumanVoiceAndRisk} from './seo-d31-human-voice-risk-gate-v0.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';

const H=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const DENY=code=>{throw Error('SEO_D32_'+code)};
const fail=(code,detail={})=>Object.freeze({
 state:'HOLD',code,company_id:'fenix',engine_id:'SEO-001',
 environment:'LAB',version:'0.1.0',additional_cost_eur:0,
 model_calls_next:0,automatic_retry:false,can_publish:false,
 wordpress_writes:0,media_requests:0,independent_expert_review_verified:false,
 ...detail
});
function checkInput(receipt,candidate){
 if(!receipt||receipt.company_id!=='fenix'||receipt.engine_id!=='SEO-001'||
  receipt.environment!=='LAB'||typeof receipt.status!=='string')DENY('SCOPE');
 if(receipt.wordpress_writes!==0||receipt.can_publish!==false)DENY('PROD_PERMISSIONS');
 if(receipt.request_count!==undefined&&(!Number.isInteger(receipt.request_count)||receipt.request_count>1||
  receipt.request_count<0))DENY('REQUEST_CEILING');
 if(candidate!==null&&typeof candidate!=='string')DENY('CANDIDATE_TYPE');
}
const family=(http)=>http===429?'PROVIDER_RATE_LIMIT':http===503||http===502||http===504?'PROVIDER_TRANSIENT_UNAVAILABLE':
 http===404?'PROVIDER_MODEL_NOT_FOUND':http===401||http===403?'PROVIDER_IAM_ACCESS_DENIED':'PROVIDER_REJECTED_UNCLASSIFIED';
export function evaluateSeoCloudDraftReceipt({receipt,candidate_html=null,persona='PARTICULARES',
 content_type='ARTICLE'}={}){
 checkInput(receipt,candidate_html);
 if(!['PARTICULARES','INMOBILIARIAS'].includes(persona)||
  !['ARTICLE','LANDING'].includes(content_type))DENY('PERSONA_OR_CONTENT_TYPE');
 if(receipt.status==='HOLD'){
  const code=receipt.reason==='PROVIDER_HTTP_REJECTED'?family(receipt.http_status):
   receipt.reason==='PROVIDER_NETWORK_FAILURE'?'NETWORK_UNAVAILABLE': 'PREEXISTING_HOLD';
  return fail(code,{source_reason:receipt.reason, http_status:receipt.http_status||null,
   provider_calls_made:receipt.request_count||0,
   model_response_received:false,manual_recheck_required:true,
   next_action:'REVERIFY_PROVIDER_AND_BUDGET_IN_A_SEPARATELY_AUTHORIZED_ONE_SHOT',
   current_copy_quality:'NOT_EVALUABLE_NO_NEW_CANDIDATE'});
 }
 if(!['REAL_CLOUD_DRAFT_REVIEW_ONLY','REAL_CLOUD_DRAFT_STYLE_HOLD'].includes(receipt.status))
  DENY('UNKNOWN_WRITER_STATE');
 if(typeof candidate_html!=='string'||candidate_html.length<500||candidate_html.length>30000)
  return fail('CANDIDATE_MISSING_OR_INVALID',{original_status:receipt.status});
 const calculated=H(candidate_html);
 if(receipt.source_sha256!==calculated)return fail('CONTENT_DIGEST_MISMATCH',{
  original_status:receipt.status,expected_sha256:receipt.source_sha256||null,
  calculated_sha256:calculated});
 if(/<(?:script|iframe|form|svg|style|img|object|embed)\b|\s(?:onclick|onerror|style)\s*=/i.test(candidate_html))
  return fail('ACTIVE_CONTENT_REJECTED',{source_sha256:calculated});
 const style=auditOwnerEditorialCopy({html:candidate_html,persona,content_type});
 const voice=auditSeoHumanVoiceAndRisk({html:candidate_html,persona,content_type});
 const depth=auditSeoContentDepth({html:candidate_html,persona,content_type});
 const issues=[...style.issues.map(x=>'STYLE_'+x),...voice.issues.map(x=>'VOICE_'+x),...depth.issues.map(x=>'DEPTH_'+x)];
 const clean=issues.length===0;
 return fail(clean?'TECHNICAL_PRECHECK_PASS_RELEASE_HOLD':'EDITORIAL_REWRITE_REQUIRED',{
  work_id:receipt.work_id||null,source_sha256:calculated,
  faq_count:style.faq_count,faq_required:style.faq_required,
  word_count:style.word_count,
  main_content_words_excluding_faq:depth.main_content_words_excluding_faq,
  required_total_words:depth.required_total_words,
  required_main_words:depth.required_main_words,
  depth_precheck_passed:depth.preliminary_depth_check_passed,
  copy_issues:Object.freeze(issues),independent_expert_review_verified:false,
  source_factcheck_verified:false,owner_exact_content_approved:false,
  source_verified_by_model:false,decision:clean?'SEND_TO_INDEPENDENT_PROFESSIONAL_QA':
  'LEARN_FROM_OWNER_AND_REGENERATE_ONLY_AFTER_NEW_PROVIDER_GATE',
  human_voice_precheck_passed:voice.deterministic_precheck_passed,
  buyer_persona_expert_quality_verified:false,
  model_response_received:true,provider_calls_made:receipt.request_count||0
 });
}
export function buildSeoTrainingFeedback({evaluation,prior_sha256=null}={}){
 if(evaluation?.company_id!=='fenix'||evaluation?.can_publish!==false||
  evaluation?.model_calls_next!==0||evaluation?.automatic_retry!==false)DENY('TRAINING_SCOPE');
 const evidence={
  company_id:'fenix',engine_id:'SEO-D32',environment:'LAB',version:'0.1.0',
  copy_source_sha256:evaluation.source_sha256||null,
  previous_feedback_sha256:prior_sha256||null,
  evaluator:'D15_BASIC_STYLE_AND_D31_DETERMINISTIC_HUMAN_VOICE_PRECHECK',
  source_decision:evaluation.code,
  learning_tags:evaluation.copy_issues||[],
  manual_notes_required:true,
  training_handoff:'PROMPT_AND_TEST_REGRESSION_NO_OWN_MODEL_TRAINING_CLAIM',
  next_inference_call_authorized:false,
  paid_fallback_authorized:false,wordpress_write_authorized:false,
  semantic_expert_approval_authorized:false
 };
 return Object.freeze(evidence);
}
export function reviewOneShotArtifactFolder({dir}={}){
 if(typeof dir!=='string'||!path.isAbsolute(dir)||dir.includes('..'))DENY('ARTIFACT_PATH');
 const f=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json'),'utf8'));
 const htmlPath=path.join(dir,'candidate.html');
 const html=fs.existsSync(htmlPath)?fs.readFileSync(htmlPath,'utf8'):null;
 return Object.freeze({
  evaluation:evaluateSeoCloudDraftReceipt({receipt:f,candidate_html:html}),
  evidence_path:'REVIEW_ONLY_LOCAL_ARTIFACT',
  artifact_directory_created:false,additional_api_calls:0
 });
}
