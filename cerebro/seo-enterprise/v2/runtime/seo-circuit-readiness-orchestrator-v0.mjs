/**
 * SEO-001 PREPROD end-to-end READINESS check. Composes existing contracts.
 * This is not a writer, media producer or WordPress executor. Zero external writes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadVerifiedWorkItem,runEditorialJob001Worker,
 runEditorialTechnicalQA,runEditorialTribunalHold} from './seo-editorial-qa-job001-pipeline-v0.mjs';
import {auditOwnerEditorialCopy,buildSeoProducerImageOrder,
 validateSeoProducerOrder,preflightReturnedSeoMediaAsset} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoHumanVoiceAndRisk} from './seo-d31-human-voice-risk-gate-v0.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';
import {evaluateSeoCloudDraftReceipt} from './seo-d32-cloud-editorial-result-router-v0.mjs';
const IDS=Object.freeze(['SEO001-FENIX-B2C-EDITORIAL-001','SEO001-FENIX-B2B-EDITORIAL-002']);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const deny=s=>{throw Error('SEO_CIRCUIT_'+s)};
const gates=()=>({
 owner_exact_version_approved:false,independent_editorial_qa_verified:false,
 ymyl_facts_verified:false,media_generated:false,media_visual_qa_verified:false,
 media_global_inventory_verified:false,media_license_verified:false,
 wordpress_slug_collision_checked:false,wordpress_draft_role_iam_verified:false,
 wordpress_snapshot_verified:false,wordpress_restore_drill_passed:false,
 core_guard_writes_authorized:false,draft_write_authorized:false,
 publish_authorized:false
});
const slug=s=>{if(typeof s!=='string'||s.length>100||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s))deny('SLUG');return s};
function prepareHandoffs({item,html,content_sha256}){
 const image=buildSeoProducerImageOrder({
  company_id:'fenix',work_id:item.work_id,persona:item.draft.persona,
  source_content_sha256:content_sha256,...item.draft.image
 });
 const check=validateSeoProducerOrder({order:image});
 if(!check.metadata_complete||check.api_called!==false||image.actual_api_dispatch!==false)
  deny('UMS_SCOPE');
 return {
  image_order:image,
  wordpress_plan:{
   provider:'Cowboy_MCP_web',tool:'wp_create_post',
   arguments:{title:item.draft.title,content:html,post_type:'post',
    status:'draft',slug:slug(item.draft.target_slug),dry_run:true},
   source_content_sha256:content_sha256,
   prepared_only:true,execute_now:false,wordpress_writes:0,
   requires_live_slug_check:true,requires_backup_restore_proof:true,
   requires_core_guard_and_draft_only_iam:true,
   owner_approval_not_inferred:true,can_publish:false
  }
 };
}
export function inspectHistoricalSeoCircuit({root=process.cwd()}={}){
 const work=[];
 for(const work_id of IDS){
  const item=loadVerifiedWorkItem({root,work_id});
  const journal=fs.mkdtempSync(path.join(os.tmpdir(),'seo-circuit-job-'));
  let worker,qa,judge;
  try{
   worker=runEditorialJob001Worker({root,work_id,
    journal_path:path.join(journal,work_id+'.journal')});
   qa=runEditorialTechnicalQA({root,work_id,worker_receipt:worker});
   judge=runEditorialTribunalHold({root,work_id,
    worker_receipt:worker,qa_receipt:qa});
  }finally{fs.rmSync(journal,{recursive:true,force:true})}
  if(!worker.job_replayed_ok||judge.publish_authorized!==false||qa.content_depth_release_hold!==true)
   deny('HISTORICAL_EXPECTATION_DRIFT');
  const style=auditOwnerEditorialCopy({html:item.html,
   persona:item.draft.persona,content_type:item.draft.content_type});
  const voice=auditSeoHumanVoiceAndRisk({html:item.html,
   persona:item.draft.persona,content_type:item.draft.content_type});
  const depth=auditSeoContentDepth({html:item.html,
   persona:item.draft.persona,content_type:item.draft.content_type});
  const handoff=prepareHandoffs({item,html:item.html,content_sha256:item.digest});
  work.push({
   company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
   work_id,persona:item.draft.persona,content_type:item.draft.content_type,
   source_git_blob_sha:item.blob,source_sha256:item.digest,
   old_job001_status:worker.job_status,old_d15_precheck_passed:qa.code_checks_passed,
   old_tribunal_decision:judge.decision,
   total_words:depth.total_visible_words,
   body_words_excluding_faq:depth.main_content_words_excluding_faq,
   minimum_total_words:depth.required_total_words,
   minimum_body_words:depth.required_main_words,faq_count:depth.faq_count,
   style_issues:style.issues,voice_issues:voice.issues,depth_issues:depth.issues,
   depth_precheck_passed:depth.preliminary_depth_check_passed,
   circuit_state:'REQUIRE_NEW_V4_WITH_RESEARCH_AND_NEW_SHA',
   producer_brief_status:'PREPARED_NOT_DISPATCHED',
   image_order:handoff.image_order,wordpress_draft_plan:handoff.wordpress_plan,
   image_only_photo_adapter_bound:false,
   graphic_renderer_with_text_overlay_not_authorized_for_photos:true,
   wordpress_dry_run_invoked:false,
   stages:[
    {id:'SOURCE',state:'GIT_BLOB_VERIFIED'},
    {id:'JOB001',state:'REPLAY_VERIFIED'},
    {id:'D15_D31',state:'PRELIMINARY_TECHNICAL_QA'},
    {id:'DEPTH',state:depth.status},
    {id:'UMS001',state:'BRIEF_READY_IMAGE_NOT_GENERATED'},
    {id:'MEDIA_D26',state:'HOLD_PIXEL_RIGHTS_AND_INVENTORY'},
    {id:'WORDPRESS',state:'DRAFT_DRY_RUN_PLAN_ONLY'},
    {id:'OWNER_AND_TRIBUNAL',state:'HOLD'}
   ],...gates()
  });
 }
 return Object.freeze({
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',version:'0.1.0',
  status:'TWO_V3_BLOBS_VERIFIED_NEED_EXPANSION',
  work,faq_total:work.reduce((n,w)=>n+w.faq_count,0),
  model_calls:0,paid_api_calls:0,image_api_calls:0,
  wordpress_writes:0,autonomous_prod_ready:false,publish_authorized:false
 });
}
/**
 * New model output can be assessed, never released just because a test or a
 * model reports success. V4 is only real once registered with a new blob hash.
 */
export function inspectCandidateSeoHandoff({
 root=process.cwd(),work_id,receipt,html,asset=null,
 existing_assets=null,inventory_verified=false
}={}){
 if(!IDS.includes(work_id)||receipt?.work_id!==work_id||
  receipt.company_id!=='fenix'||receipt.engine_id!=='SEO-001'||
  receipt.environment!=='LAB'||receipt.can_publish!==false||
  receipt.wordpress_writes!==0||receipt.request_count!==1)deny('WRITER_RECEIPT_SCOPE');
 const item=loadVerifiedWorkItem({root,work_id});
 const d32=evaluateSeoCloudDraftReceipt({receipt,candidate_html:html,
  persona:item.draft.persona,content_type:item.draft.content_type});
 const passed=d32.code==='TECHNICAL_PRECHECK_PASS_RELEASE_HOLD';
 const handoff=passed?prepareHandoffs({item,html,content_sha256:d32.source_sha256}):null;
 let media=null;
 if(handoff&&asset)media=preflightReturnedSeoMediaAsset({
  order:handoff.image_order,asset,existing_assets,inventory_verified
 });
 return Object.freeze({
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  source:'UNREGISTERED_CLOUD_CANDIDATE',work_id,
  content_sha256:d32.source_sha256||null,
  d32,depth_passed:d32.depth_precheck_passed===true,
  image_order:handoff?.image_order||null,
  image_only_photo_adapter_bound:false,
  graphic_renderer_with_text_overlay_not_authorized_for_photos:true,
  wordpress_dry_run_plan:handoff?.wordpress_plan||null,
  media_preflight_hash_only:media,
  next_action:passed?'REGISTER_V4_AND_PERFORM_INDEPENDENT_QA_MEDIA_AND_BACKUP':
   'RESEARCH_REWRITE_AND_RETEST_NO_AUTOMATIC_MODEL_RETRY',
  content_version_registered:false,model_calls_next:0,paid_api_calls:0,
  image_calls:0,wordpress_writes:0,autonomous_prod_ready:false,
  ...gates()
 });
}
export function physicallyWriteCircuitReport({report,output_dir}={}){
 if(report?.company_id!=='fenix'||report.environment!=='PREPROD'||
  report.model_calls!==0||report.wordpress_writes!==0||report.publish_authorized!==false||
  report.work?.length!==2)deny('REPORT_SCOPE');
 if(typeof output_dir!=='string'||!path.isAbsolute(output_dir)||output_dir.includes('..'))
  deny('ABSOLUTE_TEMP_PATH_REQUIRED');
 const target=path.resolve(output_dir);
 const roots=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!roots.some(root=>target.startsWith(root+path.sep)))deny('OUTSIDE_TEMP');
 if(fs.existsSync(target))deny('OUTPUT_EXISTS');
 fs.mkdirSync(target,{recursive:true,mode:0o700});
 const pages=report.work.map((w,i)=>{
  const {image_order,wordpress_draft_plan,...data}=w;
  return {...data,image_order_file:'ums-order-'+(i+1)+'.json',
   wp_dryrun_file:'wp-dryrun-plan-'+(i+1)+'.json',
   image_brief_sha256:sha(JSON.stringify(image_order)),
   wordpress_plan_sha256:sha(JSON.stringify(wordpress_draft_plan))};
 });
 const files={'report.json':JSON.stringify({...report,work:pages},null,2)+'\n'};
 report.work.forEach((x,i)=>{
  files['ums-order-'+(i+1)+'.json']=JSON.stringify(x.image_order,null,2)+'\n';
  files['wp-dryrun-plan-'+(i+1)+'.json']=JSON.stringify(x.wordpress_draft_plan,null,2)+'\n';
 });
 files['manifest.json']=JSON.stringify({
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  file_hashes:Object.entries(files).map(([filename,content])=>({
   filename,sha256:sha(content)})),
  paid_calls:0,model_calls:0,image_api_calls:0,
  wordpress_writes:0,publish_authorized:false
 },null,2)+'\n';
 for(const [name,content] of Object.entries(files))
  fs.writeFileSync(path.join(target,name),content,{flag:'wx',mode:0o600});
 return {status:'CIRCUIT_REPORT_PHYSICALLY_WRITTEN_RELEASE_HOLD',
  files:Object.keys(files).sort(),items:report.work.length,
  paid_calls:0,wordpress_writes:0,autonomous_prod_ready:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)deny('OUTPUT_PATH_REQUIRED');
 const report=inspectHistoricalSeoCircuit();
 const written=physicallyWriteCircuitReport({
  report,output_dir:path.resolve(process.argv[2])
 });
 process.stdout.write(JSON.stringify({...written,
  words:report.work.map(x=>({
   work_id:x.work_id,total:x.total_words,body:x.body_words_excluding_faq,
   faq:x.faq_count,depth_ready:x.depth_precheck_passed}))
 })+'\n');
}
