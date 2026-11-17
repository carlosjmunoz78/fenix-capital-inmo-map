import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {buildSeoDraftReviewPacket,queueSeoDraftReviewLab,assessReviewApproval}
 from '../runtime/seo-draft-review-queue-v0.mjs';
const html='<h2>Qué revisar en Córdoba</h2>'+('<p>Revisa documentos, gastos y confort térmico antes de firmar arras.</p>'.repeat(5))+
 '<a href="https://fenixcapital.es/precio-maximo/">Calcular</a>';
const post={ID:52656,status:'draft',type:'post',title:'Checklist para visitar un piso en Córdoba antes de pedir una hipoteca',
 slug:'checklist-visitar-piso-cordoba-antes-hipoteca',permalink:'https://fenixcapital.es/?p=52656',
 content:html,modified:'2026-11-05 17:32:30'};
const yoast={post_id:52656,post_status:'draft',
 seo_title:'Checklist para visitar un piso en Córdoba | Fénix Capital',
 meta_description:'Visitar un piso en Córdoba: revisa estado, comunidad, documentación y gastos antes de hacer una oferta informada.',
 focus_keyphrase:'visitar un piso en Córdoba'};
const tmp=t=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'seo-review-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return path.join(d,'job001.v8')};
test('pilot read-only WordPress draft yields scoped evidence packet, zero owner approvals',()=>{
 const packet=buildSeoDraftReviewPacket({post,yoast});
 assert.equal(packet.post_id,52656);
 assert.equal(packet.post_status,'draft');
 assert.equal(packet.content_sha256.length,64);
 assert.equal(packet.review_revision_sha256.length,64);
 assert.equal(packet.content_length,html.length);
 assert.equal(packet.internal_links_count,1);
 assert.equal(packet.section_count_h2,1);
 assert.equal(packet.seo_metadata_present,true);
 assert.equal(packet.actual_visual_review_verified,false);
 assert.equal(packet.owner_approval_count_for_autonomy,0);
 assert.equal(packet.production_publish_authorized,false);
 assert.equal(JSON.stringify(packet).includes('<h2>'),false);
 assert.equal(packet.admin_edit_url,'https://fenixcapital.es/wp-admin/post.php?post=52656&action=edit');
});
test('LAB JOB-001 queue is persistent, idempotent and NEVER dispatches to WP',t=>{
 const file_path=tmp(t),packet=buildSeoDraftReviewPacket({post,yoast});
 const first=queueSeoDraftReviewLab({file_path,packet,now_ms:1793896400000});
 const duplicate=queueSeoDraftReviewLab({file_path,packet,now_ms:1793896401000});
 assert.equal(first.newly_queued,true);
 assert.equal(duplicate.newly_queued,false);
 assert.equal(duplicate.job_id,first.job_id);
 assert.equal(first.actual_wordpress_write,false);
 const rt=new DurableJobRuntimeV1({file_path});
 const jobs=rt.listForContext({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'});
 assert.equal(jobs.length,1);
 assert.equal(jobs[0].status,'QUEUED');
 assert.equal(jobs[0].payload.permission_to_publish,false);
 assert.equal(jobs[0].payload.desired_wordpress_status,'draft');
 assert.equal(jobs[0].payload.owner_approval_count_for_autonomy,0);
 assert.equal(jobs[0].payload.content_sha256,packet.content_sha256);
 assert.equal(jobs[0].payload.review_revision_sha256,packet.review_revision_sha256);
 assert.equal(JSON.stringify(jobs[0]).includes(html),false);
});
test('changed content cannot reuse old approval and creates a new review version',t=>{
 const file_path=tmp(t),old=buildSeoDraftReviewPacket({post,yoast});
 const revisedPost={...post,content:post.content+'<p>Información complementaria.</p>'};
 const revised=buildSeoDraftReviewPacket({post:revisedPost,yoast});
 assert.notEqual(old.content_sha256,revised.content_sha256);
 assert.equal(queueSeoDraftReviewLab({file_path,packet:old}).newly_queued,true);
 assert.equal(queueSeoDraftReviewLab({file_path,packet:revised}).newly_queued,true);
 const oldApproval=assessReviewApproval({packet:old,current_post:revisedPost,
  independent_qa:true,owner_claim:{authenticated_owner_via_gateway:true,approved_exact_digest:old.content_sha256}});
 assert.equal(oldApproval.reason,'STALE_CONTENT_DIGEST_REQUIRES_REVIEW');
});
test('status, tenant, host, link provenance and missing metadata fail closed',t=>{
 const file_path=tmp(t);
 for(const changes of [{status:'publish'},{status:'pending'},{type:'page'},
   {permalink:'https://staging.fenixcapital.es/?p=52656'},
   {content:'short'},
   {content:html+'<a href="https://evil.example/">Externo</a>'}]){
  assert.throws(()=>buildSeoDraftReviewPacket({post:{...post,...changes},yoast}));
 }
 assert.throws(()=>buildSeoDraftReviewPacket({post,yoast,company_id:'other'}),/DRAFT_WRONG_COMPANY/);
 assert.throws(()=>buildSeoDraftReviewPacket({post,yoast:{...yoast,post_id:2}}),/DRAFT_YOAST_RECORD_MISMATCH/);
 const packet=buildSeoDraftReviewPacket({post,yoast});
 assert.equal(queueSeoDraftReviewLab({file_path,packet:{...packet,company_id:'otra'}}).status,'BLOCKED');
 assert.equal(queueSeoDraftReviewLab({file_path,packet:{...packet,original_article_approved_by_owner:true}}).status,'BLOCKED');
 assert.equal(queueSeoDraftReviewLab({file_path,packet:{...packet,seo_metadata_present:false}}).status,'BLOCKED');
 assert.equal(new DurableJobRuntimeV1({file_path}).operation_count,0);
});
test('no owner-supplied flag can bypass independent visual/editorial review or publish',()=>{
 const packet=buildSeoDraftReviewPacket({post,yoast});
 const user={authenticated_owner_via_gateway:true,approved_exact_digest:packet.review_revision_sha256};
 const denied=assessReviewApproval({packet,current_post:post,independent_qa:true,owner_claim:user});
 assert.equal(denied.status,'BLOCKED');
 assert.equal(denied.reason,'INDEPENDENT_QA_OR_VISUAL_PENDING');
 const withVisual={...packet,actual_visual_review_verified:true};
 const stillNoOwner=assessReviewApproval({packet:withVisual,current_post:post,independent_qa:true,owner_claim:{}});
 assert.equal(stillNoOwner.reason,'OWNER_APPROVAL_NOT_VERIFIED');
 const eligible=assessReviewApproval({packet:withVisual,current_post:post,current_yoast:yoast,independent_qa:true,owner_claim:user});
 assert.equal(eligible.status,'READY_FOR_FURTHER_RELEASE_GATES_LAB_ONLY');
 assert.equal(eligible.can_publish,false);
 assert.equal(eligible.production_api_writes_allowed,false);
});

test('SEO title or metadata revision makes new job and invalidates previous approval',t=>{
 const file_path=tmp(t),p1=buildSeoDraftReviewPacket({post,yoast});
 const changed={...yoast,seo_title:'Revised SEO title after editorial correction'};
 const p2=buildSeoDraftReviewPacket({post,yoast:changed});
 assert.equal(p1.content_sha256,p2.content_sha256);
 assert.notEqual(p1.review_revision_sha256,p2.review_revision_sha256);
 const first=queueSeoDraftReviewLab({file_path,packet:p1});
 const second=queueSeoDraftReviewLab({file_path,packet:p2});
 assert.equal(first.newly_queued,true);
 assert.equal(second.newly_queued,true);
 assert.notEqual(first.job_id,second.job_id);
 const withVisual={...p1,actual_visual_review_verified:true};
 const owner={authenticated_owner_via_gateway:true,approved_exact_digest:p1.review_revision_sha256};
 const denied=assessReviewApproval({packet:withVisual,current_post:post,
  current_yoast:changed,independent_qa:true,owner_claim:owner});
 assert.equal(denied.reason,'SEO_REVISION_CHANGED_REQUIRES_REVIEW');
 const noCurrentSeo=assessReviewApproval({packet:withVisual,current_post:post,
  independent_qa:true,owner_claim:owner});
 assert.equal(noCurrentSeo.reason,'SEO_REVISION_PROOF_REQUIRED');
 const oldOwner=assessReviewApproval({packet:{...p2,actual_visual_review_verified:true},
  current_post:post,current_yoast:changed,independent_qa:true,owner_claim:owner});
 assert.equal(oldOwner.reason,'OWNER_APPROVAL_NOT_VERIFIED');
 assert.equal(new DurableJobRuntimeV1({file_path}).listForContext({
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'}).length,2);
});
