import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planMultichannel,summarizeRealAcceptance} from '../runtime/multichannel-image-gate-lab-v0.mjs';
const request=JSON.parse(readFileSync(new URL('../requests/UMS001_MULTICHANNEL_IMAGE_11_20261111.json',import.meta.url)));
const copy=()=>structuredClone(request);
const denied=(x)=>assert.throws(()=>planMultichannel(x),/UMS001_MULTICHANNEL_/);
test('registered order validates all 11 different pieces, formats and source departments',()=>{
 const p=planMultichannel(request);assert.equal(p.pieces.length,11);
 assert.equal(p.status,'PRODUCER_ORDER_VALIDATED_NOT_EXECUTED');
 assert.equal(p.artifacts_generated,0);assert.equal(p.paid_inference_allowed,false);assert.equal(p.publish_enabled,false);
 assert.deepEqual(new Set(p.pieces.map(x=>x.channel)),new Set(['INSTAGRAM','FACEBOOK','LINKEDIN','SEO']));
});
test('all aspect ratios keep correct pixels',()=>{
 const p=planMultichannel(request);
 assert.deepEqual(p.pieces.find(x=>x.item_id==='IG-STORY-01').target_pixels,[1080,1920]);
 assert.deepEqual(p.pieces.find(x=>x.item_id==='SEO-HERO-01').target_pixels,[1600,900]);
 assert.equal(p.pieces.find(x=>x.item_id==='LI-FEED-01').format_adapter,'DEDICATED_WIDE_GENERATION_THEN_VERIFIED_CROP');
});
test('cancel publishing, production, prepaid enforcement and arbitrary budget widening',()=>{
 for(const [k,val] of [['paid_execution_enabled',true],['auto_publish_enabled',true],['production_enabled',true],
  ['auto_reload_enabled',true],['prepaid_only',false],['max_total_budget_usd',3],['max_additional_cost_eur',10]]){
  const x=copy();x.execution[k]=val;denied(x);
 }
});
test('wrong tenant or unapproved model ownership cannot be submitted',()=>{
 for(const [k,v] of [['company_id','other'],['engine_id','OTHER'],['environment','PROD'],['creative_teacher','PERMANENT_OWNER']]){
  const x=copy();x[k]=v;denied(x);
 }
});
test('cannot silently drop, duplicate or resize a piece',()=>{
 const a=copy();a.pieces.pop();denied(a);
 const b=copy();b.pieces[2].item_id='IG-FEED-01';denied(b);
 const c=copy();c.pieces[6].width_px=1080;c.pieces[6].height_px=1350;denied(c);
 const d=copy();d.pieces[8].provider_aspect_ratio='4:5';denied(d);
});
test('SEO remains clean without generated labels; social hook remains short',()=>{
 const a=copy();a.pieces[9].hook='Fake logo';denied(a);
 const b=copy();b.pieces[0].hook='This is an exceptionally verbose headline likely to be unreadable on social feeds';denied(b);
});
test('no fake green from metadata-only order or invented receipt',()=>{
 const p=planMultichannel(request);
 assert.equal(summarizeRealAcceptance(p,[]).status,'IMAGE_MULTIFORMAT_VALIDATION_NOT_READY');
 assert.equal(summarizeRealAcceptance(p,[{item_id:'IG-FEED-01',score:100}]).status,'IMAGE_MULTIFORMAT_VALIDATION_NOT_READY');
});
test('missing signed evidence even with fake excellent 100 scores never advances gate',()=>{
 const p=planMultichannel(request);
 const forged=p.pieces.map(x=>({item_id:x.item_id,width_px:x.target_pixels[0],height_px:x.target_pixels[1],score:100,sha256:'a'.repeat(64)}));
 assert.equal(summarizeRealAcceptance(p,forged).status,'IMAGE_MULTIFORMAT_VALIDATION_NOT_READY');
});
