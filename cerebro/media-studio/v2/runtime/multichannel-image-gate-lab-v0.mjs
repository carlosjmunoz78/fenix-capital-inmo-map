import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const CANON={
'IG-FEED-01':['INSTAGRAM','FEED','4:5',1080,1350,'4:5'],
'IG-CAROUSEL-01':['INSTAGRAM','CAROUSEL','4:5',1080,1350,'4:5'],
'IG-CAROUSEL-02':['INSTAGRAM','CAROUSEL','4:5',1080,1350,'4:5'],
'IG-CAROUSEL-03':['INSTAGRAM','CAROUSEL','4:5',1080,1350,'4:5'],
'IG-CAROUSEL-04':['INSTAGRAM','CAROUSEL','4:5',1080,1350,'4:5'],
'IG-CAROUSEL-05':['INSTAGRAM','CAROUSEL','4:5',1080,1350,'4:5'],
'IG-STORY-01':['INSTAGRAM','STORY','9:16',1080,1920,'9:16'],
'FB-FEED-01':['FACEBOOK','FEED','1:1',1080,1080,'1:1'],
'LI-FEED-01':['LINKEDIN','FEED','1.91:1',1200,628,'16:9'],
'SEO-HERO-01':['SEO','HERO','16:9',1600,900,'16:9'],
'SEO-BODY-01':['SEO','BODY','4:3',1200,900,'4:3']
};
const fail=x=>{throw Error('UMS001_MULTICHANNEL_'+x);};
export function planMultichannel(order){
 if(!order||typeof order!=='object'||Array.isArray(order))fail('BAD_ORDER');
 if(order.company_id!=='fenix'||order.engine_id!=='UMS-001'||order.environment!=='LAB')fail('SCOPE');
 if(order.request_id!=='UMS001-MULTICHANNEL-IMAGE-11-20261111-V1'||order.status!=='REGISTERED_NOT_YET_EXECUTED')fail('IDENTITY_OR_STATUS');
 if(order.owner!=='UMS001_AUDIOVISUAL_PRODUCER'||order.creative_teacher!=='DEEPSEEK_INTERNAL_TEMPORARY')fail('PRODUCER_OWNERSHIP');
 if(order.style_policy_ref!=='producer_lab/PRIMARY_ART_DIRECTION_IMAGES_VIDEOS_20261111.v1.json')fail('STYLE_CANON');
 if(order.official_brand_registry_ref!=='producer_lab/brand_assets/fenix/official_20251020/BRAND_CANONICAL_REGISTRY_V1.json')fail('BRAND_CANON');
 const e=order.execution||{},a=order.acceptance||{},r=order.rules||{};
 if(e.paid_execution_enabled!==false||e.auto_publish_enabled!==false||e.production_enabled!==false||
 e.auto_reload_enabled!==false||e.prepaid_only!==true||e.max_additional_cost_eur!==0||
 e.connected_studio_gateway_verified!==false)fail('EXECUTION_MUST_STAY_OFF');
 if(e.maximum_attempts_per_piece!==2||e.max_image_predictions!==22||
 e.model_image_unit_price_usd_estimate!==0.06||e.max_image_budget_usd!==1.32||
 e.max_deepseek_calls!==44||e.max_deepseek_budget_usd!==0.55||e.max_total_budget_usd!==1.87||
 e.requires_trusted_finops_reservation!==true||e.requires_live_balance_verification!==true||
 e.requires_private_sha256_storage!==true||e.uncertain_paid_post_no_retry!==true)fail('FINOPS');
 if(JSON.stringify(e.canary_ids)!==JSON.stringify(['IG-FEED-01','SEO-HERO-01'])||e.cascade_only_after_independent_qa!==true)fail('CANARY');
 if(a.expected_pieces!==11||a.minimum_score_each!==88||a.green_only_with_real_images!==true||
 a.allow_critical_violations!==0||a.gate!=='IMAGE_MULTIFORMAT_VALIDATION')fail('ACCEPTANCE');
 if(!r.no_publication||!r.no_generated_logos_or_text||!r.seo_no_logo_text_or_cta_in_pixels||
 !r.original_brand_asset_postprocess_only||!r.independent_visual_qa||!r.learning_capture_required)fail('SAFETY');
 if(!Array.isArray(order.pieces)||order.pieces.length!==11)fail('PIECE_COUNT');
 const expected=Object.keys(CANON),seen=new Set(),scenes=new Set(),outputs=[];
 for(const [index,p] of order.pieces.entries()){
  if(!p||p.item_id!==expected[index]||seen.has(p.item_id))fail('DUPLICATE_OR_ORDER');
  const truth=CANON[p.item_id];
  if(JSON.stringify([p.channel,p.placement,p.aspect_ratio,p.width_px,p.height_px,p.provider_aspect_ratio])!==JSON.stringify(truth))fail('WRONG_CHANNEL_DIMENSIONS');
  if(typeof p.scene!=='string'||p.scene.length<70||p.scene.length>1500||scenes.has(p.scene.toLowerCase()))fail('SCENE_DUPLICATE_OR_MISSING');
  if(typeof p.consumer_engine_id!=='string'||p.consumer_engine_id.length<5||p.publication_approved!==false)fail('UNSAFE_CONSUMER');
  if(p.brand_policy!=='OFFICIAL_LOGO_POSTPROCESS_ONLY'||p.required_quality_score!==88)fail('BRAND_POLICY');
  if(p.channel==='SEO'&&p.hook!=='')fail('SEO_TEXT');
  if(p.channel!=='SEO'&&(!p.hook||p.hook.length>42||p.hook.split(/\s+/).length>6))fail('SOCIAL_HOOK');
  if(/[<>]/.test(p.scene)||/https?:\/\/|api[_ -]?key|password|bearer/i.test(p.scene))fail('SENSITIVE_SCENE');
  scenes.add(p.scene.toLowerCase());seen.add(p.item_id);
  outputs.push({request_id:order.request_id,item_id:p.item_id,company_id:order.company_id,
   engine_id:'UMS-001',source_engine:p.consumer_engine_id,channel:p.channel,placement:p.placement,
   target_pixels:[p.width_px,p.height_px],target_aspect:p.aspect_ratio,
   image_provider_aspect:p.provider_aspect_ratio,original_creative_direction:p.scene,
   logo_and_hook_postprocess_only:p.channel!=='SEO',requires_independent_qa:true,
   status:'PENDING_PRODUCER_EXECUTION_NO_PAID_API_CALL',publish_enabled:false,
   output_sha256:null,output_asset_ref:null,visual_score:null,
   format_adapter:p.item_id==='LI-FEED-01'?'DEDICATED_WIDE_GENERATION_THEN_VERIFIED_CROP':'DEDICATED_ASPECT_GENERATION'});
 }
 return {status:'PRODUCER_ORDER_VALIDATED_NOT_EXECUTED',request_id:order.request_id,
  company_id:order.company_id,engine_id:'UMS-001',environment:'LAB',owner:'UMS-001',
  pieces:outputs,canary_ids:e.canary_ids,artifacts_generated:0,
  real_e2e_accepted:false,paid_inference_allowed:false,publish_enabled:false,
  estimated_max_image_usd:e.max_image_budget_usd,estimated_max_deepseek_usd:e.max_deepseek_budget_usd};
}
export function summarizeRealAcceptance(plan, receipts){
 if(!plan||plan.status!=='PRODUCER_ORDER_VALIDATED_NOT_EXECUTED')fail('INVALID_PLAN');
 if(!Array.isArray(receipts)||receipts.length!==plan.pieces.length)return {status:'IMAGE_MULTIFORMAT_VALIDATION_NOT_READY',accepted:0};
 const byId=new Map(receipts.map(x=>[x?.item_id,x]));
 if(byId.size!==plan.pieces.length)return {status:'IMAGE_MULTIFORMAT_VALIDATION_NOT_READY',accepted:0};
 let accepted=0;
 for(const p of plan.pieces){
  const r=byId.get(p.item_id);
  if(!r||r.width_px!==p.target_pixels[0]||r.height_px!==p.target_pixels[1]||
   !/^[a-f0-9]{64}$/.test(r.sha256||'')||!r.private_artifact_verified||
   !r.provenance_verified||!r.rights_verified||!r.brand_verified||
   !r.accessibility_verified||!r.legal_claims_verified||!r.independent_visual_qa_verified||
   !r.pixels_inspected||!r.originality_verified||!r.signed_delivery_verified||
   r.critical_violations!==0||!Number.isInteger(r.score)||r.score<88)return {status:'IMAGE_MULTIFORMAT_VALIDATION_NOT_READY',accepted};
  accepted++;
 }
 return {status:'RECEIPTS_PASS_REQUIRES_PHYSICAL_TRIBUNAL',accepted,
   publish_enabled:false,production_enabled:false,video_promotion_allowed:false};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const path=process.argv[2];
 if(!path)fail('REQUEST_FILE_REQUIRED');
 const plan=planMultichannel(JSON.parse(readFileSync(path,'utf8')));
 process.stdout.write(JSON.stringify(plan,null,2)+'\n');
}
