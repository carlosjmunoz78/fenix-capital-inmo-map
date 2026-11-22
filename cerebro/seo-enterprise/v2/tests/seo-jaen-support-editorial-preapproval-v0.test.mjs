import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ev=JSON.parse(fs.readFileSync(new URL('../jaen-p0-live-recovery-evidence-2026-11-05.json',import.meta.url),'utf8'));
const qa=ev.editorial_support_pre_approval;
test('Jaén two official WordPress drafts were actually enhanced but remain unapproved',()=>{
 assert.equal(qa.action_status,'TWO_REAL_WORDPRESS_DRAFTS_UPDATED_WITH_PRESERVED_ORIGINAL_TEXT');
 assert.equal(qa.drafts.length,2);
 assert.deepEqual(qa.drafts.map(x=>x.post_id),[52247,52248]);
 for(const d of qa.drafts){
  assert.equal(d.status,'draft');
  assert.ok(d.content_chars_after>d.content_chars_before);
  assert.ok(d.approx_word_count>=500);
  assert.ok(d.headings_h2>=6);
  assert.ok(d.unique_internal_links>=3);
  assert.equal(d.original_html_prefix_preserved,true);
  assert.equal(d.readback_content_exact_match,true);
  assert.equal(d.yoast_title_description_keyphrase_canonical_verified,true);
  assert.equal(d.content_sha256_for_authenticated_owner_approval,null);
 }
 assert.equal(qa.owner_explicit_approval_recorded,false);
 assert.equal(qa.wordpress_production_published_changed,false);
});
test('updated draft receipts contain actual restore journal and proper canonical origin',()=>{
 assert.deepEqual(qa.drafts.map(x=>x.previous_snapshot_id),[176,177]);
 assert.deepEqual(qa.drafts.map(x=>x.undo_journal_change_id),[1992,1993]);
 for(const d of qa.drafts){assert.equal(d.undo_dry_run,true);assert.equal(d.undo_physical_execution,false);}
 assert.equal(ev.landing.coreguard_snapshot_id,175);
 assert.equal(ev.fix_planner.website_write_executed,false);
});
test('support content is not publicly exposed and links use existing valid URLs only',()=>{
 assert.equal(qa.live_internal_link_http_status,200);
 assert.equal(qa.public_clean_slug_urls_status,404);
 assert.equal(qa.both_excluded_from_post_sitemap,true);
 assert.equal(qa.drafts[0].unique_internal_links,3);
 assert.equal(qa.drafts[1].unique_internal_links,4);
 assert.equal(qa.content_qa.financial_guarantees_inserted,false);
});
test('independent legal + visual QA and owner exact-content approval remain mandatory',()=>{
 assert.equal(qa.visual_browser_preview_verified,false);
 assert.equal(qa.featured_images_verified,false);
 assert.equal(qa.independent_legal_factual_review_complete,false);
 assert.equal(qa.content_qa.visual_qa_pending,true);
 assert.equal(qa.content_qa.launch_release_authorized,false);
 assert.equal(qa.publication_gate.owner_version_digest_required,true);
 assert.equal(qa.publication_gate.independent_qa_required,true);
 assert.equal(qa.publication_gate.visual_qa_required,true);
 assert.equal(qa.publication_gate.publish_or_mass_without_approval,false);
 assert.equal(qa.publication_gate.real_publications_counted_for_autonomy,0);
});
test('Jaén pilot and the mass city rollout remain blocked until REAL certification',()=>{
 assert.equal(ev.pilot_certification.certified,false);
 assert.equal(ev.pilot_certification.mass_rollout_allowed,false);
 assert.equal(ev.pilot_certification.validation_certified,false);
 assert.equal(ev.landing.coreguard_live_verify_ok,false);
 assert.equal(ev.editorial_support_pre_approval.publication_gate.city_certification_restored,false);
 assert.equal(ev.changed_published_content,false);
 assert.equal(ev.production_coreguard_gates_modified,false);
});
