/**
 * SEO-001 WordPress staging intent / draft-only packaging.
 * Does NOT execute wp_create_post and never promotes unpublished V4.1.
 * Exact content hash + complete, historical post/page inventory + read-only
 * credentialless WordPress reference. Other CPT/just-in-time checks required.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const deny=s=>{throw Error('SEO_V41_WP_DRAFT_'+s)};
const REG='cerebro/seo-enterprise/v2/registry/';
const policyFile=REG+'seo001-v4-1-source-corrected-candidates-review-only-2026-11-06.json';
const inventoryFile=REG+'seo001-v4-1-wordpress-post-page-slug-inventory-readonly-2026-11-06.json';
const oldDrafts=REG+'seo-owner-copy-revision-b2b-b2c-v3-faq-2026-11-06.json';
const names=Object.freeze({
 'SEO001-FENIX-B2C-EDITORIAL-001':'compradores-v4-1-review-only.html',
 'SEO001-FENIX-B2B-EDITORIAL-002':'inmobiliarias-v4-1-review-only.html'
});
const read=(root,p)=>JSON.parse(fs.readFileSync(path.resolve(root,p),'utf8'));
const unsafe=s=>/<(?:script|style|iframe|form|svg|object|embed|base|meta|link)\b|<\/?(?:input|button)\b|\son[a-z]+\s*=|javascript:|data:/i.test(s);
export function prepareSeoV41WordpressDraftOnlyPlans({
 root=process.cwd(),article_dir,inventory_override=null
}={}){
 if(typeof article_dir!=='string'||!path.isAbsolute(article_dir)||article_dir.includes('..'))
  deny('ABSOLUTE_ARTICLE_DIR');
 const p=read(root,policyFile),i=inventory_override??read(root,inventoryFile),old=read(root,oldDrafts);
 if(p.company_id!=='fenix'||p.engine_id!=='SEO-001'||p.environment!=='PREPROD'||
  p.release_gates?.publish_authorized!==false||
  p.release_gates?.owner_exact_sha_approved!==false||
  !Array.isArray(p.work)||p.work.length!==2||
  i.company_id!=='fenix'||i.engine_id!=='SEO-001'||i.environment!=='PREPROD'||
  i.source_readonly!==true||i.inventory_complete_for_post_and_page_at_capture!==true||
  i.inventory_complete_for_other_custom_post_types!==false||
  i.captured_posts!==45||i.captured_pages!==180||i.captured_rows!==225||
  !Array.isArray(i.rows)||i.rows.length!==225||!Array.isArray(old.new_drafts))
  deny('GOVERNANCE_OR_INVENTORY');
 if(new Set(i.rows.map(x=>x.id+':'+x.post_type)).size!==225)deny('DUPLICATE_INVENTORY');
 if(i.rows.filter(x=>x.post_type==='post').length!==45||
    i.rows.filter(x=>x.post_type==='page').length!==180)
  deny('INVENTORY_COUNT_MISMATCH');
 const plans=p.work.map(w=>{
  const filename=names[w.work_id],legacy=old.new_drafts.find(x=>x.id===w.work_id);
  if(!filename||!legacy||legacy.persona!==w.persona||w.content_type!=='ARTICLE'||
   !/^[a-f0-9]{64}$/.test(w.version_sha256))deny('SCOPE');
  const html=fs.readFileSync(path.join(article_dir,filename),'utf8');
  if(sha(html)!==w.version_sha256||unsafe(html))deny('CONTENT_SHA_OR_ACTIVE_TAGS');
  for(const m of html.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)){
   if(!/^https:\/\/fenixcapital\.es\/[a-z0-9/-]+\/$/.test(m[2]))
    deny('UNSAFE_EXTERNAL_OR_RELATIVE_LINK');
  }
  if(/\btarget\s*=\s*(["'])_blank\1/i.test(html))deny('UNEXPECTED_TARGET');
  const slug=legacy.target_slug;
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))deny('SLUG');
  if(i.rows.some(x=>x.slug===slug))deny('LIVE_INVENTORY_SLUG_CONFLICT');
  const match=i.proposed_slugs.find(x=>x.slug===slug&&x.work_id===w.work_id);
  if(!match||match.same_slug_in_post_or_page!==false||
   match.same_slug_global_custom_post_type_unverified!==true)
   deny('SLUG_INVENTORY_EVIDENCE');
  const request={
   tool:'wp_create_post',provider:'Cowboy_MCP_web',arguments:{
    title:legacy.title,slug,post_type:'post',status:'draft',content:html,dry_run:true
   },source_sha256:w.version_sha256,
   draft_only:true,run_now:false,
   human_operator_required_for_live_writer:false,
   live_write_approval_not_provided:true,
   requires_just_in_time_all_post_type_slug_recheck:true,
   requires_full_wp_snapshot_isolated_restore:true,
   requires_independent_editorial_legal_approval:true,
   requires_owner_exact_digest_approval:true,
   requires_role_scoped_draft_credentials:true,
   requires_link_canonical_and_yoast_metadata_qa:true,
   image_original_rights_qa_missing:true,
   wordpress_dry_run_not_executed_by_this_module:true,
   authorize_draft_write:false,authorize_publication:false
  };
  return Object.freeze({
   work_id:w.work_id,persona:w.persona,source_sha256:w.version_sha256,
   slug,competing_existing_pages_checked:225,
   discovered_exact_slug_conflicts_post_page:0,
   other_post_types_and_race_window_still_unknown:true,
   topical_canibalization_GSC_review_pending:true,
   status:'DRAFT_ONLY_DRY_RUN_PLAN_PREPARED_RELEASE_HOLD',
   dry_run_request:request,wordpress_write_authorized:false,
   wordpress_publish_authorized:false
  });
 });
 return Object.freeze({
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',version:'V4.1',
  status:'TWO_WP_DRAFT_ONLY_PLANS_VALIDATED_NOT_EXECUTED',
  plans,checked_site_post_page_records:225,
  latest_inventory_recheck_required:true,
  real_wordpress_restore_gate_passed:false,
  real_image_delivered:false,
  independent_editorial_approval:false,
  owner_exact_sha_approval:false,
  wp_create_post_real_calls:0,
  wp_create_post_dry_run_calls:0,
  wordpress_writes:0,publish_authorized:false
 });
}
export function writeSeoV41DraftOnlyPlans({report,output_dir}={}){
 if(report?.company_id!=='fenix'||report?.engine_id!=='SEO-001'||
  report?.status!=='TWO_WP_DRAFT_ONLY_PLANS_VALIDATED_NOT_EXECUTED'||
  report?.plans?.length!==2||report.wordpress_writes!==0||
  report.publish_authorized!==false||typeof output_dir!=='string'||
  !path.isAbsolute(output_dir)||output_dir.includes('..'))deny('OUTPUT');
 const dir=path.resolve(output_dir),tmp=[process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!tmp.some(x=>dir.startsWith(x+path.sep))||fs.existsSync(dir))deny('NOT_ISOLATED_RUNNER');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const names=['b2c','b2b'];
 const manifest={...report,plans:report.plans.map((p,index)=>({
  work_id:p.work_id,source_sha256:p.source_sha256,
  slug:p.slug,status:p.status,
  plan_filename:names[index]+'-wp-dryrun-plan.json',
  wordpress_write_authorized:false,wordpress_publish_authorized:false
 }))};
 for(let k=0;k<2;k++){
  fs.writeFileSync(path.join(dir,names[k]+'-wp-dryrun-plan.json'),
   JSON.stringify(report.plans[k].dry_run_request,null,2)+'\n',{flag:'wx',mode:0o600});
 }
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:report.status,plan_count:2,wordpress_writes:0,
  real_draft_created:false,needs_real_wp_snapshot:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [,,article_dir,output_dir]=process.argv;
 if(!article_dir||!output_dir)deny('CLI_ARGS');
 const report=prepareSeoV41WordpressDraftOnlyPlans({article_dir:path.resolve(article_dir)});
 process.stdout.write(JSON.stringify(writeSeoV41DraftOnlyPlans({
  report,output_dir:path.resolve(output_dir)}))+'\n');
}
