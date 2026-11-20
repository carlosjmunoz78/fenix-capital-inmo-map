/** UMS-001 LAB - strictly read-only image batch preparation for Replicate.
 * No token use, network, image generation, publication, or payment in this module.
 * Separate physical execution MUST supply FINOPS reservation and durable private storage.
 */
import {createHash} from 'node:crypto';
const REQ=/^UMS001-[A-Z0-9-]{10,100}$/;
const CONCEPT=/^UMS-CRE-[0-9]{4}-[A-D]$/;
const IMAGE_MODEL='black-forest-labs/flux-1.1-pro-ultra';
const USD_PER_IMAGE=0.06;
const FIXED_IDS=['UMS-CRE-1111-A','UMS-CRE-1111-B','UMS-CRE-1111-C','UMS-CRE-1111-D'];
const fail=reason=>{throw Error('UMS001_REPLICATE_'+reason);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function planReplicateImageBatch(request){
  if(!request||typeof request!=='object'||Array.isArray(request))fail('INVALID_REQUEST');
  if(request.company_id!=='fenix'||request.engine_id!=='UMS-001'||request.environment!=='LAB')fail('SCOPE_DENIED');
  if(!REQ.test(request.request_id||'')||request.publish!==false||request.run_mode!=='DRY_RUN')fail('REQUEST_OR_MODE_DENIED');
  if(request.max_additional_cost_eur!==0)fail('ADDITIONAL_COST_NOT_ZERO');
  if(request.model_id!==IMAGE_MODEL)fail('UNSUPPORTED_MODEL');
  if(!Array.isArray(request.concepts)||request.concepts.length!==4)fail('FOUR_DISTINCT_IMAGES_REQUIRED');
  const used=new Set(), subjects=new Set(), settings=new Set(), hooks=new Set(), prompts=new Set();
  const outputs=request.concepts.map((c,i)=>{
    if(!c||!CONCEPT.test(c.concept_id||'')||c.concept_id!==FIXED_IDS[i])fail('CONCEPT_ID_DENIED');
    if(!/^[a-z0-9_-]{5,60}$/.test(c.subject_key||'')||!/^[a-z0-9_-]{5,60}$/.test(c.setting_key||''))fail('KEY_INVALID');
    if(typeof c.hook!=='string'||c.hook.length<12||c.hook.length>90)fail('HOOK_INVALID');
    if(typeof c.prompt!=='string'||c.prompt.length<250||c.prompt.length>5000)fail('PROMPT_INVALID');
    if(!c.prompt.toLowerCase().includes('photograph')||!c.prompt.toLowerCase().includes('surreal'))fail('PROMPT_MUST_REQUIRE_PHOTOGRAPHIC_HUMAN_AND_SURREAL_ART');
    if(c.aspect_ratio!=='4:5'||c.image_quality!=='PREMIUM'||c.publication_approved!==false)fail('IMAGE_SETTINGS_DENIED');
    if(used.has(c.concept_id)||subjects.has(c.subject_key)||settings.has(c.setting_key)||hooks.has(norm(c.hook))||prompts.has(sha(c.prompt)))fail('DUPLICATE_CONCEPT_OR_CHARACTER_OR_SCENE');
    used.add(c.concept_id);subjects.add(c.subject_key);settings.add(c.setting_key);hooks.add(norm(c.hook));prompts.add(sha(c.prompt));
    return Object.freeze({company_id:'fenix',engine_id:'UMS-001',environment:'LAB',request_id:request.request_id,concept_id:c.concept_id,
      model_id:IMAGE_MODEL,model_input:{prompt:c.prompt,aspect_ratio:'4:5',output_format:'jpg',raw:true,safety_tolerance:2},
      prompt_sha256:sha(c.prompt),estimated_cost_usd:USD_PER_IMAGE,publication_approved:false,
      status:'PLANNED_NO_API_CALL',qa_human_realism:'PENDING',qa_creative_diversity:'PENDING',durable_asset_id:null});
  });
  const total=Number((outputs.length*USD_PER_IMAGE).toFixed(2));
  if(total!==0.24)fail('COST_PLAN_MISMATCH');
  return Object.freeze({schema_version:1,request_id:request.request_id,company_id:'fenix',engine_id:'UMS-001',
    environment:'LAB',provider:'replicate',run_mode:'DRY_RUN',model_id:IMAGE_MODEL,concept_count:4,
    projected_provider_cost_usd:total,external_api_calls:0,payment_authorized:false,
    production_approved:false,storage_status:'NOT_GENERATED',batch_status:'PLANNED_PENDING_BILLING_AND_STORAGE_GATES',
    outputs});
}
export function validatePaidExecutionGates(plan, approvals={}){
  if(!plan||plan.run_mode!=='DRY_RUN'||plan.batch_status!=='PLANNED_PENDING_BILLING_AND_STORAGE_GATES')fail('PLAN_REQUIRED');
  // A boolean in a user-controlled request is not verifiable financial approval.
  // These opaque objects must come from *separate trusted services*, never the request JSON.
  if(approvals.billing?.verified_by_trusted_operator!==true||approvals.billing?.auto_reload_disabled!==true||
     approvals.billing?.prepaid_credit_only!==true||!(approvals.billing?.evidence_id?.length>=12))fail('BILLING_GATE_UNVERIFIED');
  if(approvals.finops?.atomic_reservation_confirmed!==true||approvals.finops?.reserved_usd!==plan.projected_provider_cost_usd||
     !approvals.finops?.reservation_id)fail('FINOPS_GATE_UNVERIFIED');
  if(approvals.storage?.private_durable_write_verified!==true||!approvals.storage?.destination_id)fail('STORAGE_GATE_UNVERIFIED');
  if(approvals.runtime?.isolated_lab_worker!==true||approvals.runtime?.rollback_tested!==true)fail('RUNTIME_GATE_UNVERIFIED');
  return {status:'GATES_VERIFIED_BY_TRUSTED_SERVICES',execute_allowed:true,publication_approved:false};
}
