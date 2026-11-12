/**
 * UMS-001 LAB image acceptance controller, additive to existing intake and finisher.
 * Pure offline decision logic: NO inference, uploads, publication or payment.
 * Independently authorized Ed25519 trust anchors must be supplied by the caller.
 */
import {createHash,createPublicKey,verify} from 'node:crypto';
import {validateOrder,CANON_RUBRIC} from './ums001_image_autonomous_intake_lab_v1.mjs';
const SHA=/^[a-f0-9]{64}$/;
const OFF={automatic_publication:false,video_enabled:false,paid_provider_calls_authorized:false,
 production_enabled:false,additional_spend_eur:0};
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?
 Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b,'en'))):x);
const hold=(reason,code='LOW_CONFIDENCE')=>({status:'HUMAN_REQUIRED',code,reason,delivery_allowed:false,...OFF});
const pending=(status,reason)=>({status,reason,delivery_allowed:false,...OFF});
function checkAttestation(role,doc,anchors,expected){
 if(!doc||typeof doc!=='object'||typeof doc.key_id!=='string'||typeof doc.signature!=='string'||
  doc.role!==role||!doc.payload||typeof doc.payload!=='object')return false;
 const key=anchors?.[role];
 if(!key||key.key_id!==doc.key_id||typeof key.public_key_pem!=='string'||key.revoked===true)return false;
 if(canon(doc.payload)!==canon(expected))return false;
 try{return verify(null,Buffer.from(canon(doc.payload)),createPublicKey(key.public_key_pem),Buffer.from(doc.signature,'base64'));}
 catch{return false;}
}
function verifiedVision(v){
 if(!v||typeof v.pass!=='boolean'||!Number.isInteger(v.score)||v.score<0||v.score>100||
  !Array.isArray(v.violations)||!v.rubric_scores||typeof v.rubric_scores!=='object'||
  canon(Object.keys(v.rubric_scores).sort())!==canon(Object.keys(CANON_RUBRIC).sort()))return 'QA_SCHEMA';
 let total=0;
 for(const [k,max] of Object.entries(CANON_RUBRIC)){
  if(!Number.isInteger(v.rubric_scores[k])||v.rubric_scores[k]<0||v.rubric_scores[k]>max)return 'QA_RUBRIC';
  total+=v.rubric_scores[k];
 }
 if(total!==v.score)return 'QA_ARITHMETIC';
 if(v.violations.some(x=>typeof x!=='string'||x.length>80))return 'QA_VIOLATION_SCHEMA';
 return v.pass&&v.score>=88&&v.violations.length===0?'PASS':'REJECTED_VISUAL';
}
/**
 * Assess the last PHYSICALLY recorded image attempt; no optimistic attempt resets.
 * Bytes and signatures are mandatory before private-delivery eligibility.
 * Synthetic unit-test signers are NEVER production trust anchors.
 */
export function adjudicateCompletedImage({order,master,history,rawBytes,finalBytes,
 vision,finish,rights,editorial,attestations,trust,destinationReceipt=null}){
 const {item}=validateOrder(order,master);
 if(!history||history.schema_version!==5||history.request_id!==master.request_id||
  history.company_id!=='fenix'||history.engine_id!=='UMS-001'||history.environment!=='LAB'||
  history.image_gate_green!==false||!history.attempts_by_item||
  Object.keys(history.attempts_by_item).length!==11)return hold('HISTORY_NOT_TRUSTED','HIGH_RISK');
 const attempts=history.attempts_by_item[item.item_id];
 if(!Number.isInteger(attempts)||attempts<0||attempts>2)return hold('ATTEMPT_LEDGER_INVALID','HIGH_RISK');
 if(attempts===0)return pending('WAITING_FOR_PHYSICAL_IMAGE','NO_RECORDED_PREDICTION');
 if(!Buffer.isBuffer(rawBytes)||!Buffer.isBuffer(finalBytes)||rawBytes.length<100||finalBytes.length<100)
  return pending('WAITING_FOR_PHYSICAL_BYTES','NOT_BINARY_VERIFIED');
 if(!finish||!SHA.test(finish.raw_sha256||'')||!SHA.test(finish.output_sha256||'')||
  sha(rawBytes)!==finish.raw_sha256||sha(finalBytes)!==finish.output_sha256)
  return hold('PHYSICAL_BYTES_SHA_MISMATCH','HIGH_RISK');
 if(finish.item_id!==item.item_id||finish.company_id!=='fenix'||finish.engine_id!=='UMS-001'||
  finish.environment!=='LAB'||finish.width_px!==item.width_px||finish.height_px!==item.height_px||
  finish.output_file_verified_sha256!==finish.output_sha256||
  finish.publish_enabled!==false||finish.video_gate_allowed!==false||
  !finish.private_artifact_ref?.startsWith('artifact:'))
  return hold('FINISHER_CONTRACT_FAILED','HIGH_RISK');
 const logo=item.channel==='SEO'?null:'ec066819ee12c48fa148d6ca70f1434724ff780cc9ccabcfeefc07318c796cc7';
 if(finish.brand_logo_sha256!==logo)return hold('OFFICIAL_BRAND_MISMATCH','HIGH_RISK');
 const qa=verifiedVision(vision);
 if(['QA_SCHEMA','QA_RUBRIC','QA_ARITHMETIC','QA_VIOLATION_SCHEMA'].includes(qa))
  return pending('AUTO_QA_REEVALUATION_REQUIRED','REUSE_SAME_IMAGE_NO_NEW_GENERATION_'+qa);
 if(qa==='REJECTED_VISUAL')return attempts===1?
  pending('AUTO_RETAKE_PENDING_PREPAID_RESERVATION','ONE_FINAL_IMAGE_ATTEMPT_REMAINS'):
  hold('TWO_REAL_IMAGE_ATTEMPTS_REJECTED');
 if(!rights||rights.status!=='VERIFIED_LICENSE'||rights.source_provider!=='bytedance/seedream-4'||
  rights.allowed_commercial_use!==true||rights.restrictions_checked!==true||
  rights.item_id!==item.item_id||rights.raw_sha256!==finish.raw_sha256||
  !SHA.test(rights.provenance_sha256||''))return hold('COMMERCIAL_RIGHTS_UNVERIFIED','LEGAL_REQUIRED');
 if(!editorial||editorial.approved!==true||editorial.no_unverified_financial_claims!==true||
  editorial.brand_verified!==true||editorial.no_generated_logos!==true||
  editorial.item_id!==item.item_id||editorial.output_sha256!==finish.output_sha256||
  !Array.isArray(editorial.critical_flags)||editorial.critical_flags.length)
  return hold('EDITORIAL_OR_CLAIMS_NOT_CLEARED','HIGH_RISK');
 const expectedBase={schema_version:1,order_id:order.order_id,item_id:item.item_id,
  company_id:'fenix',engine_id:'UMS-001',environment:'LAB',raw_sha256:finish.raw_sha256,
  output_sha256:finish.output_sha256};
 const evidence={VISUAL:vision,FINISHER:finish,RIGHTS:rights,EDITORIAL:editorial};
 const roles=Object.keys(evidence);
 if(new Set(roles.map(role=>trust?.[role]?.key_id)).size!==roles.length)
  return hold('NON_INDEPENDENT_TRUST_ANCHORS','SECURITY_INCIDENT');
 for(const role of roles){
  const statement={...expectedBase,role,evidence_sha256:sha(Buffer.from(canon(evidence[role])))};
  if(!checkAttestation(role,attestations?.[role],trust,statement))
   return hold('MISSING_OR_INVALID_INDEPENDENT_SIGNATURE_'+role,'LOW_CONFIDENCE');
 }
 const idempotency_key=sha(Buffer.from(canon({...expectedBase,attempts})));
 if(destinationReceipt===null)return {status:'AUTO_APPROVED_PRIVATE_CANDIDATE',
  reason:'SIGNED_INDEPENDENT_QA_AND_RIGHTS__PRIVATE_DELIVERY_NEEDS_RECEIPT',
  idempotency_key,delivery_allowed:false,private_transfer_eligible:true,...OFF};
 if(!destinationReceipt||destinationReceipt.consumer_engine_id!==item.consumer_engine_id||
  destinationReceipt.received_sha256!==finish.output_sha256||destinationReceipt.accepted!==true)
  return hold('DESTINATION_RECEIPT_INVALID','HIGH_RISK');
 const statement={...expectedBase,role:'DESTINATION',consumer_engine_id:item.consumer_engine_id,
  idempotency_key,received_sha256:finish.output_sha256};
 if(!checkAttestation('DESTINATION',destinationReceipt.attestation,trust,statement)||
  roles.some(role=>trust[role].key_id===trust.DESTINATION?.key_id))
  return hold('DESTINATION_SIGNATURE_INVALID','SECURITY_INCIDENT');
 return {status:'PRIVATE_DELIVERY_RECEIPT_VERIFIED',idempotency_key,
  delivery_allowed:true,private_transfer_eligible:true,...OFF};
}
