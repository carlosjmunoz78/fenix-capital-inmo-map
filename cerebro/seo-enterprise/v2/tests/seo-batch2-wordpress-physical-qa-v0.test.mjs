import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='cerebro/seo-enterprise/v2/';
const a=JSON.parse(fs.readFileSync(root+'registry/seo001-batch2-wordpress-physical-qa-2026-11-07.json','utf8'));
const t=JSON.parse(fs.readFileSync(root+'training-pilots/SEO_D32_OWNER_VISUAL_PERSONA_BATCH2_2026-11-07.json','utf8'));
test('batch 2 is four existing unique WordPress drafts and no duplicate second batch',()=>{
 assert.equal(a.wordpress_origin,'https://fenixcapital.es');
 assert.deepEqual(a.items.map(x=>x.id),[52713,52714,52715,52716]);
 assert.deepEqual(a.items.map(x=>x.type),['post','post','page','page']);
 assert.equal(new Set(a.items.map(x=>x.brief_id)).size,4);
 for(const item of a.items)assert.equal(item.wordpress_status,'draft');
 assert.equal(t.last_physical_preview_audit.verified_that_four_drafts_preexist,true);
});
test('photo producer receipt and genuine preview are hard release gates',()=>{
 for(const item of a.items){
 assert.equal(item.image_state,'PENDING_UMS_OPENAI');
 assert.equal(item.media_qa_certified,false);
 assert.equal(item.rendered_template_certified,false);
 assert.equal(item.approval,false);
 assert.equal(item.faq_count,item.type==='post'?6:8);
 }
 assert.equal(a.real_image_api_batch_dispatch,'NOT_VERIFIED');
 assert.equal(a.release_status,'HOLD_NOT_OWNER_APPROVED');
 assert.equal(a.wordpress_publications_authorized,false);
 assert.equal(a.owner_approves_release,false);
 assert.equal(a.owner_approves_media,false);
 assert.equal(a.required_gates.includes('SIGNED_UMS_OPENAI_ORIGIN_RECEIPT_FOR_EACH_REQUIRED_IMAGE'),true);
 assert.equal(a.required_gates.includes('NO_THEME_BANNER_DUPLICATE'),true);
});
test('actual Elementor preview demo blocks both new pages even when HTML exists',()=>{
 for(const id of [52715,52716]){
 const item=a.items.find(x=>x.id===id);
 assert.equal(item.preview_demo,'SINGLE_SERVICES_LOREM');
 assert.equal(item.rendered_template_certified,false);
 }
 assert.equal(t.last_physical_preview_audit.verified_two_pages_render_wrong_demo,true);
});
test('owner learning preserves no-global-template/no-spend policy and physical verification',()=>{
 assert.equal(a.additional_new_subscription_eur,0);
 assert.equal(t.last_physical_preview_audit.wordpress_global_template_changes,0);
 assert.equal(t.last_physical_preview_audit.openai_paid_api_calls_from_this_review,0);
 assert.equal(t.last_physical_preview_audit.verified_post_sidebar_banner_issue,true);
 for(const rule of ['CREATE_DUPLICATE_DRAFTS','AUTO_PUBLISH','MODIFY_GLOBAL_ASTRA_TEMPLATE','PRETEND_PRODUCTORA_IMAGES_EXIST'])
 assert.equal(a.non_authorized_methods.includes(rule),true);
});
