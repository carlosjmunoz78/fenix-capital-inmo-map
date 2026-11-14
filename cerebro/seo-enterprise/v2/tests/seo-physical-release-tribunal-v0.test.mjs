import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assessSeoPhysicalReleaseEvidence,persistSeoPhysicalReleaseTribunal} from '../runtime/seo-physical-release-tribunal-v0.mjs';
const article_dir=process.env.SEO_TRIBUNAL_ARTICLES_DIR;
const wordpress_dir=process.env.SEO_TRIBUNAL_WP_DIR;
const media_dir=process.env.SEO_TRIBUNAL_MEDIA_DIR;
if(!article_dir||!wordpress_dir||!media_dir)throw Error('PHYSICAL_INPUT_DIRS_REQUIRED');
const evaluate=extra=>assessSeoPhysicalReleaseEvidence({
 article_dir,wordpress_dir,media_dir,...extra
});
test('real artifact bundle V4.1 + actual isolated MariaDB SQL dump + physical WebP receipt forms a HOLD verdict',()=>{
 const r=evaluate();
 assert.equal(r.article_count,2);
 // Historic V4.1 receipts remain authentic, but the *current* D31 policy has
 // flagged three specific issues. The cross-engine tribunal must report HOLD,
 // not silently inherit a stale editorial green.
 assert.equal(r.core_article_prechecks_pass,false);
 assert.ok(r.articles.every(x=>x.content_machine_precheck_pass===false));
 assert.ok(r.articles.some(x=>x.issues.includes('VOICE_PURCHASE_MORTGAGE_FEES_UNDIFFERENTIATED')));
 assert.ok(r.articles.some(x=>x.issues.includes('VOICE_UNWARRANTED_MORTGAGE_SUCCESS_GUARANTEE')));
 assert.ok(r.articles.some(x=>x.issues.includes('VOICE_UNILATERAL_TRANSACTION_DISMISSAL_REQUIRES_REVIEW')));
 assert.ok(r.articles.every(x=>x.publication_authorized===false));
 assert.ok(r.articles.every(x=>x.faq_count===6));
 assert.ok(r.articles.every(x=>x.word_count>=1000&&x.body_words_excluding_faq>=750));
 assert.equal(r.wordpress.isolated_synthetic_mariadb_restore_pass,true);
 assert.equal(r.wordpress.restored_real_production_snapshot,false);
 assert.equal(r.media.physical_webp_test_pass,true);
 assert.equal(r.media.original_ums_photo_delivered,false);
 assert.equal(r.media.license_rights_verified,false);
 assert.equal(r.pending_release_gates.length,6);
 assert.equal(r.publish_authorized,false);
 assert.equal(r.autonomous_production_ready,false);
 assert.equal(r.wordpress_writes,0);
});
test('forged article bytes cannot borrow another SHA or approval',()=>{
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'seo-tribunal-test-articles-'));
 try{
  for(const filename of ['compradores-v4-1-review-only.html','inmobiliarias-v4-1-review-only.html']){
   fs.copyFileSync(path.join(article_dir,filename),path.join(p,filename));
  }
  fs.appendFileSync(path.join(p,'compradores-v4-1-review-only.html'),'\n<!-- unapproved modification -->');
  assert.throws(()=>evaluate({article_dir:p}),/ARTICLE_SOURCE_SHA_MISMATCH/);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('fake image rights/clean pixels and forged PROD restore never turn a test green',()=>{
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'seo-tribunal-test-artifacts-'));
 try{
  const m=path.join(p,'media');fs.mkdirSync(m);
  const r=JSON.parse(fs.readFileSync(path.join(media_dir,'receipt.json')));
  fs.writeFileSync(path.join(m,'receipt.json'),JSON.stringify({...r,
   independent_visual_no_text_logo_watermark_verified:true}));
  assert.throws(()=>evaluate({media_dir:m}),/IMAGE_SOURCE_AND_PERMISSIONS/);
  const wp=path.join(p,'wordpress');fs.mkdirSync(wp);
  const w=JSON.parse(fs.readFileSync(path.join(wordpress_dir,'receipt.json')));
  fs.writeFileSync(path.join(wp,'receipt.json'),JSON.stringify({...w,
   real_prod_wp_restore_gate_passed:true}));
  fs.copyFileSync(path.join(wordpress_dir,'fixture-backup.sql'),path.join(wp,'fixture-backup.sql'));
  assert.throws(()=>evaluate({wordpress_dir:wp}),/SEO_WP_RESTORE_UNVERIFIED_OR_UNSAFE_FIXTURE_RECEIPT/);
 }finally{fs.rmSync(p,{recursive:true,force:true})}
});
test('report physically persists exact two SHA decisions with no false PROD permission',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'seo-release-report-'));
 try{
  const target=path.join(parent,'output');
  const r=evaluate();
  const z=persistSeoPhysicalReleaseTribunal({report:r,output_dir:target});
  assert.match(z.report_sha256,/^[a-f0-9]{64}$/);
  assert.equal(z.wordpress_writes,0);
  const fromDisk=JSON.parse(fs.readFileSync(path.join(target,'physical-release-tribunal.json')));
  assert.equal(fromDisk.publish_authorized,false);
  assert.equal(fromDisk.articles.length,2);
  assert.equal(fromDisk.autonomous_production_ready,false);
  assert.throws(()=>persistSeoPhysicalReleaseTribunal({report:{...r,publish_authorized:true},output_dir:path.join(parent,'unsafe')}));
  assert.throws(()=>persistSeoPhysicalReleaseTribunal({report:r,output_dir:target}),/OUTPUT_NOT_TEMP_OR_EXISTS/);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
