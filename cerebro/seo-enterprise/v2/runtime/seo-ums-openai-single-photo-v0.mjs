/**
 * UMS-001 · one-owner-authorized OpenAI image API paid canary.
 * ONE request max, fixed model/size/quality, NO retries, NO fallback, NO WP.
 * This verifies a real generation API and image bytes, NOT independent media QA.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const MODEL='gpt-image-2';
const SIZE='1536x1024';
const QUALITY='medium';
const OUTPUT_FORMAT='webp';
const MAX_ESTIMATED_CHARGE_USD=0.10;
const PUBLISHED_OUTPUT_ESTIMATE_USD=0.041;
const WORK='SEO001-FENIX-B2C-EDITORIAL-001';
const SOURCE_SHA='96b340eba8d97d56fd9e2ce9644df9d2b8855759301180fbf0351630e351d88d';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const deny=s=>{throw Error('SEO_UMS_OPENAI_ONESHOT_'+s)};
function requireOutput(output_dir){
 if(typeof output_dir!=='string'||!path.isAbsolute(output_dir)||output_dir.includes('..'))deny('OUTPUT_PATH');
 const target=path.resolve(output_dir);
 const roots=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>path.resolve(x));
 if(!roots.some(root=>target.startsWith(root+path.sep))||fs.existsSync(target))deny('OUTPUT_NOT_ISOLATED');
 return target;
}
export function buildOriginalSeoPhotoPrompt({root=process.cwd()}={}){
 const draft=JSON.parse(fs.readFileSync(path.resolve(root,
  'cerebro/seo-enterprise/v2/registry/seo-owner-copy-revision-b2b-b2c-v3-faq-2026-11-06.json'),'utf8'));
 const v42=JSON.parse(fs.readFileSync(path.resolve(root,
  'cerebro/seo-enterprise/v2/registry/seo001-v4-2-source-locked-review-only-2026-11-06.json'),'utf8'));
 const item=draft.new_drafts.find(x=>x.id===WORK);
 const meta=v42.work.find(x=>x.work_id===WORK);
 if(!item||meta?.new_sha256!==SOURCE_SHA||v42.publish_authorized!==false||
  item.persona!=='PARTICULARES'||item.content_type!=='ARTICLE'||!item.image?.subject||
  !item.image?.visual_intent)deny('SOURCE_REGISTRY_SCOPE');
 const prompt=[
  'Photorealistic premium architectural editorial photograph for an informative article about comparing homes in Córdoba, Spain.',
  item.image.subject,item.image.visual_intent,
  'Authentic natural Spanish residential interior, realistic materials, believable details, warm daylight, visually inviting, tasteful understated furniture, no digitally painted effects.',
  'Landscape composition with key subject in the center suitable for later 1200x630 crop.',
  'NO text, letters, words, graphics, signage, brands, watermarks, overlays, icons, posters with writing, labels, logos or legible documents anywhere in the pixels.',
  'Do not invent a named property address or suggest this is a real property listing. No identifiable people.'
 ].join(' ');
 if(prompt.length>1450||prompt.length<150)deny('PROMPT_LENGTH');
 return Object.freeze({
  company_id:'fenix',engine_id:'UMS-001',environment:'LAB',version:'0.1.0',
  work_id:WORK,source_content_sha256:SOURCE_SHA,
  model:MODEL,size:SIZE,quality:QUALITY,output_format:OUTPUT_FORMAT,
  prompt,photo_count:1,max_estimated_usd:MAX_ESTIMATED_CHARGE_USD,
  published_image_output_estimate_usd:PUBLISHED_OUTPUT_ESTIMATE_USD,
  new_subscriptions_authorized:false,paid_fallback_authorized:false,
  auto_retry_authorized:false,wordpress_writes_authorized:false,
  publish_authorized:false
 });
}
export async function attemptOneOpenAIPhoto({
 api_key=null,fetch_impl=globalThis.fetch,root=process.cwd(),
 output_dir,owner_one_paid_test_authorized=false
}={}){
 const config=buildOriginalSeoPhotoPrompt({root});
 if(config.photo_count!==1||config.model!=='gpt-image-2'||
  config.quality!=='medium'||config.size!=='1536x1024'||
  config.published_image_output_estimate_usd>=config.max_estimated_usd||
  config.max_estimated_usd!==0.10)deny('COST_REQUEST_POLICY');
 if(owner_one_paid_test_authorized!==true)return Object.freeze({
  status:'HOLD_EXPLICIT_ONE_IMAGE_OWNER_GATE_NOT_SET',request_count:0,
  paid_provider_attempts:0,wordpress_writes:0,owner_gate:false
 });
 if(typeof api_key!=='string'||api_key.length<20||!/^[\x21-\x7e]+$/.test(api_key))
  return Object.freeze({status:'HOLD_IMAGE_API_SECRET_NOT_AVAILABLE',
   request_count:0,wordpress_writes:0});
 const where=requireOutput(output_dir);
 const input={model:config.model,quality:config.quality,size:config.size,
  output_format:config.output_format,n:1,prompt:config.prompt};
 // Do not log the key, headers, response body or image base64, even on 4xx.
 let resp;
 try{
  resp=await fetch_impl('https://api.openai.com/v1/images/generations',{
   method:'POST',headers:{
    'Authorization':'Bearer '+api_key,'Content-Type':'application/json'
   },redirect:'error',body:JSON.stringify(input),signal:AbortSignal.timeout(170000)
  });
 }catch{
  return Object.freeze({status:'PROVIDER_TRANSPORT_FAIL_NO_RETRY',
   request_count:1,wordpress_writes:0,provider_http:null});
 }
 if(resp?.ok!==true)
  return Object.freeze({status:'PROVIDER_HTTP_FAIL_NO_RETRY',
   provider_http:resp?.status??null,request_count:1,
   wordpress_writes:0});
 let payload;
 try{payload=await resp.json()}catch{deny('INVALID_PROVIDER_JSON')}
 const encoded=payload?.data?.[0]?.b64_json;
 if(!Array.isArray(payload?.data)||payload.data.length!==1||
  typeof encoded!=='string'||encoded.length<180||!/^[-A-Za-z0-9+/=]+$/.test(encoded))
  deny('UNEXPECTED_PROVIDER_IMAGE_COUNT_OR_PAYLOAD');
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.length<100||bytes.length>12_000_000||
  bytes.subarray(0,4).toString('latin1')!=='RIFF'||
  bytes.subarray(8,12).toString('latin1')!=='WEBP')deny('PROVIDER_IMAGE_BYTES_INVALID');
 fs.mkdirSync(where,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(where,'single-original-provider.webp'),bytes,{flag:'wx',mode:0o600});
 const hash=sha(bytes);
 const receipt={
  schema_version:'1.0.0',company_id:'fenix',engine_id:'UMS-001',
  environment:'LAB',version:'0.1.0',work_id:WORK,
  source_content_sha256:SOURCE_SHA,
  status:'ONE_REAL_PROVIDER_IMAGE_RECEIVED_VISUAL_RIGHTS_QA_HOLD',
  model:MODEL,quality:QUALITY,size:SIZE,output_format:OUTPUT_FORMAT,
  raw_image_sha256:hash,raw_image_bytes:bytes.length,
  provider_request_id:resp.headers?.get?.('x-request-id')||null,
  provider_output_count:1,request_count:1,max_request_count:1,
  auto_retries:0,paid_fallback_used:false,
  published_output_price_estimate_usd:PUBLISHED_OUTPUT_ESTIMATE_USD,
  maximum_budget_planning_usd:MAX_ESTIMATED_CHARGE_USD,
  actual_billed_cost_verified:false,
  pricing_source:'https://developers.openai.com/api/docs/guides/image-generation',
  generated_in_cloud_runner:true,api_key_logged:false,
  license_commercial_use_professionally_verified:false,
  originality_independent_qa_verified:false,
  pixel_text_logo_watermark_qa_verified:false,
  worldwide_duplicate_inventory_verified:false,
  producer_autonomous_scheduler_enabled:false,
  wordpress_media_uploaded:false,wordpress_writes:0,
  publish_authorized:false
 };
 fs.writeFileSync(path.join(where,'api-image-receipt.json'),
  JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 return Object.freeze({status:receipt.status,request_count:1,
  image_sha256:hash,file_bytes:bytes.length,
  provider_http:resp.status,wordpress_writes:0,output_dir:where});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)deny('OUTPUT_ARGUMENT_REQUIRED');
 const result=await attemptOneOpenAIPhoto({
  api_key:process.env.OPENAI_API_KEY||null,
  output_dir:path.resolve(process.argv[2]),
  owner_one_paid_test_authorized:process.env.OWNER_AUTHORIZED_ONE_OPENAI_IMAGE_TEST==='TRUE'
 });
 // Logging only bounded status/bytes; NEVER prompt, image b64, tokens, key.
 process.stdout.write(JSON.stringify(result)+'\n');
 if(result.status!=='ONE_REAL_PROVIDER_IMAGE_RECEIVED_VISUAL_RIGHTS_QA_HOLD')
  process.exitCode=2;
}
