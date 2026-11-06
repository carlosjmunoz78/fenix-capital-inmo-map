/**
 * SEO-001 physical-evidence tribunal V0. Follows existing components.
 * Any current technical green is RELEASE_HOLD until independent media/YMYL
 * and REAL WordPress backup/restore, IAM and owner digest approvals exist.
 * No external provider/model/WordPress/UMS calls. Read-only local artifacts.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditOwnerEditorialCopy} from './seo-owner-editorial-visual-gate-v2.mjs';
import {auditSeoContentDepth} from './seo-owner-content-depth-gate-v1.mjs';
import {auditSeoHumanVoiceAndRisk} from './seo-d31-human-voice-risk-gate-v0.mjs';
import {validateSeoWordpressFixtureRestoreReceipt} from './seo-wordpress-isolated-restore-receipt-v0.mjs';

const policy='cerebro/seo-enterprise/v2/registry/seo001-v4-1-source-corrected-candidates-review-only-2026-11-06.json';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const no=s=>{throw Error('SEO_RELEASE_TRIBUNAL_'+s)};
const files=Object.freeze([
 ['SEO001-FENIX-B2C-EDITORIAL-001','compradores-v4-1-review-only.html','PARTICULARES'],
 ['SEO001-FENIX-B2B-EDITORIAL-002','inmobiliarias-v4-1-review-only.html','INMOBILIARIAS']
]);
export function assessSeoPhysicalReleaseEvidence({
 root=process.cwd(),article_dir,wordpress_dir,media_dir
}={}){
 for(const [name,p] of Object.entries({article_dir,wordpress_dir,media_dir})){
  if(typeof p!=='string'||!path.isAbsolute(p)||p.includes('..')||!fs.existsSync(p))
   no('EVIDENCE_DIRECTORY_'+name);
 }
 const registry=JSON.parse(fs.readFileSync(path.join(root,policy),'utf8'));
 if(registry.company_id!=='fenix'||registry.engine_id!=='SEO-001'||
  registry.environment!=='PREPROD'||registry.work?.length!==2||
  registry.release_gates?.publish_authorized!==false||
  registry.release_gates?.independent_legal_ymyl_review!==false||
  registry.release_gates?.photo_delivery_and_rights!==false)
  no('SOURCE_REGISTRY_SCOPE');
 const articles=files.map(([id,filename,persona])=>{
  const html=fs.readFileSync(path.join(article_dir,filename),'utf8');
  const entry=registry.work.find(x=>x.work_id===id);
  if(!entry||entry.persona!==persona||hash(html)!==entry.version_sha256)
   no('ARTICLE_SOURCE_SHA_MISMATCH');
  if(/<(?:script|iframe|form|object|embed|svg|style)\b|\s(?:onclick|onload|onerror)\s*=/i.test(html))
   no('ACTIVE_CONTENT_CLAIM');
  const style=auditOwnerEditorialCopy({html,persona,content_type:'ARTICLE'});
  const voice=auditSeoHumanVoiceAndRisk({html,persona,content_type:'ARTICLE'});
  const depth=auditSeoContentDepth({html,persona,content_type:'ARTICLE'});
  const issues=[...style.issues.map(x=>'STYLE_'+x),
   ...voice.issues.map(x=>'VOICE_'+x),...depth.issues.map(x=>'DEPTH_'+x)];
  return Object.freeze({
   work_id:id,persona,sha256:entry.version_sha256,word_count:depth.total_visible_words,
   body_words_excluding_faq:depth.main_content_words_excluding_faq,
   faq_count:depth.faq_count,
   content_machine_precheck_pass:issues.length===0,
   issues,source_factcheck_professional_approval:false,
   buyer_persona_semantic_quality_independently_verified:false,
   owner_exact_digest_approved:false,publication_authorized:false
  });
 });
 const wpReceipt=JSON.parse(fs.readFileSync(path.join(wordpress_dir,'receipt.json'),'utf8'));
 const wpBackup=fs.readFileSync(path.join(wordpress_dir,'fixture-backup.sql'));
 const wp=validateSeoWordpressFixtureRestoreReceipt({receipt:wpReceipt,backup_bytes:wpBackup});
 const media=JSON.parse(fs.readFileSync(path.join(media_dir,'receipt.json'),'utf8'));
 if(media.company_id!=='fenix'||media.engine_id!=='UMS-001'||
  media.environment!=='PREPROD'||
  media.status!=='PHYSICAL_WEBP_PIXEL_PREFLIGHT_PASS_PUBLICATION_HOLD'||
  media.origin!=='EXISTING_FENIX_WORDPRESS_MEDIA_DERIVATIVE'||
  media.width!==1200||media.height!==630||
  !/^[a-f0-9]{64}$/.test(media.image_sha256||'')||
  !/^[a-f0-9]{16}$/.test(media.perceptual_hash||'')||
  media.original_image_generated_by_ums_verified!==false||
  media.global_inventory_complete!==false||
  media.independent_visual_no_text_logo_watermark_verified!==false||
  media.producer_receipt_and_license_verified!==false||
  media.publish_authorized!==false||media.media_upload_authorized!==false||
  media.wordpress_writes!==0)no('IMAGE_SOURCE_AND_PERMISSIONS');
 return Object.freeze({
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',version:'0.1.0',
  status:'PHYSICAL_EVIDENCE_COMPLETE_FOR_TESTS_RELEASE_HOLD',
  article_count:articles.length,articles,
  core_article_prechecks_pass:articles.every(x=>x.content_machine_precheck_pass),
  model_cloud_real_generation_historical:true,
  source_semantics_independent_qa_pass:false,
  source_ymyl_legal_qa_pass:false,
  media:{physical_webp_test_pass:media.physical_image_verified===true,
   tested_source_kind:media.origin,original_ums_photo_delivered:false,
   license_rights_verified:false,global_duplicate_inventory_verified:false,
   independent_pixel_qa_verified:false,media_upload_authorized:false},
  wordpress:{isolated_synthetic_mariadb_restore_pass:wp.synthetic_fixture_restore_verified,
   restored_real_production_snapshot:false,full_wordpress_parity_verified:false,
   role_limited_draft_write_tested:false,real_backup_restoration_tested:false,
   live_slug_collision_search_completed:false,core_guard_writes_enabled:false,
   wordpress_writes:0},
  pending_release_gates:[
   'INDEPENDENT_SEO_AND_YMYL_REVIEW_WITH_SOURCE_CITATIONS',
   'UMS_NEW_ORIGINAL_IMAGES_RIGHTS_INVENTORY_VISUAL_QA',
   'REAL_WORDPRESS_SNAPSHOT_RESTORED_IN_ISOLATED_ENVIRONMENT',
   'WORDPRESS_DRAFT_ONLY_IAM_AND_IDEMPOTENCY',
   'OWNER_EXACT_V4_1_CONTENT_DIGEST_APPROVAL',
   'GRADUAL_PROMOTION_AND_ROLLBACK_TRIBUNAL'
  ],
  paid_provider_calls:0,new_api_subscriptions:0,
  original_image_api_calls:0,wordpress_writes:0,
  owner_approved:false,publish_authorized:false,autonomous_production_ready:false
 });
}
export function persistSeoPhysicalReleaseTribunal({report,output_dir}={}){
 if(report?.company_id!=='fenix'||report.engine_id!=='SEO-001'||
  report.status!=='PHYSICAL_EVIDENCE_COMPLETE_FOR_TESTS_RELEASE_HOLD'||
  report.publish_authorized!==false||report.wordpress_writes!==0||
  report.autonomous_production_ready!==false||report.articles?.length!==2)
  no('REPORT_PERMISSIONS');
 if(typeof output_dir!=='string'||!path.isAbsolute(output_dir)||output_dir.includes('..'))
  no('OUTPUT_PATH');
 const dst=path.resolve(output_dir);
 const safe=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!safe.some(x=>dst.startsWith(x+path.sep))||fs.existsSync(dst))
  no('OUTPUT_NOT_TEMP_OR_EXISTS');
 fs.mkdirSync(dst,{recursive:true,mode:0o700});
 const content=JSON.stringify(report,null,2)+'\n';
 fs.writeFileSync(path.join(dst,'physical-release-tribunal.json'),content,{flag:'wx',mode:0o600});
 return {state:report.status,report_sha256:hash(content),articles:report.article_count,
  true_autonomous_ready:false,media_produced:false,wp_prod_restore_performed:false,
  wordpress_writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [, ,articles,wp,media,output]=process.argv;
 if(!articles||!wp||!media||!output)no('CLI_ARGS');
 const report=assessSeoPhysicalReleaseEvidence({
  article_dir:path.resolve(articles),wordpress_dir:path.resolve(wp),media_dir:path.resolve(media)
 });
 const receipt=persistSeoPhysicalReleaseTribunal({report,output_dir:path.resolve(output)});
 process.stdout.write(JSON.stringify(receipt)+'\n');
}
