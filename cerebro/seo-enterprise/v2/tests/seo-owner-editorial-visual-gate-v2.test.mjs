import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditOwnerEditorialCopy,buildSeoProducerImageOrder,validateSeoProducerOrder,preflightReturnedSeoMediaAsset} from '../runtime/seo-owner-editorial-visual-gate-v2.mjs';
const root='cerebro/seo-enterprise/v2/';
const registry=JSON.parse(fs.readFileSync(root+'registry/seo-owner-copy-revision-b2b-b2c-v2-2026-11-06.json','utf8'));
const active=registry.new_drafts;
const old=[
 fs.readFileSync(root+'drafts/2026-11-06-b2c-comparar-pisos-cordoba.draft.html','utf8'),
 fs.readFileSync(root+'drafts/2026-11-06-b2b-derivacion-comprador-cordoba.draft.html','utf8')];
test('new B2C and B2B owner copy QA obeys no colon, no numbered H2, no banned phrases',()=>{
 assert.equal(active.length,2);
 for(const item of active){
  const html=fs.readFileSync(item.draft_path,'utf8');
  const result=auditOwnerEditorialCopy({html,persona:item.persona});
  assert.equal(result.deterministic_style_precheck_passed,true,JSON.stringify(result.issues));
  assert.equal(result.issues.length,0);
  assert.ok(result.h1[0].length<=65);
  assert.equal(result.h2.length,5);
  assert.ok(result.word_count>=240&&result.word_count<=650);
  assert.equal(result.copy_is_human_certified,false);
  assert.equal(result.ai_origin_detection_not_performed,true);
 }
});
test('old drafts are correctly rejected and preserved as history',()=>{
 for(let i=0;i<2;i++){
  const bad=auditOwnerEditorialCopy({html:old[i],persona:active[i].persona});
  assert.equal(bad.deterministic_style_precheck_passed,false);
  assert.ok(bad.issues.includes('NUMBERED_H2'));
 }
 assert.equal(registry.old_reviews_superseded,true);
 assert.equal(registry.old_github_html_preserved,true);
 assert.equal(registry.wordpress_published_modified,false);
});
test('artificial copy errors fail closed, including owner taboo words and colon punctuation',()=>{
 const item=active[0],html=fs.readFileSync(item.draft_path,'utf8');
 for(const change of ['<h2>1. Título con número</h2>', '<p>Además, este párrafo incumple.</p>',
  '<p>En conclusión, compra.</p>', '<p>El resumen: una palabra.</p>']){
  const bad=auditOwnerEditorialCopy({html:html+change,persona:item.persona});
  assert.equal(bad.deterministic_style_precheck_passed,false);
 }
});
test('UMS image briefs request TWO visually distinct photo concepts with all WP metadata outside pixels',()=>{
 const orders=active.map(item=>{
  const html=fs.readFileSync(item.draft_path,'utf8');
  const digest=auditOwnerEditorialCopy({html,persona:item.persona}).sha256;
  return buildSeoProducerImageOrder({
   company_id:'fenix',work_id:item.id,persona:item.persona,
   source_content_sha256:digest,...item.image
  });
 });
 assert.equal(orders.length,2);
 assert.notEqual(orders[0].brief.subject,orders[1].brief.subject);
 assert.notEqual(orders[0].request_id,orders[1].request_id);
 assert.notEqual(orders[0].wordpress_media_metadata.alt,orders[1].wordpress_media_metadata.alt);
 for(const order of orders){
  const result=validateSeoProducerOrder({order});
  assert.equal(result.metadata_complete,true);
  assert.equal(result.api_called,false);
  assert.equal(order.brief.visible_pixel_text_allowed,false);
  assert.equal(order.brief.visible_logo_allowed,false);
  assert.equal(order.brief.visible_watermark_allowed,false);
  assert.equal(order.brief.graphic_overlay_allowed,false);
  assert.equal(order.metadata_must_be_outside_pixels,true);
  assert.equal(order.actual_api_dispatch,false);
  assert.equal(order.wordpress_upload_authorized,false);
  assert.equal(order.producer_engine,'UMS-001');
  assert.equal(order.publish_authorized,false);
  assert.throws(()=>validateSeoProducerOrder({order:{...order,brief:{...order.brief,visible_logo_allowed:true}}}));
  assert.throws(()=>validateSeoProducerOrder({order:{...order,api_spend_authorized:true}}));
  assert.throws(()=>validateSeoProducerOrder({order,existing_assets:[{
   company_id:'fenix',work_id:order.work_id,asset_role:'HERO',approved:true
  }]}));
 }
});

test('returned original photo must be unique against full existing inventory, with rights proof',()=>{
 const item=active[0],html=fs.readFileSync(item.draft_path,'utf8');
 const order=buildSeoProducerImageOrder({
 company_id:'fenix',work_id:item.id,persona:item.persona,
 source_content_sha256:auditOwnerEditorialCopy({html,persona:item.persona}).sha256,...item.image});
 const candidate={
  company_id:'fenix',work_id:item.id,request_id:order.request_id,media_type:'IMAGE',
  sha256:'b'.repeat(64),perceptual_hash:'aabbccddeeff0011',
  width:1200,height:630,format:'webp',
  rights_provenance_ref:'ums:provenance:image:synthetic-fixture',
  rights_status:'VERIFIED_COMMERCIAL_REUSE'
 };
 assert.throws(()=>preflightReturnedSeoMediaAsset({order,asset:candidate,existing_assets:[],inventory_verified:false}));
 assert.throws(()=>preflightReturnedSeoMediaAsset({order,asset:candidate,
  existing_assets:[{company_id:'fenix',sha256:'b'.repeat(64),perceptual_hash:'ff'.repeat(8)}],inventory_verified:true}));
 assert.throws(()=>preflightReturnedSeoMediaAsset({order,asset:candidate,
  existing_assets:[{company_id:'other',sha256:'c'.repeat(64),perceptual_hash:'aabbccddeeff0010'}],inventory_verified:true}));
 const ok=preflightReturnedSeoMediaAsset({order,asset:candidate,
  existing_assets:[{company_id:'fenix',sha256:'c'.repeat(64),perceptual_hash:'123456789abcdef0'}],inventory_verified:true});
 assert.equal(ok.image_ready_for_publish,false);
 assert.equal(ok.independent_no_text_visual_qa_verified,false);
 assert.equal(ok.visual_qa_and_composition_review_required,true);
});
