import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {prepareSeoReviewPackage,physicallyWriteSeoReviewPackage} from '../runtime/seo-editorial-preview-and-producer-handoff-v0.mjs';

test('CEREBRO builds 2 actual HTML previews from CURRENT V3 draft sources, 6 FAQ per article',()=>{
 const p=prepareSeoReviewPackage();
 assert.equal(p.company_id,'fenix');assert.equal(p.environment,'PREPROD');
 assert.equal(p.entries.length,2);
 assert.deepEqual(p.entries.map(x=>x.persona),['PARTICULARES','INMOBILIARIAS']);
 assert.deepEqual(p.entries.map(x=>x.faq_count),[6,6]);
 for(const e of p.entries){
  assert.match(e.sha256,/^[a-f0-9]{64}$/);assert.match(e.git_blob_sha,/^[a-f0-9]{40}$/);
  assert.equal((e.html.match(/class="faq-item"/g)||[]).length,6);
  assert.match(e.html,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(e.html,/Fotografía original pendiente de UMS-001/);
  assert.equal(/<img\b/i.test(e.html),false);
  assert.equal(/<script\b/i.test(e.html),false);
  assert.equal(/<form\b/i.test(e.html),false);
  assert.equal(/onload=|onclick=|onerror=/i.test(e.html),false);
  assert.equal(e.producer_order.brief.visible_pixel_text_allowed,false);
  assert.equal(e.producer_order.brief.visible_logo_allowed,false);
  assert.equal(e.producer_order.brief.visible_watermark_allowed,false);
  assert.equal(e.producer_order.wordpress_media_metadata.alt.length>15,true);
  assert.equal(e.producer_order.wordpress_media_metadata.description.length>15,true);
  assert.equal(e.producer_order.wordpress_media_metadata.caption.length>15,true);
  assert.equal(e.producer_order.image_api_call_executed,false);
  assert.equal(e.producer_order.actual_api_dispatch,false);
 }
 assert.notEqual(p.entries[0].producer_order.request_id,p.entries[1].producer_order.request_id);
 assert.equal(p.image_api_calls,0);
 assert.equal(p.wordpress_mutations,0);
 assert.equal(p.production_release_authorized,false);
});
test('CEREBRO physically writes inspectable HTML and UMS order files in isolated temp only',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-preview-'));
 const target=path.join(dir,'package');
 try{
  const p=prepareSeoReviewPackage();
  const out=physicallyWriteSeoReviewPackage({package_data:p,output_dir:target});
  assert.equal(out.status,'PREPROD_REVIEW_HTML_AND_UMS_BRIEFS_PHYSICALLY_WRITTEN');
  assert.equal(out.article_count,2);assert.equal(out.total_faq,12);
  assert.equal(out.files.length,6);
  const manifest=JSON.parse(fs.readFileSync(path.join(target,'manifest.json'),'utf8'));
  assert.equal(manifest.total_faq,12);
  assert.equal(manifest.wordpress_mutations,0);assert.equal(manifest.image_api_calls,0);
  assert.equal(manifest.files.length,5);
  assert.equal(manifest.content_sha256.length,2);
  assert.ok(fs.readFileSync(path.join(target,'index.html'),'utf8').includes('compradores.html'));
  assert.ok(fs.readFileSync(path.join(target,'inmobiliarias.html'),'utf8').includes('faq-item'));
  assert.throws(()=>physicallyWriteSeoReviewPackage({package_data:p,output_dir:target}),/OUTPUT_ALREADY_EXISTS/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('no fake image generation, cross-company, outside path, or incorrect article scope',()=>{
 const p=prepareSeoReviewPackage();
 assert.throws(()=>prepareSeoReviewPackage({ids:['SEO001-OTHER-B2C','SEO001-FENIX-B2B-EDITORIAL-002']}),/WORK_SCOPE/);
 assert.throws(()=>physicallyWriteSeoReviewPackage({package_data:{...p,company_id:'other'},output_dir:path.join(os.tmpdir(),'should-not-write-01')}),/WRITE_SCOPE/);
 assert.throws(()=>physicallyWriteSeoReviewPackage({package_data:{...p,image_api_calls:1},output_dir:path.join(os.tmpdir(),'should-not-write-02')}),/WRITE_SCOPE/);
 assert.throws(()=>physicallyWriteSeoReviewPackage({package_data:p,output_dir:'/etc/seo-should-not-write'}),/OUTSIDE_TEMP/);
});
