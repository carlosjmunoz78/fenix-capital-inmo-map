import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {buildCerebroCreativeOrder,validateProductionUrl,CEREBRO_IMAGE_BRIDGE_V0} from '../runtime/creative-social-prompt-v0.mjs';
import {preflightOpenAiCost,generateOpenAiScene} from '../runtime/creative-openai-image-adapter-v0.mjs';
import {renderSocialImage,renderImageHtml} from '../runtime/creative-social-compositor-v0.mjs';

const INPUT=JSON.parse(await fs.readFile(new URL('../fixtures/facebook-audiovisual-canary-20261105.brief.json',import.meta.url),'utf8'));
const ORDER=buildCerebroCreativeOrder(INPUT);
function approved(){
 const approval_id='CREATIVE-AI-TEST_UNIT_ONLY';
 return {decision:'APPROVED',approver:'CARLOS-ADMIN',approval_id,expires_at:new Date(Date.now()+3600000).toISOString(),
 company_id:ORDER.company_id,engine_id:ORDER.engine_id,request_key:ORDER.request_key,
 work_order_sha256:ORDER.work_order_sha256,max_eur:0.3,estimated_max_eur:0.25,max_images:1};
}
const TEST_ENV={OPENAI_IMAGE_PROVIDER_ENABLED:'true',OPENAI_IMAGE_MAX_EUR_PER_REQUEST:'0.3',
 OPENAI_IMAGE_VERIFIED_APPROVAL_ID:'CREATIVE-AI-TEST_UNIT_ONLY',OPENAI_API_KEY:'TEST_ONLY_0123456789'};

test('CEREBRO agent work order builds professional image prompt, always external exact logo overlay',()=>{
 assert.equal(CEREBRO_IMAGE_BRIDGE_V0.owner_engine,'FACT-001');
 assert.equal(CEREBRO_IMAGE_BRIDGE_V0.consumer_engine,'SOC-001');
 assert.equal(ORDER.source,'CEREBRO_FACT001_WORK_ORDER');
 assert.equal(ORDER.channel,'FACEBOOK');
 assert.equal(ORDER.output_type,'SQUARE_POST');
 assert.equal(ORDER.ai_scene_request.model,'gpt-image-2.5-flare');
 assert.ok(ORDER.ai_scene_request.prompt.length>500);
 assert.match(ORDER.ai_scene_request.prompt,/Output ONLY a photographic background/i);
 assert.match(ORDER.ai_scene_request.prompt,/No typography, no captions, no logos/i);
 assert.match(ORDER.ai_scene_request.prompt,/premium modern Mediterranean residential architecture/i);
 assert.equal(ORDER.brand.palette.orange,'#FF5F00');
 assert.equal(ORDER.brand.palette.purple,'#870064');
 assert.equal(ORDER.brand.logo_on_light_surface,true);
 assert.ok(ORDER.brand.official_logo_url.startsWith('https://fenixcapital.es/'));
 assert.equal(ORDER.policy.publish_authorized,false);
});
test('staging, fake phoenixcapital, wrong company and wrong audience fail closed',()=>{
 for(const url of ['https://staging.fenixcapital.es/','https://phoenixcapital.es/','http://fenixcapital.es/','https://evil.test/']){
   assert.throws(()=>validateProductionUrl(url),/PRODUCTION_HOST_ONLY/);
 }
 assert.equal(validateProductionUrl('https://fenixcapital.es/contacto/'),'https://fenixcapital.es/contacto/');
 assert.throws(()=>buildCerebroCreativeOrder({...INPUT,company_id:'another-company'}),/BRAND_PROFILE_NOT_BOUND_FOR_COMPANY/);
 assert.throws(()=>buildCerebroCreativeOrder({...INPUT,environment:'PROD'}),/PROD_NOT_AUTHORIZED/);
 assert.throws(()=>buildCerebroCreativeOrder({...INPUT,audience:'inmobiliarias'}),/B2B_DESTINATION_MISMATCH/);
});
test('paid model never called without server-verified economic authority',async()=>{
 let calls=0;
 const fetch_impl=async()=>{calls++;throw Error('MUST_NOT_BE_CALLED');};
 let result=await generateOpenAiScene({order:ORDER,fetch_impl,env:{}});
 assert.equal(result.allowed,false);assert.equal(result.reason,'MONEY_LIMIT');
 result=await generateOpenAiScene({order:ORDER,fetch_impl,env:TEST_ENV,approval:null});
 assert.equal(result.allowed,false);assert.equal(result.reason,'MONEY_LIMIT');
 result=await generateOpenAiScene({order:ORDER,fetch_impl,
   env:{...TEST_ENV,OPENAI_IMAGE_VERIFIED_APPROVAL_ID:'UNKNOWN'},
   approval:approved()});
 assert.equal(result.allowed,false);assert.equal(result.reason,'MONEY_LIMIT');
 assert.equal(calls,0);
});
test('test-only injected provider call uses official current image model and returns nonpublishable artifact',async()=>{
 const sample=await makeSyntheticFixtureImage();
 let called=0,request;
 const r=await generateOpenAiScene({order:ORDER,env:TEST_ENV,approval:approved(),
   fetch_impl:async(url,init)=>{
     called++;assert.equal(url,'https://api.openai.com/v1/images/generations');
     request=JSON.parse(init.body);
     assert.equal(init.headers.authorization,'Bearer TEST_ONLY_0123456789');
     return {ok:true,headers:{get:()=> 'test-provider-run'},json:async()=>({data:[{b64_json:sample.photo.toString('base64')}],usage:{output_tokens:1}})};
   }});
 assert.equal(called,1);assert.equal(request.model,'gpt-image-2.5-flare');
 assert.equal(request.n,1);assert.equal(request.size,'1024x1024');
 assert.equal(r.status,'GENERATED_SCENE_NOT_BRANDED_NOT_PUBLISHABLE');
 assert.equal(r.publish_authorized,false);
 assert.equal(r.spent_eur_verified,false);
 assert.equal(r.photo_png.length,sample.photo.length);
});
test('physical 1080px output with transparent real-source-style logo on white, never publishes',async()=>{
 const {photo,logo}=await makeSyntheticFixtureImage();
 assert.match(renderImageHtml({order:ORDER,photo_png:photo,logo_png:logo}),/FF5F00/);
 const r=await renderSocialImage({order:ORDER,photo_png:photo,logo_png:logo});
 assert.equal(r.status,'CREATIVE_RENDERED_QA_PENDING');
 assert.equal(r.width,1080);assert.equal(r.height,1080);
 assert.equal(r.checks.logo_on_white_card,true);
 assert.ok(r.checks.logo_transparent_fraction>0.1);
 assert.equal(r.brand_qa,false);assert.equal(r.visual_quality_qa,false);
 assert.equal(r.publish_authorized,false);
 assert.ok(r.png.length>10000);
});
async function makeSyntheticFixtureImage(){
 const browser=await chromium.launch({headless:true});
 try{
   const photoPage=await browser.newPage({viewport:{width:1024,height:1024}});
   await photoPage.setContent(`<html><style>*{margin:0}body{width:1024px;height:1024px;background:linear-gradient(155deg,#7b8c76,#fae4bb 30%,#5d5245 66%,#416e51)}.house{position:absolute;left:80px;top:190px;width:800px;height:530px;transform:skewY(-4deg);background:repeating-linear-gradient(90deg,#c0a37b 0 80px,#8a7155 81px 93px,#4c676b 94px 165px,#d8c69c 166px 195px);box-shadow:20px 35px 50px #4448}.garden{position:absolute;top:500px;width:100%;height:420px;background:repeating-linear-gradient(25deg,#486d3b 0 25px,#a1aa67 26px 32px,#24472b 33px 44px);opacity:.75}</style><div class="house"></div><div class="garden"></div></html>`);
   const photo=await photoPage.screenshot({type:'png'});
   const logoPage=await browser.newPage({viewport:{width:280,height:180},deviceScaleFactor:1});
   await logoPage.setContent(`<html><style>html,body{background:transparent;margin:0;width:280px;height:180px}svg{width:280px;height:180px}</style><svg viewBox="0 0 280 180"><path d="M65 60L141 8L213 60L208 65L141 18L70 65Z" fill="#FF5F00"/><text x="35" y="137" font-size="68" font-weight="bold">FENIX</text></svg></html>`);
   const logo=await logoPage.screenshot({type:'png',omitBackground:true});
   await logoPage.close();await photoPage.close();
   return {photo,logo};
 }finally{await browser.close();}
}
