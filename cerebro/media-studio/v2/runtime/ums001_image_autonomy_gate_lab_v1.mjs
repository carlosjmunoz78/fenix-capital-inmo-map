import {createHash} from 'node:crypto';
/** UMS-001 additive LAB-only, deterministic image request + final acceptance gate. No API execution. */
const F=Object.freeze({'IG-FEED-01':['INSTAGRAM',1080,1350],'IG-CAROUSEL-01':['INSTAGRAM',1080,1350],'IG-CAROUSEL-02':['INSTAGRAM',1080,1350],'IG-CAROUSEL-03':['INSTAGRAM',1080,1350],'IG-CAROUSEL-04':['INSTAGRAM',1080,1350],'IG-CAROUSEL-05':['INSTAGRAM',1080,1350],'IG-STORY-01':['INSTAGRAM',1080,1920],'FB-FEED-01':['FACEBOOK',1080,1080],'LI-FEED-01':['LINKEDIN',1200,628],'SEO-HERO-01':['SEO',1600,900],'SEO-BODY-01':['SEO',1200,900]});
const hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const no=(reason,exception='HIGH_RISK')=>({state:'HUMAN_REQUIRED',exception,reason,delivery_allowed:false,publish_enabled:false,video_gate_allowed:false});
export function intake(order){
 if(!order||typeof order!=='object'||Array.isArray(order))return no('INVALID_REQUEST');
 const j=order;
 if(j.company_id!=='fenix'||j.engine_id!=='UMS-001'||j.environment!=='LAB'||j.version!=='1.0')return no('SCOPE');
 if(!Object.hasOwn(F,j.item_id)||!/^UMS001-[A-Z0-9_-]{8,90}$/.test(j.request_id||''))return no('IDENTITY');
 if(typeof j.consumer_engine_id!=='string'||j.consumer_engine_id.length<4||typeof j.scene!=='string'||j.scene.length<45||j.scene.length>1600)return no('INVALID_BRIEF');
 if(j.publish_enabled!==false||j.video_enabled!==false||j.production_enabled!==false||j.auto_reload!==false||j.allow_paid_execution!==false)return no('SAFETY_FLAGS');
 if(!Number.isInteger(j.max_attempts)||j.max_attempts<1||j.max_attempts>2)return no('RETRY_LIMIT');
 if(typeof j.max_estimated_usd!=='number'||!Number.isFinite(j.max_estimated_usd)||j.max_estimated_usd<=0||j.max_estimated_usd>.10)return no('BUDGET_LIMIT','MONEY_LIMIT');
 if(typeof j.prepaid_available_usd!=='number'||!Number.isFinite(j.prepaid_available_usd)||j.prepaid_available_usd<j.max_estimated_usd)return no('UNVERIFIED_PREPAID_BALANCE','MONEY_LIMIT');
 const [channel,width,height]=F[j.item_id];
 return {state:'QUEUED_LAB_NO_MODEL_CALL',request_id:j.request_id,item_id:j.item_id,company_id:j.company_id,engine_id:j.engine_id,environment:j.environment,channel,width,height,max_attempts:j.max_attempts,max_estimated_usd:j.max_estimated_usd,job_key:createHash('sha256').update([j.company_id,j.engine_id,j.environment,j.request_id,j.item_id,j.version].join(':')).digest('hex'),delivery_allowed:false,publish_enabled:false,video_gate_allowed:false};
}
const again=(j,p,why)=>p.attempt_number<j.max_attempts?{state:'AUTO_RETAKE_ELIGIBLE_PENDING_NEW_PREPAID_RESERVATION',reason:why,remaining_attempts:j.max_attempts-p.attempt_number,delivery_allowed:false,publish_enabled:false,video_gate_allowed:false}:no(why,'LOW_CONFIDENCE');
export function certify(order,p){
 const j=intake(order);if(j.state!=='QUEUED_LAB_NO_MODEL_CALL')return j;
 if(!p||p.company_id!==j.company_id||p.engine_id!==j.engine_id||p.environment!==j.environment||p.item_id!==j.item_id||p.request_id!==j.request_id)return no('PROVENANCE_IDENTITY');
 if(!hash(p.raw_sha256)||!hash(p.finished_sha256)||j.channel!=='SEO'&&!hash(p.official_logo_sha256)||!hash(p.provider_prediction_receipt_sha256)||p.provider_prediction_status!=='succeeded')return no('PROVENANCE_NOT_VERIFIED');
 if(p.width_px!==j.width||p.height_px!==j.height||p.native_ratio_verified!==true)return no('FORMAT_NOT_VERIFIED');
 if(!Number.isInteger(p.attempt_number)||p.attempt_number<1||p.attempt_number>j.max_attempts||p.actual_model_calls!==p.attempt_number)return no('UNVERIFIED_ATTEMPTS');
 if(typeof p.cumulative_model_cost_usd!=='number'||p.cumulative_model_cost_usd<0||p.cumulative_model_cost_usd>j.max_estimated_usd)return no('BUDGET_EXCEEDED','MONEY_LIMIT');
 if(p.technical_export_qa!=='PASS'||p.originality_verified!==true||p.photo_realism_independently_verified!==true||p.accessibility_verified!==true||p.claims_verified!==true)return no('INDEPENDENT_TECHNICAL_QA_MISSING');
 if(p.legal_rights_verified!==true||!hash(p.rights_evidence_sha256)||p.brand_verified!==true||p.final_editorial_verified!==true||!hash(p.editorial_evidence_sha256))return no('RIGHTS_OR_EDITORIAL_MISSING','LEGAL_REQUIRED');
 const q=p.visual_qa;
 const RUBRIC={human_presence_and_cast:20,camera_and_composition:15,lighting_and_realism:15,contrast_and_color:10,surreal_creativity:15,typography_and_brand_integrity:15,context_and_claims:10};
 if(!q||!q.rubric_scores||typeof q.rubric_scores!=='object'||Array.isArray(q.rubric_scores)||
    JSON.stringify(Object.keys(q.rubric_scores).sort())!==JSON.stringify(Object.keys(RUBRIC).sort())||
    Object.entries(RUBRIC).some(([key,max])=>!Number.isInteger(q.rubric_scores[key])||q.rubric_scores[key]<0||q.rubric_scores[key]>max)||
    Object.values(q.rubric_scores).reduce((a,b)=>a+b,0)!==q.score)return again(j,p,'VISION_RUBRIC_INVALID');
 if(!q||q.score_consistency!=='VERIFIED'||q.accepted!==true||q.pass!==true||!Number.isInteger(q.score)||q.score<88||q.score>100||!Array.isArray(q.violations)||q.violations.length||p.critical_violations!==0)return again(j,p,'VISUAL_QA_NOT_ACCEPTED');
 if(p.independent_physical_qa_verified!==true||!hash(p.independent_qa_receipt_sha256))return no('SINGLE_MODEL_CANNOT_SELF_APPROVE');
 if(p.artifact_private_verified!==true||!hash(p.storage_receipt_sha256)||p.signed_delivery_verified!==true||!hash(p.delivery_receipt_sha256))return no('DELIVERY_NOT_ATTESTED');
 return {state:'APPROVED_FOR_PRIVATE_DEPARTMENT_DELIVERY_ONLY',request_id:j.request_id,item_id:j.item_id,score:q.score,finished_sha256:p.finished_sha256,delivery_allowed:true,publish_enabled:false,video_gate_allowed:false};
}
export function videoGate(receipts){
 if(!Array.isArray(receipts)||receipts.length!==11||new Set(receipts.map(x=>x?.item_id)).size!==11||Object.keys(F).some(id=>!receipts.some(x=>x?.item_id===id)))return {state:'VIDEO_HOLD_INCOMPLETE',video_gate_allowed:false};
 if(receipts.some(x=>x.state!=='APPROVED_FOR_PRIVATE_DEPARTMENT_DELIVERY_ONLY'||x.delivery_allowed!==true||x.publish_enabled!==false||!hash(x.finished_sha256)))return {state:'VIDEO_HOLD_UNAPPROVED',video_gate_allowed:false};
 return {state:'IMAGE_BATCH_QUALITY_PROOFS_COMPLETE_SEPARATE_VIDEO_TRIBUNAL_REQUIRED',video_gate_allowed:false};
}
export const FORMATS=F;
