/** JOB-001 durable LAB review queue for verified official WordPress draft; no PROD writes. */
import {createHash} from 'node:crypto';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
const OFFICIAL='https://fenixcapital.es';
const id=n=>Number.isSafeInteger(n)&&n>0;
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
const reviewDigest=(content,seo)=>hash(JSON.stringify([content,seo?.seo_title??null,seo?.meta_description??null,seo?.focus_keyphrase??null]));
const denial=reason=>({status:'BLOCKED',reason,can_publish:false,write_executed:false});
export function buildSeoDraftReviewPacket({post,yoast,company_id='fenix'}={}){
 if(company_id!=='fenix')throw Error('DRAFT_WRONG_COMPANY');
 if(!post||!id(post.ID)||post.type!=='post'||post.status!=='draft')throw Error('DRAFT_NOT_WORDPRESS_DRAFT');
 if(typeof post.content!=='string'||post.content.length<200||
    typeof post.title!=='string'||post.title.length<10)throw Error('DRAFT_CONTENT_INVALID');
 if(typeof post.slug!=='string'||!/^[a-z0-9-]{5,150}$/.test(post.slug))throw Error('DRAFT_SLUG_INVALID');
 if(typeof post.permalink!=='string'||!post.permalink.startsWith(OFFICIAL+'/'))
  throw Error('DRAFT_OFFICIAL_URL_REQUIRED');
 if(!yoast||Number(yoast.post_id)!==post.ID||yoast.post_status!=='draft')
  throw Error('DRAFT_YOAST_RECORD_MISMATCH');
 const hrefs=[...post.content.matchAll(/href="(https:\/\/[^"]+)"/g)].map(x=>x[1]);
 const internal=hrefs.filter(x=>{try{return new URL(x).hostname==='fenixcapital.es'}catch{return false}});
 if(hrefs.length!==internal.length)throw Error('DRAFT_EXTERNAL_LINKS_REQUIRE_REVIEW');
 const seoReady=typeof yoast.seo_title==='string'&&yoast.seo_title.length>10&&
  typeof yoast.meta_description==='string'&&yoast.meta_description.length>60&&
  typeof yoast.focus_keyphrase==='string'&&yoast.focus_keyphrase.length>5;
 return {schema_version:'0.1.0',company_id,engine_id:'SEO-001',
  environment:'PREPROD',version:'0.1.0',site_origin:OFFICIAL,
  post_id:post.ID,post_type:'post',post_status:'draft',title:post.title,slug:post.slug,
  admin_edit_url:OFFICIAL+'/wp-admin/post.php?post='+post.ID+'&action=edit',
  content_sha256:hash(post.content),review_revision_sha256:reviewDigest(post.content,yoast),
  content_length:post.content.length,
  modified_at:post.modified??null,section_count_h2:(post.content.match(/<h2\b/gi)||[]).length,
  internal_links_count:internal.length,internal_links_live_http_verified:false,
  seo_metadata_present:seoReady,yoast_seo_title:yoast.seo_title??null,
  yoast_meta_description:yoast.meta_description??null,
  actual_visual_review_verified:false,independent_editorial_qa_verified:false,
  original_article_approved_by_owner:false,owner_approval_gateway_verified:false,
  owner_approval_count_for_autonomy:0,post_was_published:false,
  state:'PENDING_EDITORIAL_VISUAL_AND_OWNER_APPROVAL',
  production_publish_authorized:false,publish_permission_issued:false,
  no_raw_html_logged:true,no_secret_logged:true};
}
export function queueSeoDraftReviewLab({file_path,packet,now_ms=Date.now()}={}){
 if(!packet||packet.environment!=='PREPROD'||packet.company_id!=='fenix'||
   !id(packet.post_id)||packet.post_status!=='draft'||packet.site_origin!==OFFICIAL||
   !/^[0-9a-f]{64}$/.test(packet.content_sha256)||
   (packet.review_revision_sha256!==undefined&&!/^[0-9a-f]{64}$/.test(packet.review_revision_sha256))||
   !packet.seo_metadata_present)
  return denial('REVIEW_PACKET_VALIDATION_FAILED');
 if(packet.original_article_approved_by_owner!==false||
   packet.owner_approval_gateway_verified!==false||
   packet.production_publish_authorized!==false)
  return denial('UNTRUSTED_APPROVAL_FLAG');
 if(!file_path||!Number.isSafeInteger(now_ms)||now_ms<=0)throw Error('REVIEW_JOB_ARGS');
 const runtime=new DurableJobRuntimeV1({file_path});
 const versionDigest=packet.review_revision_sha256??packet.content_sha256;
 const context={company_id:packet.company_id,engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'};
 const job=runtime.enqueue({name:'SEO_DRAFT_REVIEW_ONLY_V0',context,
  idempotency_key:'seo-review-'+packet.post_id+'-'+versionDigest,
  now_ms,priority:90,max_attempts:1,timeout_ms:12000,
  payload:{post_id:packet.post_id,slug:packet.slug,content_sha256:packet.content_sha256,
   review_revision_sha256:versionDigest,
   seo_metadata_present:packet.seo_metadata_present,
   visual_review_required:true,independent_editorial_qa_required:true,
   owner_verified_approval_required:true,owner_approval_count_for_autonomy:0,
   desired_wordpress_status:'draft',permission_to_publish:false,
   actual_wordpress_write:false,source:'LAB_REVIEW_EVIDENCE'}});
 return {status:'QUEUED_FOR_REVIEW_LAB_NOT_PUBLISHING',
  job_id:job.job.job_id,newly_queued:job.accepted,duplicate:job.duplicate,
  post_id:packet.post_id,source_status:'draft',journal_operation_count:runtime.operation_count,
  owner_approval_required:true,approved_publications_counted:0,
  actual_wordpress_write:false,actual_publication:false,prod_worker_enabled:false,
  additional_subscription_eur:0};
}
export function assessReviewApproval({packet,current_post,current_yoast=null,owner_claim={},independent_qa=false}={}){
 if(!packet||!current_post||current_post.ID!==packet.post_id||
   current_post.status!=='draft')return denial('DRAFT_NOT_CURRENT');
 if(hash(String(current_post.content??''))!==packet.content_sha256)
  return denial('STALE_CONTENT_DIGEST_REQUIRES_REVIEW');
 if(independent_qa!==true||packet.actual_visual_review_verified!==true)
  return denial('INDEPENDENT_QA_OR_VISUAL_PENDING');
 if(owner_claim?.authenticated_owner_via_gateway!==true||
    owner_claim?.approved_exact_digest!==(packet.review_revision_sha256??packet.content_sha256))
  return denial('OWNER_APPROVAL_NOT_VERIFIED');
 if(packet.review_revision_sha256){
  if(!current_yoast||current_yoast.post_id!==packet.post_id||current_yoast.post_status!=='draft')
   return denial('SEO_REVISION_PROOF_REQUIRED');
  if(reviewDigest(current_post.content,current_yoast)!==packet.review_revision_sha256)
   return denial('SEO_REVISION_CHANGED_REQUIRES_REVIEW');
 }
 return {status:'READY_FOR_FURTHER_RELEASE_GATES_LAB_ONLY',
  post_id:packet.post_id,can_publish:false,write_executed:false,
  real_owner_iam_bound:false,production_api_writes_allowed:false};
}
