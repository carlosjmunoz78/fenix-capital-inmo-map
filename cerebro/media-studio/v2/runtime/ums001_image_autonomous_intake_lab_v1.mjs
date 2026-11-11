/**
 * UMS-001 · Automated image intake and fail-closed handoff. LAB only.
 * No provider calls, external IO, payment, publishing, or video in this module.
 * CEREBRO owns the original master/prompt factory. Never "approve" from CI status.
 */
import {createHash} from "node:crypto";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {dirname} from "node:path";
const sha=x=>createHash("sha256").update(x).digest("hex");
const strictId=/^UMS001-LAB-[A-Z0-9-]{8,76}$/;
const hex=/^[0-9a-f]{64}$/;
const fail=(x)=>{throw Error("UMS001_AUTONOMY_"+x)};
const ORDER_KEYS=["schema_version","order_id","company_id","engine_id","environment","item_id",
 "source_request_id","consumer_engine_id","creative_owner","rights_mode","requested_at_utc",
 "delivery_mode","max_attempts_per_piece","max_model_usd_per_attempt","max_qa_usd_per_attempt",
 "max_additional_cost_eur","prepaid_only","automatic_publication","auto_recharge","video_enabled",
 "paid_execution_enabled","provider"];
export const CANON_RUBRIC=Object.freeze({human_presence_and_cast:20,camera_and_composition:15,lighting_and_realism:15,
 contrast_and_color:10,surreal_creativity:15,typography_and_brand_integrity:15,context_and_claims:10});
export const HOLD_CODES=Object.freeze(["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK",
 "POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"]);
export const SOURCE="cerebro/media-studio/v2/runtime/ums001_multichannel_prompt_owner_lab_v1.py";
export function validateOrder(order,master) {
 if(!order||typeof order!=="object"||Array.isArray(order)||Object.keys(order).sort().join("|")!==[...ORDER_KEYS].sort().join("|"))fail("ORDER_SCHEMA");
 if(order.schema_version!==1||!strictId.test(order.order_id||""))fail("ORDER_ID");
 if(order.company_id!=="fenix"||order.engine_id!=="UMS-001"||order.environment!=="LAB")fail("TENANT_OR_ENV");
 if(!master||master.request_id!=="UMS001-MULTICHANNEL-IMAGE-11-20261111-V1"||master.company_id!=="fenix"||
    master.engine_id!=="UMS-001"||master.environment!=="LAB"||master.status!=="REGISTERED_NOT_YET_EXECUTED")fail("MASTER");
 const pieces=master.pieces||[];
 if(pieces.length!==11||new Set(pieces.map(x=>x.item_id)).size!==11)fail("MASTER_PIECES");
 const item=pieces.find(x=>x.item_id===order.item_id);
 if(!item||order.source_request_id!==master.request_id||order.consumer_engine_id!==item.consumer_engine_id||
    order.creative_owner!=="CEREBRO_PROMPT_FACTORY_V0")fail("UNTRUSTED_CREATIVE_OWNER");
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(order.requested_at_utc)||Number.isNaN(Date.parse(order.requested_at_utc)))fail("TIME");
 if(order.provider!=="bytedance/seedream-4"||order.rights_mode!=="SYNTHETIC_ORIGINAL_PROVENANCE_REQUIRED"||
   order.delivery_mode!=="PRIVATE_LAB_CANDIDATE_ONLY")fail("POLICY");
 if(order.max_attempts_per_piece!==2||order.max_model_usd_per_attempt!==0.03||order.max_qa_usd_per_attempt!==0.02||
    order.max_additional_cost_eur!==0||order.prepaid_only!==true||
    order.automatic_publication!==false||order.auto_recharge!==false||order.video_enabled!==false||
    order.paid_execution_enabled!==false)fail("FINOPS_OR_PUBLICATION");
 if(item.publication_approved!==false||item.brand_policy!=="OFFICIAL_LOGO_POSTPROCESS_ONLY"||
    item.required_quality_score!==88)fail("MASTER_RISK");
 return Object.freeze({order,item});
}
export function planIntake(order,master,history) {
 const {item}=validateOrder(order,master);
 if(!history||history.schema_version!==5||history.company_id!=="fenix"||
   history.engine_id!=="UMS-001"||history.environment!=="LAB"||
   history.request_id!==master.request_id||history.image_gate_green!==false||
   !history.attempts_by_item||Object.keys(history.attempts_by_item).length!==11)fail("HISTORY_MISSING");
 const count=history.attempts_by_item[item.item_id];
 if(!Number.isInteger(count)||count<0||count>2)fail("HISTORY_INVALID");
 const frozen=count>=order.max_attempts_per_piece;
 const output={
  schema_version:1,order_id:order.order_id,company_id:"fenix",engine_id:"UMS-001",environment:"LAB",
  item_id:item.item_id,consumer_engine_id:item.consumer_engine_id,channel:item.channel,placement:item.placement,
  requested_pixels:[item.width_px,item.height_px],generator_native_aspect:item.provider_aspect_ratio,
  creative_owner:"CEREBRO_PROMPT_FACTORY_V0",creative_factory:SOURCE,scene_sha256:sha(item.scene),
  requested_at_utc:order.requested_at_utc,provider_route:"bytedance/seedream-4",
  previous_predictions_for_piece:count,attempts_remaining:Math.max(0,2-count),
  max_new_prediction_budget_usd:Math.max(0,2-count)*order.max_model_usd_per_attempt,
  max_new_qa_budget_usd:Math.max(0,2-count)*order.max_qa_usd_per_attempt,
  physical_quality_gate:"IMAGE_GATE_NOT_GREEN",brand_postproduction:"SHA_VERIFIED_FINISHER_REQUIRED",
  independent_visual_qa:"REQUIRED",rights_clearance:"UNVERIFIED",
  status:frozen?"HUMAN_REQUIRED":"LAB_INTAKE_ACCEPTED_CREATIVE_PLANNING_ONLY",
  human_required_reason:frozen?"LOW_CONFIDENCE":null,
  actions:frozen?["FREEZE_PIECE","PRESERVE_FAILURES","REQUEST_HUMAN_EXCEPTION"]:
    ["REGISTER_ORDER","BUILD_CEREBRO_OWNED_PROMPT","PREPARE_PRIVATE_LAB_BRIEF","AWAIT_VERIFIED_PREPAID_RESERVATION"],
  paid_provider_calls_authorized:false,automatic_publication:false,auto_recharge:false,video_enabled:false,
  delivery_allowed:false,production_enabled:false,additional_spend_eur:0};
 return Object.freeze(output);
}
export function decideImage(order,master,history,vision,finish,rights) {
 const plan=planIntake(order,master,history);
 if(plan.status==="HUMAN_REQUIRED")return {status:"HUMAN_REQUIRED",code:"LOW_CONFIDENCE",delivery_allowed:false,video_allowed:false};
 if(!vision||!finish||!rights)return {status:"HUMAN_REQUIRED",code:"LOW_CONFIDENCE",reason:"MISSING_REAL_PHYSICAL_QA",delivery_allowed:false,video_allowed:false};
 // An AI-generated scalar score is never a signed independent commercial release.
 if(typeof vision!=="object"||Object.keys(vision).sort().join("|")!==["pass","score","violations","rubric_scores"].sort().join("|")||
    typeof vision.pass!=="boolean"||!Number.isInteger(vision.score)||vision.score<0||vision.score>100||
    !Array.isArray(vision.violations)||!vision.rubric_scores||
    Object.keys(vision.rubric_scores).sort().join("|")!==Object.keys(CANON_RUBRIC).sort().join("|"))
  return {status:"HUMAN_REQUIRED",code:"LOW_CONFIDENCE",reason:"VISION_SCHEMA_INVALID",delivery_allowed:false,video_allowed:false};
 let total=0;
 for(const [key,max] of Object.entries(CANON_RUBRIC)){
  const v=vision.rubric_scores[key];if(!Number.isInteger(v)||v<0||v>max)
   return {status:"HUMAN_REQUIRED",code:"LOW_CONFIDENCE",reason:"VISION_RUBRIC_INVALID",delivery_allowed:false,video_allowed:false};
  total+=v;
 }
 if(total!==vision.score||vision.score<88||!vision.pass||vision.violations.length)
  return {status:"HUMAN_REQUIRED",code:"LOW_CONFIDENCE",reason:"VISION_REJECTED_OR_INCONSISTENT",delivery_allowed:false,video_allowed:false};
 // Validate all provenance before any candidate delivery. No easy boolean shortcuts.
 if(!hex.test(finish.raw_sha256||"")||!hex.test(finish.output_sha256||"")||
   finish.item_id!==order.item_id||finish.company_id!=="fenix"||finish.engine_id!=="UMS-001"||
   finish.environment!=="LAB"||finish.width_px!==plan.requested_pixels[0]||
   finish.height_px!==plan.requested_pixels[1]||finish.output_file_verified_sha256!==finish.output_sha256||
   finish.private_artifact_ref?.startsWith("artifact:")!==true||
   finish.publish_enabled!==false||finish.video_gate_allowed!==false ||
   (plan.channel==="SEO"?finish.brand_logo_sha256!==null:
     finish.brand_logo_sha256!=="ec066819ee12c48fa148d6ca70f1434724ff780cc9ccabcfeefc07318c796cc7"))
  return {status:"HUMAN_REQUIRED",code:"HIGH_RISK",reason:"PHYSICAL_BRAND_PROVENANCE_NOT_VERIFIED",delivery_allowed:false,video_allowed:false};
 if(rights.item_id!==order.item_id||rights.raw_sha256!==finish.raw_sha256||rights.status!=="VERIFIED_LICENSE"||
   !hex.test(rights.provenance_sha256||"")||rights.source_provider!=="bytedance/seedream-4"||
   rights.allowed_commercial_use!==true||rights.restrictions_checked!==true)
  return {status:"HUMAN_REQUIRED",code:"LEGAL_REQUIRED",reason:"COMMERCIAL_RIGHTS_UNVERIFIED",delivery_allowed:false,video_allowed:false};
 // Separate visual/editorial signature from model output. Needs an independent trusted private artifact.
 if(rights.independent_editorial_check!=="SIGNED_APPROVED"||!hex.test(rights.independent_editorial_evidence_sha256||""))
  return {status:"HUMAN_REQUIRED",code:"LOW_CONFIDENCE",reason:"INDEPENDENT_EDITORIAL_MISSING",delivery_allowed:false,video_allowed:false};
 return {status:"PRIVATE_LAB_CANDIDATE_READY_FOR_DELIVERY_GATE",code:null,delivery_allowed:false,
    video_allowed:false,requires_signed_destination_receipt:true,automatic_publication:false};
}
export function videoGate(history,accepted) {
 if(history?.image_gate_green!==true||!Array.isArray(accepted)||accepted.length!==11) return {status:"VIDEO_HOLD"};
 if(new Set(accepted.map(x=>x.item_id)).size!==11||
  accepted.some(x=>x.source_verified!==true||x.independent_editorial_signed!==true||x.rights_verified!==true||
    x.delivery_verified!==true||x.rollback_verified!==true||x.final_score<88))
  return {status:"VIDEO_HOLD"};
 return {status:"IMAGES_TRIBUNAL_READY_FOR_SEPARATE_VIDEO_LAB_REVIEW",video_autoproduction:false};
}
function cli(){
 const [arg,masterFile,historyFile,dest]=process.argv.slice(2);
 if(!arg||!masterFile||!historyFile||!dest)fail("CLI");
 const get=f=>JSON.parse(readFileSync(f,"utf8"));
 const out=planIntake(get(arg),get(masterFile),get(historyFile));
 mkdirSync(dirname(dest),{recursive:true});
 writeFileSync(dest,JSON.stringify(out,null,2)+"\n");
 console.log("UMS001_AUTONOMOUS_ORDER_INTAKE="+out.status);
 console.log("UMS001_GENERATION_OFF_WHILE_GATE_RED=true");
 console.log("UMS001_PUBLICATION=false; VIDEO=false");
}
if(process.argv[1]?.endsWith("ums001_image_autonomous_intake_lab_v1.mjs"))cli();
