import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
 prepareSeoV41WordpressDraftOnlyPlans,writeSeoV41DraftOnlyPlans
} from '../runtime/seo-v4-1-wordpress-draft-guard-v0.mjs';
const article_dir=process.env.SEO_V41_DRAFT_SOURCE_DIR;
if(!article_dir)throw Error('EXACT_V41_ARTIFACT_REQUIRED');
const registry=JSON.parse(fs.readFileSync(
 'cerebro/seo-enterprise/v2/registry/seo001-v4-1-wordpress-post-page-slug-inventory-readonly-2026-11-06.json'));
test('real 225 WordPress post/page slugs, including drafts, have no collisions for V4.1',()=>{
 const r=prepareSeoV41WordpressDraftOnlyPlans({article_dir});
 assert.equal(r.plans.length,2);
 assert.equal(r.checked_site_post_page_records,225);
 assert.equal(r.wp_create_post_real_calls,0);
 assert.equal(r.wp_create_post_dry_run_calls,0);
 for(const item of r.plans){
  assert.equal(item.discovered_exact_slug_conflicts_post_page,0);
  assert.equal(item.other_post_types_and_race_window_still_unknown,true);
  assert.equal(item.dry_run_request.arguments.dry_run,true);
  assert.equal(item.dry_run_request.arguments.status,'draft');
  assert.equal(item.dry_run_request.arguments.post_type,'post');
  assert.equal(item.dry_run_request.authorize_draft_write,false);
  assert.equal(item.dry_run_request.authorize_publication,false);
  assert.equal(item.wordpress_write_authorized,false);
 }
 assert.equal(r.publish_authorized,false);
});
test('simulate new slug collision after inventory: plans fail closed',()=>{
 const changed=structuredClone(registry);
 changed.rows.push({...changed.rows[0],
  id:990000,slug:'comparar-dos-pisos-despues-visita-cordoba'});
 changed.captured_rows=226;
 assert.throws(()=>prepareSeoV41WordpressDraftOnlyPlans({
  article_dir,inventory_override:changed}),/INVENTORY_COUNT_MISMATCH|GOVERNANCE_OR_INVENTORY/);
 const collision=structuredClone(registry);
 collision.rows[0].slug='derivacion-hipotecaria-comprador-inmobiliaria-cordoba';
 assert.throws(()=>prepareSeoV41WordpressDraftOnlyPlans({
  article_dir,inventory_override:collision}),/LIVE_INVENTORY_SLUG_CONFLICT/);
});
test('attacker cannot weaken field claims or substitute stale B2B/consumer content',()=>{
 const h=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v41-wordpress-guard-'));
 try{
  for(const name of ['compradores-v4-1-review-only.html','inmobiliarias-v4-1-review-only.html']){
   fs.copyFileSync(path.join(article_dir,name),path.join(h,name));
  }
  fs.appendFileSync(path.join(h,'compradores-v4-1-review-only.html'),'<!-- mutation -->');
  assert.throws(()=>prepareSeoV41WordpressDraftOnlyPlans({article_dir:h}),/CONTENT_SHA_OR_ACTIVE_TAGS/);
  fs.copyFileSync(path.join(article_dir,'compradores-v4-1-review-only.html'),
   path.join(h,'compradores-v4-1-review-only.html'));
  fs.appendFileSync(path.join(h,'inmobiliarias-v4-1-review-only.html'),
   '<script>alert("x")</script>');
  assert.throws(()=>prepareSeoV41WordpressDraftOnlyPlans({article_dir:h}),/CONTENT_SHA_OR_ACTIVE_TAGS/);
 }finally{fs.rmSync(h,{recursive:true,force:true})}
});
test('missing cross-CPT inventory evidence is HOLD, independent QA not inferred',()=>{
 const inventory=structuredClone(registry);
 inventory.inventory_complete_for_other_custom_post_types=true;
 assert.throws(()=>prepareSeoV41WordpressDraftOnlyPlans({
  article_dir,inventory_override:inventory}),/GOVERNANCE_OR_INVENTORY/);
 const x=prepareSeoV41WordpressDraftOnlyPlans({article_dir});
 assert.equal(x.real_wordpress_restore_gate_passed,false);
 assert.equal(x.independent_editorial_approval,false);
 assert.equal(x.owner_exact_sha_approval,false);
 assert.equal(x.latest_inventory_recheck_required,true);
});
test('two physical dry-run plan JSONs are created with HTML hashes and zero writes',()=>{
 const r=prepareSeoV41WordpressDraftOnlyPlans({article_dir});
 const parent=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'seo-v41-wp-'));
 try{
  const target=path.join(parent,'draft-output');
  const x=writeSeoV41DraftOnlyPlans({report:r,output_dir:target});
  assert.equal(x.plan_count,2);
  assert.equal(x.wordpress_writes,0);
  const saved=JSON.parse(fs.readFileSync(path.join(target,'manifest.json'),'utf8'));
  assert.equal(saved.plans.length,2);
  assert.equal(saved.real_wordpress_restore_gate_passed,false);
  for(const name of ['b2c','b2b']){
   const doc=JSON.parse(fs.readFileSync(path.join(target,name+'-wp-dryrun-plan.json'),'utf8'));
   assert.equal(doc.arguments.dry_run,true);
   assert.equal(doc.arguments.status,'draft');
   assert.equal(doc.authorize_publication,false);
  }
  assert.throws(()=>writeSeoV41DraftOnlyPlans({report:r,output_dir:target}),/NOT_ISOLATED_RUNNER/);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
