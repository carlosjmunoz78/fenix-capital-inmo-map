/**
 * UMS-001 ⇄ SEO-001. Physical image-byte intake & pixel fingerprint (DCT pHash).
 * A binary preflight is NOT an independent visual audit and does NOT license
 * photos or allow WordPress uploads. Existing-site media is test-only.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildSeoProducerImageOrder,validateSeoProducerOrder} from './seo-owner-editorial-visual-gate-v2.mjs';
const nope=s=>{throw Error('SEO_UMS_PHYSICAL_'+s)};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function checkPhotoFile(file){
 if(typeof file!=='string'||!path.isAbsolute(file)||file.includes('..'))nope('FILE_SCOPE');
 const p=path.resolve(file);
 const roots=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(r=>path.resolve(r));
 if(!roots.some(root=>p.startsWith(root+path.sep)))nope('OUTSIDE_ISOLATED_RUNTIME');
 const size=fs.statSync(p).size;
 if(size<100||size>2_800_000)nope('FILE_SIZE');
 const raw=fs.readFileSync(p);
 if(raw.subarray(0,4).toString()!=='RIFF'||raw.subarray(8,12).toString()!=='WEBP')
  nope('WEBP_SIGNATURE');
 const data=JSON.parse(execFileSync('ffprobe',[
  '-v','error','-select_streams','v:0','-show_entries',
  'stream=width,height,codec_name','-of','json',p
 ],{encoding:'utf8',timeout:15000,maxBuffer:128_000}));
 const stream=data.streams?.[0];
 if(stream?.codec_name!=='webp'||stream.width!==1200||stream.height!==630)
  nope('WEBP_1200x630_DIMENSIONS');
 return {p,raw,size,width:stream.width,height:stream.height};
}
export function dctPHashFromGrayscale32(pixels){
 if(!Buffer.isBuffer(pixels)||pixels.length!==1024)nope('RAW32_PIXELS_REQUIRED');
 const samples=[];
 for(let v=0;v<8;v++)for(let u=0;u<8;u++){
  let total=0;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)
   total+=pixels[y*32+x]*Math.cos((2*x+1)*u*Math.PI/64)
    *Math.cos((2*y+1)*v*Math.PI/64);
  samples.push(total);
 }
 const rest=samples.slice(1).sort((a,b)=>a-b);
 const threshold=rest[Math.floor(rest.length/2)];
 let bits=0n;
 samples.forEach((v,i)=>{if(i!==0&&v>threshold)bits|=1n<<BigInt(63-i)});
 return bits.toString(16).padStart(16,'0');
}
export function inspectSeoWebpPhysicalIntake({
 file_path,order,origin='UNVERIFIED',producer_receipt=null,
 inventory=null,inventory_verified=false
}={}){
 validateSeoProducerOrder({order});
 if(order.existing_creative_capability!==null||
  order.photo_producer_binding_status!=='HOLD_NO_CERTIFIED_TEXT_FREE_IMAGE_GENERATOR')
  nope('UNSAFE_CREATIVE_RENDERER_BINDING');
 const f=checkPhotoFile(file_path);
 const grey=execFileSync('ffmpeg',[
  '-v','error','-i',f.p,'-frames:v','1','-vf',
  'scale=32:32:flags=lanczos,format=gray','-f','rawvideo',
  '-pix_fmt','gray','pipe:1'
 ],{timeout:20000,maxBuffer:100000});
 if(grey.length!==1024)nope('PIXEL_DECODING_FAILED');
 const digest=hash(f.raw);
 const fingerprint=dctPHashFromGrayscale32(grey);
 const isExisting=origin==='EXISTING_FENIX_WORDPRESS_MEDIA_DERIVATIVE';
 if(!isExisting&&origin!=='NEW_UMS_IMAGE')nope('ORIGIN_NOT_ALLOWED');
 if(inventory_verified===true&&!Array.isArray(inventory))nope('INVENTORY_SCOPE');
 const existing=Array.isArray(inventory)?inventory:[];
 const exactDuplicate=existing.some(x=>x.sha256===digest);
 const near=existing.some(x=>/^[0-9a-f]{16}$/.test(x.perceptual_hash||'')&&
  hamming64(x.perceptual_hash,fingerprint)<=8);
 // Never trust a self-declared producer receipt for human visual no-text QA.
 const provenance=!!producer_receipt&&producer_receipt.company_id===order.company_id&&
  producer_receipt.work_id===order.work_id&&
  producer_receipt.request_id===order.request_id&&
  producer_receipt.file_sha256===digest&&
  producer_receipt.commercial_license_verified===true&&
  typeof producer_receipt.license_ref==='string'&&producer_receipt.license_ref.length>10;
 const photoGenerationClaim=isExisting?false:provenance;
 return Object.freeze({
  schema_version:'1.0.0',company_id:'fenix',engine_id:'UMS-001',
  environment:'PREPROD',version:'0.1.0',
  work_id:order.work_id,source_content_sha256:order.source_content_sha256,
  expected_request_id:order.request_id,origin,
  image_sha256:digest,perceptual_hash:fingerprint,
  width:f.width,height:f.height,format:'webp',file_bytes:f.size,
  webp_bitstream_decoded:true,physical_image_verified:true,
  source_is_preexisting_wp_image:isExisting,
  original_image_generated_by_ums_verified:photoGenerationClaim,
  producer_receipt_and_license_verified:provenance,
  global_inventory_complete:inventory_verified===true,
  exact_duplicate_detected:exactDuplicate,near_duplicate_detected:near,
  independent_visual_no_text_logo_watermark_verified:false,
  no_text_in_pixels_verified:false,clean_photo_qualified:false,
  original_photography_ready_for_wordpress:false,
  status:'PHYSICAL_WEBP_PIXEL_PREFLIGHT_PASS_PUBLICATION_HOLD',
  media_upload_authorized:false,publish_authorized:false,
  image_api_calls_this_run:0,wordpress_writes:0
 });
}
export function hamming64(a,b){
 if(!/^[0-9a-f]{16}$/.test(a)||!/^[0-9a-f]{16}$/.test(b))nope('PHASH_FORMAT');
 let d=BigInt('0x'+a)^BigInt('0x'+b),n=0;
 while(d){n+=Number(d&1n);d>>=1n}return n;
}
export function buildExistingMediaTestOrder({root=process.cwd(),work_id='SEO001-FENIX-B2C-EDITORIAL-001'}={}){
 if(work_id!=='SEO001-FENIX-B2C-EDITORIAL-001')nope('FIXTURE_WORK_SCOPE');
 const drafts=JSON.parse(fs.readFileSync(path.resolve(root,
  'cerebro/seo-enterprise/v2/registry/seo-owner-copy-revision-b2b-b2c-v3-faq-2026-11-06.json'),'utf8'));
 const v4=JSON.parse(fs.readFileSync(path.resolve(root,
  'cerebro/seo-enterprise/v2/registry/seo001-v4-1-source-corrected-candidates-review-only-2026-11-06.json'),'utf8'));
 const d=drafts.new_drafts.find(x=>x.id===work_id),c=v4.work.find(x=>x.work_id===work_id);
 if(!d||!c||c.owner_exact_version_approved===true)nope('SOURCE_REGISTRY_SCOPE');
 return buildSeoProducerImageOrder({
  company_id:'fenix',work_id,persona:d.persona,
  source_content_sha256:c.version_sha256,...d.image
 });
}
export function savePhotoIntakeReceipt({receipt,output_dir}={}){
 if(receipt?.company_id!=='fenix'||receipt.engine_id!=='UMS-001'||
  receipt.media_upload_authorized!==false||receipt.publish_authorized!==false||
  receipt.wordpress_writes!==0)nope('RECEIPT_SCOPE');
 if(typeof output_dir!=='string'||!path.isAbsolute(output_dir)||output_dir.includes('..'))
  nope('OUTPUT_DIR');
 const dest=path.resolve(output_dir);
 const roots=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(r=>path.resolve(r));
 if(!roots.some(r=>dest.startsWith(r+path.sep))||fs.existsSync(dest))
  nope('OUTPUT_NOT_ISOLATED');
 fs.mkdirSync(dest,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(dest,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',
  {flag:'wx',mode:0o600});
 return {status:'PHYSICAL_MEDIA_RECEIPT_WRITTEN_NOT_APPROVED',
  asset_sha256:receipt.image_sha256,wordpress_writes:0,image_api_calls:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const file=process.argv[2],out=process.argv[3];
 if(!file||!out)nope('CLI_ARGS');
 const order=buildExistingMediaTestOrder();
 const receipt=inspectSeoWebpPhysicalIntake({
  file_path:path.resolve(file),order,origin:'EXISTING_FENIX_WORDPRESS_MEDIA_DERIVATIVE',
  inventory:[{sha256:'0'.repeat(64),perceptual_hash:'0'.repeat(16)}],
  inventory_verified:false
 });
 const saved=savePhotoIntakeReceipt({receipt,output_dir:path.resolve(out)});
 process.stdout.write(JSON.stringify({...saved,origin:receipt.origin,
  px:receipt.width+'x'+receipt.height,license_verified:receipt.producer_receipt_and_license_verified,
  original_photo_verified:receipt.original_image_generated_by_ums_verified})+'\n');
}
