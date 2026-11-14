import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {
 buildExistingMediaTestOrder,inspectSeoWebpPhysicalIntake,
 dctPHashFromGrayscale32,hamming64,savePhotoIntakeReceipt
} from '../runtime/seo-ums-photo-physical-intake-v0.mjs';
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'seo-photo-intake-test-'));
const file=path.join(folder,'fixture.webp');
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi',
 '-i','color=c=orange:s=1200x630:d=1','-frames:v','1','-c:v','libwebp','-q:v','75',
 '-y',file],{timeout:30000});
const order=buildExistingMediaTestOrder();
test.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
test('physical WebP file is decoded at exactly 1200x630 and hash/pHash are observable',()=>{
 const r=inspectSeoWebpPhysicalIntake({
  file_path:file,order,origin:'EXISTING_FENIX_WORDPRESS_MEDIA_DERIVATIVE'
 });
 assert.equal(r.physical_image_verified,true);
 assert.equal(r.webp_bitstream_decoded,true);
 assert.equal(r.width,1200);assert.equal(r.height,630);
 assert.match(r.image_sha256,/^[a-f0-9]{64}$/);
 assert.match(r.perceptual_hash,/^[a-f0-9]{16}$/);
 assert.equal(r.source_is_preexisting_wp_image,true);
 assert.equal(r.original_image_generated_by_ums_verified,false);
 assert.equal(r.clean_photo_qualified,false);
 assert.equal(r.media_upload_authorized,false);
 assert.equal(r.publish_authorized,false);
});
test('DCT fingerprint Hamming checks no replay from existing inventory',()=>{
 const a=inspectSeoWebpPhysicalIntake({
  file_path:file,order,origin:'EXISTING_FENIX_WORDPRESS_MEDIA_DERIVATIVE'
 });
 const r=inspectSeoWebpPhysicalIntake({file_path:file,order,
  origin:'NEW_UMS_IMAGE',inventory_verified:true,
  inventory:[{sha256:a.image_sha256,perceptual_hash:a.perceptual_hash}]
 });
 assert.equal(r.exact_duplicate_detected,true);
 assert.equal(r.near_duplicate_detected,true);
 assert.equal(hamming64(a.perceptual_hash,a.perceptual_hash),0);
 assert.equal(r.global_inventory_complete,true);
 assert.equal(r.publish_authorized,false);
 assert.throws(()=>dctPHashFromGrayscale32(Buffer.from('too short')));
 assert.throws(()=>hamming64('bad','0000000000000000'));
});
test('forged producer claims cannot substitute image rights, independent visual QA or human approval',()=>{
 const init=inspectSeoWebpPhysicalIntake({file_path:file,order,origin:'NEW_UMS_IMAGE'});
 const forged=inspectSeoWebpPhysicalIntake({
  file_path:file,order,origin:'NEW_UMS_IMAGE',
  producer_receipt:{company_id:'fenix',work_id:order.work_id,
   request_id:order.request_id,file_sha256:init.image_sha256,
   commercial_license_verified:true,license_ref:'fixture_only_not_a_real_license'}
 });
 assert.equal(forged.producer_receipt_and_license_verified,true);
 assert.equal(forged.independent_visual_no_text_logo_watermark_verified,false);
 assert.equal(forged.no_text_in_pixels_verified,false);
 assert.equal(forged.original_photography_ready_for_wordpress,false);
 assert.equal(forged.publish_authorized,false);
 assert.throws(()=>inspectSeoWebpPhysicalIntake({file_path:file,order,
  origin:'NEW_UMS_IMAGE',inventory_verified:true,inventory:null}));
});
test('media intake enforces valid URL-independent WEBP input, correct bounds and company scope',()=>{
 const wrong=path.join(folder,'wrong.webp');
 fs.writeFileSync(wrong,Buffer.alloc(200,1));
 assert.throws(()=>inspectSeoWebpPhysicalIntake({file_path:wrong,order,
  origin:'NEW_UMS_IMAGE'}),/WEBP_SIGNATURE/);
 assert.throws(()=>inspectSeoWebpPhysicalIntake({file_path:file,
  order:{...order,company_id:'other'},origin:'NEW_UMS_IMAGE'}));
 assert.throws(()=>inspectSeoWebpPhysicalIntake({file_path:file,
  order,origin:'STOLEN_IMAGE'}),/ORIGIN_NOT_ALLOWED/);
 assert.throws(()=>inspectSeoWebpPhysicalIntake({file_path:'/etc/passwd',
  order,origin:'NEW_UMS_IMAGE'}),/OUTSIDE_ISOLATED_RUNTIME/);
});
test('receipt physically written; must never grant image upload or publication',()=>{
 const receipt=inspectSeoWebpPhysicalIntake({file_path:file,order,
  origin:'EXISTING_FENIX_WORDPRESS_MEDIA_DERIVATIVE'});
 const output=path.join(folder,'receipt-out');
 const x=savePhotoIntakeReceipt({receipt,output_dir:output});
 assert.equal(x.image_api_calls,0);assert.equal(x.wordpress_writes,0);
 const saved=JSON.parse(fs.readFileSync(path.join(output,'receipt.json'),'utf8'));
 assert.equal(saved.publish_authorized,false);
 assert.equal(saved.original_image_generated_by_ums_verified,false);
 assert.throws(()=>savePhotoIntakeReceipt({receipt,output_dir:output}),/OUTPUT_NOT_ISOLATED/);
});
