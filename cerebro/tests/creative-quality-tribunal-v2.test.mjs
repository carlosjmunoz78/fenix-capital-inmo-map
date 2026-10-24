import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCreativePlanV2, assertCreativePlanV2, CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT } from '../runtime/creative-quality-tribunal-v2.mjs';

const logo='https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png';
const photos=[
  'https://fenixcapital.es/wp-content/uploads/2026/10/Fenix-C2B7-Pareja-haciendo-numeros-para-comprar-vivienda-cerebro.webp',
  'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-revision-vivienda-asesor-scaled-1-cerebro.webp',
  'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-firma-documentos-vivienda-scaled-1-cerebro.webp',
  'https://fenixcapital.es/wp-content/uploads/2026/10/huelva-llaves-compra-vivienda-scaled-1-cerebro.webp'
];
const videos=['PEXELS:7817205','PEXELS:7816382','PEXELS:7646690'];

function richVideo(output='REEL'){
  const long=output==='LONG_VIDEO';
  const count=long?6:4;
  const videoCount=long?3:2;
  return {
    output_type:output,channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,
    video_mode:'LIVE_ACTION_MIXED',creative_concept:'De la duda a la decisión: compra con método y claridad.',
    channel_fit:true,accessibility_checked:true,visual_style:'PHOTO',layer_count:8,
    brand:{logo_url:logo,primary:'#ffffff',accent:'#f47b20'},
    visual_sources:long?photos:photos.slice(0,2),video_sources:long?videos:videos.slice(0,2),
    scenes:Array.from({length:count},(_,i)=>({id:i+1,source_kind:i<videoCount?'VIDEO':'PHOTO'})),
    motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN'],transitions:['CROSSFADE','DIP_TO_BLACK','ZOOM_CUT'],
    motion_design:true,broll_required:true,scene_text_only_ratio:0,
    audio:{voice_enabled:true,music_enabled:true,ducking:true,captions:true},
    physical_evidence:{audio_stream_present:true,scene_change_count:long?8:5,motion_score:.72,unique_frame_ratio:.91,live_action_seconds_ratio:long?.5:.52,live_action_source_count:long?3:2}
  };
}

test('quality contract is fail-closed and forbids publishing',()=>{
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.hard_fail_closed,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.rejects_powerpoint_like_video,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.unique_frames_alone_are_not_sufficient,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.requires_live_action_ratio_when_live_action,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.publication_authority,false);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.additional_cost_eur,0);
});

test('previous flat reel pattern is rejected',()=>{
  const r=evaluateCreativePlanV2({
    output_type:'REEL',channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,
    brand:{logo_url:logo,primary:'#fff',accent:'#f47b20'},visual_sources:[photos[0]],
    scenes:[{},{},{}],motion_profiles:[],transitions:[],motion_design:false,broll_required:false,
    scene_text_only_ratio:1,audio:{voice_enabled:true,music_enabled:true,ducking:false,captions:true},
    creative_concept:'',channel_fit:false,accessibility_checked:false
  });
  assert.equal(r.passed,false);
  const codes=r.failures.map(x=>x.code);
  assert.ok(codes.includes('VIDEO_MODE_REQUIRED'));
  assert.ok(codes.includes('VIDEO_MOTION_VARIETY_TOO_LOW'));
  assert.ok(codes.includes('BROLL_REQUIRED'));
  assert.ok(codes.includes('POWERPOINT_HEURISTIC_REJECTED'));
});

test('Ken Burns photo reel cannot masquerade as live-action',()=>{
  const p=richVideo('REEL');
  p.video_sources=[];
  p.scenes=p.scenes.map(s=>({...s,source_kind:'PHOTO'}));
  p.physical_evidence={...p.physical_evidence,unique_frame_ratio:1,motion_score:1,live_action_seconds_ratio:0,live_action_source_count:0};
  const r=evaluateCreativePlanV2(p);
  assert.equal(r.passed,false);
  assert.ok(r.failures.some(x=>x.code==='LIVE_ACTION_SOURCE_DIVERSITY_TOO_LOW'));
  assert.ok(r.failures.some(x=>x.code==='LIVE_ACTION_SCENE_COUNT_TOO_LOW'));
  assert.ok(r.failures.some(x=>x.code==='LIVE_ACTION_RATIO_TOO_LOW'));
});

test('professional mixed live-action reel passes',()=>{
  const r=assertCreativePlanV2(richVideo('REEL'));
  assert.equal(r.verdict,'CREATIVE_QA_GREEN');
  assert.ok(r.score>=82);
});

test('professional long video requires at least three governed live-action sources',()=>{
  const p=richVideo('LONG_VIDEO');
  assert.equal(assertCreativePlanV2(p).passed,true);
  const bad={...p,video_sources:p.video_sources.slice(0,2),physical_evidence:{...p.physical_evidence,live_action_source_count:2}};
  assert.throws(()=>assertCreativePlanV2(bad),/LIVE_ACTION_SOURCE_DIVERSITY_TOO_LOW/);
});

test('photo-motion is only allowed as an explicit constrained format',()=>{
  const p=richVideo('REEL');
  p.video_mode='PHOTO_MOTION';p.video_sources=[];p.scenes=p.scenes.map(s=>({...s,source_kind:'PHOTO'}));delete p.allow_photo_motion;
  assert.throws(()=>assertCreativePlanV2(p),/PHOTO_MOTION_EXPLICIT_EXCEPTION_REQUIRED/);
  p.allow_photo_motion=true;
  const r=assertCreativePlanV2(p);
  assert.ok(r.warnings.some(x=>x.code==='PHOTO_MOTION_LIMITED_FORMAT'));
});

test('carousel rejects text-only deck and accepts visual deck',()=>{
  const bad=evaluateCreativePlanV2({output_type:'CAROUSEL',channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,brand:{logo_url:logo,primary:'#fff',accent:'#f47b20'},pages:[{},{},{},{}],visual_sources:[photos[0]],layout_variants:1,text_only_page_ratio:1,creative_concept:'x',channel_fit:true,accessibility_checked:true});
  assert.equal(bad.passed,false);
  assert.ok(bad.failures.some(x=>x.code==='CAROUSEL_VISUAL_DIVERSITY_TOO_LOW'));
  const good=assertCreativePlanV2({output_type:'CAROUSEL',channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,brand:{logo_url:logo,primary:'#fff',accent:'#f47b20'},pages:[{},{},{},{},{}],visual_sources:photos.slice(0,3),layout_variants:4,text_only_page_ratio:.2,creative_concept:'Carrusel editorial con alternancia foto/dato/CTA',channel_fit:true,accessibility_checked:true,layer_count:6});
  assert.equal(good.passed,true);
});

test('external logo/photo or ungoverned video is rejected',()=>{
  const p=richVideo();
  p.brand.logo_url='https://example.com/logo.png';p.visual_sources=['https://example.com/a.jpg',photos[0]];p.video_sources=['PEXELS:99999999','PEXELS:7817205'];
  const r=evaluateCreativePlanV2(p);
  assert.equal(r.passed,false);
  assert.ok(r.failures.some(x=>x.code==='BRAND_LOGO_HOST_DENIED'));
  assert.ok(r.failures.some(x=>x.code==='VISUAL_SOURCE_HOST_DENIED'));
  assert.ok(r.failures.some(x=>x.code==='VIDEO_SOURCE_NOT_GOVERNED'));
});
